import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 查询用户创建的合同统计
    const [total, pending, completed, rejected] = await Promise.all([
      prisma.contract.count({
        where: { createdById: userId },
      }),
      prisma.contract.count({
        where: {
          createdById: userId,
          status: { in: ['PENDING_PARTY_B', 'PENDING_PARTY_A'] },
        },
      }),
      prisma.contract.count({
        where: {
          createdById: userId,
          status: 'COMPLETED',
        },
      }),
      prisma.contract.count({
        where: {
          createdById: userId,
          status: 'REJECTED',
        },
      }),
    ]);

    return NextResponse.json({
      total,
      pending,
      completed,
      rejected,
    });
  } catch (error) {
    console.error('获取移动端统计失败:', error);
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
