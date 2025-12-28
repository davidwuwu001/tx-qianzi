'use client';

/**
 * 移动端发起签约页面
 * 
 * 这个页面就像一个"签约向导"：
 * 1. 第一步：选择要签约的产品
 * 2. 第二步：填写乙方信息和动态表单字段
 * 3. 第三步：显示签署链接，可以复制、生成二维码或发短信
 * 
 * Requirements: 4.1, 5.2, 5.3
 */

import { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, Steps, Card, message, Select, Modal, Spin } from 'antd';
import { 
  ArrowLeftOutlined, 
  CheckCircleOutlined,
  CopyOutlined,
  QrcodeOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import QRCode from 'qrcode';
import type { FormFieldConfig } from '@/types/form-field';

// 产品类型
interface Product {
  id: string;
  name: string;
  description: string | null;
}

// 签约结果类型
interface ContractResult {
  id: string;
  contractNo: string;
  signUrl: string;
  partyBName: string;
  partyBPhone: string;
}

export default function MobileNewContractPage() {
  const [form] = Form.useForm();
  const router = useRouter();
  const { status } = useSession();
  
  // 步骤状态
  const [currentStep, setCurrentStep] = useState(0);
  
  // 产品相关状态
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  // 动态表单字段
  const [initiatorFields, setInitiatorFields] = useState<FormFieldConfig[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  
  // 加载和提交状态
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // 签约结果
  const [result, setResult] = useState<ContractResult | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState(false);

  // 检查登录状态
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/m/login');
      return;
    }
    if (status === 'authenticated') {
      fetchProducts();
    }
  }, [status, router]);

  // 获取产品列表
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('获取产品列表失败:', error);
      message.error('获取产品列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取产品的发起方字段配置
  const fetchInitiatorFields = useCallback(async (productId: string) => {
    setLoadingFields(true);
    try {
      const response = await fetch(`/api/products/${productId}/initiator-fields`);
      const data = await response.json();
      
      if (data.success) {
        setInitiatorFields(data.data.fields || []);
      } else {
        console.error('获取字段配置失败:', data.error);
        setInitiatorFields([]);
      }
    } catch (error) {
      console.error('获取字段配置失败:', error);
      setInitiatorFields([]);
    } finally {
      setLoadingFields(false);
    }
  }, []);

  // 产品选择变化时获取字段配置
  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    // 清空之前的动态表单数据
    form.setFieldValue('formData', {});
    // 获取新产品的字段配置
    if (productId) {
      fetchInitiatorFields(productId);
    } else {
      setInitiatorFields([]);
    }
  };

  // 处理下一步
  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        // 验证产品选择
        await form.validateFields(['productId']);
        setCurrentStep(1);
      } else if (currentStep === 1) {
        // 验证乙方信息和动态表单字段
        const fieldsToValidate = ['partyBName', 'partyBPhone', 'partyBIdCard'];
        
        // 添加动态字段验证
        initiatorFields.forEach((field) => {
          if (field.required) {
            fieldsToValidate.push(['formData', field.name] as unknown as string);
          }
        });
        
        await form.validateFields(fieldsToValidate);
        // 提交签约
        handleSubmit();
      }
    } catch {
      // 验证失败，不做处理
    }
  };

  // 提交签约
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formValues = form.getFieldsValue();
      
      // 调试日志
      console.log('=== 提交签约 ===');
      console.log('formValues:', formValues);
      console.log('formValues.productId:', formValues.productId);
      console.log('selectedProductId:', selectedProductId);
      
      // 合并表单数据
      const submitData = {
        ...formValues,
        // 确保 productId 有值
        productId: formValues.productId || selectedProductId,
        // 发起方字段配置（用于后端构建 API 参数）
        initiatorFields,
      };
      
      console.log('submitData:', submitData);
      
      const response = await fetch('/api/m/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setResult(data.contract);
        setCurrentStep(2);
        // 生成二维码
        if (data.contract.signUrl) {
          const qr = await QRCode.toDataURL(data.contract.signUrl, { width: 200 });
          setQrCodeUrl(qr);
        }
        message.success('签约发起成功');
      } else {
        message.error(data.error || '发起签约失败');
      }
    } catch (error) {
      console.error('发起签约失败:', error);
      message.error('发起签约失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 复制签署链接
  const handleCopyLink = () => {
    if (result?.signUrl) {
      navigator.clipboard.writeText(result.signUrl);
      message.success('链接已复制');
    }
  };

  // 发送短信
  const handleSendSms = async () => {
    if (!result) return;
    try {
      const response = await fetch('/api/m/contracts/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: result.id,
          phone: result.partyBPhone,
        }),
      });
      const data = await response.json();
      if (data.success) {
        message.success('短信发送成功');
      } else {
        message.error(data.error || '短信发送失败');
      }
    } catch {
      message.error('短信发送失败');
    }
  };

  // 加载中状态
  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white px-4 py-3 flex items-center border-b sticky top-0 z-10">
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => router.back()}
          className="mr-2"
        />
        <h1 className="text-lg font-medium">发起签约</h1>
      </div>

      {/* 步骤条 */}
      <div className="bg-white px-4 py-4 mb-2">
        <Steps
          current={currentStep}
          size="small"
          items={[
            { title: '选择产品' },
            { title: '填写信息' },
            { title: '完成' },
          ]}
        />
      </div>

      <Form form={form} layout="vertical" className="px-4">
        {/* 步骤1: 选择产品 */}
        {currentStep === 0 && (
          <Card className="rounded-xl">
            <Form.Item
              name="productId"
              label="选择签约产品"
              rules={[{ required: true, message: '请选择产品' }]}
            >
              <Select
                placeholder="请选择产品"
                size="large"
                onChange={handleProductChange}
                options={products.map(p => ({
                  value: p.id,
                  label: p.name,
                }))}
              />
            </Form.Item>
            
            {products.length === 0 && (
              <div className="text-center text-gray-400 py-4">
                暂无可用产品
              </div>
            )}
          </Card>
        )}

        {/* 步骤2: 填写甲方（客户）信息和动态表单 */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* 甲方（客户）基本信息 */}
            <Card className="rounded-xl">
              <h3 className="text-base font-medium mb-4">甲方信息</h3>
              
              <Form.Item
                name="partyBName"
                label="姓名"
                rules={[{ required: true, message: '请输入甲方姓名' }]}
              >
                <Input placeholder="请输入甲方姓名" size="large" />
              </Form.Item>

              <Form.Item
                name="partyBPhone"
                label="手机号"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
                ]}
              >
                <Input 
                  placeholder="请输入甲方手机号" 
                  size="large" 
                  maxLength={11}
                  inputMode="numeric"
                />
              </Form.Item>


            </Card>

            {/* 动态表单字段 */}
            {(initiatorFields.length > 0 || loadingFields) && (
              <Card className="rounded-xl">
                <h3 className="text-base font-medium mb-4">合同信息</h3>
                {loadingFields ? (
                  <div className="flex items-center justify-center py-8">
                    <Spin tip="加载字段配置..." />
                  </div>
                ) : (
                  initiatorFields.map((field) => {
                    const rules = [];
                    if (field.required) {
                      rules.push({ required: true, message: `请输入${field.label}` });
                    }
                    return (
                      <Form.Item
                        key={field.name}
                        name={['formData', field.name]}
                        label={field.label}
                        rules={rules}
                        initialValue={field.defaultValue}
                      >
                        <Input
                          placeholder={field.placeholder || `请输入${field.label}`}
                          size="large"
                        />
                      </Form.Item>
                    );
                  })
                )}
              </Card>
            )}
          </div>
        )}

        {/* 步骤3: 完成 */}
        {currentStep === 2 && result && (
          <div className="space-y-4">
            <Card className="rounded-xl text-center">
              <CheckCircleOutlined className="text-5xl text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">签约发起成功</h3>
              <p className="text-gray-500 text-sm">合同编号: {result.contractNo}</p>
            </Card>

            <Card className="rounded-xl">
              <h4 className="font-medium mb-3">签署链接</h4>
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 break-all mb-4">
                {result.signUrl}
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <Button 
                  icon={<CopyOutlined />} 
                  onClick={handleCopyLink}
                  className="h-12"
                >
                  复制链接
                </Button>
                <Button 
                  icon={<QrcodeOutlined />} 
                  onClick={() => setShowQrModal(true)}
                  className="h-12"
                >
                  二维码
                </Button>
                <Button 
                  icon={<MessageOutlined />} 
                  onClick={handleSendSms}
                  className="h-12"
                >
                  发短信
                </Button>
              </div>
            </Card>

            <Card className="rounded-xl">
              <h4 className="font-medium mb-2">甲方信息</h4>
              <p className="text-sm text-gray-600">姓名: {result.partyBName}</p>
              <p className="text-sm text-gray-600">手机: {result.partyBPhone}</p>
            </Card>
          </div>
        )}
      </Form>

      {/* 底部按钮 */}
      {currentStep < 2 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4">
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button 
                size="large" 
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 h-12"
              >
                上一步
              </Button>
            )}
            <Button 
              type="primary" 
              size="large" 
              onClick={handleNext}
              loading={submitting}
              className="flex-1 h-12"
            >
              {currentStep === 1 ? '提交' : '下一步'}
            </Button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4">
          <Button 
            type="primary" 
            size="large" 
            block
            onClick={() => router.push('/m/contracts')}
            className="h-12"
          >
            查看我的签约
          </Button>
        </div>
      )}

      {/* 二维码弹窗 */}
      <Modal
        title="签署二维码"
        open={showQrModal}
        onCancel={() => setShowQrModal(false)}
        footer={null}
        centered
      >
        <div className="text-center py-4">
          {qrCodeUrl && (
            <img src={qrCodeUrl} alt="签署二维码" className="mx-auto" />
          )}
          <p className="text-gray-500 text-sm mt-4">请甲方扫描二维码进行签署</p>
        </div>
      </Modal>
    </div>
  );
}
