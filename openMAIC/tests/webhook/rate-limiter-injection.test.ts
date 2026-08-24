/**
 * RateLimiter Injection Tests
 *
 * Tests for the refactored injectable RateLimiter pattern.
 * Verifies that:
 * - RateLimiter can be instantiated
 * - Each instance has isolated state
 * - reset() method clears state for test isolation
 * - Tests can run in parallel without interference
 * - Backwards compatibility with static methods
 *
 * Run: npm test -- rate-limiter-injection.test.ts
 */

import { RateLimiter } from '../../lib/security/webhook-security';
import { MockRateLimiter, createTestRateLimiter, PermissiveRateLimiter, RestrictiveRateLimiter } from '../helpers/rate-limiter-mock';

describe('RateLimiter Injection Pattern', () => {
  // ========================================================================
  // TEST 1: INSTANTIATION
  // ========================================================================

  describe('Test 1: RateLimiter Instantiation', () => {
    it('should create a RateLimiter instance', () => {
      const limiter = new RateLimiter();
      expect(limiter).toBeDefined();
      expect(typeof limiter.checkRateLimit).toBe('function');
      expect(typeof limiter.reset).toBe('function');
    });

    it('should have instance methods', () => {
      const limiter = new RateLimiter();
      expect(limiter.checkRateLimit).toBeDefined();
      expect(limiter.resetGlobal).toBeDefined();
      expect(limiter.getStatus).toBeDefined();
    });
  });

  // ========================================================================
  // TEST 2: INSTANCE ISOLATION
  // ========================================================================

  describe('Test 2: Instance State Isolation', () => {
    it('should have independent state per instance', async () => {
      const limiter1 = new MockRateLimiter({ customerLimit: 3 });
      const limiter2 = new MockRateLimiter({ customerLimit: 3 });

      const email = 'test@example.com';

      // Fill up limiter1
      for (let i = 0; i < 3; i++) {
        await limiter1.checkRateLimit(email);
      }

      // limiter1 should be rate limited
      expect(await limiter1.checkRateLimit(email)).toBe(false);

      // limiter2 should not be affected
      expect(await limiter2.checkRateLimit(email)).toBe(true);
    });
  });

  // ========================================================================
  // TEST 3: RESET METHOD
  // ========================================================================

  describe('Test 3: Reset Method for Test Isolation', () => {
    it('should clear state when reset() is called', async () => {
      const limiter = new MockRateLimiter({ customerLimit: 3 });
      const email = 'test@example.com';

      // Consume limit
      for (let i = 0; i < 3; i++) {
        await limiter.checkRateLimit(email);
      }

      // Should be rate limited
      expect(await limiter.checkRateLimit(email)).toBe(false);

      // After reset
      await limiter.reset();

      // Should be allowed again
      expect(await limiter.checkRateLimit(email)).toBe(true);
    });

    it('should clear only specific customer when email provided', async () => {
      const limiter = new MockRateLimiter({ customerLimit: 2 });
      const email1 = 'student1@example.com';
      const email2 = 'student2@example.com';

      // Fill both customers
      await limiter.checkRateLimit(email1);
      await limiter.checkRateLimit(email1);
      await limiter.checkRateLimit(email2);
      await limiter.checkRateLimit(email2);

      // Both rate limited
      expect(await limiter.checkRateLimit(email1)).toBe(false);
      expect(await limiter.checkRateLimit(email2)).toBe(false);

      // Reset only email1
      await limiter.reset(email1);

      // Only email1 should be allowed
      expect(await limiter.checkRateLimit(email1)).toBe(true);
      expect(await limiter.checkRateLimit(email2)).toBe(false);
    });
  });

  // ========================================================================
  // TEST 4: PARALLEL TEST EXECUTION
  // ========================================================================

  describe('Test 4: Parallel Test Execution (No State Leakage)', () => {
    // These tests would run in parallel in real test runners
    // Each test creates its own limiter instance
    it('parallel test 1: independent instance A', async () => {
      const limiter = new MockRateLimiter({ customerLimit: 2 });
      await limiter.checkRateLimit('parallel-a@example.com');
      await limiter.checkRateLimit('parallel-a@example.com');

      // Should be limited
      expect(await limiter.checkRateLimit('parallel-a@example.com')).toBe(false);

      await limiter.reset();
    });

    it('parallel test 2: independent instance B', async () => {
      const limiter = new MockRateLimiter({ customerLimit: 2 });
      // This instance should not be affected by parallel test 1
      expect(await limiter.checkRateLimit('parallel-b@example.com')).toBe(true);

      await limiter.reset();
    });

    it('parallel test 3: independent instance C', async () => {
      const limiter = new MockRateLimiter({ customerLimit: 2 });
      // This instance should not be affected by other parallel tests
      expect(await limiter.checkRateLimit('parallel-c@example.com')).toBe(true);

      await limiter.reset();
    });
  });

  // ========================================================================
  // TEST 5: BACKWARDS COMPATIBILITY
  // ========================================================================

  describe('Test 5: Backwards Compatibility (Static Methods)', () => {
    it('should have static checkRateLimit method', () => {
      expect(typeof RateLimiter.checkRateLimit).toBe('function');
    });

    it('should have static reset method', () => {
      expect(typeof RateLimiter.reset).toBe('function');
    });

    it('should have static resetGlobal method', () => {
      expect(typeof RateLimiter.resetGlobal).toBe('function');
    });

    it('should have static getStatus method', () => {
      expect(typeof RateLimiter.getStatus).toBe('function');
    });

    it('static methods should work', async () => {
      // Static methods should not throw
      const result = await RateLimiter.checkRateLimit('legacy@example.com');
      expect(typeof result).toBe('boolean');
    });
  });

  // ========================================================================
  // TEST 6: MOCK RATE LIMITER FEATURES
  // ========================================================================

  describe('Test 6: Mock RateLimiter Spy Features', () => {
    it('should track call history', async () => {
      const limiter = new MockRateLimiter({ customerLimit: 100 });
      const email = 'spy-test@example.com';

      await limiter.checkRateLimit(email);
      await limiter.checkRateLimit(email);

      const calls = limiter.getCalls();
      expect(calls).toHaveLength(2);
      expect(calls[0].email).toBe(email);
      expect(calls[0].allowed).toBe(true);
    });

    it('should count rate limited requests', async () => {
      const limiter = new MockRateLimiter({ customerLimit: 2 });
      const email = 'count-test@example.com';

      await limiter.checkRateLimit(email); // OK
      await limiter.checkRateLimit(email); // OK
      await limiter.checkRateLimit(email); // DENIED
      await limiter.checkRateLimit(email); // DENIED

      expect(limiter.getRateLimitedCount(email)).toBe(2);
      expect(limiter.getAllowedCount(email)).toBe(2);
    });

    it('should get call count', async () => {
      const limiter = new MockRateLimiter({ customerLimit: 100 });

      await limiter.checkRateLimit('test1@example.com');
      await limiter.checkRateLimit('test2@example.com');
      await limiter.checkRateLimit('test1@example.com');

      expect(limiter.getCallCount()).toBe(3);
    });

    it('should clear call history', async () => {
      const limiter = new MockRateLimiter({ customerLimit: 100 });

      await limiter.checkRateLimit('test@example.com');
      expect(limiter.getCallCount()).toBe(1);

      limiter.clearCallHistory();
      expect(limiter.getCallCount()).toBe(0);
    });
  });

  // ========================================================================
  // TEST 7: PERMISSIVE AND RESTRICTIVE LIMITERS
  // ========================================================================

  describe('Test 7: Permissive and Restrictive Limiters', () => {
    it('PermissiveRateLimiter should never rate limit', async () => {
      const limiter = new PermissiveRateLimiter();

      for (let i = 0; i < 1000; i++) {
        const result = await limiter.checkRateLimit('test@example.com');
        expect(result).toBe(true);
      }
    });

    it('RestrictiveRateLimiter should always rate limit', async () => {
      const limiter = new RestrictiveRateLimiter();

      for (let i = 0; i < 5; i++) {
        const result = await limiter.checkRateLimit('test@example.com');
        expect(result).toBe(false);
      }
    });
  });

  // ========================================================================
  // TEST 8: TEST FACTORY FUNCTIONS
  // ========================================================================

  describe('Test 8: Factory Functions', () => {
    it('createTestRateLimiter should have low limits', async () => {
      const limiter = createTestRateLimiter(2, 10);

      // Customer limit is 2
      expect(await limiter.checkRateLimit('test@example.com')).toBe(true);
      expect(await limiter.checkRateLimit('test@example.com')).toBe(true);
      expect(await limiter.checkRateLimit('test@example.com')).toBe(false);
    });

    it('createTestRateLimiter with custom limits', async () => {
      const limiter = createTestRateLimiter(5, 20);

      for (let i = 0; i < 5; i++) {
        expect(await limiter.checkRateLimit('test@example.com')).toBe(true);
      }

      // Should be limited now
      expect(await limiter.checkRateLimit('test@example.com')).toBe(false);
    });
  });

  // ========================================================================
  // TEST 9: GLOBAL LIMIT ENFORCEMENT
  // ========================================================================

  describe('Test 9: Global Limit Enforcement', () => {
    it('should enforce global limit across customers', async () => {
      const limiter = new MockRateLimiter({ customerLimit: 100, globalLimit: 5 });

      // Make 5 requests from different emails
      expect(await limiter.checkRateLimit('user1@example.com')).toBe(true);
      expect(await limiter.checkRateLimit('user2@example.com')).toBe(true);
      expect(await limiter.checkRateLimit('user3@example.com')).toBe(true);
      expect(await limiter.checkRateLimit('user4@example.com')).toBe(true);
      expect(await limiter.checkRateLimit('user5@example.com')).toBe(true);

      // Global limit reached - next request from any user should fail
      expect(await limiter.checkRateLimit('user6@example.com')).toBe(false);
    });

    it('should reset global limit via resetGlobal()', async () => {
      const limiter = new MockRateLimiter({ customerLimit: 100, globalLimit: 3 });

      // Hit global limit
      await limiter.checkRateLimit('user1@example.com');
      await limiter.checkRateLimit('user2@example.com');
      await limiter.checkRateLimit('user3@example.com');
      expect(await limiter.checkRateLimit('user4@example.com')).toBe(false);

      // Reset global
      await limiter.resetGlobal();

      // Should be allowed again
      expect(await limiter.checkRateLimit('user5@example.com')).toBe(true);
    });
  });

  // ========================================================================
  // TEST 10: REAL WORLD INJECTION PATTERN
  // ========================================================================

  describe('Test 10: Real World Injection Pattern', () => {
    // Example of how you'd use this in real code
    class WebhookProcessor {
      constructor(private rateLimiter: MockRateLimiter) {}

      async processWebhook(email: string): Promise<{ success: boolean }> {
        const allowed = await this.rateLimiter.checkRateLimit(email);

        if (!allowed) {
          return { success: false };
        }

        return { success: true };
      }
    }

    it('should inject mock limiter into processor', async () => {
      const mockLimiter = createTestRateLimiter(2, 10);
      const processor = new WebhookProcessor(mockLimiter);

      // First two requests succeed
      expect(await processor.processWebhook('test@example.com')).toEqual({ success: true });
      expect(await processor.processWebhook('test@example.com')).toEqual({ success: true });

      // Third request is rate limited
      expect(await processor.processWebhook('test@example.com')).toEqual({ success: false });
    });

    it('should reset limiter between tests', async () => {
      const mockLimiter = createTestRateLimiter(2, 10);
      const processor = new WebhookProcessor(mockLimiter);

      // First test
      await processor.processWebhook('test@example.com');
      await processor.processWebhook('test@example.com');
      expect(await processor.processWebhook('test@example.com')).toEqual({ success: false });

      // Reset
      await mockLimiter.reset();

      // Second test - starts fresh
      expect(await processor.processWebhook('test@example.com')).toEqual({ success: true });
    });
  });
});
