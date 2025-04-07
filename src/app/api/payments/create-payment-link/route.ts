import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { createPayPalOrder, pointsPackages } from '@/lib/paypal';

// 创建PayPal支付链接API
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
    const supabase = createRouteClient();
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
    
    // 确保orderData包含id字段和links字段
    if (!orderData || !orderData.links || !Array.isArray(orderData.links)) {
      throw new Error('创建PayPal订单失败：无效的订单数据');
    }
    
    // 查找付款链接
    const approveLink = orderData.links.find((link: { rel: string; href: string; method: string }) => link.rel === 'approve');
    if (!approveLink || !approveLink.href) {
      throw new Error('创建PayPal订单失败：未找到支付链接');
    }
    
    // 返回支付链接给前端
    return NextResponse.json({
      success: true,
      data: {
        paymentLink: approveLink.href,
        orderId: orderData.id,
        packageInfo,
      },
    });
  } catch (error) {
    console.error('创建PayPal支付链接失败:', error);
    return NextResponse.json(
      { success: false, error: '创建支付链接失败' },
      { status: 500 }
    );
  }
}
