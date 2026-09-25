# K6 Load Testing Suite — DailyAgile Platform

Comprehensive load testing for the Quiz module and API endpoints.

## Quick Start

```bash
# Install k6 (if not already installed)
brew install k6

# Run baseline test (50 users)
k6 run scenarios/01-baseline-50-users.js

# Run all scenarios with default BASE_URL
./run-all-tests.sh

# Run against specific URL
BASE_URL=https://dailyagile.com k6 run scenarios/01-baseline-50-users.js
```

## Test Scenarios

### 1. Baseline (50 Concurrent Users — 5 min)
**File:** `scenarios/01-baseline-50-users.js`

- Sustained load: 50 simultaneous quiz submissions
- Tests both `/api/student/quiz/submit-answer` and `/api/quiz-grade` endpoints
- **Target Metrics:**
  - p99 latency < 500ms
  - Error rate: 0%
- **Expected:** All requests succeed without degradation

### 2. Stress (100 Concurrent Users — 5 min)
**File:** `scenarios/02-stress-100-users.js`

- Increased load: 100 simultaneous submissions
- Ramps up over 1 minute, sustains for 3 minutes
- **Target Metrics:**
  - p95 latency < 1s, p99 latency < 2s
  - Error rate: < 1%
- **Expected:** Noticeable slowdown but acceptable performance

### 3. Spike (500 Concurrent Users — 2 min)
**File:** `scenarios/03-spike-500-users.js`

- Extreme spike to test graceful degradation
- No cascading failures (no 503s from overload)
- **Target Metrics:**
  - p99 latency < 5s
  - Error rate: < 5%
  - No 503 Service Unavailable errors
- **Expected:** System handles spike gracefully; rate limiting kicks in

### 4. Sustained Grade Endpoint (50 VUs — 10 min)
**File:** `scenarios/04-sustained-grade-endpoint.js`

- Hammering just `/api/quiz-grade` endpoint with Claude AI grading
- Tests rate limiting enforcement (10 req/min per IP)
- **Target Metrics:**
  - p99 latency < 1s (Claude adds latency)
  - Rate limiting hits expected after limit exceeded
  - Proper 429 responses with Retry-After headers
- **Expected:** Rate limiting enforced; graceful degradation with 429s

## Running Tests

### Single Test
```bash
k6 run scenarios/01-baseline-50-users.js
```

### With Custom Base URL
```bash
BASE_URL=https://staging.dailyagile.com k6 run scenarios/01-baseline-50-users.js
```

### All Scenarios (Sequential)
```bash
./run-all-tests.sh
```

### All Scenarios (Parallel) — requires k6 Cloud
```bash
k6 cloud run scenarios/01-baseline-50-users.js
k6 cloud run scenarios/02-stress-100-users.js
k6 cloud run scenarios/03-spike-500-users.js
k6 cloud run scenarios/04-sustained-grade-endpoint.js
```

## Output & Analysis

K6 provides real-time metrics during test execution:
- **p50, p95, p99** response times
- **Error rates** and failed requests
- **Throughput** (requests/second)
- **Custom metrics** (submit_answer_duration, quiz_grade_duration, etc.)

### Summary Report
After each test run, k6 displays:
```
     data_received..................: 1.2 MB  12 kB/s
     data_sent.......................: 895 kB 8.9 kB/s
     http_req_blocked................: avg=10.2ms min=1.1ms max=500.2ms p(90)=21.3ms p(95)=31.2ms p(99)=102.1ms
     http_req_connecting.............: avg=5.1ms  min=0s     max=150.2ms p(90)=10.3ms p(95)=15.2ms p(99)=52.1ms
     http_req_duration...............: avg=245.2ms min=51.3ms max=4.2s    p(90)=380.2ms p(95)=420.1ms p(99)=850.2ms ✓
     http_req_failed.................: 0.00% ✓
     http_req_receiving..............: avg=1.2ms  min=0.3ms  max=100.2ms p(90)=2.1ms  p(95)=3.2ms  p(99)=10.2ms
     http_req_sending................: avg=0.8ms  min=0.1ms  max=50.1ms  p(90)=1.2ms  p(95)=1.8ms  p(99)=5.2ms
     http_req_tls_handshaking........: avg=0s     min=0s     max=0s      p(90)=0s     p(95)=0s     p(99)=0s
     http_req_waiting................: avg=243.2ms min=50.1ms max=4.1s    p(90)=378.1ms p(95)=418.2ms p(99)=848.1ms
     http_reqs........................: 12500 124.5/s
     iteration_duration..............: avg=510.3ms min=320.1ms max=5.2s   p(90)=620.2ms p(95)=740.1ms p(99)=1.8s
     iterations........................: 12500 124.5/s
```

