import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 创建Supabase客户端（服务端组件）
export const createClient = async () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name) => {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
        set: async (name, value, options) => {
          const cookieStore = await cookies();
          cookieStore.set(name, value, options);
        },
        remove: async (name, options) => {
          const cookieStore = await cookies();
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
};

// 创建Supabase客户端（API路由）
export const createRouteClient = async () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name) => {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
        set: async (name, value, options) => {
          const cookieStore = await cookies();
          cookieStore.set(name, value, options);
        },
        remove: async (name, options) => {
          const cookieStore = await cookies();
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
};

// 创建Supabase客户端（API路由处理程序）- 解决cookies()需要await的问题
export const createRouteHandlerClientWithCookies = async () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name) => {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
        set: async (name, value, options) => {
          const cookieStore = await cookies();
          cookieStore.set(name, value, options);
        },
        remove: async (name, options) => {
          const cookieStore = await cookies();
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
};