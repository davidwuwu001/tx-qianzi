'use client';

/**
 * 动态表单组件
 * 根据产品的字段配置动态渲染表单
 * 
 * 这个组件就像一个"智能表单生成器"：
 * - 根据配置自动生成不同类型的输入框
 * - 支持文本、数字、日期、下拉选择四种类型
 * - 自动处理必填验证和默认值
 * 
 * Requirements: 4.1, 4.2, 4.4, 4.5
 */

import { useEffect } from 'react';
import { Form, Input, InputNumber, DatePicker, Select, Spin, Empty } from 'antd';
import type { FormInstance } from 'antd';
import type { FormFieldConfig } from '@/types/form-field';
import dayjs from 'dayjs';

// 组件属性
interface DynamicFormProps {
  /** 字段配置列表 */
  fields: FormFieldConfig[];
  /** Ant Design 表单实例 */
  form: FormInstance;
  /** 是否正在加载 */
  loading?: boolean;
  /** 表单值变化回调 */
  onChange?: (values: Record<string, unknown>) => void;
  /** 是否禁用所有字段 */
  disabled?: boolean;
}

/**
 * 动态表单组件
 * 根据字段配置自动渲染对应的表单控件
 */
export default function DynamicForm({
  fields,
  form,
  loading = false,
  onChange,
  disabled = false,
}: DynamicFormProps) {
  // 设置默认值
  useEffect(() => {
    if (fields.length === 0) return;

    // 收集所有有默认值的字段
    const defaultValues: Record<string, unknown> = {};
    fields.forEach((field) => {
      if (field.defaultValue !== undefined && field.defaultValue !== '') {
        // 根据字段类型转换默认值
        if (field.type === 'date') {
          // 日期类型需要转换为 dayjs 对象
          defaultValues[field.name] = dayjs(field.defaultValue);
        } else if (field.type === 'number') {
          // 数字类型转换为数字
          defaultValues[field.name] = Number(field.defaultValue);
        } else {
          defaultValues[field.name] = field.defaultValue;
        }
      }
    });

    // 只设置还没有值的字段
    const currentValues = form.getFieldsValue();
    const valuesToSet: Record<string, unknown> = {};
    Object.entries(defaultValues).forEach(([key, value]) => {
      if (currentValues[key] === undefined || currentValues[key] === null || currentValues[key] === '') {
        valuesToSet[key] = value;
      }
    });

    if (Object.keys(valuesToSet).length > 0) {
      form.setFieldsValue(valuesToSet);
    }
  }, [fields, form]);

  // 监听表单值变化
  const handleValuesChange = (_: unknown, allValues: Record<string, unknown>) => {
    onChange?.(allValues);
  };

  // 加载中状态
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spin tip="加载字段配置..." />
      </div>
    );
  }

  // 没有字段配置
  if (fields.length === 0) {
    return null;
  }

  // 渲染单个字段
  const renderField = (field: FormFieldConfig) => {
    const { name, label, type, required, placeholder, options } = field;

    // 构建验证规则
    const rules = [];
    if (required) {
      rules.push({ required: true, message: `请${type === 'select' ? '选择' : '输入'}${label}` });
    }

    // 根据类型渲染不同的控件
    switch (type) {
      case 'text':
        return (
          <Form.Item
            key={name}
            name={name}
            label={label}
            rules={rules}
          >
            <Input
              placeholder={placeholder || `请输入${label}`}
              disabled={disabled}
              size="large"
            />
          </Form.Item>
        );

      case 'number':
        return (
          <Form.Item
            key={name}
            name={name}
            label={label}
            rules={rules}
          >
            <InputNumber
              placeholder={placeholder || `请输入${label}`}
              disabled={disabled}
              size="large"
              style={{ width: '100%' }}
            />
          </Form.Item>
        );

      case 'date':
        return (
          <Form.Item
            key={name}
            name={name}
            label={label}
            rules={rules}
          >
            <DatePicker
              placeholder={placeholder || `请选择${label}`}
              disabled={disabled}
              size="large"
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
            />
          </Form.Item>
        );

      case 'select':
        return (
          <Form.Item
            key={name}
            name={name}
            label={label}
            rules={rules}
          >
            <Select
              placeholder={placeholder || `请选择${label}`}
              disabled={disabled}
              size="large"
              options={options?.map((opt) => ({
                label: opt.label,
                value: opt.value,
              }))}
            />
          </Form.Item>
        );

      default:
        // 未知类型默认使用文本输入
        return (
          <Form.Item
            key={name}
            name={name}
            label={label}
            rules={rules}
          >
            <Input
              placeholder={placeholder || `请输入${label}`}
              disabled={disabled}
              size="large"
            />
          </Form.Item>
        );
    }
  };

  return (
    <>
      {fields.map(renderField)}
    </>
  );
}

/**
 * 验证动态表单数据
 * 检查必填字段是否都已填写
 * 
 * @param fields 字段配置
 * @param values 表单值
 * @returns 验证结果
 */
export function validateDynamicFormData(
  fields: FormFieldConfig[],
  values: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  fields.forEach((field) => {
    if (field.required) {
      const value = values[field.name];
      // 检查值是否为空
      if (value === undefined || value === null || value === '') {
        errors.push(`${field.label}不能为空`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 将表单数据转换为腾讯电子签 API 的 FormFields 格式
 * 
 * 腾讯电子签 API 需要的格式：
 * [{ ComponentName: "字段名", ComponentValue: "字段值" }, ...]
 * 
 * @param fields 字段配置
 * @param values 表单值
 * @returns API 格式的字段数组
 */
export function buildFormFieldsForDocument(
  fields: FormFieldConfig[],
  values: Record<string, unknown>
): Array<{ ComponentName: string; ComponentValue: string }> {
  return fields
    .filter((field) => {
      // 只包含有值的字段
      const value = values[field.name];
      return value !== undefined && value !== null && value !== '';
    })
    .map((field) => {
      let value = values[field.name];

      // 日期类型需要格式化
      if (field.type === 'date' && value) {
        // 如果是 dayjs 对象，格式化为字符串
        if (typeof value === 'object' && 'format' in value) {
          value = (value as { format: (f: string) => string }).format('YYYY-MM-DD');
        }
      }

      return {
        ComponentName: field.name,
        ComponentValue: String(value),
      };
    });
}
