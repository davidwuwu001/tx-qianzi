/**
 * 单个合同状态同步接口
 * 
 * 手动触发从腾讯电子签同步合同状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { esignService, EsignApiError } from '@/services/esign.service';
import { contractService } from '@/services/contract.service';
import { ContractStatus, isValidTransition } from '@/lib/contract-status';

/**
 * 流程状态枚举（腾讯电子签）
 */
enum FlowStatus {
  SIGNING = 1,    // 签署中
  COMPLETED = 2,  // 已完成
  REJECTED = 3,   // 已拒签
  EXPIRED = 4,    // 已过期
  CANCELLED = 5,  // 已取消
}

/**
 * 根据流程状态映射到合同状态
 * 
 * 特殊处理：联调环境可能返回 FlowStatus=4（已过期），
 * 但实际上所有签署方都已签署完成，这种情况应该视为已完成
 */
function mapFlowStatusToContractStatus(flowStatus: FlowStatus): ContractStatus | null {
  switch (flowStatus) {
    case FlowStatus.COMPLETED:
      return ContractStatus.COMPLETED;
    case FlowStatus.REJECTED:
      return ContractStatus.REJECTED;
    case FlowStatus.EXPIRED:
      return ContractStatus.EXPIRED;
    case FlowStatus.CANCELLED:
      return ContractStatus.CANCELLED;
    case FlowStatus.SIGNING:
      return null; // 仍在签署中，不更新
    default:
      return null;
  }
}

/**
 * 检查所有签署方是否都已签署完成
 */
function checkAllApproversSigned(flowDetailInfo: {
  FlowApproverInfos?: Array<{ ApproveStatus: number }>;
}): boolean {
  if (!flowDetailInfo.FlowApproverInfos || flowDetailInfo.FlowApproverInfos.length === 0) {
    return false;
  }
  // ApproveStatus = 3 表示已签署
  return flowDetailInfo.FlowApproverInfos.every(approver => approver.ApproveStatus === 3);
}

/**
 * POST /api/m/contracts/[id]/sync
 * 
 * 同步单个合同的状态
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 验证登录状态
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 2. 查询合同
    const contract = await prisma.contract.findUnique({
      where: { id },
      select: {
        id: true,
        contractNo: true,
        flowId: true,
        status: true,
        createdById: true,
      },
    });

    if (!contract) {
      return NextResponse.json(
        { success: false, error: '合同不存在' },
        { status: 404 }
      );
    }

    // 3. 验证权限（只能同步自己创建的合同，或者管理员）
    const user = session.user as { id: string; role: string };
    if (contract.createdById !== user.id && user.role === 'ORDINARY') {
      return NextResponse.json(
        { success: false, error: '无权操作此合同' },
        { status: 403 }
      );
    }

    // 4. 检查是否有 flowId
    if (!contract.flowId) {
      return NextResponse.json(
        { success: false, error: '合同未发起签署流程' },
        { status: 400 }
      );
    }

    // 5. 调用腾讯电子签 API 查询流程状态
    const flowInfo = await esignService.describeFlowInfo(contract.flowId);
    
    console.log('=== 同步合同状态 ===');
    console.log('合同ID:', contract.id);
    console.log('FlowId:', contract.flowId);
    console.log('当前状态:', contract.status);
    console.log('腾讯返回状态:', flowInfo.FlowStatus);
    console.log('签署方信息:', JSON.stringify(flowInfo.FlowApproverInfos, null, 2));

    // 6. 映射流程状态到合同状态
    let targetStatus = mapFlowStatusToContractStatus(flowInfo.FlowStatus as FlowStatus);

    // 特殊处理：联调环境可能返回 FlowStatus=4（已过期），
    // 但实际上所有签署方都已签署完成，这种情况应该视为已完成
    if (targetStatus === ContractStatus.EXPIRED && checkAllApproversSigned(flowInfo)) {
      console.log('所有签署方都已签署，将状态修正为已完成');
      targetStatus = ContractStatus.COMPLETED;
    }

    if (!targetStatus) {
      // 状态无需更新（仍在签署中）
      return NextResponse.json({
        success: true,
        data: {
          updated: false,
          fromStatus: contract.status,
          toStatus: null,
          message: '合同仍在签署中',
        },
      });
    }

    const currentStatus = contract.status as ContractStatus;

    // 7. 检查状态是否已经是目标状态
    if (currentStatus === targetStatus) {
      return NextResponse.json({
        success: true,
        data: {
          updated: false,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          message: '状态已是最新',
        },
      });
    }

    // 8. 检查状态转换是否有效
    if (!isValidTransition(currentStatus, targetStatus)) {
      return NextResponse.json({
        success: false,
        error: `无效的状态转换: ${currentStatus} → ${targetStatus}`,
      });
    }

    // 9. 更新合同状态
    let remark = '';
    switch (targetStatus) {
      case ContractStatus.COMPLETED:
        remark = '签署流程完成';
        break;
      case ContractStatus.REJECTED:
        remark = flowInfo.FlowMessage || '签署被拒绝';
        break;
      case ContractStatus.EXPIRED:
        remark = '签署链接已过期';
        break;
      case ContractStatus.CANCELLED:
        remark = '签署流程已取消';
        break;
    }

    await contractService.updateStatus({
      id: contract.id,
      status: targetStatus,
      remark: `[手动刷新] ${remark}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        updated: true,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        message: remark,
      },
    });

  } catch (error) {
    console.error('同步合同状态失败:', error);

    if (error instanceof EsignApiError) {
      return NextResponse.json(
        { success: false, error: `API错误: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: '同步状态失败，请稍后重试' },
      { status: 500 }
    );
  }
}
