// PayPal服务端SDK工具函数
// 使用类型导入语法确保TypeScript能正确识别类型
import * as checkoutNodeJssdk from '@paypal/checkout-server-sdk';

// 创建PayPal环境
export function getPayPalEnvironment() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  
  // 根据环境变量判断是否为生产环境
  const isProd = process.env.NODE_ENV === 'production';
  
  if (isProd) {
    return new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
  } else {
    return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
  }
}

// 创建PayPal客户端
export function getPayPalClient() {
  return new checkoutNodeJssdk.core.PayPalHttpClient(getPayPalEnvironment());
}

// 创建PayPal订单
export async function createOrder(value: string, currency: string, description: string): Promise<checkoutNodeJssdk.orders.OrderResponse> {
  const client = getPayPalClient();
  
  // 检查站点URL是否已配置
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.error('创建PayPal订单失败: NEXT_PUBLIC_SITE_URL环境变量未设置');
    throw new Error('站点URL未配置，无法创建PayPal订单');
  }
  
  // 确保URL不以斜杠结尾
  if (siteUrl.endsWith('/')) {
    siteUrl = siteUrl.slice(0, -1);
  }
  
  // 在开发环境中，检查当前窗口的URL，以确保回调URL与当前服务器匹配
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    try {
      // 尝试从当前窗口获取正确的主机和端口
      const currentUrl = new URL(window.location.href);
      const devSiteUrl = `${currentUrl.protocol}//${currentUrl.host}`;
      console.log('开发环境检测到当前URL:', devSiteUrl);
      siteUrl = devSiteUrl;
    } catch (error) {
      console.warn('无法从当前窗口获取URL，将使用环境变量中的URL:', siteUrl, error);
    }
  }
  
  const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  
  const requestBody = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: value,
        },
        description: description,
      },
    ],
    application_context: {
      brand_name: 'AIma创意骂人生成器',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
      return_url: `${siteUrl}/buy-points?success=true`,
      cancel_url: `${siteUrl}/buy-points?canceled=true`,
      landing_page: 'LOGIN', // 添加登录页面类型
      locale: 'zh-CN', // 设置中文语言
    },
  };
  
  request.requestBody(requestBody);
  
  try {
    console.log('正在创建PayPal订单，请求体:', JSON.stringify(requestBody));
    const response = await client.execute(request);
    console.log('PayPal订单创建成功，订单ID:', response.result.id);
    return response.result;
  } catch (err) {
    console.error('创建PayPal订单失败:', err);
    throw err;
  }
}

// 捕获PayPal订单支付
export async function captureOrder(orderId: string): Promise<checkoutNodeJssdk.orders.OrderResponse> {
  const client = getPayPalClient();
  
  const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
  request.prefer('return=representation');
  
  try {
    const response = await client.execute(request);
    return response.result;
  } catch (e) {
    console.error('捕获PayPal订单支付失败:', e);
    throw e;
  }
}