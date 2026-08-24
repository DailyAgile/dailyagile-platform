/**
 * Timezone Utilities for Student Features
 *
 * CRITICAL for streak logic: All date comparisons in streak calculations must use
 * these utilities to work in the user's LOCAL timezone, not UTC.
 *
 * Example: A student in Los Angeles taking a quiz at 11 PM PT should get credit
 * for "today" even though it's already midnight UTC.
 */

/**
 * Get current date in user's timezone (not UTC)
 * CRITICAL for streak resets — must use user TZ, not UTC
 *
 * @param date - The date to convert (defaults to now)
 * @param timezone - User's IANA timezone string (e.g., 'America/Los_Angeles')
 * @returns Date object representing the same moment in user's timezone
 *
 * @example
 * const userNow = getDateInTimezone(new Date(), 'America/Los_Angeles');
 * // Returns the current time as if the user's local clock shows it
 */
export function getDateInTimezone(date: Date, timezone: string): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const values: Record<string, number> = {};

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = parseInt(part.value, 10);
    }
  }

  return new Date(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second
  );
}

/**
 * Get user's local midnight (start of day in their timezone)
 * Used for streak resets and daily activity tracking
 *
 * @param timezone - User's IANA timezone string
 * @returns Date object representing midnight in user's local timezone
 *
 * @example
 * const midnight = getUserLocalMidnight('Europe/London');
 * // Returns the next upcoming midnight in London time
 */
export function getUserLocalMidnight(timezone: string): Date {
  const now = new Date();
  const zonedDate = getDateInTimezone(now, timezone);

  // Set to midnight
  const dayStart = new Date(zonedDate);
  dayStart.setHours(0, 0, 0, 0);

  // Convert back to UTC for storage
  const utcMidnight = new Date(dayStart.toLocaleString('en-US', { timeZone: 'UTC' }));
  return utcMidnight;
}

/**
 * Check if two dates are the same day in user's timezone
 * CRITICAL for streak logic — DO NOT use getDate() directly
 *
 * @param date1 - First date to compare
 * @param date2 - Second date to compare
 * @param timezone - User's IANA timezone string
 * @returns true if both dates are the same calendar day in user's timezone
 *
 * @example
 * const today = new Date();
 * const lastQuizDate = student.last_quiz_at;
 * const sameDay = isSameDayInTimezone(today, lastQuizDate, student.timezone);
 *
 * // If student is in PST and took quiz at 11 PM PT, this returns true
 * // even though lastQuizDate might be technically "tomorrow" in UTC
 */
export function isSameDayInTimezone(
  date1: Date,
  date2: Date,
  timezone: string
): boolean {
  const zoned1 = getDateInTimezone(date1, timezone);
  const zoned2 = getDateInTimezone(date2, timezone);

  return (
    zoned1.getFullYear() === zoned2.getFullYear() &&
    zoned1.getMonth() === zoned2.getMonth() &&
    zoned1.getDate() === zoned2.getDate()
  );
}

/**
 * Format date string in user's timezone
 * Locale-aware formatting for display
 *
 * @param date - Date to format
 * @param timezone - User's IANA timezone string
 * @param locale - Locale code (e.g., 'en-US', 'de-DE', 'fr-FR')
 * @param options - Additional formatting options
 * @returns Formatted date string in user's timezone
 *
 * @example
 * formatDateInTimezone(new Date(), 'America/New_York', 'en-US');
 * // Output: "August 15, 2026"
 *
 * formatDateInTimezone(new Date(), 'Europe/Berlin', 'de-DE');
 * // Output: "15. August 2026"
 */
export function formatDateInTimezone(
  date: Date,
  timezone: string,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });

  return formatter.format(date);
}

/**
 * Format time in user's timezone
 * Includes timezone-aware 12-hour or 24-hour formatting
 *
 * @param date - Date/time to format
 * @param timezone - User's IANA timezone string
 * @param locale - Locale code (e.g., 'en-US', 'de-DE')
 * @returns Formatted time string
 *
 * @example
 * formatTimeInTimezone(new Date(), 'America/Los_Angeles', 'en-US');
 * // Output: "2:30 PM"
 *
 * formatTimeInTimezone(new Date(), 'Europe/Berlin', 'de-DE');
 * // Output: "14:30"
 */
export function formatTimeInTimezone(
  date: Date,
  timezone: string,
  locale: string = 'en-US'
): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: locale === 'en-US' || locale === 'en-AU',
  });

  return formatter.format(date);
}

/**
 * Add N days to today in user's timezone
 * Used for "next review date" and deadline calculations
 * CRITICAL: Uses user's local midnight, not UTC
 *
 * @param timezone - User's IANA timezone string
 * @param days - Number of days to add (can be negative)
 * @returns New date N days from user's today, at midnight in user's TZ
 *
 * @example
 * const nextReview = addDaysInTimezone('America/Chicago', 3);
 * // Returns 3 days from tomorrow at midnight in Chicago time
 *
 * const yesterday = addDaysInTimezone('Asia/Tokyo', -1);
 * // Returns yesterday at midnight in Tokyo time
 */
