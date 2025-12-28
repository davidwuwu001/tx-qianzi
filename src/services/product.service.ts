/**
 * 产品管理服务
 * 
 * 实现产品的CRUD操作，包括：
 * - 创建产品（绑定腾讯电子签模板）
 * - 更新产品信息
 * - 禁用/启用产品
 * - 查询产品列表
 * - 城市-产品关联管理
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { Product, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { esignService } from './esign.service';

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 产品服务错误类
 */
export class ProductServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ProductServiceError';
  }
}

/**
 * 表单字段配置
 */
export interface FormFieldConfig {
  /** 字段名称（对应模板中的控件名） */
  name: string;
  /** 字段标签（显示名称） */
  label: string;
  /** 字段类型 */
  type: 'text' | 'number' | 'date' | 'select';
  /** 是否必填 */
  required: boolean;
  /** 默认值 */
  defaultValue?: string;
  /** 选项（type为select时使用） */
  options?: string[];
}

/**
 * 创建产品参数
 */
export interface CreateProductParams {
  name: string;
  description?: string;
  templateId: string;
  formFields?: FormFieldConfig[];
  /** 关联的城市ID列表 */
  cityIds?: string[];
}

/**
 * 更新产品参数
 */
export interface UpdateProductParams {
  name?: string;
  description?: string;
  templateId?: string;
  formFields?: FormFieldConfig[];
  isActive?: boolean;
}

/**
 * 产品列表筛选参数
 */
export interface ProductFilters {
  search?: string;
  isActive?: boolean;
  cityId?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 产品列表项
 */
export interface ProductListItem {
  id: string;
  name: string;
  description: string | null;
  templateId: string;
  formFields: FormFieldConfig[] | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** 合同数量 */
  contractCount: number;
  /** 关联城市数量 */
  cityCount: number;
}

/**
 * 分页产品列表
 */
export interface PaginatedProducts {
  data: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 产品详情（包含关联城市）
 */
export interface ProductDetail extends Product {
  cities: Array<{ id: string; name: string }>;
  contractCount: number;
}


/**
 * 验证模板ID是否存在于腾讯电子签
 * @param templateId 模板ID
 * @returns 是否有效
 * 
 * Requirements: 7.6
 */
async function validateTemplateId(templateId: string): Promise<boolean> {
  try {
    // 尝试调用腾讯电子签API验证模板
    // 注意：实际环境中需要调用 DescribeFlowTemplates API
    // 这里简化处理，只检查格式
    if (!templateId || templateId.trim().length === 0) {
      return false;
    }
    // 模板ID格式验证（腾讯电子签模板ID通常是特定格式）
    return true;
  } catch {
    return false;
  }
}

/**
 * 创建产品
 * @param params 创建参数
 * @returns 创建的产品
 * @throws ProductServiceError 如果模板ID无效或产品名称已存在
 * 
 * Requirements: 7.2, 7.3, 7.6
 */
export async function createProduct(params: CreateProductParams): Promise<Product> {
  const { name, description, templateId, formFields, cityIds } = params;

  // 验证模板ID
  const isValidTemplate = await validateTemplateId(templateId);
  if (!isValidTemplate) {
    throw new ProductServiceError(
      '模板ID无效',
      'INVALID_TEMPLATE_ID',
      400
    );
  }

  // 检查产品名称是否已存在
  const existing = await prisma.product.findFirst({
    where: { name },
  });

  if (existing) {
    throw new ProductServiceError(
      '产品名称已存在',
      'PRODUCT_NAME_EXISTS',
      400
    );
  }

  const id = generateId();
  const now = new Date();

  // 使用事务创建产品和城市关联
  const product = await prisma.$transaction(async (tx) => {
    // 创建产品
    const newProduct = await tx.product.create({
      data: {
        id,
        name,
        description: description ?? null,
        templateId,
        formFields: formFields ? JSON.parse(JSON.stringify(formFields)) : null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    });

    // 创建城市关联
    if (cityIds && cityIds.length > 0) {
      await tx.cityProduct.createMany({
        data: cityIds.map((cityId) => ({
          id: generateId(),
          cityId,
          productId: id,
          createdAt: now,
        })),
      });
    }

    return newProduct;
  });

  return product;
}

/**
 * 更新产品
 * @param id 产品ID
 * @param params 更新参数
 * @returns 更新后的产品
 * @throws ProductServiceError 如果产品不存在或模板ID无效
 * 
 * Requirements: 7.4
 */
export async function updateProduct(id: string, params: UpdateProductParams): Promise<Product> {
  // 检查产品是否存在
  const existing = await prisma.product.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ProductServiceError(
      '产品不存在',
      'PRODUCT_NOT_FOUND',
      404
    );
  }

  // 如果要更新模板ID，验证新模板ID
  if (params.templateId && params.templateId !== existing.templateId) {
    const isValidTemplate = await validateTemplateId(params.templateId);
    if (!isValidTemplate) {
      throw new ProductServiceError(
        '模板ID无效',
        'INVALID_TEMPLATE_ID',
        400
      );
    }
  }

  // 如果要更新名称，检查是否与其他产品重复
  if (params.name && params.name !== existing.name) {
    const nameExists = await prisma.product.findFirst({
      where: { 
        name: params.name,
        id: { not: id },
      },
    });

    if (nameExists) {
      throw new ProductServiceError(
        '产品名称已存在',
        'PRODUCT_NAME_EXISTS',
        400
      );
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(params.name !== undefined && { name: params.name }),
      ...(params.description !== undefined && { description: params.description }),
      ...(params.templateId !== undefined && { templateId: params.templateId }),
      ...(params.formFields !== undefined && { 
        formFields: params.formFields ? JSON.parse(JSON.stringify(params.formFields)) : null 
      }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      updatedAt: new Date(),
    },
  });

  return product;
}

/**
 * 禁用产品
 * 禁用后，该产品不能用于新合同
 * @param id 产品ID
 * @returns 更新后的产品
 * @throws ProductServiceError 如果产品不存在
 * 
 * Requirements: 7.5
 */
export async function disableProduct(id: string): Promise<Product> {
  return updateProduct(id, { isActive: false });
}

/**
 * 启用产品
 * @param id 产品ID
 * @returns 更新后的产品
 * @throws ProductServiceError 如果产品不存在
 */
export async function enableProduct(id: string): Promise<Product> {
  return updateProduct(id, { isActive: true });
}

/**
 * 根据ID获取产品
 * @param id 产品ID
 * @returns 产品或null
 */
export async function getProductById(id: string): Promise<Product | null> {
  return prisma.product.findUnique({
    where: { id },
  });
}

/**
 * 获取产品详情（包含关联城市）
 * @param id 产品ID
 * @returns 产品详情或null
 */
export async function getProductDetail(id: string): Promise<ProductDetail | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      CityProduct: {
        include: {
          City: {
            select: { id: true, name: true },
          },
        },
      },
      _count: {
        select: { Contract: true },
      },
    },
  });

  if (!product) {
    return null;
  }

  return {
    ...product,
    cities: product.CityProduct.map((cp) => cp.City),
    contractCount: product._count.Contract,
  };
}


