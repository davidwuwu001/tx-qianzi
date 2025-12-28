# Requirements Document

## Introduction

本功能实现动态合同表单配置系统，允许系统管理员为产品配置模板字段，区分"发起方填写"和"签署方填写"两类字段。普通用户在移动端发起签约时只需填写发起方字段，签署方字段由乙方在签署页面填写。

## Glossary

- **System**: 合同签约管理平台
- **Template_API**: 腾讯电子签的 DescribeFlowTemplates 接口
- **FormField_Config**: 表单字段配置，包含字段属性和填写方分类
- **Initiator_Field**: 发起方字段，由普通用户在发起签约时填写
- **Signer_Field**: 签署方字段，由乙方在签署页面填写
- **Dynamic_Form**: 根据产品配置动态生成的表单组件

## Requirements

### Requirement 1: 获取模板填写控件

**User Story:** As a 系统管理员, I want to 从腾讯电子签自动获取模板的填写控件列表, so that 我可以基于实际模板配置字段。

#### Acceptance Criteria

1. WHEN 系统管理员输入模板ID并点击"获取字段配置" THEN THE System SHALL 调用 Template_API 获取模板的 Components 列表
2. WHEN 获取到 Components 列表 THEN THE System SHALL 过滤出填写控件（排除签署控件如签名、印章、日期）
3. WHEN 显示控件列表 THEN THE System SHALL 展示控件名称、控件类型、是否必填等原始信息
4. IF 模板不存在或无权限访问 THEN THE System SHALL 显示具体的错误信息和解决建议

### Requirement 2: 配置字段填写方分类

**User Story:** As a 系统管理员, I want to 为每个字段指定是"发起方填写"还是"签署方填写", so that 系统知道在哪个环节收集该字段的值。

#### Acceptance Criteria

1. THE System SHALL 为每个字段提供填写方选择：发起方(INITIATOR) 或 签署方(SIGNER)
2. WHEN 字段设置为发起方 THEN THE System SHALL 在移动端发起签约表单中显示该字段
3. WHEN 字段设置为签署方 THEN THE System SHALL 不在发起签约表单中显示，由乙方在签署页面填写
4. THE System SHALL 允许管理员为每个字段配置：显示名称、字段类型、是否必填、默认值、占位提示
5. WHEN 字段类型为下拉选择 THEN THE System SHALL 允许配置选项列表

### Requirement 3: 保存产品字段配置

**User Story:** As a 系统管理员, I want to 保存字段配置到产品, so that 配置可以在发起签约时使用。

#### Acceptance Criteria

1. WHEN 保存产品 THEN THE System SHALL 将所有字段配置以 JSON 格式存储到 Product.formFields 字段
2. THE System SHALL 在 formFields 中区分存储 initiatorFields（发起方字段）和 signerFields（签署方字段）
3. WHEN 编辑已有产品 THEN THE System SHALL 加载并显示已保存的字段配置
4. IF 字段配置格式错误 THEN THE System SHALL 显示验证错误信息

### Requirement 4: 移动端动态表单渲染

**User Story:** As a 普通用户, I want to 在移动端看到根据产品配置动态生成的发起方表单, so that 我只需要填写发起方需要的信息。

#### Acceptance Criteria

1. WHEN 普通用户在移动端选择产品 THEN THE System SHALL 只渲染 initiatorFields 配置的字段
2. WHEN 渲染表单字段 THEN THE System SHALL 根据字段类型显示对应的输入组件（Input、InputNumber、DatePicker、Select）
3. WHEN 字段配置为必填 THEN THE System SHALL 在字段标签旁显示红色星号并进行必填验证
4. WHEN 字段配置有默认值 THEN THE System SHALL 预填充该默认值
5. WHEN 字段类型为下拉选择 THEN THE System SHALL 根据配置的选项列表渲染 Select 组件

### Requirement 5: 合同发起流程集成

**User Story:** As a 普通用户, I want to 提交表单后系统正确处理发起方字段数据, so that 签约流程能够顺利完成。

#### Acceptance Criteria

1. WHEN 普通用户提交签约表单 THEN THE System SHALL 验证所有必填的发起方字段
2. WHEN 创建合同记录 THEN THE System SHALL 将发起方字段数据存储到 Contract.formData 字段
3. WHEN 调用腾讯电子签 CreateDocument API THEN THE System SHALL 将 formData 中的发起方字段转换为 FormFields 格式
4. THE System SHALL 不传递签署方字段到 CreateDocument，由乙方在签署时填写
5. IF 必填字段未填写 THEN THE System SHALL 显示验证错误，阻止提交

### Requirement 6: 字段配置编辑器

**User Story:** As a 系统管理员, I want to 通过可视化界面编辑字段配置, so that 我不需要手动编写 JSON。

#### Acceptance Criteria

1. THE System SHALL 提供表格形式的字段配置编辑器
2. WHEN 编辑字段 THEN THE System SHALL 支持修改：显示名称、字段类型、填写方、是否必填、默认值、占位提示
3. WHEN 字段类型为 select THEN THE System SHALL 显示选项编辑区域
4. THE System SHALL 支持拖拽调整字段顺序
5. THE System SHALL 提供"重新获取"按钮，从模板刷新字段列表（保留已有配置）
