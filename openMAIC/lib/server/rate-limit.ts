/**
 * Rate Limiting Service
 * Prevents brute-force attacks on login and magic link endpoints
 * Uses Vercel KV (Redis) with fallback to in-memory cache
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('RateLimit');

// Vercel KV client (lazy loaded)
let kv: any = null;
let kvInitialized = false;

async function initializeKV() {
  if (kvInitialized) return kv;
  kvInitialized = true;

  try {
    // Only import on server-side
    if (typeof window === 'undefined') {
      const kvModule = await import('@vercel/kv');
      kv = kvModule.kv;
    }
  } catch (error) {
    // KV not available, using fallback
    if (process.env.NODE_ENV !== 'test') {
      log.warn('Vercel KV not available, using in-memory fallback');
    }
  }

  return kv;
}

// Fallback in-memory cache for development or when KV unavailable
const attemptCache = new Map<string, { attempts: number; resetTime: number }>();

const RATE_LIMITS = {
  LOGIN_ATTEMPTS: 5, // Max failed login attempts
  LOGIN_WINDOW_SECONDS: 15 * 60, // 15 minutes window for login attempts
  MAGIC_LINK_REQUESTS: 3, // Max magic link requests
  MAGIC_LINK_WINDOW_SECONDS: 60 * 60, // 60 minutes window for magic link requests
  LOCK_DURATION_SECONDS: 15 * 60, // 15 minutes default lock
};

/**
 * Get value from KV or fallback to in-memory cache
 */
async function kvGet(key: string): Promise<string | null> {
  const kvClient = await initializeKV();

  try {
    if (kvClient) {
      return await kvClient.get(key);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      log.warn(`KV get failed for ${key}, using fallback`, error);
    }
  }

  // Fallback to in-memory cache
  const entry = attemptCache.get(key);
  if (entry && Date.now() < entry.resetTime) {
    return entry.attempts.toString();
  }
  return null;
}

/**
 * Set value in KV or fallback to in-memory cache with TTL
 */
async function kvSet(key: string, value: string, exSeconds: number): Promise<void> {
  const kvClient = await initializeKV();

  try {
    if (kvClient) {
      await kvClient.set(key, value, { ex: exSeconds });
      return;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      log.warn(`KV set failed for ${key}, using fallback`, error);
    }
  }

  // Fallback to in-memory cache
  attemptCache.set(key, {
    attempts: parseInt(value, 10),
    resetTime: Date.now() + exSeconds * 1000,
  });
}

/**
 * Increment value in KV or fallback to in-memory cache
 */
async function kvIncr(key: string, exSeconds: number): Promise<number> {
  const kvClient = await initializeKV();

  try {
    if (kvClient) {
      const newVal = await kvClient.incr(key);
      // Set expiry on first increment
      if (newVal === 1) {
        await kvClient.expire(key, exSeconds);
      }
      return newVal;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      log.warn(`KV incr failed for ${key}, using fallback`, error);
    }
  }

  // Fallback to in-memory cache
  const entry = attemptCache.get(key);
  if (!entry || Date.now() >= entry.resetTime) {
    attemptCache.set(key, {
      attempts: 1,
      resetTime: Date.now() + exSeconds * 1000,
    });
    return 1;
  }

  entry.attempts += 1;
  return entry.attempts;
}

/**
 * Delete key from KV or fallback to in-memory cache
 */
async function kvDel(key: string): Promise<void> {
  const kvClient = await initializeKV();

  try {
    if (kvClient) {
      await kvClient.del(key);
      return;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      log.warn(`KV del failed for ${key}, using fallback`, error);
    }
  }

  // Fallback to in-memory cache
  attemptCache.delete(key);
}

/**
 * Check if an email has exceeded login attempt limit
 * @param email - Email address attempting login
 * @param failed - Is this a failed attempt?
 * @returns { allowed: boolean, remainingAttempts: number, resetTime: Date | null }
 */
