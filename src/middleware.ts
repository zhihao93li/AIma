import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  
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