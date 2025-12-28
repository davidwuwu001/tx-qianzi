/**
 * 定时状态同步接口
 * 
 * 作为回调机制的备用方案，定期查询待处理状态的合同并同步最新状态
 * 建议由阿里云定时任务每5分钟触发一次
 * 
 * Requirements: 3.9, 10.6
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { esignService, EsignApiError } from '@/services/esign.service';
import { contractService } from '@/services/contract.service';
import { ContractStatus, isValidTransition } from '@/lib/contract-status';

/**
 * 流程状态枚举（腾讯电子签）
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
 * 同步结果统计
 */
interface SyncResult {
  total: number;
  updated: number;
  failed: number;
  skipped: number;
  details: Array<{
    contractId: string;
    contractNo: string;
    flowId: string;
    fromStatus: string;
    toStatus: string | null;
    success: boolean;
    error?: string;
  }>;
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 根据流程状态映射到合同状态
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
      // 签署中状态需要更详细的签署方信息来判断
      // 这里简单处理：如果当前是待乙方签署，保持不变
      // 如果需要更精确的判断，可以调用 DescribeFlowBriefs 获取签署方详情
      return null;
    default:
      return null;
  }
}

/**
 * 记录同步日志
 */
async function logSync(result: SyncResult): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: generateId(),
        action: 'CRON_SYNC_STATUS',
        resource: 'Contract',
        details: {
          total: result.total,
          updated: result.updated,
          failed: result.failed,
          skipped: result.skipped,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('记录同步日志失败:', error);
  }
}

/**
 * 验证请求授权
 * 支持两种方式：
 * 1. Authorization header 中的 Bearer token
 * 2. 查询参数中的 secret
 */
function verifyAuthorization(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  
  // 如果没有配置 CRON_SECRET，允许所有请求（开发环境）
  if (!cronSecret) {
    console.warn('警告: CRON_SECRET 未配置，跳过授权验证');
    return true;
  }

  // 检查 Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const [type, token] = authHeader.split(' ');
    if (type === 'Bearer' && token === cronSecret) {
      return true;
    }
  }

  // 检查查询参数
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret === cronSecret) {
    return true;
  }

  return false;
}

/**
 * GET /api/cron/sync-status
 * 
 * 同步待处理合同的状态
 * 
 * 查询条件：
 * - 状态为 PENDING_PARTY_B（待乙方签署）或 PENDING_PARTY_A（待甲方签署）
 * - 有有效的 flowId
 * 
 * 授权方式：
 * - Authorization: Bearer <CRON_SECRET>
 * - 或 ?secret=<CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  // 1. 验证授权
  if (!verifyAuthorization(request)) {
    return NextResponse.json(
      { success: false, error: '未授权访问' },
      { status: 401 }
    );
  }

  const result: SyncResult = {
    total: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  try {
    // 2. 查询所有待处理状态的合同
    const pendingContracts = await prisma.contract.findMany({
      where: {
        status: {
          in: ['PENDING_PARTY_B', 'PENDING_PARTY_A'],
        },
        flowId: {
          not: null,
        },
      },
      select: {
        id: true,
        contractNo: true,
        flowId: true,
        status: true,
      },
    });

    result.total = pendingContracts.length;

    if (pendingContracts.length === 0) {
      await logSync(result);
      return NextResponse.json({
        success: true,
        message: '没有需要同步的合同',
        result,
      });
    }

    // 3. 逐个查询并更新状态
    for (const contract of pendingContracts) {
      const detail: SyncResult['details'][0] = {
        contractId: contract.id,
        contractNo: contract.contractNo,
        flowId: contract.flowId!,
        fromStatus: contract.status,
        toStatus: null,
        success: false,
      };

      try {
        // 调用腾讯电子签 API 查询流程状态
        const flowInfo = await esignService.describeFlowInfo(contract.flowId!);
        
        // 映射流程状态到合同状态
        const targetStatus = mapFlowStatusToContractStatus(flowInfo.FlowStatus as FlowStatus);

        if (!targetStatus) {
          // 状态无需更新（仍在签署中）
          detail.success = true;
          detail.toStatus = null;
          result.skipped++;
          result.details.push(detail);
          continue;
        }

        const currentStatus = contract.status as ContractStatus;

        // 检查状态是否已经是目标状态
        if (currentStatus === targetStatus) {
          detail.success = true;
          detail.toStatus = targetStatus;
          result.skipped++;
          result.details.push(detail);
          continue;
        }

        // 检查状态转换是否有效
        if (!isValidTransition(currentStatus, targetStatus)) {
          detail.success = false;
          detail.toStatus = targetStatus;
          detail.error = `无效的状态转换: ${currentStatus} → ${targetStatus}`;
          result.failed++;
          result.details.push(detail);
          continue;
        }

        // 更新合同状态
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
          remark: `[定时同步] ${remark}`,
        });

        detail.success = true;
        detail.toStatus = targetStatus;
        result.updated++;
        result.details.push(detail);

      } catch (error) {
        detail.success = false;
        
        if (error instanceof EsignApiError) {
          detail.error = `API错误: ${error.code} - ${error.message}`;
        } else if (error instanceof Error) {
          detail.error = error.message;
        } else {
          detail.error = '未知错误';
        }
        
        result.failed++;
        result.details.push(detail);
        
        console.error(`同步合同 ${contract.contractNo} 失败:`, error);
      }
    }

    // 4. 记录同步日志
    await logSync(result);

    return NextResponse.json({
      success: true,
      message: `同步完成: ${result.updated} 更新, ${result.skipped} 跳过, ${result.failed} 失败`,
      result,
    });

  } catch (error) {
    console.error('状态同步失败:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '状态同步失败',
        result,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/sync-status
 * 
 * 同步指定合同的状态（手动触发）
 * 
 * 请求体：
 * - contractIds: string[] - 要同步的合同ID列表（可选，不传则同步所有待处理合同）
 */
