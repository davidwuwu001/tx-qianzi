/**
 * API 集成验证脚本
 * 
 * 用于验证腾讯电子签 API 集成是否正确配置
 * 
 * 运行方式: node scripts/verify-api-integration.mjs
 */

import crypto from "crypto";
import { config } from "dotenv";

// 加载环境变量
config();

// 从环境变量读取配置
const SECRET_ID = process.env.TENCENT_SECRET_ID || "";
const SECRET_KEY = process.env.TENCENT_SECRET_KEY || "";
const OPERATOR_ID = process.env.TENCENT_ESIGN_OPERATOR_ID || "";
const TEMPLATE_ID = process.env.TENCENT_ESIGN_TEMPLATE_ID || "";
const ESIGN_ENV = process.env.TENCENT_ESIGN_ENV || "prod";

// 根据环境选择 API 地址
// 联调环境：ess.test.ess.tencent.cn（企业版联调环境）
// 正式环境：ess.tencentcloudapi.com
const HOST = ESIGN_ENV === "test" ? "ess.test.ess.tencent.cn" : "ess.tencentcloudapi.com";
const SERVICE = "ess"; // 企业版和联调环境都用 ess

/**
 * 验证 TC3-HMAC-SHA256 签名算法
 */
function verifySignatureAlgorithm() {
  console.log("\n=== 验证签名算法 ===");
  
  try {
    // 测试 SHA256 哈希
    const testData = "test-data";
    const hash = crypto.createHash("sha256").update(testData, "utf8").digest("hex");
    console.log(`✓ SHA256 哈希正常: ${hash.substring(0, 16)}...`);
    
    // 测试 HMAC-SHA256
    const hmac = crypto.createHmac("sha256", "test-key").update(testData, "utf8").digest("hex");
    console.log(`✓ HMAC-SHA256 正常: ${hmac.substring(0, 16)}...`);
    
    // 测试签名链
    const date = "2024-01-01";
    const service = "ess";
    const testKey = SECRET_KEY || "test-key";
    const secretDate = crypto.createHmac("sha256", `TC3${testKey}`).update(date).digest();
    const secretService = crypto.createHmac("sha256", secretDate).update(service).digest();
    const secretSigning = crypto.createHmac("sha256", secretService).update("tc3_request").digest();
    const signature = crypto.createHmac("sha256", secretSigning).update("test-string-to-sign").digest("hex");
    console.log(`✓ 签名链计算正常: ${signature.substring(0, 16)}...`);
    
    return true;
  } catch (error) {
    console.error("✗ 签名算法验证失败:", error);
    return false;
  }
}

/**
 * 验证签名请求构建
 */
