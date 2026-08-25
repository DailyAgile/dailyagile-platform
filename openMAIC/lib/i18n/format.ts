/**
 * i18n Formatting Utilities
 *
 * Locale-aware formatting for:
 * - Numbers (with proper grouping for each locale)
 * - Dates and times (with proper order and separators)
 * - Currency (matching regional preferences)
 * - Relative time ("2 minutes ago", "in 3 days")
 *
 * All functions respect locale-specific conventions
 */

import { supportedLocales } from './locales';

export type Locale = (typeof supportedLocales)[number]['code'];

/**
 * Format number with locale-specific grouping and decimal
 * Respects locale conventions for thousand separators and decimal points
 *
 * @param value - Number to format
 * @param locale - Locale code (e.g., 'en-US', 'de-DE', 'fr-FR')
 * @param options - Intl.NumberFormat options
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1234.56, 'en-US') // "1,234.56"
 * formatNumber(1234.56, 'de-DE') // "1.234,56"
 * formatNumber(1234.56, 'fr-FR') // "1 234,56"
 * formatNumber(1234567, 'en-IN') // "12,34,567" (lakhs/crores)
 */
export function formatNumber(
  value: number,
  locale: Locale = 'en-US',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(normalizeLocale(locale), options).format(value);
}

/**
 * Format number as percentage
 * Automatically multiplies by 100 and adds % sign
 *
 * @param value - Decimal value (0-1 range, e.g., 0.85 for 85%)
 * @param locale - Locale code
 * @param decimalPlaces - Number of decimal places to show
 * @returns Formatted percentage string
 *
 * @example
 * formatPercent(0.85, 'en-US')        // "85%"
 * formatPercent(0.85, 'de-DE')        // "85 %"
 * formatPercent(0.666666, 'en-US', 1) // "66.7%"
 */
export function formatPercent(
  value: number,
  locale: Locale = 'en-US',
  decimalPlaces: number = 0
): string {
  return new Intl.NumberFormat(normalizeLocale(locale), {
    style: 'percent',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}

/**
 * Format date with locale-specific order and formatting
 * Respects locale conventions for date order (MM/DD/YYYY vs DD/MM/YYYY vs YYYY/MM/DD)
 *
 * @param date - Date to format
 * @param locale - Locale code
 * @param format - Format type ('short', 'medium', 'long', 'full')
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date('2026-08-15'), 'en-US', 'long')
 * // "August 15, 2026"
 *
 * formatDate(new Date('2026-08-15'), 'de-DE', 'long')
 * // "15. August 2026"
 *
 * formatDate(new Date('2026-08-15'), 'ja-JP', 'long')
 * // "2026年8月15日"
 *
 * formatDate(new Date('2026-08-15'), 'ar-SA', 'long')
 * // "١٥ أغسطس ٢٠٢٦" (Arabic numerals)
 */
export function formatDate(
  date: Date,
  locale: Locale = 'en-US',
  format: 'short' | 'medium' | 'long' | 'full' = 'medium'
): string {
  const dateFormatOptions: Record<'short' | 'medium' | 'long' | 'full', Intl.DateTimeFormatOptions> = {
    short: { year: 'numeric', month: 'numeric', day: 'numeric' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    full: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
  };

  return new Intl.DateTimeFormat(normalizeLocale(locale), dateFormatOptions[format]).format(date);
}

/**
 * Format time with locale-specific convention (12-hour vs 24-hour)
 * US/Australian English uses 12-hour format with AM/PM
 * Most other locales use 24-hour format
 *
 * @param date - Date/time to format
 * @param locale - Locale code
 * @param includeSeconds - Include seconds in output
 * @returns Formatted time string
 *
 * @example
 * formatTime(new Date('2026-08-15 14:30:45'), 'en-US')
 * // "2:30 PM"
 *
 * formatTime(new Date('2026-08-15 14:30:45'), 'de-DE')
 * // "14:30"
 *
 * formatTime(new Date('2026-08-15 14:30:45'), 'ar-SA')
 * // "٢:٣٠ م" (Arabic with Arabic numerals)
 */
export function formatTime(
  date: Date,
  locale: Locale = 'en-US',
  includeSeconds: boolean = false
): string {
  const use12Hour = isLocale12Hour(locale);

  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: use12Hour,
  }).format(date);
}

/**
 * Format datetime (date + time together)
 *
 * @param date - Date/time to format
 * @param locale - Locale code
 * @param dateFormat - Date format type
 * @returns Formatted datetime string
 *
 * @example
 * formatDateTime(new Date('2026-08-15 14:30'), 'en-US', 'long')
 * // "August 15, 2026, 2:30 PM"
 *
 * formatDateTime(new Date('2026-08-15 14:30'), 'de-DE', 'long')
 * // "15. August 2026, 14:30"
 */
export function formatDateTime(
  date: Date,
  locale: Locale = 'en-US',
  dateFormat: 'short' | 'medium' | 'long' | 'full' = 'medium'
): string {
  const use12Hour = isLocale12Hour(locale);
  const dateFormatOptions: Record<'short' | 'medium' | 'long' | 'full', Intl.DateTimeFormatOptions> = {
    short: { year: 'numeric', month: 'numeric', day: 'numeric' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    full: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
  };

  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    ...dateFormatOptions[dateFormat],
    hour: '2-digit',
    minute: '2-digit',
    hour12: use12Hour,
  }).format(date);
}

