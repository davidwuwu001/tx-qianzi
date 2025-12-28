import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import { generateCode, verifyCode as verifyVerificationCode } from './verification.service';
import { AuthResult, AuthUser } from '@/types/auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * 使用用户名密码登录
 * @param username - 用户名
 * @param password - 密码
 * @returns 认证结果
 */
export async function loginWithPassword(
  username: string,
  password: string
): Promise<AuthResult> {
  try {
    // 开发环境管理员账号 - 仅在环境变量设置时生效，不需要数据库验证
    const devAdminUsername = process.env.DEV_ADMIN_USERNAME;
    const devAdminPassword = process.env.DEV_ADMIN_PASSWORD;
    if (devAdminUsername && devAdminPassword && 
        username === devAdminUsername && password === devAdminPassword) {
      // 直接返回虚拟的系统管理员用户，不查询数据库
      const authUser: AuthUser = {
        id: 'dev-admin',
        username: devAdminUsername,
        name: '开发管理员',
        phone: '00000000000',
        role: 'SYSTEM_ADMIN',
        cityId: null,
      };
      return { success: true, user: authUser };
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return { success: false, error: '用户名或密码错误' };
    }

    if (!user.isActive) {
      return { success: false, error: '账户已被禁用，请联系管理员' };
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return { success: false, error: '用户名或密码错误' };
    }

    // 获取城市名称
    let cityName: string | undefined;
    if (user.cityId) {
      const city = await prisma.city.findUnique({
        where: { id: user.cityId },
      });
      cityName = city?.name;
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      phone: user.phone,
      role: user.role,
      cityId: user.cityId,
      cityName,
    };

    return { success: true, user: authUser };
  } catch (error) {
    console.error('Login with password error:', error);
    return { success: false, error: '登录失败，请稍后重试' };
  }
}

/**
 * 使用手机验证码登录
 * @param phone - 手机号
 * @param code - 验证码
 * @returns 认证结果
 */
export async function loginWithCode(
  phone: string,
  code: string
): Promise<AuthResult> {
  try {
    // 验证验证码
    const verifyResult = await verifyVerificationCode(phone, code);
    if (!verifyResult.success) {
      return { success: false, error: verifyResult.error };
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      return { success: false, error: '该手机号未注册' };
    }

    if (!user.isActive) {
      return { success: false, error: '账户已被禁用，请联系管理员' };
    }

    // 获取城市名称
    let cityName: string | undefined;
    if (user.cityId) {
      const city = await prisma.city.findUnique({
        where: { id: user.cityId },
      });
      cityName = city?.name;
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      phone: user.phone,
      role: user.role,
      cityId: user.cityId,
      cityName,
    };

    return { success: true, user: authUser };
  } catch (error) {
    console.error('Login with code error:', error);
    return { success: false, error: '登录失败，请稍后重试' };
  }
}

/**
 * 发送验证码
 * @param phone - 手机号
 * @returns 发送结果
 */
export async function sendVerificationCode(
  phone: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查手机号是否已注册
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      return { success: false, error: '该手机号未注册' };
    }

    if (!user.isActive) {
      return { success: false, error: '账户已被禁用，请联系管理员' };
    }

    // 生成验证码
    const code = await generateCode(phone);

    // TODO: 调用短信服务发送验证码
    // 目前仅在开发环境打印验证码
    console.log(`[DEV] Verification code for ${phone}: ${code}`);

    return { success: true };
  } catch (error) {
    console.error('Send verification code error:', error);
    return { success: false, error: '发送验证码失败，请稍后重试' };
  }
}

/**
 * 验证当前会话
 * @returns 当前登录用户或null
 */
export async function validateSession(): Promise<AuthUser | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return null;
    }

    return {
      id: session.user.id,
      username: session.user.username,
      name: session.user.name,
      phone: session.user.phone,
      role: session.user.role as AuthUser['role'],
      cityId: session.user.cityId,
      cityName: session.user.cityName || undefined,
    };
  } catch (error) {
    console.error('Validate session error:', error);
    return null;
  }
}

/**
 * 获取当前登录用户（从数据库获取最新信息）
 * @returns 当前登录用户或null
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.isActive) {
      return null;
    }

    // 获取城市名称
    let cityName: string | undefined;
    if (user.cityId) {
      const city = await prisma.city.findUnique({
        where: { id: user.cityId },
      });
      cityName = city?.name;
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      phone: user.phone,
      role: user.role,
      cityId: user.cityId,
      cityName,
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

/**
 * 修改密码
 * @param userId - 用户ID
 * @param oldPassword - 旧密码
 * @param newPassword - 新密码
 * @returns 修改结果
 */
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: '用户不存在' };
    }

    const isValid = await verifyPassword(oldPassword, user.password);
    if (!isValid) {
      return { success: false, error: '原密码错误' };
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, error: '修改密码失败，请稍后重试' };
  }
}

export const authService = {
  loginWithPassword,
  loginWithCode,
  sendVerificationCode,
  validateSession,
  getCurrentUser,
  changePassword,
};
