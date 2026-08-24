/**
 * Circuit Breaker Tests
 *
 * Verifies:
 * 1. Circuit opens after 3 consecutive failures
 * 2. Circuit returns 503 when open
 * 3. Circuit closes after successful recovery
 * 4. Circuit transitions to HALF_OPEN after recovery timeout
 * 5. Feature flag can disable/enable the circuit breaker
 * 6. Metrics are correctly tracked
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker, CircuitState, getCircuitBreaker, resetCircuitBreakerSingleton } from '../../lib/webhook/circuit-breaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    // Create fresh breaker for each test
    breaker = new CircuitBreaker(undefined, {
      failureThreshold: 3,
      timeoutWindowMs: 1000,      // 1 second for faster testing
      halfOpenTestIntervalMs: 500, // 500ms for faster testing
      enabled: true,
    });
  });

  describe('Initial state', () => {
    it('should start in CLOSED state', () => {
      const metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.CLOSED);
      expect(metrics.consecutiveFailures).toBe(0);
      expect(metrics.isHealthy).toBe(true);
    });

    it('should allow operations when healthy', () => {
      expect(breaker.isHealthy()).toBe(true);
    });
  });

  describe('Failure tracking', () => {
    it('should track consecutive failures within timeout window', () => {
      breaker.recordFailure();
      let metrics = breaker.getMetrics();
      expect(metrics.consecutiveFailures).toBe(1);

      breaker.recordFailure();
      metrics = breaker.getMetrics();
      expect(metrics.consecutiveFailures).toBe(2);

      breaker.recordFailure();
      metrics = breaker.getMetrics();
      expect(metrics.consecutiveFailures).toBe(3);
    });

    it('should open circuit after 3 consecutive failures', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      const metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.OPEN);
      expect(metrics.isHealthy).toBe(false);
    });

    it('should return 503 when circuit is open', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      expect(breaker.isHealthy()).toBe(false);
    });

    it('should reset counter when failure is outside timeout window', async () => {
      breaker.recordFailure();
      let metrics = breaker.getMetrics();
      expect(metrics.consecutiveFailures).toBe(1);

      // Wait for timeout window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      breaker.recordFailure();
      metrics = breaker.getMetrics();
      // Counter should be reset to 1 (not 2)
      expect(metrics.consecutiveFailures).toBe(1);
    });
  });

  describe('Success handling', () => {
    it('should reset counter to 0 on success', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      let metrics = breaker.getMetrics();
      expect(metrics.consecutiveFailures).toBe(2);

      breaker.recordSuccess();
      metrics = breaker.getMetrics();
      expect(metrics.consecutiveFailures).toBe(0);
    });

    it('should close circuit on success from HALF_OPEN state', () => {
      // Open the circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      // Force to HALF_OPEN
      breaker.forceHalfOpen();
      let metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.HALF_OPEN);

      // Record success
      breaker.recordSuccess();
      metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.CLOSED);
      expect(metrics.isHealthy).toBe(true);
    });
  });

  describe('Circuit state transitions', () => {
    it('should transition to OPEN after threshold', () => {
      let metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.CLOSED);

      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.OPEN);
    });

    it('should track state transition count', () => {
      let metrics = breaker.getMetrics();
      expect(metrics.totalStateTransitions).toBe(0);

      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      metrics = breaker.getMetrics();
      expect(metrics.totalStateTransitions).toBe(1); // CLOSED → OPEN

      breaker.forceHalfOpen();
      metrics = breaker.getMetrics();
      expect(metrics.totalStateTransitions).toBe(2); // OPEN → HALF_OPEN

      breaker.recordSuccess();
      metrics = breaker.getMetrics();
      expect(metrics.totalStateTransitions).toBe(3); // HALF_OPEN → CLOSED
    });

    it('should record stateChangedAt timestamp on transition', () => {
      const before = Date.now();
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      const metrics = breaker.getMetrics();
      expect(metrics.stateChangedAt).toBeGreaterThanOrEqual(before);
      expect(metrics.stateChangedAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Manual control', () => {
    it('should allow manual reset to CLOSED', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      let metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.OPEN);

      breaker.reset();
      metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.CLOSED);
      expect(metrics.consecutiveFailures).toBe(0);
    });

    it('should allow manual transition to HALF_OPEN', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      let metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.OPEN);

      breaker.forceHalfOpen();
      metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.HALF_OPEN);
    });
  });

  describe('Feature flag', () => {
    it('should bypass circuit breaker when disabled', () => {
      const disabledBreaker = new CircuitBreaker(undefined, {
        enabled: false,
      });

      // Record many failures - should not open because disabled
      for (let i = 0; i < 10; i++) {
        disabledBreaker.recordFailure();
      }

      const metrics = disabledBreaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.CLOSED);
      expect(disabledBreaker.isHealthy()).toBe(true);
    });
  });

  describe('Metrics', () => {
    it('should provide accurate metrics', () => {
      breaker.recordFailure();
      breaker.recordFailure();

      const metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.CLOSED);
      expect(metrics.consecutiveFailures).toBe(2);
      expect(metrics.lastFailureTimestamp).not.toBeNull();
      expect(metrics.stateChangedAt).not.toBeNull();
      expect(metrics.totalStateTransitions).toBe(0);
      expect(metrics.isHealthy).toBe(true);
    });

    it('should track last failure timestamp', () => {
      const before = Date.now();
      breaker.recordFailure();
      const after = Date.now();

      const metrics = breaker.getMetrics();
      expect(metrics.lastFailureTimestamp).toBeGreaterThanOrEqual(before);
      expect(metrics.lastFailureTimestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Half-open recovery testing', () => {
    it('should transition back to OPEN if test fails', async () => {
      // Open the circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      // Force to HALF_OPEN
      breaker.forceHalfOpen();
      let metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.HALF_OPEN);

      // Wait for half-open test interval
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Update state (simulating next webhook call)
      breaker.updateState();

      metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.OPEN);
    });

    it('should stay in HALF_OPEN until test interval expires', async () => {
      breaker.forceHalfOpen();

      // Should still be HALF_OPEN before interval
      breaker.updateState();
      let metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.HALF_OPEN);

      // Wait less than interval
      await new Promise((resolve) => setTimeout(resolve, 200));
      breaker.updateState();
      metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.HALF_OPEN);
    });
  });

  describe('Automatic OPEN → HALF_OPEN transition', () => {
    it('should transition to HALF_OPEN after recovery timeout', async () => {
      // Open the circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      let metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.OPEN);

      // Wait for timeout window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Call updateState to check for transitions
      breaker.updateState();

      metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.HALF_OPEN);
    });
  });

  describe('Singleton pattern', () => {
    it('should provide global singleton instance', () => {
      resetCircuitBreakerSingleton();

      const breaker1 = getCircuitBreaker();
      const breaker2 = getCircuitBreaker();

      expect(breaker1).toBe(breaker2);
    });

    it('should reset singleton for testing', () => {
      const breaker1 = getCircuitBreaker();
      resetCircuitBreakerSingleton();
      const breaker2 = getCircuitBreaker();

      expect(breaker1).not.toBe(breaker2);
    });
  });

  describe('Logger integration', () => {
    it('should call logger on state transition', () => {
      const mockLogger = {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      };

      const breakerWithLogger = new CircuitBreaker(mockLogger, {
        failureThreshold: 3,
        enabled: true,
      });

      breakerWithLogger.recordFailure();
      expect(mockLogger.debug).toHaveBeenCalled();

      breakerWithLogger.recordFailure();
      expect(mockLogger.debug).toHaveBeenCalled();

      breakerWithLogger.recordFailure();
      expect(mockLogger.warn).toHaveBeenCalled(); // State transition
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid success/failure cycles', () => {
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
        breaker.recordSuccess();
        expect(breaker.getMetrics().consecutiveFailures).toBe(0);
      }
    });

    it('should handle no failures gracefully', () => {
      const metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.CLOSED);
      expect(metrics.consecutiveFailures).toBe(0);
      expect(metrics.lastFailureTimestamp).toBeNull();
    });

    it('should be idempotent for multiple resets', () => {
      breaker.reset();
      breaker.reset();
      breaker.reset();

      const metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.CLOSED);
      expect(metrics.consecutiveFailures).toBe(0);
    });
  });
});

describe('CircuitBreaker integration scenarios', () => {
  it('should handle real webhook failure scenario', async () => {
    const breaker = new CircuitBreaker(undefined, {
      failureThreshold: 3,
      timeoutWindowMs: 1000,
      halfOpenTestIntervalMs: 500,
      enabled: true,
    });

    // Simulate 3 webhook failures (Supabase down)
    breaker.recordFailure();
    expect(breaker.isHealthy()).toBe(true); // Still accepting, but tracking

    breaker.recordFailure();
    expect(breaker.isHealthy()).toBe(true);

    breaker.recordFailure();
    expect(breaker.isHealthy()).toBe(false); // Circuit opens, return 503

    // Simulate waiting for recovery + testing
    await new Promise((resolve) => setTimeout(resolve, 1100));
    breaker.updateState();

    // Should transition to HALF_OPEN
    expect(breaker.getMetrics().state).toBe(CircuitState.HALF_OPEN);

    // Simulate successful recovery
    breaker.recordSuccess();

    // Should close circuit
    expect(breaker.isHealthy()).toBe(true);
    expect(breaker.getMetrics().state).toBe(CircuitState.CLOSED);
  });

  it('should handle continuous failures during recovery attempt', async () => {
    const breaker = new CircuitBreaker(undefined, {
      failureThreshold: 3,
      timeoutWindowMs: 1000,
      halfOpenTestIntervalMs: 300,
      enabled: true,
    });

    // Open circuit
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getMetrics().state).toBe(CircuitState.OPEN);

    // Wait and transition to HALF_OPEN
    await new Promise((resolve) => setTimeout(resolve, 1100));
    breaker.updateState();
    expect(breaker.getMetrics().state).toBe(CircuitState.HALF_OPEN);

    // Simulate failure during recovery attempt
    breaker.recordFailure();
    expect(breaker.getMetrics().state).toBe(CircuitState.HALF_OPEN); // Still testing

    // Wait for test interval to expire
    await new Promise((resolve) => setTimeout(resolve, 400));
    breaker.updateState();

    // Should go back to OPEN
    expect(breaker.getMetrics().state).toBe(CircuitState.OPEN);
  });
});
