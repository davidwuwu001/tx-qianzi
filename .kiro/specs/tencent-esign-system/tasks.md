# Implementation Plan: 腾讯电子签便捷签约系统

## Overview

本实现计划按照MVP优先的原则，分阶段实现系统功能。系统支持三级角色体系（系统管理员、城市管理员、普通用户）和双端设计（管理端、移动端）。

**MVP阶段聚焦于：**
1. 项目初始化与基础设施
2. 三级角色认证系统
3. 移动端界面开发
4. 普通用户签约流程
5. 管理员审批流程

**后续迭代：**
- 城市与产品管理
- 用户管理与权限
- 短信与通知
- 统计与安全

## Tasks

### Phase 1: MVP - 项目初始化与基础设施

- [x] 1. 项目初始化与基础配置
  - [x] 1.1 创建Next.js 14项目，配置TypeScript、Tailwind CSS、Ant Design
    - 使用 `create-next-app` 创建项目
    - 配置 `tailwind.config.ts` 和 `postcss.config.js`
    - 安装并配置 `antd` 和 `@ant-design/nextjs-registry`
    - _Requirements: 技术栈选型_

  - [x] 1.2 配置Prisma ORM和数据库连接
    - 安装 `prisma` 和 `@prisma/client`
    - 创建 `prisma/schema.prisma` 文件，定义所有数据模型
    - 配置 `.env` 文件中的 `DATABASE_URL`
    - 运行 `prisma generate` 和 `prisma db push`
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 1.3 创建项目目录结构和基础工具函数
    - 创建 `src/lib/` 目录，添加 `prisma.ts`（数据库客户端单例）
    - 创建 `src/services/` 目录结构
    - 创建 `src/types/` 目录，定义TypeScript类型
    - 创建 `src/utils/` 目录，添加通用工具函数
    - _Requirements: 项目结构_

  - [x]* 1.4 配置Jest和fast-check测试框架
    - 安装 `jest`, `@types/jest`, `ts-jest`, `fast-check`
    - 创建 `jest.config.js` 和 `jest.setup.ts`
    - 创建测试目录结构 `__tests__/`
    - _Requirements: 测试策略_

- [x] 2. Checkpoint - 确保项目初始化完成
  - 确保所有依赖安装成功
  - 确保Prisma能连接数据库
  - 确保开发服务器能正常启动

### Phase 2: MVP - 用户认证模块

- [x] 3. 实现用户认证服务
  - [x] 3.1 实现密码加密和验证工具函数
    - 创建 `src/lib/password.ts`
    - 实现 `hashPassword(password: string): Promise<string>`
    - 实现 `verifyPassword(password: string, hash: string): Promise<boolean>`
    - 使用bcrypt库，配置salt rounds为10
    - _Requirements: 12.1, 14.8_

  - [x]* 3.2 编写密码加密属性测试
    - **Property 14: Password Encryption Round-Trip**
    - **Validates: Requirements 12.1**

  - [x] 3.3 实现验证码生成和验证服务
    - 创建 `src/services/verification.service.ts`
    - 实现 `generateCode(phone: string): Promise<string>` - 生成6位数字验证码
    - 实现 `verifyCode(phone: string, code: string): Promise<boolean>`
    - 实现验证码5分钟过期逻辑
    - 实现3次错误锁定5分钟逻辑
    - _Requirements: 1.3, 1.6_

  - [ ]* 3.4 编写验证码往返属性测试
    - **Property 2: Verification Code Round-Trip**
    - **Validates: Requirements 1.3, 1.4**

  - [x] 3.5 配置NextAuth.js认证
    - 安装 `next-auth`
    - 创建 `src/app/api/auth/[...nextauth]/route.ts`
    - 配置Credentials Provider支持用户名密码登录
    - 配置JWT策略和session回调
    - _Requirements: 1.2, 1.7_

  - [x] 3.6 实现认证服务层
    - 创建 `src/services/auth.service.ts`
    - 实现 `loginWithPassword(username, password): Promise<AuthResult>`
    - 实现 `loginWithCode(phone, code): Promise<AuthResult>`
    - 实现 `validateSession(token): Promise<User | null>`
    - _Requirements: 1.2, 1.4_

  - [ ]* 3.7 编写认证正确性属性测试
    - **Property 1: Authentication Correctness**
    - **Validates: Requirements 1.2, 1.4, 1.5**

