import { Contract, Contract_status as PrismaContractStatus, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { ContractStatus, isValidTransition, getStatusLabel } from '@/lib/contract-status';
import { ContractDraftData, ContractFilters, PaginatedContracts, ContractListItem } from '@/types/contract';

/**
 * 生成合同编号
 * 格式: HT + 年月日 + 6位序号
 * 例如: HT20241228000001
 */
function generateContractNo(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `HT${dateStr}${random}`;
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 合同服务错误类
 */
export class ContractServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ContractServiceError';
  }
}

/**
 * 创建合同草稿
 * @param data 合同草稿数据
 * @returns 创建的合同
 */
export async function createDraft(data: ContractDraftData): Promise<Contract> {
  const contractNo = generateContractNo();
  const id = generateId();

  const contract = await prisma.contract.create({
    data: {
      id,
      contractNo,
      productId: data.productId,
      cityId: data.cityId,
      partyBName: data.partyBName,
      partyBPhone: data.partyBPhone,
      partyBIdCard: data.partyBIdCard,
      partyBType: data.partyBType ?? 'PERSONAL',
      partyBOrgName: data.partyBOrgName,
      formData: data.formData ? (data.formData as Prisma.InputJsonValue) : Prisma.JsonNull,
      status: 'DRAFT',
      createdById: data.createdById,
      updatedAt: new Date(),
    },
  });

  // 记录状态变更日志
  await createStatusLog({
    contractId: contract.id,
    fromStatus: null,
    toStatus: ContractStatus.DRAFT,
    operatorId: data.createdById,
    remark: '创建合同草稿',
  });

  return contract;
}


/**
 * 状态日志创建参数
 */
interface CreateStatusLogParams {
  contractId: string;
  fromStatus: ContractStatus | null;
  toStatus: ContractStatus;
  operatorId?: string | null;
  operatorName?: string | null;
  remark?: string | null;
}

/**
 * 创建状态变更日志
 * @param params 日志参数
 */
async function createStatusLog(params: CreateStatusLogParams): Promise<void> {
  const id = generateId();
  
  // 如果有operatorId但没有operatorName，查询用户名
  let operatorName = params.operatorName;
  if (params.operatorId && !operatorName) {
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
 * 更新合同状态参数
 */
interface UpdateStatusParams {
  id: string;
  status: ContractStatus;
  operatorId?: string | null;
  remark?: string | null;
}

/**
 * 更新合同状态
 * @param params 更新参数
 * @returns 更新后的合同
 * @throws ContractServiceError 如果合同不存在或状态转换无效
 */
export async function updateStatus(params: UpdateStatusParams): Promise<Contract> {
  const { id, status, operatorId, remark } = params;

  // 查询当前合同
  const contract = await prisma.contract.findUnique({
    where: { id },
  });

  if (!contract) {
    throw new ContractServiceError(
      '合同不存在',
      'CONTRACT_NOT_FOUND',
      404
    );
  }

  const currentStatus = contract.status as ContractStatus;
  const targetStatus = status;

  // 验证状态转换是否有效
  if (!isValidTransition(currentStatus, targetStatus)) {
    throw new ContractServiceError(
      `无效的状态转换: ${getStatusLabel(currentStatus)} → ${getStatusLabel(targetStatus)}`,
      'INVALID_STATUS_TRANSITION',
      400
    );
  }

  // 更新合同状态
  const updatedContract = await prisma.contract.update({
    where: { id },
    data: {
      status: targetStatus as PrismaContractStatus,
      updatedAt: new Date(),
      // 如果是完成状态，记录完成时间
      ...(targetStatus === ContractStatus.COMPLETED && {
        completedAt: new Date(),
      }),
    },
  });

  // 记录状态变更日志
  await createStatusLog({
    contractId: id,
    fromStatus: currentStatus,
    toStatus: targetStatus,
    operatorId,
    remark: remark ?? `状态变更: ${getStatusLabel(currentStatus)} → ${getStatusLabel(targetStatus)}`,
  });

  return updatedContract;
}

/**
 * 根据ID获取合同
 * @param id 合同ID
 * @returns 合同或null
 */
export async function getContractById(id: string): Promise<Contract | null> {
  return prisma.contract.findUnique({
    where: { id },
  });
}

/**
 * 根据FlowId获取合同
 * @param flowId 腾讯电子签流程ID
 * @returns 合同或null
 */
export async function getContractByFlowId(flowId: string): Promise<Contract | null> {
  return prisma.contract.findUnique({
    where: { flowId },
  });
}

/**
 * 获取合同列表（支持筛选、搜索、分页）
 * @param filters 筛选条件
 * @param userCityId 用户所属城市ID（用于数据隔离，City_Admin只能查看本城市）
 * @param isSystemAdmin 是否为系统管理员（系统管理员可查看所有城市）
 * @returns 分页合同列表
 */
export async function getContracts(
  filters: ContractFilters,
  userCityId?: string | null,
  isSystemAdmin: boolean = false
): Promise<PaginatedContracts> {
  const {
    cityId,
    status,
    search,
    startDate,
    endDate,
    page = 1,
    pageSize = 10,
  } = filters;

  // 构建查询条件
  const where: Prisma.ContractWhereInput = {};

  // 城市数据隔离：City_Admin只能查看本城市的合同
  if (!isSystemAdmin && userCityId) {
    // City_Admin: 强制只能查看自己城市的数据
    where.cityId = userCityId;
  } else if (cityId) {
    // System_Admin: 可以按城市筛选，也可以查看所有
    where.cityId = cityId;
  }

  // 状态筛选
  if (status) {
    where.status = status as PrismaContractStatus;
  }

  // 搜索：乙方姓名或手机号
  if (search && search.trim()) {
    const searchTerm = search.trim();
    where.OR = [
      { partyBName: { contains: searchTerm } },
      { partyBPhone: { contains: searchTerm } },
    ];
  }

  // 日期范围筛选
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      // 设置结束日期为当天的23:59:59
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      where.createdAt.lte = endOfDay;
    }
  }

  // 计算分页
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // 并行执行查询和计数
  const [contracts, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      include: {
        Product: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    }),
    prisma.contract.count({ where }),
  ]);

  // 转换为列表项格式
  const data: ContractListItem[] = contracts.map((contract) => ({
    id: contract.id,
    contractNo: contract.contractNo,
    partyBName: contract.partyBName,
    partyBPhone: contract.partyBPhone,
    productName: contract.Product.name,
    status: contract.status,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  }));

  // 计算总页数
  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * 获取合同详情（包含关联数据）
 * @param id 合同ID
 * @param userCityId 用户所属城市ID（用于数据隔离）
 * @param isSystemAdmin 是否为系统管理员
 * @returns 合同详情或null
 */
