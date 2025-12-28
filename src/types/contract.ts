import { Contract_status, Contract_partyBType } from "@prisma/client";

// 重新导出 Prisma 枚举类型，方便使用
export type ContractStatus = Contract_status;
export type PartyType = Contract_partyBType;

// 合同筛选条件
export interface ContractFilters {
  cityId?: string;
  status?: ContractStatus;
  search?: string; // 乙方姓名或手机号
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

// 分页合同列表
export interface PaginatedContracts {
  data: ContractListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 合同列表项
export interface ContractListItem {
  id: string;
  contractNo: string;
  partyBName: string;
  partyBPhone: string;
  productName: string;
  status: ContractStatus;
  createdAt: Date;
  updatedAt: Date;
}

// 合同详情
export interface ContractDetail {
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
  partyBType: PartyType;
  partyBOrgName: string | null;
  formData: Record<string, unknown> | null;
  status: ContractStatus;
  signUrl: string | null;
  signUrlExpireAt: Date | null;
  approvedAt: Date | null;
  approvedByName: string | null;
  rejectionReason: string | null;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  statusLogs: ContractStatusLogItem[];
}

// 状态变更日志项
export interface ContractStatusLogItem {
  id: string;
  fromStatus: ContractStatus | null;
  toStatus: ContractStatus;
  operatorName: string | null;
  remark: string | null;
  createdAt: Date;
}

// 创建合同草稿数据
export interface ContractDraftData {
  productId: string;
  cityId: string;
  partyBName: string;
  partyBPhone: string;
  partyBIdCard?: string;
  partyBType?: PartyType;
  partyBOrgName?: string;
  formData?: Record<string, unknown>;
  createdById: string;
}

// 乙方信息
export interface PartyBInfo {
  name: string;
  phone: string;
  idCard?: string;
  type?: PartyType;
  orgName?: string;
}
