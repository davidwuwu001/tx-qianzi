/**
 * 响应式表格工具函数
 * 
 * 提供表格在不同屏幕尺寸下的配置工具
 * 
 * @module utils/responsive-table
 */

import type { TableProps, TablePaginationConfig } from 'antd';
import type { ColumnType } from 'antd/es/table';

/**
 * 响应式列配置选项
 */
export interface ResponsiveColumnOptions {
  /** 是否为移动端 */
  isMobile: boolean;
  /** 是否为平板端 */
  isTablet: boolean;
  /** 移动端隐藏的列 key 列表 */
  mobileHiddenColumns?: string[];
  /** 平板端隐藏的列 key 列表 */
  tabletHiddenColumns?: string[];
  /** 操作列的 key（默认为 'action'） */
  actionColumnKey?: string;
}

/**
 * 响应式分页配置选项
 */
export interface ResponsivePaginationOptions {
  /** 是否为移动端 */
  isMobile: boolean;
  /** 当前页码 */
  current: number;
  /** 每页条数 */
  pageSize: number;
  /** 总条数 */
  total: number;
  /** 页码改变回调 */
  onChange?: (page: number, pageSize: number) => void;
}

/**
 * 获取响应式表格列配置
 * 
 * 根据屏幕尺寸过滤和调整表格列：
 * - 移动端：隐藏指定列，固定操作列在右侧，调整列宽
 * - 平板端：隐藏指定列
 * - 桌面端：显示所有列
 * 
 * @param columns - 原始列配置
 * @param options - 响应式配置选项
 * @returns 处理后的列配置
 * 
 * @example
 * ```tsx
 * const columns = getResponsiveColumns(baseColumns, {
 *   isMobile,
 *   isTablet,
 *   mobileHiddenColumns: ['createdAt', 'updatedAt', 'phone'],
 *   tabletHiddenColumns: ['updatedAt'],
 * });
 * ```
 */
export function getResponsiveColumns<T>(
  columns: ColumnType<T>[],
  options: ResponsiveColumnOptions
): ColumnType<T>[] {
  const {
    isMobile,
    isTablet,
    mobileHiddenColumns = [],
    tabletHiddenColumns = [],
    actionColumnKey = 'action',
  } = options;

  // 过滤隐藏的列
  let filteredColumns = columns.filter((col) => {
    const key = (col.key || col.dataIndex) as string;
    
    // 移动端隐藏指定列
    if (isMobile && mobileHiddenColumns.includes(key)) {
      return false;
    }
    
    // 平板端隐藏指定列
    if (isTablet && tabletHiddenColumns.includes(key)) {
      return false;
    }
    
    return true;
  });

  // 移动端调整列配置
  if (isMobile) {
    filteredColumns = filteredColumns.map((col) => {
      const key = (col.key || col.dataIndex) as string;
      const newCol = { ...col };

      // 操作列固定在右侧
      if (key === actionColumnKey) {
        newCol.fixed = 'right';
        newCol.width = newCol.width || 80;
      }

      // 调整列宽（移动端使用更紧凑的宽度）
      if (typeof newCol.width === 'number' && newCol.width > 150) {
        newCol.width = Math.max(100, newCol.width * 0.7);
      }

      return newCol;
    });
  }

  return filteredColumns;
}

/**
 * 获取响应式分页配置
 * 
 * 根据屏幕尺寸调整分页组件：
 * - 移动端：使用简化模式，隐藏页码选择器和快速跳转
 * - 桌面端：显示完整分页功能
 * 
 * @param options - 分页配置选项
 * @returns 分页配置对象
 * 
 * @example
 * ```tsx
 * const pagination = getResponsivePagination({
 *   isMobile,
 *   current: 1,
 *   pageSize: 10,
 *   total: 100,
 *   onChange: handlePageChange,
 * });
 * ```
 */
export function getResponsivePagination(
  options: ResponsivePaginationOptions
): TablePaginationConfig {
  const { isMobile, current, pageSize, total, onChange } = options;

  if (isMobile) {
    // 移动端简化分页
    return {
      current,
      pageSize,
      total,
      simple: true,
      onChange,
      showSizeChanger: false,
      showQuickJumper: false,
    };
  }

  // 桌面端完整分页
  return {
    current,
    pageSize,
    total,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
    onChange,
    pageSizeOptions: ['10', '20', '50', '100'],
  };
}

/**
 * 获取响应式表格滚动配置
 * 
 * 移动端启用水平滚动，桌面端根据内容自适应
 * 
 * @param isMobile - 是否为移动端
 * @param minWidth - 最小宽度（移动端滚动区域宽度）
 * @returns 滚动配置对象
 */
export function getResponsiveScroll(
  isMobile: boolean,
  minWidth: number = 800
): TableProps<unknown>['scroll'] {
  if (isMobile) {
    return {
      x: minWidth,
    };
  }

  return undefined;
}

/**
 * 默认的移动端隐藏列
 * 通常包括时间戳和次要信息列
 */
export const DEFAULT_MOBILE_HIDDEN_COLUMNS = [
  'createdAt',
  'updatedAt',
  'createTime',
  'updateTime',
  'description',
  'remark',
];

/**
 * 默认的平板端隐藏列
 * 通常只隐藏更新时间
 */
export const DEFAULT_TABLET_HIDDEN_COLUMNS = [
  'updatedAt',
  'updateTime',
];

