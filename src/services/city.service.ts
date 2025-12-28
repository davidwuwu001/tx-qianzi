import { City, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 城市服务错误类
 */
export class CityServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'CityServiceError';
  }
}

/**
 * 创建城市参数
 */
export interface CreateCityParams {
  name: string;
  description?: string;
}

/**
 * 更新城市参数
 */
export interface UpdateCityParams {
  name?: string;
  description?: string;
  isActive?: boolean;
}

/**
 * 城市列表筛选参数
 */
export interface CityFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * 城市列表项（包含统计信息）
 */
export interface CityListItem {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** 合同总数 */
  totalContracts: number;
  /** 待处理合同数 */
  pendingContracts: number;
  /** 已完成合同数 */
  completedContracts: number;
  /** 管理员数量 */
  adminCount: number;
}

/**
 * 分页城市列表
 */
export interface PaginatedCities {
  data: CityListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 创建城市
 * @param params 创建参数
 * @returns 创建的城市
 * @throws CityServiceError 如果城市名称已存在
 * 
 * Requirements: 6.2
 */
export async function createCity(params: CreateCityParams): Promise<City> {
  const { name, description } = params;

  // 检查城市名称是否已存在
  const existing = await prisma.city.findUnique({
    where: { name },
  });

  if (existing) {
    throw new CityServiceError(
      '城市名称已存在',
      'CITY_NAME_EXISTS',
      400
    );
  }

  const id = generateId();
  const now = new Date();

  const city = await prisma.city.create({
    data: {
      id,
      name,
      description: description ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  return city;
}

/**
 * 更新城市
 * @param id 城市ID
 * @param params 更新参数
 * @returns 更新后的城市
 * @throws CityServiceError 如果城市不存在或名称已被占用
 * 
 * Requirements: 6.3
 */
export async function updateCity(id: string, params: UpdateCityParams): Promise<City> {
  // 检查城市是否存在
  const existing = await prisma.city.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new CityServiceError(
      '城市不存在',
      'CITY_NOT_FOUND',
      404
    );
  }

  // 如果要更新名称，检查是否与其他城市重复
  if (params.name && params.name !== existing.name) {
    const nameExists = await prisma.city.findUnique({
      where: { name: params.name },
    });

    if (nameExists) {
      throw new CityServiceError(
        '城市名称已存在',
        'CITY_NAME_EXISTS',
        400
      );
    }
  }

  const city = await prisma.city.update({
    where: { id },
    data: {
      ...(params.name !== undefined && { name: params.name }),
      ...(params.description !== undefined && { description: params.description }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      updatedAt: new Date(),
    },
  });

  return city;
}

/**
 * 禁用城市
 * 禁用后，该城市下不能创建新合同
 * @param id 城市ID
 * @returns 更新后的城市
 * @throws CityServiceError 如果城市不存在
 * 
 * Requirements: 6.4
 */
export async function disableCity(id: string): Promise<City> {
  return updateCity(id, { isActive: false });
}

/**
 * 启用城市
 * @param id 城市ID
 * @returns 更新后的城市
 * @throws CityServiceError 如果城市不存在
 */
export async function enableCity(id: string): Promise<City> {
  return updateCity(id, { isActive: true });
}

/**
 * 根据ID获取城市
 * @param id 城市ID
 * @returns 城市或null
 */
export async function getCityById(id: string): Promise<City | null> {
  return prisma.city.findUnique({
    where: { id },
  });
}

/**
 * 根据名称获取城市
 * @param name 城市名称
 * @returns 城市或null
 */
export async function getCityByName(name: string): Promise<City | null> {
  return prisma.city.findUnique({
    where: { name },
  });
}

/**
 * 获取城市列表（包含统计信息）
 * @param filters 筛选条件
 * @returns 分页城市列表
 * 
 * Requirements: 6.1, 6.7
 */
export async function getCities(filters: CityFilters = {}): Promise<PaginatedCities> {
  const {
    search,
    isActive,
    page = 1,
    pageSize = 10,
  } = filters;

  // 构建查询条件
  const where: Prisma.CityWhereInput = {};

  if (search && search.trim()) {
    where.name = { contains: search.trim() };
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  // 计算分页
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // 查询城市列表
  const [cities, total] = await Promise.all([
    prisma.city.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.city.count({ where }),
  ]);

  // 获取每个城市的统计信息
  const cityIds = cities.map(c => c.id);
  
  // 并行查询统计数据
  const [contractStats, adminCounts] = await Promise.all([
    // 合同统计
    prisma.contract.groupBy({
      by: ['cityId', 'status'],
      where: { cityId: { in: cityIds } },
      _count: { id: true },
    }),
    // 管理员数量
    prisma.user.groupBy({
      by: ['cityId'],
      where: { 
        cityId: { in: cityIds },
        role: 'CITY_ADMIN',
      },
      _count: { id: true },
    }),
  ]);

  // 构建统计数据映射
  const statsMap = new Map<string, { total: number; pending: number; completed: number }>();
  for (const stat of contractStats) {
    if (!stat.cityId) continue;
    
    if (!statsMap.has(stat.cityId)) {
      statsMap.set(stat.cityId, { total: 0, pending: 0, completed: 0 });
    }
    
    const cityStats = statsMap.get(stat.cityId)!;
    cityStats.total += stat._count.id;
    
    if (stat.status === 'PENDING_PARTY_B' || stat.status === 'PENDING_PARTY_A') {
      cityStats.pending += stat._count.id;
    } else if (stat.status === 'COMPLETED') {
      cityStats.completed += stat._count.id;
    }
  }

  const adminCountMap = new Map<string, number>();
  for (const count of adminCounts) {
    if (count.cityId) {
      adminCountMap.set(count.cityId, count._count.id);
    }
  }

  // 转换为列表项格式
  const data: CityListItem[] = cities.map((city) => {
    const stats = statsMap.get(city.id) ?? { total: 0, pending: 0, completed: 0 };
    return {
      id: city.id,
      name: city.name,
      description: city.description,
      isActive: city.isActive,
      createdAt: city.createdAt,
      updatedAt: city.updatedAt,
      totalContracts: stats.total,
      pendingContracts: stats.pending,
      completedContracts: stats.completed,
      adminCount: adminCountMap.get(city.id) ?? 0,
    };
  });

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
 * 获取所有启用的城市（用于下拉选择）
 * @returns 启用的城市列表
 */
export async function getActiveCities(): Promise<Pick<City, 'id' | 'name'>[]> {
  return prisma.city.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}

/**
 * 删除城市（软删除，实际是禁用）
 * 注意：如果城市下有合同或用户，不能删除
 * @param id 城市ID
 * @throws CityServiceError 如果城市不存在或有关联数据
 */
export async function deleteCity(id: string): Promise<void> {
  const city = await prisma.city.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          Contract: true,
          User: true,
        },
      },
    },
  });

  if (!city) {
    throw new CityServiceError(
      '城市不存在',
      'CITY_NOT_FOUND',
      404
    );
  }

  if (city._count.Contract > 0) {
    throw new CityServiceError(
      `该城市下有 ${city._count.Contract} 个合同，无法删除`,
      'CITY_HAS_CONTRACTS',
      400
    );
  }

  if (city._count.User > 0) {
    throw new CityServiceError(
      `该城市下有 ${city._count.User} 个用户，无法删除`,
      'CITY_HAS_USERS',
      400
    );
  }

  // 真正删除城市
  await prisma.city.delete({
    where: { id },
  });
}

// 导出服务对象
export const cityService = {
  createCity,
  updateCity,
  disableCity,
  enableCity,
  getCityById,
  getCityByName,
  getCities,
  getActiveCities,
  deleteCity,
};
