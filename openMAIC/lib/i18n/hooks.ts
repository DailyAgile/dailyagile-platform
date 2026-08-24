/**
 * React hooks for i18n, timezone, and localization
 * Use in client components to access locale information and formatting utilities
 */

'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { supportedLocales } from './locales';
import type { Locale } from './types';

/**
 * Get current locale from browser or server context
 * Can be used in client or server components
 *
 * @returns Current locale code (e.g., 'en-US', 'es-ES')
 */
export function useLocale(): Locale {
  // In client component, read from document or cookie
  if (typeof window !== 'undefined') {
    const htmlLang = document.documentElement.lang;
    if (htmlLang && supportedLocales.some(l => l.code === htmlLang)) {
      return htmlLang as Locale;
    }

    // Fall back to cookie
    const cookieLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1] as Locale | undefined;

    if (cookieLocale && supportedLocales.some(l => l.code === cookieLocale)) {
      return cookieLocale;
    }
  }

  return 'en-US';
}

/**
 * Check if current locale is RTL
 * Useful for applying RTL-specific styling
 *
 * @param locale - Optional locale to check (defaults to current locale)
 * @returns true if locale uses right-to-left text direction
 */
export function useIsRTL(locale?: Locale): boolean {
  const currentLocale = locale || useLocale();
  const localeEntry = supportedLocales.find(l => l.code === currentLocale);
  return (localeEntry && 'rtl' in localeEntry && localeEntry.rtl) || false;
}

/**
 * Hook to change the current locale
 * Redirects to the new locale path
 *
 * @returns Function to change locale
 *
 * @example
 * const changeLocale = useChangeLocale();
 * changeLocale('es-ES'); // Redirects to Spanish version
 */
export function useChangeLocale() {
  const router = useRouter();
  const currentLocale = useLocale();

  return useCallback((newLocale: Locale) => {
    if (newLocale === currentLocale) return;

    // Set cookie
    document.cookie = `NEXT_LOCALE=${newLocale};max-age=31536000;path=/`;

    // Get current path and replace locale
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);

    if (supportedLocales.some(l => l.code === segments[0])) {
      segments[0] = newLocale;
    } else {
      segments.unshift(newLocale);
    }

    router.push(`/${segments.join('/')}`);
  }, [currentLocale, router]);
}

/**
 * Get all supported locales with their metadata
 *
 * @returns Array of supported locale objects
 */
export function useSupportedLocales() {
  return supportedLocales;
}

/**
 * Get text direction (ltr or rtl) for current locale
 *
 * @param locale - Optional locale to check
 * @returns 'ltr' or 'rtl'
 */
export function useTextDirection(locale?: Locale): 'ltr' | 'rtl' {
  return useIsRTL(locale) ? 'rtl' : 'ltr';
}

/**
 * Get CSS dir attribute value for html element
 *
 * @param locale - Optional locale to check
 * @returns 'rtl' or 'ltr'
 */
export function useDirAttribute(locale?: Locale): string {
  return useIsRTL(locale) ? 'rtl' : 'ltr';
}
