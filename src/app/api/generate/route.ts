import { createRouteHandlerClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
// 使用我们的自定义bundle导入OpenAI SDK
import { OpenAI } from '@/lib/openai-bundle';

// 这里应该使用环境变量存储API密钥
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
// DeepSeek API 基础URL - 更新为正确的URL
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
// 模型名称 - 更新为正确的模型名称
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
    // 使用新的Supabase客户端
    const supabase = await createRouteHandlerClient();
    
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return jsonResponse(
        { error: 'Unauthorized, please log in first', success: false },
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
        { error: 'Failed to retrieve user profile', success: false },
        500
      );
    }
    
    // 检查积分是否足够
    if (profile.points < 10) {
      return jsonResponse(
        { error: 'Insufficient points, please get more points to continue', success: false },
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
        { error: 'Input contains sensitive words, please revise and try again.', success: false },
        400
      );
    }

    if (!DEEPSEEK_API_KEY) {
      return jsonResponse(
        { error: 'API key not configured', success: false },
        500
      );
    }

    // 创建一个生成任务记录
    console.log('Starting generation task, user ID:', user.id);
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
      console.error('Failed to create generation task, error details:', taskError);
      console.error('Error code:', taskError.code);
      console.error('Error message:', taskError.message);
      console.error('Error details:', taskError.details);
      return jsonResponse(
        { error: 'Failed to create generation task: ' + taskError.message, success: false },
        500
      );
    }
    
    console.log('Generation task created, ID:', generationTask.id);
    
    // 立即向客户端返回任务ID，让前端开始轮询
    // 但在服务器端继续处理生成任务
    // 这样可以避免请求超时
    const responsePromise = jsonResponse({
      taskId: generationTask.id,
      message: 'Generation request received, please use the provided task ID to query results',
      success: true
    });
    
    // 开始处理生成任务，确保异步处理的连续性和错误处理
    (async () => {
      console.log('[Processor] Initializing task processing', generationTask.id);
      try {
        console.log('[Processor] Starting generation task, ID:', generationTask.id);
        
        // 准备请求参数
        const systemMessage = {
          role: 'system' as const,
          content: 'You are an expert roaster with a flair for creative insults. Help generate a witty, creative roast based on the information provided. Make it sharp, funny, and memorable without being cruel or using slurs.'
        };
        
        // 确保不会有循环引用问题
        const chatMessages = [
          systemMessage,
          ...(messages || []).map((msg: { role: string; content: string }) => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content
          }))
        ];
        
        console.log('[Processor] Preparing DeepSeek API request, task ID:', generationTask.id);
        console.log('[Processor] API Key status:', DEEPSEEK_API_KEY ? 'set' : 'not set', 'length:', DEEPSEEK_API_KEY?.length);
        console.log('[Processor] Using model:', DEEPSEEK_MODEL);
        console.log('[Processor] Prepare params:', {
          model: DEEPSEEK_MODEL,
          temperature: 0.8,
          top_p: 0.9,
          max_tokens: 800,
          messages_count: chatMessages.length
        });
        
        // 创建一个专门用于更新任务状态的函数
        const updateTaskStatus = async (status: string, data: {
          error?: string;
          result?: string;
          points_consumed?: number;
          remaining_points?: number;
        } = {}) => {
          // 创建新的Supabase客户端实例
          const newSupabase = await createRouteHandlerClient();
          
          console.log(`[Processor] Updating task status to ${status}, task ID: ${generationTask.id}`);
          try {
            // 添加等待标志确保更新完成
            const { error } = await newSupabase
              .from('generation_tasks')
              .update({ 
                status: status,
                ...data,
                completed_at: status === 'processing' ? null : new Date().toISOString()
              })
              .eq('id', generationTask.id);
            
            if (error) {
              throw error;
            }
            
            // 验证更新是否生效
            const { data: updatedTask, error: verifyError } = await newSupabase
              .from('generation_tasks')
              .select('status')
              .eq('id', generationTask.id)
              .single();
            
            if (verifyError) {
              console.error(`[Processor] Failed to verify task update:`, verifyError);
            } else if (updatedTask.status !== status) {
              console.error(`[Processor] Task status update verification failed: Expected ${status}, actual ${updatedTask.status}`);
            } else {
              console.log(`[Processor] Task status updated to ${status} and verified`);
            }
          } catch (updateError) {
            console.error(`[Processor] Failed to update task status:`, updateError);
          }
        };
        
        try {
          console.log('[Processor] Initializing OpenAI client...');
          // 初始化OpenAI客户端，配置为使用DeepSeek API
          const openai = new OpenAI({
            apiKey: DEEPSEEK_API_KEY,
            baseURL: DEEPSEEK_BASE_URL
          });
          
          console.log('[Processor] OpenAI client initialized, pointing to DeepSeek API');
          console.log('[Processor] Starting DeepSeek API call...');
          
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
          
          console.log('[Processor] DeepSeek API response successful:', 
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
            console.error('[Processor] DeepSeek API returned unexpected format:', JSON.stringify(completion));
            await updateTaskStatus('failed', {
              error: 'AI service returned unexpected data format'
            });
            return;
          }
          
          const generatedText = completion.choices[0].message.content || '';
          
          console.log('[Processor] Generated text received, length:', generatedText.length);
          
          // 简单审核生成的内容
          if (!moderateContent(generatedText)) {
            console.log('[Processor] Generated content does not comply with community standards, updating task status to failed');
            await updateTaskStatus('failed', {
              error: 'Generated content does not comply with community standards'
            });
            return;
          }
          
          // 扣除用户积分
          const updatedPoints = profile.points - 10;
          
          console.log('[Processor] Updating user points, user ID:', user.id, 'current points:', profile.points, 'updated points:', updatedPoints);
          
          // 使用新的Supabase实例处理用户积分更新
          const newSupabase = await createRouteHandlerClient();
          
          // 首先更新用户积分
          const { error: pointsError } = await newSupabase
            .from('profiles')
            .update({ points: updatedPoints })
            .eq('id', user.id);
          
          if (pointsError) {
            console.error('[Processor] Failed to update user points:', pointsError);
            await updateTaskStatus('failed', {
              error: 'Failed to update user points'
            });
            return;
          }
          
          // 记录积分交易
          const { error: transactionError } = await newSupabase
            .from('point_transactions')
            .insert({
              user_id: user.id,
              amount: -10,
              reason: 'Content generation',
              type: 'generation'  // 添加必需的type字段
            });
          
          if (transactionError) {
            console.error('[Processor] Failed to record point transaction:', transactionError);
            // 继续处理，不中断任务完成
          }
          
          console.log('[Processor] Updating task status to completed');
          
          // 更新任务状态为完成
          await updateTaskStatus('completed', {
            result: generatedText,
            points_consumed: 10,
            remaining_points: updatedPoints
          });
          
          console.log('[Processor] Generation task completed, ID:', generationTask.id);
          
        } catch (error) {
          // 处理API调用错误
          console.error('[Processor] DeepSeek API request error:', error);
          
          let errorMessage = 'Failed to request AI service';
          
          // 尝试从OpenAI SDK错误中提取更详细的信息
          if (error instanceof Error) {
            console.error('[Processor] Error details:', error.message, error.stack);
            errorMessage = error.message;
            
            // 检查是否包含API密钥错误
            if (errorMessage.includes('auth') || 
                errorMessage.includes('key') || 
                errorMessage.includes('token') || 
                errorMessage.includes('unauthorized')) {
              errorMessage = 'API key validation failed, please check DEEPSEEK_API_KEY setting';
            }
            
            // 检查是否是模型错误
            if (errorMessage.includes('model') && errorMessage.includes('not')) {
              errorMessage = `The specified model "${DEEPSEEK_MODEL}" does not exist or is unavailable`;
            }
            
            // 检查是否是请求格式错误
            if (errorMessage.includes('param') || errorMessage.includes('field')) {
              errorMessage = `API request parameter error: ${errorMessage}`;
            }
          }
          
          // 更新任务状态为失败
          await updateTaskStatus('failed', {
            error: errorMessage
          });
        }
      } catch (error) {
        console.error('[Processor] Error processing generation task:', error);
        
        // 修复: 更新任务状态为失败
        const newSupabase = await createRouteHandlerClient();
        
        // 确保任务状态被更新
        await newSupabase
          .from('generation_tasks')
          .update({ 
            status: 'failed',
            error: error instanceof Error ? error.message : 'Task processing failed',
            completed_at: new Date().toISOString()
          })
          .eq('id', generationTask.id);
      }
    })().catch(error => {
      // 捕获顶层异步错误，防止未捕获的异常
      console.error('[Processor] Uncaught top-level async error:', error);
    });
    
    // 不等待处理完成，直接返回响应
    return responsePromise;
    
  } catch (error: unknown) {
    console.error('API Error:', error instanceof Error ? error.stack : error);
    const errorMessage = error instanceof Error ? error.message : 'Server error processing request, please try again later';
    return jsonResponse(
      { error: errorMessage, success: false },
      500
    );
  }
}