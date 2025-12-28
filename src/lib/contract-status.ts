/**
 * 合同状态枚举和状态机转换函数
 * 
 * 状态流转规则：
 * - DRAFT → PENDING_PARTY_B, CANCELLED
 * - PENDING_PARTY_B → PENDING_PARTY_A, REJECTED, EXPIRED, CANCELLED
 * - PENDING_PARTY_A → COMPLETED, REJECTED, CANCELLED
 * - COMPLETED, REJECTED, EXPIRED, CANCELLED → 终态，不可转换
 */

/**
 * 合同状态枚举
 */
export enum ContractStatus {
  DRAFT = 'DRAFT',                     // 草稿
  PENDING_PARTY_B = 'PENDING_PARTY_B', // 待乙方签署
  PENDING_PARTY_A = 'PENDING_PARTY_A', // 待甲方签署（待审批）
  COMPLETED = 'COMPLETED',             // 已完成签署
  REJECTED = 'REJECTED',               // 已拒签
  EXPIRED = 'EXPIRED',                 // 已过期
  CANCELLED = 'CANCELLED',             // 已取消
}

/**
 * 合同状态中文标签映射
 */
const STATUS_LABELS: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: '草稿',
  [ContractStatus.PENDING_PARTY_B]: '待乙方签署',
  [ContractStatus.PENDING_PARTY_A]: '待甲方签署',
  [ContractStatus.COMPLETED]: '已完成签署',
  [ContractStatus.REJECTED]: '已拒签',
  [ContractStatus.EXPIRED]: '已过期',
  [ContractStatus.CANCELLED]: '已取消',
};

/**
 * 有效的状态转换映射
 * key: 当前状态
 * value: 可转换到的目标状态数组
 */
const VALID_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  [ContractStatus.DRAFT]: [
    ContractStatus.PENDING_PARTY_B,
    ContractStatus.CANCELLED,
  ],
  [ContractStatus.PENDING_PARTY_B]: [
    ContractStatus.PENDING_PARTY_A,
    ContractStatus.COMPLETED,  // 甲方自动签署时，乙方签完直接完成
    ContractStatus.REJECTED,
    ContractStatus.EXPIRED,
    ContractStatus.CANCELLED,
  ],
  [ContractStatus.PENDING_PARTY_A]: [
    ContractStatus.COMPLETED,
    ContractStatus.REJECTED,
    ContractStatus.CANCELLED,
  ],
  // 终态，不可转换
  [ContractStatus.COMPLETED]: [],
  [ContractStatus.REJECTED]: [],
  [ContractStatus.EXPIRED]: [],
  [ContractStatus.CANCELLED]: [],
};

/**
 * 检查状态转换是否有效
 * @param from 当前状态
 * @param to 目标状态
 * @returns 是否为有效转换
 */
export function isValidTransition(
  from: ContractStatus,
  to: ContractStatus
): boolean {
  const validTargets = VALID_TRANSITIONS[from];
  return validTargets?.includes(to) ?? false;
}

/**
 * 获取当前状态可转换到的所有有效目标状态
 * @param current 当前状态
 * @returns 可转换到的目标状态数组
 */
export function getNextValidStatuses(current: ContractStatus): ContractStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

/**
 * 获取状态的中文标签
 * @param status 合同状态
 * @returns 中文标签
 */
export function getStatusLabel(status: ContractStatus): string {
  return STATUS_LABELS[status] ?? '未知状态';
}

/**
 * 检查状态是否为终态（不可再转换）
 * @param status 合同状态
 * @returns 是否为终态
 */
export function isTerminalStatus(status: ContractStatus): boolean {
  return VALID_TRANSITIONS[status]?.length === 0;
}

/**
 * 获取所有状态列表
 * @returns 所有状态枚举值数组
 */
export function getAllStatuses(): ContractStatus[] {
  return Object.values(ContractStatus);
}

/**
 * 获取所有状态及其标签
 * @returns 状态和标签的映射数组
 */
export function getStatusOptions(): Array<{ value: ContractStatus; label: string }> {
  return getAllStatuses().map((status) => ({
    value: status,
    label: getStatusLabel(status),
  }));
}
