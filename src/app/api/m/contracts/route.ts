import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { contractService } from '@/services/contract.service';
import { initiateContract } from '@/services/contract-flow.service';
import { validatePartyBInfo } from '@/lib/validators';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, partyBName, partyBPhone, partyBIdCard } = body;

    // 验证乙方信息
    const validation = validatePartyBInfo({
      name: partyBName,
      phone: partyBPhone,
      idCard: partyBIdCard,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    // 获取用户城市ID
    const cityId = session.user.cityId;
    if (!cityId) {
      return NextResponse.json(
        { error: '用户未分配城市' },
        { status: 400 }
      );
    }

    // 创建合同草稿
    const contract = await contractService.createDraft({
      productId,
      cityId,
      partyBName,
      partyBPhone,
      partyBIdCard: partyBIdCard || undefined,
      createdById: session.user.id,
    });

    // 发起签约流程
    const initiatedContract = await initiateContract(contract.id);

    return NextResponse.json({
      success: true,
      contract: {
        id: initiatedContract.id,
        contractNo: initiatedContract.contractNo,
        signUrl: initiatedContract.signUrl,
        partyBName: initiatedContract.partyBName,
        partyBPhone: initiatedContract.partyBPhone,
      },
    });
  } catch (error) {
    console.error('创建合同失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建合同失败' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    // 普通用户只能查看自己创建的合同
    const result = await contractService.getContracts({
      createdById: session.user.id,
      status: status as any,
      search,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('获取合同列表失败:', error);
    return NextResponse.json(
      { error: '获取合同列表失败' },
      { status: 500 }
    );
  }
}
