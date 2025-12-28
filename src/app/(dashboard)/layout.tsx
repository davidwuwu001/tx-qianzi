'use client';

import { useState, useEffect } from 'react';
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
  Drawer,
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
  CloseOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import { useResponsive, MOBILE_BREAKPOINT } from '@/hooks/useResponsive';

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
  const { isMobile } = useResponsive();
  
  // 侧边栏折叠状态（桌面端）
  const [collapsed, setCollapsed] = useState(false);
  // 抽屉可见状态（移动端）
  const [drawerVisible, setDrawerVisible] = useState(false);

  // 切换到桌面端时自动关闭抽屉
  useEffect(() => {
    if (!isMobile && drawerVisible) {
      setDrawerVisible(false);
    }
  }, [isMobile, drawerVisible]);

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
    // 移动端点击菜单后关闭抽屉
    if (isMobile) {
      setDrawerVisible(false);
    }
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

  // 菜单内容组件（复用于侧边栏和抽屉）
  const menuContent = (
    <>
      {/* Logo */}
      <div className={`flex items-center justify-center border-b border-gray-100 ${isMobile ? 'h-14' : 'h-16'}`}>
        {collapsed && !isMobile ? (
          <span className="text-xl font-bold text-blue-600">签</span>
        ) : (
          <span className={`font-semibold text-gray-800 ${isMobile ? 'text-base' : 'text-lg'}`}>
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
    </>
  );

  return (
    <Layout className="min-h-screen">
      {/* 移动端抽屉菜单 */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          width={280}
          styles={{ body: { padding: 0 } }}
          closeIcon={null}
          className="mobile-drawer"
          title={
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-800">
                电子签约系统
              </span>
              <CloseOutlined 
                className="text-gray-500 cursor-pointer p-2 -mr-2 hover:text-gray-700"
                onClick={() => setDrawerVisible(false)}
              />
            </div>
          }
        >
          {/* 导航菜单 */}
          <Menu
            mode="inline"
            selectedKeys={getSelectedKeys()}
            items={menuItems}
            onClick={handleMenuClick}
            className="border-r-0"
          />
        </Drawer>
      )}

      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          className="!bg-white shadow-sm"
          width={220}
        >
          {menuContent}
        </Sider>
      )}

      <Layout>
        {/* 顶部栏 */}
        <Header 
          className={`!bg-white flex items-center justify-between shadow-sm ${
            isMobile ? '!px-3 !h-14' : '!px-4 !h-16'
          }`}
          style={{ 
            height: isMobile ? 56 : 64,
            lineHeight: isMobile ? '56px' : '64px',
          }}
        >
          {/* 左侧：菜单按钮 */}
          <div
            className={`cursor-pointer text-gray-600 hover:text-blue-600 transition-colors flex items-center justify-center ${
              isMobile ? 'text-xl w-11 h-11' : 'text-lg w-10 h-10'
            }`}
            onClick={() => isMobile ? setDrawerVisible(true) : setCollapsed(!collapsed)}
          >
            {isMobile ? (
              <MenuOutlined />
            ) : (
              collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
            )}
          </div>

          {/* 右侧：用户信息 */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* 城市标签 - 移动端只显示图标 */}
            {user?.cityName && (
              <span 
                className={`text-gray-500 bg-gray-100 rounded-full flex items-center ${
                  isMobile ? 'w-9 h-9 justify-center' : 'text-sm px-3 py-1'
                }`}
                title={user.cityName}
              >
                <EnvironmentOutlined className={isMobile ? '' : 'mr-1'} />
                {!isMobile && user.cityName}
              </span>
            )}

            {/* 用户下拉菜单 */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div 
                className={`flex items-center cursor-pointer hover:bg-gray-50 rounded-lg transition-colors ${
                  isMobile ? 'p-2' : 'gap-2 px-3 py-1'
                }`}
              >
                <Avatar
                  size={isMobile ? 'default' : 'small'}
                  icon={<UserOutlined />}
                  className="bg-blue-500"
                />
                {/* 移动端隐藏用户名 */}
                {!isMobile && (
                  <span className="text-gray-700">{user?.name || '用户'}</span>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* 内容区域 */}
        <Content 
          className={`bg-white rounded-lg shadow-sm ${
            isMobile 
              ? 'm-2 p-3 min-h-[calc(100vh-72px)]' 
              : 'm-4 p-6 min-h-[calc(100vh-112px)]'
          }`}
        >
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