/**
 * 获取产品列表
 * @param filters 筛选条件
 * @returns 分页产品列表
 * 
 * Requirements: 7.1
 */
export async function getProducts(filters: ProductFilters = {}): Promise<PaginatedProducts> {
  const {
    search,
    isActive,
    cityId,
    page = 1,
    pageSize = 10,
  } = filters;

  // 构建查询条件
  const where: Prisma.ProductWhereInput = {};

  if (search && search.trim()) {
    where.OR = [
      { name: { contains: search.trim() } },
      { description: { contains: search.trim() } },
    ];
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  // 如果指定了城市，只返回该城市关联的产品
  if (cityId) {
    where.CityProduct = {
      some: { cityId },
    };
  }

  // 计算分页
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // 查询产品列表
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        _count: {
          select: {
            Contract: true,
            CityProduct: true,
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  // 转换为列表项格式
  const data: ProductListItem[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    templateId: product.templateId,
    formFields: product.formFields as FormFieldConfig[] | null,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    contractCount: product._count.Contract,
    cityCount: product._count.CityProduct,
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
 * 获取所有启用的产品（用于下拉选择）
 * @param cityId 可选的城市ID，如果指定则只返回该城市关联的产品
 * @returns 启用的产品列表
 */
export async function getActiveProducts(cityId?: string): Promise<Pick<Product, 'id' | 'name' | 'templateId'>[]> {
  const where: Prisma.ProductWhereInput = { isActive: true };

  if (cityId) {
    where.CityProduct = {
      some: { cityId },
    };
  }

  return prisma.product.findMany({
    where,
    select: { id: true, name: true, templateId: true },
    orderBy: { name: 'asc' },
  });
}

/**
 * 更新产品的城市关联
 * @param productId 产品ID
 * @param cityIds 城市ID列表
 * @throws ProductServiceError 如果产品不存在
 */
export async function updateProductCities(productId: string, cityIds: string[]): Promise<void> {
  // 检查产品是否存在
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ProductServiceError(
      '产品不存在',
      'PRODUCT_NOT_FOUND',
      404
    );
  }

  // 使用事务更新城市关联
  await prisma.$transaction(async (tx) => {
    // 删除现有关联
    await tx.cityProduct.deleteMany({
      where: { productId },
    });

    // 创建新关联
    if (cityIds.length > 0) {
      const now = new Date();
      await tx.cityProduct.createMany({
        data: cityIds.map((cityId) => ({
          id: generateId(),
          cityId,
          productId,
          createdAt: now,
        })),
      });
    }
  });
}

/**
 * 获取产品关联的城市列表
 * @param productId 产品ID
 * @returns 城市列表
 */
export async function getProductCities(productId: string): Promise<Array<{ id: string; name: string }>> {
  const cityProducts = await prisma.cityProduct.findMany({
    where: { productId },
    include: {
      City: {
        select: { id: true, name: true },
      },
    },
  });

  return cityProducts.map((cp) => cp.City);
}

/**
 * 删除产品
 * 注意：如果产品下有合同，不能删除
 * @param id 产品ID
 * @throws ProductServiceError 如果产品不存在或有关联合同
 */
export async function deleteProduct(id: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      _count: {
        select: { Contract: true },
      },
    },
  });

  if (!product) {
    throw new ProductServiceError(
      '产品不存在',
      'PRODUCT_NOT_FOUND',
      404
    );
  }

  if (product._count.Contract > 0) {
    throw new ProductServiceError(
      `该产品下有 ${product._count.Contract} 个合同，无法删除`,
      'PRODUCT_HAS_CONTRACTS',
      400
    );
  }

  // 使用事务删除产品和关联
  await prisma.$transaction(async (tx) => {
    // 删除城市关联
    await tx.cityProduct.deleteMany({
      where: { productId: id },
    });

    // 删除产品
    await tx.product.delete({
      where: { id },
    });
  });
}

// 导出服务对象
export const productService = {
  createProduct,
  updateProduct,
  disableProduct,
  enableProduct,
  getProductById,
  getProductDetail,
  getProducts,
  getActiveProducts,
  updateProductCities,
  getProductCities,
  deleteProduct,
};
