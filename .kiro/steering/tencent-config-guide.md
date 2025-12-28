# 腾讯云电子签配置指南

## 第一步：注册腾讯云账号

1. 访问 [腾讯云官网](https://cloud.tencent.com/)
2. 点击右上角"注册"
3. 使用手机号或微信注册
4. 完成实名认证（企业认证）

## 第二步：开通电子签服务

1. 登录腾讯云控制台
2. 搜索"电子签" 或访问 https://console.cloud.tencent.com/ess
3. 点击"立即开通"
4. 选择套餐（可以先选免费试用版）
5. 完成企业认证和法人认证

## 第三步：获取 API 密钥

### 3.1 获取 SecretId 和 SecretKey

1. 访问 [API 密钥管理](https://console.cloud.tencent.com/cam/capi)
2. 点击"新建密钥"
3. 记录下：
   - `SecretId`：类似 `AKIDxxxxxxxxxxxxx`
   - `SecretKey`：类似 `xxxxxxxxxxxxxxxx`

⚠️ **重要**：密钥只显示一次，请妥善保存！

### 3.2 获取操作员 UserId

1. 访问 [电子签控制台](https://qian.tencent.com/)
2. 进入"企业中心" → "员工管理"
3. 找到你的账号，复制 `UserId`
4. 格式类似：`yDxxxxxxxxxxxxx`

## 第四步：创建合同模板

### 4.1 进入模板管理

1. 在电子签控制台
2. 点击"模板管理" → "合同模板"
3. 点击"创建模板"

### 4.2 设计模板

1. **上传 PDF 或 Word 文档**
   - 准备好你的合同文档
   - 上传到系统

2. **添加填写控件**
   - 拖拽"单行文本"控件到需要填写的位置
   - 设置控件名称（重要！）：
     - `partyBName`：乙方姓名
     - `partyBPhone`：乙方电话
     - `partyBIdCard`：乙方身份证
     - 其他自定义字段...

3. **添加签署控件**
   - 拖拽"签名"控件到签署位置
   - 设置签署方：
     - 乙方（个人）
     - 甲方（企业，自动签署）

4. **保存模板**
   - 点击"保存并发布"
   - 记录模板 ID（类似：`yDRBxxxxxxxxxxx`）

## 第五步：配置企业印章

1. 进入"企业中心" → "印章管理"
2. 上传企业公章图片
3. 完成印章认证
4. 设置为默认印章

## 第六步：配置 .env 文件

将获取的信息填入项目的 `.env` 文件：

```env
# 数据库配置
DATABASE_URL="mysql://用户名:密码@localhost:3306/数据库名"

# NextAuth 配置
NEXTAUTH_SECRET="随机生成的密钥"
NEXTAUTH_URL="http://localhost:3000"

# 腾讯云 API 密钥
TENCENT_SECRET_ID="你的SecretId"
TENCENT_SECRET_KEY="你的SecretKey"

# 腾讯电子签配置
TENCENT_ESIGN_OPERATOR_ID="你的UserId"
TENCENT_ESIGN_TEMPLATE_ID="你的模板ID"

# 甲方企业信息
PARTY_A_ORG_NAME="你的公司名称"
PARTY_A_SIGNER_NAME="法人或授权签署人姓名"
PARTY_A_SIGNER_MOBILE="签署人手机号"

# 签署完成跳转地址（可选）
SIGN_COMPLETE_JUMP_URL="http://localhost:3000/m/contracts"
```

## 第七步：测试配置

运行测试脚本验证配置：

```bash
node scripts/verify-api-integration.mjs
```

如果看到"✓ API 配置验证成功"，说明配置正确！

## 常见问题

### Q1: 找不到 UserId？
A: 在电子签控制台 → 企业中心 → 员工管理 → 点击你的账号查看详情

### Q2: 模板 ID 在哪里？
A: 模板管理 → 点击模板 → 右上角"模板详情"可以看到模板 ID

### Q3: API 调用报错"无权限"？
A: 检查：
1. 电子签服务是否已开通
2. API 密钥是否正确
3. 企业认证是否完成

### Q4: 如何测试不花钱？
A: 腾讯电子签提供测试环境和免费额度，可以先在测试环境调试

## 下一步

配置完成后，你可以：
1. 在产品管理中添加产品，绑定模板 ID
2. 在移动端发起签约测试
3. 查看签署链接是否正常生成
