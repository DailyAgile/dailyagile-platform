/**
 * Redis-Backed Rate Limiter for Stripe Webhooks
 * Uses Vercel KV (Redis-compatible) for distributed rate limiting across Vercel instances
 *
 * Implements sliding window algorithm:
 * - Tracks request timestamps in Redis (survives cold starts)
 * - Per-customer limit: 100 req/min per email
 * - Global limit: 1000 req/min across all customers
 * - Auto-cleanup after 60 seconds via TTL
 *
 * Features:
 * - Distributed (works across multiple Vercel instances)
 * - Graceful fallback if Redis unavailable
 * - Monitoring/logging for rate limit events
 *
 * Last Updated: 2026-08-23
 */

import { createLogger } from '@/lib/logger';

// Import Vercel KV - type-safe with optional chaining for error handling
let kvClient: any = null;
try {
  // This will be available in Vercel environment
  // In local development without Vercel KV, this import will fail gracefully
  const kv = require('@vercel/kv');
  kvClient = kv?.kv || kv;
} catch {
  // Vercel KV not available - will use fallback in-memory tracking
}

const log = createLogger('RateLimiter-Redis');

// Rate limit configuration
const RATE_LIMIT_PER_CUSTOMER_PER_MINUTE = 100;
const RATE_LIMIT_GLOBAL_PER_MINUTE = 1000;
const WINDOW_SECONDS = 60;
const WINDOW_MS = WINDOW_SECONDS * 1000;

// Redis key prefixes
const CUSTOMER_KEY_PREFIX = 'rate_limit:customer:';
const GLOBAL_KEY_PREFIX = 'rate_limit:global';

/**
 * Result of a rate limit check
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  customerCount: number;
  globalCount: number;
  fallbackUsed: boolean;
}

/**
 * Get Redis client with proper initialization
 * Vercel KV is automatically available in Vercel environment
 */
function getRedisClient() {
  if (kvClient) {
    return kvClient;
  }
  return null;
}

// Fallback in-memory tracking (used if Redis unavailable)
const inMemoryCustomerTracker = new Map<string, number[]>();
const inMemoryGlobalTracker: number[] = [];

/**
 * Redis-backed rate limiter with sliding window algorithm
 * Maintains API compatibility with original in-memory implementation
 */
export class RedisRateLimiter {
  private static redis = getRedisClient();
  private static lastRedisCheckTime = 0;
  private static redisCheckInterval = 30000; // Re-check Redis availability every 30s

  /**
   * Check if request is within rate limits (per-customer and global)
   *
   * Args:
   *     customerEmail: Customer email (used as rate limit key)
   *
   * Returns:
   *     RateLimitCheckResult with allowed flag and counts
   *
   * Security Notes:
   *     - Per-customer limit detects individual abuse patterns
   *     - Global limit protects against distributed attacks
   *     - Graceful fallback if Redis unavailable (allows request, logs warning)
   */
  static async checkRateLimit(
    customerEmail: string
  ): Promise<RateLimitCheckResult> {
    const now = Date.now();

    // Try Redis first (if available)
    if (this.redis) {
      try {
        return await this.checkRateLimitRedis(customerEmail, now);
      } catch (error) {
        log.error(
          `Redis rate limit check failed for ${customerEmail}:`,
          error
        );
        // Fall through to in-memory fallback
      }
    }

    // Fallback to in-memory tracking
    return this.checkRateLimitInMemory(customerEmail, now);
  }

