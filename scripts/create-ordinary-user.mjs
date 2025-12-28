#!/usr/bin/env node

/**
 * 创建普通用户脚本
 * 创建手机号为18210443249的普通用户，仅支持验证码登录
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createOrdinaryUser() {
  try {
    console.log('开始创建普通用户...');

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { phone: '18210443249' }
    });

    if (existingUser) {
      // 如果用户已存在，更新为普通用户角色
      if (existingUser.role !== 'ORDINARY_USER') {
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            role: 'ORDINARY_USER',
            username: null,  // 普通用户不需要用户名
            password: null,  // 普通用户不需要密码
            updatedAt: new Date(),
          },
          include: {
            City: { select: { name: true } }
          }
        });
        console.log('用户已更新为普通用户角色:', updatedUser.phone);
        printUserInfo(updatedUser);
      } else {
        console.log('普通用户已存在:', existingUser.phone);
        printUserInfo(existingUser);
      }
      return;
    }

    // 查找北京城市
    let city = await prisma.city.findFirst({
      where: { 
        name: { contains: '北京' },
        isActive: true 
      }
    });

    // 如果没有北京城市，使用第一个可用城市
    if (!city) {
      city = await prisma.city.findFirst({
        where: { isActive: true }
      });
    }

    if (!city) {
      console.error('没有找到可用的城市，请先创建城市');
      process.exit(1);
    }

    console.log('使用城市:', city.name);

    // 生成用户ID
    const userId = `user-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;

    // 创建普通用户（无用户名、无密码，仅验证码登录）
    const user = await prisma.user.create({
      data: {
        id: userId,
        username: null,      // 普通用户不需要用户名
        password: null,      // 普通用户不需要密码
        phone: '18210443249',
        name: '测试普通用户',
        role: 'ORDINARY_USER',
        cityId: city.id,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        City: { select: { name: true } }
      }
    });

    console.log('普通用户创建成功!');
    printUserInfo(user);

  } catch (error) {
    console.error('创建普通用户失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function printUserInfo(user) {
  console.log('');
  console.log('用户信息:');
  console.log('- 手机号:', user.phone);
  console.log('- 姓名:', user.name);
  console.log('- 角色:', getRoleName(user.role));
  console.log('- 所属城市:', user.City?.name || '未分配');
  console.log('- 用户名:', user.username || '无（仅验证码登录）');
  console.log('');
  console.log('登录方式:');
  console.log('- 移动端验证码登录: 18210443249 + 验证码');
  console.log('- 访问地址: /m/login');
}

function getRoleName(role) {
  const roleNames = {
    'SYSTEM_ADMIN': '系统管理员',
    'CITY_ADMIN': '城市管理员',
    'ORDINARY_USER': '普通用户'
  };
  return roleNames[role] || role;
}

createOrdinaryUser();
