'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * 响应式断点定义
 * 与 Ant Design 和 Tailwind CSS 的断点保持一致
 */
export const BREAKPOINTS = {
  xs: 480,   // 超小屏手机
  sm: 576,   // 小屏手机
  md: 768,   // 平板/大屏手机（主要移动端断点）
  lg: 992,   // 小型桌面
  xl: 1200,  // 标准桌面
  xxl: 1600, // 大屏桌面
} as const;

/**
 * 移动端断点 - 小于此宽度视为移动设备
 */
export const MOBILE_BREAKPOINT = BREAKPOINTS.md;

/**
 * 平板断点 - 介于移动端和桌面端之间
 */
export const TABLET_BREAKPOINT = BREAKPOINTS.lg;

/**
 * 响应式状态接口
 */
export interface ResponsiveState {
  /** 是否为移动端 (< 768px) */
  isMobile: boolean;
  /** 是否为平板端 (768px - 991px) */
  isTablet: boolean;
  /** 是否为桌面端 (>= 992px) */
  isDesktop: boolean;
  /** 当前屏幕宽度 */
  screenWidth: number;
  /** 当前屏幕高度 */
  screenHeight: number;
}

/**
 * 获取初始响应式状态
 * 在 SSR 环境下返回桌面端默认值
 */
const getInitialState = (): ResponsiveState => {
  // SSR 环境下，默认使用桌面端布局
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      screenWidth: 1200,
      screenHeight: 800,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    isMobile: width < MOBILE_BREAKPOINT,
    isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
    isDesktop: width >= TABLET_BREAKPOINT,
    screenWidth: width,
    screenHeight: height,
  };
};

/**
 * 响应式状态管理 Hook
 * 
 * 用于检测当前屏幕尺寸并返回响应式状态
 * 支持 SSR，在服务端渲染时返回桌面端默认值
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isMobile, isTablet, isDesktop } = useResponsive();
 *   
 *   return (
 *     <div>
 *       {isMobile && <MobileLayout />}
 *       {isTablet && <TabletLayout />}
 *       {isDesktop && <DesktopLayout />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(getInitialState);

  // 处理窗口大小变化
  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    setState({
      isMobile: width < MOBILE_BREAKPOINT,
      isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
      isDesktop: width >= TABLET_BREAKPOINT,
      screenWidth: width,
      screenHeight: height,
    });
  }, []);

  useEffect(() => {
    // 客户端初始化时立即检测
    handleResize();

    // 监听窗口大小变化
    window.addEventListener('resize', handleResize);

    // 清理监听器
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  return state;
}

/**
 * 检查屏幕宽度是否小于指定断点
 * 
 * @param breakpoint - 断点名称
 * @param screenWidth - 当前屏幕宽度
 * @returns 是否小于断点
 */
export function isBelow(
  breakpoint: keyof typeof BREAKPOINTS,
  screenWidth: number
): boolean {
  return screenWidth < BREAKPOINTS[breakpoint];
}

/**
 * 检查屏幕宽度是否大于等于指定断点
 * 
 * @param breakpoint - 断点名称
 * @param screenWidth - 当前屏幕宽度
 * @returns 是否大于等于断点
 */
export function isAbove(
  breakpoint: keyof typeof BREAKPOINTS,
  screenWidth: number
): boolean {
  return screenWidth >= BREAKPOINTS[breakpoint];
}

/**
 * 检查屏幕宽度是否在指定断点范围内
 * 
 * @param minBreakpoint - 最小断点名称
 * @param maxBreakpoint - 最大断点名称
 * @param screenWidth - 当前屏幕宽度
 * @returns 是否在范围内
 */
export function isBetween(
  minBreakpoint: keyof typeof BREAKPOINTS,
  maxBreakpoint: keyof typeof BREAKPOINTS,
  screenWidth: number
): boolean {
  return (
    screenWidth >= BREAKPOINTS[minBreakpoint] &&
    screenWidth < BREAKPOINTS[maxBreakpoint]
  );
}

export default useResponsive;
