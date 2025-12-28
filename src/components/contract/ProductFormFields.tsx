'use client';

import { Form, Input, InputNumber, DatePicker, Select, Typography } from 'antd';
import type { FormInstance } from 'antd';
import type { Rule } from 'antd/es/form';
import type { FormFieldConfig } from '@/services/product.service';
import type { Dayjs } from 'dayjs';

const { Text } = Typography;

interface ProductFormFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: FormInstance<any>;
  formFields: FormFieldConfig[] | null;
  disabled?: boolean;
}

/**
 * 产品表单字段组件
 * 根据产品配置动态渲染表单字段
 */
export default function ProductFormFields({
  formFields,
  disabled = false,
}: ProductFormFieldsProps) {
  if (!formFields || formFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Text strong className="text-base">
          合同信息
        </Text>
        <Text type="secondary" className="text-sm block mt-1">
          请填写以下合同相关信息
        </Text>
      </div>

      {formFields.map((field) => {
        const fieldName = `formData.${field.name}`;

        // 构建验证规则
        const rules: Rule[] = [];
        
        if (field.required) {
          rules.push({
            required: true,
            message: `请输入${field.label}`,
          });
        }

        // 根据字段类型渲染不同的输入组件
        let inputComponent;

        switch (field.type) {
          case 'number':
            inputComponent = (
              <InputNumber
                placeholder={`请输入${field.label}`}
                disabled={disabled}
                size="large"
                className="w-full"
                style={{ width: '100%' }}
              />
            );
            break;

          case 'date':
            inputComponent = (
              <DatePicker
                placeholder={`请选择${field.label}`}
                disabled={disabled}
                size="large"
                className="w-full"
                format="YYYY-MM-DD"
              />
            );
            // 日期字段需要特殊处理值转换
            if (field.required) {
              rules.push({
                validator: (_: unknown, value: Dayjs | null) => {
                  if (!value) {
                    return Promise.reject(new Error(`请选择${field.label}`));
                  }
                  return Promise.resolve();
                },
              });
            }
            break;

          case 'select':
            if (!field.options || field.options.length === 0) {
              inputComponent = (
                <Input
                  placeholder={`请输入${field.label}`}
                  disabled={disabled}
                  size="large"
                />
              );
            } else {
              inputComponent = (
                <Select
                  placeholder={`请选择${field.label}`}
                  disabled={disabled}
                  size="large"
                  options={field.options.map((option) => ({
                    label: option,
                    value: option,
                  }))}
                />
              );
            }
            break;

          case 'text':
          default:
            inputComponent = (
              <Input
                placeholder={field.defaultValue || `请输入${field.label}`}
                disabled={disabled}
                size="large"
              />
            );
            break;
        }

        return (
          <Form.Item
            key={field.name}
            name={fieldName}
            label={field.label}
            rules={rules}
            initialValue={field.defaultValue}
            extra={
              field.required ? (
                <Text type="secondary" className="text-xs">
                  必填项
                </Text>
              ) : (
                <Text type="secondary" className="text-xs">
                  选填项
                </Text>
              )
            }
          >
            {inputComponent}
          </Form.Item>
        );
      })}
    </div>
  );
}

