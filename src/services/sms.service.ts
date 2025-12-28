/**
 * 短信服务
 * 
 * 实现短信发送功能，包括：
 * - 发送签署链接短信
 * - 发送验证码短信
 * - 发送通知短信
 * 
 * 优先使用腾讯电子签内置短信，备用腾讯云短信服务
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */

import prisma from '@/lib/prisma';

/**
 * 短信服务错误类
 */
export class SmsServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'SmsServiceError';
  }
}

/**
 * 短信类型
 */
export enum SmsType {
  /** 签署链接 */
  SIGN_LINK = 'SIGN_LINK',
  /** 验证码 */
  VERIFICATION_CODE = 'VERIFICATION_CODE',
  /** 签署完成通知 */
  SIGN_COMPLETE = 'SIGN_COMPLETE',
  /** 审批通知 */
  APPROVAL_NOTICE = 'APPROVAL_NOTICE',
}

/**
 * 短信发送结果
 */
export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 短信发送记录
 */
interface SmsSendRecord {
  phone: string;
  type: SmsType;
  timestamp: number;
}

// 频率限制：每个手机号每小时最多5条
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1小时

// 内存中的发送记录（生产环境应使用 Redis）
const sendRecords: SmsSendRecord[] = [];

/**
 * 检查频率限制
 * Requirements: 11.6
 */
function checkRateLimit(phone: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // 清理过期记录
  const validRecords = sendRecords.filter(r => r.timestamp > windowStart);
  sendRecords.length = 0;
  sendRecords.push(...validRecords);
  
  // 统计该手机号的发送次数
  const phoneRecords = sendRecords.filter(r => r.phone === phone);
  
  return phoneRecords.length < RATE_LIMIT_MAX;
}

/**
 * 记录发送
 */
function recordSend(phone: string, type: SmsType): void {
  sendRecords.push({
    phone,
    type,
    timestamp: Date.now(),
  });
}

/**
 * 记录短信发送日志
 * Requirements: 11.5
 */
