/**
 * 获取模板字段信息
 * 
 * 用法: node scripts/get-template-fields.mjs [模板ID]
 * 如果不传模板ID，会使用环境变量中的 TENCENT_ESIGN_TEMPLATE_ID
 */

import crypto from 'crypto';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const SECRET_ID = process.env.TENCENT_SECRET_ID;
const SECRET_KEY = process.env.TENCENT_SECRET_KEY;
const OPERATOR_ID = process.env.TENCENT_ESIGN_OPERATOR_ID;
const DEFAULT_TEMPLATE_ID = process.env.TENCENT_ESIGN_TEMPLATE_ID;

// 从命令行参数获取模板ID，或使用默认值
const TEMPLATE_ID = process.argv[2] || DEFAULT_TEMPLATE_ID;

if (!SECRET_ID || !SECRET_KEY || !OPERATOR_ID) {
  console.error('❌ 请先配置环境变量：TENCENT_SECRET_ID, TENCENT_SECRET_KEY, TENCENT_ESIGN_OPERATOR_ID');
  process.exit(1);
}

if (!TEMPLATE_ID) {
  console.error('❌ 请提供模板ID，用法: node scripts/get-template-fields.mjs <模板ID>');
  process.exit(1);
}

/**
 * 生成腾讯云 API 签名
 */
function generateSignature(params) {
  const { service, action, payload, timestamp } = params;
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  
  // 1. 拼接规范请求串
  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const canonicalHeaders = `content-type:application/json\nhost:${service}.tencentcloudapi.com\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';
  const hashedRequestPayload = crypto.createHash('sha256').update(payload).digest('hex');
  const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;
  
  // 2. 拼接待签名字符串
  const algorithm = 'TC3-HMAC-SHA256';
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;
  
  // 3. 计算签名
  const secretDate = crypto.createHmac('sha256', `TC3${SECRET_KEY}`).update(date).digest();
  const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
  const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest();
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');
  
  // 4. 拼接 Authorization
  const authorization = `${algorithm} Credential=${SECRET_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return authorization;
}

/**
 * 调用腾讯云 API
 */
function callApi(action, payload) {
  return new Promise((resolve, reject) => {
    const service = 'ess';
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadStr = JSON.stringify(payload);
    const authorization = generateSignature({ service, action, payload: payloadStr, timestamp });
    
    const options = {
      hostname: `${service}.tencentcloudapi.com`,
      port: 443,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': `${service}.tencentcloudapi.com`,
        'X-TC-Action': action,
        'X-TC-Version': '2020-11-11',
        'X-TC-Timestamp': timestamp.toString(),
        'X-TC-Region': 'ap-guangzhou',
        'Authorization': authorization,
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          reject(new Error(`解析响应失败: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(payloadStr);
    req.end();
  });
}

/**
 * 获取模板详情
 */
async function getTemplateInfo() {
  console.log('========================================');
  console.log('获取模板字段信息');
  console.log('========================================\n');
  console.log(`模板ID: ${TEMPLATE_ID}\n`);
  
  try {
    const result = await callApi('DescribeFlowTemplates', {
      Operator: {
        UserId: OPERATOR_ID,
      },
      Filters: [
        {
          Key: 'template-id',
          Values: [TEMPLATE_ID],
        },
      ],
    });
    
    if (result.Response?.Error) {
      console.error('❌ API 调用失败:', result.Response.Error.Message);
      return;
    }
    
    const templates = result.Response?.Templates || [];
    
    if (templates.length === 0) {
      console.log('❌ 未找到该模板，请检查模板ID是否正确');
      return;
    }
    
    const template = templates[0];
    
    console.log('=== 模板基本信息 ===');
    console.log(`模板名称: ${template.TemplateName}`);
    console.log(`模板ID: ${template.TemplateId}`);
    console.log(`创建时间: ${new Date(template.CreatedOn * 1000).toLocaleString()}`);
    console.log(`模板类型: ${template.TemplateType === 0 ? '普通模板' : '其他'}`);
    console.log();
    
    // 获取填写控件
    const components = template.Components || [];
    const fillComponents = components.filter(c => 
      c.ComponentType === 'TEXT' || 
      c.ComponentType === 'MULTI_LINE_TEXT' ||
      c.ComponentType === 'DATE' ||
      c.ComponentType === 'SELECT'
    );
    
    if (fillComponents.length > 0) {
      console.log('=== 需要填写的字段 ===');
      console.log('（这些是你在发起合同时需要传入的参数）\n');
      
      fillComponents.forEach((comp, index) => {
        console.log(`${index + 1}. ${comp.ComponentName}`);
        console.log(`   类型: ${comp.ComponentType}`);
        console.log(`   必填: ${comp.ComponentRequired ? '是' : '否'}`);
        if (comp.Placeholder) {
          console.log(`   提示: ${comp.Placeholder}`);
        }
        console.log();
      });
      
      // 生成 formFields 配置示例
      console.log('=== formFields 配置示例 ===');
      console.log('（复制到产品管理的"表单字段配置"中）\n');
      
      const formFieldsConfig = fillComponents.map(comp => ({
        name: comp.ComponentName,
        label: comp.ComponentName,
        type: comp.ComponentType === 'MULTI_LINE_TEXT' ? 'textarea' : 
              comp.ComponentType === 'DATE' ? 'date' : 
              comp.ComponentType === 'SELECT' ? 'select' : 'text',
        required: comp.ComponentRequired || false,
        placeholder: comp.Placeholder || `请输入${comp.ComponentName}`,
      }));
      
      console.log(JSON.stringify(formFieldsConfig, null, 2));
    } else {
      console.log('该模板没有需要填写的字段控件');
    }
    
    // 获取签署控件
    const signComponents = components.filter(c => 
      c.ComponentType === 'SIGN_SIGNATURE' || 
      c.ComponentType === 'SIGN_SEAL' ||
      c.ComponentType === 'SIGN_DATE'
    );
    
    if (signComponents.length > 0) {
      console.log('\n=== 签署控件 ===');
      signComponents.forEach((comp, index) => {
        console.log(`${index + 1}. ${comp.ComponentName} (${comp.ComponentType})`);
      });
    }
    
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

getTemplateInfo();
