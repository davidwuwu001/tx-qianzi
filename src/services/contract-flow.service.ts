/**
 * 合同发起流程编排服务
 *
 * 负责编排合同发起的完整流程：
 * CreateFlow → CreateDocument → StartFlow → CreateFlowSignUrl
 *
 * 实现事务性：任一步骤失败则回滚状态
 */

import { Contract, Contract_status as PrismaContractStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ContractStatus } from "@/lib/contract-status";
import {
  esignService,
  ApproverType,
  EsignApiError,
  type FlowApprover,
  type FormField,
} from "./esign.service";

// 环境变量 - 甲方企业信息
const PARTY_A_ORG_NAME = process.env.PARTY_A_ORG_NAME || "甲方企业";
const PARTY_A_SIGNER_NAME = process.env.PARTY_A_SIGNER_NAME || "企业签署人";
const PARTY_A_SIGNER_MOBILE = process.env.PARTY_A_SIGNER_MOBILE || "";

// 签署完成跳转URL
const SIGN_COMPLETE_JUMP_URL = process.env.SIGN_COMPLETE_JUMP_URL || "";

/**
 * 合同发起流程错误
 */
export class ContractFlowError extends Error {
  constructor(
    message: string,
    public code: string,
    public step: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = "ContractFlowError";
  }
}

/**
 * 合同发起结果
 */
export interface InitiateContractResult {
  contract: Contract;
  flowId: string;
  signUrl: string;
  signUrlExpireAt: Date;
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}


/**
 * 创建状态变更日志
 */
async function createStatusLog(params: {
  contractId: string;
  fromStatus: ContractStatus | null;
  toStatus: ContractStatus;
  operatorId?: string | null;
  remark?: string | null;
}): Promise<void> {
  const id = generateId();

  let operatorName: string | null = null;
  if (params.operatorId) {
    const user = await prisma.user.findUnique({
      where: { id: params.operatorId },
      select: { name: true },
    });
    operatorName = user?.name ?? null;
  }

  await prisma.contractStatusLog.create({
    data: {
      id,
      contractId: params.contractId,
      fromStatus: params.fromStatus as PrismaContractStatus | null,
      toStatus: params.toStatus as PrismaContractStatus,
      operatorId: params.operatorId,
      operatorName,
      remark: params.remark,
    },
  });
}

/**
 * 构建签署方列表
 *
 * 签署顺序：乙方先签 → 甲方后签（自动签署）
 */
function buildApprovers(contract: {
  partyBName: string;
  partyBPhone: string;
  partyBIdCard: string | null;
  partyBType: string;
  partyBOrgName: string | null;
}): FlowApprover[] {
  const approvers: FlowApprover[] = [];

  // 乙方签署方（个人或企业）
  if (contract.partyBType === "PERSONAL") {
    approvers.push({
      ApproverType: ApproverType.PERSONAL,
      ApproverName: contract.partyBName,
      ApproverMobile: contract.partyBPhone,
      ApproverIdCardNumber: contract.partyBIdCard || undefined,
      SignOrder: 0,
    });
  } else {
    // 企业签署方
    approvers.push({
      ApproverType: ApproverType.ENTERPRISE,
      ApproverName: contract.partyBName,
      ApproverMobile: contract.partyBPhone,
      OrganizationName: contract.partyBOrgName || undefined,
      ApproverIdCardNumber: contract.partyBIdCard || undefined,
      SignOrder: 0,
    });
  }

  // 甲方签署方（企业自动签署）
  approvers.push({
    ApproverType: ApproverType.ENTERPRISE,
    ApproverName: PARTY_A_SIGNER_NAME,
    ApproverMobile: PARTY_A_SIGNER_MOBILE,
    OrganizationName: PARTY_A_ORG_NAME,
    SignOrder: 1,
  });

  return approvers;
}


/**
 * 构建表单字段
 *
 * 将合同的formData转换为腾讯电子签的FormFields格式
 * 根据产品的formFields配置进行验证和转换
 */
