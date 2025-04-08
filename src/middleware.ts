import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  // 使用新的方式创建Supabase客户端
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => {
          return request.cookies.get(name)?.value;
        },
        set: (name, value, options) => {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove: (name, options) => {
          res.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );
  
  // 获取会话（这也会刷新会话）
  const { data: { session } } = await supabase.auth.getSession();
  
  // 添加调试日志
  console.log('Middleware - Session:', session ? 'Exists' : 'Null');
  if (session) {
    console.log('Middleware - User ID:', session.user.id);
  }
  
  // 如果用户访问/profile路由但未登录，则重定向到首页
  if (request.nextUrl.pathname.startsWith('/profile') && !session) {
    console.log('Middleware - Redirecting to home page');
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  return res;
}

// 配置中间件应用的路由
export const config = {
  matcher: ['/profile/:path*', '/auth/callback'],
}; 