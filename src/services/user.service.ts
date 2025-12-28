/**
 * 用户管理服务
 * 
 * 实现用户的CRUD操作，包括：
 * - 创建用户
 * - 更新用户信息
 * - 禁用/启用用户
 * - 重置密码
 * - 查询用户列表
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import { User, Prisma, User_role } from '@prisma/client';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 用户服务错误类
 */
export class UserServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'UserServiceError';
  }
}

/**
 * 密码复杂度验证
 * Requirements: 8.6
 */
function validatePasswordComplexity(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: '密码长度至少8位' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: '密码必须包含小写字母' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '密码必须包含大写字母' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: '密码必须包含数字' };
  }
  return { valid: true };
}

/**
 * 生成随机密码
 */
function generateRandomPassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const all = lowercase + uppercase + numbers;
  
  let password = '';
  // 确保包含各类字符
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  
  // 填充剩余字符
  for (let i = 0; i < 5; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  // 打乱顺序
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * 创建用户参数
 */
export interface CreateUserParams {
  username?: string;  // 普通用户可以没有用户名
  password?: string;  // 普通用户可以没有密码
  phone: string;
  name: string;
  role: 'SYSTEM_ADMIN' | 'CITY_ADMIN' | 'ORDINARY_USER';
  cityId?: string;
}

/**
 * 创建普通用户参数（仅验证码登录）
 */
export interface CreateOrdinaryUserParams {
  phone: string;
  name: string;
  cityId: string;
}

/**
 * 更新用户参数
 */
export interface UpdateUserParams {
  phone?: string;
  name?: string;
  role?: 'SYSTEM_ADMIN' | 'CITY_ADMIN' | 'ORDINARY_USER';
  cityId?: string | null;
  isActive?: boolean;
}

/**
 * 用户列表筛选参数
 */
export interface UserFilters {
  search?: string;
  role?: 'SYSTEM_ADMIN' | 'CITY_ADMIN' | 'ORDINARY_USER';
  cityId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * 用户列表项
 */
export interface UserListItem {
  id: string;
  username: string | null;  // 普通用户可能没有用户名
  phone: string;
  name: string;
  role: User_role;
  cityId: string | null;
  cityName: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 分页用户列表
 */
export interface PaginatedUsers {
  data: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 用户详情（不含密码）
 */
export type UserDetail = Omit<User, 'password'> & {
  cityName: string | null;
};


/**
 * 创建用户
 * @param params 创建参数
 * @returns 创建的用户（不含密码）
 * @throws UserServiceError 如果用户名或手机号已存在
 * 
 * Requirements: 8.2, 8.3
 */
export async function createUser(params: CreateUserParams): Promise<UserDetail> {
  const { username, password, phone, name, role, cityId } = params;

  // 管理员用户必须有用户名和密码
  if (role !== 'ORDINARY_USER') {
    if (!username) {
      throw new UserServiceError(
        '管理员用户必须设置用户名',
        'USERNAME_REQUIRED',
        400
      );
    }
    if (!password) {
      throw new UserServiceError(
        '管理员用户必须设置密码',
        'PASSWORD_REQUIRED',
        400
      );
    }
    // 验证密码复杂度
    const passwordValidation = validatePasswordComplexity(password);
    if (!passwordValidation.valid) {
      throw new UserServiceError(
        passwordValidation.message || '密码不符合要求',
        'INVALID_PASSWORD',
        400
      );
    }
  }

  // 检查用户名是否已存在（如果提供了用户名）
  if (username) {
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      throw new UserServiceError(
        '用户名已存在',
        'USERNAME_EXISTS',
        400
      );
    }
  }

  // 检查手机号是否已存在
  const existingPhone = await prisma.user.findUnique({
    where: { phone },
  });

  if (existingPhone) {
    throw new UserServiceError(
      '手机号已存在',
      'PHONE_EXISTS',
      400
    );
  }

  // 城市管理员和普通用户必须指定城市
  if ((role === 'CITY_ADMIN' || role === 'ORDINARY_USER') && !cityId) {
    throw new UserServiceError(
      role === 'CITY_ADMIN' ? '城市管理员必须指定所属城市' : '普通用户必须指定所属城市',
      'CITY_REQUIRED',
      400
    );
  }

  // 验证城市是否存在
  if (cityId) {
    const city = await prisma.city.findUnique({
      where: { id: cityId },
    });

    if (!city) {
      throw new UserServiceError(
        '指定的城市不存在',
        'CITY_NOT_FOUND',
        404
      );
    }
  }

  const id = generateId();
  const now = new Date();

  // 加密密码（如果提供了密码）
  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  const user = await prisma.user.create({
    data: {
      id,
      username: username || null,
      password: hashedPassword,
      phone,
      name,
      role: role as User_role,
      cityId: role === 'SYSTEM_ADMIN' ? null : cityId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    include: {
      City: {
        select: { name: true },
      },
    },
  });

  // 返回不含密码的用户信息
  const { password: _, City, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    cityName: City?.name ?? null,
  };
}

/**
 * 创建普通用户（仅验证码登录）
 * @param params 创建参数
 * @returns 创建的用户
 * @throws UserServiceError 如果手机号已存在
 * 
 * Requirements: 8.3
 */
export async function createOrdinaryUser(params: CreateOrdinaryUserParams): Promise<UserDetail> {
  return createUser({
    phone: params.phone,
    name: params.name,
    role: 'ORDINARY_USER',
    cityId: params.cityId,
  });
}

/**
 * 更新用户
 * @param id 用户ID
 * @param params 更新参数
 * @returns 更新后的用户
 * @throws UserServiceError 如果用户不存在或手机号已被占用
 * 
 * Requirements: 8.3
 */
export async function updateUser(id: string, params: UpdateUserParams): Promise<UserDetail> {
  // 检查用户是否存在
  const existing = await prisma.user.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new UserServiceError(
      '用户不存在',
      'USER_NOT_FOUND',
      404
    );
  }

  // 如果要更新手机号，检查是否与其他用户重复
  if (params.phone && params.phone !== existing.phone) {
    const phoneExists = await prisma.user.findUnique({
      where: { phone: params.phone },
    });

    if (phoneExists) {
      throw new UserServiceError(
        '手机号已存在',
        'PHONE_EXISTS',
        400
      );
    }
  }

  // 如果更新为城市管理员或普通用户，必须指定城市
  const newRole = params.role ?? existing.role;
  const newCityId = params.cityId !== undefined ? params.cityId : existing.cityId;
  
  if ((newRole === 'CITY_ADMIN' || newRole === 'ORDINARY_USER') && !newCityId) {
    throw new UserServiceError(
      newRole === 'CITY_ADMIN' ? '城市管理员必须指定所属城市' : '普通用户必须指定所属城市',
      'CITY_REQUIRED',
      400
    );
  }

  // 验证城市是否存在
  if (newCityId) {
    const city = await prisma.city.findUnique({
      where: { id: newCityId },
    });

    if (!city) {
      throw new UserServiceError(
        '指定的城市不存在',
        'CITY_NOT_FOUND',
        404
      );
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(params.phone !== undefined && { phone: params.phone }),
      ...(params.name !== undefined && { name: params.name }),
      ...(params.role !== undefined && { role: params.role as User_role }),
      ...(params.cityId !== undefined && { 
        cityId: params.role === 'SYSTEM_ADMIN' ? null : params.cityId 
      }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      updatedAt: new Date(),
    },
    include: {
      City: {
        select: { name: true },
      },
    },
  });

  const { password: _, City, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    cityName: City?.name ?? null,
  };
}

/**
 * 禁用用户
 * @param id 用户ID
 * @returns 更新后的用户
 * @throws UserServiceError 如果用户不存在
 * 
 * Requirements: 8.5
 */
export async function disableUser(id: string): Promise<UserDetail> {
  return updateUser(id, { isActive: false });
}

/**
 * 启用用户
 * @param id 用户ID
 * @returns 更新后的用户
 * @throws UserServiceError 如果用户不存在
 */
export async function enableUser(id: string): Promise<UserDetail> {
  return updateUser(id, { isActive: true });
}

/**
 * 重置用户密码
 * @param id 用户ID
 * @returns 新的临时密码
 * @throws UserServiceError 如果用户不存在或是普通用户
 * 
 * Requirements: 8.4
 */
export async function resetPassword(id: string): Promise<string> {
  // 检查用户是否存在
  const existing = await prisma.user.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new UserServiceError(
      '用户不存在',
      'USER_NOT_FOUND',
      404
    );
  }

  // 普通用户不能重置密码（仅验证码登录）
  if (existing.role === 'ORDINARY_USER') {
    throw new UserServiceError(
      '普通用户仅支持验证码登录，无法重置密码',
      'ORDINARY_USER_NO_PASSWORD',
      400
    );
  }

  // 生成临时密码
  const tempPassword = generateRandomPassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  // 更新密码
  await prisma.user.update({
    where: { id },
    data: {
      password: hashedPassword,
      updatedAt: new Date(),
    },
  });

  return tempPassword;
}

/**
 * 修改密码
 * @param id 用户ID
 * @param oldPassword 旧密码
 * @param newPassword 新密码
 * @throws UserServiceError 如果用户不存在、旧密码错误或是普通用户
 */
export async function changePassword(
  id: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  // 检查用户是否存在
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new UserServiceError(
      '用户不存在',
      'USER_NOT_FOUND',
      404
    );
  }

  // 普通用户不能修改密码（仅验证码登录）
  if (user.role === 'ORDINARY_USER') {
    throw new UserServiceError(
      '普通用户仅支持验证码登录，无法修改密码',
      'ORDINARY_USER_NO_PASSWORD',
      400
    );
  }

  // 验证旧密码
  if (!user.password) {
    throw new UserServiceError(
      '用户未设置密码',
      'NO_PASSWORD_SET',
      400
    );
  }
  
  const isValidPassword = await bcrypt.compare(oldPassword, user.password);
  if (!isValidPassword) {
    throw new UserServiceError(
      '原密码错误',
      'INVALID_OLD_PASSWORD',
      400
    );
  }

  // 验证新密码复杂度
  const passwordValidation = validatePasswordComplexity(newPassword);
  if (!passwordValidation.valid) {
    throw new UserServiceError(
      passwordValidation.message || '新密码不符合要求',
      'INVALID_PASSWORD',
      400
    );
  }

  // 更新密码
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id },
    data: {
      password: hashedPassword,
      updatedAt: new Date(),
    },
  });
}