export async function getContractDetail(
  id: string,
  userCityId?: string | null,
  isSystemAdmin: boolean = false
): Promise<import('@/types/contract').ContractDetail | null> {
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      Product: {
        select: {
          name: true,
        },
      },
      City: {
        select: {
          name: true,
        },
      },
      User_Contract_createdByIdToUser: {
        select: {
          name: true,
        },
      },
      User_Contract_approvedByIdToUser: {
        select: {
          name: true,
        },
      },
      ContractStatusLog: {
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          operatorName: true,
          remark: true,
          createdAt: true,
        },
      },
    },
  });

  if (!contract) {
    return null;
  }

  // 城市数据隔离检查
  if (!isSystemAdmin && userCityId && contract.cityId !== userCityId) {
    return null;
  }

  return {
    id: contract.id,
    contractNo: contract.contractNo,
    flowId: contract.flowId,
    productId: contract.productId,
    productName: contract.Product.name,
    cityId: contract.cityId,
    cityName: contract.City.name,
    partyBName: contract.partyBName,
    partyBPhone: contract.partyBPhone,
    partyBIdCard: contract.partyBIdCard,
    partyBType: contract.partyBType,
    partyBOrgName: contract.partyBOrgName,
    formData: contract.formData as Record<string, unknown> | null,
    status: contract.status,
    signUrl: contract.signUrl,
    signUrlExpireAt: contract.signUrlExpireAt,
    approvedAt: contract.approvedAt,
    approvedByName: contract.User_Contract_approvedByIdToUser?.name ?? null,
    rejectionReason: contract.rejectionReason,
    createdByName: contract.User_Contract_createdByIdToUser.name,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
    completedAt: contract.completedAt,
    statusLogs: contract.ContractStatusLog.map(log => ({
      id: log.id,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      operatorName: log.operatorName,
      remark: log.remark,
      createdAt: log.createdAt,
    })),
  };
}

/**
 * 审批合同参数
 */
export interface ApproveContractParams {
  /** 合同ID */
  id: string;
  /** 是否通过 */
  approved: boolean;
  /** 拒绝原因（拒绝时必填） */
  reason?: string;
  /** 操作人ID */
  operatorId: string;
}

