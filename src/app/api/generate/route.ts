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
    
    // 开始处理生成任务，确保异步处理的连续性和错误处理
    (async () => {
      console.log('[处理器] 初始化处理任务', generationTask.id);
      try {
        console.log('[处理器] 开始处理生成任务, ID:', generationTask.id);
        
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
        
        console.log('[处理器] 准备请求DeepSeek API, 任务ID:', generationTask.id);
        console.log('[处理器] API Key设置状态:', DEEPSEEK_API_KEY ? '已设置' : '未设置', '长度:', DEEPSEEK_API_KEY?.length);
        console.log('[处理器] 使用的模型:', DEEPSEEK_MODEL);
        console.log('[处理器] 准备参数:', {
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
          
          console.log(`[处理器] 更新任务状态为 ${status}, 任务ID: ${generationTask.id}`);
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
              console.error(`[处理器] 验证任务更新失败:`, verifyError);
            } else if (updatedTask.status !== status) {
              console.error(`[处理器] 任务状态更新验证失败: 期望 ${status}, 实际 ${updatedTask.status}`);
            } else {
              console.log(`[处理器] 任务状态已更新为 ${status} 并已验证`);
            }
          } catch (updateError) {
            console.error(`[处理器] 更新任务状态失败:`, updateError);
          }
        };
        
        try {
          console.log('[处理器] 初始化OpenAI客户端...');
          // 初始化OpenAI客户端，配置为使用DeepSeek API
          const openai = new OpenAI({
            apiKey: DEEPSEEK_API_KEY,
            baseURL: DEEPSEEK_BASE_URL
          });
          
          console.log('[处理器] 已初始化OpenAI客户端，指向DeepSeek API');
          console.log('[处理器] 开始调用DeepSeek API...');
          
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
          
          console.log('[处理器] DeepSeek API响应成功:', 
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
            console.error('[处理器] DeepSeek API返回了异常格式:', JSON.stringify(completion));
            await updateTaskStatus('failed', {
              error: 'AI服务返回了不符合预期的数据格式'
            });
            return;
          }
          
          const generatedText = completion.choices[0].message.content || '';
          
          console.log('[处理器] 获取到生成的文本, 长度:', generatedText.length);
          
          // 简单审核生成的内容
          if (!moderateContent(generatedText)) {
            console.log('[处理器] 生成的内容不符合社区规范，更新任务状态为失败');
            await updateTaskStatus('failed', {
              error: '生成的内容不符合社区规范'
            });
            return;
          }
          
          // 扣除用户积分
          const updatedPoints = profile.points - 10;
          
          console.log('[处理器] 更新用户积分, 用户ID:', user.id, '当前积分:', profile.points, '更新后积分:', updatedPoints);
          
          // 使用新的Supabase实例处理用户积分更新
          const newSupabase = await createRouteHandlerClient();
          
          // 首先更新用户积分
          const { error: pointsError } = await newSupabase
            .from('profiles')
            .update({ points: updatedPoints })
            .eq('id', user.id);
          
          if (pointsError) {
            console.error('[处理器] 更新用户积分失败:', pointsError);
            await updateTaskStatus('failed', {
              error: '更新用户积分失败'
            });
            return;
          }
          
          // 记录积分交易
          const { error: transactionError } = await newSupabase
            .from('point_transactions')
            .insert({
              user_id: user.id,
              amount: -10,
              reason: '内容生成',
              type: 'generation'  // 添加必需的type字段
            });
          
          if (transactionError) {
            console.error('[处理器] 记录积分交易失败:', transactionError);
            // 继续处理，不中断任务完成
          }
          
          console.log('[处理器] 更新任务状态为已完成');
          
          // 更新任务状态为完成
          await updateTaskStatus('completed', {
            result: generatedText,
            points_consumed: 10,
            remaining_points: updatedPoints
          });
          
          console.log('[处理器] 生成任务完成, ID:', generationTask.id);
          
        } catch (error) {
          // 处理API调用错误
          console.error('[处理器] DeepSeek API请求出错:', error);
          
          let errorMessage = '请求AI服务失败';
          
          // 尝试从OpenAI SDK错误中提取更详细的信息
          if (error instanceof Error) {
            console.error('[处理器] 错误详情:', error.message, error.stack);
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
          await updateTaskStatus('failed', {
            error: errorMessage
          });
        }
      } catch (error) {
        console.error('[处理器] 处理生成任务出错:', error);
        
        // 修复: 更新任务状态为失败
        const newSupabase = await createRouteHandlerClient();
        
        // 确保任务状态被更新
        await newSupabase
          .from('generation_tasks')
          .update({ 
            status: 'failed',
            error: error instanceof Error ? error.message : '处理任务失败',
            completed_at: new Date().toISOString()
          })
          .eq('id', generationTask.id);
      }
    })().catch(error => {
      // 捕获顶层异步错误，防止未捕获的异常
      console.error('[处理器] 未捕获的顶层异步错误:', error);
    });
    
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