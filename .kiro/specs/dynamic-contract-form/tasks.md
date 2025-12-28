# Implementation Plan: 动态合同表单配置

## Overview

本实现计划将动态合同表单配置功能分解为可执行的编码任务。采用增量开发方式，每个任务都建立在前一个任务的基础上，确保代码始终可运行。

## Tasks

- [x] 1. 创建类型定义和基础结构
  - [x] 1.1 创建 FormFieldConfig 类型定义
    - 在 `src/types/form-field.ts` 中定义 FieldType、FieldFiller、SelectOption、FormFieldConfig、ProductFormFields 类型
    - 导出到 `src/types/index.ts`
    - _Requirements: 2.1, 2.4, 2.5_

  - [x] 1.2 编写字段配置结构属性测试
    - **Property 3: 字段配置结构完整性**
    - **Validates: Requirements 2.4, 2.5**

- [x] 2. 实现字段配置验证逻辑
  - [x] 2.1 实现 validateFormFieldsConfig 函数
    - 在 `src/services/product.service.ts` 中添加验证函数
    - 验证必要属性存在、类型正确、select 类型有 options
    - _Requirements: 3.4_

  - [x] 2.2 编写配置验证属性测试
    - **Property 6: 配置验证正确性**
    - **Validates: Requirements 3.4**

- [x] 3. 实现模板字段获取功能
  - [x] 3.1 扩展 esign.service.ts 添加获取模板详情方法
    - 调用腾讯电子签 DescribeFlowTemplates API
    - 返回模板的 Components 列表
    - _Requirements: 1.1_

  - [x] 3.2 实现控件过滤和转换逻辑
    - 在 `src/services/product.service.ts` 中添加 filterFillableComponents 函数
    - 过滤出填写控件（排除签署控件）
    - 实现 convertComponentsToFormFields 转换函数
    - _Requirements: 1.2, 1.3_

  - [x] 3.3 编写控件过滤属性测试
    - **Property 1: 控件过滤正确性**
    - **Validates: Requirements 1.2**

  - [x] 3.4 创建获取模板字段 API 路由
    - 创建 `src/app/api/templates/[templateId]/fields/route.ts`
    - 处理错误情况并返回友好提示
    - _Requirements: 1.1, 1.4_

- [x] 4. Checkpoint - 确保模板字段获取功能正常
  - 运行测试确保通过
  - 如有问题请向用户确认

- [x] 5. 实现字段分类和存储逻辑
  - [x] 5.1 实现 getInitiatorFields 函数
    - 从 Product.formFields 中提取发起方字段
    - _Requirements: 2.2, 2.3, 4.1_

  - [x] 5.2 实现字段分类存储逻辑
    - 根据 filler 属性将字段分类到 initiatorFields 和 signerFields
    - _Requirements: 3.2_

  - [x] 5.3 编写字段分类属性测试
    - **Property 2: 字段分类正确性**
    - **Property 5: 字段分类存储正确性**
    - **Validates: Requirements 2.2, 2.3, 3.2**

  - [x] 5.4 编写配置序列化 round-trip 属性测试
    - **Property 4: 配置序列化 Round-Trip**
    - **Validates: Requirements 3.1, 3.3**

- [x] 6. 实现字段配置编辑器组件
  - [x] 6.1 创建 FormFieldsEditor 组件
    - 创建 `src/components/product/FormFieldsEditor.tsx`
    - 表格形式展示字段列表
    - 支持编辑：显示名称、填写方、类型、必填、默认值
    - _Requirements: 6.1, 6.2_

  - [x] 6.2 实现 select 类型选项编辑
    - 当字段类型为 select 时显示选项编辑区域
    - _Requirements: 6.3_

  - [x] 6.3 实现字段配置合并逻辑
    - 重新获取模板字段时保留已有配置
    - _Requirements: 6.5_

  - [x] 6.4 编写配置合并属性测试
    - **Property 11: 配置合并正确性**
    - **Validates: Requirements 6.5**

- [x] 7. 集成字段配置到产品管理页面
  - [x] 7.1 修改产品管理页面
    - 在 `src/app/(dashboard)/products/page.tsx` 中集成 FormFieldsEditor
    - 添加"获取字段配置"按钮
    - _Requirements: 1.1, 6.1_

  - [x] 7.2 修改产品保存逻辑
    - 在 `src/app/(dashboard)/products/actions.ts` 中处理 formFields 保存
    - 修复类型定义，使用 ProductFormFields 替代 FormFieldConfig[]
    - _Requirements: 3.1_

- [x] 8. Checkpoint - 确保后台字段配置功能正常
  - 运行测试确保通过 ✓
  - 所有 94 个测试通过

- [x] 9. 实现移动端动态表单
  - [x] 9.1 创建 DynamicForm 组件
    - 创建 `src/components/contract/DynamicForm.tsx`
    - 根据字段配置动态渲染表单
    - 支持 text/number/date/select 四种类型
    - _Requirements: 4.1, 4.2, 4.5_

  - [x] 9.2 实现默认值处理
    - 有默认值的字段预填充
    - _Requirements: 4.4_

  - [x] 9.3 编写类型映射和默认值属性测试
    - **Property 7: 类型映射正确性**
    - **Property 8: 默认值处理正确性**
    - **Validates: Requirements 4.2, 4.4**

  - [x] 9.4 创建获取发起方字段 API
    - 创建 `src/app/api/products/[productId]/initiator-fields/route.ts`
    - 返回产品的发起方字段配置
    - _Requirements: 4.1_

- [x] 10. 实现表单验证和提交逻辑
  - [x] 10.1 实现表单数据验证
    - 验证必填字段
    - 验证字段类型
    - _Requirements: 5.1, 5.5_

  - [x] 10.2 编写必填字段验证属性测试
    - **Property 9: 必填字段验证**
    - **Validates: Requirements 5.1, 5.5**

  - [x] 10.3 实现 buildFormFieldsForDocument 函数
    - 将 formData 转换为腾讯电子签 API 的 FormFields 格式
    - 只包含发起方字段
    - _Requirements: 5.3, 5.4_

  - [x] 10.4 编写 API 参数转换属性测试
    - **Property 10: API 参数转换正确性**
    - **Validates: Requirements 5.3, 5.4**

- [x] 11. 集成动态表单到移动端签约页面
  - [x] 11.1 修改移动端发起签约页面
    - 在 `src/app/m/contracts/new/page.tsx` 中集成 DynamicForm
    - 选择产品后加载发起方字段
    - _Requirements: 4.1_

  - [x] 11.2 修改合同创建流程
    - 在 `src/services/contract-flow.service.ts` 中更新 buildFormFields 函数
    - 支持新的 ProductFormFields 结构，同时兼容旧格式
    - 将发起方字段数据存储到 Contract.formData
    - _Requirements: 5.2, 5.3_

- [x] 12. Final Checkpoint - 确保所有测试通过
  - 运行所有测试确保通过 ✓
  - 所有 109 个测试通过

## Notes

- 每个任务都引用了具体的需求条款，确保可追溯性
- Checkpoint 任务用于增量验证，确保功能正常
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界情况
- 所有测试任务都是必须完成的，确保代码质量
