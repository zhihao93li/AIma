import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// 返回JSON格式的响应
function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function GET(request: Request) {
  try {
    // 从URL中获取任务ID
    const url = new URL(request.url);
    const taskId = url.searchParams.get('taskId');
    
    console.log('收到任务状态查询请求, 任务ID:', taskId);
    
    if (!taskId) {
      console.log('缺少任务ID参数');
      return jsonResponse(
        { error: '缺少任务ID参数', success: false },
        400
      );
    }
    
    // 创建Supabase客户端
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('未授权的任务状态查询请求');
      return jsonResponse(
        { error: '未授权，请先登录', success: false },
        401
      );
    }
    
    console.log('查询用户的任务状态, 用户ID:', user.id, '任务ID:', taskId);
    
    // 查询任务状态
    const { data: task, error: taskError } = await supabase
      .from('generation_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)  // 确保只能查询自己的任务
      .single();
    
    if (taskError) {
      console.log('任务查询失败:', taskError.message);
      return jsonResponse(
        { error: '任务不存在或无权访问', success: false },
        404
      );
    }
    
    console.log('查询到任务状态:', task.status, '任务ID:', taskId);
    
    // 根据任务状态返回不同的响应
    switch (task.status) {
      case 'completed':
        console.log('返回已完成的任务结果, 长度:', task.result ? task.result.length : 0);
        return jsonResponse({
          status: 'completed',
          result: task.result,
          points: task.remaining_points,
          success: true
        });
        
      case 'failed':
        console.log('返回失败的任务信息, 错误:', task.error);
        return jsonResponse({
          status: 'failed',
          error: task.error || '生成失败，请重试',
          success: false
        }, 400);
        
      case 'pending':
      case 'processing':
        console.log('返回处理中的任务状态:', task.status);
        return jsonResponse({
          status: task.status,
          message: '任务正在处理中，请稍后再查询',
          success: true
        });
        
      default:
        console.log('未知的任务状态:', task.status);
        return jsonResponse({
          status: 'unknown',
          message: '任务状态未知',
          success: false
        });
    }
  } catch (error: unknown) {
    console.error('查询任务状态时出错:', error instanceof Error ? error.stack : error);
    const errorMessage = error instanceof Error ? error.message : '服务器处理请求时出错，请稍后重试';
    return jsonResponse(
      { error: errorMessage, success: false },
      500
    );
  }
} 