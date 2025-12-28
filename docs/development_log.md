# 开发日志

## 2025-12-28 腾讯电子签联调环境配置问题排查

### 问题背景

在配置腾讯电子签 API 时，遇到"无权限访问该模板"和"签名计算错误"的问题。

### 遇到的问题

#### 问题 1：无权限访问模板

**错误信息**：
```
获取模板字段配置失败
无权限访问该模板，请联系管理员
```

**原因**：
- 正式环境的腾讯云账号（AKID 开头的密钥）与电子签企业关联的账号不一致
- 电子签企业关联的腾讯云账号 ID 是 `308000020349`，但用户无法登录该账号

**解决方案**：
- 使用联调环境进行开发测试
- 联调环境有专用的 SecretId 和 SecretKey，不需要关联腾讯云账号

---

#### 问题 2：回调地址验证失败

**错误信息**：
```
回调地址验证未通过，原因为返回的httpcode为：405
确保指定的网址可以接受POST请求并返回200状态码
```

**原因**：
- 腾讯电子签会向配置的回调地址发送 POST 请求进行验证
- 填写的 `https://example.com/callback` 不是真实的服务器地址

**解决方案**：
- 方案一：使用内网穿透工具（如 ngrok）暴露本地服务
- 方案二：暂时跳过回调配置，直接获取密钥进行 API 测试

---

#### 问题 3：签名计算错误

**错误信息**：
```
签名计算错误，请使用SDK或者参考签名文档
```

**排查过程**：

1. **API 地址错误**
   - 最初使用了集成版的地址 `essbasic.test.ess.tencent.cn`
   - 企业版联调环境应该使用 `ess.test.ess.tencent.cn`

2. **服务名称错误**
   - 最初将服务名改为 `essbasic`
   - 企业版联调环境应该使用 `ess`

3. **Secret Key 复制错误**（最终原因）
   - `.env` 文件中的 Secret Key 有一个字符错误
   - 错误：`SK5sb7s2YpX8D3X74v5GtptyqBEwq6UQDw`
   - 正确：`SK5sb7s2YpX8D3X74vSGtptyq8Ewq6UQDw`
   - 差异：`v5G...qB` vs `vSG...q8`

**解决方案**：
- 仔细核对从控制台复制的密钥，确保完全一致

---

### 最终配置

#### 环境变量 (.env)

```env
# 联调环境配置
TENCENT_SECRET_ID="AKyDtKGUUckpf9qwo2UE18DO1B0XMD2ThA"
TENCENT_SECRET_KEY="SK5sb7s2YpX8D3X74vSGtptyq8Ewq6UQDw"
TENCENT_ESIGN_ENV="test"

# 操作人和模板
TENCENT_ESIGN_OPERATOR_ID="yDtKsUUckpffhrvaUElfYnjb8FyrNYlx"
TENCENT_ESIGN_TEMPLATE_ID="yDtKrUUckpffyx7tUxZv7x3Sc4CcJ7pz"
```

#### 代码修改 (src/lib/tencent-cloud-sign.ts)

```typescript
// 根据环境选择 API 地址
const ESIGN_ENV = process.env.TENCENT_ESIGN_ENV || "prod";
const SERVICE = "ess"; // 企业版和联调环境都用 ess
const HOST = ESIGN_ENV === "test" 
  ? "ess.test.ess.tencent.cn"      // 联调环境
  : "ess.tencentcloudapi.com";      // 正式环境
```

---

### 经验总结

1. **密钥复制要仔细**：手动复制密钥时容易出错，建议使用复制按钮
2. **区分企业版和集成版**：
   - 企业版（自建应用）：`ess.test.ess.tencent.cn`
   - 集成版（第三方应用）：`essbasic.test.ess.tencent.cn`
3. **联调环境密钥格式**：
   - SecretId：以 `AK` 开头（不是腾讯云的 `AKID`）
   - SecretKey：以 `SK` 开头
4. **回调地址可以后配**：如果只是测试 API，可以先跳过回调配置

---

### 相关文档

- [联调环境配置](./联调环境配置.md)
- [腾讯电子签签名方法 v3](https://qian.tencent.com/developers/companyApis/apiGuides/signatureV3)
- [测试环境联调准备](https://qian.tencent.com/developers/company/test_env_integration)

---

### 验证命令

```bash
# 运行 API 集成验证脚本
node scripts/verify-api-integration.mjs
```

成功输出：
```
✓ API 调用成功！
  模板名称: 一对一成长顾问合同模板
  模板ID: yDtKrUUckpffyx7tUxZv7x3Sc4CcJ7pz
  控件数量: 18
```
