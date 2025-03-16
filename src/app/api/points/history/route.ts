import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // 创建Supabase客户端
    const supabase = createRouteHandlerClient({ cookies });
    
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '未授权', success: false },
        { status: 401 }
      );
    }
    
    // 获取URL参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    
    // 计算分页偏移量
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    // 查询积分交易记录
    const { data: transactions, error, count } = await supabase
      .from('point_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) {
      console.error('Error fetching point transactions:', error);
      return NextResponse.json(
        { error: '获取积分历史失败', success: false },
        { status: 500 }
      );
    }
    
    // 返回积分交易记录和分页信息
    return NextResponse.json({
      data: transactions,
      pagination: {
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      },
      success: true
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: '服务器处理请求时出错，请稍后重试。', success: false },
      { status: 500 }
    );
  }
}