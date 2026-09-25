# DailyAgile Platform — Incident Response Guide

**Version:** 2.0  
**Last Updated:** 2026-08-23  
**Owner:** Platform Operations Team  
**Audience:** On-call engineers, incident commanders, platform leadership  

---

## Table of Contents

1. [Critical Alerts & Response](#critical-alerts--response)
2. [Severity Levels](#severity-levels)
3. [Incident Command Structure](#incident-command-structure)
4. [On-Call Procedures](#on-call-procedures)
5. [Incident Communication](#incident-communication)
6. [Emergency Kill Switches](#emergency-kill-switches)
7. [Post-Incident Review](#post-incident-review)

---

## Critical Alerts & Response

### Alert 1: Webhook Endpoint Returning 5xx Errors

**Alert Condition:** > 50% of webhook requests return HTTP 500 for > 5 minutes

**Severity:** **CRITICAL** (P1)

**Response Steps:**

```
⏱️  T+0:00 — Alert triggered
1. Acknowledge alert in Slack (@daily-agile-oncall reacts with 👀)
2. Check Vercel logs for error messages
   curl https://dailyagile.vercel.app/api/quiz/stripe/webhook -I
3. Check Supabase connectivity
   supabase status
4. Check feature flags
   SELECT enabled FROM public.feature_flags WHERE name = 'WEBHOOK_PROCESSING_ENABLED';
   
⏱️  T+3:00 — Diagnosis
5. If database down: Wait for Supabase recovery (auto-retried by Stripe)
6. If webhook secret wrong: Update STRIPE_WEBHOOK_SECRET in Vercel
7. If feature flag disabled: Enable it (see "Emergency Kill Switches")
8. If code issue: Redeploy previous version
   vercel rollback

⏱️  T+5:00 — Verification
9. Verify error rate drops to < 1%
10. Send all-clear to #daily-agile-platform Slack channel
```

**Notification Contacts:**
- **Immediate:** Post to #daily-agile-platform (all team)
- **If unresolved T+10:00:** Page platform-lead (tkiran204@gmail.com)

**Expected Resolution Time:** 5-15 minutes

---

### Alert 2: Webhook Processing Success Rate < 90%

**Alert Condition:** Success rate drops below 90% for > 15 minutes

**Severity:** **HIGH** (P2)

**Response Steps:**

```
⏱️  T+0:00 — Alert triggered
1. Acknowledge alert
2. Check recent webhook failures
   SELECT status, COUNT(*) 
   FROM public.webhook_processing 
   WHERE created_at > NOW() - INTERVAL '30 minutes'
   GROUP BY status;

⏱️  T+3:00 — Diagnosis
3. Identify most common error
   SELECT error_classification, COUNT(*) 
   FROM public.webhook_processing 
   WHERE status = 'failed'
   GROUP BY error_classification;

4. Check for specific issues:
   - Rate limit: Check for malicious traffic
   - Invalid metadata: Check Stripe checkout configuration
   - Database timeout: Check Supabase performance

⏱️  T+5:00 — Action
5. For transient errors (DB timeout): Wait for auto-retry
6. For permanent errors: Notify Stripe integration team
7. For rate limits: Adjust thresholds if legitimate
8. Update #daily-agile-platform channel with status
```

**Notification Contacts:**
- **Immediate:** Post to #daily-agile-platform
- **If success rate doesn't recover in 30 min:** Page platform-lead

**Expected Resolution Time:** 15-30 minutes

---

### Alert 3: Webhook Deadletter Queue Growing

**Alert Condition:** > 10 unreviewed items in webhook_deadletter table

**Severity:** **MEDIUM** (P3)

**Response Steps:**

```
⏱️  T+0:00 — Alert triggered
1. Check deadletter queue
   SELECT COUNT(*), status 
   FROM public.webhook_deadletter 
   GROUP BY status;

2. Review specific failures
   SELECT error_summary, COUNT(*) 
   FROM public.webhook_deadletter 
   WHERE status = 'unreviewed'
   GROUP BY error_summary;

⏱️  T+5:00 — Investigation & Action
3. Categorize failures:
   - Policy/config issue: Notify leadership (P3)
   - System issue: Escalate to platform-lead (P2)
   - Transient issue: Mark as resolved and replay (P3)

4. For each unreviewed item:
   UPDATE public.webhook_deadletter
   SET status = 'reviewed', reviewed_at = NOW(), reviewed_by_admin_id = auth.uid()
   WHERE id = 'xxx';

5. Document root causes in action_description
```

**Notification Contacts:**
- Post update to #daily-agile-platform within 1 hour
- No escalation needed if resolved within business hours

**Expected Resolution Time:** 30-60 minutes

---

### Alert 4: Database Connection Pool Exhausted

**Alert Condition:** > 80% of max_connections in use OR new connections failing

**Severity:** **CRITICAL** (P1)

**Response Steps:**

```
⏱️  T+0:00 — Alert triggered
1. Check current connections
   SELECT COUNT(*) as active_connections, max_setting
   FROM pg_stat_activity, 
        (SELECT setting::int as max_setting FROM pg_settings WHERE name = 'max_connections') t;

2. Kill idle connections
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
     AND query_start < NOW() - INTERVAL '5 minutes'
     AND pid <> pg_backend_pid()
   LIMIT 20;

⏱️  T+2:00 — Verify Resolution
3. Confirm connections drop
   SELECT COUNT(*) as active_connections FROM pg_stat_activity;
   Expected: < 50 connections

4. Check if webhooks are processing again
   SELECT status, COUNT(*) 
   FROM public.webhook_processing 
   WHERE created_at > NOW() - INTERVAL '5 minutes'
   GROUP BY status;

⏱️  T+5:00 — Prevention
5. Increase max_connections if needed (contact Supabase support)
6. Implement connection pool monitoring
7. Alert on > 60 concurrent connections
```

**Escalation:**
- **If connections still high T+10:00:** Page platform-lead immediately
- **If Supabase down:** Contact Supabase support

**Expected Resolution Time:** 5-10 minutes

---

## Severity Levels

| Level | Impact | Response | Contact | SLA |
|-------|--------|----------|---------|-----|
| **P1 Critical** | Complete outage, no webhooks processed | On-call engineer immediate, escalate if unresolved > 10 min | platform-lead | 15 min |
| **P2 High** | 50-99% degradation, many webhooks failing | On-call engineer, escalate if unresolved > 30 min | platform-lead | 30 min |
| **P3 Medium** | Service working but with errors, < 50% failure | On-call engineer investigation, escalate if unresolved > 1 hour | platform-lead | 1 hour |
| **P4 Low** | Minor issues, < 1% impact | Document and fix in next sprint | Team lead | Next business day |

---

## Incident Command Structure

### On-Call Engineer (Primary Responder)

**Responsibilities:**
1. First acknowledgment of alert (< 2 min)
2. Initial diagnosis (< 5 min)
3. Execute runbook procedures
4. Communicate status every 5 minutes in Slack
5. Escalate if unresolved per SLA

**Authority:**
- ✅ Restart processes
- ✅ Run SQL queries (SELECT/UPDATE only)
- ✅ Enable/disable feature flags
- ✅ Replay webhooks
- ✅ Adjust rate limits
- ❌ Delete data
- ❌ Deploy code
- ❌ Modify database schema

### Incident Commander (if P1 or unresolved > 10 min)

**Responsibilities:**
1. Take command of incident
2. Coordinate communication to stakeholders
3. Assign roles to team members
4. Keep #daily-agile-incident channel updated
5. Decide when to escalate further
6. Schedule post-incident review

**Escalation Path:**
1. **On-Call Engineer** (Response: < 5 min)
2. **Platform Lead** (Response: < 30 min) — tkiran204@gmail.com
3. **CEO/CTO** (Response: < 1 hour) — For customer-facing issues

### Communication Roles

**Status Updates (every 5 minutes during incident):**
- Post to #daily-agile-incident or @daily-agile-team Slack channel
- Format: "T+5min — Issue: Webhooks down. Diagnosis: Database timeout. Action: Monitoring recovery."

**Customer Notifications:**
- **For P1:** Notify customers affected within 15 minutes
- **For P2:** Notify affected customers within 30 minutes
- **For P3:** Update status page, no individual notification

---

## On-Call Procedures

### Shift Handoff

**Outgoing On-Call Engineer** (5 minutes before shift end):
```
1. Review last 24 hours of incidents
   SELECT COUNT(*) FROM webhook_processing WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours';

2. Review open issues in #daily-agile-platform

3. Run deployment health check
   curl -s https://dailyagile.vercel.app/api/quiz/stripe/webhook/health | jq .

4. Brief incoming engineer on:
   - Known issues (if any)
   - Recent deployments
   - Any alerts to watch for
   - Contact info for escalations

5. Hand off on-call badge (Slack status)
```

**Incoming On-Call Engineer** (0 minutes shift start):
```
1. Update Slack status: "On-call — Platform Operations"

2. Set up alerts in terminal:
   watch -n 60 'vercel logs --since 10m | grep ERROR'

3. Verify alerting is working:
   - Check PagerDuty/Slack integration
   - Verify phone number is correct
   - Acknowledge on-call badge

4. Review runbooks in this repo
   - DEPLOYMENT_RUNBOOK.md
   - WEBHOOK_TROUBLESHOOTING.md
   - INCIDENT_RESPONSE.md

5. Check incident history (last 30 days)
   - Any recurring issues?
   - Any patterns?
```

### Daily Health Check (Before Business Hours)

**Every morning at 9am PT:**

```bash
# Check webhook success rate
supabase sql query "
  SELECT 
    ROUND(100.0 * COUNT(CASE WHEN status='succeeded' THEN 1 END) / COUNT(*), 2) as success_rate
  FROM public.webhook_processing
  WHERE created_at > NOW() - INTERVAL '24 hours';
"
# Expected: > 99%

# Check failed webhooks
supabase sql query "
  SELECT COUNT(*) as failed_webhooks 
  FROM public.webhook_processing 
  WHERE status='failed' AND created_at > NOW() - INTERVAL '24 hours';
"
# Expected: 0 or very low (< 5)

# Check deadletter queue
supabase sql query "
  SELECT COUNT(*) as unreviewed_issues 
  FROM public.webhook_deadletter 
  WHERE status='unreviewed';
"
# Expected: 0

# Check feature flags
supabase sql query "
  SELECT name, enabled 
  FROM public.feature_flags 
  WHERE NOT enabled;
"
# Expected: DISTRIBUTED_TRACING_ENABLED (OK to be false)

# Check database connections
supabase sql query "
  SELECT COUNT(*) as active_connections 
  FROM pg_stat_activity;
"
# Expected: < 50
```

**Post Results:**
- Create Slack thread in #daily-agile-platform with results
- If any anomalies: Investigate and escalate if needed

---

## Incident Communication

### Escalation Message Template

**To Platform Lead (if unresolved > 10 min for P1):**

```
🚨 ESCALATION: Webhook Processing Down

Severity: P1 CRITICAL
Duration: 12 minutes
Impact: All new student enrollments failing

Attempted Fixes:
1. ✅ Verified STRIPE_WEBHOOK_SECRET (correct)
2. ✅ Verified SUPABASE_SERVICE_KEY (correct)
3. ✅ Checked Supabase status (operational)
4. ⏳ Unknown root cause — needs senior investigation

Current Status:
- Webhook success rate: 5% (normally 99%)
- Failed webhooks: 342 in last 10 minutes
- Deadletter queue: 45+ unreviewed

Next Steps:
Need your help to:
- Review application logs for errors
- Check database query performance
- Decide if rollback is needed

Logs available at: https://vercel.com/dashboard/dailyagile/logs
```

### Status Update Template (For Slack #daily-agile-platform channel)

```
🔄 Incident Update — T+15 minutes

Status: INVESTIGATING
Severity: P1 CRITICAL
Issue: Webhook processing degradation (success rate 5%)

Timeline:
- T+0: Alert triggered (50% error rate)
- T+5: Root cause identified (database connection timeout)
- T+10: Killed idle connections (20 connections freed)
- T+15: Monitoring for recovery

Current Metrics:
- Success rate: 5% → 45% (improving)
- Failed webhooks: 342
- Retry queue: 285 pending

Next Steps:
- Continue monitoring
- Update in 5 minutes
- Escalating if not resolved by T+25

_Last updated at 2026-08-23 14:15 PT_
```

### All-Clear Message (When Resolved)

```
✅ Incident Resolved

Severity: P1 CRITICAL
Duration: 23 minutes
Resolved at: 2026-08-23 14:38 PT

Root Cause: Database connection pool exhaustion due to orphaned idle connections

Resolution:
1. Killed 20 idle connections
2. Verified max_connections setting
3. Redeployed connection pool optimization

Post-Incident:
- Success rate recovered to 99%
- All pending webhooks retried successfully
- No data loss

Action Items:
1. Increase connection pool monitoring (P2)
2. Set alert at 60 connections (P2)
3. Optimize webhook query performance (P3)
4. Post-incident review scheduled for 2026-08-24 at 2pm PT

Participants: On-call engineer, Platform Lead
Incident ID: INC-2026-08-23-001

Thank you all for a swift resolution! 🎉
```

---

## Emergency Kill Switches

### Kill Switch 1: Disable All Webhook Processing

**When:** Catastrophic issue where webhooks are corrupting data

**Steps:**

```sql
-- DISABLE
UPDATE public.feature_flags
SET enabled = false
WHERE name = 'WEBHOOK_PROCESSING_ENABLED';

-- Verify it's disabled
SELECT enabled FROM public.feature_flags 
WHERE name = 'WEBHOOK_PROCESSING_ENABLED';
-- Expected: false

-- All new webhooks will receive 200 OK but won't be processed
-- Stripe will not retry (we're acknowledging receipt)
-- Status: Emergency hold until investigation complete

-- TO RE-ENABLE (after fix confirmed)
UPDATE public.feature_flags
SET enabled = true
WHERE name = 'WEBHOOK_PROCESSING_ENABLED';

-- Replay all pending webhooks
UPDATE public.webhook_processing
SET status = 'pending', next_retry_at = NOW()
WHERE status = 'pending' AND next_retry_at > NOW();
```

**Impact:**
- New student enrollments won't be processed
- Students won't receive confirmation emails
- Billing records won't be created
- **Duration:** Can only maintain for 1-2 hours before customers notice

---

### Kill Switch 2: Disable Email Notifications

**When:** Email service (Brevo) is completely down or sending malicious content

**Steps:**

```sql
UPDATE public.feature_flags
SET enabled = false
WHERE name = 'EMAIL_NOTIFICATIONS_ENABLED';

-- Webhooks will still process, students will enroll
-- But confirmation emails won't be sent
-- Students can still access courses via direct link

-- TO RE-ENABLE
UPDATE public.feature_flags
SET enabled = true
WHERE name = 'EMAIL_NOTIFICATIONS_ENABLED';

-- Manually send batch emails to waiting students
SELECT DISTINCT email 
FROM public.students 
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND email NOT IN (
    SELECT DISTINCT email FROM public.email_queue 
    WHERE created_at > NOW() - INTERVAL '1 hour'
  );
```

**Impact:**
- Low impact (students can still access courses)
- Can maintain for several hours
- Customers may complain but service works

---

### Kill Switch 3: Revert to Previous Deployment

**When:** Recent code change introduced critical bug

**Steps:**

```bash
# Immediate rollback
vercel rollback

# This reverts to previous working deployment
# Automatic within 2-3 minutes

# Verify rollback
curl -s https://dailyagile.vercel.app/api/quiz/stripe/webhook/health | jq .

# Monitor success rate
supabase sql query "
  SELECT 
    ROUND(100.0 * COUNT(CASE WHEN status='succeeded' THEN 1 END) / COUNT(*), 2) as success_rate
  FROM public.webhook_processing
  WHERE created_at > NOW() - INTERVAL '5 minutes';
"
# Should return to 99%+ within 5 minutes
```

**Impact:**
- Immediate recovery from code bugs
- May lose recent feature improvements
- Can maintain indefinitely

---

### Kill Switch 4: Rate Limit Override

**When:** Legitimate customer has many transactions, rate limit falsely triggering

**Steps:**

```sql
-- Whitelist email address (bypass rate limit)
INSERT INTO public.rate_limit_whitelist (email)
VALUES ('corporate-customer@example.com')
ON CONFLICT (email) DO NOTHING;

-- Verify
SELECT * FROM public.rate_limit_whitelist 
WHERE email = 'corporate-customer@example.com';

-- TO REMOVE (after issue resolved)
DELETE FROM public.rate_limit_whitelist 
WHERE email = 'corporate-customer@example.com';
```

**Impact:**
- Low impact (only affects specific email)
- Temporary measure (fix underlying cause)
- Safe to use for hours or days

---

## Post-Incident Review

### Incident Debrief (Within 24 hours)

**Attendees:**
- On-call engineer who responded
- Platform lead
- Anyone involved in fix

**Agenda:**

```
1. Timeline: What happened? (10 min)
   - Alert triggered at T+0
   - Diagnosis complete at T+5
   - Resolved at T+23
   - Root cause: Database connection pool exhaustion

2. Contributing Factors: Why did it happen? (10 min)
   - No alerting on connection pool usage
   - No automatic connection cleanup
   - Max_connections set too low (100 → should be 200)

3. Response Evaluation: Did we handle it well? (10 min)
   - What went well?
     ✅ Rapid diagnosis (5 minutes)
     ✅ Clear communication to stakeholders
   - What could be better?
     ❌ Should have had on-call checklist prepared
     ❌ Should have alerted on pool usage > 80%

4. Action Items: How do we prevent this again? (10 min)
   - [ ] Increase max_connections to 200 (P1 — do immediately)
   - [ ] Add alert: connections > 60 (P1 — do immediately)
   - [ ] Add auto-cleanup of idle connections (P2 — do this sprint)
   - [ ] Create "database performance" runbook (P2 — do this sprint)
   - [ ] Monthly connection pool review (P3 — ongoing)
```

### Incident Report Template

**Create post in #daily-agile-platform channel:**

```
📋 Incident Report: INC-2026-08-23-001

Summary:
Database connection pool exhaustion caused webhook processing to fail for 23 minutes. 
342 webhooks failed. No data loss. Issue resolved by killing idle connections.

Timeline:
- 2026-08-23 14:15 — Alert: Webhook failure rate 50%
- 2026-08-23 14:18 — Root cause identified: connection pool at 98/100
- 2026-08-23 14:20 — Killed 20 idle connections
- 2026-08-23 14:38 — Service recovered, success rate 99%

Impact:
- Duration: 23 minutes
- Failed webhooks: 342
- Affected students: ~280 (unable to enroll during incident)
- Failed deployments: 0
- Data loss: 0

Root Cause:
1. No alerting on connection pool usage
2. Orphaned idle connections from previous deployment
3. max_connections set to 100 (too low for peak load)

Fix Applied:
1. Killed idle connections (immediate)
2. Increased max_connections to 200 (immediate)
3. Added alert on pool usage > 80% (planned)

Lessons Learned:
- Need better visibility into database connection usage
- Should have connection pool cleanup on deploy
- On-call engineer handled pressure well

Preventive Actions (Priority):
- [ ] P1: Increase max_connections to 200 (DONE)
- [ ] P1: Add alerting on connections > 60 (DONE)
- [ ] P2: Auto-cleanup idle connections on deploy (Sprint N+1)
- [ ] P2: Database performance runbook (Sprint N+1)
- [ ] P3: Monthly database review (Recurring)

Participants:
- On-call engineer: [Name]
- Platform lead: [Name]
- Incident commander: [Name]

Postmortem scheduled for 2026-08-24 at 2pm PT
```

### Metrics for Postmortem

```sql
-- How many incidents in last 30 days?
SELECT DATE(created_at), COUNT(*) as incident_count
FROM incident_reports
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY DATE DESC;

-- Average time to resolution (MTTR)
SELECT 
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60)::INT as avg_mttr_minutes
FROM incident_reports
WHERE created_at > NOW() - INTERVAL '30 days'
  AND severity IN ('P1', 'P2');

-- Most common root causes
SELECT root_cause, COUNT(*) as frequency
FROM incident_reports
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY root_cause
ORDER BY frequency DESC;

-- Are we improving? (MTTR trend)
SELECT 
  DATE_TRUNC('week', created_at) as week,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60)::INT as avg_mttr_minutes
FROM incident_reports
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC
LIMIT 12;  -- Last 12 weeks
```

---

## Emergency Contacts & Resources

### On-Call Rotation

```
Week 1-2:  Engineer A  (alice@dailyagile.com)
Week 3-4:  Engineer B  (bob@dailyagile.com)
Week 5-6:  Engineer C  (charlie@dailyagile.com)
Week 7-8:  Engineer A  (cycles)
```

**Check current on-call:** https://pagerduty.com/oncall

### Escalation Numbers

| Role | Name | Phone | Email | Availability |
|------|------|-------|-------|--------------|
| On-Call Engineer | [Rotation] | [SMS] | [Email] | 24/7 |
| Platform Lead | Kiran | 555-0100 | tkiran204@gmail.com | 9am-6pm PT + on-call |
| CTO | [TBD] | [TBD] | [Email] | Business hours |
| VP Eng | [TBD] | [TBD] | [Email] | Business hours |

### Important URLs

- **Vercel Dashboard:** https://vercel.com/dashboard/dailyagile
- **Supabase Dashboard:** https://app.supabase.com
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Brevo Dashboard:** https://app.brevo.com
- **Slack Channel:** #daily-agile-platform
- **Incident Channel:** #daily-agile-incident
- **Status Page:** https://dailyagile.com/status (coming soon)

### Documentation

- DEPLOYMENT_RUNBOOK.md — Step-by-step deployment guide
- WEBHOOK_TROUBLESHOOTING.md — Decision trees and SQL queries
- INCIDENT_RESPONSE.md — This document
- MONITORING_CHECKLIST.md — Metrics and dashboards

---

## Appendix: Decision Tree for Severity Level

```
Is the webhook endpoint completely down (no response)?
├─→ YES: P1 CRITICAL (0-15 min response)
└─→ NO: Continue...

Is the success rate < 50%?
├─→ YES: P1 CRITICAL (0-15 min response)
└─→ NO: Continue...

Is the success rate < 90%?
├─→ YES: P2 HIGH (0-30 min response)
└─→ NO: Continue...

Is the success rate < 99%?
├─→ YES: P3 MEDIUM (0-1 hour response)
└─→ NO: P4 LOW (next business day)

Is there customer-facing impact (students can't enroll)?
├─→ YES: Escalate by 1 severity level
└─→ NO: Continue as planned
```

---

**Document Control**
- Version: 2.0
- Last Updated: 2026-08-23
- Next Review: 2026-09-23
- Owner: Platform Operations Team
- Approval: [SIGN OFF]
