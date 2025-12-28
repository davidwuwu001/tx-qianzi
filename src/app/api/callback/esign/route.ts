/**
 * 腾讯电子签回调接口
 * 
 * 接收腾讯电子签的签署状态变更通知，更新本地合同状态
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCallbackSignature } from '@/lib/tencent-cloud-sign';
import { contractService, getContractByFlowId } from '@/services/contract.service';
import { ContractStatus } from '@/lib/contract-status';
import prisma from '@/lib/prisma';

/**
 * 签署方状态
 */
enum ApproverStatus {
  /** 待签署 */
  PENDING = 0,
  /** 待填写 */
  FILLING = 1,
  /** 已签署 */
  SIGNED = 2,
  /** 已拒签 */
  REJECTED = 3,
  /** 已过期 */
  EXPIRED = 4,
  /** 待审核 */
  PENDING_REVIEW = 5,
  /** 审核不通过 */
  REVIEW_REJECTED = 6,
}

/**
 * 流程状态
 */
enum FlowStatus {
  /** 签署中 */
  SIGNING = 1,
  /** 已完成 */
  COMPLETED = 2,
  /** 已拒签 */
  REJECTED = 3,
  /** 已过期 */
  EXPIRED = 4,
  /** 已取消 */
  CANCELLED = 5,
}

/**
 * 签署方类型
 */
enum ApproverType {
  /** 企业签署方 */
  ENTERPRISE = 0,
  /** 个人签署方 */
  PERSONAL = 1,
}

/**
 * 回调数据中的签署方信息
 */
interface ApproverInfo {
  ApproverType: ApproverType;
  ApproverName: string;
  ApproverMobile?: string;
  ApproverStatus: ApproverStatus;
  ApproverSignTime?: number;
}

/**
 * 腾讯电子签回调数据
 */
interface EsignCallbackPayload {
  FlowId: string;
  FlowStatus: FlowStatus;
  FlowMessage?: string;
  ApproverInfos?: ApproverInfo[];
  Timestamp: number;
  Sign: string;
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 记录回调日志
 */
async function logCallback(
  flowId: string,
  payload: EsignCallbackPayload,
  success: boolean,
  error?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: generateId(),
        action: 'ESIGN_CALLBACK',
        resource: 'Contract',
        resourceId: flowId,
        details: {
          flowId,
          flowStatus: payload.FlowStatus,
          flowMessage: payload.FlowMessage ?? null,
          approverInfos: payload.ApproverInfos ? JSON.parse(JSON.stringify(payload.ApproverInfos)) : null,
          timestamp: payload.Timestamp,
          success,
          error: error ?? null,
        },
      },
    });
  } catch (logError) {
    console.error('记录回调日志失败:', logError);
  }
}

/**
 * 根据流程状态映射到合同状态
 */
function mapFlowStatusToContractStatus(
  flowStatus: FlowStatus,
  approverInfos?: ApproverInfo[]
): ContractStatus | null {
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
      // 签署中状态需要检查签署方状态
      if (approverInfos && approverInfos.length > 0) {
        // 检查乙方（个人签署方）是否已签署
        const partyB = approverInfos.find(
          (a) => a.ApproverType === ApproverType.PERSONAL
        );
        if (partyB?.ApproverStatus === ApproverStatus.SIGNED) {
          // 乙方已签署，进入待甲方签署状态
          return ContractStatus.PENDING_PARTY_A;
        }
      }
      // 仍在签署中，不更新状态
      return null;
    default:
      return null;
  }
}

/**
 * POST /api/callback/esign
 * 
 * 处理腾讯电子签回调通知
 */
export async function POST(request: NextRequest) {
  let payload: EsignCallbackPayload | null = null;
  
  try {
    // 1. 解析请求体
    const rawBody = await request.text();
    payload = JSON.parse(rawBody) as EsignCallbackPayload;

    // 2. 验证必要字段
    if (!payload.FlowId || payload.FlowStatus === undefined || !payload.Sign || !payload.Timestamp) {
      await logCallback(payload?.FlowId || 'unknown', payload, false, '缺少必要字段');
      return NextResponse.json(
        { success: false, error: '缺少必要字段' },
        { status: 400 }
      );
    }

    // 3. 验证回调签名 (Requirements: 10.2)
    const signatureValid = verifyCallbackSignature(
      rawBody,
      payload.Sign,
      payload.Timestamp
    );

    if (!signatureValid) {
      await logCallback(payload.FlowId, payload, false, '签名验证失败');
      return NextResponse.json(
        { success: false, error: '签名验证失败' },
        { status: 401 }
      );
    }

    // 4. 根据FlowId查找合同
    const contract = await getContractByFlowId(payload.FlowId);
    if (!contract) {
      await logCallback(payload.FlowId, payload, false, '合同不存在');
      return NextResponse.json(
        { success: false, error: '合同不存在' },
        { status: 404 }
      );
    }

    // 5. 映射流程状态到合同状态
    const targetStatus = mapFlowStatusToContractStatus(
      payload.FlowStatus,
      payload.ApproverInfos
    );

    if (!targetStatus) {
      // 状态无需更新
      await logCallback(payload.FlowId, payload, true, '状态无需更新');
      return NextResponse.json({ success: true, message: '状态无需更新' });
    }

    // 6. 检查是否需要更新状态
    const currentStatus = contract.status as ContractStatus;
    if (currentStatus === targetStatus) {
      // 状态已经是目标状态，无需更新
      await logCallback(payload.FlowId, payload, true, '状态已是最新');
      return NextResponse.json({ success: true, message: '状态已是最新' });
    }

    // 7. 更新合同状态 (Requirements: 10.3, 10.4, 10.5)
    let remark = '';
    switch (targetStatus) {
      case ContractStatus.PENDING_PARTY_A:
        remark = '乙方签署完成，等待甲方审批';
        break;
      case ContractStatus.COMPLETED:
        remark = '签署流程完成';
        break;
      case ContractStatus.REJECTED:
        remark = payload.FlowMessage || '签署被拒绝';
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
      remark: `[回调] ${remark}`,
    });

    // 8. 记录成功日志
    await logCallback(payload.FlowId, payload, true);

    return NextResponse.json({
      success: true,
      message: '状态更新成功',
      data: {
        contractId: contract.id,
        fromStatus: currentStatus,
        toStatus: targetStatus,
      },
    });
  } catch (error) {
    console.error('处理回调失败:', error);
    
    // 记录错误日志
    if (payload?.FlowId) {
      await logCallback(
        payload.FlowId,
        payload,
        false,
        error instanceof Error ? error.message : '未知错误'
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '处理回调失败' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/callback/esign
 * 
 * 用于验证回调地址是否可访问（腾讯电子签配置回调时会发送GET请求验证）
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: '腾讯电子签回调接口',
    timestamp: Date.now(),
  });
}
