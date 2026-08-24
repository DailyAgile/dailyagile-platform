/**
 * Mobile Optimization Hook
 * Provides utilities and state for optimizing quiz experience on mobile devices
 */

import { useEffect, useState } from 'react';

export interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
}

const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
  desktop: 1280,
};

export function useMobileOptimization(): ViewportInfo {
  const [viewportInfo, setViewportInfo] = useState<ViewportInfo>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    orientation: 'portrait',
    pixelRatio: 1,
  });

  useEffect(() => {
    const updateViewportInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width <= BREAKPOINTS.mobile;
      const isTablet = width > BREAKPOINTS.mobile && width <= BREAKPOINTS.tablet;
      const isDesktop = width > BREAKPOINTS.tablet;
      const orientation = height > width ? 'portrait' : 'landscape';
      const pixelRatio = window.devicePixelRatio || 1;

      setViewportInfo({
        width,
        height,
        isMobile,
        isTablet,
        isDesktop,
        orientation,
        pixelRatio,
      });
    };

    // Initial update
    updateViewportInfo();

    // Listen for resize and orientation change
    window.addEventListener('resize', updateViewportInfo);
    window.addEventListener('orientationchange', updateViewportInfo);

    return () => {
      window.removeEventListener('resize', updateViewportInfo);
      window.removeEventListener('orientationchange', updateViewportInfo);
    };
  }, []);

  return viewportInfo;
}

/**
 * Get responsive spacing value
 */
export function getResponsiveSpacing(mobile: string | number, tablet?: string | number, desktop?: string | number): string | number {
  const viewport = typeof window !== 'undefined' ? window.innerWidth : 0;

  if (viewport <= BREAKPOINTS.mobile) {
    return mobile;
  }
  if (viewport <= BREAKPOINTS.tablet && tablet !== undefined) {
    return tablet;
  }
  return desktop || mobile;
}

/**
 * Get responsive font size
 */
export function getResponsiveFontSize(mobile: number, desktop?: number): number {
  const viewport = typeof window !== 'undefined' ? window.innerWidth : 1280;
  return viewport <= BREAKPOINTS.mobile ? mobile : desktop || mobile;
}

/**
 * Touch target minimum size (44px for accessibility)
 */
export const TOUCH_TARGET_SIZE = 44;

/**
 * Get responsive padding
 */
export function getResponsivePadding(mobile: number, desktop?: number): number {
  const viewport = typeof window !== 'undefined' ? window.innerWidth : 1280;
  return viewport <= BREAKPOINTS.mobile ? mobile : desktop || mobile;
}

/**
 * Check if device supports touch
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    ((navigator as any).msMaxTouchPoints > 0)
  );
}

/**
 * Check if device has safe areas (notch, etc.)
 */
export function hasSafeAreas(): boolean {
  if (typeof window === 'undefined') return false;
  return CSS.supports('padding-top: env(safe-area-inset-top)');
}

/**
 * Get safe area insets
 */
export function getSafeAreaInsets() {
  if (typeof document === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const root = document.documentElement;
  const top = parseInt(getComputedStyle(root).getPropertyValue('--safe-area-inset-top')) || 0;
  const right = parseInt(getComputedStyle(root).getPropertyValue('--safe-area-inset-right')) || 0;
  const bottom = parseInt(getComputedStyle(root).getPropertyValue('--safe-area-inset-bottom')) || 0;
  const left = parseInt(getComputedStyle(root).getPropertyValue('--safe-area-inset-left')) || 0;

  return { top, right, bottom, left };
}
