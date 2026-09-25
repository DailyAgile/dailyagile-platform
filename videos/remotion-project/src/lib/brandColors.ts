// DailyAgile Brand Colors (from CLAUDE.md)
export const BRAND_COLORS = {
  navy: '#1E3A5F',      // Primary, headers
  teal: '#0891B2',      // Accent, links, highlights
  orange: '#EA580C',    // CTAs, emphasis
  light: '#F0F7FA',     // Card backgrounds
  dark: '#1E293B',      // Body text
  gray: '#64748B',      // Secondary text
  white: '#FFFFFF',     // Page backgrounds
};

// Derived colors for consistency
export const COLORS = {
  primary: BRAND_COLORS.navy,
  accent: BRAND_COLORS.teal,
  cta: BRAND_COLORS.orange,
  background: BRAND_COLORS.white,
  text: BRAND_COLORS.dark,
  textSecondary: BRAND_COLORS.gray,
  card: BRAND_COLORS.light,
};