- [x] 4. 实现登录页面
  - [x] 4.1 创建登录页面UI
    - 创建 `src/app/(auth)/login/page.tsx`
    - 实现用户名密码登录表单
    - 实现手机验证码登录表单（Tab切换）
    - 使用Ant Design Form组件
    - _Requirements: 1.1_

  - [x] 4.2 实现登录表单提交逻辑
    - 创建 `src/app/(auth)/login/actions.ts` Server Actions
    - 实现 `loginWithPasswordAction` 
    - 实现 `sendVerificationCodeAction`
    - 实现 `loginWithCodeAction`
    - 处理错误显示和重定向
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [x] 4.3 实现认证中间件和路由保护
    - 创建 `src/middleware.ts`
    - 保护 `/dashboard/*` 路由，未登录重定向到登录页
    - 已登录用户访问登录页重定向到仪表盘
    - _Requirements: 1.8_

- [x] 5. Checkpoint - 确保认证模块完成
  - 确保能使用用户名密码登录
  - 确保能使用手机验证码登录（模拟）
  - 确保路由保护正常工作
  - 确保所有测试通过

### Phase 2.5: MVP - 数据库更新与普通用户角色

- [x] 5.1 更新数据库模型支持普通用户
  - [x] 5.1.1 更新Prisma Schema
    - 修改 `prisma/schema.prisma` 中的User模型
    - 添加 `ORDINARY_USER` 角色到Role枚举
    - 将username和password字段设为可选（普通用户仅验证码登录）
    - 更新默认角色为 `ORDINARY_USER`
    - _Requirements: 2.3, 8.10_

  - [x] 5.1.2 执行数据库迁移
    - 运行 `prisma db push` 更新数据库结构
    - 更新现有用户数据（如需要）
    - 验证数据库更新成功
    - _Requirements: 数据库更新_

- [x] 5.2 创建普通用户
  - [x] 5.2.1 创建普通用户脚本
    - 创建 `scripts/create-ordinary-user.mjs`
    - 实现创建手机号为18210443249的普通用户
    - 设置用户名为空，仅支持验证码登录
    - 分配到北京城市
    - _Requirements: 2.2, 2.3_

  - [x] 5.2.2 更新用户服务支持普通用户
    - 修改 `src/services/user.service.ts`
    - 支持创建无用户名的普通用户
    - 支持普通用户仅验证码登录
    - _Requirements: 2.2, 8.3_

- [x] 5.3 Checkpoint - 确保数据库和用户创建完成
  - 确保数据库模型更新成功
  - 确保普通用户创建成功
  - 确保普通用户可以验证码登录

### Phase 2.6: MVP - 移动端界面开发

- [x] 5.4 实现移动端路由结构
  - [x] 5.4.1 创建移动端路由
    - 创建 `src/app/(mobile)/` 目录结构
    - 创建移动端布局 `src/app/(mobile)/layout.tsx`
    - 实现底部导航栏（首页、签约、发起、个人）
    - _Requirements: 15.1, 15.2_

  - [x] 5.4.2 创建移动端登录页面
    - 创建 `src/app/(auth)/m/login/page.tsx`
    - 实现移动端优化的验证码登录表单
    - 使用移动端友好的输入组件
    - 支持自动登录（记住登录状态）
    - _Requirements: 2.1, 2.2, 2.9, 15.3_

  - [x] 5.4.3 实现移动端首页
    - 创建 `src/app/(mobile)/page.tsx`
    - 显示合同概览统计
    - 提供快捷操作入口
    - 使用卡片式布局
    - _Requirements: 15.4, 15.6_

