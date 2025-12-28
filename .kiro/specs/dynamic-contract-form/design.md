# Design Document

## Overview

本设计文档描述动态合同表单配置系统的技术实现方案。系统允许管理员为产品配置模板字段，区分"发起方填写"和"签署方填写"两类字段。

核心设计原则：
- 字段配置存储在 Product.formFields，使用 JSON 结构区分发起方和签署方字段
- 移动端只渲染发起方字段，签署方字段由乙方在腾讯电子签签署页面填写
- 提供可视化的字段配置编辑器，降低配置门槛

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        后台管理 (Dashboard)                      │
├─────────────────────────────────────────────────────────────────┤
│  产品管理页面                                                    │
│  ├── 产品列表                                                   │
│  └── 新增/编辑产品弹窗                                          │
│      ├── 基本信息（名称、描述、模板ID）                          │
│      ├── 获取字段配置按钮 → 调用 Template_API                   │
│      └── 字段配置编辑器 (FormFieldsEditor)                      │
│          ├── 字段列表表格                                       │
│          │   ├── 字段名称（只读，来自模板）                      │
│          │   ├── 显示名称（可编辑）                             │
│          │   ├── 填写方（发起方/签署方）                        │
│          │   ├── 字段类型（text/number/date/select）           │
│          │   ├── 是否必填                                      │
│          │   └── 默认值                                        │
│          └── 选项编辑（select 类型时）                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        数据库 (Prisma)                           │
├─────────────────────────────────────────────────────────────────┤
│  Product                                                        │
│  ├── id                                                         │
│  ├── name                                                       │
│  ├── templateId                                                 │
│  ├── formFields (JSON) ─────────────────────────────────────┐   │
│  │                                                          │   │
│  │   {                                                      │   │
│  │     "initiatorFields": [...],  // 发起方填写的字段        │   │
│  │     "signerFields": [...]      // 签署方填写的字段        │   │
│  │   }                                                      │   │
│  │                                                          │   │
│  └── ...                                                    │   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        移动端 (Mobile)                           │
├─────────────────────────────────────────────────────────────────┤
│  发起签约页面 (/m/contracts/new)                                 │
│  ├── 产品选择                                                   │
│  ├── 动态表单（只渲染 initiatorFields）                          │
│  │   ├── Input (text)                                          │
│  │   ├── InputNumber (number)                                  │
│  │   ├── DatePicker (date)                                     │
│  │   └── Select (select)                                       │
│  └── 提交按钮                                                   │
│                                                                 │
│  提交后 → 创建合同 → 调用腾讯电子签 API                          │
│         （只传递 initiatorFields 的值）                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    腾讯电子签签署页面                             │
├─────────────────────────────────────────────────────────────────┤
│  乙方打开签署链接后：                                            │
│  ├── 查看合同内容（已填充发起方字段）                            │
│  ├── 填写签署方字段（signerFields 对应的控件）                   │
│  └── 签署确认                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. FormField 配置类型

```typescript
// src/types/form-field.ts

// 字段类型枚举
export type FieldType = 'text' | 'number' | 'date' | 'select';

// 填写方枚举
export type FieldFiller = 'INITIATOR' | 'SIGNER';

// 下拉选项
export interface SelectOption {
  label: string;
  value: string;
}

// 表单字段配置
export interface FormFieldConfig {
  name: string;           // 字段名（对应模板控件名，不可修改）
  label: string;          // 显示名称（可编辑）
  type: FieldType;        // 字段类型
  filler: FieldFiller;    // 填写方：发起方 or 签署方
  required: boolean;      // 是否必填
  defaultValue?: string;  // 默认值
  placeholder?: string;   // 占位提示
  options?: SelectOption[]; // 下拉选项（type=select时）
  // 从模板获取的原始信息（只读）
  componentId?: string;   // 模板控件ID
  componentType?: string; // 模板控件类型
}

// 产品字段配置结构
export interface ProductFormFields {
  initiatorFields: FormFieldConfig[];  // 发起方填写的字段
  signerFields: FormFieldConfig[];     // 签署方填写的字段
}
```

### 2. 服务层接口

