/**
 * 响应式弹窗属性测试
 * 
 * Feature: admin-mobile-responsive
 * Property 7: 移动端弹窗布局
 * Validates: Requirements 7.1, 7.2
 */

import * as fc from 'fast-check';
import { MOBILE_BREAKPOINT } from '@/hooks/useResponsive';
import {
  getResponsiveModalProps,
  getResponsiveDrawerProps,
  getResponsiveConfirmProps,
  MOBILE_MODAL_MIN_HEIGHT,
  MOBILE_MODAL_MAX_HEIGHT,
  DESKTOP_MODAL_WIDTH,
} from '@/utils/responsive-modal';

describe('响应式弹窗属性测试', () => {
  /**
   * Property 7: 移动端弹窗布局
   * 
   * For any 移动端屏幕（宽度 < 768px），Modal 弹窗的宽度应该接近 100%，
   * 且应该从顶部开始显示（top: 0）。
   * 
   * Validates: Requirements 7.1, 7.2
   */
  describe('Property 7: 移动端弹窗布局', () => {
    it('移动端弹窗宽度应该接近 100%', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: MOBILE_BREAKPOINT - 1 }),
          (screenWidth) => {
            const isMobile = screenWidth < MOBILE_BREAKPOINT;
            const props = getResponsiveModalProps({ isMobile });
            
            // 移动端宽度应该是 100%
            expect(props.width).toBe('100%');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('移动端弹窗应该从顶部开始显示', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: MOBILE_BREAKPOINT - 1 }),
          (screenWidth) => {
            const isMobile = screenWidth < MOBILE_BREAKPOINT;
            const props = getResponsiveModalProps({ isMobile });
            
            // 移动端 top 应该是 0
            expect(props.style.top).toBe(0);
            // 移动端不应该居中
            expect(props.centered).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('移动端弹窗应该有 mobile-modal 类名', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: MOBILE_BREAKPOINT - 1 }),
          (screenWidth) => {
            const isMobile = screenWidth < MOBILE_BREAKPOINT;
            const props = getResponsiveModalProps({ isMobile });
            
            expect(props.className).toBe('mobile-modal');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('移动端弹窗内容应该可滚动', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: MOBILE_BREAKPOINT - 1 }),
          (screenWidth) => {
            const isMobile = screenWidth < MOBILE_BREAKPOINT;
            const props = getResponsiveModalProps({ isMobile });
            
            // 应该有 body 样式配置
            expect(props.styles?.body).toBeDefined();
            expect(props.styles?.body?.overflowY).toBe('auto');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('桌面端弹窗应该使用默认宽度', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: MOBILE_BREAKPOINT, max: 2000 }),
          (screenWidth) => {
            const isMobile = screenWidth < MOBILE_BREAKPOINT;
            const props = getResponsiveModalProps({ isMobile });
            
            // 桌面端应该使用默认宽度
            expect(props.width).toBe(DESKTOP_MODAL_WIDTH);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('桌面端弹窗应该居中显示', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: MOBILE_BREAKPOINT, max: 2000 }),
          (screenWidth) => {
            const isMobile = screenWidth < MOBILE_BREAKPOINT;
            const props = getResponsiveModalProps({ isMobile });
            
            expect(props.centered).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('桌面端弹窗不应该有 mobile-modal 类名', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: MOBILE_BREAKPOINT, max: 2000 }),
          (screenWidth) => {
            const isMobile = screenWidth < MOBILE_BREAKPOINT;
            const props = getResponsiveModalProps({ isMobile });
            
            expect(props.className).toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 自定义宽度测试
   */
  describe('自定义宽度配置', () => {
    it('应该支持自定义桌面端宽度', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 300, max: 800 }),
          (customWidth) => {
            const props = getResponsiveModalProps({
              isMobile: false,
              desktopWidth: customWidth,
            });
            
            expect(props.width).toBe(customWidth);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应该支持自定义移动端宽度', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('100%', '95%', '90%'),
          (customWidth) => {
            const props = getResponsiveModalProps({
              isMobile: true,
              mobileWidth: customWidth,
            });
            
            expect(props.width).toBe(customWidth);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 抽屉配置测试
   */
  describe('响应式抽屉配置', () => {
    it('移动端抽屉应该从底部滑入', () => {
      const props = getResponsiveDrawerProps(true);
      
      expect(props.placement).toBe('bottom');
      expect(props.width).toBe('100%');
      expect(props.height).toBe('90vh');
    });

    it('桌面端抽屉应该从右侧滑入', () => {
      const props = getResponsiveDrawerProps(false);
      
      expect(props.placement).toBe('right');
      expect(props.width).toBe(520);
    });
  });

  /**
   * 确认弹窗配置测试
   */
  describe('响应式确认弹窗配置', () => {
    it('移动端确认弹窗应该使用 90% 宽度', () => {
      const props = getResponsiveConfirmProps(true);
      
      expect(props.width).toBe('90%');
      expect(props.centered).toBe(true);
    });

    it('桌面端确认弹窗应该使用默认宽度', () => {
      const props = getResponsiveConfirmProps(false);
      
      expect(props.width).toBe(416);
      expect(props.centered).toBe(true);
    });
  });

  /**
   * 常量值测试
   */
  describe('常量值', () => {
    it('移动端弹窗最小高度应该是 50vh', () => {
      expect(MOBILE_MODAL_MIN_HEIGHT).toBe('50vh');
    });

    it('移动端弹窗最大高度应该是 90vh', () => {
      expect(MOBILE_MODAL_MAX_HEIGHT).toBe('90vh');
    });

    it('桌面端默认弹窗宽度应该是 520', () => {
      expect(DESKTOP_MODAL_WIDTH).toBe(520);
    });
  });
});

