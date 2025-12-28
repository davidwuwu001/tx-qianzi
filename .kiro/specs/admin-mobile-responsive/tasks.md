# Implementation Plan: 管理后台移动端响应式优化

## Overview

本实现计划将管理后台的移动端响应式优化分解为可执行的编码任务。采用渐进式实现策略，从核心布局组件开始，逐步扩展到各个页面的响应式适配。

## Tasks

- [x] 1. 创建响应式基础设施
  - [x] 1.1 添加全局响应式 CSS 样式
    - 在 `src/app/globals.css` 中添加移动端样式覆盖
    - 添加触摸设备优化样式
    - 添加响应式工具类（hide-on-mobile、mobile-full-width 等）
    - _Requirements: 3.1, 3.2, 10.1, 10.2_

  - [x] 1.2 创建 useResponsive Hook
    - 在 `src/hooks/useResponsive.ts` 中创建响应式状态管理 Hook
    - 实现 isMobile、isTablet、isDesktop 状态检测
    - 处理 SSR 环境的默认值
    - _Requirements: 1.1, 1.5_

  - [x] 1.3 编写 useResponsive Hook 属性测试
    - **Property 1: 响应式侧边栏可见性**
    - **Validates: Requirements 1.1, 1.5**

- [x] 2. 实现响应式布局组件
  - [x] 2.1 重构 Dashboard 布局组件
    - 修改 `src/app/(dashboard)/layout.tsx`
    - 实现移动端抽屉导航
    - 实现桌面端固定侧边栏
    - 添加汉堡菜单按钮
    - 实现菜单点击自动关闭抽屉
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.2 实现响应式 Header
    - 调整移动端内边距
    - 隐藏城市标签文字（只显示图标）
    - 隐藏用户名（只显示头像）
    - 确保触摸目标尺寸
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.3 实现响应式 Content 区域
    - 调整移动端外边距和内边距
    - 实现全宽布局
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Checkpoint - 验证基础布局
  - 确保布局组件在移动端和桌面端正确显示
  - 测试抽屉导航的交互
  - 确保所有测试通过，如有问题请询问用户

- [x] 4. 实现响应式表格组件
  - [x] 4.1 创建响应式表格列配置工具函数
    - 在 `src/utils/responsive-table.ts` 中创建工具函数
    - 实现 `getResponsiveColumns` 函数
    - 实现 `getResponsivePagination` 函数
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.2 编写表格响应式配置属性测试
    - **Property 5: 表格响应式列配置**
    - **Validates: Requirements 4.2, 4.4, 4.5**

- [x] 5. 实现响应式筛选和标题组件
  - [x] 5.1 创建响应式筛选区域组件
    - 在 `src/components/common/ResponsiveFilter.tsx` 中创建组件
    - 实现垂直堆叠布局
    - 实现全宽输入框
    - 实现图标按钮
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 5.2 创建响应式页面标题组件
    - 在 `src/components/common/PageHeader.tsx` 中创建组件
    - 实现垂直堆叠布局
    - 实现全宽操作按钮
    - 调整描述文字字号
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 5.3 编写响应式布局属性测试
    - **Property 3: 移动端全宽元素**
    - **Property 4: 移动端垂直布局**
    - **Validates: Requirements 5.1, 5.2, 5.3, 6.1, 6.2**

- [x] 6. 实现响应式弹窗
  - [x] 6.1 创建响应式 Modal 配置工具
    - 在 `src/utils/responsive-modal.ts` 中创建工具函数
    - 实现 `getResponsiveModalProps` 函数
    - 实现接近全屏宽度
    - 实现底部滑入效果
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 6.2 编写响应式弹窗属性测试
    - **Property 7: 移动端弹窗布局**
    - **Validates: Requirements 7.1, 7.2**

- [x] 7. Checkpoint - 验证通用组件
  - 确保筛选区域、页面标题、弹窗在移动端正确显示
  - 确保所有测试通过，如有问题请询问用户

- [x] 8. 适配首页仪表盘
  - [x] 8.1 重构首页响应式布局
    - 修改 `src/app/(dashboard)/page.tsx`
    - 实现统计卡片两列布局
    - 实现快捷操作卡片两列布局
    - 调整日期选择器全宽
    - 调整欢迎卡片样式
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 8.2 编写首页响应式布局属性测试
    - **Property 8: 移动端卡片网格布局**
    - **Validates: Requirements 8.1, 8.2**

- [x] 9. 适配签约管理页面
  - [x] 9.1 重构签约列表页面
    - 修改 `src/app/(dashboard)/contracts/page.tsx`
    - 应用响应式表格配置
    - 应用响应式筛选区域
    - 应用响应式页面标题
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3_

  - [x] 9.2 重构发起签约页面
    - 修改 `src/app/(dashboard)/contracts/new/page.tsx`
    - 实现垂直步骤条
    - 实现单列产品卡片
    - 优化签署链接展示区域
    - 实现紧凑确认信息卡片
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 9.3 重构合同详情页面
    - 修改 `src/app/(dashboard)/contracts/[id]/page.tsx`
    - 应用响应式布局
    - _Requirements: 3.1, 3.2_

- [x] 10. 适配系统管理页面
  - [x] 10.1 重构用户管理页面
    - 修改 `src/app/(dashboard)/users/page.tsx`
    - 应用响应式表格配置
    - 应用响应式筛选区域
    - 应用响应式弹窗配置
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 7.1, 7.2, 7.3_

  - [x] 10.2 重构产品管理页面
    - 修改 `src/app/(dashboard)/products/page.tsx`
    - 应用响应式表格配置
    - 应用响应式筛选区域
    - 应用响应式弹窗配置
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 7.1, 7.2, 7.3_

  - [x] 10.3 重构城市管理页面
    - 修改 `src/app/(dashboard)/cities/page.tsx`
    - 应用响应式表格配置
    - 应用响应式筛选区域
    - 应用响应式弹窗配置
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 7.1, 7.2, 7.3_

- [x] 11. 触摸交互优化
  - [x] 11.1 优化触摸目标尺寸
    - 确保所有按钮最小 44x44 像素
    - 确保所有输入控件最小高度 44 像素
    - 确保链接有足够的点击区域
    - _Requirements: 10.1, 10.2_

  - [x] 11.2 编写触摸目标尺寸属性测试
    - **Property 2: 触摸目标尺寸合规性**
    - **Validates: Requirements 2.4, 7.4, 10.1, 10.2**

- [x] 12. Final Checkpoint - 完整验证
  - 在移动端设备或模拟器上测试所有页面
  - 验证所有响应式功能正常工作
  - 确保所有测试通过，如有问题请询问用户

## Notes

- 所有任务都是必须执行的，包括属性测试任务
- 每个任务都引用了具体的需求编号以便追溯
- Checkpoint 任务用于阶段性验证，确保增量开发的正确性
- 属性测试验证通用的正确性属性，确保响应式行为的一致性
