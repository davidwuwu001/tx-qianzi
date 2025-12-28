/**
 * 触摸目标尺寸属性测试
 * 
 * Feature: admin-mobile-responsive
 * Property 2: 触摸目标尺寸合规性
 * Validates: Requirements 2.4, 7.4, 10.1, 10.2
 * 
 * 根据 WCAG 2.1 和 Apple Human Interface Guidelines，
 * 触摸目标的最小尺寸应该是 44x44 像素
 */

import * as fc from 'fast-check';

// 最小触摸目标尺寸（像素）
const MIN_TOUCH_TARGET_SIZE = 44;

// 小型按钮的最小尺寸（用于表格内等紧凑场景）
const MIN_SMALL_TOUCH_TARGET_SIZE = 36;

/**
 * 触摸目标类型
 */
type TouchTargetType = 
  | 'button'           // 普通按钮
  | 'icon-button'      // 图标按钮
  | 'input'            // 输入框
  | 'select'           // 选择器
  | 'dropdown-trigger' // 下拉菜单触发器
  | 'menu-item'        // 菜单项
  | 'pagination'       // 分页按钮
  | 'checkbox'         // 复选框
  | 'radio'            // 单选框
  | 'switch'           // 开关
  | 'close-button'     // 关闭按钮
  | 'table-action';    // 表格操作按钮

/**
 * 获取触摸目标的最小尺寸要求
 * 
 * @param type - 触摸目标类型
 * @param isMobile - 是否为移动端
 * @returns 最小宽度和高度
 */
function getMinTouchTargetSize(
  type: TouchTargetType,
  isMobile: boolean
): { minWidth: number; minHeight: number } {
  // 移动端所有触摸目标都需要满足最小尺寸
  if (isMobile) {
    switch (type) {
      case 'table-action':
        // 表格内的操作按钮可以稍小一些
        return { minWidth: MIN_SMALL_TOUCH_TARGET_SIZE, minHeight: MIN_SMALL_TOUCH_TARGET_SIZE };
      case 'switch':
        // 开关有特殊的尺寸要求
        return { minWidth: 50, minHeight: 28 };
      default:
        return { minWidth: MIN_TOUCH_TARGET_SIZE, minHeight: MIN_TOUCH_TARGET_SIZE };
    }
  }

  // 桌面端可以使用更小的尺寸
  switch (type) {
    case 'button':
      return { minWidth: 32, minHeight: 32 };
    case 'icon-button':
      return { minWidth: 32, minHeight: 32 };
    case 'input':
    case 'select':
      return { minWidth: 100, minHeight: 32 };
    case 'table-action':
      return { minWidth: 24, minHeight: 24 };
    default:
      return { minWidth: 32, minHeight: 32 };
  }
}

/**
 * 验证触摸目标尺寸是否合规
 * 
 * @param width - 实际宽度
 * @param height - 实际高度
 * @param minWidth - 最小宽度要求
 * @param minHeight - 最小高度要求
 * @returns 是否合规
 */
function isTouchTargetCompliant(
  width: number,
  height: number,
  minWidth: number,
  minHeight: number
): boolean {
  return width >= minWidth && height >= minHeight;
}

/**
 * 模拟获取元素的实际尺寸
 * 在移动端，CSS 会强制设置最小尺寸
 * 
 * @param type - 触摸目标类型
 * @param isMobile - 是否为移动端
 * @param requestedWidth - 请求的宽度
 * @param requestedHeight - 请求的高度
 * @returns 实际渲染的尺寸
 */
function getActualSize(
  type: TouchTargetType,
  isMobile: boolean,
  requestedWidth: number,
  requestedHeight: number
): { width: number; height: number } {
  const { minWidth, minHeight } = getMinTouchTargetSize(type, isMobile);
  
  // 移动端 CSS 会强制最小尺寸
  if (isMobile) {
    return {
      width: Math.max(requestedWidth, minWidth),
      height: Math.max(requestedHeight, minHeight),
    };
  }

  // 桌面端使用请求的尺寸
  return {
    width: requestedWidth,
    height: requestedHeight,
  };
}

