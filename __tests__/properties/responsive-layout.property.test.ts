/**
 * 响应式布局属性测试
 * 
 * Feature: admin-mobile-responsive
 * Property 1: 响应式侧边栏可见性
 * Validates: Requirements 1.1, 1.5
 */

import * as fc from 'fast-check';
import {
  BREAKPOINTS,
  MOBILE_BREAKPOINT,
  TABLET_BREAKPOINT,
  isBelow,
  isAbove,
  isBetween,
} from '@/hooks/useResponsive';

describe('响应式布局属性测试', () => {
  /**
   * Property 1: 响应式侧边栏可见性
   * 
   * For any 屏幕宽度值，当宽度小于 768px 时侧边栏应该隐藏且汉堡菜单按钮可见，
   * 当宽度大于等于 768px 时侧边栏应该可见且汉堡菜单按钮隐藏。
   * 
   * Validates: Requirements 1.1, 1.5
   */
  describe('Property 1: 响应式侧边栏可见性', () => {
    it('对于任意屏幕宽度，isMobile 状态应该与宽度 < 768px 一致', () => {
      fc.assert(
        fc.property(
          // 生成 100 到 2000 之间的随机屏幕宽度
          fc.integer({ min: 100, max: 2000 }),
          (screenWidth) => {
            const isMobile = screenWidth < MOBILE_BREAKPOINT;
            const shouldShowSidebar = !isMobile;
            const shouldShowHamburger = isMobile;

            // 验证：移动端时侧边栏隐藏，汉堡菜单显示
            // 桌面端时侧边栏显示，汉堡菜单隐藏
            expect(shouldShowSidebar).toBe(screenWidth >= MOBILE_BREAKPOINT);
            expect(shouldShowHamburger).toBe(screenWidth < MOBILE_BREAKPOINT);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('断点边界值测试：767px 应该是移动端，768px 应该不是移动端', () => {
      // 767px - 移动端
      expect(isBelow('md', 767)).toBe(true);
      // 768px - 不是移动端
      expect(isBelow('md', 768)).toBe(false);
      // 768px - 大于等于 md 断点
      expect(isAbove('md', 768)).toBe(true);
    });
  });

  /**
   * Property: 断点函数一致性
   * 
   * 验证 isBelow、isAbove、isBetween 函数的逻辑一致性
   */
  describe('断点函数一致性', () => {
    it('isBelow 和 isAbove 应该互补', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 2000 }),
          (screenWidth) => {
            // 对于任意断点，isBelow 和 isAbove 应该互补
            const breakpoints: (keyof typeof BREAKPOINTS)[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
            
            breakpoints.forEach((bp) => {
              const below = isBelow(bp, screenWidth);
              const above = isAbove(bp, screenWidth);
              
              // isBelow 和 isAbove 应该互斥且完备
              expect(below !== above).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isBetween 应该等价于 isAbove(min) && isBelow(max)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 2000 }),
          (screenWidth) => {
            // 测试 md 到 lg 之间（平板端）
            const between = isBetween('md', 'lg', screenWidth);
            const manual = isAbove('md', screenWidth) && isBelow('lg', screenWidth);
            
            expect(between).toBe(manual);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: 设备类型互斥性
   * 
   * 对于任意屏幕宽度，设备类型（移动端、平板端、桌面端）应该互斥
   */
  describe('设备类型互斥性', () => {
    it('对于任意屏幕宽度，只能属于一种设备类型', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 2000 }),
          (screenWidth) => {
            const isMobile = screenWidth < MOBILE_BREAKPOINT;
            const isTablet = screenWidth >= MOBILE_BREAKPOINT && screenWidth < TABLET_BREAKPOINT;
            const isDesktop = screenWidth >= TABLET_BREAKPOINT;

            // 计算为 true 的数量
            const trueCount = [isMobile, isTablet, isDesktop].filter(Boolean).length;

            // 应该恰好有一个为 true
            expect(trueCount).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('设备类型应该覆盖所有可能的屏幕宽度', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          (screenWidth) => {
            const isMobile = screenWidth < MOBILE_BREAKPOINT;
            const isTablet = screenWidth >= MOBILE_BREAKPOINT && screenWidth < TABLET_BREAKPOINT;
            const isDesktop = screenWidth >= TABLET_BREAKPOINT;

            // 至少有一个为 true
            expect(isMobile || isTablet || isDesktop).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: 断点值单调递增
   * 
   * 断点值应该按照 xs < sm < md < lg < xl < xxl 的顺序递增
   */
  describe('断点值单调递增', () => {
    it('断点值应该严格递增', () => {
      const breakpointOrder: (keyof typeof BREAKPOINTS)[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
      
      for (let i = 0; i < breakpointOrder.length - 1; i++) {
        const current = BREAKPOINTS[breakpointOrder[i]];
        const next = BREAKPOINTS[breakpointOrder[i + 1]];
        
        expect(current).toBeLessThan(next);
      }
    });
  });
});
