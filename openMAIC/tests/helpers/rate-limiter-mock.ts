/**
 * Mock implementations of RateLimiter for testing injection patterns
 */

export type RateLimitCheckResult = {
  allowed: boolean;
  customerCount: number;
  customerLimit: number;
  globalCount: number;
  globalLimit: number;
};

/**
 * Mock RateLimiter for testing
 */
export class MockRateLimiter {
  private callCount = 0;
  private shouldAllow = true;

  async checkRateLimit(): Promise<RateLimitCheckResult> {
    this.callCount++;
    return {
      allowed: this.shouldAllow,
      customerCount: this.callCount,
      customerLimit: 100,
      globalCount: this.callCount,
      globalLimit: 1000,
    };
  }

  async reset(): Promise<void> {
    this.callCount = 0;
  }

  setShouldAllow(allow: boolean): void {
    this.shouldAllow = allow;
  }

  getCallCount(): number {
    return this.callCount;
  }
}

/**
 * Create a test rate limiter with custom behavior
 */
export function createTestRateLimiter(allowRequests = true): MockRateLimiter {
  const limiter = new MockRateLimiter();
  limiter.setShouldAllow(allowRequests);
  return limiter;
}

/**
 * Permissive rate limiter for testing (always allows)
 */
export class PermissiveRateLimiter {
  async checkRateLimit(): Promise<RateLimitCheckResult> {
    return {
      allowed: true,
      customerCount: 0,
      customerLimit: 100,
      globalCount: 0,
      globalLimit: 1000,
    };
  }
}

/**
 * Restrictive rate limiter for testing (always denies)
 */
export class RestrictiveRateLimiter {
  async checkRateLimit(): Promise<RateLimitCheckResult> {
    return {
      allowed: false,
      customerCount: 100,
      customerLimit: 100,
      globalCount: 1000,
      globalLimit: 1000,
    };
  }
}
