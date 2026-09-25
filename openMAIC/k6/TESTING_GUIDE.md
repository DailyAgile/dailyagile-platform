# K6 Load Testing — Complete Guide

**Platform:** DailyAgile  
**Created:** 2026-08-16  
**Framework:** K6 v2.2.0  

---

## Overview

This directory contains a comprehensive load testing framework for the DailyAgile Quiz platform. It establishes baseline performance metrics and identifies scaling limits through four progressive test scenarios.

## Quick Start

### Option 1: Use Mock Server (No App Required)

```bash
# Terminal 1: Start mock server
cd openMAIC/k6
node mock-server.js

# Terminal 2: Run baseline test
BASE_URL=http://localhost:3000 k6 run scenarios/01-baseline-50-users.js
```

### Option 2: Use Real App (Production-like)

```bash
# Terminal 1: Start app
cd openMAIC
pnpm dev

# Terminal 2: Run baseline test (waits for app on :3002)
cd k6
BASE_URL=http://localhost:3002 k6 run scenarios/01-baseline-50-users.js
```

### Option 3: Run All Tests Sequentially

```bash
cd openMAIC/k6
./run-all-tests.sh
```

---

## Test Scenarios

### 1️⃣ Baseline (50 VUs, 5 min)
**File:** `scenarios/01-baseline-50-users.js`

Tests normal load under standard conditions.

```bash
k6 run scenarios/01-baseline-50-users.js
```

**Acceptance Criteria:**
- ✓ p99 latency < 500ms
- ✓ Error rate 0%

**What's Being Tested:**
- Quiz answer submission (`POST /api/student/quiz/submit-answer`)
- Answer grading with Claude (`POST /api/quiz-grade`)

---

### 2️⃣ Stress (100 VUs, 5 min)
**File:** `scenarios/02-stress-100-users.js`

Tests performance degradation at 2x baseline load.

```bash
k6 run scenarios/02-stress-100-users.js
```

**Acceptance Criteria:**
- ✓ p99 latency < 2s
- ✓ Error rate < 1%

---

### 3️⃣ Spike (500 VUs, 2 min)
**File:** `scenarios/03-spike-500-users.js`

Tests graceful degradation at 10x baseline load.

```bash
k6 run scenarios/03-spike-500-users.js
```

**Acceptance Criteria:**
- ✓ No 503 Service Unavailable
- ✓ Error rate < 5%
- ✓ Rate limiting enforced

---

### 4️⃣ Sustained Grade Endpoint (50 VUs, 10 min)
**File:** `scenarios/04-sustained-grade-endpoint.js`

Tests rate limiting and sustained API load.

```bash
k6 run scenarios/04-sustained-grade-endpoint.js
```

**Acceptance Criteria:**
- ✓ p99 latency < 1s
- ✓ Rate limiting at 10 req/min per IP
- ✓ 429 responses with Retry-After

---

## Key Files

```
k6/
├── README.md                          # Overview & reference
├── TESTING_GUIDE.md                   # This file
├── load-test-report.md                # Detailed analysis & expected results
├── mock-server.js                     # Standalone test server
├── run-all-tests.sh                   # Runner for all scenarios
│
├── scenarios/
│   ├── 01-baseline-50-users.js        # Normal load (50 VUs, 5m)
│   ├── 02-stress-100-users.js         # Increased load (100 VUs, 5m)
│   ├── 03-spike-500-users.js          # Extreme load (500 VUs, 2m)
│   ├── 04-sustained-grade-endpoint.js # Sustained API (50 VUs, 10m)
│   └── helpers.js                     # Shared utilities
│
└── results/                           # Generated test reports
    ├── baseline-demo.json             # Test summary (JSON)
    └── baseline-demo.csv              # Detailed metrics (CSV)
```

---

## Running Tests

### Single Test with Default Settings

```bash
k6 run scenarios/01-baseline-50-users.js
```

### Test Against Custom URL

```bash
BASE_URL=https://api.dailyagile.com k6 run scenarios/01-baseline-50-users.js
```

### Export Results to CSV

```bash
k6 run scenarios/01-baseline-50-users.js --out csv=results/test.csv
```

### Export JSON Summary

```bash
k6 run scenarios/01-baseline-50-users.js --summary-export=results/summary.json
```

### Combined Export

```bash
k6 run scenarios/01-baseline-50-users.js \
  --out csv=results/test.csv \
  --summary-export=results/summary.json
```

### Run with Different Thresholds

To temporarily change pass/fail criteria:

```bash
k6 run scenarios/01-baseline-50-users.js \
  --threshold 'http_req_duration{staticAsset:yes}<1000' \
  --threshold 'http_req_duration{staticAsset:no}<5000'
```

---

## Understanding Results

### Console Output

During a test run, k6 displays real-time progress:

```
     iteration_duration.............: avg=510ms   min=310ms    max=2.5s     p(90)=620ms  p(95)=740ms  p(99)=1.2s
     http_req_duration...............: avg=245ms   min=51ms     max=1.2s     p(90)=380ms  p(95)=420ms  p(99)=480ms ✓
     http_req_failed.................: 0.00% ✓
     http_reqs........................: 6250       1041.67/s
```

**Key Metrics:**
- **p50:** Median response time (50% of requests faster)
- **p95:** 95th percentile (95% of requests faster)
- **p99:** 99th percentile (99% of requests faster)
- **✓ ✗:** Threshold pass/fail status

### Interpreting Latency

