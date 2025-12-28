/**
 * 腾讯云 API TC3-HMAC-SHA256 签名工具
 * 
 * 实现腾讯云 API v3 签名算法
 * 文档: https://cloud.tencent.com/document/api/213/30654
 */

import crypto from "crypto";

// 环境变量配置
const TENCENT_SECRET_ID = process.env.TENCENT_SECRET_ID || "";
const TENCENT_SECRET_KEY = process.env.TENCENT_SECRET_KEY || "";

// 签名算法常量
const ALGORITHM = "TC3-HMAC-SHA256";
const SERVICE = "ess"; // 电子签服务
const HOST = "ess.tencentcloudapi.com";
const CONTENT_TYPE = "application/json; charset=utf-8";

/**
 * 签名请求参数
 */
export interface SignRequestParams {
  action: string;
  version: string;
  payload: Record<string, unknown>;
  region?: string;
  timestamp?: number;
}

/**
 * 签名后的请求
 */
export interface SignedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

/**
 * SHA256 哈希
 */
function sha256(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * HMAC-SHA256 签名
 */
function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 构建规范请求字符串
 */
function buildCanonicalRequest(
  httpMethod: string,
  canonicalUri: string,
  canonicalQueryString: string,
  canonicalHeaders: string,
  signedHeaders: string,
  hashedPayload: string
): string {
  return [
    httpMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedPayload,
  ].join("\n");
}

/**
 * 构建待签名字符串
 */
function buildStringToSign(
  algorithm: string,
  timestamp: number,
  credentialScope: string,
  hashedCanonicalRequest: string
): string {
  return [algorithm, timestamp, credentialScope, hashedCanonicalRequest].join(
    "\n"
  );
}

/**
 * 计算签名
 */
function calculateSignature(
  secretKey: string,
  date: string,
  service: string,
  stringToSign: string
): string {
  const secretDate = hmacSha256(`TC3${secretKey}`, date);
  const secretService = hmacSha256(secretDate, service);
  const secretSigning = hmacSha256(secretService, "tc3_request");
  return hmacSha256(secretSigning, stringToSign).toString("hex");
}

/**
 * 签名请求
 * 
 * 实现 TC3-HMAC-SHA256 签名算法
 * 
 * @param params 签名参数
 * @returns 签名后的请求对象
 */
export function signRequest(params: SignRequestParams): SignedRequest {
  const { action, version, payload, region = "" } = params;
  const timestamp = params.timestamp || Math.floor(Date.now() / 1000);
  const date = formatDate(timestamp);

  // 验证密钥配置
  if (!TENCENT_SECRET_ID || !TENCENT_SECRET_KEY) {
    throw new Error(
      "腾讯云 API 密钥未配置，请设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY 环境变量"
    );
  }

  // HTTP 请求方法
  const httpMethod = "POST";

  // 规范 URI
  const canonicalUri = "/";

  // 规范查询字符串（POST 请求为空）
  const canonicalQueryString = "";

  // 请求体
  const body = JSON.stringify(payload);

  // 请求体哈希
  const hashedPayload = sha256(body);

  // 规范请求头
  const canonicalHeaders = `content-type:${CONTENT_TYPE}\nhost:${HOST}\nx-tc-action:${action.toLowerCase()}\n`;

  // 签名头
  const signedHeaders = "content-type;host;x-tc-action";

  // 构建规范请求
  const canonicalRequest = buildCanonicalRequest(
    httpMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedPayload
  );

  // 凭证范围
  const credentialScope = `${date}/${SERVICE}/tc3_request`;

  // 待签名字符串
  const stringToSign = buildStringToSign(
    ALGORITHM,
    timestamp,
    credentialScope,
    sha256(canonicalRequest)
  );

  // 计算签名
  const signature = calculateSignature(
    TENCENT_SECRET_KEY,
    date,
    SERVICE,
    stringToSign
  );

  // 构建 Authorization 头
  const authorization = `${ALGORITHM} Credential=${TENCENT_SECRET_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // 构建请求头
  const headers: Record<string, string> = {
    "Content-Type": CONTENT_TYPE,
    Host: HOST,
    "X-TC-Action": action,
    "X-TC-Version": version,
    "X-TC-Timestamp": String(timestamp),
    Authorization: authorization,
  };

  // 如果有 Region，添加到请求头
  if (region) {
    headers["X-TC-Region"] = region;
  }

  return {
    url: `https://${HOST}`,
    method: httpMethod,
    headers,
    body,
  };
}

/**
 * 获取腾讯云 API 配置状态
 */
export function getTencentCloudConfig(): {
  configured: boolean;
  secretIdSet: boolean;
  secretKeySet: boolean;
} {
  return {
    configured: Boolean(TENCENT_SECRET_ID && TENCENT_SECRET_KEY),
    secretIdSet: Boolean(TENCENT_SECRET_ID),
    secretKeySet: Boolean(TENCENT_SECRET_KEY),
  };
}

/**
 * 验证回调签名
 * 
 * @param payload 回调数据
 * @param signature 签名
 * @param timestamp 时间戳
 * @returns 签名是否有效
 */
export function verifyCallbackSignature(
  payload: string,
  signature: string,
  timestamp: number
): boolean {
  if (!TENCENT_SECRET_KEY) {
    throw new Error("腾讯云 API 密钥未配置");
  }

  // 验证时间戳（5分钟内有效）
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    return false;
  }

  // 计算预期签名
  const stringToSign = `${timestamp}\n${payload}`;
  const expectedSignature = hmacSha256(TENCENT_SECRET_KEY, stringToSign).toString("hex");

  // 比较签名（使用时间安全比较）
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
