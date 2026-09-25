# Monitoring & Observability Setup

Complete guide to monitoring the DailyAgile platform.

---

## Overview

**Why Monitor?**
- Detect issues before users complain
- Track performance trends
- Quickly diagnose problems during outages
- Make data-driven optimization decisions

**What We Monitor:**
- Application errors (Sentry)
- Performance metrics (Vercel Analytics)
- Uptime (Uptime Robot or Sentry)
- Database health (Supabase dashboard)
- User experience (Sentry Session Replay)

---

## Sentry Error Tracking Setup

### Step 1: Create Organization & Project

1. **Sign up**: https://sentry.io/signup/
2. **Create organization**: DailyAgile
3. **Create project**: OpenMAIC (platform)
4. **Platform**: Select "Next.js"
5. **Copy DSN**: You'll get something like `https://abc123@def456.ingest.sentry.io/789`

### Step 2: Add Sentry to Project

Already configured in `next.config.ts`, but verify:

```bash
# Install dependencies (may already be installed)
pnpm add @sentry/nextjs

# Verify environment variable is set in Vercel
NEXT_PUBLIC_SENTRY_DSN=https://...
```

### Step 3: Test It Works

```bash
# Trigger a test error
curl https://dailyagile.com/api/test-error

# Or manually in code:
// app/api/test-error/route.ts
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  throw new Error("Test error for Sentry");
}

// Check Sentry dashboard - error should appear within 10 seconds
```

### Step 4: Configure Alerts

1. **Go to**: https://sentry.io/organizations/dailyagile/alerts/rules/
2. **Create New Alert** → "New Alert Rule"
3. **Configure**:
   ```
   When: An event is first seen
   If: Environment is production
   Then: Send a Slack message
   ```

4. **Create Second Alert**:
   ```
   When: An issue gets 10 events in 5 minutes
   If: Environment is production
   Then: Send a Slack message + Email
   ```

5. **Connect Slack**:
   - Settings → Integrations → Slack
   - Authorize Sentry to your Slack workspace
   - Add to #prod-alerts channel

### Step 5: Configure Session Replay (Optional)

Session replay records user interactions to help debug issues.

1. **Sentry Dashboard** → Settings → Session Replay
2. **Enable**: Toggle "On"
3. **Sample Rate**: Set to 10% for production (to avoid high costs)
   ```javascript
   // In next.config.ts
   tracesSampleRate: 0.1,
   replaysSessionSampleRate: 0.1,
   ```

### Monitoring Sentry

**Daily checklist:**

```bash
# 1. Check error count
# Open: https://sentry.io/organizations/dailyagile/issues/

# 2. Look for:
#    - New error types (not seen before)
#    - Error spikes (sudden increase in count)
#    - Unresolved critical issues

# 3. For each error:
#    - Read the stack trace
#    - Check which commit introduced it
#    - Assign to team member
#    - Set priority
```

---

## Vercel Analytics & Monitoring

### Monitor Deployments

1. **Go to**: https://vercel.com/dashboard/project/dailyagile-platform/deployments
2. **Check each deployment**:
   - [ ] Build time (should be < 5 min)
   - [ ] Deployment status (should be "Ready")
   - [ ] Errors in build output (should be 0)

### Monitor Performance

1. **Go to**: https://vercel.com/dashboard/project/dailyagile-platform/analytics
2. **Check metrics**:
   - [ ] Response time (p95 < 500ms)
   - [ ] Status codes (>99% success rate)
   - [ ] Edge function performance
   - [ ] Bandwidth usage

### View Real-time Logs

```bash
# Tail production logs (real-time)
vercel logs dailyagile-platform --follow

# View last hour of logs
vercel logs dailyagile-platform --since 1h

# Filter logs by status code
vercel logs dailyagile-platform | grep "500"
```

### Set Up Email Alerts (Vercel)

1. **Go to**: https://vercel.com/dashboard/settings/notifications
2. **Enable**: Deployment errors, function errors, team notifications

---

## Database Health Monitoring

### Supabase Dashboard

**Weekly checks:**

1. **Go to**: https://supabase.co/dashboard/projects
2. **Select project**: reconnection (production)
3. **Check Status**:
   - [ ] No active alerts (red flag icon)
   - [ ] Disk usage < 80%
   - [ ] Database uptime > 99.9%

