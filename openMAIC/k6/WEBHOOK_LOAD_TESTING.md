# Webhook Load Testing Guide — DailyAgile Platform

Complete guide for load testing the Stripe webhook endpoint (`/api/quiz/stripe/webhook`) using k6.

## Overview

The webhook load test measures performance of the Stripe webhook processor under realistic conditions, validating:
- ✅ Throughput: 1000+ req/min
- ✅ Latency: P95 < 500ms at baseline
- ✅ Error rate: < 0.1% at baseline
- ✅ Idempotency: Replay protection working
- ✅ Rate limiting: Enforced correctly
- ✅ Memory stability: No leaks under sustained load

## Test File Location

```
openMAIC/k6/webhook-load-test.ts
```

## Quick Start

### 1. Install k6 (if needed)

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Verify installation
k6 version
```

### 2. Run Baseline Test

```bash
# Terminal 1: Start the application
cd openMAIC && npm run dev

# Terminal 2: Run baseline test (100 req/min for 5 min)
BASE_URL=http://localhost:3002 k6 run k6/webhook-load-test.ts \
  --out csv=k6/webhook-results-baseline.csv
```

**Expected output:**
```
     data_received..................: 250 kB  50 kB/s
     data_sent.......................: 450 kB  90 kB/s
     http_req_duration...............: avg=245.2ms min=45.1ms max=890.2ms p(95)=420.1ms p(99)=650.2ms ✓
     http_req_failed.................: 0.00% ✓
     webhook_error_rate..............: 0.00% ✓
     webhook_latency.................: avg=245.2ms min=45.1ms max=890.2ms p(95)=420.1ms p(99)=650.2ms
     webhook_success.................: 600 ✓
```

### 3. Run Spike Test

```bash
# Test graceful degradation under peak load
BASE_URL=http://localhost:3002 k6 run k6/webhook-load-test.ts \
  --env SCENARIO=spike \
  --out csv=k6/webhook-results-spike.csv
```

### 4. Run Sustained Test

```bash
# Test for memory leaks and performance degradation
BASE_URL=http://localhost:3002 k6 run k6/webhook-load-test.ts \
  --env SCENARIO=sustained \
  --out csv=k6/webhook-results-sustained.csv
```

## Load Test Scenarios

### Scenario 1: Baseline (100 req/min for 5 minutes)

**What it tests:** Normal production load with steady-state performance

**Configuration:**
- Request rate: 2 req/s (120 req/min)
- Duration: 5 minutes (300 seconds)
- Virtual users: 5 (ramping)

**Acceptance Criteria:**
- ✅ P50 latency < 200ms
- ✅ P95 latency < 500ms
- ✅ P99 latency < 800ms
- ✅ Error rate < 0.1%
- ✅ Success rate = 100%

**Run:**
```bash
BASE_URL=http://localhost:3002 k6 run k6/webhook-load-test.ts
```

### Scenario 2: Spike (1000 req/min for 2 minutes)

**What it tests:** Peak load handling and graceful degradation

**Configuration:**
- Request rate: 17 req/s (1020 req/min)
- Duration: 2 minutes (120 seconds)
- Virtual users: 20 (ramping)

**Acceptance Criteria:**
- ⚠️ P95 latency < 2s (relaxed)
- ⚠️ P99 latency < 5s (relaxed)
- ⚠️ Error rate < 5% (acceptable under spike)
- ⚠️ No cascading failures (no 503s)

**Run:**
```bash
BASE_URL=http://localhost:3002 k6 run k6/webhook-load-test.ts \
  --env SCENARIO=spike
```

### Scenario 3: Sustained (500 req/min for 10 minutes)

**What it tests:** Long-running performance and memory stability

**Configuration:**
- Request rate: 8 req/s (480 req/min)
- Duration: 10 minutes (600 seconds)
- Virtual users: 10 (ramping)

**Acceptance Criteria:**
- ✅ P95 latency < 500ms (consistent)
- ✅ P99 latency < 1s (watch for degradation)
- ✅ Error rate < 1%
- ✅ No memory leaks

**Run:**
```bash
BASE_URL=http://localhost:3002 k6 run k6/webhook-load-test.ts \
  --env SCENARIO=sustained
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3002` | API base URL |
| `SCENARIO` | `baseline` | Load scenario: `baseline`, `spike`, or `sustained` |
| `STRIPE_WEBHOOK_SECRET` | Generated | Stripe webhook secret for signature generation |

## CSV Output & Analysis

Each run generates a CSV file with detailed metrics:

```bash
# Run with CSV export
BASE_URL=http://localhost:3002 k6 run k6/webhook-load-test.ts \
  --out csv=k6/webhook-results-baseline.csv

