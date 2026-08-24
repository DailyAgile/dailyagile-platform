# Circuit Breaker - Quick Start

## What Does It Do?

When Supabase is down, the circuit breaker prevents Stripe from hammering our API for 48 hours. Instead:

1. After 3 failures in 60 seconds → return **HTTP 503** to Stripe
2. Stripe sees 503 and **backs off exponentially** (1 min, 2 min, 5 min, etc.)
3. We automatically test recovery after 60 seconds
4. When recovered → circuit closes, normal processing resumes

## Key Points

- **HTTP 503 = Stripe backs off** (good for us)
- **HTTP 500 = Stripe retries aggressively** (bad during outage)
- Circuit is **shared singleton** across all webhook handlers
- **Automatic recovery testing** every 60 seconds
- **Feature flag**: `CIRCUIT_BREAKER_ENABLED` (default: true)

## States in Plain English

| State | What's Happening | What We Return |
|-------|-----------------|-----------------|
| **CLOSED** | All good, processing normally | 200 (or 500 on error) |
| **OPEN** | Supabase is down, rest | 503 Service Unavailable |
| **HALF_OPEN** | Testing if Supabase is back | 200 (if test succeeds) or 503 (if test fails) |

## Check Circuit Status

```typescript
import { getCircuitBreaker } from '@/lib/webhook/circuit-breaker';

const breaker = getCircuitBreaker();
const { state, consecutiveFailures, isHealthy } = breaker.getMetrics();

console.log(`Circuit is ${state}`);  // CLOSED, OPEN, or HALF_OPEN
console.log(`Failures: ${consecutiveFailures}`);
console.log(`Healthy: ${isHealthy}`);
```

## Testing Locally

```bash
# Run tests
npm test tests/webhook/circuit-breaker.test.ts

# All 27 tests should pass
```

## Disable for Testing

```bash
# In .env.local
CIRCUIT_BREAKER_ENABLED=false
```

## Monitoring

### Logs to Watch For

```
[WARN] Circuit breaker state transition
  from: CLOSED
  to: OPEN
  consecutiveFailures: 3
```

This means:
- Supabase had 3 failures in 60 seconds
- Circuit is now OPEN
- We're returning 503 to Stripe
- Automatic recovery test will run in 60 seconds

### Health Endpoint (Future)

```typescript
GET /api/health

{
  "circuitBreaker": {
    "state": "CLOSED",
    "consecutiveFailures": 0,
    "isHealthy": true
  }
}
```

## Real-World Example: Supabase Outage

```
15:00:00 - Supabase goes down
15:00:01 - Webhook fails → failures = 1
15:00:03 - Webhook fails → failures = 2
15:00:05 - Webhook fails → failures = 3 → CIRCUIT OPENS
          - Log: "Circuit breaker state transition CLOSED → OPEN"
          - Return 503 to Stripe
15:00:06 - Webhooks return 503 (Stripe backs off)
15:00:58 - Supabase comes back up
15:01:00 - Circuit → HALF_OPEN (automatic)
15:01:01 - Next webhook succeeds → CIRCUIT CLOSES
          - Log: "Circuit breaker state transition HALF_OPEN → CLOSED"
          - Back to normal operation
```

Compare to **without circuit breaker**:
```
15:00 - 15:01 - 3 failures, immediate retries
15:05 - Supabase back
15:05 - 15:53 - 48 hours of Stripe retries hammering the API
        → Could cause cascade failures in other services
```

## Files

- **Implementation**: `lib/webhook/circuit-breaker.ts` (200 lines)
- **Integration**: `lib/webhook/stripe-webhook-processor.ts` (import + usage)
- **Route**: `app/api/quiz/stripe/webhook/route.ts` (passes to processor)
- **Tests**: `tests/webhook/circuit-breaker.test.ts` (27 tests)
- **Guide**: `lib/webhook/CIRCUIT_BREAKER_GUIDE.md` (full reference)

## Questions?

See `CIRCUIT_BREAKER_GUIDE.md` for:
- Detailed failure scenarios
- Performance characteristics
- Future enhancements
- Redis-backed version plan