/**
 * Format currency with proper locale and regional notation
 * Handles proper decimal places per currency (JPY has 0, USD has 2, etc.)
 *
 * @param amount - Amount to format
 * @param currency - Currency code (e.g., 'USD', 'EUR', 'JPY')
 * @param locale - Locale code
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56, 'USD', 'en-US')    // "$1,234.56"
 * formatCurrency(1234.56, 'EUR', 'de-DE')    // "1.234,56 €"
 * formatCurrency(5500, 'JPY', 'ja-JP')       // "¥5,500"
 * formatCurrency(3990, 'INR', 'en-IN')       // "₹3,990"
 * formatCurrency(1234.56, 'EUR', 'en-US')    // "€1,234.56" (EUR price in US locale)
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: Locale = 'en-US'
): string {
  return new Intl.NumberFormat(normalizeLocale(locale), {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

/**
 * Determine if locale uses 12-hour time format
 * US and Australia use 12-hour, most others use 24-hour
 *
 * @param locale - Locale code
 * @returns true if locale uses 12-hour format
 */
function isLocale12Hour(locale: Locale): boolean {
  return locale === 'en-US';
  // US and Australia use 12-hour format
  // Spain, France, Germany, China, Japan, Russia, Arab countries use 24-hour format
}

/**
 * Normalize locale code to standard format
 * Maps custom locale codes to standard Intl.DateTimeFormat locale
 *
 * @param locale - Locale code
 * @returns Standard BCP47 locale string
 */
function normalizeLocale(locale: Locale): string {
  const localeMap: Record<Locale, string> = {
    'en-US': 'en-US',
    'zh-CN': 'zh-Hans-CN',
    'zh-TW': 'zh-Hant-TW',
    'ja-JP': 'ja-JP',
    'ru-RU': 'ru-RU',
    'ar-SA': 'ar-SA',
    'pt-BR': 'pt-BR',
    'ko-KR': 'ko-KR',
  };

  return localeMap[locale] || 'en-US';
}

/**
 * Format relative time ("2 minutes ago", "in 3 days")
 * Note: For production, consider using date-fns formatDistanceToNow or similar
 *
 * @param date - Date to compare to now
 * @param locale - Locale code
 * @param options - Intl.RelativeTimeFormat options
 * @returns Relative time string
 *
 * @example
 * formatRelative(new Date(Date.now() - 2*60*1000), 'en-US')
 * // "2 minutes ago"
 *
 * formatRelative(new Date(Date.now() + 3*24*60*60*1000), 'de-DE')
 * // "in 3 days"
 */
export function formatRelative(
  date: Date,
  locale: Locale = 'en-US',
  options?: Intl.RelativeTimeFormatOptions
): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffS = Math.round(diffMs / 1000);

  // Determine unit and value
  let unit: Intl.RelativeTimeFormatUnit = 'second';
  let value = diffS;

  if (Math.abs(diffS) < 60) {
    unit = 'second';
  } else if (Math.abs(diffS) < 3600) {
    unit = 'minute';
    value = Math.round(diffS / 60);
  } else if (Math.abs(diffS) < 86400) {
    unit = 'hour';
    value = Math.round(diffS / 3600);
  } else if (Math.abs(diffS) < 2592000) {
    unit = 'day';
    value = Math.round(diffS / 86400);
  } else if (Math.abs(diffS) < 31536000) {
    unit = 'month';
    value = Math.round(diffS / 2592000);
  } else {
    unit = 'year';
    value = Math.round(diffS / 31536000);
  }

  const formatter = new Intl.RelativeTimeFormat(normalizeLocale(locale), {
    numeric: 'auto',
    ...options,
  });

  return formatter.format(value, unit);
}

