// PayPal配置和工具函数
import { createClient } from './supabase/server';

// 积分套餐定义
export const pointsPackages = [
  {
    id: 'basic',
    name: '基础套餐',
    points: 100,
    price: 10,
    description: '适合轻度使用的用户'
  },
  {
    id: 'standard',
    name: '标准套餐',
    points: 300,
    price: 25,
    description: '最受欢迎的选择，性价比高'
  },
  {
    id: 'premium',
    name: '高级套餐',
    points: 800,
    price: 50,
    description: '适合重度使用的用户，超值优惠'
  }
];

// 创建PayPal订单
export async function createPayPalOrder({
  packageId,
  currency = 'USD',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId, /* 用于记录订单关联的用户，在数据库中存储订单时使用，在API调用中需要传递此参数 */
}: {
  packageId: string;
  currency?: string;
  userId: string; // 保留参数，虽然当前函数未直接使用，但API调用需要传递
}) {
  // 查找对应的积分套餐
  const pointsPackage = pointsPackages.find(pkg => pkg.id === packageId);
  if (!pointsPackage) {
    throw new Error('无效的积分套餐');
  }

  // 导入PayPal SDK工具函数
  const { createOrder } = await import('./paypal-sdk');
  
  try {
    // 使用PayPal SDK创建真实订单
    const orderData = await createOrder(
      pointsPackage.price.toString(),
      currency,
      `购买${pointsPackage.points}积分 - ${pointsPackage.name}`
    );
    
    // 返回订单数据和套餐信息
    return {
      orderData,
      pointsPackage,
    };
  } catch (error) {
    console.error('创建PayPal订单失败:', error);
    throw new Error(`创建PayPal订单失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// 处理PayPal支付成功后的操作
export async function processPayPalPayment({
  orderId,
  userId,
  pointsToAdd,
  amount,
  currency,
  supabase, // 添加supabase客户端参数
}: {
  orderId: string;
  userId: string;
  pointsToAdd: number;
  amount: number;
  currency: string;
  supabase?: ReturnType<typeof createClient>; // 可选参数，允许传入supabase客户端
}) {
  // 如果没有传入supabase客户端，则创建一个
  const supabaseClient = supabase || createClient();

  // 开始数据库事务
  let payment;
  try {
    // 尝试设置RLS角色为rls_definer，以绕过RLS策略
    await supabaseClient.rpc('set_config', {
      parameter: 'role',
      value: 'rls_definer'
    });

    console.log('正在创建支付记录，参数:', {
      user_id: userId,
      amount,
      currency,
      points_added: pointsToAdd,
      payment_id: orderId,
      status: 'completed',
    });

    const { data: paymentData, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        user_id: userId,
        amount,
        currency,
        points_added: pointsToAdd,
        payment_id: orderId,
        status: 'completed',
      })
      .select()
      .single();

    if (paymentError) {
      console.error('创建支付记录失败，详细错误:', paymentError);
      console.error('错误代码:', paymentError.code);
      console.error('错误详情:', paymentError.details);
      console.error('错误提示:', paymentError.hint);
      console.error('错误消息:', paymentError.message);
      throw new Error(`创建支付记录失败: ${paymentError.message || JSON.stringify(paymentError)}`);
    }

    payment = paymentData;
    console.log('支付记录创建成功:', payment);
    
    // 更新用户积分
    console.log('正在更新用户积分，参数:', {
      user_id: userId,
      points: pointsToAdd,
      description: `购买了${pointsToAdd}积分`,
      type: 'purchase',
    });
    
    const { error: updateError } = await supabaseClient.rpc('add_points', {
      user_id: userId,
      points: pointsToAdd,
      description: `购买了${pointsToAdd}积分`,
      type: 'purchase',
    });

    if (updateError) {
      console.error('更新积分失败，详细错误:', updateError);
      console.error('错误代码:', updateError.code);
      console.error('错误详情:', updateError.details);
      console.error('错误提示:', updateError.hint);
      console.error('错误消息:', updateError.message);
      throw new Error(`更新积分失败: ${updateError.message || JSON.stringify(updateError)}`);
    }
    
    console.log('用户积分更新成功');
    return payment;
  } catch (error) {
    console.error('支付处理过程中发生异常:', error);
    throw error;
  }
}