- [x] 5.5 实现移动端签约功能
  - [x] 5.5.1 创建移动端发起签约页面
    - 创建 `src/app/(mobile)/contracts/new/page.tsx`
    - 实现移动端优化的产品选择
    - 实现移动端优化的乙方信息表单
    - 使用步骤式表单设计
    - _Requirements: 3.1, 3.2, 15.3, 15.4_

  - [x] 5.5.2 实现移动端签约列表
    - 创建 `src/app/(mobile)/contracts/page.tsx`
    - 实现卡片式合同列表
    - 支持下拉刷新和上拉加载
    - 实现快速筛选标签
    - _Requirements: 5.1, 5.2, 15.4, 15.5_

  - [x] 5.5.3 实现移动端签约详情
    - 创建 `src/app/(mobile)/contracts/[id]/page.tsx`
    - 实现移动端优化的详情展示
    - 使用折叠式布局节省空间
    - 实现移动端分享功能
    - _Requirements: 5.5, 5.6, 15.6, 15.9_

- [x] 5.6 实现移动端个人中心
  - [x] 5.6.1 创建个人中心页面
    - 创建 `src/app/(mobile)/profile/page.tsx`
    - 显示用户基本信息
    - 提供退出登录功能
    - 实现设置选项
    - _Requirements: 2.8_

- [x] 5.7 Checkpoint - 确保移动端基础功能完成
  - 确保移动端登录正常工作
  - 确保移动端界面响应式适配
  - 确保普通用户可以发起签约
  - 确保移动端分享功能正常

### Phase 3: MVP - 合同状态管理核心

- [x] 6. 实现合同状态机
  - [x] 6.1 创建合同状态枚举和转换函数
    - 创建 `src/lib/contract-status.ts`
    - 定义 `ContractStatus` 枚举
    - 实现 `isValidTransition(from, to): boolean`
    - 实现 `getNextValidStatuses(current): ContractStatus[]`
    - 实现 `getStatusLabel(status): string` 中文标签
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x]* 6.2 编写状态机属性测试
    - **Property 4: Contract Status State Machine**
    - **Validates: Requirements 5.1-5.8**

  - [x] 6.3 实现合同服务层基础方法
    - 创建 `src/services/contract.service.ts`
    - 实现 `createDraft(data): Promise<Contract>`
    - 实现 `updateStatus(id, status, operatorId): Promise<Contract>`
    - 实现状态变更日志记录
    - _Requirements: 2.13, 5.9_

  - [ ]* 6.4 编写审计日志属性测试
    - **Property 13: Audit Log Completeness**
    - **Validates: Requirements 5.9**

- [x] 7. 实现输入验证
  - [x] 7.1 创建乙方信息验证函数
    - 创建 `src/lib/validators.ts`
    - 实现 `validatePartyBName(name): ValidationResult`
    - 实现 `validatePhone(phone): ValidationResult`
    - 实现 `validateIdCard(idCard): ValidationResult`
    - 实现 `validatePartyBInfo(info): ValidationResult`
    - _Requirements: 2.3, 2.4_

  - [x]* 7.2 编写输入验证属性测试
    - **Property 6: Input Validation Consistency**
    - **Validates: Requirements 2.3, 2.4**

- [x] 8. Checkpoint - 确保核心逻辑完成
  - 确保状态机转换逻辑正确
  - 确保输入验证逻辑正确
  - 确保所有属性测试通过

### Phase 4: MVP - 腾讯电子签API集成

- [x] 9. 实现腾讯云API签名
  - [x] 9.1 创建腾讯云API签名工具
    - 创建 `src/lib/tencent-cloud-sign.ts`
    - 实现TC3-HMAC-SHA256签名算法
    - 实现 `signRequest(params): SignedRequest`
    - 配置环境变量读取SecretId和SecretKey
    - _Requirements: 9.1, 9.2_

  - [x]* 9.2 编写API签名属性测试
    - **Property 15: API Request Signature Correctness**
    - **Validates: Requirements 9.2**

  - [x] 9.3 创建腾讯电子签API客户端
    - 创建 `src/services/esign.service.ts`
    - 实现基础HTTP请求封装
    - 实现错误处理和重试逻辑
    - 实现请求频率限制（20次/秒）
    - _Requirements: 9.3, 9.4, 9.5_

