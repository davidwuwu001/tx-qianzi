'use client';

import { useState, Suspense } from 'react';
import { Card, Tabs, Form, Input, Button, message, Spin, Select } from 'antd';
import { UserOutlined, LockOutlined, MobileOutlined, SafetyOutlined, CrownOutlined, TeamOutlined } from '@ant-design/icons';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

interface PasswordFormValues {
  username: string;
  password: string;
}

interface CodeFormValues {
  phone: string;
  code: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const [codeForm] = Form.useForm<CodeFormValues>();
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [adminType, setAdminType] = useState<'system' | 'city'>('system');

  // 用户名密码登录
  const handlePasswordLogin = async (values: PasswordFormValues) => {
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        username: values.username,
        password: values.password,
        adminType: adminType,
        loginType: 'password',
        redirect: false,
      });

      if (result?.error) {
        message.error(result.error);
      } else {
        message.success('登录成功');
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      message.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 发送验证码
  const handleSendCode = async () => {
    try {
      await codeForm.validateFields(['phone']);
      const phone = codeForm.getFieldValue('phone');
      
      setSendingCode(true);
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        message.success('验证码已发送');
        // 开始倒计时
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        message.error(data.error || '发送验证码失败');
      }
    } catch {
      // 表单验证失败，不做处理
    } finally {
      setSendingCode(false);
    }
  };

  // 验证码登录
  const handleCodeLogin = async (values: CodeFormValues) => {
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        phone: values.phone,
        code: values.code,
        adminType: adminType,
        loginType: 'code',
        redirect: false,
      });

      if (result?.error) {
        message.error(result.error);
      } else {
        message.success('登录成功');
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      message.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'password',
      label: '账号密码登录',
      children: (
        <Form
          form={passwordForm}
          onFinish={handlePasswordLogin}
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder={adminType === 'system' ? '系统管理员用户名' : '城市管理员用户名'}
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="密码"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'code',
      label: '手机验证码登录',
      children: (
        <Form
          form={codeForm}
          onFinish={handleCodeLogin}
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input
              prefix={<MobileOutlined className="text-gray-400" />}
              placeholder="手机号"
              maxLength={11}
            />
          </Form.Item>
          <Form.Item
            name="code"
            rules={[
              { required: true, message: '请输入验证码' },
              { len: 6, message: '验证码为6位数字' },
            ]}
          >
            <Input
              prefix={<SafetyOutlined className="text-gray-400" />}
              placeholder="验证码"
              maxLength={6}
              suffix={
                <Button
                  type="link"
                  size="small"
                  disabled={countdown > 0 || sendingCode}
                  loading={sendingCode}
                  onClick={handleSendCode}
                  style={{ padding: 0 }}
                >
                  {countdown > 0 ? `${countdown}秒后重发` : '获取验证码'}
                </Button>
              }
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <Card className="w-full max-w-md shadow-lg" variant="outlined">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">腾讯电子签便捷签约系统</h1>
        <p className="text-gray-500 mt-2">请登录您的账户</p>
      </div>
      
      {/* 管理员类型选择 */}
      <div className="mb-4">
        <Select
          value={adminType}
          onChange={setAdminType}
          size="large"
          className="w-full"
          options={[
            {
              value: 'system',
              label: (
                <div className="flex items-center">
                  <CrownOutlined className="mr-2 text-yellow-500" />
                  系统管理员
                </div>
              ),
            },
            {
              value: 'city',
              label: (
                <div className="flex items-center">
                  <TeamOutlined className="mr-2 text-blue-500" />
                  城市管理员
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* 管理员类型提示 */}
      {adminType === 'system' ? (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            <CrownOutlined className="mr-1" />
            系统管理员 - 拥有所有管理权限
          </p>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <TeamOutlined className="mr-1" />
            城市管理员 - 管理所属城市的签约业务
          </p>
        </div>
      )}

      {/* 登录方式 Tab */}
      <Tabs items={tabItems} centered />
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card className="w-full max-w-md shadow-lg" variant="outlined">
        <div className="text-center py-12">
          <Spin size="large" />
          <p className="text-gray-500 mt-4">加载中...</p>
        </div>
      </Card>
    }>
      <LoginForm />
    </Suspense>
  );
}
