'use client';

import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConfigProvider locale={zhCN}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        {children}
      </div>
    </ConfigProvider>
  );
}
