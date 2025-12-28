'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Table,
  Tabs,
  Input,
  DatePicker,
  Tag,
  Button,
  Typography,
  Spin,
  message,
  Pagination,
  Empty,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  RightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getContractsAction } from './actions';
import { useResponsive } from '@/hooks/useResponsive';
import { getResponsiveColumns, getResponsivePagination, getResponsiveScroll } from '@/utils/responsive-table';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// 合同状态配置
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '草稿', color: 'default' },
  PENDING_PARTY_B: { label: '待乙方签署', color: 'processing' },
  PENDING_PARTY_A: { label: '待甲方签署', color: 'warning' },
  COMPLETED: { label: '已完成签署', color: 'success' },
  REJECTED: { label: '已拒签', color: 'error' },
  EXPIRED: { label: '已过期', color: 'default' },
  CANCELLED: { label: '已取消', color: 'default' },
};

// Tab配置
const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'DRAFT', label: '草稿' },
  { key: 'PENDING_PARTY_B', label: '待乙方签署' },
  { key: 'PENDING_PARTY_A', label: '待甲方签署' },
  { key: 'COMPLETED', label: '已完成' },
  { key: 'REJECTED', label: '已拒签' },
  { key: 'EXPIRED', label: '已过期' },
];

// 合同列表项类型
interface ContractListItem {
  id: string;
  contractNo: string;
  partyBName: string;
  partyBPhone: string;
  productName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 签约管理列表页面
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export default function ContractsPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const { isMobile, isTablet } = useResponsive();

  // 状态
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // 筛选条件
  const [activeTab, setActiveTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  // 使用 ref 来跟踪当前请求的 ID，防止竞态条件
  const requestIdRef = useRef(0);

  // 加载合同列表
  const loadContracts = useCallback(async () => {
    // 生成新的请求 ID
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    
    try {
      const result = await getContractsAction({
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchText || undefined,
        startDate: dateRange?.[0] ? dateRange[0].toISOString() : undefined,
        endDate: dateRange?.[1] ? dateRange[1].toISOString() : undefined,
        page: currentPage,
        pageSize,
      });

      // 如果这不是最新的请求，忽略结果（防止竞态条件）
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (result.success && result.data) {
        setContracts(result.data.data);
        setTotal(result.data.total);
      } else {
        message.error(result.error || '加载合同列表失败');
      }
    } catch (error) {
      // 如果这不是最新的请求，忽略错误
      if (currentRequestId !== requestIdRef.current) {
        return;
      }
      
      console.error('加载合同列表失败:', error);
      const errorMessage = error instanceof Error ? error.message : '加载合同列表失败';
      message.error(errorMessage);
    } finally {
      // 只有当前请求才更新 loading 状态
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [activeTab, searchText, dateRange, currentPage, pageSize]);

  // 初始加载和筛选条件变化时重新加载
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      loadContracts();
    }
  }, [sessionStatus, loadContracts]);

