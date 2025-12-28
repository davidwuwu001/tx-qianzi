import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { esignService } from '@/services/esign.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 验证合同属于当前用户
    const contract = await prisma.contract.findFirst({
      where: {
        id: params.id,
        createdById: session.user.id,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: '合同不存在' }, { status: 404 });
    }

    if (contract.status !== 'PENDING_PARTY_B') {
      return NextResponse.json(
        { error: '只有待乙方签署状态的合同可以重新生成链接' },
        { status: 400 }
      );
    }

    if (!contract.flowId) {
      return NextResponse.json(
        { error: '合同流程ID不存在' },
        { status: 400 }
      );
    }

    // 调用腾讯电子签API重新生成签署链接
    const signUrlResult = await esignService.createFlowSignUrl({
      flowId: contract.flowId,
      flowApproverInfos: [
        {
          approverName: contract.partyBName,
          approverMobile: contract.partyBPhone,
        },
      ],
    });

    // 更新数据库
    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        signUrl: signUrlResult.signUrl,
        signUrlExpireAt: new Date(Date.now() + 30 * 60 * 1000), // 30分钟后过期
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      signUrl: signUrlResult.signUrl,
    });
  } catch (error) {
    console.error('重新生成签署链接失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '重新生成签署链接失败' },
      { status: 500 }
    );
  }
}
