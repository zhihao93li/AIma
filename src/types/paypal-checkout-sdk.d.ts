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
      execute<T>(request: any): Promise<{ result: T }>;
    }
  }
  
  namespace orders {
    class OrdersCreateRequest {
      prefer(preference: string): void;
      requestBody(body: any): void;
    }
    
    class OrdersCaptureRequest {
      constructor(orderId: string);
      prefer(preference: string): void;
    }
  }
} 