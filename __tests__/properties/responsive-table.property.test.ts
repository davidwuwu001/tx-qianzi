/**
 * 响应式表格属性测试
 * 
 * Feature: admin-mobile-responsive
 * Property 5: 表格响应式列配置
 * Validates: Requirements 4.2, 4.4, 4.5
 */

import * as fc from 'fast-check';
import type { ColumnType } from 'antd/es/table';
import {
  getResponsiveColumns,
  getResponsivePagination,
  getResponsiveScroll,
  DEFAULT_MOBILE_HIDDEN_COLUMNS,
  DEFAULT_TABLET_HIDDEN_COLUMNS,
} from '@/utils/responsive-table';

// 测试用的数据类型
interface TestRecord {
  id: string;
  name: string;
  phone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// 生成测试列配置
const generateTestColumns = (): ColumnType<TestRecord>[] => [
  { key: 'id', dataIndex: 'id', title: 'ID', width: 80 },
  { key: 'name', dataIndex: 'name', title: '名称', width: 120 },
  { key: 'phone', dataIndex: 'phone', title: '电话', width: 130 },
  { key: 'status', dataIndex: 'status', title: '状态', width: 100 },
  { key: 'createdAt', dataIndex: 'createdAt', title: '创建时间', width: 170 },
  { key: 'updatedAt', dataIndex: 'updatedAt', title: '更新时间', width: 170 },
  { key: 'action', title: '操作', width: 100 },
];

describe('响应式表格属性测试', () => {
  /**
   * Property 5: 表格响应式列配置
   * 
   * For any 数据表格在移动端屏幕（宽度 < 768px），操作列应该固定在右侧，
   * 次要列（创建时间、更新时间等）应该被隐藏，分页应该使用简化模式。
   * 
   * Validates: Requirements 4.2, 4.4, 4.5
   */
  describe('Property 5: 表格响应式列配置', () => {
    it('移动端应该隐藏指定的次要列', () => {
      fc.assert(
        fc.property(
          // 生成随机的隐藏列列表
          fc.subarray(['phone', 'createdAt', 'updatedAt', 'status']),
          (hiddenColumns) => {
            const columns = generateTestColumns();
            const result = getResponsiveColumns(columns, {
              isMobile: true,
              isTablet: false,
              mobileHiddenColumns: hiddenColumns,
            });

            // 验证隐藏列不在结果中
            hiddenColumns.forEach((key) => {
              const found = result.find((col) => col.key === key);
              expect(found).toBeUndefined();
            });

            // 验证非隐藏列仍然存在
            const nonHiddenKeys = ['id', 'name', 'action'].filter(
              (k) => !hiddenColumns.includes(k)
            );
            nonHiddenKeys.forEach((key) => {
              const found = result.find((col) => col.key === key);
              expect(found).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('移动端操作列应该固定在右侧', () => {
      fc.assert(
        fc.property(
          // 生成随机的隐藏列配置
          fc.subarray(['phone', 'createdAt', 'updatedAt']),
          (hiddenColumns) => {
            const columns = generateTestColumns();
            const result = getResponsiveColumns(columns, {
              isMobile: true,
              isTablet: false,
              mobileHiddenColumns: hiddenColumns,
            });

            // 找到操作列
            const actionColumn = result.find((col) => col.key === 'action');
            
            // 验证操作列存在且固定在右侧
            expect(actionColumn).toBeDefined();
            expect(actionColumn?.fixed).toBe('right');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('移动端分页应该使用简化模式', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }), // 当前页
          fc.integer({ min: 10, max: 100 }), // 每页条数
          fc.integer({ min: 0, max: 10000 }), // 总条数
          (current, pageSize, total) => {
            const pagination = getResponsivePagination({
              isMobile: true,
              current,
              pageSize,
              total,
            });

            // 验证移动端分页配置
            expect(pagination.simple).toBe(true);
            expect(pagination.showSizeChanger).toBe(false);
            expect(pagination.showQuickJumper).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('桌面端分页应该显示完整功能', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 10, max: 100 }),
          fc.integer({ min: 0, max: 10000 }),
          (current, pageSize, total) => {
            const pagination = getResponsivePagination({
              isMobile: false,
              current,
              pageSize,
              total,
            });

            // 验证桌面端分页配置
            expect(pagination.simple).toBeUndefined();
            expect(pagination.showSizeChanger).toBe(true);
            expect(pagination.showQuickJumper).toBe(true);
            expect(pagination.showTotal).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('桌面端不应该隐藏任何列', () => {
      const columns = generateTestColumns();
      const result = getResponsiveColumns(columns, {
        isMobile: false,
        isTablet: false,
        mobileHiddenColumns: ['createdAt', 'updatedAt'],
        tabletHiddenColumns: ['updatedAt'],
      });

      // 桌面端应该保留所有列
      expect(result.length).toBe(columns.length);
    });

    it('平板端应该只隐藏平板端指定的列', () => {
      fc.assert(
        fc.property(
          fc.subarray(['createdAt', 'updatedAt']),
          (tabletHiddenColumns) => {
            const columns = generateTestColumns();
            const result = getResponsiveColumns(columns, {
              isMobile: false,
              isTablet: true,
              mobileHiddenColumns: ['phone', 'createdAt', 'updatedAt'],
              tabletHiddenColumns,
            });

            // 验证平板端隐藏列
            tabletHiddenColumns.forEach((key) => {
              const found = result.find((col) => col.key === key);
              expect(found).toBeUndefined();
            });

            // 验证移动端隐藏列在平板端仍然显示（除非也在平板端隐藏列表中）
            const mobileOnlyHidden = ['phone'].filter(
              (k) => !tabletHiddenColumns.includes(k)
            );
            mobileOnlyHidden.forEach((key) => {
              const found = result.find((col) => col.key === key);
              expect(found).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 表格滚动配置测试
   */
  describe('表格滚动配置', () => {
    it('移动端应该启用水平滚动', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 500, max: 1500 }),
          (minWidth) => {
            const scroll = getResponsiveScroll(true, minWidth);
            
            expect(scroll).toBeDefined();
            expect(scroll?.x).toBe(minWidth);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('桌面端不应该强制水平滚动', () => {
      const scroll = getResponsiveScroll(false);
      expect(scroll).toBeUndefined();
    });
  });

  /**
   * 默认隐藏列配置测试
   */
  describe('默认隐藏列配置', () => {
    it('默认移动端隐藏列应该包含时间戳列', () => {
      expect(DEFAULT_MOBILE_HIDDEN_COLUMNS).toContain('createdAt');
      expect(DEFAULT_MOBILE_HIDDEN_COLUMNS).toContain('updatedAt');
    });

    it('默认平板端隐藏列应该是移动端隐藏列的子集', () => {
      DEFAULT_TABLET_HIDDEN_COLUMNS.forEach((col) => {
        expect(DEFAULT_MOBILE_HIDDEN_COLUMNS).toContain(col);
      });
    });
  });

  /**
   * 列配置不变性测试
   */
  describe('列配置不变性', () => {
    it('原始列配置不应该被修改', () => {
      const columns = generateTestColumns();
      const originalColumns = JSON.stringify(columns);

      getResponsiveColumns(columns, {
        isMobile: true,
        isTablet: false,
        mobileHiddenColumns: ['createdAt'],
      });

      // 验证原始列配置未被修改
      expect(JSON.stringify(columns)).toBe(originalColumns);
    });
  });
});

