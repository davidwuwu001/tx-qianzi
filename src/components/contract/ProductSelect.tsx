'use client';

import { useState, useEffect } from 'react';
import { Select, Card, Spin, Empty, Typography, Space, Tag } from 'antd';
import { AppstoreOutlined, FileTextOutlined } from '@ant-design/icons';
import type { FormFieldConfig } from '@/services/product.service';

const { Text, Paragraph } = Typography;

// 产品信息接口
export interface ProductInfo {
  id: string;
  name: string;
  description: string | null;
  templateId: string;
  formFields: FormFieldConfig[] | null;
}

interface ProductSelectProps {
  cityId: string;
  value?: string;
  onChange?: (productId: string) => void;
  /** 产品信息变化回调（用于父组件获取完整产品信息） */
  onProductChange?: (product: ProductInfo | null) => void;
  disabled?: boolean;
}

/**
 * 产品选择组件
 * 从数据库加载当前城市可用的产品列表
 * 选择产品后显示模板信息
 * Requirements: 2.1, 2.2
 */
export default function ProductSelect({
  cityId,
  value,
  onChange,
  onProductChange,
  disabled = false,
}: ProductSelectProps) {
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductInfo | null>(null);

  // 加载产品列表
  useEffect(() => {
    if (!cityId) {
      setProducts([]);
      setSelectedProduct(null);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/products?cityId=${cityId}`);
        const data = await response.json();
        
        if (data.success && Array.isArray(data.products)) {
          setProducts(data.products);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error('加载产品列表失败:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [cityId]);

  // 当value变化时，更新选中的产品
  useEffect(() => {
    if (value && products.length > 0) {
      const product = products.find((p) => p.id === value);
      setSelectedProduct(product || null);
    } else {
      setSelectedProduct(null);
    }
  }, [value, products]);

  // 处理产品选择
  const handleChange = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setSelectedProduct(product || null);
    // 调用 onChange，只传递 productId（给 Ant Design Form 用）
    onChange?.(productId);
    // 调用 onProductChange，传递完整产品信息（给父组件用）
    onProductChange?.(product || null);
  };

  return (
    <div className="space-y-4">
      {/* 产品选择下拉框 */}
      <Select
        placeholder="请选择产品"
        value={value}
        onChange={handleChange}
        disabled={disabled || !cityId}
        loading={loading}
        className="w-full"
        size="large"
        showSearch
        optionFilterProp="label"
        notFoundContent={
          loading ? (
            <Spin size="small" />
          ) : (
            <Empty description="暂无可用产品" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )
        }
        options={products.map((product) => ({
          value: product.id,
          label: product.name,
        }))}
      />

      {/* 选中产品的详细信息 */}
      {selectedProduct && (
        <Card
          size="small"
          className="bg-blue-50 border-blue-200"
          title={
            <Space>
              <AppstoreOutlined className="text-blue-500" />
              <span>产品信息</span>
            </Space>
          }
        >
          <div className="space-y-2">
            <div>
              <Text strong>产品名称：</Text>
              <Text>{selectedProduct.name}</Text>
            </div>
            
            {selectedProduct.description && (
              <div>
                <Text strong>产品描述：</Text>
                <Paragraph className="!mb-0 text-gray-600">
                  {selectedProduct.description}
                </Paragraph>
              </div>
            )}
            
            <div>
              <Text strong>模板ID：</Text>
              <Tag icon={<FileTextOutlined />} color="blue">
                {selectedProduct.templateId}
              </Tag>
            </div>
          </div>
        </Card>
      )}

      {/* 未选择城市提示 */}
      {!cityId && (
        <Text type="secondary" className="text-sm">
          请先确认城市信息后选择产品
        </Text>
      )}
    </div>
  );
}
