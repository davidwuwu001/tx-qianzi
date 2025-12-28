'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Tag, Spin, Empty, Input, Segmented } from 'antd';
import { SearchOutlined, RightOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Contract {
  id: string;
  contractNo: string;
  partyBName: string;
  partyBPhone: string;
  status: string;
  createdAt: string;
  productName?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '草稿', color: 'default' },
  PENDING_PARTY_B: { label: '待乙方签署', color: 'processing' },
  PENDING_PARTY_A: { label: '待审批', color: 'warning' },
  COMPLETED: { label: '已完成', color: 'success' },
  REJECTED: { label: '已拒签', color: 'error' },
  EXPIRED: { label: '已过期', color: 'default' },
  CANCELLED: { label: '已取消', color: 'default' },
};

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待签署', value: 'PENDING_PARTY_B' },
  { label: '待审批', value: 'PENDING_PARTY_A' },
  { label: '已完成', value: 'COMPLETED' },
];

export default function MobileContractsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status: authStatus } = useSession();
  
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchContracts = useCallback(async (reset = false) => {
    if (authStatus !== 'authenticated') return;
    
    const currentPage = reset ? 1 : page;
    if (reset) {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      params.set('page', currentPage.toString());
      params.set('pageSize', '10');

      const response = await fetch(`/api/m/contracts?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (reset) {
          setContracts(data.data || []);
        } else {
          setContracts(prev => [...prev, ...(data.data || [])]);
        }
        setHasMore(data.data?.length === 10);
        if (reset) setPage(1);
      }
    } catch (error) {
      console.error('获取合同列表失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authStatus, statusFilter, search, page]);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/m/login');
      return;
    }
    fetchContracts(true);
  }, [authStatus, statusFilter, router]);

  const handleSearch = () => {
    fetchContracts(true);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchContracts(true);
  };

  const handleLoadMore = () => {
    if (!hasMore || loading) return;
    setPage(prev => prev + 1);
    fetchContracts(false);
  };

  const handleContractClick = (id: string) => {
    router.push(`/m/contracts/${id}`);
  };

  if (authStatus === 'loading' || (loading && contracts.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部搜索和筛选 */}
      <div className="bg-white sticky top-0 z-10">
        <div className="px-4 py-3">
          <Input
            placeholder="搜索乙方姓名或手机号"
            prefix={<SearchOutlined className="text-gray-400" />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
            className="rounded-lg"
          />
        </div>
        <div className="px-4 pb-3 overflow-x-auto">
          <Segmented
            value={statusFilter}
            onChange={value => setStatusFilter(value as string)}
            options={statusOptions}
            block
          />
        </div>
      </div>

      {/* 下拉刷新提示 */}
      {refreshing && (
        <div className="text-center py-2 text-gray-400 text-sm">
          <Spin size="small" /> 刷新中...
        </div>
      )}

      {/* 合同列表 */}
      <div className="px-4 py-2 space-y-3">
        {contracts.length === 0 ? (
          <div className="py-12">
            <Empty description="暂无签约记录" />
          </div>
        ) : (
          contracts.map(contract => (
            <Card
              key={contract.id}
              className="rounded-xl cursor-pointer hover:shadow-md transition-shadow"
              styles={{ body: { padding: '12px 16px' } }}
              onClick={() => handleContractClick(contract.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-800 truncate">
                      {contract.partyBName}
                    </span>
                    <Tag color={statusConfig[contract.status]?.color || 'default'}>
                      {statusConfig[contract.status]?.label || contract.status}
                    </Tag>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {contract.partyBPhone}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(contract.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <RightOutlined className="text-gray-300 mt-2" />
              </div>
            </Card>
          ))
        )}

        {/* 加载更多 */}
        {hasMore && contracts.length > 0 && (
          <div 
            className="text-center py-4 text-gray-400 text-sm cursor-pointer"
            onClick={handleLoadMore}
          >
            {loading ? <Spin size="small" /> : '点击加载更多'}
          </div>
        )}

        {!hasMore && contracts.length > 0 && (
          <div className="text-center py-4 text-gray-300 text-sm">
            没有更多了
          </div>
        )}
      </div>
    </div>
  );
}
