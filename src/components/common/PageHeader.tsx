'use client';

/**
 * 响应式页面标题组件
 * 
 * 在移动端使用垂直堆叠布局，桌面端使用水平布局
 * 
 * @module components/common/PageHeader
 */

import React from 'react';
import { Typography, Space, Button } from 'antd';
import { useResponsive } from '@/hooks/useResponsive';

const { Title, Text } = Typography;

/**
 * 操作按钮配置
 */
export interface ActionButton {
  /** 按钮文本 */
  text: string;
  /** 按钮类型 */
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  /** 按钮图标 */
  icon?: React.ReactNode;
  /** 点击回调 */
  onClick?: () => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否危险按钮 */
  danger?: boolean;
  /** 是否加载中 */
  loading?: boolean;
}

/**
 * 响应式页面标题组件属性
 */
export interface PageHeaderProps {
  /** 页面标题 */
  title: string;
  /** 页面描述 */
  description?: string;
  /** 操作按钮（使用配置方式） */
  actions?: ActionButton[];
  /** 操作区域（使用自定义渲染） */
  extra?: React.ReactNode;
  /** 返回按钮点击回调 */
  onBack?: () => void;
  /** 是否显示返回按钮 */
  showBack?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 标题级别 */
  level?: 1 | 2 | 3 | 4 | 5;
}

/**
 * 响应式页面标题组件
 * 
 * 特性：
 * - 移动端：垂直堆叠布局，操作按钮全宽
 * - 桌面端：水平布局，标题和操作按钮在同一行
 * - 支持描述文字，移动端使用更小字号
 * - 支持配置式和自定义渲染两种操作按钮方式
 * 
 * @example
 * ```tsx
 * <PageHeader
 *   title="签约管理"
 *   description="管理所有合同签约记录"
 *   actions={[
 *     { text: '新增', type: 'primary', icon: <PlusOutlined />, onClick: handleAdd },
 *     { text: '导出', onClick: handleExport },
 *   ]}
 * />
 * ```
 */
export function PageHeader({
  title,
  description,
  actions,
  extra,
  onBack,
  showBack = false,
  className = '',
  level = 4,
}: PageHeaderProps) {
  const { isMobile } = useResponsive();

  // 渲染操作按钮
  const renderActions = () => {
    if (extra) {
      return extra;
    }

    if (!actions || actions.length === 0) {
      return null;
    }

    return (
      <Space
        direction={isMobile ? 'vertical' : 'horizontal'}
        className={isMobile ? 'w-full' : ''}
        size={isMobile ? 'small' : 'middle'}
      >
        {actions.map((action, index) => (
          <Button
            key={index}
            type={action.type}
            icon={action.icon}
            onClick={action.onClick}
            disabled={action.disabled}
            danger={action.danger}
            loading={action.loading}
            block={isMobile}
          >
            {action.text}
          </Button>
        ))}
      </Space>
    );
  };

  return (
    <div
      className={`${
        isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between'
      } mb-4 ${className}`}
    >
      {/* 标题区域 */}
      <div className={isMobile ? '' : 'flex-1'}>
        <Title
          level={level}
          className={`!mb-0 ${isMobile ? '!text-lg' : ''}`}
        >
          {title}
        </Title>
        {description && (
          <Text
            type="secondary"
            className={`block mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}
          >
            {description}
          </Text>
        )}
      </div>

      {/* 操作区域 */}
      {(actions || extra) && (
        <div className={isMobile ? 'w-full' : ''}>
          {renderActions()}
        </div>
      )}
    </div>
  );
}

/**
 * 简单的页面标题组件（无操作按钮）
 */
export function SimplePageHeader({
  title,
  description,
  className = '',
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  const { isMobile } = useResponsive();

  return (
    <div className={`mb-4 ${className}`}>
      <Title level={4} className={`!mb-0 ${isMobile ? '!text-lg' : ''}`}>
        {title}
      </Title>
      {description && (
        <Text
          type="secondary"
          className={`block mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}
        >
          {description}
        </Text>
      )}
    </div>
  );
}

export default PageHeader;

