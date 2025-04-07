import { createServerComponentClient, createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// 创建Supabase客户端（服务端组件）
export const createClient = () => {
  return createServerComponentClient({ cookies });
};

// 创建Supabase客户端（API路由）
export const createRouteClient = () => {
  return createRouteHandlerClient({ cookies });
};

// 创建Supabase客户端（API路由处理程序）- 解决cookies()需要await的问题
export const createRouteHandlerClientWithCookies = async () => {
  const cookieStore = cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
};