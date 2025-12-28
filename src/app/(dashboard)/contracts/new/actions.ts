'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createDraft, getContractById } from '@/services/contract.service';
import { initiateContract, regenerateSignUrl } from '@/services/contract-flow.service';
import { validatePartyBInfo } from '@/lib/validators';
import { sendSignLinkSms } from '@/services/sms.service';
import type { PartyType } from '@/lib/validators';

// 发起签约请求参数
interface InitiateContractParams {
  productId: string;
  partyBName: string;
  partyBPhone: string;
  partyBIdCard?: string;
  partyBType: PartyType;
  partyBOrgName?: string;
  /** 表单数据（根据产品配置的动态字段） */
  formData?: Record<string, unknown>;
  /** 是否发送短信 */
  sendSms?: boolean;
}

// 发起签约结果
interface InitiateContractResult {
  success: boolean;
  error?: string;
  data?: {
    contractId: string;
    contractNo: string;
    flowId: string;
    signUrl: string;
    signUrlExpireAt: string;
    smsSent?: boolean;
  };
}

/**
 * 发起签约 Server Action
 * 创建合同草稿并发起签署流程
 * Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.11, 11.1
 */
export async function initiateContractAction(
  params: InitiateContractParams
): Promise<InitiateContractResult> {
  try {
    // 1. 获取当前用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: '请先登录' };
    }

    const userId = session.user.id;
    const cityId = session.user.cityId;

    if (!cityId) {
      return { success: false, error: '用户未分配城市' };
    }

    // 2. 验证乙方信息
    const validationResult = validatePartyBInfo({
      name: params.partyBName,
      phone: params.partyBPhone,
      idCard: params.partyBIdCard,
      type: params.partyBType,
      orgName: params.partyBOrgName,
    });

    if (!validationResult.valid) {
      return { success: false, error: validationResult.error };
    }

    // 3. 创建合同草稿
    const contract = await createDraft({
      productId: params.productId,
      cityId,
      partyBName: params.partyBName.trim(),
      partyBPhone: params.partyBPhone.trim(),
      partyBIdCard: params.partyBIdCard?.trim(),
      partyBType: params.partyBType,
      partyBOrgName: params.partyBOrgName?.trim(),
      formData: params.formData || undefined,
      createdById: userId,
    });

    // 4. 发起签署流程
    const result = await initiateContract(contract.id, userId);

    // 5. 如果需要发送短信
    let smsSent = false;
    if (params.sendSms) {
      const smsResult = await sendSignLinkSms(
        params.partyBPhone.trim(),
        result.signUrl,
        contract.contractNo
      );
      smsSent = smsResult.success;
    }

    return {
      success: true,
      data: {
        contractId: result.contract.id,
        contractNo: result.contract.contractNo,
        flowId: result.flowId,
        signUrl: result.signUrl,
        signUrlExpireAt: result.signUrlExpireAt.toISOString(),
        smsSent,
      },
    };
  } catch (error) {
    console.error('发起签约失败:', error);
    
    // 返回友好的错误信息
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: '发起签约失败，请稍后重试' };
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


// 发送短信结果
interface SendSmsResult {
  success: boolean;
  error?: string;
}

/**
 * 发送签署链接短信 Server Action
 * Requirements: 11.1
 */
export async function sendSignLinkSmsAction(
  contractId: string
): Promise<SendSmsResult> {
  try {
    // 1. 获取当前用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: '请先登录' };
    }

    // 2. 获取合同信息
    const contract = await getContractById(contractId);
    if (!contract) {
      return { success: false, error: '合同不存在' };
    }

    // 3. 检查合同状态
    if (contract.status !== 'PENDING_PARTY_B') {
      return { success: false, error: '只有待乙方签署状态的合同才能发送短信' };
    }

    // 4. 检查签署链接
    if (!contract.signUrl) {
      return { success: false, error: '签署链接不存在，请重新生成' };
    }

    // 5. 发送短信
    const result = await sendSignLinkSms(
      contract.partyBPhone,
      contract.signUrl,
      contract.contractNo
    );

    if (!result.success) {
      return { success: false, error: result.error || '发送短信失败' };
    }

    return { success: true };
  } catch (error) {
    console.error('发送短信失败:', error);
    
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: '发送短信失败，请稍后重试' };
  }
}
