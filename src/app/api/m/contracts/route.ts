import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { contractService } from '@/services/contract.service';
import { initiateContract } from '@/services/contract-flow.service';
import { validatePartyBInfo } from '@/lib/validators';

/**
 * 创建合同 API
 * 
 * 这个 API 就像一个"签约发起器"：
 * 1. 接收乙方信息和动态表单数据
 * 2. 创建合同草稿
 * 3. 发起签署流程
 * 4. 返回签署链接
 * 
 * Requirements: 5.2, 5.3
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    
    // 调试日志：打印接收到的数据
    console.log('=== 移动端创建合同 API 接收到的数据 ===');
    console.log('body:', JSON.stringify(body, null, 2));
    console.log('body.productId:', body.productId);
    console.log('typeof body.productId:', typeof body.productId);
    
    const { 
      productId, 
      partyBName, 
      partyBPhone, 
      partyBIdCard,
      // 动态表单数据
      formData,
    } = body;
    
    console.log('解构后 productId:', productId);

    // 验证 productId
    if (!productId) {
      console.error('productId 为空！');
      return NextResponse.json(
        { error: '请选择产品' },
        { status: 400 }
      );
    }

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

    // 创建合同草稿（包含动态表单数据）
    const contract = await contractService.createDraft({
      productId,
      cityId,
      partyBName,
      partyBPhone,
      partyBIdCard: partyBIdCard || undefined,
      // 将动态表单数据存储到 formData 字段
      formData: formData || undefined,
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