```typescript
// src/services/product.service.ts 扩展

// 从模板获取字段配置
export async function getTemplateFields(
  templateId: string
): Promise<FormFieldConfig[]>;

// 将模板控件转换为字段配置
export function convertComponentsToFormFields(
  components: TemplateComponent[]
): FormFieldConfig[];

// 验证字段配置
export function validateFormFieldsConfig(
  config: ProductFormFields
): { valid: boolean; errors: string[] };

// 获取发起方字段（用于移动端表单渲染）
export function getInitiatorFields(
  product: Product
): FormFieldConfig[];

// 构建 CreateDocument 的 FormFields 参数
export function buildFormFieldsForDocument(
  formData: Record<string, unknown>,
  initiatorFields: FormFieldConfig[]
): FormField[];
```

### 3. API 路由

```typescript
// GET /api/templates/[templateId]/fields
// 获取模板的填写控件列表
// 返回: { success: boolean, data: { fields: FormFieldConfig[] } }

// GET /api/products/[productId]/initiator-fields
// 获取产品的发起方字段配置（移动端使用）
// 返回: { success: boolean, data: { fields: FormFieldConfig[] } }
```

### 4. 组件设计

```typescript
// src/components/product/FormFieldsEditor.tsx
// 字段配置编辑器组件

interface FormFieldsEditorProps {
  value?: FormFieldConfig[];
  onChange?: (fields: FormFieldConfig[]) => void;
  loading?: boolean;
  onRefresh?: () => void;  // 重新获取模板字段
}

// 功能：
// - 表格形式展示字段列表
// - 支持编辑：显示名称、填写方、类型、必填、默认值
// - select 类型时显示选项编辑
// - 支持拖拽排序
// - 重新获取按钮

// src/components/contract/DynamicForm.tsx
// 动态表单组件（移动端使用）

interface DynamicFormProps {
  fields: FormFieldConfig[];  // 只传入 initiatorFields
  form: FormInstance;
  disabled?: boolean;
}

// 功能：
// - 根据字段配置动态渲染表单
// - 支持 text/number/date/select 四种类型
// - 处理必填验证和默认值
```

## Data Models

### Product.formFields JSON 结构

```json
{
  "initiatorFields": [
    {
      "name": "projectName",
      "label": "项目名称",
      "type": "text",
      "filler": "INITIATOR",
      "required": true,
      "placeholder": "请输入项目名称",
      "componentId": "ComponentId_1",
      "componentType": "TEXT"
    },
    {
      "name": "contractAmount",
      "label": "合同金额（元）",
      "type": "number",
      "filler": "INITIATOR",
      "required": true,
      "defaultValue": "0",
      "componentId": "ComponentId_2",
      "componentType": "TEXT"
    }
  ],
  "signerFields": [
    {
      "name": "partyBName",
      "label": "乙方姓名",
      "type": "text",
      "filler": "SIGNER",
      "required": true,
      "componentId": "ComponentId_3",
      "componentType": "TEXT"
    },
    {
      "name": "partyBIdCard",
      "label": "乙方身份证号",
      "type": "text",
      "filler": "SIGNER",
      "required": true,
      "componentId": "ComponentId_4",
      "componentType": "TEXT"
    }
  ]
}
```

### 字段类型映射

| 模板控件类型 | 系统字段类型 | 移动端组件 |
|-------------|-------------|-----------|
| TEXT | text | Input |
| MULTI_LINE_TEXT | text | TextArea |
| NUMBER | number | InputNumber |
| DATE | date | DatePicker |
| SELECT | select | Select |


## Correctness Properties

*正确性属性是系统在所有有效执行中都应该保持为真的特征或行为。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*

基于需求分析，以下是本功能的核心正确性属性：

### Property 1: 控件过滤正确性

*For any* 模板控件列表，过滤后的结果应该只包含填写控件（TEXT、MULTI_LINE_TEXT、NUMBER、DATE、SELECT），不包含签署控件（SIGN、SEAL、DATE_SIGN）。

**Validates: Requirements 1.2**

### Property 2: 字段分类正确性

*For any* 字段配置，如果 filler 为 INITIATOR，则该字段应该出现在 getInitiatorFields 的返回结果中；如果 filler 为 SIGNER，则该字段不应该出现在 getInitiatorFields 的返回结果中。

**Validates: Requirements 2.2, 2.3**

