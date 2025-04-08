import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { createPayPalOrder, pointsPackages } from '@/lib/paypal';

// 创建PayPal订单API
export async function POST(request: Request) {
  try {
    // 获取请求数据
    const { packageId, currency = 'USD' } = await request.json();
    
    // 验证请求数据
    if (!packageId) {
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
    const supabase = await createRouteClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '未授权' },
        { status: 401 }
      );
    }
    
    // 创建PayPal订单数据
    const { orderData, pointsPackage: packageInfo } = await createPayPalOrder({
      packageId,
      currency,
      userId: session.user.id,
    });
    
    // 确保orderData包含id字段
    if (!orderData || typeof orderData !== 'object') {
      throw new Error('创建PayPal订单失败：无效的订单数据');
    }
    
    // 返回订单数据给前端
    return NextResponse.json({
      success: true,
      data: {
        orderData: {
          ...orderData,
          // 确保id字段存在，PayPal SDK需要这个字段
          id: orderData.id || '',
        },
        packageInfo,
      },
    });
  } catch (error) {
    console.error('创建PayPal订单失败:', error);
    return NextResponse.json(
      { success: false, error: '创建订单失败' },
      { status: 500 }
    );
  }
}