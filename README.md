# 合同签约管理平台

基于腾讯电子签 API 的合同签约管理系统，支持多城市管理、角色权限控制、移动端签约等功能。

## 功能特性

- **多城市管理**：数据隔离，每个城市独立配置
- **角色权限**：系统管理员、城市管理员、普通用户三种角色
- **合同流程**：乙方自动盖章 → 甲方手动签署 → 完成
- **移动端优先**：优化的移动端界面，方便发起和管理签约
- **签署方式**：支持二维码、链接分享、短信通知
- **产品模板绑定**：产品与腾讯电子签合同模板关联

## 技术栈

- **框架**：Next.js 16 + React 19 + TypeScript
- **数据库**：Prisma + MySQL
- **认证**：NextAuth.js
- **UI**：Ant Design 6 + Tailwind CSS
- **外部 API**：腾讯电子签

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填写配置：

```env
# 数据库
DATABASE_URL="mysql://用户名:密码@localhost:3306/数据库名"

# NextAuth
NEXTAUTH_SECRET="随机密钥"
NEXTAUTH_URL="http://localhost:3000"

# 腾讯电子签（联调环境）
TENCENT_SECRET_ID="你的SecretId"
TENCENT_SECRET_KEY="你的SecretKey"
TENCENT_ESIGN_ENV="test"
TENCENT_ESIGN_OPERATOR_ID="你的UserId"

# 乙方企业信息（自动盖章）
PARTY_A_ORG_NAME="你的公司名称"
PARTY_A_SIGNER_NAME="签署人姓名"
PARTY_A_SIGNER_MOBILE="签署人手机号"
```

### 3. 初始化数据库

```bash
npx prisma db push
```

### 4. 创建管理员账号

```bash
node scripts/create-user.mjs
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 业务流程

```
┌─────────────────────────────────────────────────────────────┐
│                      签约流程                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 发起签约        2. 乙方自动盖章      3. 甲方签署         │
│  ┌─────────┐       ┌─────────────┐      ┌─────────┐        │
│  │ 填写甲方 │  ──▶  │ 企业静默签   │  ──▶ │ 扫码签署 │        │
│  │ 信息    │       │ （自动完成） │      │         │        │
│  └─────────┘       └─────────────┘      └─────────┘        │
│                                                             │
│  4. 签署完成        5. 下载合同                              │
│  ┌─────────┐       ┌─────────────┐                         │
│  │ 刷新状态 │  ──▶  │ 下载 PDF    │                         │
│  └─────────┘       └─────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**角色说明**：
- **乙方** = 你的公司（发起方，自动盖章）
- **甲方** = 客户（接收方，需要手动签署）

## 联调环境说明

⚠️ **重要**：当前项目配置为腾讯电子签**联调环境**。

### 联调环境特点

1. **API 地址**：`ess.test.ess.tencent.cn`（正式环境是 `ess.tencentcloudapi.com`）
2. **密钥格式**：联调环境使用专用密钥（`AKyD...` 开头），不是腾讯云 API 密钥
3. **合同有效期**：联调环境合同有效期较短，建议尽快完成签署
4. **状态特殊处理**：联调环境可能返回 `FlowStatus=4`（已过期），但实际签署已完成，系统会自动修正

### 切换到正式环境

1. 修改 `.env` 中的 `TENCENT_ESIGN_ENV="prod"`
2. 更换为正式环境的 API 密钥
3. 更新操作员 ID 和模板 ID

## 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器

# 数据库
npx prisma db push       # 同步数据库结构
npx prisma studio        # 打开数据库管理界面

# 用户管理
node scripts/create-user.mjs          # 创建管理员
node scripts/create-ordinary-user.mjs # 创建普通用户

# 测试
npm test                 # 运行测试
```

## 项目结构

```
src/
├── app/                 # Next.js 页面
│   ├── (auth)/         # 登录页面
│   ├── (dashboard)/    # 管理后台
│   ├── m/              # 移动端页面
│   └── api/            # API 接口
├── components/         # React 组件
├── services/           # 业务逻辑层
├── lib/                # 工具库
└── types/              # TypeScript 类型
```

## 相关文档

- [腾讯电子签配置指南](.kiro/steering/tencent-config-guide.md)
- [本地运行指南](本地运行指南.md)
- [API 文档](docs/)

## License

MIT