function buildFormFields(
  formData: Record<string, unknown> | null,
  formFieldsConfig: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
  }> | null
): FormField[] {
  if (!formData) {
    return [];
  }

  const fields: FormField[] = [];

  // 如果有配置，只处理配置中定义的字段
  if (formFieldsConfig && formFieldsConfig.length > 0) {
    for (const config of formFieldsConfig) {
      const value = formData[config.name];
      
      // 跳过空值（除非是必填字段，但必填字段应该在创建合同时就验证了）
      if (value === null || value === undefined || value === '') {
        continue;
      }

      // 根据字段类型转换值
      let stringValue: string;
      
      if (config.type === 'date') {
        // 日期类型：如果是 dayjs 对象，转换为 YYYY-MM-DD 格式
        if (typeof value === 'object' && value !== null && 'format' in value) {
          stringValue = (value as { format: (format: string) => string }).format('YYYY-MM-DD');
        } else if (typeof value === 'string') {
          stringValue = value;
        } else {
          stringValue = String(value);
        }
      } else if (config.type === 'number') {
        // 数字类型：转换为字符串
        stringValue = String(value);
      } else {
        // 文本类型：直接转换为字符串
        stringValue = String(value);
      }

      fields.push({
        ComponentName: config.name,
        ComponentValue: stringValue,
      });
    }
  } else {
    // 如果没有配置，使用原来的逻辑（向后兼容）
    for (const [key, value] of Object.entries(formData)) {
      if (value !== null && value !== undefined && value !== '') {
        fields.push({
          ComponentName: key,
          ComponentValue: String(value),
        });
      }
    }
  }

  return fields;
}

/**
 * 发起合同签署流程
 *
 * 按顺序执行：CreateFlow → CreateDocument → StartFlow → CreateFlowSignUrl
 * 任一步骤失败则回滚状态
 *
 * @param contractId 合同ID
 * @param operatorId 操作人ID
 * @returns 发起结果
 */
export async function initiateContract(
  contractId: string,
  operatorId?: string
): Promise<InitiateContractResult> {
  // 1. 查询合同及关联信息
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      Product: true,
    },
  });

  if (!contract) {
    throw new ContractFlowError(
      "合同不存在",
      "CONTRACT_NOT_FOUND",
      "INIT"
    );
  }

  // 验证合同状态
  if (contract.status !== "DRAFT") {
    throw new ContractFlowError(
      `合同状态不正确，当前状态: ${contract.status}`,
      "INVALID_CONTRACT_STATUS",
      "INIT"
    );
  }

  // 验证产品模板ID
  if (!contract.Product.templateId) {
    throw new ContractFlowError(
      "产品未配置模板ID",
      "MISSING_TEMPLATE_ID",
      "INIT"
    );
  }

  let flowId: string | null = null;

  try {
    // 2. 创建签署流程 (CreateFlow)
    const approvers = buildApprovers(contract);
    const flowName = `${contract.Product.name} - ${contract.partyBName}`;

    const createFlowResult = await esignService.createFlow({
      FlowName: flowName,
      Approvers: approvers,
      Unordered: false, // 有序签署：乙方先签，甲方后签
      FlowDescription: `合同编号: ${contract.contractNo}`,
    });

    flowId = createFlowResult.FlowId;

    // 3. 创建电子文档 (CreateDocument)
    const formFields = buildFormFields(
      contract.formData as Record<string, unknown> | null,
      contract.Product.formFields as Array<{
        name: string;
        label: string;
        type: string;
        required: boolean;
      }> | null
    );

    await esignService.createDocument({
      FlowId: flowId,
      TemplateId: contract.Product.templateId,
      FileNames: [`${contract.contractNo}.pdf`],
      FormFields: formFields.length > 0 ? formFields : undefined,
    });

    // 4. 发起签署流程 (StartFlow)
    await esignService.startFlow(flowId);

    // 5. 获取乙方签署链接 (CreateFlowSignUrl)
    const signUrlResult = await esignService.createFlowSignUrl({
      FlowId: flowId,
      FlowApproverInfos: [
        {
          ApproverName: contract.partyBName,
          ApproverMobile: contract.partyBPhone,
          ApproverType:
            contract.partyBType === "PERSONAL"
              ? ApproverType.PERSONAL
              : ApproverType.ENTERPRISE,
          OrganizationName:
            contract.partyBType === "ENTERPRISE"
              ? contract.partyBOrgName || undefined
              : undefined,
        },
      ],
      JumpUrl: SIGN_COMPLETE_JUMP_URL || undefined,
      UrlType: 0, // 签署链接
    });

    // 计算签署链接过期时间（30分钟）
    const signUrlExpireAt = new Date(signUrlResult.ExpireTime * 1000);

    // 6. 更新合同状态和信息
    const updatedContract = await prisma.contract.update({
      where: { id: contractId },
      data: {
        flowId,
        status: "PENDING_PARTY_B",
        signUrl: signUrlResult.SignUrl,
        signUrlExpireAt,
        updatedAt: new Date(),
      },
    });

    // 7. 记录状态变更日志
    await createStatusLog({
      contractId,
      fromStatus: ContractStatus.DRAFT,
      toStatus: ContractStatus.PENDING_PARTY_B,
      operatorId,
      remark: "发起签约流程",
    });

    return {
      contract: updatedContract,
      flowId,
      signUrl: signUrlResult.SignUrl,
      signUrlExpireAt,
    };
  } catch (error) {
    // 错误处理：记录失败日志
    console.error("合同发起流程失败:", error);

    // 如果是EsignApiError，转换为ContractFlowError
    if (error instanceof EsignApiError) {
      throw new ContractFlowError(
        error.message,
        error.code,
        "ESIGN_API",
        error
      );
    }

    // 如果已经是ContractFlowError，直接抛出
    if (error instanceof ContractFlowError) {
      throw error;
    }

    // 其他错误
    throw new ContractFlowError(
      "合同发起流程失败",
      "INITIATE_FAILED",
      "UNKNOWN",
      error as Error
    );
  }
}


