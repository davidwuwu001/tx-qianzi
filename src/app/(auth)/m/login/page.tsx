'use client';

import { useState, useEffect, Suspense } from 'react';
import { Form, Input, Button, message, Checkbox, Spin } from 'antd';
import { MobileOutlined, SafetyOutlined } from '@ant-design/icons';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

interface LoginFormValues {
  phone: string;
  code: string;
  remember?: boolean;
}

// 登录表单组件（使用 useSearchParams）
function LoginForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/m';

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 发送验证码
  const handleSendCode = async () => {
    try {
      const phone = form.getFieldValue('phone');
      if (!phone) {
        message.error('请输入手机号');
        return;
      }
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        message.error('请输入正确的手机号');
        return;
      }

      setSendingCode(true);
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      if (data.success) {
        message.success('验证码已发送');
        setCountdown(60);
      } else {
        message.error(data.error || '发送失败');
      }
    } catch {
      message.error('发送验证码失败');
    } finally {
      setSendingCode(false);
    }
  };

  // 登录
  const handleLogin = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        phone: values.phone,
        code: values.code,
        loginType: 'code',
        redirect: false,
      });

      if (result?.error) {
        message.error(result.error === 'CredentialsSignin' ? '验证码错误或已过期' : result.error);
      } else {
        message.success('登录成功');
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      message.error('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-t-3xl px-6 py-8 shadow-lg">
      <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">手机号登录</h2>
      
      <Form
        form={form}
        onFinish={handleLogin}
        layout="vertical"
        size="large"
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
            placeholder="请输入手机号"
            maxLength={11}
            className="h-12 rounded-lg"
            inputMode="numeric"
          />
        </Form.Item>

        <Form.Item
          name="code"
          rules={[
            { required: true, message: '请输入验证码' },
            { len: 6, message: '验证码为6位数字' },
          ]}
        >
          <div className="flex gap-3">
            <Input
              prefix={<SafetyOutlined className="text-gray-400" />}
              placeholder="请输入验证码"
              maxLength={6}
              className="h-12 rounded-lg flex-1"
              inputMode="numeric"
            />
            <Button
              onClick={handleSendCode}
              loading={sendingCode}
              disabled={countdown > 0}
              className="h-12 px-4 rounded-lg whitespace-nowrap"
            >
              {countdown > 0 ? `${countdown}s` : '获取验证码'}
            </Button>
          </div>
        </Form.Item>

        <Form.Item name="remember" valuePropName="checked">
          <Checkbox>记住登录状态</Checkbox>
        </Form.Item>

        <Form.Item className="mb-0">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            className="h-12 rounded-lg text-base font-medium"
          >
            登录
          </Button>
        </Form.Item>
      </Form>

      <div className="mt-6 text-center text-gray-400 text-xs">
        <p>登录即表示同意《用户协议》和《隐私政策》</p>
      </div>
    </div>
  );
}

// 加载状态组件
function LoginFormFallback() {
  return (
    <div className="bg-white rounded-t-3xl px-6 py-8 shadow-lg flex items-center justify-center min-h-[300px]">
      <Spin size="large" />
    </div>
  );
}

// 主页面组件
export default function MobileLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-500 to-blue-600 flex flex-col">
      {/* 顶部Logo区域 */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-12">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
          <span className="text-3xl">📝</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">便捷签约</h1>
        <p className="text-blue-100 text-sm">腾讯电子签便捷签约系统</p>
      </div>

      {/* 登录表单区域 - 使用 Suspense 包裹 */}
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
