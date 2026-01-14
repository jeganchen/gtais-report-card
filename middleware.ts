/**
 * Next.js Middleware - 认证保护
 */

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // 公开路由
  const publicRoutes = ['/login'];
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);

  // API路由不需要重定向
  if (nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 已登录用户访问登录页，重定向到学生列表
  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL('/students', nextUrl));
  }

  // 未登录用户访问受保护页面，重定向到登录页
  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (网站图标)
     * - public 文件夹中的文件
     */
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\..*$).*)',
  ],
};

