'use client';

import { useEffect, useState } from 'react';
import { Card, Statistic, Spin, Button } from 'antd';
import { 
  FileTextOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined,
  PlusOutlined,
  RightOutlined
} from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ContractStats {
  total: number;
  pending: number;
  completed: number;
  rejected: number;
}

export default function MobileHomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/m/login');
      return;
    }

    if (status === 'authenticated') {
      fetchStats();
    }
  }, [status, router]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/m/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部欢迎区域 */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 pt-12 pb-8">
        <div className="text-white">
          <p className="text-sm opacity-80">欢迎回来</p>
          <h1 className="text-xl font-semibold mt-1">
            {session?.user?.name || '用户'}
          </h1>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="px-4 -mt-4">
        <Card className="rounded-xl shadow-sm">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <Statistic
                title={<span className="text-xs text-gray-500">全部签约</span>}
                value={stats?.total || 0}
                prefix={<FileTextOutlined className="text-blue-500" />}
                styles={{ content: { fontSize: '20px' } }}
              />
            </div>
            <div className="text-center border-l border-r border-gray-100">
              <Statistic
                title={<span className="text-xs text-gray-500">待处理</span>}
                value={stats?.pending || 0}
                prefix={<ClockCircleOutlined className="text-orange-500" />}
                styles={{ content: { fontSize: '20px' } }}
              />
            </div>
            <div className="text-center">
              <Statistic
                title={<span className="text-xs text-gray-500">已完成</span>}
                value={stats?.completed || 0}
                prefix={<CheckCircleOutlined className="text-green-500" />}
                styles={{ content: { fontSize: '20px' } }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* 快捷操作 */}
      <div className="px-4 mt-6">
        <h2 className="text-base font-medium text-gray-800 mb-3">快捷操作</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/m/contracts/new">
            <Card 
              className="rounded-xl cursor-pointer hover:shadow-md transition-shadow"
              styles={{ body: { padding: '16px' } }}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <PlusOutlined className="text-blue-500 text-lg" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-800">发起签约</p>
                  <p className="text-xs text-gray-400">创建新合同</p>
                </div>
              </div>
            </Card>
          </Link>
          
          <Link href="/m/contracts">
            <Card 
              className="rounded-xl cursor-pointer hover:shadow-md transition-shadow"
              styles={{ body: { padding: '16px' } }}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileTextOutlined className="text-green-500 text-lg" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-800">我的签约</p>
                  <p className="text-xs text-gray-400">查看签约记录</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* 待处理提醒 */}
      {stats && stats.pending > 0 && (
        <div className="px-4 mt-6">
          <Card 
            className="rounded-xl bg-orange-50 border-orange-200"
            styles={{ body: { padding: '12px 16px' } }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ClockCircleOutlined className="text-orange-500 text-lg" />
                <span className="ml-2 text-sm text-gray-700">
                  您有 <span className="font-semibold text-orange-500">{stats.pending}</span> 个签约待处理
                </span>
              </div>
              <Link href="/m/contracts?status=PENDING_PARTY_B">
                <Button type="link" size="small" className="p-0">
                  查看 <RightOutlined />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      )}

      {/* 使用提示 */}
      <div className="px-4 mt-6 pb-20">
        <h2 className="text-base font-medium text-gray-800 mb-3">使用指南</h2>
        <Card className="rounded-xl" styles={{ body: { padding: '16px' } }}>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <span className="w-5 h-5 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0">1</span>
              <span>点击"发起签约"选择产品并填写乙方信息</span>
            </div>
            <div className="flex items-start">
              <span className="w-5 h-5 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0">2</span>
              <span>将签署链接发送给乙方进行签署</span>
            </div>
            <div className="flex items-start">
              <span className="w-5 h-5 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0">3</span>
              <span>乙方签署后等待审批，审批通过即完成签约</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
