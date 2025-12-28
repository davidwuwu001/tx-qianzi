'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  cityService,
  CityFilters,
  CreateCityParams,
  UpdateCityParams,
  CityServiceError,
} from '@/services/city.service';

/**
 * 城市列表项类型
 */
interface CityListItemResponse {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalContracts: number;
  pendingContracts: number;
  completedContracts: number;
  adminCount: number;
}

/**
 * 分页城市列表响应
 */
interface PaginatedCitiesResponse {
  data: CityListItemResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 城市响应
 */
interface CityResponse {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 获取城市列表结果
 */
interface GetCitiesResult {
  success: boolean;
  data?: PaginatedCitiesResponse;
  error?: string;
}

/**
 * 城市操作结果
 */
interface CityActionResult {
  success: boolean;
  data?: CityResponse;
  error?: string;
}

/**
 * 删除操作结果
 */
interface DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * 获取启用城市结果
 */
interface GetActiveCitiesResult {
  success: boolean;
  data?: Array<{ id: string; name: string }>;
  error?: string;
}

/**
 * 检查是否为系统管理员
 */
async function checkSystemAdmin(): Promise<{ isAdmin: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { isAdmin: false, error: '未登录' };
  }

  if (session.user.role !== 'SYSTEM_ADMIN') {
    return { isAdmin: false, error: '无权限访问' };
  }

  return { isAdmin: true };
}

/**
 * 获取城市列表
 * Requirements: 6.1
 */
export async function getCitiesAction(
  filters: CityFilters
): Promise<GetCitiesResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    const result = await cityService.getCities(filters);
    
    // 转换日期为字符串（序列化）
    const data: PaginatedCitiesResponse = {
      ...result,
      data: result.data.map(city => ({
        ...city,
        createdAt: city.createdAt.toISOString(),
        updatedAt: city.updatedAt.toISOString(),
      })),
    };

    return { success: true, data };
  } catch (error) {
    console.error('获取城市列表失败:', error);
    if (error instanceof CityServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '获取城市列表失败' };
  }
}

/**
 * 创建城市
 * Requirements: 6.2
 */
export async function createCityAction(
  params: CreateCityParams
): Promise<CityActionResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    // 验证参数
    if (!params.name || !params.name.trim()) {
      return { success: false, error: '城市名称不能为空' };
    }

    const city = await cityService.createCity({
      name: params.name.trim(),
      description: params.description?.trim(),
    });

    return {
      success: true,
      data: {
        ...city,
        createdAt: city.createdAt.toISOString(),
        updatedAt: city.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('创建城市失败:', error);
    if (error instanceof CityServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '创建城市失败' };
  }
}

/**
 * 更新城市
 * Requirements: 6.3
 */
export async function updateCityAction(
  id: string,
  params: UpdateCityParams
): Promise<CityActionResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    // 验证参数
    if (params.name !== undefined && !params.name.trim()) {
      return { success: false, error: '城市名称不能为空' };
    }

    const city = await cityService.updateCity(id, {
      name: params.name?.trim(),
      description: params.description?.trim(),
      isActive: params.isActive,
    });

    return {
      success: true,
      data: {
        ...city,
        createdAt: city.createdAt.toISOString(),
        updatedAt: city.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('更新城市失败:', error);
    if (error instanceof CityServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '更新城市失败' };
  }
}

/**
 * 切换城市状态（启用/禁用）
 * Requirements: 6.4
 */
export async function toggleCityStatusAction(
  id: string,
  isActive: boolean
): Promise<CityActionResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    const city = isActive
      ? await cityService.enableCity(id)
      : await cityService.disableCity(id);

    return {
      success: true,
      data: {
        ...city,
        createdAt: city.createdAt.toISOString(),
        updatedAt: city.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('切换城市状态失败:', error);
    if (error instanceof CityServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '切换城市状态失败' };
  }
}

/**
 * 删除城市
 */
export async function deleteCityAction(id: string): Promise<DeleteResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    await cityService.deleteCity(id);

    return { success: true };
  } catch (error) {
    console.error('删除城市失败:', error);
    if (error instanceof CityServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '删除城市失败' };
  }
}

/**
 * 获取所有启用的城市（用于下拉选择）
 */
export async function getActiveCitiesAction(): Promise<GetActiveCitiesResult> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return { success: false, error: '未登录' };
    }

    const cities = await cityService.getActiveCities();

    return { success: true, data: cities };
  } catch (error) {
    console.error('获取城市列表失败:', error);
    return { success: false, error: '获取城市列表失败' };
  }
}
