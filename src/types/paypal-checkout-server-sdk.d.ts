declare module '@paypal/checkout-server-sdk' {
  namespace core {
    class PayPalEnvironment {
      constructor(clientId: string | undefined, clientSecret: string);
    }
    
    class SandboxEnvironment extends PayPalEnvironment {
      constructor(clientId: string | undefined, clientSecret: string);
    }
    
    class LiveEnvironment extends PayPalEnvironment {
      constructor(clientId: string | undefined, clientSecret: string);
    }
    
    class PayPalHttpClient {
      constructor(environment: PayPalEnvironment);
      execute<T>(request: OrdersCreateRequest | OrdersCaptureRequest): Promise<{ result: T }>;
    }
  }
  
  namespace orders {
    class OrdersCreateRequest {
      prefer(preference: string): void;
      requestBody(body: OrderRequestBody): void;
    }
    
    class OrdersCaptureRequest {
      constructor(orderId: string);
      prefer(preference: string): void;
    }

    // 订单请求体类型
    interface OrderRequestBody {
      intent: string;
      purchase_units: Array<{
        amount: {
          currency_code: string;
          value: string;
        };
        description?: string;
      }>;
      application_context?: {
        brand_name?: string;
        shipping_preference?: string;
        user_action?: string;
        return_url?: string;
        cancel_url?: string;
        [key: string]: string | undefined;
      };
      links?: Array<{
        href: string;
        rel: string;
        method: string;
      }>;
      purchase_units?: Array<{
        reference_id?: string;
        amount?: {
          currency_code: string;
          value: string;
        };
        payee?: {
          email_address?: string;
          merchant_id?: string;
        };
        [key: string]: unknown;
      }>;
      payer?: {
        name?: {
          given_name?: string;
          surname?: string;
        };
        email_address?: string;
        payer_id?: string;
        [key: string]: unknown;
      };
      create_time?: string;
      update_time?: string;
      [key: string]: unknown; // 允许其他属性，但提供了更具体的类型
    }

    // 定义订单响应类型
    interface OrderResponse {
      id: string;
      status: string;
      links?: Array<{
        href: string;
        rel: string;
        method: string;
      }>;
      purchase_units?: Array<{
        reference_id?: string;
        amount?: {
          currency_code: string;
          value: string;
        };
        payee?: {
          email_address?: string;
          merchant_id?: string;
        };
        [key: string]: unknown;
      }>;
      payer?: {
        name?: {
          given_name?: string;
          surname?: string;
        };
        email_address?: string;
        payer_id?: string;
        [key: string]: unknown;
      };
      create_time?: string;
      update_time?: string;
      [key: string]: unknown; // 允许其他属性，但提供了更具体的类型
    }
  }
  
}

declare const checkoutNodeJssdk: {
  core: typeof core;
  orders: typeof orders;
};

export = checkoutNodeJssdk;