  // 处理Tab切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setCurrentPage(1);
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  // 处理日期范围变化
  const handleDateRangeChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    setDateRange(dates);
    setCurrentPage(1);
  };

  // 处理分页变化
  const handleTableChange = (pagination: TablePaginationConfig) => {
    setCurrentPage(pagination.current || 1);
    setPageSize(pagination.pageSize || 10);
  };

  // 查看合同详情
  const handleViewContract = (id: string) => {
    router.push(`/contracts/${id}`);
  };

  // 发起新签约
  const handleNewContract = () => {
    router.push('/contracts/new');
  };

  // 表格列配置
  const baseColumns: ColumnsType<ContractListItem> = [
    {
      title: '合同编号',
      dataIndex: 'contractNo',
      key: 'contractNo',
      width: 180,
      render: (text: string, record: ContractListItem) => (
        <a onClick={() => handleViewContract(record.id)}>{text}</a>
      ),
    },
    {
      title: '甲方姓名',
      dataIndex: 'partyBName',
      key: 'partyBName',
      width: 120,
    },
    {
      title: '甲方联系方式',
      dataIndex: 'partyBPhone',
      key: 'partyBPhone',
      width: 130,
    },
    {
      title: '产品名称',
      dataIndex: 'productName',
      key: 'productName',
      width: 150,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const config = STATUS_CONFIG[status] || { label: status, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: ContractListItem) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewContract(record.id)}
          size={isMobile ? 'small' : 'middle'}
        >
          {isMobile ? '' : '查看'}
        </Button>
      ),
    },
  ];

  // 应用响应式列配置
  const columns = getResponsiveColumns(baseColumns, {
    isMobile,
    isTablet,
    mobileHiddenColumns: ['partyBPhone', 'productName', 'createdAt', 'updatedAt'],
    tabletHiddenColumns: ['updatedAt'],
  });

  // 响应式分页配置
  const paginationConfig = getResponsivePagination({
    isMobile,
    current: currentPage,
    pageSize,
    total,
    onChange: (page, size) => {
      setCurrentPage(page);
      setPageSize(size);
    },
  });

  // 响应式滚动配置
  const scrollConfig = getResponsiveScroll(isMobile, 600);

  // 移动端合同卡片组件
  const ContractCard = ({ contract }: { contract: ContractListItem }) => {
    const statusConfig = STATUS_CONFIG[contract.status] || { label: contract.status, color: 'default' };
    
    return (
      <Card
        size="small"
        className="mb-3 contract-card"
        hoverable
        onClick={() => handleViewContract(contract.id)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            {/* 合同编号 */}
            <div className="text-sm font-medium text-blue-600 mb-2 truncate">
              {contract.contractNo}
            </div>
            {/* 甲方姓名 */}
            <div className="text-base font-semibold text-gray-900 mb-1">
              {contract.partyBName}
            </div>
            {/* 产品名称 */}
            <div className="text-xs text-gray-500 mb-2 truncate">
              {contract.productName}
            </div>
            {/* 创建时间 */}
            <div className="text-xs text-gray-400">
              {dayjs(contract.createdAt).format('YYYY-MM-DD HH:mm')}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 ml-3">
            {/* 状态标签 */}
            <Tag color={statusConfig.color} className="m-0">
              {statusConfig.label}
            </Tag>
            {/* 箭头图标 */}
            <RightOutlined className="text-gray-400 text-xs" />
          </div>
        </div>
      </Card>
    );
  };

  // 移动端卡片列表
  const MobileCardList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Spin size="large" />
        </div>
      );
    }

    if (contracts.length === 0) {
      return <Empty description="暂无签约记录" className="py-12" />;
    }

    return (
      <div>
        {/* 卡片列表 */}
        <div className="mb-4">
          {contracts.map((contract) => (
            <ContractCard key={contract.id} contract={contract} />
          ))}
        </div>
        
        {/* 分页 */}
        <div className="flex justify-center">
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={total}
            size="small"
            simple
            onChange={(page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            }}
          />
        </div>
      </div>
    );
  };

  // 加载中状态
  if (sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" />
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  return (
    <div>
      {/* 页面标题 */}
      <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex justify-between items-center'} mb-6`}>
        <div>
          <Title level={4} className={`!mb-1 ${isMobile ? '!text-lg' : ''}`}>
            签约管理
          </Title>
          <Text type="secondary" className={isMobile ? 'text-xs' : ''}>
            查看和管理所有签约记录
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleNewContract}
          block={isMobile}
        >
          发起签约
        </Button>
      </div>

      {/* 筛选区域 */}
      <Card className="mb-4" size={isMobile ? 'small' : 'default'}>
        {/* 状态Tab */}
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          size={isMobile ? 'small' : 'middle'}
          items={STATUS_TABS.map(tab => ({
            key: tab.key,
            label: tab.label,
          }))}
        />

        {/* 搜索和日期筛选 */}
        <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-wrap gap-4'} items-center`}>
          <Input.Search
            placeholder="搜索甲方姓名/联系方式"
            allowClear
            style={{ width: isMobile ? '100%' : 250 }}
            prefix={<SearchOutlined />}
            onSearch={handleSearch}
            onChange={(e) => !e.target.value && handleSearch('')}
          />
          
          <RangePicker
            placeholder={['开始日期', '结束日期']}
            onChange={handleDateRangeChange}
            value={dateRange}
            style={{ width: isMobile ? '100%' : 'auto' }}
          />

          <Button
            icon={<ReloadOutlined />}
            onClick={loadContracts}
            block={isMobile}
          >
            {isMobile ? '' : '刷新'}
          </Button>
        </div>
      </Card>

      {/* 合同列表 */}
      <Card size={isMobile ? 'small' : 'default'}>
        {isMobile ? (
          <MobileCardList />
        ) : (
          <Table
            columns={columns}
            dataSource={contracts}
            rowKey="id"
            loading={loading}
            scroll={scrollConfig}
            pagination={paginationConfig}
            onChange={handleTableChange}
            size={isMobile ? 'small' : 'middle'}
          />
        )}
      </Card>
    </div>
  );
}