- [x] 10. 实现电子签核心API调用
  - [x] 10.1 实现CreateFlow接口
    - 实现 `createFlow(params): Promise<CreateFlowResult>`
    - 构建签署方信息（乙方个人签署 + 甲方企业自动签署）
    - 处理API响应和错误
    - _Requirements: 2.5_

  - [x] 10.2 实现CreateDocument接口
    - 实现 `createDocument(params): Promise<CreateDocumentResult>`
    - 支持FormFields表单字段填充
    - 关联FlowId和TemplateId
    - _Requirements: 2.6_

  - [x] 10.3 实现StartFlow接口
    - 实现 `startFlow(flowId): Promise<StartFlowResult>`
    - 发起签署流程
    - _Requirements: 2.7_

  - [x] 10.4 实现CreateFlowSignUrl接口
    - 实现 `createFlowSignUrl(params): Promise<SignUrlResult>`
    - 生成乙方H5签署链接
    - 支持JumpUrl配置签署完成跳转
    - _Requirements: 2.8_

  - [x] 10.5 实现合同发起流程编排
    - 创建 `src/services/contract-flow.service.ts`
    - 实现 `initiateContract(contractId): Promise<Contract>`
    - 按顺序调用: CreateFlow → CreateDocument → StartFlow → CreateFlowSignUrl
    - 实现事务性：任一步骤失败则回滚状态
    - _Requirements: 2.5, 2.6, 2.7, 2.8, 2.12_

  - [x] 10.6 编写合同发起流程属性测试

    - **Property 7: Contract Initiation Flow Integrity**
    - **Validates: Requirements 2.5, 2.6, 2.7, 2.8, 2.12**

- [x] 11. Checkpoint - 确保API集成完成
  - 确保能成功调用腾讯电子签API（使用测试环境）
  - 确保签名算法正确
  - 确保所有测试通过

### Phase 5: MVP - 发起签约页面

- [x] 12. 实现后台布局
  - [x] 12.1 创建后台布局组件
    - 创建 `src/app/(dashboard)/layout.tsx`
    - 实现侧边栏导航（签约管理、发起签约）
    - 实现顶部栏（用户信息、退出登录）
    - 使用Ant Design Layout组件
    - _Requirements: UI布局_

  - [x] 12.2 创建仪表盘首页
    - 创建 `src/app/(dashboard)/page.tsx`
    - 显示欢迎信息和快捷操作入口
    - MVP阶段简单展示，后续迭代添加统计
    - _Requirements: UI布局_

- [x] 13. 实现发起签约页面
  - [x] 13.1 创建产品选择组件
    - 创建 `src/components/contract/ProductSelect.tsx`
    - 从数据库加载可用产品列表
    - 选择产品后显示模板信息
    - _Requirements: 2.1, 2.2_

  - [x] 13.2 创建乙方信息表单组件
    - 创建 `src/components/contract/PartyBForm.tsx`
    - 实现姓名、手机号、身份证号输入
    - 实现实时验证和错误提示
    - _Requirements: 2.3, 2.4_

  - [x] 13.3 创建发起签约页面
    - 创建 `src/app/(dashboard)/contracts/new/page.tsx`
    - 组合ProductSelect和PartyBForm组件
    - 实现表单提交Server Action
    - 实现签署链接展示（复制链接、二维码、发送短信按钮）
    - _Requirements: 2.1, 2.9, 2.10, 2.11_

  - [x] 13.4 实现签署链接展示组件
    - 创建 `src/components/contract/SignLinkDisplay.tsx`
    - 实现复制链接功能
    - 实现二维码生成（使用qrcode库）
    - 实现发送短信按钮（MVP阶段模拟）
    - _Requirements: 2.9, 2.10_

