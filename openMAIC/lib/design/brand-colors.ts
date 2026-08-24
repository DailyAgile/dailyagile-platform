/**
 * DailyAgile Brand Colors
 * Central source of truth for all brand colors across the platform
 * Version: 2.0
 *
 * IMPORTANT: Use exact hex values (NO APPROXIMATIONS)
 * All components should import and use these constants instead of hardcoding colors
 */

export const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  white: '#FFFFFF',
} as const;

/**
 * Text color combinations
 * Use for text styling to maintain consistency
 */
export const BRAND_TEXT = {
  primary: BRAND_COLORS.navy,
  secondary: BRAND_COLORS.gray,
  accent: BRAND_COLORS.teal,
  warning: BRAND_COLORS.orange,
} as const;

/**
 * Background color combinations
 * Use for backgrounds and overlays
 */
export const BRAND_BACKGROUNDS = {
  light: BRAND_COLORS.light,
  white: BRAND_COLORS.white,
  overlay: 'rgba(30, 58, 95, 0.5)', // Navy with 50% opacity
} as const;

/**
 * Utility function to darken a color by percentage
 * Useful for hover states and active states
 */
export const darkenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)
  ).toString(16).slice(1);
};

/**
 * Common color states for interactive elements
 */
export const BRAND_STATES = {
  primary: {
    default: BRAND_COLORS.teal,
    hover: darkenColor(BRAND_COLORS.teal, 10),
    active: darkenColor(BRAND_COLORS.teal, 15),
  },
  secondary: {
    default: BRAND_COLORS.gray,
    hover: darkenColor(BRAND_COLORS.gray, 10),
    active: darkenColor(BRAND_COLORS.gray, 15),
  },
  navy: {
    default: BRAND_COLORS.navy,
    hover: darkenColor(BRAND_COLORS.navy, 10),
    active: darkenColor(BRAND_COLORS.navy, 15),
  },
} as const;

export type BrandColor = typeof BRAND_COLORS;
export type BrandText = typeof BRAND_TEXT;
export type BrandBackground = typeof BRAND_BACKGROUNDS;
