'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Form,
  Button,
  Steps,
  message,
  Typography,
  Space,
  Divider,
  Result,
  Spin,
} from 'antd';
import {
  FileTextOutlined,
  UserOutlined,
  SendOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import ProductSelect, { type ProductInfo } from '@/components/contract/ProductSelect';
import PartyBForm, { type PartyBFormValues } from '@/components/contract/PartyBForm';
import ProductFormFields from '@/components/contract/ProductFormFields';
import SignLinkDisplay from '@/components/contract/SignLinkDisplay';
import { initiateContractAction, regenerateSignUrlAction } from './actions';

const { Title, Text } = Typography;

// 合同发起结果
interface ContractResult {
  contractId: string;
  contractNo: string;
  flowId: string;
  signUrl: string;
  signUrlExpireAt: string;
}

// 表单值类型
interface FormValues extends PartyBFormValues {
  productId: string;
  formData?: Record<string, unknown>;
}

/**
 * 发起签约页面
 * 组合ProductSelect和PartyBForm组件
 * 实现表单提交Server Action
 * 实现签署链接展示
 * Requirements: 2.1, 2.9, 2.10, 2.11
 */
export default function NewContractPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<ProductInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [contractResult, setContractResult] = useState<ContractResult | null>(null);

  // 加载中状态
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  const user = session?.user;
  const cityId = user?.cityId;

  // 处理产品选择
  const handleProductChange = (productId: string, product: ProductInfo | null) => {
    form.setFieldValue('productId', productId);
    setSelectedProduct(product);
  };

  // 下一步
  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        // 验证产品选择
        await form.validateFields(['productId']);
        setCurrentStep(1);
      } else if (currentStep === 1) {
        // 验证乙方信息和表单字段
        const fieldsToValidate = [
          'partyBName',
          'partyBPhone',
          'partyBIdCard',
          'partyBType',
          'partyBOrgName',
        ];
        
        // 如果有产品表单字段配置，添加验证
        if (selectedProduct?.formFields && Array.isArray(selectedProduct.formFields) && selectedProduct.formFields.length > 0) {
          selectedProduct.formFields.forEach((field: { name: string }) => {
            fieldsToValidate.push(`formData.${field.name}`);
          });
        }
        
        await form.validateFields(fieldsToValidate);
        setCurrentStep(2);
      }
    } catch {
      // 表单验证失败
    }
  };

  // 上一步
  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      setSubmitting(true);
      
      // 处理 formData：提取并转换日期字段
      let formData: Record<string, unknown> | undefined;
      if (values.formData) {
        formData = {};
        for (const [key, value] of Object.entries(values.formData)) {
          // 如果是 dayjs 对象，转换为 ISO 字符串
          if (value && typeof value === 'object' && 'format' in value) {
            formData[key] = (value as { format: (format: string) => string }).format('YYYY-MM-DD');
          } else {
            formData[key] = value;
          }
        }
      }
      
      const result = await initiateContractAction({
        productId: values.productId,
        partyBName: values.partyBName,
        partyBPhone: values.partyBPhone,
        partyBIdCard: values.partyBIdCard,
        partyBType: values.partyBType,
        partyBOrgName: values.partyBOrgName,
        formData,
      });

      if (result.success && result.data) {
        setContractResult(result.data);
        setCurrentStep(3);
        message.success('签约发起成功！');
      } else {
        message.error(result.error || '发起签约失败');
      }
    } catch (error) {
      console.error('提交失败:', error);
      message.error('提交失败，请检查表单信息');
    } finally {
      setSubmitting(false);
    }
  };

  // 重新生成签署链接
  const handleRegenerateLink = async () => {
    if (!contractResult) {
      throw new Error('合同信息不存在');
    }

    const result = await regenerateSignUrlAction(contractResult.contractId);
    
    if (result.success && result.data) {
      setContractResult({
        ...contractResult,
        signUrl: result.data.signUrl,
        signUrlExpireAt: result.data.signUrlExpireAt,
      });
      return {
        signUrl: result.data.signUrl,
        signUrlExpireAt: new Date(result.data.signUrlExpireAt),
      };
    }
    
    throw new Error(result.error || '重新生成链接失败');
  };

  // 继续发起新签约
  const handleNewContract = () => {
    form.resetFields();
    setSelectedProduct(null);
    setContractResult(null);
    setCurrentStep(0);
  };

  // 查看合同详情
  const handleViewContract = () => {
    if (contractResult) {
      router.push(`/contracts/${contractResult.contractId}`);
    }
  };

  // 步骤配置
  const steps = [
    {
      title: '选择产品',
      icon: <FileTextOutlined />,
    },
    {
      title: '填写乙方信息',
      icon: <UserOutlined />,
    },
    {
      title: '确认发起',
      icon: <SendOutlined />,
    },
    {
      title: '完成',
      icon: <CheckCircleOutlined />,
    },
  ];

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="py-6">
            <Title level={5} className="!mb-4">
              请选择签约产品
            </Title>
            <Form.Item
              name="productId"
              rules={[{ required: true, message: '请选择产品' }]}
            >
              <ProductSelect
                cityId={cityId || ''}
                value={form.getFieldValue('productId')}
                onChange={handleProductChange}
              />
            </Form.Item>
          </div>
        );

      case 1:
        return (
          <div className="py-6 space-y-6">
            <div>
              <Title level={5} className="!mb-4">
                请填写乙方信息
              </Title>
              <PartyBForm form={form} />
            </div>
            
            {/* 产品表单字段 */}
            {selectedProduct?.formFields && Array.isArray(selectedProduct.formFields) && selectedProduct.formFields.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <ProductFormFields
                  form={form}
                  formFields={selectedProduct.formFields}
                />
              </div>
            )}
          </div>
        );

      case 2:
        const formData = form.getFieldValue('formData') || {};
        return (
          <div className="py-6">
            <Title level={5} className="!mb-4">
              确认签约信息
            </Title>
            
            {/* 产品信息 */}
            <Card size="small" className="mb-4" title="产品信息">
              <div className="space-y-2">
                <div>
                  <Text type="secondary">产品名称：</Text>
                  <Text strong>{selectedProduct?.name}</Text>
                </div>
                {selectedProduct?.description && (
                  <div>
                    <Text type="secondary">产品描述：</Text>
                    <Text>{selectedProduct.description}</Text>
                  </div>
                )}
              </div>
            </Card>

            {/* 乙方信息 */}
            <Card size="small" className="mb-4" title="乙方信息">
              <div className="space-y-2">
                <div>
                  <Text type="secondary">乙方类型：</Text>
                  <Text strong>
                    {form.getFieldValue('partyBType') === 'PERSONAL' ? '个人' : '企业'}
                  </Text>
                </div>
                {form.getFieldValue('partyBType') === 'ENTERPRISE' && (
                  <div>
                    <Text type="secondary">企业名称：</Text>
                    <Text strong>{form.getFieldValue('partyBOrgName')}</Text>
                  </div>
                )}
                <div>
                  <Text type="secondary">
                    {form.getFieldValue('partyBType') === 'ENTERPRISE' ? '签署人姓名：' : '姓名：'}
                  </Text>
                  <Text strong>{form.getFieldValue('partyBName')}</Text>
                </div>
                <div>
                  <Text type="secondary">手机号：</Text>
                  <Text strong>{form.getFieldValue('partyBPhone')}</Text>
                </div>
                {form.getFieldValue('partyBIdCard') && (
                  <div>
                    <Text type="secondary">身份证号：</Text>
                    <Text strong>{form.getFieldValue('partyBIdCard')}</Text>
                  </div>
                )}
              </div>
            </Card>

            {/* 合同信息 */}
            {selectedProduct?.formFields && Array.isArray(selectedProduct.formFields) && selectedProduct.formFields.length > 0 && Object.keys(formData).length > 0 && (
              <Card size="small" title="合同信息">
                <div className="space-y-2">
                  {selectedProduct.formFields.map((field: { name: string; label: string }) => {
                    const value = formData[field.name];
                    if (value === null || value === undefined || value === '') {
                      return null;
                    }
                    return (
                      <div key={field.name}>
                        <Text type="secondary">{field.label}：</Text>
                        <Text strong>
                          {typeof value === 'object' && value !== null && 'format' in value
                            ? (value as { format: (format: string) => string }).format('YYYY-MM-DD')
                            : String(value)}
                        </Text>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        );

      case 3:
        return (
          <div className="py-6">
            {contractResult && (
              <>
                <Result
                  status="success"
                  title="签约发起成功"
                  subTitle={`合同编号：${contractResult.contractNo}`}
                  className="!py-4"
                />
                
                <Divider />
                
                <SignLinkDisplay
                  signUrl={contractResult.signUrl}
                  signUrlExpireAt={contractResult.signUrlExpireAt}
                  partyBName={form.getFieldValue('partyBName')}
                  partyBPhone={form.getFieldValue('partyBPhone')}
                  contractId={contractResult.contractId}
                  onRegenerateLink={handleRegenerateLink}
                />

                <Divider />

                <Space className="w-full justify-center">
                  <Button onClick={handleNewContract}>
                    继续发起签约
                  </Button>
                  <Button type="primary" onClick={handleViewContract}>
                    查看合同详情
                  </Button>
                </Space>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // 渲染底部按钮
  const renderFooter = () => {
    if (currentStep === 3) {
      return null;
    }

    return (
      <div className="flex justify-between pt-4 border-t border-gray-100">
        <div>
          {currentStep > 0 && (
            <Button icon={<ArrowLeftOutlined />} onClick={handlePrev}>
              上一步
            </Button>
          )}
        </div>
        <div>
          {currentStep < 2 && (
            <Button type="primary" onClick={handleNext}>
              下一步
            </Button>
          )}
          {currentStep === 2 && (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmit}
              loading={submitting}
            >
              发起签约
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <Title level={4} className="!mb-2">
          发起签约
        </Title>
        <Text type="secondary">
          选择产品模板，填写乙方信息，发起合同签署流程
        </Text>
      </div>

      {/* 步骤条 */}
      <Card className="mb-6">
        <Steps
          current={currentStep}
          items={steps}
          className="px-4"
        />
      </Card>

      {/* 表单内容 */}
      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            partyBType: 'PERSONAL',
          }}
        >
          {renderStepContent()}
          {renderFooter()}
        </Form>
      </Card>
    </div>
  );
}