/**
 * 根据ID获取用户
 * @param id 用户ID
 * @returns 用户或null
 */
export async function getUserById(id: string): Promise<UserDetail | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      City: {
        select: { name: true },
      },
    },
  });

  if (!user) {
    return null;
  }

  const { password: _, City, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    cityName: City?.name ?? null,
  };
}

/**
 * 根据用户名获取用户
 * @param username 用户名
 * @returns 用户或null
 */
export async function getUserByUsername(username: string): Promise<UserDetail | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      City: {
        select: { name: true },
      },
    },
  });

  if (!user) {
    return null;
  }

  const { password: _, City, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    cityName: City?.name ?? null,
  };
}

/**
 * 获取用户列表
 * @param filters 筛选条件
 * @returns 分页用户列表
 * 
 * Requirements: 8.1
 */
export async function getUsers(filters: UserFilters = {}): Promise<PaginatedUsers> {
  const {
    search,
    role,
    cityId,
    isActive,
    page = 1,
    pageSize = 10,
  } = filters;

  // 构建查询条件
  const where: Prisma.UserWhereInput = {};

  if (search && search.trim()) {
    where.OR = [
      { username: { contains: search.trim() } },
      { name: { contains: search.trim() } },
      { phone: { contains: search.trim() } },
    ];
  }

  if (role) {
    where.role = role as User_role;
  }

  if (cityId) {
    where.cityId = cityId;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  // 计算分页
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // 查询用户列表
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        City: {
          select: { name: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  // 转换为列表项格式（不含密码）
  const data: UserListItem[] = users.map((user) => ({
    id: user.id,
    username: user.username,
    phone: user.phone,
    name: user.name,
    role: user.role,
    cityId: user.cityId,
    cityName: user.City?.name ?? null,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));

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
 * 删除用户
 * 注意：如果用户有关联的合同，不能删除
 * @param id 用户ID
 * @throws UserServiceError 如果用户不存在或有关联数据
 */
export async function deleteUser(id: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          Contract_Contract_createdByIdToUser: true,
          Contract_Contract_approvedByIdToUser: true,
        },
      },
    },
  });

  if (!user) {
    throw new UserServiceError(
      '用户不存在',
      'USER_NOT_FOUND',
      404
    );
  }

  const totalContracts = 
    user._count.Contract_Contract_createdByIdToUser + 
    user._count.Contract_Contract_approvedByIdToUser;

  if (totalContracts > 0) {
    throw new UserServiceError(
      `该用户有 ${totalContracts} 个关联合同，无法删除`,
      'USER_HAS_CONTRACTS',
      400
    );
  }

  // 删除用户
  await prisma.user.delete({
    where: { id },
  });
}

// 导出服务对象
export const userService = {
  createUser,
  createOrdinaryUser,
  updateUser,
  disableUser,
  enableUser,
  resetPassword,
  changePassword,
  getUserById,
  getUserByUsername,
  getUsers,
  deleteUser,
};
