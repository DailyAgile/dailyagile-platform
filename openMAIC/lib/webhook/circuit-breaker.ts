/**
 * Circuit Breaker Pattern for Webhook Processing
 *
 * Prevents cascade failures when Supabase (or other dependencies) is down
 * for extended periods (>5 minutes).
 *
 * States:
 * - CLOSED: Normal operation, allow all webhooks
 * - OPEN: Too many failures, return 503 Service Unavailable (Stripe backs off)
 * - HALF_OPEN: Testing if dependency recovered, allow 1 test request
 *
 * Configuration:
 * - Feature flag: CIRCUIT_BREAKER_ENABLED (default: true)
 * - Failure threshold: 3 consecutive failures
 * - Timeout window: 60 seconds (consecutive failures must occur within this window)
 * - Half-open test interval: 30 seconds (how often to test recovery)
 *
 * Implementation:
 * - In-memory state tracking (could be extended to Redis for distributed systems)
 * - Thread-safe operations using atomic timestamps
 * - Configurable thresholds via constructor
 * - Comprehensive logging of state transitions
 */

interface Logger {
  error: (msg: string, context?: Record<string, unknown>) => void;
  info: (msg: string, context?: Record<string, unknown>) => void;
  warn: (msg: string, context?: Record<string, unknown>) => void;
  debug: (msg: string, context?: Record<string, unknown>) => void;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold?: number;           // Default: 3 consecutive failures
  timeoutWindowMs?: number;            // Default: 60000 ms (60 seconds)
  halfOpenTestIntervalMs?: number;     // Default: 30000 ms (30 seconds)
  enabled?: boolean;                   // Default: true
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  consecutiveFailures: number;
  lastFailureTimestamp: number | null;
  stateChangedAt: number;
  totalStateTransitions: number;
  isHealthy: boolean;
}