# View results
head -20 k6/webhook-results-baseline.csv

# Column: metric_name, timestamp, value, tags
# Example rows:
# http_req_duration,1692806400000,245,{scenario:baseline}
# webhook_latency,1692806401000,312,{scenario:baseline}
# webhook_success,1692806402000,1,
```

### Analyzing CSV Results

```bash
# Parse CSV for key metrics (requires awk or Python)
awk -F, '$1=="webhook_latency" {latencies[NR]=$3} END {
  for (i in latencies) sum+=latencies[i];
  print "Avg latency: " sum/length(latencies) "ms"
}' k6/webhook-results-baseline.csv

# Or use Python for more detailed analysis
python3 k6/analyze-webhook-results.py k6/webhook-results-baseline.csv
```

## Running All Scenarios Sequentially

```bash
#!/bin/bash
# run-webhook-tests.sh

echo "🔴 Starting Baseline Test..."
BASE_URL=http://localhost:3002 k6 run k6/webhook-load-test.ts \
  --out csv=k6/webhook-results-baseline.csv
sleep 10

echo "🟠 Starting Spike Test..."
BASE_URL=http://localhost:3002 k6 run k6/webhook-load-test.ts \
  --env SCENARIO=spike \
  --out csv=k6/webhook-results-spike.csv
sleep 10

echo "🟡 Starting Sustained Test..."
BASE_URL=http://localhost:3002 k6 run k6/webhook-load-test.ts \
  --env SCENARIO=sustained \
  --out csv=k6/webhook-results-sustained.csv

echo "✅ All webhook tests complete!"
echo "Results:"
echo "  - Baseline:  webhook-results-baseline.csv"
echo "  - Spike:     webhook-results-spike.csv"
echo "  - Sustained: webhook-results-sustained.csv"
```

Save as `run-webhook-tests.sh` and run:

```bash
chmod +x run-webhook-tests.sh
./run-webhook-tests.sh
```

## Webhook Payload Structure

The test generates realistic Stripe `checkout.session.completed` webhook events with:

```json
{
  "id": "evt_test_...",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_...",
      "amount_total": 4999,        // £49.99 in pence
      "currency": "gbp",
      "customer_email": "student@example.com",
      "metadata": {
        "course_id": "track-a-module-1",
        "email": "student@example.com",
        "product_type": "quiz"
      }
    }
  }
}
```

### Course IDs Used

- `track-a-module-1` — Track A Module 1
- `track-a-module-2` — Track A Module 2
- `track-a-full-course` — Track A Full Course
- `track-b-ai-engineer` — Track B AI Engineer
- `track-b-devops` — Track B DevOps

### Test Amounts

- £49.99 (4999¢) — Single module
- £99.99 (9999¢) — Premium module
- £199.99 (19999¢) — Full Track A
- £399.99 (39999¢) — Track B Engineer
- £599.99 (59999¢) — Track B Engineer + DevOps

## Signature Verification

The test generates valid HMAC-SHA256 Stripe webhook signatures using:

```
Signature = HMAC-SHA256(timestamp.payload, webhook_secret)
Format: t=<timestamp>,v1=<signature>
```

The webhook endpoint validates these signatures server-side, so:
- ✅ Valid signatures always accepted
- ✅ Invalid signatures rejected (401)
- ✅ Replay attacks detected (idempotent check)

## Metrics Explained

### Custom Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `webhook_latency` | Trend | End-to-end webhook processing time (ms) |
| `webhook_success` | Counter | Successful webhook processing (status 200) |
| `webhook_errors` | Counter | Failed webhook processing (status ≠ 200) |
| `webhook_error_rate` | Rate | Percentage of failed webhooks |
| `webhook_throughput` | Gauge | Cumulative requests sent |
| `idempotency_hits` | Counter | Replays detected (idempotent handling) |
| `rate_limit_hits` | Counter | 429 rate limit responses |
| `validation_errors` | Counter | Invalid metadata (400 responses) |

### Standard HTTP Metrics (from k6)

| Metric | Description |
|--------|-------------|
| `http_req_duration` | Total request duration (ms) |
| `http_req_failed` | Failed requests (status ≥ 400) |
| `http_req_blocked` | Time spent blocked (DNS, TCP) |
| `http_req_connecting` | TCP connection time |
| `http_req_sending` | Time spent sending request |
| `http_req_receiving` | Time spent receiving response |
| `http_req_waiting` | Time server spent processing |

## Performance Targets

Based on initial baseline and production SLAs:

### Baseline Load (100 req/min)
| Metric | Target | Alert Level |
|--------|--------|-------------|
| P50 latency | < 200ms | > 250ms |
| P95 latency | < 500ms | > 600ms |
| P99 latency | < 800ms | > 1000ms |
| Error rate | 0% | > 0.1% |
| Throughput | 120 req/min | < 100 req/min |

### Peak Load (1000 req/min — Spike)
| Metric | Target | Alert Level |
|--------|--------|-------------|
| P95 latency | < 2s | > 3s |
| P99 latency | < 5s | > 7s |
| Error rate | < 5% | > 10% |
| No 503s | ✅ Required | ❌ Fail if hit |

### Sustained Load (500 req/min — 10 min)
| Metric | Target | Alert Level |
|--------|--------|-------------|
| P95 latency | < 500ms | > 600ms (watch for creep) |
| P99 latency | < 1s | > 1.2s (watch for creep) |
| Error rate | < 1% | > 2% |
| Memory stable | ✅ Required | ❌ Fail if leak detected |

## Troubleshooting

### "Connection refused" Error

```
Connection refused (Connect error)
```

**Cause:** Application not running at BASE_URL

**Fix:**
```bash
# Terminal 1: Start the app
cd openMAIC && npm run dev

