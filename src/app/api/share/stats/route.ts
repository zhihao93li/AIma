import { createRouteHandlerClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 创建Supabase客户端 - 使用新的异步方法
    const supabase = await createRouteHandlerClient();
    
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '未授权', success: false },
        { status: 401 }
      );
    }
    
    // 使用新的get_share_stats函数获取所有分享相关统计数据
    const { data: shareStats, error: shareStatsError } = await supabase
      .rpc('get_share_stats', { user_id: user.id });
    
    if (shareStatsError) {
      console.error('Error fetching share stats:', shareStatsError);
      return NextResponse.json(
        { error: '获取分享统计数据失败', success: false },
        { status: 500 }
      );
    }
    
    // 生成用户的分享链接
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://aima.vercel.app';
    const shareLink = `${origin}?ref=${user.id}`;
    
    // 返回分享统计数据
    return NextResponse.json({
      data: {
        ...shareStats,
        shareLink
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