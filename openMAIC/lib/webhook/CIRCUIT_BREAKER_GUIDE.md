# Circuit Breaker for Webhook Processing

## Overview

The circuit breaker pattern prevents cascade failures when Supabase (or other critical dependencies) experiences extended downtime. When the dependency is unreachable for more than 60 seconds across 3+ consecutive webhook attempts, the circuit opens and returns HTTP 503 Service Unavailable to Stripe, causing Stripe to exponentially back off instead of retrying every 5 seconds for 48 hours.

## Problem Statement

**Before Circuit Breaker:**
- Supabase goes down for 5 minutes
- Every webhook from Stripe triggers a Supabase connection timeout (5-10 seconds each)
- After Supabase recovers, Stripe immediately retries all queued webhooks (50-100s of backlog)
- System gets hammered with retry spike, potentially causing cascading failures in other services

**With Circuit Breaker:**
- After 3 failures in 60 seconds → circuit opens, return 503
- Stripe sees 503 and backs off exponentially (1 min, 2 min, 5 min, 10 min, etc.)
- We test recovery after 60 seconds; if successful, close circuit
- On recovery, only fresh webhooks arrive, no massive spike

## States

### CLOSED (Normal Operation)
- ✅ Accept and process all webhooks
- Track consecutive failures
- If 3+ failures occur within 60 seconds → transition to OPEN

### OPEN (Dependency Down)
- ❌ Reject new webhook attempts with HTTP 503
- Stripe receives 503 and backs off exponentially
- After 60 seconds, transition to HALF_OPEN for recovery testing

### HALF_OPEN (Testing Recovery)
- ⚠️ Allow next webhook attempt (test request)
- If success → close circuit, resume normal operation
- If failure or timeout (>30 seconds) → reopen circuit, continue waiting

## Configuration

### Environment Variables
```bash
# Enable/disable circuit breaker (default: true)
CIRCUIT_BREAKER_ENABLED=true
```

### Thresholds (hardcoded, configurable via constructor)
```typescript
failureThreshold: 3              // Open after 3 consecutive failures
timeoutWindowMs: 60000           // Failure window (60 seconds)
halfOpenTestIntervalMs: 30000    // Half-open test timeout (30 seconds)
```

## Integration Points

### 1. Webhook Processor (`lib/webhook/stripe-webhook-processor.ts`)

The circuit breaker is integrated into the webhook processor:

```typescript
// Constructor accepts optional circuit breaker
constructor(
  supabase: SupabaseClient,
  brevoApiKey: string | undefined,
  logger?: Logger,
  circuitBreaker?: CircuitBreaker  // Optional injection
)

// Process method checks circuit health before processing
async process(event: Stripe.Event): Promise<WebhookProcessingResult> {
  // Check circuit breaker (early exit if dependency is down)
  this.circuitBreaker.updateState();
  if (!this.circuitBreaker.isHealthy()) {
    return {
      httpStatus: 503,  // Service Unavailable
      message: 'Service temporarily unavailable (dependency recovery in progress)',
    };
  }
  
  // Process webhook...
  
  // Record success
  this.circuitBreaker.recordSuccess();
  
  // Or record failure if transient error
  if (classification.shouldRetry) {
    this.circuitBreaker.recordFailure();
  }
}
```

### 2. Webhook Route (`app/api/quiz/stripe/webhook/route.ts`)

The route creates and passes the circuit breaker to the processor:

```typescript
import { getCircuitBreaker } from '../../../../../lib/webhook/circuit-breaker';

// In POST handler:
const circuitBreaker = getCircuitBreaker(structuredLogger);
const processor = new StripeWebhookProcessor(
  supabase,
  brevoApiKey,
  logger,
  circuitBreaker  // Pass the circuit breaker
);
```

## Usage Pattern

### Single Circuit Breaker Instance (Singleton)

For production, use the global singleton to ensure all webhook handlers share state:

```typescript
import { getCircuitBreaker } from './lib/webhook/circuit-breaker';

// First call creates instance, subsequent calls return same instance
const breaker = getCircuitBreaker(logger);

// Check health before processing
if (!breaker.isHealthy()) {
  return NextResponse.json(
    { error: 'Service temporarily unavailable' },
    { status: 503 }
  );
}

// Process...

// Record result
breaker.recordSuccess();  // or breaker.recordFailure();
```

### Per-Route Instance (Testing)

For testing or isolated scenarios:

```typescript
const breaker = new CircuitBreaker(logger, {
  failureThreshold: 3,
  timeoutWindowMs: 60000,
  halfOpenTestIntervalMs: 30000,
  enabled: true,
});

breaker.recordFailure();
breaker.recordFailure();
breaker.recordFailure();
expect(breaker.isHealthy()).toBe(false);  // Circuit now open
```

## HTTP Status Codes

| Status | Meaning | Stripe Action |
|--------|---------|---------------|
| 200 | Successfully processed | No retry |
| 200 | Permanent error (invalid email, etc.) | No retry |
| 500 | Transient error (DB timeout, network) | Retry with exponential backoff |
| 503 | Service Unavailable (circuit open) | Retry with exponential backoff |

## Monitoring & Metrics

Get current circuit state:

```typescript
const metrics = breaker.getMetrics();

console.log(`State: ${metrics.state}`);  // CLOSED, OPEN, or HALF_OPEN
console.log(`Failures: ${metrics.consecutiveFailures}`);
console.log(`Last failure: ${metrics.lastFailureTimestamp}`);
console.log(`State changed at: ${metrics.stateChangedAt}`);
console.log(`Total transitions: ${metrics.totalStateTransitions}`);
console.log(`Healthy: ${metrics.isHealthy}`);
```