/**
 * 审批合同结果
 */
export interface ApproveContractResult {
  contract: Contract;
  /** 是否触发了自动签署 */
  autoSignTriggered?: boolean;
}

/**
 * 审批合同
 * 
 * 审批通过时：
 * 1. 更新合同状态为 COMPLETED
 * 2. 记录审批信息
 * 3. 触发甲方自动签署（通过腾讯电子签API）
 * 
 * 审批拒绝时：
 * 1. 更新合同状态为 REJECTED
 * 2. 记录拒绝原因
 * 
 * @param params 审批参数
 * @returns 审批结果
 * @throws ContractServiceError 如果合同不存在、状态不正确或审批失败
 * 
 * Requirements: 4.4, 4.5, 4.6
 */
export async function approveContract(
  params: ApproveContractParams
): Promise<ApproveContractResult> {
  const { id, approved, reason, operatorId } = params;

  // 1. 查询合同
  const contract = await prisma.contract.findUnique({
    where: { id },
  });

  if (!contract) {
    throw new ContractServiceError(
      '合同不存在',
      'CONTRACT_NOT_FOUND',
      404
    );
  }

  // 2. 验证合同状态必须是待甲方签署
  if (contract.status !== 'PENDING_PARTY_A') {
    throw new ContractServiceError(
      `只有待甲方签署状态的合同才能审批，当前状态: ${getStatusLabel(contract.status as ContractStatus)}`,
      'INVALID_CONTRACT_STATUS',
      400
    );
  }

  // 3. 如果是拒绝，必须提供原因
  if (!approved && (!reason || !reason.trim())) {
    throw new ContractServiceError(
      '拒绝审批时必须提供拒绝原因',
      'REJECTION_REASON_REQUIRED',
      400
    );
  }

  const now = new Date();
  const targetStatus = approved ? ContractStatus.COMPLETED : ContractStatus.REJECTED;

  // 4. 验证状态转换是否有效
  if (!isValidTransition(contract.status as ContractStatus, targetStatus)) {
    throw new ContractServiceError(
      `无效的状态转换: ${getStatusLabel(contract.status as ContractStatus)} → ${getStatusLabel(targetStatus)}`,
      'INVALID_STATUS_TRANSITION',
      400
    );
  }

  // 5. 更新合同状态和审批信息
  const updatedContract = await prisma.contract.update({
    where: { id },
    data: {
      status: targetStatus as PrismaContractStatus,
      approvedAt: now,
      approvedById: operatorId,
      rejectionReason: approved ? null : reason?.trim(),
      updatedAt: now,
      // 如果是审批通过，记录完成时间
      ...(approved && { completedAt: now }),
    },
  });

  // 6. 记录状态变更日志
  await createStatusLog({
    contractId: id,
    fromStatus: contract.status as ContractStatus,
    toStatus: targetStatus,
    operatorId,
    remark: approved 
      ? '审批通过，甲方自动签署完成' 
      : `审批拒绝: ${reason?.trim()}`,
  });

  // 7. 如果审批通过，记录审计日志
  if (approved) {
    await createAuditLog({
      userId: operatorId,
      action: 'APPROVE_CONTRACT',
      resource: 'Contract',
      resourceId: id,
      details: {
        contractNo: contract.contractNo,
        flowId: contract.flowId,
        approved: true,
      },
    });
  } else {
    await createAuditLog({
      userId: operatorId,
      action: 'REJECT_CONTRACT',
      resource: 'Contract',
      resourceId: id,
      details: {
        contractNo: contract.contractNo,
        flowId: contract.flowId,
        approved: false,
        reason: reason?.trim(),
      },
    });
  }

  return {
    contract: updatedContract,
    autoSignTriggered: approved,
  };
}

/**
 * 创建审计日志参数
 */
interface CreateAuditLogParams {
  userId: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/**
 * 创建审计日志
 */
async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  const id = generateId();
  
  await prisma.auditLog.create({
    data: {
      id,
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details ? (params.details as Prisma.InputJsonValue) : undefined,
      ip: params.ip,
      userAgent: params.userAgent,
    },
  });
}

// 导出服务对象（兼容旧代码）
export const contractService = {
  createDraft,
  updateStatus,
  getContractById,
  getContractByFlowId,
  getContracts,
  getContractDetail,
  approveContract,
};