- [x] 14. Checkpoint - 确保发起签约功能完成
  - 确保能选择产品并填写乙方信息
  - 确保能成功发起签约并获取签署链接
  - 确保签署链接能正确显示和复制

### Phase 6: MVP - 签约管理页面

- [x] 15. 实现合同列表服务
  - [x] 15.1 实现合同查询服务
    - 扩展 `src/services/contract.service.ts`
    - 实现 `getContracts(filters): Promise<PaginatedContracts>`
    - 支持状态筛选、搜索、日期范围、分页
    - 实现城市数据隔离（City_Admin只能查看本城市）
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 15.2 编写数据隔离属性测试
    - **Property 5: City-Based Data Isolation**
    - **Validates: Requirements 3.1, 8.7**

  - [ ]* 15.3 编写过滤器属性测试
    - **Property 9: Status Filter Correctness**
    - **Property 10: Search Result Correctness**
    - **Property 11: Date Range Filter Correctness**
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [x] 16. 实现签约管理列表页面
  - [x] 16.1 创建合同列表页面
    - 创建 `src/app/(dashboard)/contracts/page.tsx`
    - 实现状态Tab筛选（全部、草稿、待乙方签署、待甲方签署、已完成、已拒签、已过期）
    - 实现搜索框（乙方姓名/手机号）
    - 实现日期范围选择器
    - 使用Ant Design Table组件展示列表
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 16.2 创建合同详情页面
    - 创建 `src/app/(dashboard)/contracts/[id]/page.tsx`
    - 显示合同基本信息、乙方信息、产品信息
    - 显示签署时间线（状态变更历史）
    - 待乙方签署状态显示"重新生成链接"按钮
    - 待甲方签署状态显示"审批通过"/"审批拒绝"按钮
    - _Requirements: 3.6, 3.7, 4.2, 4.3_

  - [x] 16.3 实现重新生成签署链接功能
    - 创建Server Action处理链接重新生成
    - 调用CreateFlowSignUrl API
    - 更新数据库中的signUrl和signUrlExpireAt
    - _Requirements: 3.7_

- [x] 17. 实现审批功能
  - [x] 17.1 实现审批服务
    - 扩展 `src/services/contract.service.ts`
    - 实现 `approveContract(id, approved, reason?): Promise<Contract>`
    - 审批通过时调用腾讯电子签自动签署API
    - 更新合同状态并记录审批信息
    - _Requirements: 4.4, 4.5, 4.6_

  - [x] 17.2 实现审批UI交互
    - 在合同详情页添加审批按钮
    - 实现审批确认弹窗
    - 拒绝时要求输入拒绝原因
    - _Requirements: 4.4, 4.6_

- [x] 18. Checkpoint - 确保签约管理功能完成
  - 确保合同列表正确显示和筛选
  - 确保合同详情正确显示
  - 确保重新生成链接功能正常
  - 确保审批功能正常
  - 确保所有测试通过

### Phase 7: MVP - 回调与状态同步

- [x] 19. 实现回调处理
  - [x] 19.1 创建回调接口
    - 创建 `src/app/api/callback/esign/route.ts`
    - 实现回调签名验证
    - 解析回调数据并更新合同状态
    - 记录回调日志
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 19.2 编写回调处理属性测试
    - **Property 12: Callback Processing Correctness**
    - **Validates: Requirements 3.8, 10.3, 10.4, 10.5**

- [x] 20. 实现定时状态同步
  - [x] 20.1 创建状态同步接口
    - 创建 `src/app/api/cron/sync-status/route.ts`
    - 查询所有待处理状态的合同
    - 调用腾讯电子签API查询最新状态
    - 更新本地数据库状态
    - _Requirements: 3.9, 10.6_

- [x] 21. MVP最终检查点
  - 确保完整的签约流程可以走通
  - 确保回调能正确更新状态
  - 确保所有属性测试通过
  - 确保基本的错误处理正常

### Phase 8: 后续迭代 - 城市与产品管理

