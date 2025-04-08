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
    
    // 获取用户资料（包含积分余额）
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
    
    // 获取积分交易统计 - 使用原始SQL查询替代group方法
    const { data: stats, error: statsError } = await supabase
      .from('point_transactions')
      .select('type, sum(amount)')
      .eq('user_id', user.id)
      .order('type');
    
    if (statsError) {
      console.error('Error fetching point stats:', statsError);
      return NextResponse.json(
        { error: '获取积分统计失败', success: false },
        { status: 500 }
      );
    }
    
    // 获取推荐统计
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('id', { count: 'exact' })
      .eq('referrer_id', user.id);
    
    if (referralsError) {
      console.error('Error fetching referrals:', referralsError);
      return NextResponse.json(
        { error: '获取推荐统计失败', success: false },
        { status: 500 }
      );
    }
    
    // 获取内容生成统计
    const { data: generations, error: generationsError } = await supabase
      .from('generations')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id);
    
    if (generationsError) {
      console.error('Error fetching generations:', generationsError);
      return NextResponse.json(
        { error: '获取内容生成统计失败', success: false },
        { status: 500 }
      );
    }
    
    // 返回统计数据
    return NextResponse.json({
      data: {
        currentPoints: profile.points,
        transactionStats: stats,
        referralsCount: referrals.length,
        generationsCount: generations.length,
        remainingGenerations: Math.floor(profile.points / 10) // 每次生成消耗10积分
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