export function addDaysInTimezone(timezone: string, days: number): Date {
  const userMidnight = getUserLocalMidnight(timezone);
  const result = new Date(userMidnight);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Hours until user's next midnight
 * Useful for scheduling daily reset jobs
 *
 * @param timezone - User's IANA timezone string
 * @returns Number of hours (decimal) until user's next midnight
 *
 * @example
 * const hoursLeft = hoursUntilUserMidnight('Asia/Shanghai');
 * if (hoursLeft < 1) {
 *   console.log('Reset streak calculations soon!');
 * }
 */
export function hoursUntilUserMidnight(timezone: string): number {
  const midnight = getUserLocalMidnight(timezone);
  const nextMidnight = new Date(midnight);
  nextMidnight.setDate(nextMidnight.getDate() + 1);

  const now = new Date();
  const hoursRemaining = (nextMidnight.getTime() - now.getTime()) / (1000 * 60 * 60);

  return Math.max(0, hoursRemaining);
}

/**
 * Get user's timezone offset from UTC
 * Returns offset in format like "-05:00" or "+09:00"
 *
 * @param timezone - User's IANA timezone string
 * @param date - Date to calculate offset for (defaults to now)
 * @returns Timezone offset string
 *
 * @example
 * getTimezoneOffset('America/New_York', new Date());
 * // Output: "-04:00" (EDT) or "-05:00" (EST depending on DST)
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  });

  const parts = formatter.formatToParts(date);
  const timeZonePart = parts.find((p) => p.type === 'timeZoneName');

  if (!timeZonePart) {
    return '+00:00';
  }

  // Try to extract offset from timezone name like "GMT-5" or "EST"
  const tzName = timeZonePart.value;
  const match = tzName.match(/GMT([+-]\d+)/);

  if (match) {
    const hours = parseInt(match[1], 10);
    const sign = hours >= 0 ? '+' : '-';
    const absHours = Math.abs(hours).toString().padStart(2, '0');
    return `${sign}${absHours}:00`;
  }

  // Fallback: calculate from date difference
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  const offset = (utcDate.getTime() - tzDate.getTime()) / (1000 * 60);

  const hours = Math.floor(offset / 60);
  const minutes = Math.abs(offset % 60);
  const sign = hours <= 0 ? '+' : '-';

  return `${sign}${Math.abs(hours).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Validate if timezone string is valid IANA timezone
 *
 * @param timezone - Timezone string to validate
 * @returns true if valid IANA timezone
 *
 * @example
 * isValidTimezone('America/New_York');  // true
 * isValidTimezone('Invalid/Timezone');  // false
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    // Try to format a date with the timezone
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get list of common timezones with their offsets
 * Useful for timezone dropdown
 *
 * @returns Array of common timezone objects
 */
export function getCommonTimezones(): Array<{
  iana: string;
  label: string;
  offset: string;
}> {
  const timezones = [
    // Americas
    { iana: 'America/Anchorage', label: 'Alaska (AKST/AKDT)' },
    { iana: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
    { iana: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
    { iana: 'America/Chicago', label: 'Central Time (CST/CDT)' },
    { iana: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
    { iana: 'America/Caracas', label: 'Venezuela (VET)' },
    { iana: 'America/Argentina/Buenos_Aires', label: 'Argentina (ART)' },
    { iana: 'America/Sao_Paulo', label: 'Brazil - São Paulo (BRST/BRDT)' },

    // Europe
    { iana: 'Europe/London', label: 'London (GMT/BST)' },
    { iana: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { iana: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
    { iana: 'Europe/Moscow', label: 'Moscow (MSK)' },
    { iana: 'Europe/Istanbul', label: 'Istanbul (EET/EEST)' },

    // Asia
    { iana: 'Asia/Dubai', label: 'Dubai (GST)' },
    { iana: 'Asia/Kolkata', label: 'India (IST)' },
    { iana: 'Asia/Bangkok', label: 'Thailand (ICT)' },
    { iana: 'Asia/Shanghai', label: 'China (CST)' },
    { iana: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
    { iana: 'Asia/Tokyo', label: 'Japan (JST)' },
    { iana: 'Asia/Seoul', label: 'South Korea (KST)' },
    { iana: 'Asia/Singapore', label: 'Singapore (SGT)' },

    // Australia & Pacific
    { iana: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
    { iana: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
    { iana: 'Australia/Perth', label: 'Perth (AWST)' },
    { iana: 'Pacific/Auckland', label: 'New Zealand (NZDT/NZST)' },
  ];

  return timezones.map((tz) => ({
    iana: tz.iana,
    label: tz.label,
    offset: getTimezoneOffset(tz.iana),
  }));
}

/**
 * Type definition for timezone info
 */
export interface TimezoneInfo {
  iana: string;
  label: string;
  offset: string;
}
