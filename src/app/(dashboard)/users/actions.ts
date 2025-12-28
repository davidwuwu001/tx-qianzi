'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  userService,
  UserFilters,
  CreateUserParams,
  UpdateUserParams,
  UserServiceError,
} from '@/services/user.service';
import { User_role } from '@prisma/client';

/**
 * 用户列表项类型
 */
interface UserListItemResponse {
  id: string;
  username: string | null;
  phone: string;
  name: string;
  role: User_role;
  cityId: string | null;
  cityName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 分页用户列表响应
 */
interface PaginatedUsersResponse {
  data: UserListItemResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 用户响应
 */
interface UserResponse {
  id: string;
  username: string | null;
  phone: string;
  name: string;
  role: User_role;
  cityId: string | null;
  cityName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 获取用户列表结果
 */
interface GetUsersResult {
  success: boolean;
  data?: PaginatedUsersResponse;
  error?: string;
}

/**
 * 用户操作结果
 */
interface UserActionResult {
  success: boolean;
  data?: UserResponse;
  error?: string;
}

/**
 * 重置密码结果
 */
interface ResetPasswordResult {
  success: boolean;
  tempPassword?: string;
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
 * 转换用户为响应格式
 */
function toUserResponse(user: {
  id: string;
  username: string | null;
  phone: string;
  name: string;
  role: User_role;
  cityId: string | null;
  cityName: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): UserResponse {
  return {
    ...user,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}


/**
 * 获取用户列表
 * Requirements: 8.1
 */
export async function getUsersAction(
  filters: UserFilters
): Promise<GetUsersResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    const result = await userService.getUsers(filters);
    
    // 转换日期为字符串（序列化）
    const data: PaginatedUsersResponse = {
      ...result,
      data: result.data.map(user => ({
        ...user,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })),
    };

    return { success: true, data };
  } catch (error) {
    console.error('获取用户列表失败:', error);
    if (error instanceof UserServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '获取用户列表失败' };
  }
}

/**
 * 创建用户
 * Requirements: 8.2
 */
export async function createUserAction(
  params: CreateUserParams
): Promise<UserActionResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    // 验证参数
    if (!params.username || !params.username.trim()) {
      return { success: false, error: '用户名不能为空' };
    }

    if (!params.password || !params.password.trim()) {
      return { success: false, error: '密码不能为空' };
    }

    if (!params.phone || !params.phone.trim()) {
      return { success: false, error: '手机号不能为空' };
    }

    if (!params.name || !params.name.trim()) {
      return { success: false, error: '姓名不能为空' };
    }

    const user = await userService.createUser({
      username: params.username.trim(),
      password: params.password,
      phone: params.phone.trim(),
      name: params.name.trim(),
      role: params.role,
      cityId: params.cityId,
    });

    return {
      success: true,
      data: toUserResponse(user),
    };
  } catch (error) {
    console.error('创建用户失败:', error);
    if (error instanceof UserServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '创建用户失败' };
  }
}

/**
 * 更新用户
 * Requirements: 8.3
 */
export async function updateUserAction(
  id: string,
  params: UpdateUserParams
): Promise<UserActionResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    // 验证参数
    if (params.phone !== undefined && !params.phone.trim()) {
      return { success: false, error: '手机号不能为空' };
    }

    if (params.name !== undefined && !params.name.trim()) {
      return { success: false, error: '姓名不能为空' };
    }

    const user = await userService.updateUser(id, {
      phone: params.phone?.trim(),
      name: params.name?.trim(),
      role: params.role,
      cityId: params.cityId,
      isActive: params.isActive,
    });

    return {
      success: true,
      data: toUserResponse(user),
    };
  } catch (error) {
    console.error('更新用户失败:', error);
    if (error instanceof UserServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '更新用户失败' };
  }
}

/**
 * 切换用户状态（启用/禁用）
 * Requirements: 8.5
 */
export async function toggleUserStatusAction(
  id: string,
  isActive: boolean
): Promise<UserActionResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    const user = isActive
      ? await userService.enableUser(id)
      : await userService.disableUser(id);

    return {
      success: true,
      data: toUserResponse(user),
    };
  } catch (error) {
    console.error('切换用户状态失败:', error);
    if (error instanceof UserServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '切换用户状态失败' };
  }
}

/**
 * 重置用户密码
 * Requirements: 8.4
 */
export async function resetPasswordAction(id: string): Promise<ResetPasswordResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    const tempPassword = await userService.resetPassword(id);

    return { success: true, tempPassword };
  } catch (error) {
    console.error('重置密码失败:', error);
    if (error instanceof UserServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '重置密码失败' };
  }
}

/**
 * 删除用户
 */
export async function deleteUserAction(id: string): Promise<DeleteResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    await userService.deleteUser(id);

    return { success: true };
  } catch (error) {
    console.error('删除用户失败:', error);
    if (error instanceof UserServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '删除用户失败' };
  }
}
