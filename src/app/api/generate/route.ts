import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';

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
    try {
      console.log('开始创建生成任务, 用户ID:', user.id);
      const { data: generationTask, error: taskError } = await supabase
        .from('generation_tasks')
        .insert({
          user_id: user.id,
          prompt: prompt,
          status: 'pending',
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
      
      // 立即返回任务ID给前端，不等待生成完成
      // 这样可以避免请求超时，客户端将通过轮询获取结果
      console.log('生成任务已创建，ID:', generationTask.id);
      
      // 在后台启动生成过程（不阻塞响应）
      // 为确保即使在Vercel环境中也能正常工作，将处理函数包装在Promise.resolve().then中
      console.log('准备启动后台处理，任务ID:', generationTask.id);
      
      // 使用直接的异步函数调用，而不是Promise.resolve().then
      (async () => {
        try {
          console.log('开始后台处理任务，ID:', generationTask.id);
          // 立即更新状态为processing
          const { error: updateError } = await supabase
            .from('generation_tasks')
            .update({ status: 'processing' })
            .eq('id', generationTask.id);
            
          if (updateError) {
            console.error('更新任务状态为processing失败:', updateError);
            throw new Error('更新任务状态失败: ' + updateError.message);
          }
          
          console.log('任务状态已更新为processing，开始生成内容');
          await generateContentInBackground(supabase, generationTask.id, profile.points, user.id, messages || [{role: 'user', content: prompt}]);
          console.log('后台任务处理完成，ID:', generationTask.id);
        } catch (error) {
          console.error('后台生成内容失败:', error);
          // 确保任务状态被更新为失败
          await supabase
            .from('generation_tasks')
            .update({ 
              status: 'failed',
              error: error instanceof Error ? error.message : '后台处理失败',
              completed_at: new Date().toISOString()
            })
            .eq('id', generationTask.id);
        }
      })();
      
      // 立即向客户端返回任务ID
      return jsonResponse({
        taskId: generationTask.id,
        message: '生成请求已接收，请使用提供的任务ID查询结果',
        success: true
      });
    } catch (insertError) {
      console.error('插入任务记录时出现异常:', insertError);
      return jsonResponse(
        { error: '创建生成任务失败: ' + (insertError instanceof Error ? insertError.message : String(insertError)), success: false },
        500
      );
    }
    
  } catch (error: unknown) {
    console.error('API Error:', error instanceof Error ? error.stack : error);
    const errorMessage = error instanceof Error ? error.message : '服务器处理请求时出错，请稍后重试';
    return jsonResponse(
      { error: errorMessage, success: false },
      500
    );
  }
}