# Terminal 2: Run test
BASE_URL=http://localhost:3002 k6 run k6/webhook-load-test.ts
```

### "Invalid webhook signature" (401 errors)

**Cause:** Signature generation or verification mismatch

**Fix:**
1. Verify `STRIPE_WEBHOOK_SECRET` is set correctly
2. Check webhook endpoint is validating signatures properly
3. Ensure both test and endpoint use same secret format

```bash
# Test with generated secret
BASE_URL=http://localhost:3002 k6 run k6/webhook-load-test.ts
```

### "Validation errors" (400 responses)

**Cause:** Metadata missing or invalid

**Fix:** Check `generateCheckoutSessionPayload()` generates valid metadata:
- `course_id`: Non-empty string
- `email`: Valid email format
- `product_type`: Must be `"quiz"`

### High Memory Usage (k6 process)

**Cause:** Too many virtual users or slow server

**Fix:**
```bash
# Reduce VU count
k6 run --vus 5 k6/webhook-load-test.ts

# Or reduce request rate
BASE_URL=http://localhost:3002 k6 run k6/webhook-load-test.ts \
  --env SCENARIO=baseline  # Uses lower rate
```

### Database Connection Errors

**Cause:** Supabase connection pool exhausted

**Fix:**
1. Check Supabase project status
2. Restart the webhook processor
3. Scale database connections if needed

```bash
# View Supabase project details
supabase status

# Restart the app
cd openMAIC && npm run dev
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Webhook Performance Test

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:

jobs:
  webhook-load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install k6
        run: |
          sudo apt-get update
          sudo apt-get install -y k6
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd openMAIC
          npm ci
      
      - name: Start application (background)
        run: |
          cd openMAIC
          npm run build
          npm run start &
          sleep 10  # Wait for app to start
      
      - name: Run baseline webhook test
        run: |
          BASE_URL=http://localhost:3000 \
          STRIPE_WEBHOOK_SECRET=${{ secrets.STRIPE_WEBHOOK_SECRET }} \
          k6 run openMAIC/k6/webhook-load-test.ts \
            --out csv=webhook-results-baseline.csv
      
      - name: Run spike webhook test
        run: |
          BASE_URL=http://localhost:3000 \
          STRIPE_WEBHOOK_SECRET=${{ secrets.STRIPE_WEBHOOK_SECRET }} \
          k6 run openMAIC/k6/webhook-load-test.ts \
            --env SCENARIO=spike \
            --out csv=webhook-results-spike.csv
      
      - name: Run sustained webhook test
        run: |
          BASE_URL=http://localhost:3000 \
          STRIPE_WEBHOOK_SECRET=${{ secrets.STRIPE_WEBHOOK_SECRET }} \
          k6 run openMAIC/k6/webhook-load-test.ts \
            --env SCENARIO=sustained \
            --out csv=webhook-results-sustained.csv
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: webhook-load-test-results
          path: webhook-results-*.csv
      
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const baseline = fs.readFileSync('webhook-results-baseline.csv', 'utf8');
            // Parse and comment with key metrics
