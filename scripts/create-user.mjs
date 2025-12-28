#!/usr/bin/env node

/**
 * 创建用户脚本
 * 用于创建手机号为18210443249的普通用户
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createUser() {
  try {
    console.log('开始创建用户...');

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { phone: '18210443249' }
    });

    if (existingUser) {
      console.log('用户已存在:', existingUser.username);
      return;
    }

    // 检查是否有可用的城市
    const city = await prisma.city.findFirst({
      where: { isActive: true }
    });

    if (!city) {
      console.error('没有找到可用的城市，请先运行 npm run seed');
      process.exit(1);
    }

    console.log('使用城市:', city.name);

    // 生成用户ID
    const userId = `user-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
    
    // 加密密码 (默认密码: User123!)
    const password = 'User123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        id: userId,
        username: 'user18210443249',
        password: hashedPassword,
        phone: '18210443249',
        name: '普通用户',
        role: 'CITY_ADMIN',
        cityId: city.id,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        City: {
          select: { name: true }
        }
      }
    });

    console.log('用户创建成功!');
    console.log('用户信息:');
    console.log('- 用户名:', user.username);
    console.log('- 手机号:', user.phone);
    console.log('- 姓名:', user.name);
    console.log('- 角色:', user.role === 'CITY_ADMIN' ? '城市管理员' : '系统管理员');
    console.log('- 所属城市:', user.City?.name);
    console.log('- 默认密码:', password);
    console.log('');
    console.log('登录信息:');
    console.log('- 用户名登录: user18210443249 / User123!');
    console.log('- 手机号登录: 18210443249 / 验证码');

  } catch (error) {
    console.error('创建用户失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();