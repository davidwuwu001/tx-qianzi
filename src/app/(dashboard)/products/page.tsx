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
  Modal,
  Form,
  Tag,
  Popconfirm,
  Space,
  Select,
  Tooltip,
  App,
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
  AppstoreOutlined,
  FileTextOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getProductsAction,
  createProductAction,
  updateProductAction,
  toggleProductStatusAction,
  deleteProductAction,
  updateProductCitiesAction,
  getProductDetailAction,
} from './actions';
import { getActiveCitiesAction } from '../cities/actions';

const { Title, Text } = Typography;
const { TextArea } = Input;

// 产品列表项类型
interface ProductListItem {
  id: string;
  name: string;
  description: string | null;
  templateId: string;
  formFields: unknown | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  contractCount: number;
  cityCount: number;
}

// 城市选项
interface CityOption {
  id: string;
  name: string;
}

/**
 * 产品管理页面
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export default function ProductsPage() {
  const { message } = App.useApp();
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // 状态
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');

  // 城市列表
  const [cities, setCities] = useState<CityOption[]>([]);

  // 弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(null);
  const [loadingTemplateFields, setLoadingTemplateFields] = useState(false);
  const [form] = Form.useForm();

  // 城市关联弹窗
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [cityModalLoading, setCityModalLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>([]);

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

  // 加载产品列表
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getProductsAction({
        search: searchText || undefined,
        page: currentPage,
        pageSize,
      });

      if (result.success && result.data) {
        setProducts(result.data.data);
        setTotal(result.data.total);
      } else {
        message.error(result.error || '加载产品列表失败');
      }
    } catch (error) {
      console.error('加载产品列表失败:', error);
      message.error('加载产品列表失败');
    } finally {
      setLoading(false);
    }
  }, [searchText, currentPage, pageSize, message]);

  // 初始加载
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      if (!isSystemAdmin) {
        message.error('无权限访问此页面');
        router.push('/');
        return;
      }
      loadProducts();
      loadCities();
    }
  }, [sessionStatus, isSystemAdmin, loadProducts, loadCities, router, message]);

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
    setEditingProduct(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 打开编辑弹窗
  const handleEdit = (product: ProductListItem) => {
    setEditingProduct(product);
    form.setFieldsValue({
      name: product.name,
      description: product.description,
      templateId: product.templateId,
      formFields: product.formFields ? JSON.stringify(product.formFields, null, 2) : '',
    });
    setModalVisible(true);
  };

  // 关闭弹窗
  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingProduct(null);
    form.resetFields();
    setLoadingTemplateFields(false);
  };

  // 获取模板字段配置
  const handleFetchTemplateFields = async () => {
    const templateId = form.getFieldValue('templateId');
    if (!templateId || !templateId.trim()) {
      message.warning('请先输入模板ID');
      return;
    }

    setLoadingTemplateFields(true);
    try {
      const response = await fetch(`/api/templates/${templateId.trim()}/fields`);
      const data = await response.json();

      if (!data.success) {
        // 显示详细的错误信息
        let errorMessage = data.error || '获取模板字段失败';
        
        // 如果是权限错误，显示详细的诊断信息
        if (data.details && data.details.code === 'OperationDenied.Forbid') {
          const suggestions = data.details.suggestions || [];
          errorMessage = `${errorMessage}\n\n可能的原因：\n${suggestions.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`;
          
          // 使用 Modal 显示详细错误信息
          Modal.error({
            title: '获取模板字段配置失败',
            content: (
              <div style={{ marginTop: 16 }}>
                <p style={{ marginBottom: 12, fontWeight: 'bold' }}>{data.error}</p>
                <div style={{ marginTop: 12 }}>
                  <p style={{ marginBottom: 8, fontWeight: 'bold' }}>可能的原因：</p>
                  <ul style={{ marginLeft: 20, lineHeight: '1.8' }}>
                    {suggestions.map((suggestion: string, index: number) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                  <p style={{ marginBottom: 4, fontWeight: 'bold' }}>解决步骤：</p>
                  <ol style={{ marginLeft: 20, lineHeight: '1.8' }}>
                    <li>登录 <a href="https://qian.tencent.com" target="_blank" rel="noopener noreferrer">腾讯电子签控制台</a></li>
                    <li>进入&ldquo;企业中心&rdquo; → &ldquo;员工管理&rdquo;，确认操作人ID是否正确</li>
                    <li>确认操作人状态为&ldquo;已激活&rdquo;且未被禁用</li>
                    <li>确认该操作人有权限访问该模板（模板所属企业需与操作人企业一致）</li>
                    <li>确认模板ID是否正确（可在控制台的&ldquo;模板管理&rdquo;中查看）</li>
                  </ol>
                </div>
              </div>
            ),
            width: 600,
          });
        } else {
          message.error(errorMessage);
        }
        return;
      }

      if (!data.data.formFields || data.data.formFields.length === 0) {
        message.info('该模板没有需要填写的字段控件');
        form.setFieldValue('formFields', '');
        return;
      }

      // 将字段配置转换为 JSON 字符串并填充到表单
      const formFieldsJson = JSON.stringify(data.data.formFields, null, 2);
      form.setFieldValue('formFields', formFieldsJson);
      
      message.success(`成功获取 ${data.data.formFields.length} 个字段配置`);
    } catch (error) {
      console.error('获取模板字段失败:', error);
      message.error('获取模板字段失败，请检查网络连接和模板ID是否正确');
    } finally {
      setLoadingTemplateFields(false);
    }
  };

  // 提交表单
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setModalLoading(true);

      // 解析 formFields JSON
      let formFields = null;
      if (values.formFields && values.formFields.trim()) {
        try {
          formFields = JSON.parse(values.formFields);
        } catch {
          message.error('表单字段配置格式错误，请检查 JSON 格式');
          setModalLoading(false);
          return;
        }
      }

      let result;
      if (editingProduct) {
        // 编辑
        result = await updateProductAction(editingProduct.id, {
          name: values.name,
          description: values.description,
          templateId: values.templateId,
          formFields,
        });
      } else {
        // 新增
        result = await createProductAction({
          name: values.name,
          description: values.description,
          templateId: values.templateId,
          formFields,
          cityIds: values.cityIds,
        });
      }

      if (result.success) {
        message.success(editingProduct ? '产品更新成功' : '产品创建成功');
        handleModalCancel();
        loadProducts();
      } else {
        message.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    } finally {
      setModalLoading(false);
    }
  };

  // 切换产品状态
  const handleToggleStatus = async (product: ProductListItem) => {
    try {
      const result = await toggleProductStatusAction(product.id, !product.isActive);
      if (result.success) {
        message.success(product.isActive ? '产品已禁用' : '产品已启用');
        loadProducts();
      } else {
        message.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('切换状态失败:', error);
      message.error('操作失败');
    }
  };

  // 删除产品
  const handleDelete = async (product: ProductListItem) => {
    try {
      const result = await deleteProductAction(product.id);
      if (result.success) {
        message.success('产品已删除');
        loadProducts();
      } else {
        message.error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  // 打开城市关联弹窗
  const handleManageCities = async (product: ProductListItem) => {
    setSelectedProductId(product.id);
    setCityModalLoading(true);
    setCityModalVisible(true);

    try {
      const result = await getProductDetailAction(product.id);
      if (result.success && result.data) {
        setSelectedCityIds(result.data.cities.map(c => c.id));
      }
    } catch (error) {
      console.error('获取产品详情失败:', error);
    } finally {
      setCityModalLoading(false);
    }
  };

  // 关闭城市关联弹窗
  const handleCityModalCancel = () => {
    setCityModalVisible(false);
    setSelectedProductId(null);
    setSelectedCityIds([]);
  };

  // 保存城市关联
  const handleCityModalOk = async () => {
    if (!selectedProductId) return;

    setCityModalLoading(true);
    try {
      const result = await updateProductCitiesAction(selectedProductId, selectedCityIds);
      if (result.success) {
        message.success('城市关联更新成功');
        handleCityModalCancel();
        loadProducts();
      } else {
        message.error(result.error || '更新失败');
      }
    } catch (error) {
      console.error('更新城市关联失败:', error);
      message.error('更新失败');
    } finally {
      setCityModalLoading(false);
    }
  };


  // 表格列配置
  const columns: ColumnsType<ProductListItem> = [
    {
      title: '产品名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text: string, record: ProductListItem) => (
        <Space>
          <AppstoreOutlined className="text-blue-500" />
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
      title: '模板ID',
      dataIndex: 'templateId',
      key: 'templateId',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Space>
            <FileTextOutlined className="text-gray-400" />
            <Text copyable={{ text }} className="text-xs">
              {text.length > 20 ? `${text.slice(0, 20)}...` : text}
            </Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: '关联城市',
      dataIndex: 'cityCount',
      key: 'cityCount',
      width: 100,
      align: 'center',
      render: (count: number) => (
        <Tag color="blue">{count} 个城市</Tag>
      ),
    },
    {
      title: '合同数',
      dataIndex: 'contractCount',
      key: 'contractCount',
      width: 100,
      align: 'center',
      render: (count: number) => (
        <Tag color={count > 0 ? 'green' : 'default'}>{count}</Tag>
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
      width: 250,
      fixed: 'right',
      render: (_: unknown, record: ProductListItem) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => handleManageCities(record)}
          >
            城市
          </Button>
          <Popconfirm
            title={record.isActive ? '确定要禁用此产品吗？' : '确定要启用此产品吗？'}
            description={record.isActive ? '禁用后该产品不能用于新合同' : '启用后该产品可以正常使用'}
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
          {record.contractCount === 0 && (
            <Popconfirm
              title="确定要删除此产品吗？"
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
            产品管理
          </Title>
          <Text type="secondary">
            管理系统中的产品配置，产品与腾讯电子签模板绑定
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          新增产品
        </Button>
      </div>

      {/* 筛选区域 */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <Input.Search
            placeholder="搜索产品名称或描述"
            allowClear
            style={{ width: 250 }}
            prefix={<SearchOutlined />}
            onSearch={handleSearch}
            onChange={(e) => !e.target.value && handleSearch('')}
          />

          <Button
            icon={<ReloadOutlined />}
            onClick={loadProducts}
          >
            刷新
          </Button>
        </div>
      </Card>

      {/* 产品列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1300 }}
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
        title={editingProduct ? '编辑产品' : '新增产品'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={modalLoading}
        destroyOnClose
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          className="mt-4"
        >
          <Form.Item
            name="name"
            label="产品名称"
            rules={[
              { required: true, message: '请输入产品名称' },
              { max: 100, message: '产品名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入产品名称" />
          </Form.Item>

          <Form.Item
            name="templateId"
            label="腾讯电子签模板ID"
            rules={[
              { required: true, message: '请输入模板ID' },
            ]}
            extra="在腾讯电子签控制台获取模板ID，输入后可以点击右侧按钮自动获取字段配置"
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="请输入腾讯电子签模板ID"
                style={{ flex: 1 }}
              />
              <Button
                type="primary"
                loading={loadingTemplateFields}
                onClick={handleFetchTemplateFields}
                disabled={!form.getFieldValue('templateId')}
              >
                获取字段配置
              </Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[
              { max: 500, message: '描述不能超过500个字符' },
            ]}
          >
            <TextArea
              placeholder="请输入产品描述（可选）"
              rows={3}
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            name="formFields"
            label="表单字段配置"
            extra="配置发起签约时需要填写的字段，JSON 格式"
            tooltip="示例：{&quot;fields&quot;:[{&quot;name&quot;:&quot;projectName&quot;,&quot;label&quot;:&quot;项目名称&quot;,&quot;type&quot;:&quot;text&quot;,&quot;required&quot;:true}]}"
          >
            <TextArea
              placeholder='{"fields":[{"name":"projectName","label":"项目名称","type":"text","required":true}]}'
              rows={6}
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            />
          </Form.Item>

          {!editingProduct && (
            <Form.Item
              name="cityIds"
              label="关联城市"
              extra="选择可以使用此产品的城市"
            >
              <Select
                mode="multiple"
                placeholder="请选择关联城市（可选）"
                options={cities.map(city => ({
                  label: city.name,
                  value: city.id,
                }))}
                allowClear
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 城市关联弹窗 */}
      <Modal
        title="管理城市关联"
        open={cityModalVisible}
        onOk={handleCityModalOk}
        onCancel={handleCityModalCancel}
        confirmLoading={cityModalLoading}
        destroyOnClose
      >
        <div className="py-4">
          <Text type="secondary" className="mb-4 block">
            选择可以使用此产品的城市
          </Text>
          <Select
            mode="multiple"
            placeholder="请选择关联城市"
            value={selectedCityIds}
            onChange={setSelectedCityIds}
            options={cities.map(city => ({
              label: city.name,
              value: city.id,
            }))}
            style={{ width: '100%' }}
            loading={cityModalLoading}
            allowClear
          />
        </div>
      </Modal>
    </div>
  );
}
