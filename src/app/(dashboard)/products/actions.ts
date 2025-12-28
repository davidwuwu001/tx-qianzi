'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  productService,
  ProductFilters,
  CreateProductParams,
  UpdateProductParams,
  ProductServiceError,
  FormFieldConfig,
} from '@/services/product.service';

/**
 * 产品列表项类型
 */
interface ProductListItemResponse {
  id: string;
  name: string;
  description: string | null;
  templateId: string;
  formFields: FormFieldConfig[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  contractCount: number;
  cityCount: number;
}

/**
 * 分页产品列表响应
 */
interface PaginatedProductsResponse {
  data: ProductListItemResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 产品响应
 */
interface ProductResponse {
  id: string;
  name: string;
  description: string | null;
  templateId: string;
  formFields: FormFieldConfig[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 产品详情响应
 */
interface ProductDetailResponse extends ProductResponse {
  cities: Array<{ id: string; name: string }>;
  contractCount: number;
}

/**
 * 获取产品列表结果
 */
interface GetProductsResult {
  success: boolean;
  data?: PaginatedProductsResponse;
  error?: string;
}

/**
 * 产品操作结果
 */
interface ProductActionResult {
  success: boolean;
  data?: ProductResponse;
  error?: string;
}

/**
 * 产品详情结果
 */
interface ProductDetailResult {
  success: boolean;
  data?: ProductDetailResponse;
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
 * 获取启用产品结果
 */
interface GetActiveProductsResult {
  success: boolean;
  data?: Array<{ id: string; name: string; templateId: string }>;
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
 * 获取产品列表
 * Requirements: 7.1
 */
export async function getProductsAction(
  filters: ProductFilters
): Promise<GetProductsResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    const result = await productService.getProducts(filters);
    
    // 转换日期为字符串（序列化）
    const data: PaginatedProductsResponse = {
      ...result,
      data: result.data.map(product => ({
        ...product,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      })),
    };

    return { success: true, data };
  } catch (error) {
    console.error('获取产品列表失败:', error);
    if (error instanceof ProductServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '获取产品列表失败' };
  }
}

/**
 * 获取产品详情
 */
export async function getProductDetailAction(
  id: string
): Promise<ProductDetailResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    const product = await productService.getProductDetail(id);
    
    if (!product) {
      return { success: false, error: '产品不存在' };
    }

    return {
      success: true,
      data: {
        id: product.id,
        name: product.name,
        description: product.description,
        templateId: product.templateId,
        formFields: product.formFields as FormFieldConfig[] | null,
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        cities: product.cities,
        contractCount: product.contractCount,
      },
    };
  } catch (error) {
    console.error('获取产品详情失败:', error);
    if (error instanceof ProductServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '获取产品详情失败' };
  }
}

/**
 * 创建产品
 * Requirements: 7.2, 7.3
 */
export async function createProductAction(
  params: CreateProductParams
): Promise<ProductActionResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    // 验证参数
    if (!params.name || !params.name.trim()) {
      return { success: false, error: '产品名称不能为空' };
    }

    if (!params.templateId || !params.templateId.trim()) {
      return { success: false, error: '模板ID不能为空' };
    }

    const product = await productService.createProduct({
      name: params.name.trim(),
      description: params.description?.trim(),
      templateId: params.templateId.trim(),
      formFields: params.formFields,
      cityIds: params.cityIds,
    });

    return {
      success: true,
      data: {
        id: product.id,
        name: product.name,
        description: product.description,
        templateId: product.templateId,
        formFields: product.formFields as FormFieldConfig[] | null,
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('创建产品失败:', error);
    if (error instanceof ProductServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '创建产品失败' };
  }
}

/**
 * 更新产品
 * Requirements: 7.4
 */
export async function updateProductAction(
  id: string,
  params: UpdateProductParams
): Promise<ProductActionResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    // 验证参数
    if (params.name !== undefined && !params.name.trim()) {
      return { success: false, error: '产品名称不能为空' };
    }

    if (params.templateId !== undefined && !params.templateId.trim()) {
      return { success: false, error: '模板ID不能为空' };
    }

    const product = await productService.updateProduct(id, {
      name: params.name?.trim(),
      description: params.description?.trim(),
      templateId: params.templateId?.trim(),
      formFields: params.formFields,
      isActive: params.isActive,
    });

    return {
      success: true,
      data: {
        id: product.id,
        name: product.name,
        description: product.description,
        templateId: product.templateId,
        formFields: product.formFields as FormFieldConfig[] | null,
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('更新产品失败:', error);
    if (error instanceof ProductServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '更新产品失败' };
  }
}

/**
 * 切换产品状态（启用/禁用）
 * Requirements: 7.5
 */
export async function toggleProductStatusAction(
  id: string,
  isActive: boolean
): Promise<ProductActionResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    const product = isActive
      ? await productService.enableProduct(id)
      : await productService.disableProduct(id);

    return {
      success: true,
      data: {
        id: product.id,
        name: product.name,
        description: product.description,
        templateId: product.templateId,
        formFields: product.formFields as FormFieldConfig[] | null,
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('切换产品状态失败:', error);
    if (error instanceof ProductServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '切换产品状态失败' };
  }
}

/**
 * 更新产品城市关联
 */
export async function updateProductCitiesAction(
  productId: string,
  cityIds: string[]
): Promise<DeleteResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    await productService.updateProductCities(productId, cityIds);

    return { success: true };
  } catch (error) {
    console.error('更新产品城市关联失败:', error);
    if (error instanceof ProductServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '更新产品城市关联失败' };
  }
}

/**
 * 删除产品
 */
export async function deleteProductAction(id: string): Promise<DeleteResult> {
  try {
    const { isAdmin, error } = await checkSystemAdmin();
    if (!isAdmin) {
      return { success: false, error };
    }

    await productService.deleteProduct(id);

    return { success: true };
  } catch (error) {
    console.error('删除产品失败:', error);
    if (error instanceof ProductServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '删除产品失败' };
  }
}

/**
 * 获取所有启用的产品（用于下拉选择）
 */
export async function getActiveProductsAction(
  cityId?: string
): Promise<GetActiveProductsResult> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return { success: false, error: '未登录' };
    }

    const products = await productService.getActiveProducts(cityId);

    return { success: true, data: products };
  } catch (error) {
    console.error('获取产品列表失败:', error);
    return { success: false, error: '获取产品列表失败' };
  }
}