export async function POST(request: NextRequest) {
  // 1. 验证授权
  if (!verifyAuthorization(request)) {
    return NextResponse.json(
      { success: false, error: '未授权访问' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const contractIds = body.contractIds as string[] | undefined;

    // 如果没有指定合同ID，调用 GET 方法同步所有待处理合同
    if (!contractIds || contractIds.length === 0) {
      return GET(request);
    }

    const result: SyncResult = {
      total: contractIds.length,
      updated: 0,
      failed: 0,
      skipped: 0,
      details: [],
    };

    // 查询指定的合同
    const contracts = await prisma.contract.findMany({
      where: {
        id: { in: contractIds },
        flowId: { not: null },
      },
      select: {
        id: true,
        contractNo: true,
        flowId: true,
        status: true,
      },
    });

    for (const contract of contracts) {
      const detail: SyncResult['details'][0] = {
        contractId: contract.id,
        contractNo: contract.contractNo,
        flowId: contract.flowId!,
        fromStatus: contract.status,
        toStatus: null,
        success: false,
      };

      try {
        // 调用腾讯电子签 API 查询流程状态
        const flowInfo = await esignService.describeFlowInfo(contract.flowId!);
        
        // 映射流程状态到合同状态
        const targetStatus = mapFlowStatusToContractStatus(flowInfo.FlowStatus as FlowStatus);

        if (!targetStatus) {
          detail.success = true;
          detail.toStatus = null;
          result.skipped++;
          result.details.push(detail);
          continue;
        }

        const currentStatus = contract.status as ContractStatus;

        if (currentStatus === targetStatus) {
          detail.success = true;
          detail.toStatus = targetStatus;
          result.skipped++;
          result.details.push(detail);
          continue;
        }

        if (!isValidTransition(currentStatus, targetStatus)) {
          detail.success = false;
          detail.toStatus = targetStatus;
          detail.error = `无效的状态转换: ${currentStatus} → ${targetStatus}`;
          result.failed++;
          result.details.push(detail);
          continue;
        }

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
          remark: `[手动同步] ${remark}`,
        });

        detail.success = true;
        detail.toStatus = targetStatus;
        result.updated++;
        result.details.push(detail);

      } catch (error) {
        detail.success = false;
        
        if (error instanceof EsignApiError) {
          detail.error = `API错误: ${error.code} - ${error.message}`;
        } else if (error instanceof Error) {
          detail.error = error.message;
        } else {
          detail.error = '未知错误';
        }
        
        result.failed++;
        result.details.push(detail);
        
        console.error(`同步合同 ${contract.contractNo} 失败:`, error);
      }
    }

    // 记录同步日志
    await logSync(result);

    return NextResponse.json({
      success: true,
      message: `同步完成: ${result.updated} 更新, ${result.skipped} 跳过, ${result.failed} 失败`,
      result,
    });

  } catch (error) {
    console.error('状态同步失败:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '状态同步失败',
      },
      { status: 500 }
    );
  }
}