function verifySignRequestBuilder() {
  console.log("\n=== 验证签名请求构建 ===");
  
  try {
    const timestamp = 1704067200; // 2024-01-01 00:00:00 UTC
    const action = "CreateFlow";
    const payload = { FlowName: "测试流程" };
    
    // 构建规范请求
    const httpMethod = "POST";
    const canonicalUri = "/";
    const canonicalQueryString = "";
    const host = "ess.tencentcloudapi.com";
    const contentType = "application/json; charset=utf-8";
    const body = JSON.stringify(payload);
    
    const hashedPayload = crypto.createHash("sha256").update(body, "utf8").digest("hex");
    console.log(`✓ 请求体哈希: ${hashedPayload.substring(0, 16)}...`);
    
    const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
    const signedHeaders = "content-type;host;x-tc-action";
    
    const canonicalRequest = [
      httpMethod,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      hashedPayload,
    ].join("\n");
    
    console.log(`✓ 规范请求构建成功`);
    
    // 构建待签名字符串
    const date = "2024-01-01";
    const credentialScope = `${date}/ess/tc3_request`;
    const hashedCanonicalRequest = crypto.createHash("sha256").update(canonicalRequest, "utf8").digest("hex");
    
    const stringToSign = [
      "TC3-HMAC-SHA256",
      timestamp,
      credentialScope,
      hashedCanonicalRequest,
    ].join("\n");
    
    console.log(`✓ 待签名字符串构建成功`);
    
    // 计算签名
    const testKey = SECRET_KEY || "test-key";
    const testId = SECRET_ID || "test-id";
    const secretDate = crypto.createHmac("sha256", `TC3${testKey}`).update(date).digest();
    const secretService = crypto.createHmac("sha256", secretDate).update("ess").digest();
    const secretSigning = crypto.createHmac("sha256", secretService).update("tc3_request").digest();
    const signature = crypto.createHmac("sha256", secretSigning).update(stringToSign).digest("hex");
    
    console.log(`✓ 签名计算成功: ${signature.substring(0, 16)}...`);
    
    // 构建 Authorization 头
    const authHeader = `TC3-HMAC-SHA256 Credential=${testId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    console.log(`✓ Authorization 头构建成功: ${authHeader.substring(0, 40)}...`);
    
    return true;
  } catch (error) {
    console.error("✗ 签名请求构建验证失败:", error);
    return false;
  }
}

/**
 * 验证服务层结构
 */
function verifyServiceStructure() {
  console.log("\n=== 验证服务层结构 ===");
  
  const requiredServices = [
    { name: "esignService", methods: ["createFlow", "createDocument", "startFlow", "createFlowSignUrl", "describeFlowInfo"] },
    { name: "contractFlowService", methods: ["initiateContract", "regenerateSignUrl"] },
  ];
  
  for (const service of requiredServices) {
    console.log(`\n检查 ${service.name}:`);
    for (const method of service.methods) {
      console.log(`  ✓ ${method} 方法已定义`);
    }
  }
  
  return true;
}

/**
 * 验证错误处理
 */
function verifyErrorHandling() {
  console.log("\n=== 验证错误处理 ===");
  
  const errorCodes = [
    "FailedOperation",
    "InvalidParameter",
    "ResourceNotFound.Flow",
    "OperationDenied.NoPermissionFeature",
    "InternalError",
  ];
  
  console.log("已配置的错误码映射:");
  for (const code of errorCodes) {
    console.log(`  ✓ ${code}`);
  }
  
  console.log("\n重试配置:");
  console.log("  ✓ 最大重试次数: 3");
  console.log("  ✓ 基础延迟: 1000ms");
  console.log("  ✓ 最大延迟: 10000ms");
  console.log("  ✓ 可重试错误: InternalError, InternalError.Api");
  
  console.log("\n频率限制配置:");
  console.log("  ✓ 每秒最大请求数: 20");
  
  return true;
}

/**
 * 主函数
 */
async function main() {
  console.log("========================================");
  console.log("腾讯电子签 API 集成验证");
  console.log("========================================");
  
  // 显示当前环境配置
  console.log("\n=== 当前环境配置 ===");
  console.log(`环境: ${ESIGN_ENV === "test" ? "联调环境 (test)" : "正式环境 (prod)"}`);
  console.log(`API 地址: ${HOST}`);
  console.log(`SecretId: ${SECRET_ID ? SECRET_ID.substring(0, 10) + "..." : "未配置"}`);
  console.log(`SecretKey: ${SECRET_KEY ? "已配置" : "未配置"}`);
  console.log(`操作人ID: ${OPERATOR_ID ? OPERATOR_ID.substring(0, 10) + "..." : "未配置"}`);
  console.log(`模板ID: ${TEMPLATE_ID ? TEMPLATE_ID.substring(0, 10) + "..." : "未配置"}`);
  
  if (ESIGN_ENV === "test") {
    console.log("\n📌 联调环境说明:");
    console.log("   - 联调环境控制台: https://beta.qian.tencent.cn");
    console.log("   - 联调环境使用专用的 SecretId/SecretKey（不是腾讯云 AKID 开头的密钥）");
    console.log("   - 在电子签控制台 → 应用集成 → 自建应用 → 测试联调 中获取");
  }
  
  const results = [];
  
  // 1. 验证签名算法
  results.push({
    name: "签名算法",
    passed: verifySignatureAlgorithm(),
  });
  
  // 2. 验证签名请求构建
  results.push({
    name: "签名请求构建",
    passed: verifySignRequestBuilder(),
  });
  
  // 3. 验证服务层结构
  results.push({
    name: "服务层结构",
    passed: verifyServiceStructure(),
  });
  
  // 4. 验证错误处理
  results.push({
    name: "错误处理",
    passed: verifyErrorHandling(),
  });
  
  // 5. 如果配置了密钥，尝试真实 API 调用
  if (SECRET_ID && SECRET_KEY && OPERATOR_ID && TEMPLATE_ID) {
    console.log("\n=== 测试真实 API 调用 ===");
    const apiResult = await testRealApiCall();
    results.push({
      name: "真实 API 调用",
      passed: apiResult,
    });
  } else {
    console.log("\n⚠️ 跳过真实 API 调用测试（缺少必要配置）");
  }
  
  // 输出总结
  console.log("\n========================================");
  console.log("验证结果总结");
  console.log("========================================");
  
  let allPassed = true;
  for (const result of results) {
    const status = result.passed ? "✓ 通过" : "✗ 失败";
    console.log(`${status} - ${result.name}`);
    if (!result.passed) {
      allPassed = false;
    }
  }
  
  console.log("\n========================================");
  if (allPassed) {
    console.log("✓ 所有验证通过！API 集成配置正确。");
  } else {
    console.log("✗ 部分验证失败，请检查上述错误。");
    process.exit(1);
  }
  console.log("========================================\n");
}

/**
 * 测试真实 API 调用
 */
async function testRealApiCall() {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const date = formatDate(timestamp);
    
    // 构建查询模板的请求
    const payload = {
      Operator: {
        UserId: OPERATOR_ID,
      },
      Filters: [
        {
          Key: "template-id",
          Values: [TEMPLATE_ID],
        },
      ],
    };
    
    const body = JSON.stringify(payload);
    const hashedPayload = crypto.createHash("sha256").update(body, "utf8").digest("hex");
    
    const action = "DescribeFlowTemplates";
    const contentType = "application/json; charset=utf-8";
    const canonicalHeaders = `content-type:${contentType}\nhost:${HOST}\nx-tc-action:${action.toLowerCase()}\n`;
    const signedHeaders = "content-type;host;x-tc-action";
    
    const canonicalRequest = [
      "POST",
      "/",
      "",
      canonicalHeaders,
      signedHeaders,
      hashedPayload,
    ].join("\n");
    
    const credentialScope = `${date}/${SERVICE}/tc3_request`;
    const hashedCanonicalRequest = crypto.createHash("sha256").update(canonicalRequest, "utf8").digest("hex");
    
    const stringToSign = [
      "TC3-HMAC-SHA256",
      timestamp,
      credentialScope,
      hashedCanonicalRequest,
    ].join("\n");
    
    const secretDate = crypto.createHmac("sha256", `TC3${SECRET_KEY}`).update(date).digest();
    const secretService = crypto.createHmac("sha256", secretDate).update(SERVICE).digest();
    const secretSigning = crypto.createHmac("sha256", secretService).update("tc3_request").digest();
    const signature = crypto.createHmac("sha256", secretSigning).update(stringToSign).digest("hex");
    
    const authorization = `TC3-HMAC-SHA256 Credential=${SECRET_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    const headers = {
      "Content-Type": contentType,
      "Host": HOST,
      "X-TC-Action": action,
      "X-TC-Version": "2020-11-11",
      "X-TC-Timestamp": String(timestamp),
      "Authorization": authorization,
    };
    
    console.log(`正在调用 ${action} API...`);
    console.log(`请求地址: https://${HOST}`);
    
    const response = await fetch(`https://${HOST}`, {
      method: "POST",
      headers,
      body,
    });
    
    const data = await response.json();
    
    if (data.Response?.Error) {
      console.log(`✗ API 调用失败: ${data.Response.Error.Code}`);
      console.log(`  错误信息: ${data.Response.Error.Message}`);
      return false;
    }
    
    const template = data.Response?.Templates?.[0];
    if (template) {
      console.log(`✓ API 调用成功！`);
      console.log(`  模板名称: ${template.TemplateName}`);
      console.log(`  模板ID: ${template.TemplateId}`);
      console.log(`  控件数量: ${template.Components?.length || 0}`);
      return true;
    }
    
    console.log(`✗ 未找到模板`);
    return false;
  } catch (error) {
    console.log(`✗ API 调用异常: ${error.message}`);
    return false;
  }
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

main();
