'use client';

import { Form, Input, Radio, Space, Typography } from 'antd';
import type { FormInstance } from 'antd';
import {
  UserOutlined,
  MobileOutlined,
  IdcardOutlined,
  BankOutlined,
} from '@ant-design/icons';
import {
  validatePartyBName,
  validatePhone,
  validateIdCard,
  type PartyType,
} from '@/lib/validators';

const { Text } = Typography;

// 乙方信息表单值
export interface PartyBFormValues {
  partyBName: string;
  partyBPhone: string;
  partyBIdCard?: string;
  partyBType: PartyType;
  partyBOrgName?: string;
}

interface PartyBFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: FormInstance<any>;
  disabled?: boolean;
}

/**
 * 乙方信息表单组件
 * 实现姓名、手机号、身份证号输入
 * 实现实时验证和错误提示
 * Requirements: 2.3, 2.4
 */
export default function PartyBForm({ form, disabled = false }: PartyBFormProps) {
  const partyBType = Form.useWatch('partyBType', form);

  // 姓名验证规则
  const nameValidator = (_: unknown, value: string) => {
    if (!value || value.trim().length === 0) {
      return Promise.reject(new Error('请输入姓名'));
    }
    const result = validatePartyBName(value);
    if (!result.valid) {
      return Promise.reject(new Error(result.error));
    }
    return Promise.resolve();
  };

  // 手机号验证规则
  const phoneValidator = (_: unknown, value: string) => {
    if (!value || value.trim().length === 0) {
      return Promise.reject(new Error('请输入手机号'));
    }
    const result = validatePhone(value);
    if (!result.valid) {
      return Promise.reject(new Error(result.error));
    }
    return Promise.resolve();
  };

  // 身份证号验证规则（可选字段）
  const idCardValidator = (_: unknown, value: string) => {
    if (!value || value.trim().length === 0) {
      return Promise.resolve(); // 身份证号可选
    }
    const result = validateIdCard(value);
    if (!result.valid) {
      return Promise.reject(new Error(result.error));
    }
    return Promise.resolve();
  };

  // 企业名称验证规则
  const orgNameValidator = (_: unknown, value: string) => {
    if (partyBType !== 'ENTERPRISE') {
      return Promise.resolve();
    }
    if (!value || value.trim().length === 0) {
      return Promise.reject(new Error('请输入企业名称'));
    }
    if (value.trim().length < 2) {
      return Promise.reject(new Error('企业名称长度不能少于2个字符'));
    }
    if (value.trim().length > 100) {
      return Promise.reject(new Error('企业名称长度不能超过100个字符'));
    }
    return Promise.resolve();
  };

  return (
    <div className="space-y-4">
      {/* 乙方类型选择 */}
      <Form.Item
        name="partyBType"
        label="乙方类型"
        initialValue="PERSONAL"
        rules={[{ required: true, message: '请选择乙方类型' }]}
      >
        <Radio.Group disabled={disabled}>
          <Space orientation="horizontal">
            <Radio value="PERSONAL">
              <Space>
                <UserOutlined />
                个人
              </Space>
            </Radio>
            <Radio value="ENTERPRISE">
              <Space>
                <BankOutlined />
                企业
              </Space>
            </Radio>
          </Space>
        </Radio.Group>
      </Form.Item>

      {/* 企业名称（仅企业类型显示） */}
      {partyBType === 'ENTERPRISE' && (
        <Form.Item
          name="partyBOrgName"
          label="企业名称"
          rules={[{ validator: orgNameValidator }]}
        >
          <Input
            prefix={<BankOutlined className="text-gray-400" />}
            placeholder="请输入企业名称"
            maxLength={100}
            disabled={disabled}
            size="large"
          />
        </Form.Item>
      )}

      {/* 签署人姓名 */}
      <Form.Item
        name="partyBName"
        label={partyBType === 'ENTERPRISE' ? '签署人姓名' : '姓名'}
        rules={[{ validator: nameValidator }]}
        validateTrigger={['onChange', 'onBlur']}
      >
        <Input
          prefix={<UserOutlined className="text-gray-400" />}
          placeholder={partyBType === 'ENTERPRISE' ? '请输入签署人姓名' : '请输入姓名'}
          maxLength={50}
          disabled={disabled}
          size="large"
        />
      </Form.Item>

      {/* 手机号 */}
      <Form.Item
        name="partyBPhone"
        label="手机号"
        rules={[{ validator: phoneValidator }]}
        validateTrigger={['onChange', 'onBlur']}
        extra={
          <Text type="secondary" className="text-xs">
            签署链接将发送至此手机号
          </Text>
        }
      >
        <Input
          prefix={<MobileOutlined className="text-gray-400" />}
          placeholder="请输入手机号"
          maxLength={11}
          disabled={disabled}
          size="large"
        />
      </Form.Item>

      {/* 身份证号（可选） */}
      <Form.Item
        name="partyBIdCard"
        label="身份证号"
        rules={[{ validator: idCardValidator }]}
        validateTrigger={['onChange', 'onBlur']}
        extra={
          <Text type="secondary" className="text-xs">
            选填，用于实名认证
          </Text>
        }
      >
        <Input
          prefix={<IdcardOutlined className="text-gray-400" />}
          placeholder="请输入身份证号（选填）"
          maxLength={18}
          disabled={disabled}
          size="large"
        />
      </Form.Item>
    </div>
  );
}
