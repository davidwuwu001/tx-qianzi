'use client';

/**
 * 响应式筛选区域组件
 * 
 * 在移动端使用垂直堆叠布局，桌面端使用水平布局
 * 
 * @module components/common/ResponsiveFilter
 */

import React from 'react';
import { Card, Input, Button, DatePicker, Select, Space } from 'antd';
import { SearchOutlined, ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import { useResponsive } from '@/hooks/useResponsive';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

/**
 * 筛选项配置
 */
export interface FilterItem {
  /** 筛选项类型 */
  type: 'search' | 'select' | 'dateRange' | 'custom';
  /** 筛选项 key */
  key: string;
  /** 占位符文本 */
  placeholder?: string;
  /** 选择器选项（type 为 select 时使用） */
  options?: { label: string; value: string | number }[];
  /** 自定义渲染（type 为 custom 时使用） */
  render?: (isMobile: boolean) => React.ReactNode;
  /** 值 */
  value?: unknown;
  /** 值改变回调 */
  onChange?: (value: unknown) => void;
}

/**
 * 响应式筛选区域组件属性
 */
export interface ResponsiveFilterProps {
  /** 筛选项配置列表 */
  items?: FilterItem[];
  /** 子元素（替代 items 配置） */
  children?: React.ReactNode;
  /** 刷新按钮点击回调 */
  onRefresh?: () => void;
  /** 是否显示刷新按钮 */
  showRefresh?: boolean;
  /** 是否显示筛选按钮（移动端折叠筛选时使用） */
  showFilterButton?: boolean;
  /** 额外的操作按钮 */
  extra?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 是否使用卡片包裹 */
  useCard?: boolean;
}

/**
 * 响应式筛选区域组件
 * 
 * 特性：
 * - 移动端：垂直堆叠布局，输入框全宽
 * - 桌面端：水平布局，输入框固定宽度
 * - 支持搜索框、选择器、日期范围选择器
 * - 支持自定义筛选项
 * 
 * @example
 * ```tsx
 * <ResponsiveFilter
 *   items={[
 *     { type: 'search', key: 'keyword', placeholder: '搜索...' },
 *     { type: 'select', key: 'status', options: statusOptions },
 *     { type: 'dateRange', key: 'dateRange' },
 *   ]}
 *   onRefresh={handleRefresh}
 * />
 * ```
 */
export function ResponsiveFilter({
  items,
  children,
  onRefresh,
  showRefresh = true,
  showFilterButton = false,
  extra,
  className = '',
  useCard = true,
}: ResponsiveFilterProps) {
  const { isMobile } = useResponsive();

  // 渲染筛选项
  const renderFilterItem = (item: FilterItem, index: number) => {
    const itemStyle = isMobile ? { width: '100%' } : {};

    switch (item.type) {
      case 'search':
        return (
          <Input.Search
            key={item.key || index}
            placeholder={item.placeholder || '搜索...'}
            style={{ width: isMobile ? '100%' : 250, ...itemStyle }}
            value={item.value as string}
            onChange={(e) => item.onChange?.(e.target.value)}
            onSearch={(value) => item.onChange?.(value)}
            allowClear
          />
        );

      case 'select':
        return (
          <Select
            key={item.key || index}
            placeholder={item.placeholder || '请选择'}
            style={{ width: isMobile ? '100%' : 150, ...itemStyle }}
            options={item.options}
            value={item.value}
            onChange={item.onChange}
            allowClear
          />
        );

      case 'dateRange':
        return (
          <RangePicker
            key={item.key || index}
            style={{ width: isMobile ? '100%' : 'auto', ...itemStyle }}
            placeholder={['开始日期', '结束日期']}
            value={item.value as [Dayjs | null, Dayjs | null] | null}
            onChange={item.onChange}
          />
        );

      case 'custom':
        return item.render?.(isMobile);

      default:
        return null;
    }
  };

  // 筛选内容
  const filterContent = (
    <div
      className={`flex items-center ${
        isMobile ? 'flex-col gap-3' : 'flex-row flex-wrap gap-4'
      }`}
    >
      {/* 渲染配置的筛选项 */}
      {items?.map((item, index) => renderFilterItem(item, index))}

      {/* 渲染子元素 */}
      {children}

      {/* 操作按钮区域 */}
      <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
        {/* 筛选按钮（移动端可选） */}
        {showFilterButton && isMobile && (
          <Button
            icon={<FilterOutlined />}
            className={isMobile ? 'flex-1' : ''}
          >
            {isMobile ? '' : '筛选'}
          </Button>
        )}

        {/* 刷新按钮 */}
        {showRefresh && (
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            className={isMobile ? 'flex-1' : ''}
          >
            {isMobile ? '' : '刷新'}
          </Button>
        )}

        {/* 额外操作 */}
        {extra}
      </div>
    </div>
  );

  // 是否使用卡片包裹
  if (useCard) {
    return (
      <Card className={`mb-4 ${className}`} size={isMobile ? 'small' : 'default'}>
        {filterContent}
      </Card>
    );
  }

  return <div className={`mb-4 ${className}`}>{filterContent}</div>;
}

/**
 * 简单的响应式搜索框组件
 * 
 * @example
 * ```tsx
 * <ResponsiveSearch
 *   value={keyword}
 *   onChange={setKeyword}
 *   onSearch={handleSearch}
 *   placeholder="搜索合同..."
 * />
 * ```
 */
export function ResponsiveSearch({
  value,
  onChange,
  onSearch,
  placeholder = '搜索...',
  className = '',
}: {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const { isMobile } = useResponsive();

  return (
    <Input.Search
      placeholder={placeholder}
      style={{ width: isMobile ? '100%' : 250 }}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onSearch={onSearch}
      allowClear
      className={className}
    />
  );
}

/**
 * 简单的响应式日期范围选择器组件
 */
export function ResponsiveDateRange({
  value,
  onChange,
  className = '',
}: {
  value?: [Dayjs | null, Dayjs | null] | null;
  onChange?: (value: unknown) => void;
  className?: string;
}) {
  const { isMobile } = useResponsive();

  return (
    <RangePicker
      style={{ width: isMobile ? '100%' : 'auto' }}
      placeholder={['开始日期', '结束日期']}
      value={value}
      onChange={onChange}
      className={className}
    />
  );
}

export default ResponsiveFilter;

