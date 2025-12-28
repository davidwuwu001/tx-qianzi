'use client';

import { Layout } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { HomeOutlined, FileTextOutlined, PlusCircleOutlined, UserOutlined } from '@ant-design/icons';
import { SessionProvider } from 'next-auth/react';

const { Content, Footer } = Layout;

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { key: 'home', icon: <HomeOutlined />, label: '首页', path: '/m' },
  { key: 'contracts', icon: <FileTextOutlined />, label: '签约', path: '/m/contracts' },
  { key: 'new', icon: <PlusCircleOutlined />, label: '发起', path: '/m/contracts/new' },
  { key: 'profile', icon: <UserOutlined />, label: '我的', path: '/m/profile' },
];

function MobileLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveKey = () => {
    if (pathname === '/m') return 'home';
    if (pathname === '/m/contracts/new') return 'new';
    if (pathname.startsWith('/m/contracts')) return 'contracts';
    if (pathname.startsWith('/m/profile')) return 'profile';
    return 'home';
  };

  const activeKey = getActiveKey();

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Content className="pb-16">
        {children}
      </Content>
      
      {/* 底部导航栏 */}
      <Footer 
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-0 z-50"
        style={{ padding: 0 }}
      >
        <div className="flex justify-around items-center h-14">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                activeKey === item.key
                  ? 'text-blue-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </Footer>
    </Layout>
  );
}

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <MobileLayoutContent>{children}</MobileLayoutContent>
    </SessionProvider>
  );
}