// 后台生成内容的非阻塞函数
async function generateContentInBackground(
  supabase: SupabaseClient,
  taskId: string, 
  currentPoints: number,
  userId: string,
  messages: Array<{role: string, content: string}>
) {
  try {
    console.log('generateContentInBackground 函数开始执行，任务ID:', taskId);
    // 准备请求参数
    const requestBody = {
      model: 'deepseek-reasoner',
      messages: [
        {
          role: 'system',
          content: '你是百度贴吧嘴臭老哥,你现在在帮外国网友骂人，网友会给你一些信息。请你根据网友给的信息，来相处攻击性拉满，极致嘴臭的骂人语句。并且要融合语言习惯，融合相应语言的历史典故或者梗，回复相应的语言。'
        },
        // 传递完整的对话历史
        ...messages,
      ],
      temperature: 0.8,
      top_p: 0.9,
      max_tokens: 800,
      presence_penalty: 0.6,
      frequency_penalty: 0.5
    };
    
    console.log('开始异步请求DeepSeek API, 任务ID:', taskId, 'API URL:', DEEPSEEK_API_URL);
    console.log('API Key设置状态:', DEEPSEEK_API_KEY ? '已设置' : '未设置');
    const startTime = Date.now();
    
    // 设置超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    try {
      // 请求DeepSeek API
      console.log('开始请求DeepSeek API, 使用模型:', requestBody.model);
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      // 清除超时器
      clearTimeout(timeoutId);
      
      const endTime = Date.now();
      console.log(`DeepSeek API响应时间: ${endTime - startTime}ms, 状态码: ${response.status}, 任务ID: ${taskId}`);
      
      // 检查响应状态
      if (!response.ok) {
        // 尝试解析错误响应
        let errorMessage;
        const contentType = response.headers.get('content-type');
        
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            console.error('DeepSeek API Error (JSON):', errorData);
            errorMessage = errorData.error?.message || `AI服务错误(${response.status})`;
          } else {
            const errorText = await response.text();
            console.error('DeepSeek API Error (Text):', errorText);
            errorMessage = `AI服务错误(${response.status}): ${errorText.substring(0, 100)}`;
          }
        } catch (parseError) {
          console.error('解析DeepSeek错误响应失败:', parseError);
          errorMessage = `AI服务返回了未知错误 (${response.status})`;
        }
        
        // 更新任务状态为失败
        console.log('API响应失败，更新任务状态为failed，错误信息:', errorMessage);
        await supabase
          .from('generation_tasks')
          .update({ 
            status: 'failed',
            error: errorMessage,
            completed_at: new Date().toISOString()
          })
          .eq('id', taskId);
        
        return;
      }
      
      // 解析成功的响应
      let data;
      try {
        data = await response.json();
        console.log('DeepSeek API响应成功，消息长度:', data.choices[0].message.content.length, '任务ID:', taskId);
      } catch (parseError) {
        console.error('解析DeepSeek成功响应失败:', parseError);
        
        // 更新任务状态为失败
        await supabase
          .from('generation_tasks')
          .update({ 
            status: 'failed',
            error: '无法解析AI服务响应',
            completed_at: new Date().toISOString()
          })
          .eq('id', taskId);
        
        return;
      }
      
      const generatedText = data.choices[0].message.content;
      
      // 生成内容的审核
      if (!moderateContent(generatedText)) {
        // 更新任务状态为审核失败
        console.log('生成内容未通过审核，更新任务状态为failed');
        await supabase
          .from('generation_tasks')
          .update({ 
            status: 'failed',
            error: '生成的内容不符合社区规范',
            completed_at: new Date().toISOString()
          })
          .eq('id', taskId);
        
        return;
      }
      
      console.log('开始数据库事务处理, 任务ID:', taskId);
      // 使用事务函数处理积分扣除、交易记录和生成记录
      console.log('调用handle_content_generation RPC函数, 参数:', {
        p_user_id: userId,
        p_points_consumed: 10
      });
      
      const { data: generationResult, error: generationError } = await supabase
        .rpc('handle_content_generation', {
          p_user_id: userId,
          p_target: messages[messages.length - 1].content,
          p_result: generatedText,
          p_points_consumed: 10
        });
      
      if (generationError) {
        console.error('Error in content generation transaction:', generationError);
        console.error('Transaction error code:', generationError.code);
        console.error('Transaction error message:', generationError.message);
        console.error('Transaction error details:', generationError.details);
        
        // 更新任务状态为失败
        await supabase
          .from('generation_tasks')
          .update({ 
            status: 'failed',
            error: '处理生成内容失败: ' + generationError.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', taskId);
        
        return;
      }
      
      // 检查事务处理结果
      console.log('事务处理结果:', generationResult);
      if (!generationResult.success) {
        // 更新任务状态为失败
        console.log('事务处理返回失败，错误信息:', generationResult.error);
        await supabase
          .from('generation_tasks')
          .update({ 
            status: 'failed',
            error: generationResult.error || '处理生成内容失败',
            completed_at: new Date().toISOString()
          })
          .eq('id', taskId);
        
        return;
      }
      
      // 更新任务状态为完成
      const updatedPoints = currentPoints - 10;
      console.log('内容生成成功，用户新积分:', updatedPoints, '任务ID:', taskId);
      
      const { error: updateError } = await supabase
        .from('generation_tasks')
        .update({ 
          status: 'completed',
          result: generatedText,
          points_consumed: 10,
          remaining_points: updatedPoints,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);
        
      if (updateError) {
        console.error('更新任务为完成状态失败:', updateError);
      } else {
        console.log('任务已成功完成并更新, 任务ID:', taskId);
      }
      
    } catch (error: unknown) {
      // 清除超时器
      clearTimeout(timeoutId);
      
      // 处理超时错误
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('API call timed out after', API_TIMEOUT, 'ms, 任务ID:', taskId);
        
        // 更新任务状态为超时
        await supabase
          .from('generation_tasks')
          .update({ 
            status: 'failed',
            error: 'AI服务响应超时，请稍后重试',
            completed_at: new Date().toISOString()
          })
          .eq('id', taskId);
        
        return;
      }
      
      // 处理其他错误
      console.error('生成过程出错, 任务ID:', taskId, error);
      
      // 更新任务状态为失败
      await supabase
        .from('generation_tasks')
        .update({ 
          status: 'failed',
          error: error instanceof Error ? error.message : '未知错误',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);
    }
  } catch (error) {
    console.error('后台生成过程出现未捕获异常:', error);
  }
}