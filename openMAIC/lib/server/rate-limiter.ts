/**
 * Rate Limiter using Vercel KV
 * Prevents brute-force attacks on auth endpoints
 * Usage: checkRateLimit(key, max_attempts, window_seconds)
 */

import { kv } from '@vercel/kv';
import { createLogger } from '@/lib/logger';

const log = createLogger('RateLimiter');

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

/**
 * Check if request is within rate limit
 * @param key - Unique identifier (e.g., "verify-code:user@example.com")
 * @param limit - Maximum attempts allowed
 * @param windowSeconds - Time window in seconds
 * @returns Result with allowed flag and remaining attempts
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const current = await kv.get<number>(key);
    const count = current ?? 0;

    if (count >= limit) {
      // Calculate retry-after seconds (time until key expires)
      const ttl = await kv.ttl(key);
      const retryAfterSeconds = ttl > 0 ? ttl : windowSeconds;

      log.warn(`Rate limit exceeded for key: ${key} (count: ${count}/${limit})`);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    // Increment counter
    const newCount = count + 1;
    if (count === 0) {
      // First attempt: set expiry
      await kv.setex(key, windowSeconds, newCount);
    } else {
      // Subsequent attempts: just increment (keep same TTL)
      await kv.incr(key);
    }

    return {
      allowed: true,
      remaining: limit - newCount,
    };
  } catch (error) {
    log.error('Rate limiter error:', error);
    // Fail open (allow request) if KV fails
    // This prevents auth endpoints from crashing
    return {
      allowed: true,
      remaining: limit,
    };
  }
}

/**
 * Reset rate limit for a key (e.g., after successful login)
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await kv.del(key);
    log.info(`Rate limit reset for key: ${key}`);
  } catch (error) {
    log.error('Failed to reset rate limit:', error);
  }
}

/**
 * Rate limit configuration for different endpoints
 */
export const RATE_LIMITS = {
  // Email verification: 3 codes per hour
  SEND_VERIFICATION_CODE: {
    limit: 3,
    window: 3600, // 1 hour
    message: 'Too many verification requests. Try again in 1 hour.',
  },

  // OTP verification: 10 attempts per 10 minutes
  VERIFY_CODE: {
    limit: 10,
    window: 600, // 10 minutes
    message: 'Too many failed attempts. Try again in 10 minutes.',
  },

  // Instructor password login: 5 attempts per 15 minutes
  INSTRUCTOR_PASSWORD_LOGIN: {
    limit: 5,
    window: 900, // 15 minutes
    message: 'Too many failed login attempts. Try again in 15 minutes.',
  },

  // Instructor OTP send: 3 attempts per hour
  INSTRUCTOR_OTP_SEND: {
    limit: 3,
    window: 3600, // 1 hour
    message: 'Too many OTP requests. Try again in 1 hour.',
  },

  // Instructor OTP verify: 10 attempts per 10 minutes
  INSTRUCTOR_OTP_VERIFY: {
    limit: 10,
    window: 600, // 10 minutes
    message: 'Too many failed OTP attempts. Try again in 10 minutes.',
  },

  // Quiz submission: 20 per minute (allows rapid retries if needed)
  QUIZ_SUBMIT: {
    limit: 20,
    window: 60, // 1 minute
    message: 'Too many submissions. Please wait a moment before trying again.',
  },

  // Quiz answer: 50 per minute
  QUIZ_ANSWER: {
    limit: 50,
    window: 60, // 1 minute
    message: 'Too many requests. Please wait before trying again.',
  },

  // CSV upload: 10 per hour (to prevent batch uploads causing issues)
  CSV_UPLOAD: {
    limit: 10,
    window: 3600, // 1 hour
    message: 'Too many CSV uploads. Try again later.',
  },

  // Quiz grading: 10 requests per minute (prevents $200+/hour abuse)
  QUIZ_GRADE: {
    limit: 10,
    window: 60, // 1 minute
    message: 'Too many grading requests. Please wait a moment before trying again.',
  },

  // Data export: 3 per day per student (GDPR abuse prevention)
  DATA_EXPORT: {
    limit: 3,
    window: 86400, // 24 hours
    message: 'Daily export limit reached. You can export your data 3 times per day. Please try again tomorrow.',
  },
} as const;
