import { User_role } from "@prisma/client";

// 重新导出 Prisma 枚举类型，方便使用
export type Role = User_role;

// 认证结果
export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

// 认证用户信息
export interface AuthUser {
  id: string;
  username: string | null;
  name: string;
  phone: string;
  role: Role;
  cityId: string | null;
  cityName?: string;
}

// JWT Payload
export interface JWTPayload {
  id: string;
  username: string | null;
  name: string;
  role: Role;
  cityId: string | null;
}

// 登录请求
export interface LoginRequest {
  username: string;
  password: string;
}

// 验证码登录请求
export interface CodeLoginRequest {
  phone: string;
  code: string;
}

// Session 用户 - NextAuth 类型扩展
// 注意：这些类型扩展需要在 next-auth 配置后生效
export interface ExtendedSession {
  user: AuthUser;
}

export type ExtendedUser = AuthUser;

export type ExtendedJWT = JWTPayload;