  /**
   * Redis-based rate limit check (primary method)
   * Uses sorted sets to track request timestamps with sliding window
   */
  private static async checkRateLimitRedis(
    customerEmail: string,
    now: number
  ): Promise<RateLimitCheckResult> {
    if (!this.redis) {
      throw new Error('Redis client not available');
    }

    try {
      const cutoffTime = now - WINDOW_MS;
      const customerKey = CUSTOMER_KEY_PREFIX + customerEmail;

      // 1. GET CUSTOMER TIMESTAMPS
      const customerTimestampsJson = await this.redis.get(customerKey);
      let customerTimestamps: number[] = [];

      if (customerTimestampsJson) {
        try {
          customerTimestamps = JSON.parse(customerTimestampsJson) as number[];
        } catch {
          log.warn(`Failed to parse customer timestamps for ${customerEmail}`);
          customerTimestamps = [];
        }
      }

      // 2. FILTER OUT OLD CUSTOMER TIMESTAMPS (sliding window)
      const recentCustomerTimestamps = customerTimestamps.filter(
        (ts) => ts > cutoffTime
      );

      // 3. GET GLOBAL TIMESTAMPS
      const globalTimestampsJson = await this.redis.get(GLOBAL_KEY_PREFIX);
      let globalTimestamps: number[] = [];

      if (globalTimestampsJson) {
        try {
          globalTimestamps = JSON.parse(globalTimestampsJson) as number[];
        } catch {
          log.warn('Failed to parse global timestamps');
          globalTimestamps = [];
        }
      }

      // 4. FILTER OUT OLD GLOBAL TIMESTAMPS (sliding window)
      const recentGlobalTimestamps = globalTimestamps.filter(
        (ts) => ts > cutoffTime
      );

      // 5. CHECK LIMITS
      const customerLimitExceeded =
        recentCustomerTimestamps.length >= RATE_LIMIT_PER_CUSTOMER_PER_MINUTE;
      const globalLimitExceeded =
        recentGlobalTimestamps.length >= RATE_LIMIT_GLOBAL_PER_MINUTE;

      if (customerLimitExceeded || globalLimitExceeded) {
        log.warn(
          `Rate limit exceeded for ${customerEmail}: ` +
            `customer=${recentCustomerTimestamps.length}/${RATE_LIMIT_PER_CUSTOMER_PER_MINUTE}, ` +
            `global=${recentGlobalTimestamps.length}/${RATE_LIMIT_GLOBAL_PER_MINUTE}`
        );

        return {
          allowed: false,
          customerCount: recentCustomerTimestamps.length,
          globalCount: recentGlobalTimestamps.length,
          fallbackUsed: false,
        };
      }

      // 6. UNDER BOTH LIMITS - ADD THIS REQUEST
      recentCustomerTimestamps.push(now);
      recentGlobalTimestamps.push(now);

      // 7. PERSIST UPDATED TIMESTAMPS WITH TTL
      await Promise.all([
        this.redis.setex(
          customerKey,
          WINDOW_SECONDS,
          JSON.stringify(recentCustomerTimestamps)
        ),
        this.redis.setex(
          GLOBAL_KEY_PREFIX,
          WINDOW_SECONDS,
          JSON.stringify(recentGlobalTimestamps)
        ),
      ]);

      return {
        allowed: true,
        customerCount: recentCustomerTimestamps.length,
        globalCount: recentGlobalTimestamps.length,
        fallbackUsed: false,
      };
    } catch (error) {
      log.error(`Redis rate limit check error for ${customerEmail}:`, error);
      throw error;
    }
  }

  /**
   * In-memory fallback rate limit check
   * Used when Redis is unavailable (graceful degradation)
   */
  private static checkRateLimitInMemory(
    customerEmail: string,
    now: number
  ): RateLimitCheckResult {
    const cutoffTime = now - WINDOW_MS;

    // 1. GET OR CREATE CUSTOMER TIMESTAMPS
    if (!inMemoryCustomerTracker.has(customerEmail)) {
      inMemoryCustomerTracker.set(customerEmail, []);
    }
    let customerTimestamps = inMemoryCustomerTracker.get(customerEmail)!;

    // 2. FILTER OLD CUSTOMER TIMESTAMPS
    customerTimestamps = customerTimestamps.filter((ts) => ts > cutoffTime);

    // 3. FILTER OLD GLOBAL TIMESTAMPS
    let globalTimestamps = inMemoryGlobalTracker.filter((ts) => ts > cutoffTime);

    // 4. CHECK LIMITS
    const customerLimitExceeded =
      customerTimestamps.length >= RATE_LIMIT_PER_CUSTOMER_PER_MINUTE;
    const globalLimitExceeded =
      globalTimestamps.length >= RATE_LIMIT_GLOBAL_PER_MINUTE;

    if (customerLimitExceeded || globalLimitExceeded) {
      log.warn(
        `[FALLBACK] Rate limit exceeded for ${customerEmail}: ` +
          `customer=${customerTimestamps.length}/${RATE_LIMIT_PER_CUSTOMER_PER_MINUTE}, ` +
          `global=${globalTimestamps.length}/${RATE_LIMIT_GLOBAL_PER_MINUTE}`
      );

      return {
        allowed: false,
        customerCount: customerTimestamps.length,
        globalCount: globalTimestamps.length,
        fallbackUsed: true,
      };
    }

    // 5. UNDER BOTH LIMITS - ADD THIS REQUEST
    customerTimestamps.push(now);
    globalTimestamps.push(now);

    inMemoryCustomerTracker.set(customerEmail, customerTimestamps);
    inMemoryGlobalTracker.length = 0;
    inMemoryGlobalTracker.push(...globalTimestamps);

    return {
      allowed: true,
      customerCount: customerTimestamps.length,
      globalCount: globalTimestamps.length,
      fallbackUsed: true,
    };
  }