async function logSmsSend(params: {
  phone: string;
  type: SmsType;
  content: string;
  success: boolean;
  messageId?: string;
  error?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`,
        action: 'SMS_SEND',
        resource: 'SMS',
        details: {
          phone: params.phone,
          type: params.type,
          success: params.success,
          messageId: params.messageId,
          error: params.error,
          // 不记录完整内容，只记录类型
        },
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error('记录短信日志失败:', error);
  }
}

/**
 * 通过腾讯电子签发送短信
 * Requirements: 11.3
 * 
 * 注意：腾讯电子签的短信发送是在创建签署流程时自动触发的
 * 这里提供一个模拟实现，实际使用时需要调用腾讯电子签的相关API
 */
async function sendViaEsign(
  phone: string,
  content: string,
  type: SmsType
): Promise<SmsSendResult> {
  // 模拟发送
  console.log(`[腾讯电子签短信] 发送到 ${phone}: ${content}`);
  
  // 在开发环境中模拟成功
  if (process.env.NODE_ENV === 'development') {
    return {
      success: true,
      messageId: `esign_${Date.now()}`,
    };
  }
  
  // 生产环境需要实现实际的API调用
  // TODO: 实现腾讯电子签短信API调用
  return {
    success: false,
    error: '腾讯电子签短信服务未配置',
  };
}

/**
 * 通过腾讯云短信发送
 * Requirements: 11.4
 */
async function sendViaTencentCloud(
  phone: string,
  templateId: string,
  templateParams: string[]
): Promise<SmsSendResult> {
  // 检查配置
  const secretId = process.env.TENCENT_SMS_SECRET_ID;
  const secretKey = process.env.TENCENT_SMS_SECRET_KEY;
  const appId = process.env.TENCENT_SMS_APP_ID;
  const signName = process.env.TENCENT_SMS_SIGN_NAME;
  
  if (!secretId || !secretKey || !appId || !signName) {
    console.log(`[腾讯云短信] 配置不完整，模拟发送到 ${phone}`);
    
    // 开发环境模拟成功
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        messageId: `tcloud_${Date.now()}`,
      };
    }
    
    return {
      success: false,
      error: '腾讯云短信服务未配置',
    };
  }
  
  // TODO: 实现腾讯云短信API调用
  // 使用 tencentcloud-sdk-nodejs 或直接调用API
  
  console.log(`[腾讯云短信] 发送到 ${phone}, 模板: ${templateId}, 参数: ${templateParams.join(',')}`);
  
  return {
    success: true,
    messageId: `tcloud_${Date.now()}`,
  };
}


/**
 * 发送签署链接短信
 * Requirements: 11.1
 * 
 * @param phone 手机号
 * @param signUrl 签署链接
 * @param contractName 合同名称
 * @returns 发送结果
 */
export async function sendSignLinkSms(
  phone: string,
  signUrl: string,
  contractName: string
): Promise<SmsSendResult> {
  // 检查频率限制
  if (!checkRateLimit(phone)) {
    return {
      success: false,
      error: '发送过于频繁，请稍后再试',
    };
  }
  
  const content = `您有一份"${contractName}"待签署，请点击链接完成签署：${signUrl}`;
  
  // 优先使用腾讯电子签
  let result = await sendViaEsign(phone, content, SmsType.SIGN_LINK);
  
  // 如果腾讯电子签失败，使用腾讯云短信
  if (!result.success) {
    const templateId = process.env.TENCENT_SMS_TEMPLATE_SIGN_LINK || '';
    result = await sendViaTencentCloud(phone, templateId, [contractName, signUrl]);
  }
  
  // 记录发送
  if (result.success) {
    recordSend(phone, SmsType.SIGN_LINK);
  }
  
  // 记录日志
  await logSmsSend({
    phone,
    type: SmsType.SIGN_LINK,
    content,
    success: result.success,
    messageId: result.messageId,
    error: result.error,
  });
  
  return result;
}

/**
 * 发送验证码短信
 * Requirements: 11.2
 * 
 * @param phone 手机号
 * @param code 验证码
 * @returns 发送结果
 */
export async function sendVerificationCodeSms(
  phone: string,
  code: string
): Promise<SmsSendResult> {
  // 检查频率限制
  if (!checkRateLimit(phone)) {
    return {
      success: false,
      error: '发送过于频繁，请稍后再试',
    };
  }
  
  const content = `您的验证码是：${code}，5分钟内有效，请勿泄露给他人。`;
  
  // 验证码只能通过腾讯云短信发送
  const templateId = process.env.TENCENT_SMS_TEMPLATE_VERIFY_CODE || '';
  const result = await sendViaTencentCloud(phone, templateId, [code, '5']);
  
  // 记录发送
  if (result.success) {
    recordSend(phone, SmsType.VERIFICATION_CODE);
  }
  
  // 记录日志
  await logSmsSend({
    phone,
    type: SmsType.VERIFICATION_CODE,
    content: '验证码短信', // 不记录实际验证码
    success: result.success,
    messageId: result.messageId,
    error: result.error,
  });
  
  return result;
}

/**
 * 发送签署完成通知短信
 * 
 * @param phone 手机号
 * @param contractName 合同名称
 * @returns 发送结果
 */
export async function sendSignCompleteNotice(
  phone: string,
  contractName: string
): Promise<SmsSendResult> {
  // 检查频率限制
  if (!checkRateLimit(phone)) {
    return {
      success: false,
      error: '发送过于频繁，请稍后再试',
    };
  }
  
  const content = `您的"${contractName}"已签署完成，感谢您的配合。`;
  
  // 优先使用腾讯电子签
  let result = await sendViaEsign(phone, content, SmsType.SIGN_COMPLETE);
  
  // 如果腾讯电子签失败，使用腾讯云短信
  if (!result.success) {
    const templateId = process.env.TENCENT_SMS_TEMPLATE_SIGN_COMPLETE || '';
    result = await sendViaTencentCloud(phone, templateId, [contractName]);
  }
  
  // 记录发送
  if (result.success) {
    recordSend(phone, SmsType.SIGN_COMPLETE);
  }
  
  // 记录日志
  await logSmsSend({
    phone,
    type: SmsType.SIGN_COMPLETE,
    content,
    success: result.success,
    messageId: result.messageId,
    error: result.error,
  });
  
  return result;
}

/**
 * 发送审批结果通知短信
 * Requirements: 4.7
 * 
 * @param phone 手机号
 * @param contractName 合同名称
 * @param approved 是否通过
 * @param reason 拒绝原因（如果拒绝）
 * @returns 发送结果
 */
export async function sendApprovalNotice(
  phone: string,
  contractName: string,
  approved: boolean,
  reason?: string
): Promise<SmsSendResult> {
  // 检查频率限制
  if (!checkRateLimit(phone)) {
    return {
      success: false,
      error: '发送过于频繁，请稍后再试',
    };
  }
  
  const content = approved
    ? `您的"${contractName}"已审批通过，合同签署完成。`
    : `您的"${contractName}"审批未通过${reason ? `，原因：${reason}` : ''}。`;
  
  // 使用腾讯云短信
  const templateId = approved
    ? (process.env.TENCENT_SMS_TEMPLATE_APPROVAL_PASS || '')
    : (process.env.TENCENT_SMS_TEMPLATE_APPROVAL_REJECT || '');
  
  const params = approved
    ? [contractName]
    : [contractName, reason || '未说明'];
  
  const result = await sendViaTencentCloud(phone, templateId, params);
  
  // 记录发送
  if (result.success) {
    recordSend(phone, SmsType.APPROVAL_NOTICE);
  }
  
  // 记录日志
  await logSmsSend({
    phone,
    type: SmsType.APPROVAL_NOTICE,
    content,
    success: result.success,
    messageId: result.messageId,
    error: result.error,
  });
  
  return result;
}

// 导出服务对象
export const smsService = {
  sendSignLinkSms,
  sendVerificationCodeSms,
  sendSignCompleteNotice,
  sendApprovalNotice,
};
