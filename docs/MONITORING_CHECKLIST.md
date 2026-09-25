# DailyAgile Platform — Production Monitoring Checklist

**Version:** 2.0  
**Last Updated:** 2026-08-23  
**Owner:** Platform Operations Team  
**Audience:** On-call engineers, platform monitoring, SRE  

---

## Table of Contents

1. [Key Metrics Dashboard](#key-metrics-dashboard)
2. [Real-Time Monitoring](#real-time-monitoring)
3. [Alert Configuration](#alert-configuration)
4. [Daily Health Checks](#daily-health-checks)
5. [Weekly Reviews](#weekly-reviews)
6. [Monitoring Tools Setup](#monitoring-tools-setup)
7. [Troubleshooting Dashboard Issues](#troubleshooting-dashboard-issues)

---

## Key Metrics Dashboard

### Tier 1: Critical SLI Metrics (Watch Every 5 Minutes During Business Hours)

Create a dashboard in Vercel or Datadog with these metrics:

| Metric | Threshold | Alert | Normal Range | Tool |
|--------|-----------|-------|--------------|------|
| **Webhook Success Rate** | > 99% | Alert if < 95% for 5 min | 99-100% | Supabase SQL |
| **Webhook Latency (p99)** | < 5000ms | Alert if > 10000ms | 100-500ms | Vercel |
| **API Error Rate** | < 1% | Alert if > 5% | 0-0.5% | Vercel |
| **Database Connections** | < 60 | Alert if > 80 | 10-40 | Supabase |
| **Deadletter Queue Size** | 0 | Alert if > 0 | 0 | Supabase SQL |

### Tier 2: Performance Metrics (Check Every Hour)

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| **Webhook Processing Time (avg)** | < 200ms | 200-500ms | > 500ms |
| **Database Query Latency (p95)** | < 100ms | 100-500ms | > 500ms |
| **Vercel Build Time** | < 5 min | 5-10 min | > 10 min |
| **Feature Flag Response Time** | < 10ms | 10-50ms | > 50ms |
| **Email Queue Depth** | 0-10 | 10-100 | > 100 |

### Tier 3: Business Metrics (Check Daily)

| Metric | Healthy | Action Required |
|--------|---------|-----------------|
| **Daily Enrollments** | > 0 | Investigate if 0 |
| **Failed Enrollments** | < 5 | Investigate if > 5 |
| **Customer Support Tickets** | < 3 | Escalate if > 3 |
| **Average Response Time** | < 1s | Optimize if > 1s |
| **Uptime %** | > 99.5% | Investigate any downtime |

---

## Real-Time Monitoring

### SQL Queries for Real-Time Dashboard

**Query 1: Webhook Health (Last 5 Minutes)**

```sql
-- Copy this query into your monitoring tool
-- Refresh every 60 seconds for real-time updates

SELECT
  'WEBHOOK_HEALTH'::text as metric_name,
  DATE_TRUNC('minute', NOW())::timestamp as timestamp,
  COUNT(*) as total_webhooks,
  COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
  ROUND(100.0 * COUNT(CASE WHEN status = 'succeeded' THEN 1 END) / NULLIF(COUNT(*), 0), 2) as success_rate,
  EXTRACT(EPOCH FROM MAX(updated_at) - MIN(updated_at))::int as duration_seconds
FROM public.webhook_processing
WHERE created_at > NOW() - INTERVAL '5 minutes'
GROUP BY DATE_TRUNC('minute', NOW());
```

**Query 2: Error Rate by Classification**

```sql
-- Which errors are happening?
SELECT
  error_classification,
  COUNT(*) as error_count,
  array_agg(DISTINCT last_error) as examples
FROM public.webhook_processing
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY error_classification
ORDER BY error_count DESC;
```

**Query 3: Latency Metrics**

```sql
-- Webhook processing time distribution
SELECT
  'p50' as percentile,
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000
  )::int as latency_ms
FROM public.webhook_processing
WHERE processed_at IS NOT NULL
  AND created_at > NOW() - INTERVAL '1 hour'

UNION ALL

SELECT
  'p95',
  PERCENTILE_CONT(0.95) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000
  )::int
FROM public.webhook_processing
WHERE processed_at IS NOT NULL
  AND created_at > NOW() - INTERVAL '1 hour'

UNION ALL

SELECT
  'p99',
  PERCENTILE_CONT(0.99) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000
  )::int
FROM public.webhook_processing
WHERE processed_at IS NOT NULL
  AND created_at > NOW() - INTERVAL '1 hour'

ORDER BY percentile;
```

**Query 4: Database Connection Usage**

```sql
-- How many connections are we using?
SELECT
  COUNT(*) as total_connections,
  COUNT(CASE WHEN state = 'active' THEN 1 END) as active,
  COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle,
  COUNT(CASE WHEN state = 'idle in transaction' THEN 1 END) as idle_in_transaction,
  (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
  ROUND(100.0 * COUNT(*) / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'), 2) as usage_percent
FROM pg_stat_activity
WHERE datname = current_database();
```

**Query 5: Feature Flag Status**

```sql
-- Are all critical feature flags enabled?
SELECT
  name,
  enabled,
  rollout_percentage,
  CASE
    WHEN enabled = false THEN 'CRITICAL: Disabled'
    WHEN rollout_percentage < 100 THEN 'WARNING: Partial rollout'
    ELSE 'OK'
  END as status
FROM public.feature_flags
WHERE name IN (
  'WEBHOOK_PROCESSING_ENABLED',
  'EMAIL_NOTIFICATIONS_ENABLED',
  'BILLING_PROCESSING_ENABLED',
  'STUDENT_ENROLLMENT_ENABLED'
)
ORDER BY status DESC, name;
```

---

## Alert Configuration

### Vercel Alerts (via Vercel Dashboard)

**Setup Instructions:**

1. Go to https://vercel.com/dashboard/dailyagile/settings/monitoring
2. Configure these alerts:

#### Alert 1: High Error Rate

```
Name: Webhook Error Rate Critical
Metric: Error Rate
Threshold: > 5%
Duration: 5 minutes
Action: Notify #daily-agile-platform, page on-call engineer
```

#### Alert 2: Deployment Failure

```
Name: Deployment Failed
Metric: Build Status
Threshold: Failed
Action: Notify #daily-agile-platform immediately
```

#### Alert 3: High Response Time

```
Name: Webhook Latency Critical
Metric: Response Time (p99)
Threshold: > 10000ms
Duration: 5 minutes
Action: Notify #daily-agile-platform
```

#### Alert 4: Function Cold Start

```
Name: High Function Cold Start Rate
Metric: Cold Start Count
Threshold: > 20% of requests
Duration: 10 minutes
Action: Notify #daily-agile-platform
```

### Supabase Alerts (if available)

**Database Performance Alerts:**

```sql
-- Query to check if creating alerts is possible
SELECT 
  COUNT(*) as table_count,
  SUM(pg_total_relation_size(schemaname||'.'||tablename))::bigint as total_size
FROM pg_tables
WHERE schemaname = 'public';

-- Set up monitoring:
-- 1. Create custom extension for alerting (if supported)
-- 2. Monitor via external tool (e.g., Datadog, New Relic)
-- 3. Set up pg_stat_statements for query analysis
```

### Custom Alert in Application Code

**Add to webhook handler for critical conditions:**

```typescript
// In webhook route handler:
const successRate = (succeeded / total) * 100;

if (successRate < 95) {
  // Send alert to monitoring system
  await alerting.notify({
    severity: 'critical',
    metric: 'webhook_success_rate',
    value: successRate,
    threshold: 95,
    channel: '#daily-agile-platform'
  });
}
```

---

## Daily Health Checks

### Morning Health Check (9:00am PT)

Run this checklist every morning before business hours start:

```bash
#!/bin/bash
# DailyAgile Platform — Morning Health Check
# Run at 9:00am PT daily

echo "=== DailyAgile Platform Health Check ==="
echo "Timestamp: $(date)"
echo ""

# Check 1: Webhook Success Rate (Last 24 hours)
echo "1. Webhook Success Rate (Last 24h):"
supabase sql query "
  SELECT 
    ROUND(100.0 * COUNT(CASE WHEN status='succeeded' THEN 1 END) / COUNT(*), 2) as success_rate
  FROM public.webhook_processing
  WHERE created_at > NOW() - INTERVAL '24 hours';
"

# Check 2: Failed Webhooks (Last 24 hours)
echo ""
echo "2. Failed Webhooks (Last 24h):"
supabase sql query "
  SELECT COUNT(*) as failed_count
  FROM public.webhook_processing
  WHERE status='failed'
    AND created_at > NOW() - INTERVAL '24 hours';
"

# Check 3: Deadletter Queue
echo ""
echo "3. Unreviewed Issues in Deadletter Queue:"
supabase sql query "
  SELECT COUNT(*) as unreviewed
  FROM public.webhook_deadletter
  WHERE status='unreviewed';
"

# Check 4: API Health
echo ""
echo "4. API Endpoint Status:"
curl -s -o /dev/null -w "HTTP %{http_code} (Latency: %{time_total}s)\n" \
  https://dailyagile.vercel.app/api/quiz/stripe/webhook/health

# Check 5: Feature Flags
echo ""
echo "5. Critical Feature Flags Status:"
supabase sql query "
  SELECT name, enabled
  FROM public.feature_flags
  WHERE name IN ('WEBHOOK_PROCESSING_ENABLED', 'BILLING_PROCESSING_ENABLED')
  ORDER BY name;
"

# Check 6: Database Connections
echo ""
echo "6. Active Database Connections:"
supabase sql query "
  SELECT COUNT(*) as active_connections
  FROM pg_stat_activity
  WHERE datname = current_database();
"

# Check 7: Recent Errors
echo ""
echo "7. Errors in Last Hour:"
vercel logs --since 1h | grep -i "error\|failed" | head -10

echo ""
echo "=== Health Check Complete ==="
```

**Save as:** `scripts/daily-health-check.sh`

**Run daily:** `chmod +x scripts/daily-health-check.sh && ./scripts/daily-health-check.sh`

**Post results to:** #daily-agile-platform Slack channel

---

## Weekly Reviews

### Weekly Operations Review (Friday 4pm PT)

**Duration:** 30 minutes  
**Attendees:** On-call engineer, platform lead  
**Frequency:** Every Friday

**Agenda:**

```
1. Incident Review (10 min)
   - How many incidents this week? (target: 0)
   - Were any P1 incidents? (target: 0)
   - Average time to resolution? (target: < 10 min)
   - Query: SELECT COUNT(*), severity FROM incidents_this_week GROUP BY severity;

2. Error Analysis (10 min)
   - Most common webhook errors?
   - Any patterns in failures?
   - Which error classes are most frequent?
   - Query: See "Query 2: Error Rate by Classification" above

3. Performance Review (5 min)
   - Webhook latency trend? (target: < 200ms avg)
   - Database query performance? (target: < 100ms p95)
   - Vercel build times? (target: < 5 min)

4. Capacity Planning (5 min)
   - Growth in daily transactions? (% increase week-over-week)
   - Any resource constraints upcoming? (CPU, memory, connections)
   - Should we scale database? (target: < 70% connection usage)

5. Action Items (Record for next week)
   - Any incidents to investigate further?
   - Any preventive measures to implement?
   - Any documentation updates needed?
```

**Report Template:**

```
📊 Weekly Operations Report — Week of 2026-08-20

Incidents:
- Count: 0 P1, 1 P2, 0 P3 (target: 0)
- Most severe: Database connection timeout (resolved in 15 min)
- Action: Increase max_connections to 200 ✓

Performance:
- Webhook success rate: 99.7% (target: 99%+) ✓
- Webhook latency (p99): 342ms (target: < 5000ms) ✓
- Database connections peak: 72/200 (target: < 80%) ✓

Growth:
- Daily enrollments: ↑ 12% week-over-week
- Failed enrollments: 3 (0.1% failure rate) ✓
- Customer support tickets: 0

Preventive Measures:
- ✅ Added alert on connection pool > 60
- ✅ Scheduled connection pool monitoring review
- ⏳ Database query optimization (in progress)

Health Score: 98/100 🟢
- Only issue: 1 P2 incident resolved quickly
- All critical metrics healthy
- No customer impact

Next Week Focus:
- Implement automatic idle connection cleanup
- Create database performance runbook
- Optimize webhook query using indexes
```

---

## Monitoring Tools Setup

### Option 1: Using Supabase Built-in Monitoring

**Enable Supabase Monitoring:**

1. Go to Supabase Project → Settings → Monitoring
2. Enable these dashboards:
   - Database Performance
   - Query Performance
   - Table Statistics
   - Connection Pool

**Create custom views:**

```sql
-- Create materialized view for monitoring
CREATE MATERIALIZED VIEW public.webhook_metrics_view AS
SELECT
  DATE_TRUNC('minute', created_at)::timestamp as minute,
  COUNT(*) as total,
  COUNT(CASE WHEN status='succeeded' THEN 1 END) as succeeded,
  ROUND(100.0 * COUNT(CASE WHEN status='succeeded' THEN 1 END) / COUNT(*), 2) as success_rate,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at))) as p99_latency_sec
FROM public.webhook_processing
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('minute', created_at);

-- Refresh every 5 minutes
-- Note: Manual refresh required (add to cron job)
```

### Option 2: Using Datadog (Recommended for Scale)

**Setup:**

1. Create Datadog account: https://www.datadoghq.com
2. Connect Vercel integration: Integrations → Vercel
3. Connect Supabase integration: Integrations → PostgreSQL
4. Create custom dashboards:

**Dashboard: Webhook Monitoring**

```
Widgets:
1. Success Rate (Gauge) — Target: 99%+
2. Error Rate (Time Series) — Alert threshold: 5%
3. Latency (p99) — Alert threshold: 10000ms
4. Error Distribution (Pie Chart) — By error_classification
5. Database Connections (Line Chart) — Max: 200
6. Deadletter Queue (Number) — Alert if > 0
```

**Alerts in Datadog:**

```
Alert 1: webhook.success_rate < 95%
  Duration: 5 minutes
  Severity: Critical
  Notify: #daily-agile-platform, @pagerduty-oncall

Alert 2: system.cpu.user > 80%
  Duration: 10 minutes
  Severity: Warning
  Notify: #daily-agile-platform

Alert 3: postgres.connections.active > 150
  Duration: 5 minutes
  Severity: Critical
  Notify: #daily-agile-platform, @pagerduty-oncall
```

### Option 3: Minimal Setup (Using Only Vercel + SQL Queries)

If you don't have budget for Datadog:

1. **Use Vercel Analytics:**
   - https://vercel.com/dashboard/dailyagile/analytics
   - Monitor: Error rate, latency, cache hits

2. **Create SQL monitoring queries:**
   - Save queries in `docs/monitoring-queries.sql`
   - Run manually every hour during business hours
   - Post results to Slack

3. **Set up cron job (if available):**

```sql
-- Run daily health check via Supabase cron (if pg_cron extension enabled)
SELECT cron.schedule('daily_health_check', '0 9 * * *', $$
  SELECT public.webhook_health_check();
$$);
```

---

## Troubleshooting Dashboard Issues

### Issue 1: Metrics Not Updating

**Symptom:** Dashboard shows stale data (> 5 minutes old)

**Causes:**
1. Supabase connection issue
2. Query timeout (too much data)
3. Materialized view not refreshed

**Solution:**

```sql
-- Check if data is being written
SELECT COUNT(*) as recent_webhooks
FROM public.webhook_processing
WHERE created_at > NOW() - INTERVAL '1 minute';

-- Should return > 0 if webhooks are processing

-- If 0: Webhooks are not being processed (see INCIDENT_RESPONSE.md)

-- Refresh materialized view if using one
REFRESH MATERIALIZED VIEW CONCURRENTLY public.webhook_metrics_view;

-- Check Supabase connection
SELECT 1 AS connected;
-- Should return: 1
```

### Issue 2: Alert Not Triggering

**Symptom:** Metric exceeds threshold but no alert sent

**Causes:**
1. Alert configuration has wrong threshold
2. Notification channel not configured
3. Alert suppression rule active

**Solution:**

```bash
# Test alert manually
curl https://api.vercel.com/v1/projects/dailyagile/monitoring \
  -H "Authorization: Bearer $VERCEL_API_TOKEN"

# Check if Slack webhook is valid
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text": "Test alert from monitoring"}' 

# Re-configure alert (see "Alert Configuration" section above)
```

### Issue 3: Dashboard Query Timeout

**Symptom:** "Query timeout" error when viewing dashboard

**Causes:**
1. Query scanning too much data
2. Missing database index
3. Database overloaded

**Solution:**

```sql
-- Add index to speed up queries
CREATE INDEX idx_webhook_processing_created_at_status 
ON public.webhook_processing(created_at DESC, status)
WHERE created_at > NOW() - INTERVAL '7 days';

-- Optimize query to use index
EXPLAIN ANALYZE
SELECT COUNT(*), status
FROM public.webhook_processing
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status;

-- Should use index scan, not sequential scan
```

### Issue 4: Alerts Are Too Noisy

**Symptom:** Too many false positive alerts

**Causes:**
1. Thresholds set too aggressive
2. Alert duration too short
3. Normal spikes in traffic

**Solution:**

```sql
-- Analyze normal traffic patterns
SELECT
  EXTRACT(HOUR FROM created_at) as hour_of_day,
  COUNT(*) as webhook_count,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at))) as p99_latency
FROM public.webhook_processing
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour_of_day;

-- Adjust alert thresholds based on normal patterns
-- E.g., if p99 latency is normally 150ms, set alert to 500ms (not 200ms)
```

---

## Checklist: Monthly Monitoring Review

Run this checklist on the first Friday of each month:

- [ ] **Review all incidents** from past month
  - How many total? (target: < 2)
  - How many P1? (target: 0)
  - Trends: Increasing or decreasing?

- [ ] **Analyze error patterns**
  - What types of errors are most common?
  - Are they getting better or worse?
  - Do we need to change error handling?

- [ ] **Check capacity**
  - Database connections trending up?
  - Query latency trending up?
  - Should we scale soon?

- [ ] **Audit alert thresholds**
  - Are alerts too sensitive? Too lenient?
  - Update any thresholds based on observed traffic

- [ ] **Update documentation**
  - Any new runbook procedures needed?
  - Update troubleshooting guide with new issues found?

- [ ] **Schedule preventive maintenance**
  - Any database optimizations needed?
  - Any code optimizations to reduce latency?
  - Any infrastructure changes to increase reliability?

- [ ] **Team training**
  - Did on-call engineers need help?
  - Should we do runbook review or drill?
  - Update escalation procedures if needed?

---

## Production Monitoring SLA

**Service Level Indicators (SLIs):**

| SLI | Target | Consequence |
|-----|--------|-------------|
| **Uptime** | > 99.9% (43.2 min downtime/month) | Page on-call if exceeded |
| **Webhook Success Rate** | > 99% | Investigate if < 95% |
| **Webhook Latency (p99)** | < 5 seconds | Optimize if > 2 seconds sustained |
| **Database Query Latency (p95)** | < 100ms | Add index if > 500ms |
| **MTTR (Mean Time to Resolution)** | < 15 minutes for P1 | Review incident response |
| **Error Budget** | 2 P1 incidents/quarter | Stop new features if exceeded |

---

## Appendix: Monitoring Query Library

**Save these in:** `docs/monitoring-queries.sql`

All queries above are included in this file for easy copy-paste.

**Usage:**

```bash
# Copy query into Supabase SQL editor
# Or run via CLI:
supabase sql query < docs/monitoring-queries.sql

# Or create a cron job to run queries automatically
# (See "Weekly Reviews" section for example)
```

---

**Document Control**
- Version: 2.0
- Last Updated: 2026-08-23
- Next Review: 2026-09-23
- Owner: Platform Operations Team
- Approval: [SIGN OFF]
