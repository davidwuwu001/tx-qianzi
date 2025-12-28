/**
 * 数据统计服务
 * 
 * 实现合同统计查询功能，包括：
 * - 合同总数统计
 * - 各状态合同数量
 * - 拒签率计算
 * - 趋势数据
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

/**
 * 统计服务错误类
 */
export class StatisticsServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'StatisticsServiceError';
  }
}

/**
 * 统计筛选参数
 */
export interface StatisticsFilters {
  /** 城市ID（城市管理员必填） */
  cityId?: string;
  /** 开始日期 */
  startDate?: Date;
  /** 结束日期 */
  endDate?: Date;
}

/**
 * 合同统计概览
 */
export interface ContractStatistics {
  /** 合同总数 */
  total: number;
  /** 草稿数 */
  draft: number;
  /** 待乙方签署数 */
  pendingPartyB: number;
  /** 待甲方签署数 */
  pendingPartyA: number;
  /** 已完成数 */
  completed: number;
  /** 已拒签数 */
  rejected: number;
  /** 已过期数 */
  expired: number;
  /** 已取消数 */
  cancelled: number;
  /** 拒签率（百分比） */
  rejectionRate: number;
  /** 完成率（百分比） */
  completionRate: number;
}

/**
 * 趋势数据点
 */
export interface TrendDataPoint {
  /** 日期 */
  date: string;
  /** 新增合同数 */
  created: number;
  /** 完成合同数 */
  completed: number;
  /** 拒签合同数 */
  rejected: number;
}

/**
 * 城市统计
 */
export interface CityStatistics {
  cityId: string;
  cityName: string;
  total: number;
  completed: number;
  pending: number;
  rejected: number;
}


/**
 * 获取合同统计概览
 * Requirements: 13.1, 13.2, 13.3
 * 
 * @param filters 筛选条件
 * @returns 统计数据
 */
export async function getContractStatistics(
  filters: StatisticsFilters = {}
): Promise<ContractStatistics> {
  const { cityId, startDate, endDate } = filters;

  // 构建查询条件
  const where: Prisma.ContractWhereInput = {};

  if (cityId) {
    where.cityId = cityId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  // 按状态分组统计
  const statusCounts = await prisma.contract.groupBy({
    by: ['status'],
    where,
    _count: { id: true },
  });

  // 构建统计结果
  const stats: ContractStatistics = {
    total: 0,
    draft: 0,
    pendingPartyB: 0,
    pendingPartyA: 0,
    completed: 0,
    rejected: 0,
    expired: 0,
    cancelled: 0,
    rejectionRate: 0,
    completionRate: 0,
  };

  for (const item of statusCounts) {
    const count = item._count.id;
    stats.total += count;

    switch (item.status) {
      case 'DRAFT':
        stats.draft = count;
        break;
      case 'PENDING_PARTY_B':
        stats.pendingPartyB = count;
        break;
      case 'PENDING_PARTY_A':
        stats.pendingPartyA = count;
        break;
      case 'COMPLETED':
        stats.completed = count;
        break;
      case 'REJECTED':
        stats.rejected = count;
        break;
      case 'EXPIRED':
        stats.expired = count;
        break;
      case 'CANCELLED':
        stats.cancelled = count;
        break;
    }
  }

  // 计算拒签率和完成率
  // 只计算已结束的合同（完成、拒签、过期）
  const finishedCount = stats.completed + stats.rejected + stats.expired;
  if (finishedCount > 0) {
    stats.rejectionRate = Math.round((stats.rejected / finishedCount) * 100 * 100) / 100;
    stats.completionRate = Math.round((stats.completed / finishedCount) * 100 * 100) / 100;
  }

  return stats;
}

/**
 * 获取合同趋势数据
 * Requirements: 13.4
 * 
 * @param filters 筛选条件
 * @param days 天数（默认30天）
 * @returns 趋势数据
 */
export async function getContractTrend(
  filters: StatisticsFilters = {},
  days: number = 30
): Promise<TrendDataPoint[]> {
  const { cityId } = filters;

  // 计算日期范围
  const endDate = filters.endDate || new Date();
  const startDate = filters.startDate || new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  // 构建查询条件
  const where: Prisma.ContractWhereInput = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (cityId) {
    where.cityId = cityId;
  }

  // 查询所有合同
  const contracts = await prisma.contract.findMany({
    where,
    select: {
      createdAt: true,
      completedAt: true,
      status: true,
    },
  });

  // 按日期分组
  const dateMap = new Map<string, TrendDataPoint>();

  // 初始化日期范围内的所有日期
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    dateMap.set(dateStr, {
      date: dateStr,
      created: 0,
      completed: 0,
      rejected: 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 统计每日数据
  for (const contract of contracts) {
    // 创建日期
    const createdDate = contract.createdAt.toISOString().split('T')[0];
    const createdPoint = dateMap.get(createdDate);
    if (createdPoint) {
      createdPoint.created++;
    }

    // 完成日期
    if (contract.completedAt && contract.status === 'COMPLETED') {
      const completedDate = contract.completedAt.toISOString().split('T')[0];
      const completedPoint = dateMap.get(completedDate);
      if (completedPoint) {
        completedPoint.completed++;
      }
    }

    // 拒签（使用更新时间作为拒签时间）
    if (contract.status === 'REJECTED') {
      const rejectedDate = contract.createdAt.toISOString().split('T')[0];
      const rejectedPoint = dateMap.get(rejectedDate);
      if (rejectedPoint) {
        rejectedPoint.rejected++;
      }
    }
  }

  // 转换为数组并排序
  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 获取各城市统计
 * Requirements: 13.2
 * 
 * @param filters 筛选条件
 * @returns 城市统计列表
 */
export async function getCityStatistics(
  filters: StatisticsFilters = {}
): Promise<CityStatistics[]> {
  const { startDate, endDate } = filters;

  // 构建查询条件
  const where: Prisma.ContractWhereInput = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  // 按城市和状态分组统计
  const stats = await prisma.contract.groupBy({
    by: ['cityId', 'status'],
    where,
    _count: { id: true },
  });

  // 获取城市信息
  const cityIds = [...new Set(stats.map(s => s.cityId))];
  const cities = await prisma.city.findMany({
    where: { id: { in: cityIds } },
    select: { id: true, name: true },
  });

  const cityMap = new Map(cities.map(c => [c.id, c.name]));

  // 构建城市统计
  const cityStatsMap = new Map<string, CityStatistics>();

  for (const item of stats) {
    if (!cityStatsMap.has(item.cityId)) {
      cityStatsMap.set(item.cityId, {
        cityId: item.cityId,
        cityName: cityMap.get(item.cityId) || '未知城市',
        total: 0,
        completed: 0,
        pending: 0,
        rejected: 0,
      });
    }

    const cityStat = cityStatsMap.get(item.cityId)!;
    cityStat.total += item._count.id;

    switch (item.status) {
      case 'COMPLETED':
        cityStat.completed += item._count.id;
        break;
      case 'PENDING_PARTY_B':
      case 'PENDING_PARTY_A':
        cityStat.pending += item._count.id;
        break;
      case 'REJECTED':
        cityStat.rejected += item._count.id;
        break;
    }
  }

  return Array.from(cityStatsMap.values()).sort((a, b) => b.total - a.total);
}

// 导出服务对象
export const statisticsService = {
  getContractStatistics,
  getContractTrend,
  getCityStatistics,
};
