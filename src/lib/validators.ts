/**
 * 乙方信息验证模块
 * 实现姓名、手机号、身份证号的验证逻辑
 * Requirements: 2.3, 2.4
 */

// 乙方类型枚举（与 Prisma 保持一致）
export type PartyType = 'PERSONAL' | 'ENTERPRISE';

// 验证结果接口
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// 乙方信息接口（用于验证）
export interface PartyBInfoForValidation {
  name: string;
  phone: string;
  idCard?: string;
  type?: PartyType;
  orgName?: string;
}

/**
 * 验证乙方姓名
 * - 姓名不能为空
 * - 姓名长度在2-50个字符之间
 * - 只允许中文、英文字母和空格
 */
export function validatePartyBName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "姓名不能为空" };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    return { valid: false, error: "姓名长度不能少于2个字符" };
  }

  if (trimmedName.length > 50) {
    return { valid: false, error: "姓名长度不能超过50个字符" };
  }

  // 只允许中文、英文字母和空格
  const namePattern = /^[\u4e00-\u9fa5a-zA-Z\s]+$/;
  if (!namePattern.test(trimmedName)) {
    return { valid: false, error: "姓名只能包含中文、英文字母和空格" };
  }

  return { valid: true };
}

/**
 * 验证手机号
 * - 必须是中国大陆手机号格式
 * - 以1开头，第二位是3-9，共11位数字
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone || phone.trim().length === 0) {
    return { valid: false, error: "手机号不能为空" };
  }

  const trimmedPhone = phone.trim();

  // 中国大陆手机号正则：1[3-9]开头，共11位
  const phonePattern = /^1[3-9]\d{9}$/;
  if (!phonePattern.test(trimmedPhone)) {
    return { valid: false, error: "请输入有效的手机号码" };
  }

  return { valid: true };
}

/**
 * 验证身份证号
 * - 支持15位和18位身份证号
 * - 18位身份证号最后一位可以是X
 * - 验证校验码（18位）
 */
export function validateIdCard(idCard: string): ValidationResult {
  if (!idCard || idCard.trim().length === 0) {
    return { valid: false, error: "身份证号不能为空" };
  }

  const trimmedIdCard = idCard.trim().toUpperCase();

  // 15位身份证号（旧版）
  if (trimmedIdCard.length === 15) {
    const pattern15 = /^\d{15}$/;
    if (!pattern15.test(trimmedIdCard)) {
      return { valid: false, error: "15位身份证号格式不正确" };
    }
    return { valid: true };
  }

  // 18位身份证号
  if (trimmedIdCard.length === 18) {
    const pattern18 = /^\d{17}[\dX]$/;
    if (!pattern18.test(trimmedIdCard)) {
      return { valid: false, error: "18位身份证号格式不正确" };
    }

    // 验证校验码
    if (!validateIdCardChecksum(trimmedIdCard)) {
      return { valid: false, error: "身份证号校验码不正确" };
    }

    return { valid: true };
  }

  return { valid: false, error: "身份证号长度必须是15位或18位" };
}

/**
 * 验证18位身份证号的校验码
 * 使用ISO 7064:1983, MOD 11-2校验算法
 */
function validateIdCardChecksum(idCard: string): boolean {
  // 加权因子
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  // 校验码对应值
  const checkCodes = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(idCard[i], 10) * weights[i];
  }

  const checkIndex = sum % 11;
  const expectedCheckCode = checkCodes[checkIndex];

  return idCard[17] === expectedCheckCode;
}

/**
 * 验证完整的乙方信息
 * - 姓名必填
 * - 手机号必填
 * - 身份证号可选，但如果提供则必须有效
 * - 如果是企业类型，企业名称必填
 */
export function validatePartyBInfo(info: PartyBInfoForValidation): ValidationResult {
  // 验证姓名
  const nameResult = validatePartyBName(info.name);
  if (!nameResult.valid) {
    return nameResult;
  }

  // 验证手机号
  const phoneResult = validatePhone(info.phone);
  if (!phoneResult.valid) {
    return phoneResult;
  }

  // 验证身份证号（如果提供）
  if (info.idCard && info.idCard.trim().length > 0) {
    const idCardResult = validateIdCard(info.idCard);
    if (!idCardResult.valid) {
      return idCardResult;
    }
  }

  // 如果是企业类型，验证企业名称
  if (info.type === "ENTERPRISE") {
    if (!info.orgName || info.orgName.trim().length === 0) {
      return { valid: false, error: "企业名称不能为空" };
    }
    if (info.orgName.trim().length < 2) {
      return { valid: false, error: "企业名称长度不能少于2个字符" };
    }
    if (info.orgName.trim().length > 100) {
      return { valid: false, error: "企业名称长度不能超过100个字符" };
    }
  }

  return { valid: true };
}

/**
 * 批量验证结果接口
 */
export interface BatchValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * 批量验证乙方信息，返回所有字段的错误
 * 用于表单验证时一次性显示所有错误
 */
export function validatePartyBInfoBatch(info: PartyBInfoForValidation): BatchValidationResult {
  const errors: Record<string, string> = {};

  // 验证姓名
  const nameResult = validatePartyBName(info.name);
  if (!nameResult.valid && nameResult.error) {
    errors.name = nameResult.error;
  }

  // 验证手机号
  const phoneResult = validatePhone(info.phone);
  if (!phoneResult.valid && phoneResult.error) {
    errors.phone = phoneResult.error;
  }

  // 验证身份证号（如果提供）
  if (info.idCard && info.idCard.trim().length > 0) {
    const idCardResult = validateIdCard(info.idCard);
    if (!idCardResult.valid && idCardResult.error) {
      errors.idCard = idCardResult.error;
    }
  }

  // 如果是企业类型，验证企业名称
  if (info.type === "ENTERPRISE") {
    if (!info.orgName || info.orgName.trim().length === 0) {
      errors.orgName = "企业名称不能为空";
    } else if (info.orgName.trim().length < 2) {
      errors.orgName = "企业名称长度不能少于2个字符";
    } else if (info.orgName.trim().length > 100) {
      errors.orgName = "企业名称长度不能超过100个字符";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
