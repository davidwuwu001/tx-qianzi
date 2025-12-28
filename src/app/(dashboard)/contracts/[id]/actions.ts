'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getContractDetail, approveContract } from '@/services/contract.service';
import { regenerateSignUrl } from '@/services/contract-flow.service';

// 合同详情类型
interface ContractDetailResponse {
  id: string;
  contractNo: string;
  flowId: string | null;
  productId: string;
  productName: string;
  cityId: string;
  cityName: string;
  partyBName: string;
  partyBPhone: string;
  partyBIdCard: string | null;
  partyBType: string;
  partyBOrgName: string | null;
  formData: Record<string, unknown> | null;
  status: string;
  signUrl: string | null;
  signUrlExpireAt: string | null;
  approvedAt: string | null;
  approvedByName: string | null;
  rejectionReason: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  statusLogs: StatusLogItem[];
}

// 状态日志项
interface StatusLogItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  operatorName: string | null;
  remark: string | null;
  createdAt: string;
}

// 获取合同详情结果
interface GetContractDetailResult {
  success: boolean;
  error?: string;
  data?: ContractDetailResponse;
}

/**
 * 获取合同详情 Server Action
 * Requirements: 3.6
 */
export async function getContractDetailAction(
  contractId: string
): Promise<GetContractDetailResult> {
  try {
    // 1. 获取当前用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: '请先登录' };
    }

    const user = session.user;
    const isSystemAdmin = user.role === 'SYSTEM_ADMIN';
    const userCityId = user.cityId;

    // 2. 获取合同详情（带城市数据隔离）
    const contract = await getContractDetail(contractId, userCityId, isSystemAdmin);

    if (!contract) {
      return { success: false, error: '合同不存在或无权访问' };
    }

    // 3. 转换日期为字符串
    const data: ContractDetailResponse = {
      ...contract,
      signUrlExpireAt: contract.signUrlExpireAt?.toISOString() ?? null,
      approvedAt: contract.approvedAt?.toISOString() ?? null,
      createdAt: contract.createdAt.toISOString(),
      updatedAt: contract.updatedAt.toISOString(),
      completedAt: contract.completedAt?.toISOString() ?? null,
      statusLogs: contract.statusLogs.map(log => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      })),
    };

    return { success: true, data };
  } catch (error) {
    console.error('获取合同详情失败:', error);
    
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: '获取合同详情失败，请稍后重试' };
  }
}

// 重新生成签署链接结果
interface RegenerateSignUrlResult {
  success: boolean;
  error?: string;
  data?: {
    signUrl: string;
    signUrlExpireAt: string;
  };
}

/**
 * 重新生成签署链接 Server Action
 * Requirements: 3.7
 */
export async function regenerateSignUrlAction(
  contractId: string
): Promise<RegenerateSignUrlResult> {
  try {
    // 1. 获取当前用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: '请先登录' };
    }

    // 2. 重新生成签署链接
    const result = await regenerateSignUrl(contractId);

    return {
      success: true,
      data: {
        signUrl: result.signUrl,
        signUrlExpireAt: result.signUrlExpireAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('重新生成签署链接失败:', error);
    
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: '重新生成签署链接失败，请稍后重试' };
  }
}

// 审批合同结果
interface ApproveContractResult {
  success: boolean;
  error?: string;
  data?: {
    status: string;
    approvedAt: string;
    completedAt: string | null;
  };
}

/**
 * 审批合同 Server Action
 * Requirements: 4.4, 4.5, 4.6
 * 
 * @param contractId 合同ID
 * @param approved 是否通过
 * @param reason 拒绝原因（拒绝时必填）
 */
export async function approveContractAction(
  contractId: string,
  approved: boolean,
  reason?: string
): Promise<ApproveContractResult> {
  try {
    // 1. 获取当前用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: '请先登录' };
    }

    const userId = session.user.id;

    // 2. 调用审批服务
    const result = await approveContract({
      id: contractId,
      approved,
      reason,
      operatorId: userId,
    });

    return {
      success: true,
      data: {
        status: result.contract.status,
        approvedAt: result.contract.approvedAt?.toISOString() ?? new Date().toISOString(),
        completedAt: result.contract.completedAt?.toISOString() ?? null,
      },
    };
  } catch (error) {
    console.error('审批合同失败:', error);
    
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: '审批合同失败，请稍后重试' };
  }
}
