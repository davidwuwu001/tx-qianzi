import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const contract = await prisma.contract.findFirst({
      where: {
        id: params.id,
        createdById: session.user.id,
      },
      include: {
        Product: {
          select: { name: true },
        },
        ContractStatusLog: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            operatorName: true,
            remark: true,
            createdAt: true,
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: '合同不存在' }, { status: 404 });
    }

    return NextResponse.json({
      id: contract.id,
      contractNo: contract.contractNo,
      partyBName: contract.partyBName,
      partyBPhone: contract.partyBPhone,
      partyBIdCard: contract.partyBIdCard,
      status: contract.status,
      signUrl: contract.signUrl,
      signUrlExpireAt: contract.signUrlExpireAt,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      completedAt: contract.completedAt,
      rejectionReason: contract.rejectionReason,
      product: {
        name: contract.Product.name,
      },
      statusLogs: contract.ContractStatusLog,
    });
  } catch (error) {
    console.error('获取合同详情失败:', error);
    return NextResponse.json(
      { error: '获取合同详情失败' },
      { status: 500 }
    );
  }
}