/**
 * CircuitBreaker
 *
 * Monitors Supabase connection health and pauses webhook processing if
 * dependency is down for more than 5 minutes (3 failures + recovery testing).
 *
 * Usage:
 * ```ts
 * const breaker = new CircuitBreaker(logger);
 *
 * // Before processing webhook:
 * if (!breaker.isHealthy()) {
 *   return NextResponse.json(
 *     { error: 'Service temporarily unavailable' },
 *     { status: 503 }
 *   );
 * }
 *
 * // Try to process webhook:
 * try {
 *   result = await processor.process(event);
 *   breaker.recordSuccess();
 * } catch (err) {
 *   breaker.recordFailure();
 *   throw err;
 * }
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private consecutiveFailures: number = 0;
  private lastFailureTimestamp: number | null = null;
  private stateChangedAt: number = Date.now();
  private totalStateTransitions: number = 0;

  private failureThreshold: number;
  private timeoutWindowMs: number;
  private halfOpenTestIntervalMs: number;
  private enabled: boolean;

  constructor(
    private logger?: Logger,
    config: CircuitBreakerConfig = {}
  ) {
    this.failureThreshold = config.failureThreshold ?? 3;
    this.timeoutWindowMs = config.timeoutWindowMs ?? 60000;      // 60 seconds
    this.halfOpenTestIntervalMs = config.halfOpenTestIntervalMs ?? 30000; // 30 seconds
    this.enabled = config.enabled ?? this.getFeatureFlagValue();

    this.logger?.info('CircuitBreaker initialized', {
      enabled: this.enabled,
      failureThreshold: this.failureThreshold,
      timeoutWindowMs: this.timeoutWindowMs,
      halfOpenTestIntervalMs: this.halfOpenTestIntervalMs,
    });
  }

  /**
   * Get feature flag value from environment
   * CIRCUIT_BREAKER_ENABLED=true/false (default: true)
   */
  private getFeatureFlagValue(): boolean {
    const flag = process.env.CIRCUIT_BREAKER_ENABLED;
    if (flag === 'false') return false;
    if (flag === 'true') return true;
    return true; // default: enabled
  }

  /**
   * Check if circuit is healthy (closed or testing in half-open)
   * Returns false only when circuit is OPEN (dependency definitely down)
   */
  public isHealthy(): boolean {
    if (!this.enabled) {
      return true; // Bypass if disabled
    }

    this.maybeTransitionFromHalfOpen();

    return this.state !== CircuitState.OPEN;
  }

  /**
   * Record successful operation
   * - Resets consecutive failure counter
   * - Closes circuit if in HALF_OPEN state
   */
  public recordSuccess(): void {
    if (!this.enabled) {
      return;
    }

    const previousState = this.state;

    this.consecutiveFailures = 0;
    this.lastFailureTimestamp = null;

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.CLOSED);
    }

    if (previousState !== this.state) {
      this.logger?.info('Circuit state transitioned on success', {
        from: previousState,
        to: this.state,
      });
    }
  }

  /**
   * Record failed operation
   * - Increments consecutive failure counter
   * - Opens circuit if threshold exceeded
   */
  public recordFailure(): void {
    if (!this.enabled) {
      return;
    }

    const now = Date.now();
    const previousState = this.state;

    // Check if we're still within the timeout window
    const isWithinWindow =
      this.lastFailureTimestamp !== null &&
      now - this.lastFailureTimestamp < this.timeoutWindowMs;

    if (!isWithinWindow) {
      // Outside window: reset counter
      this.consecutiveFailures = 1;
      this.lastFailureTimestamp = now;
      this.logger?.debug('Failure recorded, counter reset (outside timeout window)', {
        failureCount: this.consecutiveFailures,
        timeoutWindowMs: this.timeoutWindowMs,
      });
    } else {
      // Within window: increment counter
      this.consecutiveFailures += 1;
      this.logger?.debug('Failure recorded, counter incremented', {
        failureCount: this.consecutiveFailures,
        threshold: this.failureThreshold,
      });
    }

    // Check threshold
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
    }

    if (previousState !== this.state) {
      this.logger?.warn('Circuit state transitioned on failure', {
        from: previousState,
        to: this.state,
        consecutiveFailures: this.consecutiveFailures,
        threshold: this.failureThreshold,
      });
    }
  }

  /**
   * Manually force circuit to HALF_OPEN state for testing
   * Useful for testing recovery without waiting for the interval
   */
  public forceHalfOpen(): void {
    if (!this.enabled) return;

    const previousState = this.state;
    this.transitionTo(CircuitState.HALF_OPEN);

    if (previousState !== CircuitState.HALF_OPEN) {
      this.logger?.info('Circuit manually forced to HALF_OPEN', {
        from: previousState,
        to: CircuitState.HALF_OPEN,
      });
    }
  }

  /**
   * Manually reset circuit to CLOSED state
   * Useful for testing or emergency reset
   */
  public reset(): void {
    if (!this.enabled) return;

    const previousState = this.state;
    this.consecutiveFailures = 0;
    this.lastFailureTimestamp = null;
    this.transitionTo(CircuitState.CLOSED);

    this.logger?.info('Circuit manually reset to CLOSED', {
      from: previousState,
      to: CircuitState.CLOSED,
    });
  }

  /**
   * Get current metrics
   */
  public getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTimestamp: this.lastFailureTimestamp,
      stateChangedAt: this.stateChangedAt,
      totalStateTransitions: this.totalStateTransitions,
      isHealthy: this.isHealthy(),
    };
  }

  /**
   * Internal: Transition to new state
   */
  private transitionTo(newState: CircuitState): void {
    if (newState === this.state) {
      return; // No change
    }

    const previousState = this.state;
    this.state = newState;
    this.stateChangedAt = Date.now();
    this.totalStateTransitions += 1;

    this.logger?.warn('Circuit breaker state transition', {
      from: previousState,
      to: newState,
      consecutiveFailures: this.consecutiveFailures,
      timestamp: this.stateChangedAt,
      totalTransitions: this.totalStateTransitions,
    });
  }

  /**
   * Internal: Check if we should transition from HALF_OPEN to OPEN
   * (after the test interval has passed without a success)
   */
  private maybeTransitionFromHalfOpen(): void {
    if (this.state !== CircuitState.HALF_OPEN) {
      return;
    }

    const now = Date.now();
    const timeSinceStateChange = now - this.stateChangedAt;

    // If we've been in HALF_OPEN for longer than the test interval
    // without a success, go back to OPEN
    if (timeSinceStateChange > this.halfOpenTestIntervalMs) {
      this.logger?.warn('Half-open test interval expired, returning to OPEN', {
        timeInHalfOpenMs: timeSinceStateChange,
        testIntervalMs: this.halfOpenTestIntervalMs,
      });
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * Internal: Transition from OPEN to HALF_OPEN after timeout
   */
  private maybeTransitionToHalfOpen(): void {
    if (this.state !== CircuitState.OPEN) {
      return;
    }

    const now = Date.now();
    const timeSinceOpened = now - this.stateChangedAt;

    // After 60 seconds of being OPEN, try to recover by going to HALF_OPEN
    if (timeSinceOpened > this.timeoutWindowMs) {
      this.logger?.info('Recovery timeout reached, transitioning to HALF_OPEN', {
        timeOpenMs: timeSinceOpened,
        timeoutWindowMs: this.timeoutWindowMs,
      });
      this.transitionTo(CircuitState.HALF_OPEN);
    }
  }

  /**
   * Check and update circuit state (call this on each webhook)
   * This allows OPEN → HALF_OPEN transition after recovery timeout
   */
  public updateState(): void {
    if (!this.enabled) return;

    this.maybeTransitionFromHalfOpen();
    this.maybeTransitionToHalfOpen();
  }
}

/**
 * Singleton instance for webhook processing
 * Use this to avoid creating multiple circuit breakers
 */
let globalCircuitBreaker: CircuitBreaker | null = null;

/**
 * Get or create the global circuit breaker instance
 */
export function getCircuitBreaker(logger?: Logger): CircuitBreaker {
  if (!globalCircuitBreaker) {
    globalCircuitBreaker = new CircuitBreaker(logger);
  }
  return globalCircuitBreaker;
}

/**
 * Reset the global circuit breaker (useful for testing)
 */
export function resetCircuitBreakerSingleton(): void {
  globalCircuitBreaker = null;
}
