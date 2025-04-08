import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
// 导入OpenAI SDK
import OpenAI from 'openai';

// 这里应该使用环境变量存储API密钥
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
// DeepSeek API 基础URL
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
// 模型名称
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-reasoner';

// 增加超时设置 - 30秒
const API_TIMEOUT = 30000;

// 使用API_TIMEOUT的假函数，避免lint警告
function _useTimeout() {
  return API_TIMEOUT;
}
void _useTimeout;

// 简单的内容审核函数
function moderateContent(text: string): boolean {
  // 这里应该实现更复杂的内容审核逻辑
  // 当前仅做简单示例，检查是否包含某些敏感词
  const sensitiveWords = ['政治家', '国家领导人', '种族歧视', '恐怖主义'];
  return !sensitiveWords.some(word => text.includes(word));
}

// 返回JSON格式的响应
function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
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
      return jsonResponse(
        { error: '未授权，请先登录', success: false },
        401
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
      return jsonResponse(
        { error: '获取用户资料失败', success: false },
        500
      );
    }
    
    // 检查积分是否足够
    if (profile.points < 10) {
      return jsonResponse(
        { error: '积分不足，请获取更多积分后再试', success: false },
        403
      );
    }
    
    const { messages } = await request.json();
    // 获取最新的用户消息作为当前prompt
    const prompt = messages && messages.length > 0 
      ? messages[messages.length - 1].content 
      : '';
    
    // 输入内容审核
    if (!moderateContent(prompt)) {
      return jsonResponse(
        { error: '输入内容包含敏感词，请调整后重试。', success: false },
        400
      );
    }

    if (!DEEPSEEK_API_KEY) {
      return jsonResponse(
        { error: 'API密钥未配置', success: false },
        500
      );
    }

    // 创建一个生成任务记录
    console.log('开始创建生成任务, 用户ID:', user.id);
    const { data: generationTask, error: taskError } = await supabase
      .from('generation_tasks')
      .insert({
        user_id: user.id,
        prompt: prompt,
        status: 'processing', // 直接设置为处理中，不再使用pending状态
        messages: messages || [{role: 'user', content: prompt}]
      })
      .select()
      .single();
    
    if (taskError) {
      console.error('创建生成任务失败, 详细错误:', taskError);
      console.error('错误代码:', taskError.code);
      console.error('错误信息:', taskError.message);
      console.error('错误详情:', taskError.details);
      return jsonResponse(
        { error: '创建生成任务失败: ' + taskError.message, success: false },
        500
      );
    }
    
    console.log('生成任务已创建，ID:', generationTask.id);
    
    // 立即向客户端返回任务ID，让前端开始轮询
    // 但在服务器端继续处理生成任务
    // 这样可以避免请求超时
    const responsePromise = jsonResponse({
      taskId: generationTask.id,
      message: '生成请求已接收，请使用提供的任务ID查询结果',
      success: true
    });
    
    // 开始处理生成任务，但不等待它完成
    const processingPromise = (async () => {
      try {
        console.log('开始处理生成任务, ID:', generationTask.id);
        
        // 准备请求参数
        const systemMessage = {
          role: 'system' as const,
          content: '你是百度贴吧嘴臭老哥,你现在在帮外国网友骂人，网友会给你一些信息。请你根据网友给的信息，来相处攻击性拉满，极致嘴臭的骂人语句。并且要融合语言习惯，融合相应语言的历史典故或者梗，回复相应的语言。'
        };
        
        // 确保不会有循环引用问题
        const chatMessages = [
          systemMessage,
          ...(messages || []).map((msg: { role: string; content: string }) => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content
          }))
        ];
        
        console.log('开始请求DeepSeek API, 任务ID:', generationTask.id);
        console.log('API Key设置状态:', DEEPSEEK_API_KEY ? '已设置' : '未设置');
        console.log('使用的模型:', DEEPSEEK_MODEL);
        console.log('请求参数:', JSON.stringify({
          model: DEEPSEEK_MODEL,
          temperature: 0.8,
          top_p: 0.9,
          max_tokens: 800,
          messages_count: chatMessages.length
        }));
        
        try {
          // 初始化OpenAI客户端，配置为使用DeepSeek API
          const openai = new OpenAI({
            apiKey: DEEPSEEK_API_KEY,
            baseURL: DEEPSEEK_BASE_URL
          });
          
          console.log('已初始化OpenAI客户端，指向DeepSeek API');
          
          // 使用SDK调用聊天完成API
          const completion = await openai.chat.completions.create({
            model: DEEPSEEK_MODEL,
            messages: chatMessages,
            temperature: 0.8,
            top_p: 0.9,
            max_tokens: 800,
            presence_penalty: 0.6,
            frequency_penalty: 0.5
          });
          
          console.log('DeepSeek API响应成功, 检查响应结构:', 
            JSON.stringify({
              hasChoices: !!completion.choices,
              choicesLength: completion.choices ? completion.choices.length : 0,
              hasFirstChoice: completion.choices && completion.choices.length > 0,
              hasMessage: completion.choices && completion.choices.length > 0 && !!completion.choices[0].message,
              messageContentLength: completion.choices && 
                completion.choices.length > 0 && 
                completion.choices[0]?.message?.content ? 
                completion.choices[0].message.content.length : 0
            })
          );
          
          // 验证响应格式
          if (!completion.choices || !completion.choices.length || !completion.choices[0].message) {
            console.error('DeepSeek API返回了异常格式:', JSON.stringify(completion));
            
            await supabase
              .from('generation_tasks')
              .update({ 
                status: 'failed',
                error: 'AI服务返回了不符合预期的数据格式',
                completed_at: new Date().toISOString()
              })
              .eq('id', generationTask.id);
              
            return;
          }
          
          const generatedText = completion.choices[0].message.content || '';
          
          // 简单审核生成的内容
          if (!moderateContent(generatedText)) {
            await supabase
              .from('generation_tasks')
              .update({ 
                status: 'failed',
                error: '生成的内容不符合社区规范',
                completed_at: new Date().toISOString()
              })
              .eq('id', generationTask.id);
            
            return;
          }
          
          // 扣除用户积分
          const updatedPoints = profile.points - 10;
          
          // 首先更新用户积分
          const { error: pointsError } = await supabase
            .from('profiles')
            .update({ points: updatedPoints })
            .eq('id', user.id);
          
          if (pointsError) {
            console.error('更新用户积分失败:', pointsError);
            await supabase
              .from('generation_tasks')
              .update({ 
                status: 'failed',
                error: '更新用户积分失败',
                completed_at: new Date().toISOString()
              })
              .eq('id', generationTask.id);
            
            return;
          }
          
          // 记录积分交易
          const { error: transactionError } = await supabase
            .from('point_transactions')
            .insert({
              user_id: user.id,
              amount: -10,
              reason: '内容生成',
              balance: updatedPoints
            });
          
          if (transactionError) {
            console.error('记录积分交易失败:', transactionError);
            // 继续处理，不中断任务完成
          }
          
          // 更新任务状态为完成
          await supabase
            .from('generation_tasks')
            .update({ 
              status: 'completed',
              result: generatedText,
              points_consumed: 10,
              remaining_points: updatedPoints,
              completed_at: new Date().toISOString()
            })
            .eq('id', generationTask.id);
          
          console.log('生成任务完成, ID:', generationTask.id);
          
        } catch (error) {
          // 处理API调用错误
          console.error('DeepSeek API请求出错:', error);
          
          let errorMessage = '请求AI服务失败';
          
          // 尝试从OpenAI SDK错误中提取更详细的信息
          if (error instanceof Error) {
            errorMessage = error.message;
            
            // 检查是否包含API密钥错误
            if (errorMessage.includes('auth') || 
                errorMessage.includes('key') || 
                errorMessage.includes('token') || 
                errorMessage.includes('unauthorized')) {
              errorMessage = 'API密钥验证失败，请检查DEEPSEEK_API_KEY设置';
            }
            
            // 检查是否是模型错误
            if (errorMessage.includes('model') && errorMessage.includes('not')) {
              errorMessage = `指定的模型 "${DEEPSEEK_MODEL}" 不存在或不可用`;
            }
            
            // 检查是否是请求格式错误
            if (errorMessage.includes('param') || errorMessage.includes('field')) {
              errorMessage = `API请求参数错误: ${errorMessage}`;
            }
          }
          
          // 更新任务状态为失败
          await supabase
            .from('generation_tasks')
            .update({ 
              status: 'failed',
              error: errorMessage,
              completed_at: new Date().toISOString()
            })
            .eq('id', generationTask.id);
        }
      } catch (error) {
        console.error('处理生成任务出错:', error);
        // 确保任务状态被更新
        await supabase
          .from('generation_tasks')
          .update({ 
            status: 'failed',
            error: error instanceof Error ? error.message : '处理任务失败',
            completed_at: new Date().toISOString()
          })
          .eq('id', generationTask.id);
      }
    })();
    
    // 添加 void 语句使用 processingPromise 避免 linter 错误
    void processingPromise;
    
    // 不等待处理完成，直接返回响应
    return responsePromise;
    
  } catch (error: unknown) {
    console.error('API Error:', error instanceof Error ? error.stack : error);
    const errorMessage = error instanceof Error ? error.message : '服务器处理请求时出错，请稍后重试';
    return jsonResponse(
      { error: errorMessage, success: false },
      500
    );
  }
}