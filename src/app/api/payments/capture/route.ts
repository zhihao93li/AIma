import { NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/supabase/server';
import { processPayPalPayment, pointsPackages } from '@/lib/paypal';
import { captureOrder } from '@/lib/paypal-sdk';

// 捕获PayPal支付API
export async function POST(request: Request) {
  try {
    // 获取请求数据
    const { orderID, packageId, currency = 'USD' } = await request.json();
    
    // 验证请求数据
    if (!orderID || !packageId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    // 查找对应的积分套餐
    const pointsPackage = pointsPackages.find(pkg => pkg.id === packageId);
    if (!pointsPackage) {
      return NextResponse.json(
        { success: false, error: '无效的积分套餐' },
        { status: 400 }
      );
    }
    
    // 获取当前用户
    const supabase = await createRouteHandlerClientWithCookies();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '未授权' },
        { status: 401 }
      );
    }
    
    // 使用PayPal SDK捕获支付
    const captureResult = await captureOrder(orderID);
    
    // 验证支付状态
    if (captureResult.status !== 'COMPLETED') {
      throw new Error(`支付未完成，当前状态: ${captureResult.status}`);
    }
    
    // 处理支付并添加积分
    const payment = await processPayPalPayment({
      orderId: orderID,
      userId: session.user.id,
      pointsToAdd: pointsPackage.points,
      amount: pointsPackage.price,
      currency,
      supabase, // 传入已创建的supabase客户端
    });
    
    // 返回处理结果
    return NextResponse.json({
      success: true,
      data: {
        payment,
        points: pointsPackage.points,
      },
    });
  } catch (error) {
    console.error('处理PayPal支付失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '处理支付失败', 
        message: error instanceof Error ? error.message : '未知错误' 
      },
      { status: 500 }
    );
  }
}