export async function checkLoginRateLimit(
  email: string,
  failed: boolean = true
): Promise<{ allowed: boolean; remainingAttempts: number; resetTime: Date | null }> {
  const key = `rate-limit:login:${email.toLowerCase()}`;

  if (!failed) {
    // Just checking, don't increment
    const attempts = await kvGet(key);
    const attemptCount = attempts ? parseInt(attempts, 10) : 0;
    const remaining = Math.max(0, RATE_LIMITS.LOGIN_ATTEMPTS - attemptCount);
    return {
      allowed: remaining > 0,
      remainingAttempts: remaining,
      resetTime: null,
    };
  }

  // Increment failed attempts
  const newAttempts = await kvIncr(key, RATE_LIMITS.LOGIN_WINDOW_SECONDS);
  const isAllowed = newAttempts < RATE_LIMITS.LOGIN_ATTEMPTS;
  const remaining = Math.max(0, RATE_LIMITS.LOGIN_ATTEMPTS - newAttempts);

  if (!isAllowed) {
    log.warn(
      `Login rate limit exceeded for ${email}: ${newAttempts} attempts`
    );
  } else {
    log.debug(
      `Login attempt ${newAttempts}/${RATE_LIMITS.LOGIN_ATTEMPTS} for ${email}`
    );
  }

  // Calculate reset time
  const resetTime = new Date(Date.now() + RATE_LIMITS.LOGIN_WINDOW_SECONDS * 1000);

  return {
    allowed: isAllowed,
    remainingAttempts: remaining,
    resetTime,
  };
}

/**
 * Reset login attempts for an email (successful login)
 * @param email - Email address
 */
export async function resetLoginAttempts(email: string): Promise<void> {
  const key = `rate-limit:login:${email.toLowerCase()}`;
  await kvDel(key);
  log.debug(`Login attempts reset for ${email}`);
}

/**
 * Check if an email has exceeded magic link request limit
 * @param email - Email address requesting magic link
 * @returns { allowed: boolean, remainingRequests: number, resetTime: Date | null }
 */
export async function checkMagicLinkRateLimit(email: string): Promise<{
  allowed: boolean;
  remainingRequests: number;
  resetTime: Date | null;
}> {
  const key = `rate-limit:magiclink:${email.toLowerCase()}`;

  // Increment request count
  const newAttempts = await kvIncr(key, RATE_LIMITS.MAGIC_LINK_WINDOW_SECONDS);
  const isAllowed = newAttempts <= RATE_LIMITS.MAGIC_LINK_REQUESTS;
  const remaining = Math.max(0, RATE_LIMITS.MAGIC_LINK_REQUESTS - newAttempts);

  if (!isAllowed) {
    log.warn(
      `Magic link rate limit exceeded for ${email}: ${newAttempts} requests`
    );
  } else {
    log.debug(
      `Magic link request ${newAttempts}/${RATE_LIMITS.MAGIC_LINK_REQUESTS} for ${email}`
    );
  }

  // Calculate reset time
  const resetTime = new Date(Date.now() + RATE_LIMITS.MAGIC_LINK_WINDOW_SECONDS * 1000);

  return {
    allowed: isAllowed,
    remainingRequests: remaining,
    resetTime,
  };
}

/**
 * Check if an account is locked due to too many failed attempts
 * @param email - Email address
 * @returns { locked: boolean, unlocksAt: Date | null }
 */
export async function checkAccountLock(email: string): Promise<{
  locked: boolean;
  unlocksAt: Date | null;
}> {
  const key = `rate-limit:lock:${email.toLowerCase()}`;

  const lockData = await kvGet(key);
  if (!lockData) {
    return { locked: false, unlocksAt: null };
  }

  // For now, we just check if the key exists. TTL will auto-delete it.
  // In a real scenario, you might store the exact unlock time.
  const unlocksAt = new Date(Date.now() + RATE_LIMITS.LOCK_DURATION_SECONDS * 1000);

  return {
    locked: true,
    unlocksAt,
  };
}

/**
 * Lock an account after too many failed attempts
 * @param email - Email address
 * @param lockDurationMinutes - How long to lock account
 */
export async function lockAccount(email: string, lockDurationMinutes: number = 15): Promise<void> {
  const key = `rate-limit:lock:${email.toLowerCase()}`;
  const lockDurationSeconds = lockDurationMinutes * 60;

  await kvSet(key, '1', lockDurationSeconds);

  const unlocksAt = new Date(Date.now() + lockDurationSeconds * 1000);
  log.warn(
    `Account locked for ${email} until ${unlocksAt.toISOString()}`
  );
}

/**
 * Unlock an account (admin action)
 * @param email - Email address
 */
export async function unlockAccount(email: string): Promise<void> {
  const key = `rate-limit:lock:${email.toLowerCase()}`;
  await kvDel(key);
  log.info(`Account unlocked for ${email}`);
}

/**
 * Get rate limit headers for HTTP response
 * @param remainingRequests - Number of remaining requests
 * @param resetTime - When the limit resets
 * @returns Object with rate limit headers
 */
export function getRateLimitHeaders(
  remainingRequests: number,
  resetTime: Date | null
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': remainingRequests.toString(),
  };

  if (resetTime) {
    headers['X-RateLimit-Reset'] = resetTime.toISOString();
    headers['Retry-After'] = Math.ceil(
      (resetTime.getTime() - Date.now()) / 1000
    ).toString();
  }

  return headers;
}