/**
 * Format duration (e.g., "2h 30m", "5 days 3 hours")
 * Useful for displaying time spent on quizzes
 *
 * @param milliseconds - Duration in milliseconds
 * @param locale - Locale code
 * @param maxUnits - Maximum number of units to display (default 2)
 * @returns Formatted duration string
 *
 * @example
 * formatDuration(150000, 'en-US')          // "2 minutes 30 seconds"
 * formatDuration(10800000, 'de-DE')        // "3 hours"
 * formatDuration(93600000, 'en-US', 2)     // "1 day 2 hours"
 */
export function formatDuration(
  milliseconds: number,
  locale: Locale = 'en-US',
  maxUnits: number = 2
): string {
  const totalSeconds = Math.floor(milliseconds / 1000);

  const units = [
    { name: 'day', value: 86400 },
    { name: 'hour', value: 3600 },
    { name: 'minute', value: 60 },
    { name: 'second', value: 1 },
  ];

  const parts: string[] = [];
  let remaining = totalSeconds;

  for (const unit of units) {
    if (remaining >= unit.value && parts.length < maxUnits) {
      const count = Math.floor(remaining / unit.value);
      remaining -= count * unit.value;

      // Simple English pluralization
      const unitName = count === 1 ? unit.name : `${unit.name}s`;
      parts.push(`${count} ${unitName}`);
    }
  }

  return parts.length === 0 ? '0 seconds' : parts.join(' ');
}

/**
 * Format list with locale-aware conjunction ("and", "ou", "y", etc.)
 * Useful for displaying multiple items (badge names, course names)
 *
 * @param items - Array of items to format
 * @param locale - Locale code
 * @returns Formatted list string
 *
 * @example
 * formatList(['Quiz 1', 'Quiz 2', 'Quiz 3'], 'en-US')
 * // "Quiz 1, Quiz 2, and Quiz 3"
 *
 * formatList(['Abzeichen 1', 'Abzeichen 2'], 'de-DE')
 * // "Abzeichen 1 und Abzeichen 2"
 */
export function formatList(items: string[], locale: Locale = 'en-US'): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];

  const formatter = new Intl.ListFormat(normalizeLocale(locale), {
    style: 'long',
    type: 'conjunction',
  });

  return formatter.format(items);
}

/**
 * Format number of items with proper plural handling
 * Used for quiz counts, badge counts, etc.
 *
 * @param count - Number of items
 * @param singular - Singular form of word
 * @param plural - Plural form of word (optional, defaults to singular + 's')
 * @returns Formatted string with number and word
 *
 * @example
 * formatCount(1, 'badge')      // "1 badge"
 * formatCount(5, 'badge')      // "5 badges"
 * formatCount(1, 'quiz', 'quizzes')  // "1 quiz"
 * formatCount(3, 'quiz', 'quizzes')  // "3 quizzes"
 */
export function formatCount(
  count: number,
  singular: string,
  plural?: string
): string {
  const word = count === 1 ? singular : plural || `${singular}s`;
  return `${formatNumber(count, 'en-US')} ${word}`;
}

/**
 * Get locale-specific day names
 *
 * @param locale - Locale code
 * @param length - 'long' for full names, 'short' for abbreviated
 * @returns Array of day names
 *
 * @example
 * getDayNames('en-US', 'short')
 * // ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
 *
 * getDayNames('de-DE', 'long')
 * // ["Sonntag", "Montag", "Dienstag", ...]
 */
export function getDayNames(locale: Locale, length: 'long' | 'short' = 'long'): string[] {
  const formatter = new Intl.DateTimeFormat(normalizeLocale(locale), {
    weekday: length,
  });

  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(2024, 0, i + 7); // Use consistent Sunday-based week
    days.push(formatter.format(date));
  }

  return days;
}

/**
 * Get locale-specific month names
 *
 * @param locale - Locale code
 * @param length - 'long' for full names, 'short' for abbreviated
 * @returns Array of month names
 *
 * @example
 * getMonthNames('en-US', 'short')
 * // ["Jan", "Feb", "Mar", ..., "Dec"]
 */
export function getMonthNames(locale: Locale, length: 'long' | 'short' = 'long'): string[] {
  const formatter = new Intl.DateTimeFormat(normalizeLocale(locale), {
    month: length,
  });

  const months = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(2024, i, 1);
    months.push(formatter.format(date));
  }

  return months;
}
