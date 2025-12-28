import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { smsService } from '@/services/sms.service';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { contractId, phone } = body;

    if (!contractId || !phone) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 验证合同属于当前用户
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        createdById: session.user.id,
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: '合同不存在' },
        { status: 404 }
      );
    }

    if (!contract.signUrl) {
      return NextResponse.json(
        { error: '签署链接不存在' },
        { status: 400 }
      );
    }

    // 发送短信
    await smsService.sendSignLinkSms(phone, contract.signUrl, contract.partyBName);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('发送短信失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '发送短信失败' },
      { status: 500 }
    );
  }
}