### Logging

All state transitions are logged with context:

```
[WARN] Circuit breaker state transition
  from: CLOSED
  to: OPEN
  consecutiveFailures: 3
  timestamp: 1724144000000
  totalTransitions: 1
```

### Dashboard Integration

Expose metrics via `/api/health` endpoint:

```typescript
import { getCircuitBreaker } from '@/lib/webhook/circuit-breaker';

export async function GET() {
  const breaker = getCircuitBreaker();
  const metrics = breaker.getMetrics();
  
  return NextResponse.json({
    circuitBreaker: metrics,
    webhookHealth: metrics.isHealthy ? 'healthy' : 'degraded',
  });
}
```

## Testing

### Running Tests

```bash
npm test tests/webhook/circuit-breaker.test.ts
```

### Test Coverage (27 tests)

1. **Initial state**: Starts CLOSED, allows operations
2. **Failure tracking**: Counts consecutive failures, opens after threshold
3. **Success handling**: Resets counter, closes from HALF_OPEN
4. **State transitions**: Tracks CLOSED → OPEN → HALF_OPEN → CLOSED
5. **Manual control**: Reset and forceHalfOpen methods
6. **Feature flag**: Can disable circuit breaker via environment
7. **Metrics**: Accurate state, failure counts, timestamps
8. **Half-open recovery**: Tests connection during HALF_OPEN
9. **Automatic transitions**: OPEN → HALF_OPEN after timeout
10. **Singleton pattern**: Global instance management
11. **Logger integration**: Logs state transitions
12. **Edge cases**: Rapid cycles, no failures, multiple resets
13. **Integration scenarios**: Real webhook failure flow

## Failure Scenarios

### Scenario 1: Brief Outage (< 1 minute)

```
T+0s:   Webhook 1 fails → failures = 1
T+2s:   Webhook 2 fails → failures = 2
T+4s:   Webhook 3 fails → failures = 3 → CIRCUIT OPENS
T+5s:   Webhook 4 → rejected with 503 (Stripe backs off)
T+50s:  Supabase recovers
T+60s:  Circuit transitions to HALF_OPEN, next webhook tests recovery
T+61s:  Success → circuit closes, normal operations resume
```

### Scenario 2: Extended Outage (> 5 minutes)

```
T+0s:   Circuit OPENS (3 failures)
T+60s:  Transition to HALF_OPEN
T+61s:  Test webhook fails → back to OPEN
T+120s: Transition to HALF_OPEN again
T+121s: Test webhook succeeds → CLOSED
```

### Scenario 3: Partial Degradation

Supabase is slow (5 second response time):

```
T+0s:   Webhook times out after 5s → failures = 1
T+5s:   Webhook times out after 5s → failures = 2
T+10s:  Webhook times out after 5s → failures = 3 → OPEN
T+15s:  Webhook rejected with 503 immediately (no more waiting)
```

## Disabling Circuit Breaker

For testing or emergency situations:

```bash
# Via environment variable
CIRCUIT_BREAKER_ENABLED=false

# Via constructor
const breaker = new CircuitBreaker(logger, { enabled: false });
```

When disabled:
- All `recordFailure()` and `recordSuccess()` calls are no-ops
- `isHealthy()` always returns true
- No state transitions occur
- Useful for local development or debugging

## Manual Operations

### Force to Half-Open (Testing Recovery)

```typescript
breaker.forceHalfOpen();
// Manually test that next request succeeds
breaker.recordSuccess();
// Circuit closes
```

### Reset Circuit

```typescript
breaker.reset();
// Resets to CLOSED state
// Clears failure counter
```

### Reset Singleton (Testing)

```typescript
import { resetCircuitBreakerSingleton } from '@/lib/webhook/circuit-breaker';

resetCircuitBreakerSingleton();
// Next call to getCircuitBreaker() creates new instance
```

## Performance Characteristics

- **Space**: O(1) - only tracks 5 pieces of state
- **Time**: O(1) for all operations (recordFailure, recordSuccess, isHealthy, getMetrics)
- **Latency impact**: < 1ms per webhook (only timestamp comparisons)
- **Overhead**: Negligible, adds ~100 bytes per breaker instance

## Future Enhancements

1. **Redis-backed circuit breaker**: For distributed systems with multiple instances
   - All instances share circuit state
   - Prevents thundering herd on recovery

2. **Exponential backoff**: Custom retry intervals based on circuit state
   - HALF_OPEN tests every 30s, 60s, 120s, etc.
   - Smoother recovery profile

3. **Multiple circuit breakers**: Per-dependency tracking
   - Supabase circuit breaker
   - Stripe API circuit breaker
   - Brevo email circuit breaker

4. **Circuit metrics dashboard**: Real-time visualization
   - State history
   - Failure rates
   - Recovery success rate

5. **Automatic alerts**: When circuit opens
   - Slack notification to ops team
   - PagerDuty incident creation

## References

- [Circuit Breaker Pattern - Martin Fowler](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Istio Circuit Breakers](https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/)
- [AWS SDK Circuit Breaker](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-configuring-maxretries.html)
- Implementation: `lib/webhook/circuit-breaker.ts`
- Tests: `tests/webhook/circuit-breaker.test.ts`
- Integration: `lib/webhook/stripe-webhook-processor.ts`
