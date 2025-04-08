import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// 这里应该使用环境变量存储API密钥
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 增加超时设置 - 30秒
const API_TIMEOUT = 30000;

// 简单的内容审核函数
function moderateContent(text: string): boolean {
  // 这里应该实现更复杂的内容审核逻辑
  // 当前仅做简单示例，检查是否包含某些敏感词
  const sensitiveWords = ['政治家', '国家领导人', '种族歧视', '恐怖主义'];
  return !sensitiveWords.some(word => text.includes(word));
}

// 添加Vercel函数配置，增加最大执行时间
export const config = {
  maxDuration: 60, // 秒
};

export async function POST(request: Request) {
  try {
    // 创建Supabase客户端 - 确保正确使用await cookies()
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '未授权，请先登录', success: false },
        { status: 401 }
      );
    }
    
    // 获取用户资料和积分余额
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: '获取用户资料失败', success: false },
        { status: 500 }
      );
    }
    
    // 检查积分是否足够
    if (profile.points < 10) {
      return NextResponse.json(
        { error: '积分不足，请获取更多积分后再试', success: false },
        { status: 403 }
      );
    }
    
    const { messages } = await request.json();
    // 获取最新的用户消息作为当前prompt
    const prompt = messages && messages.length > 0 
      ? messages[messages.length - 1].content 
      : '';
    
    // 输入内容审核
    if (!moderateContent(prompt)) {
      return NextResponse.json(
        { error: '输入内容包含敏感词，请调整后重试。', success: false },
        { status: 400 }
      );
    }

    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: 'API密钥未配置', success: false },
        { status: 500 }
      );
    }

    // 设置超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-reasoner',
          messages: [
            {
              role: 'system',
              content: '你是百度贴吧嘴臭老哥,你现在在帮外国网友骂人，网友会给你一些信息。请你根据网友给的信息，来相处攻击性拉满，极致嘴臭的骂人语句。并且要融合语言习惯，融合相应语言的历史典故或者梗，回复相应的语言。'
            },
            // 传递完整的对话历史
            ...(messages || [{
              role: 'user',
              content: prompt
            }]),
          ],
          temperature: 0.8,
          top_p: 0.9,
          max_tokens: 800,
          presence_penalty: 0.6,
          frequency_penalty: 0.5
        }),
        signal: controller.signal
      });

      // 清除超时器
      clearTimeout(timeoutId);

      // 检查响应状态
      if (!response.ok) {
        // 尝试解析错误响应
        let errorMessage;
        try {
          const errorData = await response.json();
          console.error('DeepSeek API Error:', errorData);
          errorMessage = errorData.error?.message || `AI服务错误(${response.status})`;
        } catch {
          // 如果无法解析为JSON
          const errorText = await response.text();
          console.error('DeepSeek API Error (raw):', errorText);
          errorMessage = `AI服务错误(${response.status}): ${errorText.substring(0, 100)}`;
        }
        return NextResponse.json(
          { error: errorMessage, success: false },
          { status: 500 }
        );
      }

      const data = await response.json();
      const generatedText = data.choices[0].message.content;

      // 生成内容的审核
      if (!moderateContent(generatedText)) {
        return NextResponse.json(
          { error: '生成的内容不符合社区规范，请重试。', success: false },
          { status: 400 }
        );
      }
      
      // 使用事务函数处理积分扣除、交易记录和生成记录
      const { data: generationResult, error: generationError } = await supabase
        .rpc('handle_content_generation', {
          p_user_id: user.id,
          p_target: prompt,
          p_result: generatedText,
          p_points_consumed: 10
        });
      
      if (generationError) {
        console.error('Error in content generation transaction:', generationError);
        return NextResponse.json(
          { error: '处理生成内容失败', success: false },
          { status: 500 }
        );
      }
      
      // 检查事务处理结果
      if (!generationResult.success) {
        return NextResponse.json(
          { error: generationResult.error || '处理生成内容失败', success: false },
          { status: 403 }
        );
      }

      // 计算更新后的积分值
      const updatedPoints = profile.points - 10;
      
      return NextResponse.json({ 
        result: generatedText,
        points: updatedPoints,
        success: true 
      });
    } catch (error: unknown) {
      // 清除超时器
      clearTimeout(timeoutId);
      
      // 处理超时错误
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('API call timed out after', API_TIMEOUT, 'ms');
        return NextResponse.json(
          { error: 'AI服务响应超时，请稍后重试', success: false },
          { status: 504 }
        );
      }
      
      // 重新抛出其他错误
      throw error;
    }
  } catch (error: unknown) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器处理请求时出错，请稍后重试';
    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: 500 }
    );
  }
}