- [x] 22. 实现城市管理
  - [x] 22.1 创建城市管理服务
    - 创建 `src/services/city.service.ts`
    - 实现CRUD操作
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 22.2 创建城市管理页面
    - 创建 `src/app/(dashboard)/cities/page.tsx`
    - 实现城市列表、新增、编辑、禁用功能
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 23. 实现产品管理
  - [x] 23.1 创建产品管理服务
    - 创建 `src/services/product.service.ts`
    - 实现CRUD操作
    - 实现模板ID验证
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 23.2 创建产品管理页面
    - 创建 `src/app/(dashboard)/products/page.tsx`
    - 实现产品列表、新增、编辑、禁用功能
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

### Phase 9: 后续迭代 - 用户管理与权限

- [x] 24. 实现用户管理
  - [x] 24.1 创建用户管理服务
    - 创建 `src/services/user.service.ts`
    - 实现CRUD操作
    - 实现密码重置
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 24.2 创建用户管理页面
    - 创建 `src/app/(dashboard)/users/page.tsx`
    - 实现用户列表、新增、编辑、禁用功能
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 25. 实现角色权限控制
  - [x] 25.1 实现RBAC中间件
    - 扩展 `src/middleware.ts`
    - 根据用户角色限制页面访问
    - 添加对移动端路由的保护
    - 普通用户只能访问 `/m/*` 路由
    - 管理员只能访问 `/dashboard/*` 路由
    - _Requirements: 14.6, 14.7, 15.2_

  - [x]* 25.2 编写RBAC属性测试
    - **Property 16: Role-Based Access Control**
    - **Validates: Requirements 14.6, 14.7**

  - [ ] 25.3 更新认证服务支持普通用户
    - 修改NextAuth配置支持普通用户验证码登录
    - 更新session回调处理普通用户角色
    - 实现基于角色的重定向逻辑
    - _Requirements: 2.2, 2.3, 2.8_

  - [ ] 25.4 实现数据访问控制
    - 更新合同服务，普通用户只能查看自己创建的合同
    - 城市管理员只能查看本城市合同
    - 系统管理员可以查看所有合同
    - _Requirements: 5.9, 8.7, 8.9_

### Phase 10: 后续迭代 - 短信与通知

- [x] 26. 实现短信服务
  - [x] 26.1 创建短信服务
    - 创建 `src/services/sms.service.ts`
    - 优先使用腾讯电子签内置短信
    - 备用腾讯云短信服务
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 26.2 集成短信发送到签约流程
    - 在发起签约时支持发送短信
    - 在审批完成时发送通知
    - _Requirements: 11.1, 4.7_

### Phase 11: 后续迭代 - 统计与安全

- [x] 27. 实现数据统计
  - [x] 27.1 创建统计服务
    - 创建 `src/services/statistics.service.ts`
    - 实现合同统计查询
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 27.2 更新仪表盘页面
    - 添加统计卡片和图表
    - 支持日期范围筛选
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 27.3 实现导出功能
    - 实现合同列表导出Excel
    - _Requirements: 13.5_

- [x] 28. 安全加固
  - [x] 28.1 实现安全措施
    - 配置HTTPS
    - 实现CSRF保护
    - 实现登录频率限制
    - 实现输入sanitization
    - _Requirements: 14.1, 14.2, 14.3, 14.5_

- [x] 29. 最终检查点
  - 确保所有功能正常工作
  - 确保所有测试通过
  - 确保安全措施到位
  - 准备部署到阿里云

## Notes

- 任务标记 `*` 的为可选测试任务，可在MVP阶段跳过以加快开发速度
- 每个Checkpoint是验证阶段性成果的节点，确保功能完整后再继续
- MVP阶段（Phase 1-7）包含三级角色体系和双端设计的核心功能
- Phase 2.5-2.6 专门处理普通用户角色和移动端界面开发
- 后续迭代（Phase 8-11）可根据需求优先级调整
- 属性测试使用fast-check库，每个测试运行100次迭代
- 所有API调用需要处理错误和重试逻辑
- 移动端优先采用响应式设计，确保在各种设备上的良好体验
- 普通用户仅支持验证码登录，无需用户名密码
