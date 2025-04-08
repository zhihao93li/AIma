import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

// 确认支付API
export async function POST(request: Request) {
  try {
    // 获取请求数据
    const { paymentId } = await request.json();
    
    // 验证请求数据
    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    // 获取当前用户
    const supabase = await createRouteClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '未授权' },
        { status: 401 }
      );
    }
    
    // 从数据库获取支付记录
    const { data: paymentRecord, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', paymentId)
      .eq('user_id', session.user.id)
      .single();
    
    if (fetchError || !paymentRecord) {
      return NextResponse.json(
        { success: false, error: '支付记录不存在' },
        { status: 404 }
      );
    }
    
    // 检查支付状态
    if (paymentRecord.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: '支付已完成',
        data: { points: paymentRecord.points_added }
      });
    }
    
    // PayPal支付已在前端完成，这里只需验证数据库中的记录
    // 由于PayPal支付在前端完成后会直接更新数据库，所以这里只需检查记录状态
    // 如果支付记录状态不是completed，则返回错误
    if (paymentRecord.status !== 'completed') {
      return NextResponse.json({
        success: false,
        error: '支付尚未完成',
        status: paymentRecord.status
      });
    }
    
    // 开始数据库事务
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      return NextResponse.json(
        { success: false, error: '获取用户资料失败' },
        { status: 500 }
      );
    }
    
    // 更新用户积分
    const newPoints = (profile.points || 0) + paymentRecord.points_added;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', session.user.id);
    
    if (updateError) {
      return NextResponse.json(
        { success: false, error: '更新积分失败' },
        { status: 500 }
      );
    }
    
    // 记录积分交易
    const { error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: session.user.id,
        amount: paymentRecord.points_added,
        type: 'purchase',
        description: `购买${paymentRecord.points_added}积分`
      });
    
    if (transactionError) {
      console.error('Error recording point transaction:', transactionError);
      // 继续执行，不中断流程
    }
    
    // 更新支付记录状态
    const { error: statusError } = await supabase
      .from('payments')
      .update({ status: 'completed' })
      .eq('id', paymentRecord.id);
    
    if (statusError) {
      console.error('Error updating payment status:', statusError);
      // 继续执行，不中断流程
    }
    
    // 返回成功结果
    return NextResponse.json({
      success: true,
      message: '支付确认成功',
      data: {
        points: newPoints,
        pointsAdded: paymentRecord.points_added
      }
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { success: false, error: '确认支付失败' },
      { status: 500 }
    );
  }
}