### CSV Export
```bash
k6 run scenarios/01-baseline-50-users.js --out csv=results.csv
```

## Acceptance Criteria (Pass/Fail)

### Baseline (50 VUs) — ✅ MUST PASS
- [x] p99 latency < 500ms
- [x] Error rate = 0%
- [x] No cascading failures

### Stress (100 VUs) — ⚠️ ACCEPTABLE
- [x] p99 latency < 2s
- [x] Error rate < 1%

### Spike (500 VUs) — ⚠️ EXPECTED TO DEGRADE
- [x] p99 latency < 5s
- [x] Error rate < 5%
- [x] No 503 Service Unavailable
- [x] Rate limiting enforced (429s acceptable)

### Sustained Grade (50 VUs) — ✅ MUST PASS
- [x] p99 latency < 1s
- [x] Rate limiting at 10 req/min per IP
- [x] 429 responses with Retry-After header

## Endpoints Tested

1. **POST /api/student/quiz/submit-answer**
   - Database insert of student answer
   - Expected: < 200ms response time
   - Auth: JWT token required

2. **POST /api/quiz-grade**
   - Claude AI grading endpoint (expensive)
   - Expected: 1-3s response time
   - Rate limited: 10 req/min per IP
   - Auth: JWT token required

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3002` | API base URL to test against |
| `CSRF_TOKEN` | `test-csrf-token` | CSRF token for requests |

## Troubleshooting

### Connection Refused
```
Connection refused (Connect error)
```
**Solution:** Ensure app is running at BASE_URL
```bash
cd openMAIC && npm run dev
```

### 401 Unauthorized
```
POST /api/student/quiz/submit-answer - 401 Unauthorized
```
**Solution:** Tests use mock JWT tokens. Ensure auth middleware accepts test tokens or disable auth for test environment.

### Rate Limit Errors
```
POST /api/quiz-grade - 429 Rate Limited (expected in spike test)
```
**Solution:** This is expected. The rate limiter is working correctly. Scenario 4 specifically tests this.

### High Memory Usage
If k6 uses too much memory:
```bash
# Reduce VU count or add memory limit
k6 run --max-vus 50 scenarios/01-baseline-50-users.js
```

## Advanced Usage

### Custom Thresholds
Edit threshold values in scenario files to match your SLAs:
```javascript
thresholds: {
  'http_req_duration': ['p(99)<1000'], // Stricter threshold
  'http_req_failed': ['rate<0.001'],   // Near-zero error rate
}
```

### Local Testing Without Auth
For local testing, temporarily disable auth validation in middleware:
```typescript
// In auth-middleware.ts (development only!)
if (process.env.NODE_ENV === 'development' && req.headers.authorization?.includes('test-token')) {
  return { id: 'test-user', role: 'student' };
}
```

### Integration with CI/CD
```yaml
# GitHub Actions example
- name: Run k6 baseline load test
  run: k6 run --fail-on-error scenarios/01-baseline-50-users.js
```

## Monitoring

Real-time metrics are sent to the k6 dashboard during runs:
```bash
# Stream to k6 Cloud (requires account)
k6 login cloud
k6 cloud run scenarios/01-baseline-50-users.js
```

## Performance Budgets

Based on initial baseline, establish performance budgets:

| Metric | Budget | Alert |
|--------|--------|-------|
| p50 latency | < 200ms | > 250ms |
| p95 latency | < 400ms | > 500ms |
| p99 latency | < 500ms | > 750ms |
| Error rate | 0% | > 0.1% |
| Throughput | > 100 req/s | < 80 req/s |

---

**Last Updated:** 2026-08-16  
**Platform:** DailyAgile  
**Tested Endpoints:** Quiz API (v1)
