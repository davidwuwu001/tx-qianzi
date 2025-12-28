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
  Tag,
  Popconfirm,
  Space,
  Select,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  UserOutlined,
  KeyOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getUsersAction,
  createUserAction,
  updateUserAction,
  toggleUserStatusAction,
  resetPasswordAction,
  deleteUserAction,
} from './actions';
import { getActiveCitiesAction } from '../cities/actions';

const { Title, Text } = Typography;

// 用户列表项类型
interface UserListItem {
  id: string;
  username: string;
  phone: string;
  name: string;
  role: 'SYSTEM_ADMIN' | 'CITY_ADMIN';
  cityId: string | null;
  cityName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// 城市选项
interface CityOption {
  id: string;
  name: string;
}

/**
 * 用户管理页面
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
export default function UsersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // 状态
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);

  // 城市列表
  const [cities, setCities] = useState<CityOption[]>([]);

  // 弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [form] = Form.useForm();

  // 密码弹窗
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // 权限检查
  const isSystemAdmin = session?.user?.role === 'SYSTEM_ADMIN';


  // 加载城市列表
  const loadCities = useCallback(async () => {
    try {
      const result = await getActiveCitiesAction();
      if (result.success && result.data) {
        setCities(result.data);
      }
    } catch (error) {
      console.error('加载城市列表失败:', error);
    }
  }, []);

  // 加载用户列表
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUsersAction({
        search: searchText || undefined,
        role: roleFilter as 'SYSTEM_ADMIN' | 'CITY_ADMIN' | undefined,
        page: currentPage,
        pageSize,
      });

      if (result.success && result.data) {
        setUsers(result.data.data);
        setTotal(result.data.total);
      } else {
        message.error(result.error || '加载用户列表失败');
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [searchText, roleFilter, currentPage, pageSize]);

  // 初始加载
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      if (!isSystemAdmin) {
        message.error('无权限访问此页面');
        router.push('/');
        return;
      }
      loadUsers();
      loadCities();
    }
  }, [sessionStatus, isSystemAdmin, loadUsers, loadCities, router]);

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  // 处理角色筛选
  const handleRoleFilter = (value: string | undefined) => {
    setRoleFilter(value);
    setCurrentPage(1);
  };

  // 处理分页变化
  const handleTableChange = (pagination: TablePaginationConfig) => {
    setCurrentPage(pagination.current || 1);
    setPageSize(pagination.pageSize || 10);
  };

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ role: 'CITY_ADMIN' });
    setModalVisible(true);
  };

  // 打开编辑弹窗
  const handleEdit = (user: UserListItem) => {
    setEditingUser(user);
    form.setFieldsValue({
      phone: user.phone,
      name: user.name,
      role: user.role,
      cityId: user.cityId,
    });
    setModalVisible(true);
  };

  // 关闭弹窗
  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  // 提交表单
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setModalLoading(true);

      let result;
      if (editingUser) {
        // 编辑
        result = await updateUserAction(editingUser.id, {
          phone: values.phone,
          name: values.name,
          role: values.role,
          cityId: values.role === 'CITY_ADMIN' ? values.cityId : null,
        });
      } else {
        // 新增
        result = await createUserAction({
          username: values.username,
          password: values.password,
          phone: values.phone,
          name: values.name,
          role: values.role,
          cityId: values.role === 'CITY_ADMIN' ? values.cityId : undefined,
        });
      }

      if (result.success) {
        message.success(editingUser ? '用户更新成功' : '用户创建成功');
        handleModalCancel();
        loadUsers();
      } else {
        message.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    } finally {
      setModalLoading(false);
    }
  };

  // 切换用户状态
  const handleToggleStatus = async (user: UserListItem) => {
    try {
      const result = await toggleUserStatusAction(user.id, !user.isActive);
      if (result.success) {
        message.success(user.isActive ? '用户已禁用' : '用户已启用');
        loadUsers();
      } else {
        message.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('切换状态失败:', error);
      message.error('操作失败');
    }
  };

  // 重置密码
  const handleResetPassword = async (user: UserListItem) => {
    try {
      const result = await resetPasswordAction(user.id);
      if (result.success && result.tempPassword) {
        setTempPassword(result.tempPassword);
        setPasswordModalVisible(true);
      } else {
        message.error(result.error || '重置密码失败');
      }
    } catch (error) {
      console.error('重置密码失败:', error);
      message.error('重置密码失败');
    }
  };

  // 删除用户
  const handleDelete = async (user: UserListItem) => {
    try {
      const result = await deleteUserAction(user.id);
      if (result.success) {
        message.success('用户已删除');
        loadUsers();
      } else {
        message.error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  // 监听角色变化
  const handleRoleChange = (value: string) => {
    if (value === 'SYSTEM_ADMIN') {
      form.setFieldsValue({ cityId: undefined });
    }
  };


  // 表格列配置
  const columns: ColumnsType<UserListItem> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (text: string, record: UserListItem) => (
        <Space>
          {record.role === 'SYSTEM_ADMIN' ? (
            <CrownOutlined className="text-yellow-500" />
          ) : (
            <UserOutlined className="text-blue-500" />
          )}
          <span className="font-medium">{text}</span>
          {!record.isActive && <Tag color="default">已禁用</Tag>}
        </Space>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => (
        <Tag color={role === 'SYSTEM_ADMIN' ? 'gold' : 'blue'}>
          {role === 'SYSTEM_ADMIN' ? '系统管理员' : '城市管理员'}
        </Tag>
      ),
    },
    {
      title: '所属城市',
      dataIndex: 'cityName',
      key: 'cityName',
      width: 100,
      render: (text: string | null) => text || '-',
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
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 170,
      render: (date: string | null) => 
        date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-',
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
      width: 280,
      fixed: 'right',
      render: (_: unknown, record: UserListItem) => (
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
            title="确定要重置此用户的密码吗？"
            description="重置后将生成新的临时密码"
            onConfirm={() => handleResetPassword(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              icon={<KeyOutlined />}
            >
              重置密码
            </Button>
          </Popconfirm>
          <Popconfirm
            title={record.isActive ? '确定要禁用此用户吗？' : '确定要启用此用户吗？'}
            description={record.isActive ? '禁用后该用户将无法登录' : '启用后该用户可以正常登录'}
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
          <Popconfirm
            title="确定要删除此用户吗？"
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
        </Space>
      ),
    },
  ];

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={4} className="!mb-1">
            用户管理
          </Title>
          <Text type="secondary">
            管理系统中的用户账号，包括系统管理员和城市管理员
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          新增用户
        </Button>
      </div>

      {/* 筛选区域 */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <Input.Search
            placeholder="搜索用户名、姓名或手机号"
            allowClear
            style={{ width: 280 }}
            prefix={<SearchOutlined />}
            onSearch={handleSearch}
            onChange={(e) => !e.target.value && handleSearch('')}
          />

