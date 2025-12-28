'use client';

import { useState } from 'react';
import { Card, Button, Modal, message, Spin } from 'antd';
import { 
  UserOutlined, 
  PhoneOutlined, 
  EnvironmentOutlined,
  LogoutOutlined,
  RightOutlined,
  FileTextOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function MobileProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/m/login');
    return null;
  }

  const handleLogout = async () => {
    await signOut({ redirect: false });
    message.success('已退出登录');
    router.push('/m/login');
  };

  const menuItems = [
    {
      icon: <FileTextOutlined className="text-blue-500" />,
      label: '我的签约',
      onClick: () => router.push('/m/contracts'),
    },
    {
      icon: <QuestionCircleOutlined className="text-green-500" />,
      label: '使用帮助',
      onClick: () => message.info('帮助文档开发中'),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 用户信息卡片 */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 pt-12 pb-8">
        <div className="flex items-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
            <UserOutlined className="text-3xl text-blue-500" />
          </div>
          <div className="ml-4 text-white">
            <h2 className="text-xl font-semibold">{session?.user?.name || '用户'}</h2>
            <p className="text-blue-100 text-sm mt-1">普通用户</p>
          </div>
        </div>
      </div>

      {/* 基本信息 */}
      <div className="px-4 -mt-4">
        <Card className="rounded-xl shadow-sm">
          <h3 className="font-medium text-gray-800 mb-4">基本信息</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <PhoneOutlined className="text-gray-400 mr-3" />
              <div>
                <p className="text-xs text-gray-400">手机号</p>
                <p className="text-gray-800">{session?.user?.phone || '-'}</p>
              </div>
            </div>
            <div className="flex items-center">
              <EnvironmentOutlined className="text-gray-400 mr-3" />
              <div>
                <p className="text-xs text-gray-400">所属城市</p>
                <p className="text-gray-800">{session?.user?.cityName || '-'}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 功能菜单 */}
      <div className="px-4 mt-4">
        <Card className="rounded-xl">
          {menuItems.map((item, index) => (
            <div
              key={index}
              className={`flex items-center justify-between py-3 cursor-pointer ${
                index < menuItems.length - 1 ? 'border-b border-gray-100' : ''
              }`}
              onClick={item.onClick}
            >
              <div className="flex items-center">
                <span className="text-lg mr-3">{item.icon}</span>
                <span className="text-gray-800">{item.label}</span>
              </div>
              <RightOutlined className="text-gray-300" />
            </div>
          ))}
        </Card>
      </div>

      {/* 退出登录 */}
      <div className="px-4 mt-4">
        <Button
          type="default"
          danger
          icon={<LogoutOutlined />}
          block
          size="large"
          className="rounded-xl h-12"
          onClick={() => setShowLogoutModal(true)}
        >
          退出登录
        </Button>
      </div>

      {/* 版本信息 */}
      <div className="text-center mt-8 text-gray-400 text-xs">
        <p>便捷签约系统 v1.0.0</p>
        <p className="mt-1">基于腾讯电子签</p>
      </div>

      {/* 退出确认弹窗 */}
      <Modal
        title="确认退出"
        open={showLogoutModal}
        onOk={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
        okText="确认退出"
        cancelText="取消"
        centered
      >
        <p>确定要退出登录吗？</p>
      </Modal>
    </div>
  );
}
