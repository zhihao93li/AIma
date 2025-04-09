import { createRouteHandlerClient } from '@/utils/supabase/server';
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
  console.log('Received task status query request');
  try {
    // 解析URL以获取任务ID
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    
    console.log('Querying task ID:', taskId);
    
    if (!taskId) {
      console.log('Missing task ID parameter');
      return jsonResponse({
        error: 'Missing task ID parameter',
        success: false
      }, 400);
    }
    
    // 使用新的Supabase客户端
    const supabase = await createRouteHandlerClient();
    
    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Failed to get user info:', authError);
      return jsonResponse({
        error: 'Authentication failed: ' + authError.message,
        success: false
      }, 401);
    }
    
    if (!user) {
      console.log('Unauthorized user attempted to query task status');
      return jsonResponse({
        error: 'Unauthorized, please log in first',
        success: false
      }, 401);
    }
    
    console.log('Querying task status, user ID:', user.id, 'task ID:', taskId);
    
    // 查询任务状态
    const { data: task, error } = await supabase
      .from('generation_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      console.error('Error querying task:', error);
      return jsonResponse({
        error: 'Failed to query task: ' + error.message,
        success: false
      }, 500);
    }
    
    if (!task) {
      console.log('Task not found');
      return jsonResponse({
        error: 'Task not found',
        success: false
      }, 404);
    }
    
    console.log('Task status found:', task.status, 'task ID:', taskId);
    
    // 根据任务状态返回不同的响应
    if (task.status === 'completed') {
      console.log('Returning completed task result, task ID:', taskId);
      return jsonResponse({
        status: 'completed',
        result: task.result,
        points: task.remaining_points,
        success: true
      });
    } else if (task.status === 'failed') {
      console.log('Returning failed task status, task ID:', taskId, 'error:', task.error);
      return jsonResponse({
        status: 'failed',
        error: task.error || 'Task processing failed',
        success: false
      });
    } else if (task.status === 'pending') {
      console.log('Returning pending task status: pending');
      return jsonResponse({
        status: 'pending',
        message: 'Task is waiting to be processed',
        success: true
      });
    } else if (task.status === 'processing') {
      console.log('Returning processing task status: processing');
      return jsonResponse({
        status: 'processing',
        message: 'Task is being processed',
        success: true
      });
    } else {
      // 未知状态
      console.log('Returning unknown task status:', task.status);
      return jsonResponse({
        status: task.status,
        message: 'Unknown task status',
        success: false
      }, 500);
    }
  } catch (error: unknown) {
    console.error('Task status API error:', error instanceof Error ? error.stack : error);
    const errorMessage = error instanceof Error ? error.message : 'Server error processing request';
    return jsonResponse(
      { error: errorMessage, success: false },
      500
    );
  }
} 