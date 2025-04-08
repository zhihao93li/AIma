// 简化的PayPal Checkout Server SDK声明
declare module '@paypal/checkout-server-sdk' {
  namespace core {
    class PayPalEnvironment {
      constructor(clientId: string | undefined, clientSecret: string);
    }
    
    class SandboxEnvironment extends PayPalEnvironment {}
    class LiveEnvironment extends PayPalEnvironment {}
    
    class PayPalHttpClient {
      constructor(environment: PayPalEnvironment);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute<T>(request: any): Promise<{ result: T }>;
    }
  }
  
  namespace orders {
    // 定义订单响应接口
    interface OrderResponse {
      id: string;
      status: string;
      links?: Array<{
        href: string;
        rel: string;
        method: string;
      }>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    }
    
    class OrdersCreateRequest {
      prefer(preference: string): void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requestBody(body: any): void;
    }
    
    class OrdersCaptureRequest {
      constructor(orderId: string);
      prefer(preference: string): void;
    }
  }
} 