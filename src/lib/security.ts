/**
 * 安全工具函数
 * 
 * 实现安全相关功能：
 * - 输入清理（防止 XSS）
 * - 登录频率限制
 * - CSRF 保护
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.5
 */

/**
 * 登录尝试记录
 */
interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

// 登录尝试记录（生产环境应使用 Redis）
const loginAttempts = new Map<string, LoginAttempt>();

// 登录频率限制配置
const LOGIN_RATE_LIMIT = {
  maxAttempts: 5,        // 最大尝试次数
  windowMs: 60 * 1000,   // 时间窗口（1分钟）
  lockDurationMs: 5 * 60 * 1000, // 锁定时长（5分钟）
};

/**
 * 检查登录频率限制
 * Requirements: 14.3
 * 
 * @param ip IP 地址
 * @returns 是否允许登录
 */
export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  // 如果没有记录，允许登录
  if (!attempt) {
    return { allowed: true };
  }

  // 如果被锁定，检查是否已过锁定期
  if (attempt.lockedUntil) {
    if (now < attempt.lockedUntil) {
      const retryAfter = Math.ceil((attempt.lockedUntil - now) / 1000);
      return { allowed: false, retryAfter };
    }
    // 锁定期已过，重置记录
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  // 检查时间窗口
  if (now - attempt.firstAttempt > LOGIN_RATE_LIMIT.windowMs) {
    // 时间窗口已过，重置记录
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  // 检查尝试次数
  if (attempt.count >= LOGIN_RATE_LIMIT.maxAttempts) {
    // 达到限制，锁定账户
    attempt.lockedUntil = now + LOGIN_RATE_LIMIT.lockDurationMs;
    const retryAfter = Math.ceil(LOGIN_RATE_LIMIT.lockDurationMs / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

/**
 * 记录登录尝试
 * 
 * @param ip IP 地址
 * @param success 是否成功
 */
export function recordLoginAttempt(ip: string, success: boolean): void {
  if (success) {
    // 登录成功，清除记录
    loginAttempts.delete(ip);
    return;
  }

  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (!attempt) {
    // 首次失败
    loginAttempts.set(ip, {
      count: 1,
      firstAttempt: now,
    });
  } else if (now - attempt.firstAttempt > LOGIN_RATE_LIMIT.windowMs) {
    // 时间窗口已过，重新计数
    loginAttempts.set(ip, {
      count: 1,
      firstAttempt: now,
    });
  } else {
    // 增加计数
    attempt.count++;
  }
}

/**
 * 清理 HTML 标签（防止 XSS）
 * Requirements: 14.5
 * 
 * @param input 输入字符串
 * @returns 清理后的字符串
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * 清理用户输入
 * Requirements: 14.5
 * 
 * @param input 输入字符串
 * @returns 清理后的字符串
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // 移除控制字符
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // 移除潜在的 SQL 注入字符（Prisma 已经处理，这是额外保护）
  sanitized = sanitized.replace(/['";\\]/g, '');
  
  // 限制长度
  if (sanitized.length > 10000) {
    sanitized = sanitized.slice(0, 10000);
  }
  
  return sanitized.trim();
}

/**
 * 验证 CSRF Token
 * Requirements: 14.2
 * 
 * 注意：Next.js Server Actions 已内置 CSRF 保护
 * 这里提供额外的 API 路由保护
 * 
 * @param request 请求对象
 * @returns 是否有效
 */
export function validateCsrfToken(request: Request): boolean {
  // 检查 Origin 头
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  
  if (!origin || !host) {
    // 同源请求可能没有 Origin 头
    return true;
  }
  
  try {
    const originUrl = new URL(origin);
    // 验证 Origin 与 Host 匹配
    return originUrl.host === host;
  } catch {
    return false;
  }
}

/**
 * 获取客户端 IP
 * 
 * @param request 请求对象
 * @returns IP 地址
 */
export function getClientIp(request: Request): string {
  // 优先使用代理头
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // 默认返回未知
  return 'unknown';
}

/**
 * 安全响应头
 * Requirements: 14.1
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * 添加安全响应头
 * 
 * @param response 响应对象
 * @returns 带安全头的响应
 */
export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  
  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value);
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
