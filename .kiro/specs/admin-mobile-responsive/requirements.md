# Requirements Document

## Introduction

本文档定义了管理后台面板（Dashboard）移动端响应式优化的需求。目标是让管理员能够在手机和平板设备上流畅地使用管理后台的所有功能，包括签约管理、用户管理、产品管理、城市管理等核心功能。

## Glossary

- **Dashboard**: 管理后台面板，包含首页、签约管理、用户管理、产品管理、城市管理等页面
- **Responsive_Layout**: 响应式布局，能够根据屏幕尺寸自动调整界面元素的布局方式
- **Mobile_Breakpoint**: 移动端断点，当前设置为 768px，小于此宽度视为移动设备
- **Tablet_Breakpoint**: 平板断点，768px 到 1024px 之间的屏幕宽度
- **Drawer_Navigation**: 抽屉式导航，在移动端通过滑出式面板显示导航菜单
- **Touch_Target**: 触摸目标，移动端可点击元素的最小尺寸，建议至少 44x44 像素
- **Sider**: Ant Design 的侧边栏组件，用于显示导航菜单
- **Header**: 顶部导航栏，包含折叠按钮、用户信息等
- **Content**: 内容区域，显示各页面的主要内容

## Requirements

### Requirement 1: 响应式侧边栏导航

**User Story:** As a 管理员, I want 在移动端使用抽屉式导航菜单, so that 我可以在小屏幕上方便地访问各个功能模块。

#### Acceptance Criteria

1. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE Dashboard SHALL 隐藏固定侧边栏并显示汉堡菜单按钮
2. WHEN 用户点击汉堡菜单按钮, THE Dashboard SHALL 从左侧滑出 Drawer_Navigation 显示完整导航菜单
3. WHEN 用户在 Drawer_Navigation 中点击菜单项, THE Dashboard SHALL 关闭抽屉并导航到对应页面
4. WHEN 用户点击抽屉外部区域或关闭按钮, THE Dashboard SHALL 关闭 Drawer_Navigation
5. WHILE 屏幕宽度大于等于 Mobile_Breakpoint, THE Dashboard SHALL 显示固定侧边栏导航

### Requirement 2: 响应式顶部导航栏

**User Story:** As a 管理员, I want 在移动端看到简洁的顶部导航栏, so that 我可以快速访问用户菜单和核心操作。

#### Acceptance Criteria

1. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE Header SHALL 调整内边距为更紧凑的布局
2. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE Header SHALL 隐藏城市标签文字只显示图标
3. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE Header SHALL 隐藏用户名只显示头像
4. THE Header 中所有可点击元素 SHALL 满足最小 Touch_Target 尺寸要求

### Requirement 3: 响应式内容区域

**User Story:** As a 管理员, I want 内容区域能够自适应屏幕宽度, so that 我可以在任何设备上舒适地查看和操作内容。

#### Acceptance Criteria

1. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE Content SHALL 减少外边距和内边距以最大化可用空间
2. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE Content SHALL 使用全宽布局而非固定宽度
3. THE Content SHALL 确保所有卡片和表单在移动端正确换行显示

### Requirement 4: 响应式数据表格

**User Story:** As a 管理员, I want 在移动端能够查看和操作数据表格, so that 我可以管理合同、用户、产品和城市数据。

#### Acceptance Criteria

1. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE Table SHALL 启用水平滚动以显示所有列
2. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE Table SHALL 固定操作列在右侧便于访问
3. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE Table SHALL 调整列宽以优化移动端显示
4. WHEN 屏幕宽度小于 Tablet_Breakpoint, THE Table SHALL 隐藏次要列（如创建时间、更新时间）
5. THE Table 分页控件 SHALL 在移动端使用简化布局

### Requirement 5: 响应式筛选区域

**User Story:** As a 管理员, I want 在移动端方便地使用筛选功能, so that 我可以快速找到需要的数据。

#### Acceptance Criteria

1. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE 筛选区域 SHALL 使用垂直堆叠布局
2. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE 搜索框 SHALL 占满整行宽度
3. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE 日期选择器 SHALL 占满整行宽度
4. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE 筛选按钮 SHALL 使用图标按钮节省空间

### Requirement 6: 响应式页面标题区域

**User Story:** As a 管理员, I want 页面标题和操作按钮在移动端合理布局, so that 我可以清晰地看到当前页面并快速执行操作。

#### Acceptance Criteria

1. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE 页面标题区域 SHALL 使用垂直堆叠布局
2. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE 操作按钮 SHALL 显示在标题下方并占满整行
3. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE 页面描述文字 SHALL 使用更小的字号

### Requirement 7: 响应式弹窗和表单

**User Story:** As a 管理员, I want 弹窗和表单在移动端正确显示, so that 我可以在手机上完成新增和编辑操作。

#### Acceptance Criteria

1. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE Modal SHALL 使用接近全屏的宽度
2. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE Modal SHALL 从底部滑入而非居中弹出
3. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE Form 表单项 SHALL 使用垂直布局
4. THE Form 中所有输入控件 SHALL 满足最小 Touch_Target 尺寸要求

### Requirement 8: 响应式首页仪表盘

**User Story:** As a 管理员, I want 首页仪表盘在移动端清晰展示关键数据, so that 我可以快速了解业务概况。

#### Acceptance Criteria

1. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE 统计卡片 SHALL 使用两列布局
2. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE 快捷操作卡片 SHALL 使用两列布局
3. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE 日期范围选择器 SHALL 占满整行
4. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE 欢迎卡片 SHALL 调整内边距和字号

### Requirement 9: 响应式发起签约流程

**User Story:** As a 管理员, I want 在移动端顺畅地完成发起签约流程, so that 我可以随时随地发起新合同。

#### Acceptance Criteria

1. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE Steps 步骤条 SHALL 使用垂直布局或简化显示
2. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE 产品选择卡片 SHALL 使用单列布局
3. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE 签署链接展示区域 SHALL 优化二维码和按钮布局
4. WHEN 屏幕宽度小于 Mobile_Breakpoint, THE 确认信息卡片 SHALL 使用紧凑布局

### Requirement 10: 触摸交互优化

**User Story:** As a 管理员, I want 所有交互元素都适合触摸操作, so that 我可以在触摸屏设备上准确操作。

#### Acceptance Criteria

1. THE Dashboard 中所有按钮 SHALL 满足最小 44x44 像素的 Touch_Target 尺寸
2. THE Dashboard 中所有链接 SHALL 有足够的点击区域和间距
3. WHEN 用户在移动端操作, THE Dashboard SHALL 避免使用 hover 状态作为唯一交互提示
4. THE Dashboard SHALL 支持常见的触摸手势（如滑动关闭抽屉）