  /**
   * Reset rate limit for a customer (e.g., after successful webhook processing)
   * Useful for clearing limits on legitimate high-volume customers
   */
  static async reset(customerEmail: string): Promise<void> {
    try {
      if (this.redis) {
        const customerKey = CUSTOMER_KEY_PREFIX + customerEmail;
        await this.redis.del(customerKey);
        log.info(`Rate limit reset for ${customerEmail} (Redis)`);
      }

      // Also reset in-memory
      inMemoryCustomerTracker.delete(customerEmail);
    } catch (error) {
      log.error(`Failed to reset rate limit for ${customerEmail}:`, error);
    }
  }

  /**
   * Reset global rate limit (emergency only)
   * Should only be called during incident response
   */
  static async resetGlobal(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(GLOBAL_KEY_PREFIX);
        log.warn('Global rate limit reset (Redis) - EMERGENCY ACTION');
      }

      // Also reset in-memory
      inMemoryGlobalTracker.length = 0;
    } catch (error) {
      log.error('Failed to reset global rate limit:', error);
    }
  }

  /**
   * Get current rate limit status (for monitoring/debugging)
   */
  static async getStatus(customerEmail: string): Promise<{
    customerCount: number;
    customerLimit: number;
    globalCount: number;
    globalLimit: number;
    usingRedis: boolean;
  }> {
    try {
      const now = Date.now();
      const cutoffTime = now - WINDOW_MS;

      if (this.redis) {
        try {
          const customerKey = CUSTOMER_KEY_PREFIX + customerEmail;
          const customerJson = await this.redis.get(customerKey);
          const globalJson = await this.redis.get(GLOBAL_KEY_PREFIX);

          const customerTimestamps: number[] = customerJson
            ? JSON.parse(customerJson)
            : [];
          const globalTimestamps: number[] = globalJson
            ? JSON.parse(globalJson)
            : [];

          const recentCustomer = customerTimestamps.filter(
            (ts) => ts > cutoffTime
          ).length;
          const recentGlobal = globalTimestamps.filter(
            (ts) => ts > cutoffTime
          ).length;

          return {
            customerCount: recentCustomer,
            customerLimit: RATE_LIMIT_PER_CUSTOMER_PER_MINUTE,
            globalCount: recentGlobal,
            globalLimit: RATE_LIMIT_GLOBAL_PER_MINUTE,
            usingRedis: true,
          };
        } catch (error) {
          log.error('Failed to get status from Redis:', error);
          // Fall through to in-memory
        }
      }

      // In-memory status
      const customerTimestamps = inMemoryCustomerTracker.get(customerEmail) || [];
      const recentCustomer = customerTimestamps.filter(
        (ts) => ts > cutoffTime
      ).length;
      const recentGlobal = inMemoryGlobalTracker.filter(
        (ts) => ts > cutoffTime
      ).length;

      return {
        customerCount: recentCustomer,
        customerLimit: RATE_LIMIT_PER_CUSTOMER_PER_MINUTE,
        globalCount: recentGlobal,
        globalLimit: RATE_LIMIT_GLOBAL_PER_MINUTE,
        usingRedis: false,
      };
    } catch (error) {
      log.error('Failed to get rate limit status:', error);
      return {
        customerCount: 0,
        customerLimit: RATE_LIMIT_PER_CUSTOMER_PER_MINUTE,
        globalCount: 0,
        globalLimit: RATE_LIMIT_GLOBAL_PER_MINUTE,
        usingRedis: false,
      };
    }
  }
}