/**
 * 重新生成签署链接
 *
 * 用于签署链接过期后重新生成
 *
 * @param contractId 合同ID
 * @returns 新的签署链接信息
 */
export async function regenerateSignUrl(contractId: string): Promise<{
  signUrl: string;
  signUrlExpireAt: Date;
}> {
  // 查询合同
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
  });

  if (!contract) {
    throw new ContractFlowError(
      "合同不存在",
      "CONTRACT_NOT_FOUND",
      "REGENERATE"
    );
  }

  // 验证合同状态
  if (contract.status !== "PENDING_PARTY_B") {
    throw new ContractFlowError(
      "只有待乙方签署状态的合同才能重新生成签署链接",
      "INVALID_CONTRACT_STATUS",
      "REGENERATE"
    );
  }

  // 验证flowId
  if (!contract.flowId) {
    throw new ContractFlowError(
      "合同未关联签署流程",
      "MISSING_FLOW_ID",
      "REGENERATE"
    );
  }

  try {
    // 重新生成签署链接
    const signUrlResult = await esignService.createFlowSignUrl({
      FlowId: contract.flowId,
      FlowApproverInfos: [
        {
          ApproverName: contract.partyBName,
          ApproverMobile: contract.partyBPhone,
          ApproverType:
            contract.partyBType === "PERSONAL"
              ? ApproverType.PERSONAL
              : ApproverType.ENTERPRISE,
          OrganizationName:
            contract.partyBType === "ENTERPRISE"
              ? contract.partyBOrgName || undefined
              : undefined,
        },
      ],
      JumpUrl: SIGN_COMPLETE_JUMP_URL || undefined,
      UrlType: 0,
    });

    // 计算签署链接过期时间（30分钟）
    const signUrlExpireAt = new Date(signUrlResult.ExpireTime * 1000);

    // 更新合同签署链接
    await prisma.contract.update({
      where: { id: contractId },
      data: {
        signUrl: signUrlResult.SignUrl,
        signUrlExpireAt,
        updatedAt: new Date(),
      },
    });

    return {
      signUrl: signUrlResult.SignUrl,
      signUrlExpireAt,
    };
  } catch (error) {
    if (error instanceof EsignApiError) {
      throw new ContractFlowError(
        error.message,
        error.code,
        "ESIGN_API",
        error
      );
    }

    throw new ContractFlowError(
      "重新生成签署链接失败",
      "REGENERATE_FAILED",
      "UNKNOWN",
      error as Error
    );
  }
}

/**
 * 合同发起流程服务
 */
export const contractFlowService = {
  initiateContract,
  regenerateSignUrl,
};
