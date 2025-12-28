/**
 * 移动端合同详情 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = await params;

    // 查询合同详情
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        Product: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: '合同不存在' }, { status: 404 });
    }

    // 验证权限：只能查看自己创建的合同
    if (contract.createdById !== session.user.id) {
      return NextResponse.json({ error: '无权访问此合同' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: contract.id,
        contractNo: contract.contractNo,
        partyBName: contract.partyBName,
        partyBPhone: contract.partyBPhone,
        status: contract.status,
        createdAt: contract.createdAt.toISOString(),
        completedAt: contract.completedAt?.toISOString() || null,
        productName: contract.Product.name,
        formData: contract.formData as Record<string, unknown> | null,
      },
    });
  } catch (error) {
    console.error('获取合同详情失败:', error);
    return NextResponse.json(
      { error: '获取合同详情失败' },
      { status: 500 }
    );
  }
}
