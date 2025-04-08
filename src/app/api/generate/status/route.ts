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
  console.log('收到任务状态查询请求');
  try {
    // 解析URL以获取任务ID
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    
    console.log('查询的任务ID:', taskId);
    
    if (!taskId) {
      console.log('缺少任务ID参数');
      return jsonResponse({
        error: '缺少任务ID参数',
        success: false
      }, 400);
    }
    
    // 使用新的Supabase客户端
    const supabase = await createRouteHandlerClient();
    
    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('获取用户信息失败:', authError);
      return jsonResponse({
        error: '认证失败: ' + authError.message,
        success: false
      }, 401);
    }
    
    if (!user) {
      console.log('未授权的用户尝试查询任务状态');
      return jsonResponse({
        error: '未授权，请先登录',
        success: false
      }, 401);
    }
    
    console.log('查询任务状态, 用户ID:', user.id, '任务ID:', taskId);
    
    // 查询任务状态
    const { data: task, error } = await supabase
      .from('generation_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      console.error('查询任务时出错:', error);
      return jsonResponse({
        error: '查询任务失败: ' + error.message,
        success: false
      }, 500);
    }
    
    if (!task) {
      console.log('未找到指定的任务');
      return jsonResponse({
        error: '未找到指定的任务',
        success: false
      }, 404);
    }
    
    console.log('查询到任务状态:', task.status, '任务ID:', taskId);
    
    // 根据任务状态返回不同的响应
    if (task.status === 'completed') {
      console.log('返回已完成的任务结果, 任务ID:', taskId);
      return jsonResponse({
        status: 'completed',
        result: task.result,
        points: task.remaining_points,
        success: true
      });
    } else if (task.status === 'failed') {
      console.log('返回失败的任务状态, 任务ID:', taskId, '错误:', task.error);
      return jsonResponse({
        status: 'failed',
        error: task.error || '任务处理失败',
        success: false
      });
    } else if (task.status === 'pending') {
      console.log('返回等待中的任务状态: pending');
      return jsonResponse({
        status: 'pending',
        message: '任务正在等待处理',
        success: true
      });
    } else if (task.status === 'processing') {
      console.log('返回处理中的任务状态: processing');
      return jsonResponse({
        status: 'processing',
        message: '任务正在处理中',
        success: true
      });
    } else {
      // 未知状态
      console.log('返回未知的任务状态:', task.status);
      return jsonResponse({
        status: task.status,
        message: '任务状态未知',
        success: false
      }, 500);
    }
  } catch (error: unknown) {
    console.error('查询任务状态API错误:', error instanceof Error ? error.stack : error);
    const errorMessage = error instanceof Error ? error.message : '服务器处理请求时出错';
    return jsonResponse(
      { error: errorMessage, success: false },
      500
    );
  }
} 