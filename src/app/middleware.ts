import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = new URL(request.url);
  
  // 处理分享链接参数
  const refId = searchParams.get('ref');
  
  // 如果是首页且有推荐人ID参数，记录分享点击
  if (pathname === '/' && refId) {
    // 将推荐人ID存储在cookie中，以便用户注册时使用
    const response = NextResponse.next();
    
    // 设置cookie，有效期7天
    response.cookies.set('referrer_id', refId, { 
      maxAge: 60 * 60 * 24 * 7,
      path: '/' 
    });
    
    // 尝试记录分享点击
    try {
      await fetch(`${request.nextUrl.origin}/api/share/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sharerId: refId }),
      });
    } catch (error) {
      console.error('Error recording share click:', error);
      // 继续处理请求，即使记录失败
    }
    
    return response;
  }
  
  return NextResponse.next();
}

// 配置中间件应用的路径
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};