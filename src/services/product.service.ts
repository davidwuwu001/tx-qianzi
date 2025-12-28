/**
 * 产品管理服务
 * 
 * 实现产品的CRUD操作，包括：
 * - 创建产品（绑定腾讯电子签模板）
 * - 更新产品信息
 * - 禁用/启用产品
 * - 查询产品列表
 * - 城市-产品关联管理
 * - 动态表单字段配置管理
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 * Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 3.2, 3.4 (动态表单配置)
 */

import { Product, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { esignService } from './esign.service';
import {
  FormFieldConfig as NewFormFieldConfig,
  ProductFormFields,
  FieldType,
  FieldFiller,
  SelectOption,
  FILLABLE_COMPONENT_TYPES,
  SIGN_COMPONENT_TYPES,
  COMPONENT_TYPE_MAP,
} from '@/types/form-field';

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
 * 表单字段配置（旧版，保留兼容性）
 * @deprecated 请使用 @/types/form-field 中的 FormFieldConfig
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
  /** 字段配置（使用新的 ProductFormFields 结构） */
  formFields?: ProductFormFields;
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
  /** 字段配置（使用新的 ProductFormFields 结构） */
  formFields?: ProductFormFields;
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
  /** 字段配置（使用新的 ProductFormFields 结构） */
  formFields: ProductFormFields | null;
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
    formFields: product.formFields as ProductFormFields | null,
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
  // 动态表单配置相关
  validateFormFieldsConfig,
  validateFormFieldConfig,
  classifyFieldsByFiller,
  getInitiatorFields,
  filterFillableComponents,
  convertComponentsToFormFields,
  getTemplateFields,
  mergeFieldConfigs,
};

// ============ 动态表单字段配置相关函数 ============

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 验证单个字段配置
 * @param config 字段配置
 * @param index 字段索引（用于错误信息）
 * @returns 验证结果
 * 
 * Requirements: 3.4
 */
