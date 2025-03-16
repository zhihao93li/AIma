import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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
    
    // 获取请求体
    const { referrerId } = await request.json();
    
    if (!referrerId) {
      return NextResponse.json(
        { error: '缺少推荐人ID', success: false },
        { status: 400 }
      );
    }
    
    // 检查推荐人是否存在
    const { data: referrer, error: referrerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', referrerId)
      .single();
    
    if (referrerError || !referrer) {
      console.error('Error fetching referrer profile:', referrerError);
      return NextResponse.json(
        { error: '推荐人不存在', success: false },
        { status: 404 }
      );
    }
    
    // 检查是否已经被推荐过
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', user.id)
      .single();
    
    if (existingReferral) {
      return NextResponse.json(
        { error: '用户已经被推荐过', success: false },
        { status: 400 }
      );
    }
    
    // 创建推荐关系
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referred_id: user.id
      })
      .select()
      .single();
    
    if (referralError) {
      console.error('Error creating referral:', referralError);
      return NextResponse.json(
        { error: '创建推荐关系失败', success: false },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data: {
        id: referral.id,
        created_at: referral.created_at
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