### Property 3: 字段配置结构完整性

*For any* 有效的 FormFieldConfig 对象，必须包含 name、label、type、filler、required 属性；如果 type 为 'select'，则必须包含非空的 options 数组。

**Validates: Requirements 2.4, 2.5**

### Property 4: 配置序列化 Round-Trip

*For any* 有效的 ProductFormFields 配置，序列化为 JSON 后再反序列化，应该得到与原始配置等价的对象。

**Validates: Requirements 3.1, 3.3**

### Property 5: 字段分类存储正确性

*For any* 字段配置列表，保存到 ProductFormFields 后，所有 filler 为 INITIATOR 的字段应该在 initiatorFields 数组中，所有 filler 为 SIGNER 的字段应该在 signerFields 数组中。

**Validates: Requirements 3.2**

### Property 6: 配置验证正确性

*For any* 无效的字段配置（如缺少必要属性、type 为 select 但无 options），validateFormFieldsConfig 应该返回 valid: false 并包含错误信息。

**Validates: Requirements 3.4**

### Property 7: 类型映射正确性

*For any* FormFieldConfig，根据其 type 属性，应该映射到正确的 UI 组件：text → Input，number → InputNumber，date → DatePicker，select → Select。

**Validates: Requirements 4.2**

### Property 8: 默认值处理正确性

*For any* 有默认值的 FormFieldConfig，动态表单的初始值应该等于该默认值。

**Validates: Requirements 4.4**

### Property 9: 必填字段验证

*For any* 表单数据，如果缺少任何 required 为 true 的发起方字段，验证应该失败并返回错误信息。

**Validates: Requirements 5.1, 5.5**

### Property 10: API 参数转换正确性

*For any* formData 和 initiatorFields 配置，buildFormFieldsForDocument 的输出应该只包含发起方字段，且格式符合腾讯电子签 CreateDocument API 的 FormFields 参数要求。

**Validates: Requirements 5.3, 5.4**

### Property 11: 配置合并正确性

*For any* 已有字段配置和新获取的模板字段，合并后应该保留已有配置的自定义属性（label、filler、required 等），同时添加新字段。

**Validates: Requirements 6.5**

## Error Handling

### 1. 模板 API 错误处理

| 错误场景 | 错误码 | 用户提示 | 处理方式 |
|---------|-------|---------|---------|
| 模板不存在 | TEMPLATE_NOT_FOUND | "模板不存在，请检查模板ID是否正确" | 显示错误提示，不清空已有配置 |
| 无权限访问 | ACCESS_DENIED | "无权限访问该模板，请联系管理员" | 显示错误提示 |
| API 调用超时 | TIMEOUT | "获取模板信息超时，请稍后重试" | 提供重试按钮 |
| 网络错误 | NETWORK_ERROR | "网络连接失败，请检查网络后重试" | 提供重试按钮 |

### 2. 字段配置验证错误

| 错误场景 | 验证规则 | 用户提示 |
|---------|---------|---------|
| 缺少必要属性 | name、label、type、filler 必填 | "字段 {name} 配置不完整" |
| select 无选项 | type=select 时 options 必须非空 | "下拉字段 {label} 必须配置选项" |
| 无效的字段类型 | type 必须是 text/number/date/select | "字段 {label} 的类型无效" |
| 无效的填写方 | filler 必须是 INITIATOR/SIGNER | "字段 {label} 的填写方配置无效" |

### 3. 表单提交验证错误

| 错误场景 | 验证规则 | 用户提示 |
|---------|---------|---------|
| 必填字段为空 | required=true 的字段不能为空 | "请填写 {label}" |
| 数字格式错误 | type=number 的字段必须是有效数字 | "{label} 必须是数字" |
| 日期格式错误 | type=date 的字段必须是有效日期 | "{label} 日期格式不正确" |

### 4. 错误恢复策略

```typescript
// 错误处理示例
try {
  const fields = await getTemplateFields(templateId);
  // 成功处理
} catch (error) {
  if (error.code === 'TEMPLATE_NOT_FOUND') {
    // 显示友好提示，保留已有配置
    message.error('模板不存在，请检查模板ID是否正确');
  } else if (error.code === 'TIMEOUT') {
    // 提供重试选项
    message.error('获取超时，请点击重试');
  } else {
    // 通用错误处理
    message.error('获取模板信息失败：' + error.message);
  }
}
```