```

### Vercel

Add to `vercel.json`:

```json
{
  "buildCommand": "npm run build && npm run load-test:webhook",
  "functions": {
    "openMAIC/app/api/**/*.ts": {
      "maxDuration": 300
    }
  }
}
```

Or as a scheduled function:

```bash
# Deploy webhook load test as cron job
vercel deploy --prod --env STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
```

## Performance Monitoring

### Real-Time Monitoring (k6 Cloud)

```bash
# Login to k6 Cloud (requires account)
k6 login cloud

# Run test and stream to cloud dashboard
k6 cloud run k6/webhook-load-test.ts
```

### Custom Dashboards

See `k6/webhook-results-*.csv` files for raw metrics. Use Grafana, DataDog, or similar to:
- Track latency trends over time
- Alert on error rate spikes
- Monitor memory usage patterns
- Correlate with deployments

## Best Practices

### ✅ Do

- **Run baseline before spike** — Establish normal performance first
- **Run sustained during off-hours** — Minimize production impact
- **Export to CSV** — Keep historical results for trend analysis
- **Monitor memory** — Watch for leaks over long tests
- **Vary test data** — Use realistic email addresses and course IDs
- **Test idempotency** — Replay detection should work every time
- **Document thresholds** — Keep performance targets in version control

### ❌ Don't

- **Run spike against production** — Only on staging environment
- **Skip signature validation** — Always test with valid signatures
- **Hardcode secrets** — Use environment variables
- **Run tests in parallel** — Sequential execution is more reliable
- **Ignore rate limit errors** — They're expected in spike test
- **Leave tests running unattended** — Monitor for errors

## Advanced Configuration

### Custom Thresholds

Edit `webhook-load-test.ts` thresholds section:

```typescript
thresholds: {
  'webhook_latency': ['p(95)<250'],  // Stricter than default
  'webhook_error_rate': ['rate<0.001'],
}
```

### Custom Payload Generation

Modify `generateCheckoutSessionPayload()` to:
- Use real email addresses
- Test different course IDs
- Vary amounts to test price validation
- Add custom metadata fields

### Load Profile Tuning

Adjust `stages` in scenario definitions:

```typescript
stages: [
  { duration: '2m', target: 5 },   // Longer ramp-up
  { duration: '5m', target: 5 },   // Longer hold
  { duration: '2m', target: 0 },   // Longer ramp-down
]
```

## Related Files

- **Webhook Handler:** `app/api/quiz/stripe/webhook/route.ts`
- **Webhook Processor:** `lib/webhook/stripe-webhook-processor.ts`
- **Security Utils:** `lib/security/webhook-security.ts`
- **Quiz Load Tests:** `k6/scenarios/01-baseline-50-users.js` (reference)
- **Load Test README:** `k6/README.md` (general k6 setup)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review webhook endpoint logs: `app/api/quiz/stripe/webhook/route.ts`
3. Verify Supabase connection: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
4. Check Stripe webhook secret: `STRIPE_WEBHOOK_SECRET` (not empty)

## Acceptance Checklist

Before deploying webhook changes:

- [ ] Baseline test passes (P95 < 500ms, 0% errors)
- [ ] Spike test completes (P95 < 2s, < 5% errors)
- [ ] Sustained test completes (P95 < 500ms, < 1% errors)
- [ ] No memory leaks detected in sustained test
- [ ] Idempotency hits > 0 (replay protection working)
- [ ] Rate limits enforced (rate_limit_hits > 0 or expected)
- [ ] CSV results exported and reviewed
- [ ] All thresholds passed (✓ in k6 output)

---

**Last Updated:** 2026-08-23  
**Version:** 1.0  
**Platform:** DailyAgile  
**Tested Endpoint:** `/api/quiz/stripe/webhook`