4. **Database → Inspector**:
   - [ ] Table row counts reasonable
   - [ ] No bloated tables
   - [ ] Recent data changes look normal

### Query Performance

```bash
# Check slow queries
# Supabase Dashboard → SQL Editor → Run:

SELECT
  query,
  calls,
  mean_time,
  stddev_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY mean_time DESC
LIMIT 10;

# Any queries with mean_time > 1000ms are slow
# Consider adding indexes or optimizing
```

### Backup Status

```bash
# Supabase Dashboard → Database → Backups
# Verify:
# - Daily backup exists
# - Backup is recent (< 24 hours)
# - Backup can be restored (test restore to staging)
```

---

## Uptime Monitoring

### Uptime Robot (Free Tier)

1. **Sign up**: https://uptimerobot.com/signup
2. **Add Monitor**:
   - Type: HTTP(s)
   - URL: https://dailyagile.com/api/health
   - Interval: Every 5 minutes
3. **Alert**:
   - Down for: 5 minutes → Alert
   - Notification: Email + Slack

### Sentry Uptime (Alternative)

Sentry can also monitor uptime:

1. **Sentry Dashboard** → Crons & Monitors
2. **Add Uptime Monitor**:
   - URL: https://dailyagile.com
   - Interval: 5 minutes
   - Expected status: 200

---

## Creating Dashboards

### Sentry Dashboard

1. Go to: https://sentry.io/organizations/dailyagile/dashboards/
2. Create new dashboard: "Production Health"
3. Add widgets:
   - Recent errors (widget: Issues)
   - Error rate over time (widget: Line chart)
   - Most impacted users (widget: Table)
   - Transactions (widget: Transactions)

### Vercel Dashboard

Already available at: https://vercel.com/dashboard/project/dailyagile-platform/analytics

Widgets to enable:
- Response time (p50, p95, p99)
- Status codes (2xx, 4xx, 5xx)
- Edge function time
- Bandwidth

### Custom Monitoring Stack (Optional)

If you want more detailed monitoring:

1. **Prometheus** (metrics collection) - self-hosted
2. **Grafana** (visualization) - self-hosted or hosted
3. **Alertmanager** (alerts) - self-hosted

```yaml
# Example Prometheus config (prometheus.yml)
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'vercel'
    static_configs:
      - targets: ['https://dailyagile.com']
```

---

## Key Metrics to Track

### Application Health

| Metric | Target | How to Check |
|---|---|---|
| Error rate | < 0.1% | Sentry dashboard |
| Response time (p95) | < 500ms | Vercel analytics |
| Uptime | > 99.9% | Uptime Robot |
| Build time | < 5 min | Vercel deployments |

### Business Metrics

| Metric | Target | How to Check |
|---|---|---|
| Students active (daily) | Track growth | Supabase: students table |
| Quiz completion rate | > 80% | Supabase: quiz_attempts table |
| Error impact (% users) | < 5% | Sentry: affected users |
| Page load time | < 2s | Vercel analytics |

### Resource Usage

| Metric | Limit | How to Check |
|---|---|---|
| Database disk | < 80% | Supabase dashboard |
| Vercel bandwidth | Budget dependent | Vercel billing |
| API requests | No limit (auto-scale) | Vercel analytics |
| Function duration | < 60s | Vercel logs |

---

## Alert Configuration Examples

### Sentry Alerts

**Alert 1: Critical Error Spike**
```
When: An event is first seen OR An issue gets 20 events in 5 minutes
Environment: production
Action: Send to Slack #prod-alerts
Action: Send email to team@dailyagile.com
```

**Alert 2: Database Errors**
```
When: An event matches pattern "database" OR "connection"
Action: Send to Slack #prod-alerts (tagged with 🚨)
Action: Create GitHub issue (label: "Critical")
```

**Alert 3: 5xx Errors**
```
When: Status code is 500-599
Environment: production
Action: Send to Slack
```

### Vercel Alerts

**Alert 1: Build Failure**
```
Notification Type: Deployment Failed
Recipients: team@dailyagile.com
```

**Alert 2: High Response Time**
```
Metric: Response Time
Threshold: 1000ms
Action: Email alert
```

---

## On-Call Procedures

### During Normal Hours (9am-6pm)