```
p50 = 245ms   ← Half of requests are this fast
p95 = 420ms   ← 95% of requests are this fast
p99 = 480ms   ← 99% of requests are this fast
max = 1.2s    ← Slowest request
```

**Rule of Thumb:**
- p50: Expected typical response time
- p95: Most users experience this or better
- p99: Occasional slow requests (acceptable outliers)
- max: Worst case (investigate if outlier)

### Error Analysis

If you see errors:

```
http_req_failed.................: 2.14% ✗
```

This means 2.14% of requests failed. Common causes:

1. **401/403:** Authentication failure → Check JWT tokens
2. **429:** Rate limit → Expected in spike/sustained tests
3. **500/503:** Server error → Check app logs
4. **Connection timeout:** App too slow → Increase threshold

---

## Mock Server Details

The mock server simulates realistic API behavior:

```javascript
// POST /api/student/quiz/submit-answer
Response time: 20-150ms (database insert)

// POST /api/quiz-grade
Response time: 500-3000ms (Claude API latency)

// Rate Limiting
Max: 10 requests per 60 seconds
Response: 429 Too Many Requests with Retry-After
```

**Why Mock Server?**
- Eliminates dependency on full app deployment
- Provides consistent, repeatable test environment
- Simulates realistic network latencies
- Demonstrates framework without running entire platform

---

## Advanced Usage

### Debugging Failed Tests

```bash
# Run with verbose logging
k6 run -v scenarios/01-baseline-50-users.js

# Stream metrics in real-time
k6 run scenarios/01-baseline-50-users.js -O full
```

### Stress Testing Specific Endpoint

Modify scenario to focus on one endpoint:

```javascript
// In scenario file, comment out everything except one request:
const gradeRes = http.post(`${BASE_URL}/api/quiz-grade`, payload, {
  headers: createAPIHeaders(token, csrfToken),
});
```

### Custom Metrics

Add custom metric to track business-relevant data:

```javascript
// In scenario file
const totalGradesProcessed = new Counter('total_grades_processed');

// In your request handler
totalGradesProcessed.add(1);
```

### Environment-Specific Testing

```bash
# Test staging
BASE_URL=https://staging.dailyagile.com k6 run scenarios/01-baseline-50-users.js

# Test production (CAREFULLY!)
BASE_URL=https://api.dailyagile.com k6 run scenarios/01-baseline-50-users.js

# Test local dev
BASE_URL=http://localhost:3002 k6 run scenarios/01-baseline-50-users.js
```

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Load Test

on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: grafana/setup-k6-action@v1
      
      - name: Run K6 Baseline
        run: k6 run k6/scenarios/01-baseline-50-users.js
        env:
          BASE_URL: https://staging.dailyagile.com
```

---

## Troubleshooting

### Connection Refused
```
Error: Connection refused (Connect error)
```
**Fix:** Ensure app is running at BASE_URL
```bash
# Check if app is responding
curl -I http://localhost:3002

# If not, start it:
cd openMAIC && pnpm dev
```

### High Error Rate
```
http_req_failed: 45.2%
```
**Causes & Fixes:**
- App not running → Start app
- Port wrong → Check BASE_URL env var
- Firewall → Allow traffic on port 3002
- CSRF token expired → Mock server doesn't validate

### Memory Usage Spike
```
Memory usage exceeds 4GB during test
```
**Fix:** Reduce VU count or test duration
```bash
# Edit scenario file, change:
stages: [
  { duration: '30s', target: 10 },  // Reduce from 50 to 10
  { duration: '1m', target: 10 },   // Reduce duration
]
```

### Metrics Look Wrong
```
iteration_duration: avg=50ms (too fast)
```
**Likely Cause:** Mock server is enabled and has low latency  
**Fix:** Make sure you're testing against real app
```bash
# Check which server is running
lsof -i :3000  # Mock server
lsof -i :3002  # Real app
```

---

## Performance Budgets

Once you establish a baseline, set performance budgets:

| Metric | Baseline | Alert Level | Critical |
|--------|----------|-------------|----------|
| p50 latency | 250ms | > 350ms | > 500ms |
| p95 latency | 420ms | > 600ms | > 1000ms |
| p99 latency | 480ms | > 700ms | > 1500ms |
| Error rate | 0% | > 0.5% | > 2% |
| Throughput | 1041/s | < 800/s | < 500/s |

---

## Next Steps

1. **Establish Baseline**
   - Run scenario 1 against production app
   - Note all p50, p95, p99 metrics
   - Set alerts for regressions

2. **Optimize**
   - Identify slowest endpoints
   - Profile code with Node.js inspector
   - Implement caching/pooling improvements

3. **Monitor**
   - Schedule weekly automated tests
   - Track metrics in dashboard (Grafana/DataDog)
   - Alert if thresholds exceeded

4. **Scale**
   - Increase test VUs gradually
   - Identify breaking points
   - Plan infrastructure upgrades

---

## Resources

- **K6 Docs:** https://k6.io/docs/
- **Best Practices:** https://grafana.com/blog/k6/
- **Community:** https://community.grafana.com/c/k6/
- **API Reference:** https://k6.io/docs/javascript-api/

---

## Support

For issues or questions:

1. Check mock server is running: `lsof -i :3000`
2. Verify app is running: `curl http://localhost:3002`
3. Check results: `cat k6/results/baseline-demo.json`
4. Review logs: `grep ERROR k6/scenarios/*.js`

---

**Framework Status:** ✓ Ready for Production  
**Last Updated:** 2026-08-16  
**Maintainer:** DailyAgile Team
