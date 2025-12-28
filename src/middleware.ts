import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * RBAC 中间件
 * 
 * 实现基于角色的访问控制：
 * - SYSTEM_ADMIN: 可访问所有管理端页面
 * - CITY_ADMIN: 只能访问签约相关页面，不能访问系统管理页面
 * - ORDINARY_USER: 只能访问移动端页面
 * 
 * Requirements: 14.6, 14.7, 15.2
 */

// 管理端路由（需要管理员权限）
const dashboardPaths = [
  '/contracts',
  '/cities',
  '/products',
  '/users',
];

// 仅系统管理员可访问的路由
const systemAdminOnlyPaths = [
  '/cities',
  '/products',
  '/users',
];

// 移动端路由（普通用户访问）
const mobilePaths = [
  '/m',
];

// 公开路由（不需要登录）
const publicPaths = [
  '/login',
  '/m/login',
  '/api/auth',
  '/api/callback',
];

// 用户角色类型
type UserRole = 'SYSTEM_ADMIN' | 'CITY_ADMIN' | 'ORDINARY_USER';

/**
 * 检查用户是否有权限访问指定路径
 * @param pathname 请求路径
 * @param role 用户角色
 * @returns 是否有权限
 */
function hasPermission(pathname: string, role: UserRole | undefined): boolean {
  // 未登录用户无权限
  if (!role) {
    return false;
  }

  // 检查是否是移动端路由
  const isMobilePath = mobilePaths.some(path => pathname.startsWith(path));
  
  // 检查是否是管理端路由
  const isDashboardPath = dashboardPaths.some(path => pathname.startsWith(path)) || pathname === '/';
  
  // 检查是否是系统管理员专属路由
  const isSystemAdminOnly = systemAdminOnlyPaths.some(path => pathname.startsWith(path));

  // 普通用户只能访问移动端
  if (role === 'ORDINARY_USER') {
    return isMobilePath;
  }

  // 系统管理员可访问所有管理端路径
  if (role === 'SYSTEM_ADMIN') {
    // 管理员不应该访问移动端
    if (isMobilePath) {
      return false;
    }
    return true;
  }

  // 城市管理员
  if (role === 'CITY_ADMIN') {
    // 城市管理员不应该访问移动端
    if (isMobilePath) {
      return false;
    }
    // 城市管理员不能访问系统管理页面
    if (isSystemAdminOnly) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * 获取用户默认重定向路径
 */
function getDefaultRedirect(role: UserRole | undefined): string {
  if (role === 'ORDINARY_USER') {
    return '/m';
  }
  // 管理员用户重定向到管理端
  return '/contracts';
}

/**
 * 获取用户登录页面
 */
function getLoginPage(pathname: string): string {
  // 移动端路由使用移动端登录页
  if (pathname.startsWith('/m')) {
    return '/m/login';
  }
  return '/login';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否是公开路由
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  // 检查是否是移动端路由
  const isMobilePath = mobilePaths.some(path => pathname.startsWith(path));
  
  // 检查是否是管理端路由
  const isDashboardPath = dashboardPaths.some(path => pathname.startsWith(path));
  
  // 检查是否是系统管理员专属路由
  const isSystemAdminOnly = systemAdminOnlyPaths.some(path => pathname.startsWith(path));

  // 获取 JWT token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;
  const userRole = token?.role as UserRole | undefined;

  // 处理根路径重定向
  if (pathname === '/' && isAuthenticated) {
    const redirectUrl = getDefaultRedirect(userRole);
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // 已登录用户访问登录页，重定向到对应首页
  if (isAuthenticated && (pathname === '/login' || pathname === '/m/login')) {
    const redirectUrl = getDefaultRedirect(userRole);
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // 未登录用户访问受保护路由，重定向到登录页
  if (!isAuthenticated && (isDashboardPath || isMobilePath || pathname === '/') && !isPublicPath) {
    const loginUrl = new URL(getLoginPage(pathname), request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 已登录用户访问受保护页面，检查权限
  if (isAuthenticated && (isDashboardPath || isMobilePath)) {
    if (!hasPermission(pathname, userRole)) {
      // 无权限，重定向到用户对应的首页
      const redirectUrl = getDefaultRedirect(userRole);
      const homeUrl = new URL(redirectUrl, request.url);
      homeUrl.searchParams.set('error', 'no_permission');
      return NextResponse.redirect(homeUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (网站图标)
     * - public 文件夹
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
