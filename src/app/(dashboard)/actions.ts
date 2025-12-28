'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  statisticsService,
  StatisticsFilters,
  StatisticsServiceError,
} from '@/services/statistics.service';

/**
 * 合同统计响应
 */
interface ContractStatisticsResponse {
  total: number;
  draft: number;
  pendingPartyB: number;
  pendingPartyA: number;
  completed: number;
  rejected: number;
  expired: number;
  cancelled: number;
  rejectionRate: number;
  completionRate: number;
}

/**
 * 趋势数据点响应
 */
interface TrendDataPointResponse {
  date: string;
  created: number;
  completed: number;
  rejected: number;
}

/**
 * 获取统计结果
 */
interface GetStatisticsResult {
  success: boolean;
  data?: ContractStatisticsResponse;
  error?: string;
}

/**
 * 获取趋势结果
 */
interface GetTrendResult {
  success: boolean;
  data?: TrendDataPointResponse[];
  error?: string;
}

/**
 * 获取合同统计
 * Requirements: 13.1, 13.2, 13.3
 */
export async function getContractStatisticsAction(
  filters?: { startDate?: string; endDate?: string }
): Promise<GetStatisticsResult> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return { success: false, error: '未登录' };
    }

    // 构建筛选条件
    const statisticsFilters: StatisticsFilters = {};

    // 城市管理员只能查看本城市数据
    if (session.user.role === 'CITY_ADMIN') {
      if (!session.user.cityId) {
        return { success: false, error: '用户未分配城市' };
      }
      statisticsFilters.cityId = session.user.cityId;
    }

    // 日期筛选
    if (filters?.startDate) {
      statisticsFilters.startDate = new Date(filters.startDate);
    }
    if (filters?.endDate) {
      statisticsFilters.endDate = new Date(filters.endDate);
    }

    const stats = await statisticsService.getContractStatistics(statisticsFilters);

    return { success: true, data: stats };
  } catch (error) {
    console.error('获取统计数据失败:', error);
    if (error instanceof StatisticsServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '获取统计数据失败' };
  }
}

/**
 * 获取合同趋势数据
 * Requirements: 13.4
 */
export async function getContractTrendAction(
  filters?: { startDate?: string; endDate?: string; days?: number }
): Promise<GetTrendResult> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return { success: false, error: '未登录' };
    }

    // 构建筛选条件
    const statisticsFilters: StatisticsFilters = {};

    // 城市管理员只能查看本城市数据
    if (session.user.role === 'CITY_ADMIN') {
      if (!session.user.cityId) {
        return { success: false, error: '用户未分配城市' };
      }
      statisticsFilters.cityId = session.user.cityId;
    }

    // 日期筛选
    if (filters?.startDate) {
      statisticsFilters.startDate = new Date(filters.startDate);
    }
    if (filters?.endDate) {
      statisticsFilters.endDate = new Date(filters.endDate);
    }

    const trend = await statisticsService.getContractTrend(
      statisticsFilters,
      filters?.days || 30
    );

    return { success: true, data: trend };
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    if (error instanceof StatisticsServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '获取趋势数据失败' };
  }
}