          <Select
            placeholder="角色筛选"
            allowClear
            style={{ width: 150 }}
            value={roleFilter}
            onChange={handleRoleFilter}
            options={[
              { label: '系统管理员', value: 'SYSTEM_ADMIN' },
              { label: '城市管理员', value: 'CITY_ADMIN' },
            ]}
          />

          <Button
            icon={<ReloadOutlined />}
            onClick={loadUsers}
          >
            刷新
          </Button>
        </div>
      </Card>

      {/* 用户列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={modalLoading}
        destroyOnClose
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          className="mt-4"
        >
          {!editingUser && (
            <>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少3个字符' },
                  { max: 50, message: '用户名不能超过50个字符' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
                ]}
              >
                <Input placeholder="请输入用户名" />
              </Form.Item>

              <Form.Item
                name="password"
                label="密码"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 8, message: '密码至少8位' },
                ]}
                extra="密码至少8位，需包含大小写字母和数字"
              >
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="name"
            label="姓名"
            rules={[
              { required: true, message: '请输入姓名' },
              { max: 50, message: '姓名不能超过50个字符' },
            ]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select
              placeholder="请选择角色"
              onChange={handleRoleChange}
              options={[
                { label: '系统管理员', value: 'SYSTEM_ADMIN' },
                { label: '城市管理员', value: 'CITY_ADMIN' },
              ]}
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.role !== currentValues.role
            }
          >
            {({ getFieldValue }) => 
              getFieldValue('role') === 'CITY_ADMIN' ? (
                <Form.Item
                  name="cityId"
                  label="所属城市"
                  rules={[{ required: true, message: '请选择所属城市' }]}
                >
                  <Select
                    placeholder="请选择所属城市"
                    options={cities.map(city => ({
                      label: city.name,
                      value: city.id,
                    }))}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>

      {/* 临时密码弹窗 */}
      <Modal
        title="密码重置成功"
        open={passwordModalVisible}
        onOk={() => setPasswordModalVisible(false)}
        onCancel={() => setPasswordModalVisible(false)}
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <div className="py-4">
          <Text>新的临时密码为：</Text>
          <div className="mt-2 p-3 bg-gray-100 rounded-lg">
            <Text copyable strong className="text-lg">
              {tempPassword}
            </Text>
          </div>
          <Text type="secondary" className="mt-2 block">
            请将此密码告知用户，用户首次登录后建议修改密码
          </Text>
        </div>
      </Modal>
    </div>
  );
}
