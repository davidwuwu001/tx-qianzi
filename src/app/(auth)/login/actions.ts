'use server';

import { signIn } from 'next-auth/react';
import { sendVerificationCode } from '@/services/auth.service';

export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * 发送验证码 Server Action
 */
export async function sendVerificationCodeAction(
  phone: string
): Promise<ActionResult> {
  // 验证手机号格式
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return { success: false, error: '请输入正确的手机号' };
  }

  const result = await sendVerificationCode(phone);
  return result;
}

/**
 * 用户名密码登录 Server Action
 * 注意：实际登录通过 NextAuth signIn 在客户端处理
 * 这个 action 用于服务端验证逻辑（如果需要）
 */
export async function loginWithPasswordAction(
  username: string,
  password: string
): Promise<ActionResult> {
  if (!username || !password) {
    return { success: false, error: '请输入用户名和密码' };
  }

  // 实际登录通过 NextAuth 处理
  // 这里可以添加额外的服务端验证逻辑
  return { success: true };
}

/**
 * 验证码登录 Server Action
 * 注意：实际登录通过 NextAuth signIn 在客户端处理
 * 这个 action 用于服务端验证逻辑（如果需要）
 */
export async function loginWithCodeAction(
  phone: string,
  code: string
): Promise<ActionResult> {
  if (!phone || !code) {
    return { success: false, error: '请输入手机号和验证码' };
  }

  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { success: false, error: '请输入正确的手机号' };
  }

  if (!/^\d{6}$/.test(code)) {
    return { success: false, error: '验证码为6位数字' };
  }

  // 实际登录通过 NextAuth 处理
  return { success: true };
}
