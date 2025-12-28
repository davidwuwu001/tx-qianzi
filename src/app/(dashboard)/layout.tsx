'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { SessionProvider } from 'next-auth/react';
import {
  Layout,
  Menu,
  Dropdown,
  Avatar,
  Spin,
  ConfigProvider,
  App,
  theme,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  FileTextOutlined,
  PlusCircleOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  TeamOutlined,
  AppstoreOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';

const { Header, Sider, Content } = Layout;

// 菜单项配置
const getMenuItems = (role: string): MenuProps['items'] => {
  const baseItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/contracts',
      icon: <FileTextOutlined />,
      label: '签约管理',
    },
    {
      key: '/contracts/new',
      icon: <PlusCircleOutlined />,
      label: '发起签约',
    },
  ];

  // 系统管理员额外菜单
  if (role === 'SYSTEM_ADMIN') {
    return [
      ...baseItems,
      {
        type: 'divider',
      },
      {
        key: '/cities',
        icon: <EnvironmentOutlined />,
        label: '城市管理',
      },
      {
        key: '/products',
        icon: <AppstoreOutlined />,
        label: '产品管理',
      },
      {
        key: '/users',
        icon: <TeamOutlined />,
        label: '用户管理',
      },
    ];
  }

  return baseItems;
};

// 内部布局组件（需要 session）
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  // 加载中状态
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spin size="large" />
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  // 未登录重定向
  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  const user = session?.user;
  const menuItems = getMenuItems(user?.role || '');

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: () => {
        signOut({ callbackUrl: '/login' });
      },
    },
  ];

  // 处理菜单点击
  const handleMenuClick: MenuProps['onClick'] = (e) => {
    router.push(e.key);
  };

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    // 精确匹配
    if (pathname === '/') return ['/'];
    if (pathname === '/contracts/new') return ['/contracts/new'];
    if (pathname === '/contracts') return ['/contracts'];
    if (pathname?.startsWith('/contracts/')) return ['/contracts'];
    if (pathname === '/cities') return ['/cities'];
    if (pathname === '/products') return ['/products'];
    if (pathname === '/users') return ['/users'];
    return [pathname || '/'];
  };

  return (
    <Layout className="min-h-screen">
      {/* 侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="!bg-white shadow-sm"
        width={220}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-100">
          {collapsed ? (
            <span className="text-xl font-bold text-blue-600">签</span>
          ) : (
            <span className="text-lg font-semibold text-gray-800">
              电子签约系统
            </span>
          )}
        </div>

        {/* 导航菜单 */}
        <Menu
          mode="inline"
          selectedKeys={getSelectedKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          className="border-r-0 mt-2"
        />
      </Sider>

      <Layout>
        {/* 顶部栏 */}
        <Header className="!bg-white !px-4 flex items-center justify-between shadow-sm">
          {/* 左侧：折叠按钮 */}
          <div
            className="cursor-pointer text-lg text-gray-600 hover:text-blue-600 transition-colors"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>

          {/* 右侧：用户信息 */}
          <div className="flex items-center gap-4">
            {/* 城市标签 */}
            {user?.cityName && (
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                <EnvironmentOutlined className="mr-1" />
                {user.cityName}
              </span>
            )}

            {/* 用户下拉菜单 */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-3 py-1 rounded-lg transition-colors">
                <Avatar
                  size="small"
                  icon={<UserOutlined />}
                  className="bg-blue-500"
                />
                <span className="text-gray-700">{user?.name || '用户'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* 内容区域 */}
        <Content className="m-4 p-6 bg-white rounded-lg shadow-sm min-h-[calc(100vh-112px)]">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

// 导出的布局组件（包含 Provider）
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 6,
          },
        }}
      >
        <App>
          <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </App>
      </ConfigProvider>
    </SessionProvider>
  );
}
