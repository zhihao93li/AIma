import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
 // 创建Supabase客户端
    const supabase = createRouteHandlerClient({ cookies });
    
    // 获取请求体
    const { sharerId } = await request.json();
    
    if (!sharerId) {
      return NextResponse.json(
        { error: '缺少分享者ID', success: false },
        { status: 400 }
      );
    }
    
    // 检查分享者是否存在
    const { data: sharer, error: sharerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', sharerId)
      .single();
    
    if (sharerError || !sharer) {
      console.error('Error fetching sharer profile:', sharerError);
      return NextResponse.json(
        { error: '分享者不存在', success: false },
        { status: 404 }
      );
    }
    
    // 获取当前访问者（如果已登录）
    const { data: { user } } = await supabase.auth.getUser();
    
    // 记录分享点击
    const { data: shareClick, error: shareClickError } = await supabase
      .from('share_clicks')
      .insert({
        sharer_id: sharerId,
        visitor_id: user?.id || null,
        logged_in: !!user
      })
      .select()
      .single();
    
    if (shareClickError) {
      console.error('Error recording share click:', shareClickError);
      return NextResponse.json(
        { error: '记录分享点击失败', success: false },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data: {
        id: shareClick.id,
        logged_in: !!user
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