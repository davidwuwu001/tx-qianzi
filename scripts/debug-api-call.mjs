/**
 * 调试 API 调用脚本
 * 详细打印签名过程的每一步
 */

import crypto from "crypto";
import { config } from "dotenv";

// 加载环境变量
config();

const SECRET_ID = process.env.TENCENT_SECRET_ID || "";
const SECRET_KEY = process.env.TENCENT_SECRET_KEY || "";
const OPERATOR_ID = process.env.TENCENT_ESIGN_OPERATOR_ID || "";
const TEMPLATE_ID = process.env.TENCENT_ESIGN_TEMPLATE_ID || "";
const ESIGN_ENV = process.env.TENCENT_ESIGN_ENV || "prod";

// 联调环境配置（企业版）
const HOST = ESIGN_ENV === "test" ? "ess.test.ess.tencent.cn" : "ess.tencentcloudapi.com";
const SERVICE = "ess"; // 企业版和联调环境都用 ess

function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function debugApiCall() {
  console.log("========================================");
  console.log("调试 API 调用");
  console.log("========================================\n");

  console.log("=== 环境配置 ===");
  console.log(`环境: ${ESIGN_ENV}`);
  console.log(`HOST: ${HOST}`);
  console.log(`SERVICE: ${SERVICE}`);
  console.log(`SecretId: ${SECRET_ID}`);
  console.log(`SecretKey: ${SECRET_KEY.substring(0, 10)}...`);
  console.log(`OperatorId: ${OPERATOR_ID}`);
  console.log(`TemplateId: ${TEMPLATE_ID}`);

  const timestamp = Math.floor(Date.now() / 1000);
  const date = formatDate(timestamp);
  const action = "DescribeFlowTemplates";
  const version = "2020-11-11";

  console.log(`\n=== 时间信息 ===`);
  console.log(`Timestamp: ${timestamp}`);
  console.log(`Date: ${date}`);

  // 构建请求体
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
  console.log(`\n=== 请求体 ===`);
  console.log(body);

  // 步骤 1：拼接规范请求串
  const httpMethod = "POST";
  const canonicalUri = "/";
  const canonicalQueryString = "";
  const contentType = "application/json; charset=utf-8";
  
  const hashedPayload = crypto.createHash("sha256").update(body, "utf8").digest("hex");
  
  const canonicalHeaders = `content-type:${contentType}\nhost:${HOST}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = "content-type;host;x-tc-action";

  const canonicalRequest = [
    httpMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedPayload,
  ].join("\n");

  console.log(`\n=== 步骤 1：规范请求串 ===`);
  console.log(`HashedPayload: ${hashedPayload}`);
  console.log(`CanonicalHeaders:\n${canonicalHeaders}`);
  console.log(`SignedHeaders: ${signedHeaders}`);
  console.log(`\nCanonicalRequest:\n${canonicalRequest}`);

  // 步骤 2：拼接待签名字符串
  const credentialScope = `${date}/${SERVICE}/tc3_request`;
  const hashedCanonicalRequest = crypto.createHash("sha256").update(canonicalRequest, "utf8").digest("hex");

  const stringToSign = [
    "TC3-HMAC-SHA256",
    timestamp,
    credentialScope,
    hashedCanonicalRequest,
  ].join("\n");

  console.log(`\n=== 步骤 2：待签名字符串 ===`);
  console.log(`CredentialScope: ${credentialScope}`);
  console.log(`HashedCanonicalRequest: ${hashedCanonicalRequest}`);
  console.log(`\nStringToSign:\n${stringToSign}`);

  // 步骤 3：计算签名
  const secretDate = crypto.createHmac("sha256", `TC3${SECRET_KEY}`).update(date).digest();
  const secretService = crypto.createHmac("sha256", secretDate).update(SERVICE).digest();
  const secretSigning = crypto.createHmac("sha256", secretService).update("tc3_request").digest();
  const signature = crypto.createHmac("sha256", secretSigning).update(stringToSign).digest("hex");

  console.log(`\n=== 步骤 3：计算签名 ===`);
  console.log(`SecretDate (hex): ${secretDate.toString("hex")}`);
  console.log(`SecretService (hex): ${secretService.toString("hex")}`);
  console.log(`SecretSigning (hex): ${secretSigning.toString("hex")}`);
  console.log(`Signature: ${signature}`);

  // 步骤 4：拼接 Authorization
  const authorization = `TC3-HMAC-SHA256 Credential=${SECRET_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  console.log(`\n=== 步骤 4：Authorization ===`);
  console.log(authorization);

  // 构建请求头
  const headers = {
    "Content-Type": contentType,
    "Host": HOST,
    "X-TC-Action": action,
    "X-TC-Version": version,
    "X-TC-Timestamp": String(timestamp),
    "Authorization": authorization,
  };

  console.log(`\n=== 请求头 ===`);
  for (const [key, value] of Object.entries(headers)) {
    console.log(`${key}: ${value}`);
  }

  // 发送请求
  console.log(`\n=== 发送请求 ===`);
  console.log(`URL: https://${HOST}`);

  try {
    const response = await fetch(`https://${HOST}`, {
      method: "POST",
      headers,
      body,
    });

    const data = await response.json();
    console.log(`\n=== 响应 ===`);
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`\n=== 错误 ===`);
    console.log(error.message);
  }
}

debugApiCall();