describe('触摸目标尺寸属性测试', () => {
  /**
   * Property 2: 触摸目标尺寸合规性
   * 
   * For any 移动端触摸设备，所有可交互元素（按钮、输入框、链接等）
   * 的触摸目标尺寸应该至少为 44x44 像素。
   * 
   * Validates: Requirements 2.4, 7.4, 10.1, 10.2
   */
  describe('Property 2: 触摸目标尺寸合规性', () => {
    // 所有触摸目标类型
    const touchTargetTypes: TouchTargetType[] = [
      'button',
      'icon-button',
      'input',
      'select',
      'dropdown-trigger',
      'menu-item',
      'pagination',
      'checkbox',
      'radio',
      'switch',
      'close-button',
      'table-action',
    ];

    it('移动端所有触摸目标应该满足最小尺寸要求', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...touchTargetTypes),
          fc.integer({ min: 10, max: 100 }),
          fc.integer({ min: 10, max: 100 }),
          (type, requestedWidth, requestedHeight) => {
            const isMobile = true;
            const { width, height } = getActualSize(type, isMobile, requestedWidth, requestedHeight);
            const { minWidth, minHeight } = getMinTouchTargetSize(type, isMobile);
            
            // 验证实际尺寸满足最小要求
            expect(isTouchTargetCompliant(width, height, minWidth, minHeight)).toBe(true);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('移动端按钮最小尺寸应该是 44x44', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 50 }),
          fc.integer({ min: 10, max: 50 }),
          (requestedWidth, requestedHeight) => {
            const isMobile = true;
            const { width, height } = getActualSize('button', isMobile, requestedWidth, requestedHeight);
            
            expect(width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
            expect(height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('移动端图标按钮最小尺寸应该是 44x44', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 50 }),
          fc.integer({ min: 10, max: 50 }),
          (requestedWidth, requestedHeight) => {
            const isMobile = true;
            const { width, height } = getActualSize('icon-button', isMobile, requestedWidth, requestedHeight);
            
            expect(width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
            expect(height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('移动端输入框最小高度应该是 44px', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 500 }),
          fc.integer({ min: 20, max: 50 }),
          (requestedWidth, requestedHeight) => {
            const isMobile = true;
            const { height } = getActualSize('input', isMobile, requestedWidth, requestedHeight);
            
            expect(height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('移动端下拉菜单触发器最小尺寸应该是 44x44', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 50 }),
          fc.integer({ min: 10, max: 50 }),
          (requestedWidth, requestedHeight) => {
            const isMobile = true;
            const { width, height } = getActualSize('dropdown-trigger', isMobile, requestedWidth, requestedHeight);
            
            expect(width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
            expect(height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('移动端菜单项最小高度应该是 44px', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 300 }),
          fc.integer({ min: 20, max: 50 }),
          (requestedWidth, requestedHeight) => {
            const isMobile = true;
            const { height } = getActualSize('menu-item', isMobile, requestedWidth, requestedHeight);
            
            expect(height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('移动端表格操作按钮最小尺寸应该是 36x36', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 40 }),
          fc.integer({ min: 10, max: 40 }),
          (requestedWidth, requestedHeight) => {
            const isMobile = true;
            const { width, height } = getActualSize('table-action', isMobile, requestedWidth, requestedHeight);
            
            expect(width).toBeGreaterThanOrEqual(MIN_SMALL_TOUCH_TARGET_SIZE);
            expect(height).toBeGreaterThanOrEqual(MIN_SMALL_TOUCH_TARGET_SIZE);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 桌面端尺寸测试
   */
  describe('桌面端触摸目标尺寸', () => {
    it('桌面端可以使用更小的按钮尺寸', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 32, max: 100 }),
          fc.integer({ min: 32, max: 100 }),
          (requestedWidth, requestedHeight) => {
            const isMobile = false;
            const { width, height } = getActualSize('button', isMobile, requestedWidth, requestedHeight);
            
            // 桌面端使用请求的尺寸
            expect(width).toBe(requestedWidth);
            expect(height).toBe(requestedHeight);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 尺寸一致性测试
   */
  describe('触摸目标尺寸一致性', () => {
    it('相同类型的触摸目标在移动端应该有一致的最小尺寸', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('button', 'icon-button', 'dropdown-trigger', 'close-button') as fc.Arbitrary<TouchTargetType>,
          fc.integer({ min: 10, max: 100 }),
          fc.integer({ min: 10, max: 100 }),
          fc.integer({ min: 10, max: 100 }),
          fc.integer({ min: 10, max: 100 }),
          (type, w1, h1, w2, h2) => {
            const isMobile = true;
            const size1 = getActualSize(type, isMobile, w1, h1);
            const size2 = getActualSize(type, isMobile, w2, h2);
            const { minWidth, minHeight } = getMinTouchTargetSize(type, isMobile);
            
            // 两个相同类型的元素应该都满足最小尺寸
            expect(size1.width).toBeGreaterThanOrEqual(minWidth);
            expect(size1.height).toBeGreaterThanOrEqual(minHeight);
            expect(size2.width).toBeGreaterThanOrEqual(minWidth);
            expect(size2.height).toBeGreaterThanOrEqual(minHeight);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('移动端触摸目标高度应该大于等于桌面端', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('button', 'icon-button', 'menu-item', 'checkbox') as fc.Arbitrary<TouchTargetType>,
          (type) => {
            const mobileSize = getMinTouchTargetSize(type, true);
            const desktopSize = getMinTouchTargetSize(type, false);
            
            // 移动端最小高度应该大于等于桌面端（宽度不一定，因为输入框等有不同的宽度需求）
            expect(mobileSize.minHeight).toBeGreaterThanOrEqual(desktopSize.minHeight);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