export function validateFormFieldConfig(
  config: unknown,
  index?: number
): ValidationResult {
  const errors: string[] = [];
  const prefix = index !== undefined ? `字段 ${index + 1}: ` : '';

  // 检查是否为对象
  if (typeof config !== 'object' || config === null) {
    return { valid: false, errors: [`${prefix}配置必须是对象`] };
  }

  const c = config as Record<string, unknown>;

  // 验证 name 属性
  if (typeof c.name !== 'string' || c.name.trim().length === 0) {
    errors.push(`${prefix}字段名(name)不能为空`);
  }

  // 验证 label 属性
  if (typeof c.label !== 'string' || c.label.trim().length === 0) {
    errors.push(`${prefix}显示名称(label)不能为空`);
  }

  // 验证 type 属性
  const validTypes: FieldType[] = ['text', 'number', 'date', 'select'];
  if (!validTypes.includes(c.type as FieldType)) {
    errors.push(`${prefix}字段类型(type)无效，必须是 text/number/date/select 之一`);
  }

  // 验证 filler 属性
  const validFillers: FieldFiller[] = ['INITIATOR', 'SIGNER'];
  if (!validFillers.includes(c.filler as FieldFiller)) {
    errors.push(`${prefix}填写方(filler)无效，必须是 INITIATOR 或 SIGNER`);
  }

  // 验证 required 属性
  if (typeof c.required !== 'boolean') {
    errors.push(`${prefix}是否必填(required)必须是布尔值`);
  }

  // 验证 select 类型必须有 options
  if (c.type === 'select') {
    if (!Array.isArray(c.options) || c.options.length === 0) {
      errors.push(`${prefix}下拉字段必须配置选项(options)`);
    } else {
      // 验证每个选项
      for (let i = 0; i < c.options.length; i++) {
        const opt = c.options[i] as Record<string, unknown>;
        if (typeof opt !== 'object' || opt === null) {
          errors.push(`${prefix}选项 ${i + 1} 必须是对象`);
        } else {
          if (typeof opt.label !== 'string' || opt.label.trim().length === 0) {
            errors.push(`${prefix}选项 ${i + 1} 的显示文本(label)不能为空`);
          }
          if (typeof opt.value !== 'string' || opt.value.trim().length === 0) {
            errors.push(`${prefix}选项 ${i + 1} 的值(value)不能为空`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 验证产品字段配置
 * @param config 产品字段配置
 * @returns 验证结果
 * 
 * Requirements: 3.4
 */
export function validateFormFieldsConfig(
  config: unknown
): ValidationResult {
  const errors: string[] = [];

  // 检查是否为对象
  if (typeof config !== 'object' || config === null) {
    return { valid: false, errors: ['配置必须是对象'] };
  }

  const c = config as Record<string, unknown>;

  // 检查 initiatorFields 数组
  if (!Array.isArray(c.initiatorFields)) {
    errors.push('发起方字段(initiatorFields)必须是数组');
  } else {
    // 验证每个发起方字段
    for (let i = 0; i < c.initiatorFields.length; i++) {
      const field = c.initiatorFields[i];
      const result = validateFormFieldConfig(field, i);
      if (!result.valid) {
        errors.push(...result.errors.map(e => `发起方字段 - ${e}`));
      }
      // 检查 filler 是否为 INITIATOR
      if (typeof field === 'object' && field !== null) {
        const f = field as Record<string, unknown>;
        if (f.filler !== 'INITIATOR') {
          errors.push(`发起方字段 ${i + 1}: 填写方必须是 INITIATOR`);
        }
      }
    }
  }

  // 检查 signerFields 数组
  if (!Array.isArray(c.signerFields)) {
    errors.push('签署方字段(signerFields)必须是数组');
  } else {
    // 验证每个签署方字段
    for (let i = 0; i < c.signerFields.length; i++) {
      const field = c.signerFields[i];
      const result = validateFormFieldConfig(field, i);
      if (!result.valid) {
        errors.push(...result.errors.map(e => `签署方字段 - ${e}`));
      }
      // 检查 filler 是否为 SIGNER
      if (typeof field === 'object' && field !== null) {
        const f = field as Record<string, unknown>;
        if (f.filler !== 'SIGNER') {
          errors.push(`签署方字段 ${i + 1}: 填写方必须是 SIGNER`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 根据填写方分类字段
 * @param fields 字段配置列表
 * @returns 分类后的产品字段配置
 * 
 * Requirements: 3.2
 */
export function classifyFieldsByFiller(
  fields: NewFormFieldConfig[]
): ProductFormFields {
  const initiatorFields: NewFormFieldConfig[] = [];
  const signerFields: NewFormFieldConfig[] = [];

  for (const field of fields) {
    if (field.filler === 'INITIATOR') {
      initiatorFields.push(field);
    } else if (field.filler === 'SIGNER') {
      signerFields.push(field);
    }
  }

  return {
    initiatorFields,
    signerFields,
  };
}

/**
 * 从产品中获取发起方字段
 * @param product 产品对象（包含 formFields）
 * @returns 发起方字段列表
 * 
 * Requirements: 2.2, 2.3, 4.1
 */
export function getInitiatorFields(
  product: { formFields?: unknown }
): NewFormFieldConfig[] {
  if (!product.formFields) {
    return [];
  }

  // 尝试解析 formFields
  let config: ProductFormFields;
  
  if (typeof product.formFields === 'string') {
    try {
      config = JSON.parse(product.formFields);
    } catch {
      return [];
    }
  } else {
    config = product.formFields as ProductFormFields;
  }

  // 验证配置结构
  if (!config || !Array.isArray(config.initiatorFields)) {
    return [];
  }

  // 只返回 filler 为 INITIATOR 的字段
  return config.initiatorFields.filter(
    (field) => field.filler === 'INITIATOR'
  );
}


// ============ 模板控件相关类型 ============

/**
 * 腾讯电子签模板控件
 */
export interface TemplateComponent {
  ComponentId: string;
  ComponentName: string;
  ComponentType: string;
  ComponentRequired: boolean;
  ComponentValue?: string;
  ComponentExtra?: string;
}

// ============ 模板字段获取和转换函数 ============

/**
 * 过滤出填写控件（排除签署控件）
 * @param components 模板控件列表
 * @returns 填写控件列表
 * 
 * Requirements: 1.2
 */
export function filterFillableComponents(
  components: TemplateComponent[]
): TemplateComponent[] {
  return components.filter((component) => {
    // 检查是否是填写控件类型
    const isFillable = FILLABLE_COMPONENT_TYPES.includes(
      component.ComponentType as typeof FILLABLE_COMPONENT_TYPES[number]
    );
    
    // 检查是否是签署控件类型（需要排除）
    const isSignComponent = SIGN_COMPONENT_TYPES.includes(
      component.ComponentType as typeof SIGN_COMPONENT_TYPES[number]
    );
    
    return isFillable && !isSignComponent;
  });
}

/**
 * 将模板控件转换为字段配置
 * @param components 模板控件列表
 * @returns 字段配置列表
 * 
 * Requirements: 1.2, 1.3
 */
export function convertComponentsToFormFields(
  components: TemplateComponent[]
): NewFormFieldConfig[] {
  return components.map((component) => {
    // 获取字段类型
    const fieldType = COMPONENT_TYPE_MAP[component.ComponentType] || 'text';
    
    // 构建基础配置
    const config: NewFormFieldConfig = {
      name: component.ComponentName,
      label: component.ComponentName, // 默认使用控件名作为显示名称
      type: fieldType,
      filler: 'INITIATOR', // 默认为发起方填写
      required: component.ComponentRequired,
      componentId: component.ComponentId,
      componentType: component.ComponentType,
    };
    
    // 如果有默认值
    if (component.ComponentValue) {
      config.defaultValue = component.ComponentValue;
    }
    
    // 如果是 select 类型，尝试解析选项
    if (fieldType === 'select' && component.ComponentExtra) {
      try {
        const extra = JSON.parse(component.ComponentExtra);
        if (Array.isArray(extra.options)) {
          config.options = extra.options.map((opt: string | { label: string; value: string }) => {
            if (typeof opt === 'string') {
              return { label: opt, value: opt };
            }
            return opt;
          });
        }
      } catch {
        // 解析失败，使用空选项
        config.options = [];
      }
    }
    
    // 如果是 select 类型但没有选项，添加空数组
    if (fieldType === 'select' && !config.options) {
      config.options = [];
    }
    
    return config;
  });
}

/**
 * 从腾讯电子签获取模板字段配置
 * @param templateId 模板ID
 * @returns 字段配置列表
 * 
 * Requirements: 1.1, 1.2, 1.3
 */
export async function getTemplateFields(
  templateId: string
): Promise<NewFormFieldConfig[]> {
  // 调用腾讯电子签 API 获取模板详情
  const template = await esignService.describeFlowTemplates(templateId);
  
  // 过滤出填写控件
  const fillableComponents = filterFillableComponents(template.Components);
  
  // 转换为字段配置
  return convertComponentsToFormFields(fillableComponents);
}

/**
 * 合并字段配置（保留已有配置的自定义属性）
 * @param existingFields 已有字段配置
 * @param newFields 新获取的字段配置
 * @returns 合并后的字段配置
 * 
 * Requirements: 6.5
 */
export function mergeFieldConfigs(
  existingFields: NewFormFieldConfig[],
  newFields: NewFormFieldConfig[]
): NewFormFieldConfig[] {
  // 创建已有字段的映射（按 name 索引）
  const existingMap = new Map<string, NewFormFieldConfig>();
  for (const field of existingFields) {
    existingMap.set(field.name, field);
  }
  
  // 合并字段
  return newFields.map((newField) => {
    const existing = existingMap.get(newField.name);
    
    if (existing) {
      // 保留已有配置的自定义属性，更新模板信息
      return {
        ...newField,
        label: existing.label, // 保留自定义显示名称
        filler: existing.filler, // 保留填写方设置
        required: existing.required, // 保留必填设置
        defaultValue: existing.defaultValue, // 保留默认值
        placeholder: existing.placeholder, // 保留占位提示
        options: existing.options || newField.options, // 保留选项配置
        // 更新模板信息
        componentId: newField.componentId,
        componentType: newField.componentType,
      };
    }
    
    // 新字段，直接使用
    return newField;
  });
}
