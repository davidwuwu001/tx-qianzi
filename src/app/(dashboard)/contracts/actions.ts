'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getContracts } from '@/services/contract.service';

// 获取合同列表请求参数
interface GetContractsParams {
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// 合同列表项
interface ContractListItem {
  id: string;
  contractNo: string;
  partyBName: string;
  partyBPhone: string;
  productName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// 获取合同列表结果
interface GetContractsResult {
  success: boolean;
  error?: string;
  data?: {
    data: ContractListItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * 获取合同列表 Server Action
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export async function getContractsAction(
  params: GetContractsParams
): Promise<GetContractsResult> {
  try {
    // 1. 获取当前用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: '请先登录' };
    }

    const user = session.user;
    const isSystemAdmin = user.role === 'SYSTEM_ADMIN';
    const userCityId = user.cityId;

    // 2. 构建筛选条件
    const filters = {
      status: params.status as import('@prisma/client').Contract_status | undefined,
      search: params.search,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      page: params.page || 1,
      pageSize: params.pageSize || 10,
    };

    // 3. 获取合同列表（带城市数据隔离）
    const result = await getContracts(filters, userCityId, isSystemAdmin);

    // 4. 转换日期为字符串
    const data = result.data.map(item => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        data,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    };
  } catch (error) {
    console.error('获取合同列表失败:', error);
    
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: '获取合同列表失败，请稍后重试' };
  }
}
