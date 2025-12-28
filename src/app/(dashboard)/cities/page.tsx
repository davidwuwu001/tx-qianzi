'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Table,
  Input,
  Button,
  Typography,
  Spin,
  message,
  Modal,
  Form,
  Switch,
  Tag,
  Popconfirm,
  Statistic,
  Space,
  Dropdown,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { MenuProps } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getCitiesAction,
  createCityAction,
  updateCityAction,
  toggleCityStatusAction,
  deleteCityAction,
} from './actions';
import { useResponsive } from '@/hooks/useResponsive';
import { getResponsiveColumns, getResponsivePagination, getResponsiveScroll } from '@/utils/responsive-table';
import { getResponsiveModalProps } from '@/utils/responsive-modal';

const { Title, Text } = Typography;
const { TextArea } = Input;

// 城市列表项类型
interface CityListItem {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalContracts: number;
  pendingContracts: number;
  completedContracts: number;
  adminCount: number;
}

/**
 * 城市管理页面
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
export default function CitiesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { isMobile, isTablet } = useResponsive();

  // 状态
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<CityListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');

  // 弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingCity, setEditingCity] = useState<CityListItem | null>(null);
  const [form] = Form.useForm();

  // 权限检查
  const isSystemAdmin = session?.user?.role === 'SYSTEM_ADMIN';

  // 加载城市列表
  const loadCities = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCitiesAction({
        search: searchText || undefined,
        page: currentPage,
        pageSize,
      });

      if (result.success && result.data) {
        setCities(result.data.data);
        setTotal(result.data.total);
      } else {
        message.error(result.error || '加载城市列表失败');
      }
    } catch (error) {
      console.error('加载城市列表失败:', error);
      message.error('加载城市列表失败');
    } finally {
      setLoading(false);
    }
  }, [searchText, currentPage, pageSize]);

  // 初始加载
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      if (!isSystemAdmin) {
        message.error('无权限访问此页面');
        router.push('/');
        return;
      }
      loadCities();
    }
  }, [sessionStatus, isSystemAdmin, loadCities, router]);

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  // 处理分页变化
  const handleTableChange = (pagination: TablePaginationConfig) => {
    setCurrentPage(pagination.current || 1);
    setPageSize(pagination.pageSize || 10);
  };

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingCity(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 打开编辑弹窗
  const handleEdit = (city: CityListItem) => {
    setEditingCity(city);
    form.setFieldsValue({
      name: city.name,
      description: city.description,
    });
    setModalVisible(true);
  };

  // 关闭弹窗
  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingCity(null);
    form.resetFields();
  };

  // 提交表单
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setModalLoading(true);

      let result;
      if (editingCity) {
        // 编辑
        result = await updateCityAction(editingCity.id, {
          name: values.name,
          description: values.description,
        });
      } else {
        // 新增
        result = await createCityAction({
          name: values.name,
          description: values.description,
        });
      }

      if (result.success) {
        message.success(editingCity ? '城市更新成功' : '城市创建成功');
        handleModalCancel();
        loadCities();
      } else {
        message.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    } finally {
      setModalLoading(false);
    }
  };

  // 切换城市状态
  const handleToggleStatus = async (city: CityListItem) => {
    try {
      const result = await toggleCityStatusAction(city.id, !city.isActive);
      if (result.success) {
        message.success(city.isActive ? '城市已禁用' : '城市已启用');
        loadCities();
      } else {
        message.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('切换状态失败:', error);
      message.error('操作失败');
    }
  };

  // 删除城市
  const handleDelete = async (city: CityListItem) => {
    try {
      const result = await deleteCityAction(city.id);
      if (result.success) {
        message.success('城市已删除');
        loadCities();
      } else {
        message.error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  // 表格列配置 - 移动端操作菜单
  const getActionMenuItems = (record: CityListItem): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '编辑',
      onClick: () => handleEdit(record),
    },
    {
      key: 'toggleStatus',
      icon: record.isActive ? <StopOutlined /> : <CheckCircleOutlined />,
      label: record.isActive ? '禁用' : '启用',
      danger: record.isActive,
      onClick: () => handleToggleStatus(record),
    },
    ...(record.totalContracts === 0 && record.adminCount === 0 ? [{
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      onClick: () => handleDelete(record),
    }] : []),
  ];

  // 表格列配置
  const baseColumns: ColumnsType<CityListItem> = [
    {
      title: '城市名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text: string, record: CityListItem) => (
        <Space>
          <EnvironmentOutlined className="text-blue-500" />
          <span className="font-medium">{text}</span>
          {!record.isActive && <Tag color="default">已禁用</Tag>}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
      render: (text: string | null) => text || '-',
    },
    {
      title: '合同统计',
      key: 'stats',
      width: 280,
      render: (_: unknown, record: CityListItem) => (
        <Space size="large">
          <Statistic
            title="总数"
            value={record.totalContracts}
            valueStyle={{ fontSize: 14 }}
          />
          <Statistic
            title="待处理"
            value={record.pendingContracts}
            valueStyle={{ fontSize: 14, color: '#faad14' }}
          />
          <Statistic
            title="已完成"
            value={record.completedContracts}
            valueStyle={{ fontSize: 14, color: '#52c41a' }}
          />
        </Space>
      ),
    },
    {
      title: '管理员',
      dataIndex: 'adminCount',
      key: 'adminCount',
      width: 80,
      align: 'center',
      render: (count: number) => (
        <Tag color="blue">{count} 人</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      align: 'center',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: isMobile ? 60 : 200,
      fixed: 'right',
      render: (_: unknown, record: CityListItem) => (
        isMobile ? (
          <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        ) : (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title={record.isActive ? '确定要禁用此城市吗？' : '确定要启用此城市吗？'}
              description={record.isActive ? '禁用后该城市下不能创建新合同' : '启用后该城市可以正常使用'}
              onConfirm={() => handleToggleStatus(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                icon={record.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
                danger={record.isActive}
              >
                {record.isActive ? '禁用' : '启用'}
              </Button>
            </Popconfirm>
            {record.totalContracts === 0 && record.adminCount === 0 && (
              <Popconfirm
                title="确定要删除此城市吗？"
                description="此操作不可恢复"
                onConfirm={() => handleDelete(record)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="link"
                  size="small"
                  icon={<DeleteOutlined />}
                  danger
                >
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        )
      ),
    },
  ];

  // 应用响应式列配置
  const columns = getResponsiveColumns(baseColumns, {
    isMobile,
    isTablet,
    mobileHiddenColumns: ['description', 'stats', 'createdAt'],
    tabletHiddenColumns: ['createdAt'],
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
  const scrollConfig = getResponsiveScroll(isMobile, 500);

  // 响应式弹窗配置
  const modalProps = getResponsiveModalProps({ isMobile });

  // 加载中状态
  if (sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" />
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  // 非系统管理员
  if (!isSystemAdmin) {
    return null;
  }

  return (
    <div>
      {/* 页面标题 */}
      <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex justify-between items-center'} mb-6`}>
        <div>
          <Title level={4} className={`!mb-1 ${isMobile ? '!text-lg' : ''}`}>
            城市管理
          </Title>
          <Text type="secondary" className={isMobile ? 'text-xs' : ''}>
            管理系统中的城市配置，城市用于数据隔离和模板配置
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          block={isMobile}
        >
          新增城市
        </Button>
      </div>

      {/* 筛选区域 */}
      <Card className="mb-4" size={isMobile ? 'small' : 'default'}>
        <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-wrap gap-4'} items-center`}>
          <Input.Search
            placeholder="搜索城市名称"
            allowClear
            style={{ width: isMobile ? '100%' : 250 }}
            prefix={<SearchOutlined />}
            onSearch={handleSearch}
            onChange={(e) => !e.target.value && handleSearch('')}
          />

          <Button
            icon={<ReloadOutlined />}
            onClick={loadCities}
            block={isMobile}
          >
            {isMobile ? '' : '刷新'}
          </Button>
        </div>
      </Card>

      {/* 城市列表 */}
      <Card size={isMobile ? 'small' : 'default'}>
        <Table
          columns={columns}
          dataSource={cities}
          rowKey="id"
          loading={loading}
          scroll={scrollConfig}
          pagination={paginationConfig}
          onChange={handleTableChange}
          size={isMobile ? 'small' : 'middle'}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingCity ? '编辑城市' : '新增城市'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={modalLoading}
        destroyOnHidden
        {...modalProps}
      >
        <Form
          form={form}
          layout="vertical"
          className="mt-4"
        >
          <Form.Item
            name="name"
            label="城市名称"
            rules={[
              { required: true, message: '请输入城市名称' },
              { max: 50, message: '城市名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="请输入城市名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[
              { max: 200, message: '描述不能超过200个字符' },
            ]}
          >
            <TextArea
              placeholder="请输入城市描述（可选）"
              rows={3}
              showCount
              maxLength={200}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