1. **Check Sentry** every 1 hour
2. **Check Vercel analytics** every 2 hours
3. **Respond to alerts** within 5 minutes

### During Off-Hours (6pm-9am)

1. **Enable Slack notifications** in Sentry
2. **Enable Slack notifications** in Uptime Robot
3. **On-call rotation** — set up weekly rotation
4. **Escalation**: If on-call doesn't respond in 10 min, escalate

### Alert Response Flowchart

```
Alert received
│
├─ Is production affected?
│  ├─ NO → Log issue, investigate later
│  └─ YES → Continue
│
├─ Can you fix it quickly (< 15 min)?
│  ├─ YES → Fix it, test, deploy
│  └─ NO → Rollback
│
├─ Did rollback work?
│  ├─ YES → Alert resolves, then fix issue properly
│  └─ NO → Escalate to on-call lead
│
└─ Post-mortem: Document what happened
```

---

## Troubleshooting

### Sentry Not Receiving Errors

```bash
# 1. Verify DSN is correct in Vercel
vercel env pull
grep SENTRY_DSN .env.local

# 2. Check if Sentry SDK is initialized
# next.config.ts should have:
const withSentryConfig = require("@sentry/nextjs/build/cjs/config").withSentryConfig;

# 3. Test manually
curl https://dailyagile.com/api/test-error

# 4. If still not working:
# - Check browser console for JavaScript errors
# - Check Sentry organization for integration status
```

### Vercel Analytics Missing

```bash
# 1. Verify Web Analytics is enabled
# Vercel Dashboard → Settings → Web Analytics → Toggle ON

# 2. Wait 5-10 minutes for data to populate

# 3. If still missing:
# - Check deployment is in production environment
# - Check domain points to Vercel
```

### Too Many False Alerts

**Reduce noise:**

1. Increase threshold (e.g., 10 errors in 5 min instead of 1)
2. Mute known non-critical errors:
   - Sentry: Settings → Ignored Issues
3. Use proper log levels (debug vs. error)
4. Filter out bot traffic (e.g., Googlebot)

---

## Weekly Review Checklist

Every Monday morning:

- [ ] **Sentry Issues**: Any new critical errors?
  - [ ] Read stack trace
  - [ ] Identify root cause
  - [ ] Assign to team
  - [ ] Set deadline to fix

- [ ] **Vercel Analytics**: Performance trends
  - [ ] Response time trend (up or down?)
  - [ ] Error rate trend
  - [ ] Bandwidth usage
  - [ ] Build time trend

- [ ] **Database Health**: Supabase status
  - [ ] Disk usage trend
  - [ ] Query performance
  - [ ] Backup status

- [ ] **Uptime**: Any downtime?
  - [ ] Check Uptime Robot
  - [ ] Any false positives?

- [ ] **Alert Fatigue**: Too many alerts?
  - [ ] Adjust thresholds
  - [ ] Mute non-critical issues
  - [ ] Add more specific rules

---

## Monthly Review Checklist

First day of every month:

- [ ] **Sentry Cleanup**:
  - [ ] Archive resolved issues
  - [ ] Review error trends
  - [ ] Update alert rules if needed

- [ ] **Vercel Usage**:
  - [ ] Review bandwidth costs
  - [ ] Check for optimization opportunities
  - [ ] Update function timeouts if needed

- [ ] **Database Optimization**:
  - [ ] Run ANALYZE on large tables
  - [ ] Review slow query log
  - [ ] Consider adding indexes
  - [ ] Clean up old data if needed

- [ ] **Capacity Planning**:
  - [ ] Project growth trends
  - [ ] Estimate bandwidth for next quarter
  - [ ] Estimate database size
  - [ ] Plan any infrastructure upgrades

---

## Tools & Links

| Service | URL | Purpose |
|---|---|---|
| Sentry | https://sentry.io/organizations/dailyagile/ | Error tracking |
| Vercel | https://vercel.com/dashboard/project/dailyagile-platform | Deployments & analytics |
| Supabase | https://supabase.co/dashboard/projects | Database monitoring |
| Uptime Robot | https://uptimerobot.com/ | Uptime monitoring |
| GitHub Issues | https://github.com/DailyAgile/dailyagile-platform/issues | Bug tracking |
| Slack | #prod-alerts channel | Alert notifications |

---

**Last Updated:** August 2026
**Next Review:** Before production launch
