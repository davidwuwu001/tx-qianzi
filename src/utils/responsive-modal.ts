/**
 * 响应式弹窗工具函数
 * 
 * 提供弹窗在不同屏幕尺寸下的配置工具
 * 
 * @module utils/responsive-modal
 */

import type { ModalProps } from 'antd';
import type { CSSProperties } from 'react';

/**
 * 响应式弹窗配置选项
 */
export interface ResponsiveModalOptions {
  /** 是否为移动端 */
  isMobile: boolean;
  /** 桌面端宽度（默认 520） */
  desktopWidth?: number | string;
  /** 移动端宽度（默认 '100%'） */
  mobileWidth?: number | string;
  /** 是否使用底部滑入效果（移动端默认 true） */
  slideFromBottom?: boolean;
  /** 弹窗最大高度（移动端默认 '90vh'） */
  maxHeight?: string;
}

/**
 * 响应式弹窗属性返回值
 */
export interface ResponsiveModalProps {
  /** 弹窗宽度 */
  width: number | string;
  /** 弹窗样式 */
  style: CSSProperties;
  /** 弹窗内容样式 */
  styles: ModalProps['styles'];
  /** 弹窗类名 */
  className: string;
  /** 是否居中显示 */
  centered: boolean;
}

/**
 * 获取响应式弹窗属性
 * 
 * 根据屏幕尺寸返回适合的弹窗配置：
 * - 移动端：接近全屏宽度，从顶部开始显示，内容可滚动
 * - 桌面端：居中显示，固定宽度
 * 
 * @param options - 响应式配置选项
 * @returns 弹窗属性对象
 * 
 * @example
 * ```tsx
 * const { isMobile } = useResponsive();
 * const modalProps = getResponsiveModalProps({ isMobile });
 * 
 * <Modal
 *   title="编辑用户"
 *   open={visible}
 *   {...modalProps}
 * >
 *   <Form>...</Form>
 * </Modal>
 * ```
 */
export function getResponsiveModalProps(
  options: ResponsiveModalOptions
): ResponsiveModalProps {
  const {
    isMobile,
    desktopWidth = 520,
    mobileWidth = '100%',
    slideFromBottom = true,
    maxHeight = '90vh',
  } = options;

  if (isMobile) {
    // 移动端配置
    return {
      width: mobileWidth,
      style: {
        top: 0,
        margin: 0,
        maxWidth: '100vw',
        paddingBottom: 0,
      },
      styles: {
        body: {
          maxHeight: `calc(${maxHeight} - 110px)`,
          overflowY: 'auto',
        },
      },
      className: 'mobile-modal',
      centered: false,
    };
  }

  // 桌面端配置
  return {
    width: desktopWidth,
    style: {},
    styles: {},
    className: '',
    centered: true,
  };
}

/**
 * 获取响应式抽屉属性
 * 
 * 用于需要抽屉式交互的场景
 * 
 * @param isMobile - 是否为移动端
 * @returns 抽屉属性对象
 */
export function getResponsiveDrawerProps(isMobile: boolean) {
  if (isMobile) {
    return {
      width: '100%',
      height: '90vh',
      placement: 'bottom' as const,
      className: 'mobile-drawer',
    };
  }

  return {
    width: 520,
    placement: 'right' as const,
    className: '',
  };
}

/**
 * 获取响应式确认弹窗配置
 * 
 * 用于 Modal.confirm 等确认弹窗
 * 
 * @param isMobile - 是否为移动端
 * @returns 确认弹窗配置
 */
export function getResponsiveConfirmProps(isMobile: boolean) {
  if (isMobile) {
    return {
      width: '90%',
      centered: true,
      className: 'mobile-confirm',
    };
  }

  return {
    width: 416,
    centered: true,
    className: '',
  };
}

/**
 * 移动端弹窗最小高度
 */
export const MOBILE_MODAL_MIN_HEIGHT = '50vh';

/**
 * 移动端弹窗最大高度
 */
export const MOBILE_MODAL_MAX_HEIGHT = '90vh';

/**
 * 桌面端默认弹窗宽度
 */
export const DESKTOP_MODAL_WIDTH = 520;

