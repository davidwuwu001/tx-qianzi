/**
 * 表单字段配置类型定义
 * 用于动态合同表单配置系统
 */

// 字段类型枚举
export type FieldType = 'text' | 'number' | 'date' | 'select';

// 填写方枚举
// INITIATOR: 发起方填写（普通用户在移动端发起签约时填写）
// SIGNER: 签署方填写（乙方在腾讯电子签签署页面填写）
export type FieldFiller = 'INITIATOR' | 'SIGNER';

// 下拉选项
export interface SelectOption {
  label: string;  // 显示文本
  value: string;  // 选项值
}

// 表单字段配置
export interface FormFieldConfig {
  name: string;           // 字段名（对应模板控件名，不可修改）
  label: string;          // 显示名称（可编辑）
  type: FieldType;        // 字段类型
  filler: FieldFiller;    // 填写方：发起方 or 签署方
  required: boolean;      // 是否必填
  defaultValue?: string;  // 默认值
  placeholder?: string;   // 占位提示
  options?: SelectOption[]; // 下拉选项（type=select时必填）
  // 从模板获取的原始信息（只读）
  componentId?: string;   // 模板控件ID
  componentType?: string; // 模板控件类型
}

// 产品字段配置结构
// 存储在 Product.formFields 字段中
export interface ProductFormFields {
  initiatorFields: FormFieldConfig[];  // 发起方填写的字段
  signerFields: FormFieldConfig[];     // 签署方填写的字段
}

// 腾讯电子签模板控件类型（用于过滤）
// 填写控件：TEXT, MULTI_LINE_TEXT, NUMBER, DATE, SELECT
// 签署控件：SIGN, SEAL, DATE_SIGN（需要排除）
export const FILLABLE_COMPONENT_TYPES = [
  'TEXT',
  'MULTI_LINE_TEXT', 
  'NUMBER',
  'DATE',
  'SELECT',
] as const;

export const SIGN_COMPONENT_TYPES = [
  'SIGN',
  'SEAL',
  'DATE_SIGN',
  'SIGN_SEAL',
  'SIGN_DATE',
  'SIGN_SIGNATURE',
] as const;

// 模板控件类型到系统字段类型的映射
export const COMPONENT_TYPE_MAP: Record<string, FieldType> = {
  'TEXT': 'text',
  'MULTI_LINE_TEXT': 'text',
  'NUMBER': 'number',
  'DATE': 'date',
  'SELECT': 'select',
};

// 字段类型到 UI 组件的映射
export const FIELD_TYPE_COMPONENT_MAP = {
  'text': 'Input',
  'number': 'InputNumber',
  'date': 'DatePicker',
  'select': 'Select',
} as const;
