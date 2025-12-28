import { prisma } from '@/lib/prisma';

// 验证码配置
const CODE_LENGTH = 6;
const CODE_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;
const LOCK_DURATION_MINUTES = 5;

/**
 * 生成6位数字验证码
 */
function generateRandomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 生成验证码并存储到数据库
 * @param phone - 手机号
 * @param type - 验证码类型，默认为 LOGIN
 * @returns 生成的验证码
 */
export async function generateCode(phone: string, type: string = 'LOGIN'): Promise<string> {
  const code = generateRandomCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

  // 删除该手机号之前未使用的同类型验证码
  await prisma.verificationCode.deleteMany({
    where: {
      phone,
      type,
      usedAt: null,
    },
  });

  // 创建新的验证码记录
  await prisma.verificationCode.create({
    data: {
      id: crypto.randomUUID(),
      phone,
      code,
      type,
      expiresAt,
      attempts: 0,
    },
  });

  return code;
}

/**
 * 验证验证码
 * @param phone - 手机号
 * @param code - 用户输入的验证码
 * @param type - 验证码类型，默认为 LOGIN
 * @returns 验证结果
 */
export async function verifyCode(
  phone: string,
  code: string,
  type: string = 'LOGIN'
): Promise<{ success: boolean; error?: string }> {
  // 开发环境调试验证码 - 仅在 DEV_VERIFY_CODE 环境变量设置时生效
  const devVerifyCode = process.env.DEV_VERIFY_CODE;
  if (devVerifyCode && code === devVerifyCode) {
    return { success: true };
  }

  // 查找最新的未使用验证码
  const verificationCode = await prisma.verificationCode.findFirst({
    where: {
      phone,
      type,
      usedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!verificationCode) {
    return { success: false, error: '验证码不存在，请重新获取' };
  }

  // 检查是否被锁定（3次错误后锁定5分钟）
  if (verificationCode.attempts >= MAX_ATTEMPTS) {
    const lockExpireTime = new Date(
      verificationCode.createdAt.getTime() + 
      (CODE_EXPIRY_MINUTES + LOCK_DURATION_MINUTES) * 60 * 1000
    );
    
    if (new Date() < lockExpireTime) {
      const remainingMinutes = Math.ceil(
        (lockExpireTime.getTime() - Date.now()) / (60 * 1000)
      );
      return { 
        success: false, 
        error: `验证码已锁定，请${remainingMinutes}分钟后重试` 
      };
    }
  }

  // 检查是否过期
  if (new Date() > verificationCode.expiresAt) {
    return { success: false, error: '验证码已过期，请重新获取' };
  }

  // 验证码匹配检查
  if (verificationCode.code !== code) {
    // 增加尝试次数
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { attempts: verificationCode.attempts + 1 },
    });

    const remainingAttempts = MAX_ATTEMPTS - verificationCode.attempts - 1;
    if (remainingAttempts <= 0) {
      return { 
        success: false, 
        error: `验证码错误次数过多，请${LOCK_DURATION_MINUTES}分钟后重试` 
      };
    }

    return { 
      success: false, 
      error: `验证码错误，还剩${remainingAttempts}次尝试机会` 
    };
  }

  // 验证成功，标记为已使用
  await prisma.verificationCode.update({
    where: { id: verificationCode.id },
    data: { usedAt: new Date() },
  });

  return { success: true };
}

/**
 * 检查手机号是否被锁定
 * @param phone - 手机号
 * @param type - 验证码类型
 * @returns 是否被锁定
 */
export async function isPhoneLocked(
  phone: string,
  type: string = 'LOGIN'
): Promise<boolean> {
  const verificationCode = await prisma.verificationCode.findFirst({
    where: {
      phone,
      type,
      usedAt: null,
      attempts: { gte: MAX_ATTEMPTS },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!verificationCode) {
    return false;
  }

  const lockExpireTime = new Date(
    verificationCode.createdAt.getTime() + 
    (CODE_EXPIRY_MINUTES + LOCK_DURATION_MINUTES) * 60 * 1000
  );

  return new Date() < lockExpireTime;
}

export const verificationService = {
  generateCode,
  verifyCode,
  isPhoneLocked,
};
