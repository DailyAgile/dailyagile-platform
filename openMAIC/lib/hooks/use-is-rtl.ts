'use client';

import { useI18n } from './use-i18n';
import { supportedLocales } from '@/lib/i18n/locales';

/**
 * Hook to determine if the current locale is RTL (Right-to-Left)
 * Supports Arabic, Hebrew, and other RTL languages
 *
 * @returns {boolean} true if current locale is RTL, false otherwise
 */
export function useIsRTL(): boolean {
  const { locale } = useI18n();

  // Find the locale entry and check if rtl flag is set
  const localeEntry = supportedLocales.find((l) => l.code === locale);
  return localeEntry?.rtl ?? false;
}