## Testing Strategy

### 测试方法

本功能采用双重测试策略：

1. **单元测试 (Unit Tests)**：验证具体示例和边界情况
2. **属性测试 (Property-Based Tests)**：验证所有输入的通用属性

两种测试互补，共同提供全面的覆盖。

### 属性测试配置

- **测试框架**：Jest 30 + fast-check
- **每个属性测试最少运行 100 次迭代**
- **每个属性测试必须引用设计文档中的属性编号**
- **标签格式**：`Feature: dynamic-contract-form, Property {number}: {property_text}`

### 测试文件结构

```
__tests__/
└── properties/
    └── form-field-config.property.test.ts  // 字段配置属性测试
```

### 属性测试实现示例

```typescript
// __tests__/properties/form-field-config.property.test.ts

import * as fc from 'fast-check';
import { 
  filterFillableComponents,
  getInitiatorFields,
  validateFormFieldsConfig,
  buildFormFieldsForDocument
} from '@/services/product.service';

// 生成器：有效的字段配置
const formFieldConfigArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  label: fc.string({ minLength: 1, maxLength: 100 }),
  type: fc.constantFrom('text', 'number', 'date', 'select'),
  filler: fc.constantFrom('INITIATOR', 'SIGNER'),
  required: fc.boolean(),
  defaultValue: fc.option(fc.string()),
  placeholder: fc.option(fc.string()),
}).chain(config => {
  // select 类型必须有 options
  if (config.type === 'select') {
    return fc.record({
      ...config,
      options: fc.array(
        fc.record({ label: fc.string(), value: fc.string() }),
        { minLength: 1, maxLength: 10 }
      )
    });
  }
  return fc.constant(config);
});

describe('FormFieldConfig Properties', () => {
  // Feature: dynamic-contract-form, Property 2: 字段分类正确性
  test('Property 2: 字段分类正确性 - 发起方字段出现在 initiatorFields', () => {
    fc.assert(
      fc.property(
        fc.array(formFieldConfigArb, { minLength: 1, maxLength: 20 }),
        (fields) => {
          const initiatorFields = getInitiatorFields({ formFields: { initiatorFields: fields.filter(f => f.filler === 'INITIATOR'), signerFields: fields.filter(f => f.filler === 'SIGNER') } });
          
          // 所有返回的字段都应该是 INITIATOR
          return initiatorFields.every(f => f.filler === 'INITIATOR');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: dynamic-contract-form, Property 4: 配置序列化 Round-Trip
  test('Property 4: 配置 round-trip - 序列化后反序列化得到相同配置', () => {
    fc.assert(
      fc.property(
        fc.array(formFieldConfigArb, { minLength: 0, maxLength: 10 }),
        fc.array(formFieldConfigArb, { minLength: 0, maxLength: 10 }),
        (initiatorFields, signerFields) => {
          const original = { initiatorFields, signerFields };
          const serialized = JSON.stringify(original);
          const deserialized = JSON.parse(serialized);
          
          return JSON.stringify(deserialized) === serialized;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: dynamic-contract-form, Property 9: 必填字段验证
  test('Property 9: 必填字段验证 - 缺少必填字段应验证失败', () => {
    fc.assert(
      fc.property(
        fc.array(formFieldConfigArb.filter(f => f.required), { minLength: 1, maxLength: 5 }),
        (requiredFields) => {
          // 创建缺少第一个必填字段的表单数据
          const formData: Record<string, unknown> = {};
          requiredFields.slice(1).forEach(f => {
            formData[f.name] = 'test value';
          });
          
          const result = validateFormData(formData, requiredFields);
          return !result.valid && result.errors.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 单元测试覆盖

| 测试类别 | 测试内容 |
|---------|---------|
| 控件过滤 | 验证签署控件被正确过滤 |
| 字段分类 | 验证 INITIATOR/SIGNER 分类正确 |
| 配置验证 | 验证各种无效配置被拒绝 |
| 类型映射 | 验证字段类型到组件的映射 |
| API 转换 | 验证 formData 到 FormFields 的转换 |
| 错误处理 | 验证各种错误场景的处理 |
