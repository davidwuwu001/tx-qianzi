/**
 * 测试查询流程状态 API
 */
import crypto from 'crypto';

// 从环境变量读取配置
const SECRET_ID = process.env.TENCENT_SECRET_ID || 'AKyDtKGUUckpf9qwo2UE18DO1B0XMD2ThA';
const SECRET_KEY = process.env.TENCENT_SECRET_KEY || 'SK5sb7s2YpX8D3X74vSGtptyq8Ewq6UQDw';
const OPERATOR_ID = process.env.TENCENT_ESIGN_OPERATOR_ID || 'yDtKsUUckpffhrvaUElfYnjb8FyrNYlx';

// 测试的 flowId
const FLOW_ID = 'yDtKTUUckpffu842U1UEEv6bfuDTbsoO';

// API 配置
const HOST = 'ess.test.ess.tencent.cn';  // 联调环境
const SERVICE = 'ess';
const VERSION = '2020-11-11';
const ACTION = 'DescribeFlowInfo';

function sha256(message) {
  return crypto.createHash('sha256').update(message).digest('hex');
}

function hmacSha256(key, message) {
  return crypto.createHmac('sha256', key).update(message).digest();
}

function signRequest(payload) {
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  
  const payloadStr = JSON.stringify(payload);
  const hashedPayload = sha256(payloadStr);
  
  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const canonicalHeaders = `content-type:application/json\nhost:${HOST}\nx-tc-action:${ACTION.toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';
  
  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedPayload,
  ].join('\n');
  
  const algorithm = 'TC3-HMAC-SHA256';
  const credentialScope = `${date}/${SERVICE}/tc3_request`;
  const hashedCanonicalRequest = sha256(canonicalRequest);
  const stringToSign = [
    algorithm,
    timestamp,
    credentialScope,
    hashedCanonicalRequest,
  ].join('\n');
  
  const secretDate = hmacSha256(`TC3${SECRET_KEY}`, date);
  const secretService = hmacSha256(secretDate, SERVICE);
  const secretSigning = hmacSha256(secretService, 'tc3_request');
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');
  
  const authorization = `${algorithm} Credential=${SECRET_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return {
    url: `https://${HOST}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': HOST,
      'X-TC-Action': ACTION,
      'X-TC-Version': VERSION,
      'X-TC-Timestamp': timestamp.toString(),
      'Authorization': authorization,
    },
    body: payloadStr,
  };
}

async function main() {
  const payload = {
    Operator: {
      UserId: OPERATOR_ID,
    },
    FlowIds: [FLOW_ID],
  };
  
  console.log('=== 请求参数 ===');
  console.log(JSON.stringify(payload, null, 2));
  
  const signedRequest = signRequest(payload);
  
  console.log('\n=== 发送请求 ===');
  
  const response = await fetch(signedRequest.url, {
    method: signedRequest.method,
    headers: signedRequest.headers,
    body: signedRequest.body,
  });
  
  const data = await response.json();
  
  console.log('\n=== 响应数据 ===');
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
