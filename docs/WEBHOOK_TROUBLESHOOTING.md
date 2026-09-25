# DailyAgile Platform — Webhook Troubleshooting Guide

**Version:** 2.0  
**Last Updated:** 2026-08-23  
**Owner:** Platform Operations Team  
**Target Audience:** On-call engineers, platform operations  

---

## Table of Contents

1. [Quick Diagnosis Decision Tree](#quick-diagnosis-decision-tree)
2. [Webhook Processing States](#webhook-processing-states)
3. [Common Issues & Solutions](#common-issues--solutions)
4. [SQL Debugging Queries](#sql-debugging-queries)
5. [Webhook Replay Procedures](#webhook-replay-procedures)
6. [Escalation Matrix](#escalation-matrix)

---

## Quick Diagnosis Decision Tree

### Level 1: Is the webhook endpoint reachable?

```
QUESTION: Can you POST to https://dailyagile.vercel.app/api/quiz/stripe/webhook?

→ YES
  └─→ Go to "Level 2: Is the signature valid?"
  
→ NO
  └─→ **CRITICAL ISSUE**
     1. Check Vercel deployment status: https://vercel.com/dashboard
     2. Check API status: curl -I https://dailyagile.vercel.app/api/quiz/stripe/webhook
     3. If 404: Redeploy application (See DEPLOYMENT_RUNBOOK.md)
     4. If timeout: Check Vercel logs for build errors
     Action: Contact Level 2 support if persists > 5 minutes
```

### Level 2: Is the Stripe signature valid?

```
QUESTION: Does webhook return 401 Unauthorized when tested?

→ YES
  └─→ **SIGNATURE VALIDATION FAILED**
     Cause: STRIPE_WEBHOOK_SECRET is wrong or not set
     
     Check 1: Verify secret is set in Vercel
     $ vercel env list | grep STRIPE_WEBHOOK_SECRET
     Expected: STRIPE_WEBHOOK_SECRET (masked)
     
     Check 2: Get correct secret from Stripe
     1. Go to: https://dashboard.stripe.com/webhooks
     2. Click the webhook endpoint for dailyagile.vercel.app
     3. Copy the "Signing Secret"
     
     Check 3: Update Vercel with correct secret
     $ vercel env add STRIPE_WEBHOOK_SECRET
     (paste correct secret)
     $ vercel deploy --prod
     
     Verify: Send test webhook from Stripe Dashboard
     Expected: HTTP 200 with { "success": true }

→ NO (Returns 200)
  └─→ Go to "Level 3: Is the webhook being processed?"
```

### Level 3: Is the webhook being processed?

```
QUESTION: Do webhooks appear in webhook_processing table?

Check: SELECT COUNT(*) FROM public.webhook_processing 
       WHERE created_at > NOW() - INTERVAL '1 hour';

→ YES (Count > 0)
  └─→ Go to "Level 4: What is the status of the webhook?"
  
→ NO (Count = 0)
  └─→ **WEBHOOKS NOT BEING RECORDED**
     Possible causes:
     1. Feature flag WEBHOOK_PROCESSING_ENABLED is disabled
     2. Supabase connection is down
     3. Database migration 032 was not applied
     
     Check 1: Verify feature flag is enabled
     SELECT enabled, rollout_percentage 
     FROM public.feature_flags 
     WHERE name = 'WEBHOOK_PROCESSING_ENABLED';
     Expected: enabled=true, rollout_percentage=100
     
     If disabled:
     UPDATE public.feature_flags 
     SET enabled = true 
     WHERE name = 'WEBHOOK_PROCESSING_ENABLED';
     
     Check 2: Verify database connectivity
     SELECT current_timestamp;
     Expected: Current date/time returned
     
     Check 3: Verify migration 032 applied
     SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'webhook_processing';
     Expected: webhook_processing table exists
     
     If table doesn't exist: Apply migration (See DEPLOYMENT_RUNBOOK.md, Step 3)
```

### Level 4: What is the webhook status?

```
QUESTION: Check webhook status for specific event ID

Query: SELECT status, attempt_number, error_classification, last_error 
       FROM public.webhook_processing 
       WHERE external_id = 'evt_xxx'
       LIMIT 1;

RESPONSE ANALYSIS:

→ status='succeeded' (SUCCESS)
   └─→ Webhook processed successfully!
       Action: No action needed
       Verify student and billing records exist (See SQL queries below)

→ status='idempotent' (DUPLICATE)
   └─→ This exact webhook was already processed
       Action: No action needed (system is working correctly)
       Note: Stripe may retry same event - idempotency prevents double-processing

→ status='processing' (IN PROGRESS)
   └─→ Webhook is currently being processed
       Action: Wait 30 seconds and re-check
       If still 'processing' after 2 minutes: Possible deadlock
       Contact Level 2 support

→ status='pending' (WAITING FOR RETRY)
   └─→ Transient error occurred, webhook will retry
       next_retry_at: ${Date} - When it will retry
       error_classification: 'transient'
       last_error: ${Error message}
       
       Action: Wait for automatic retry (backoff schedule: 1m, 2m, 4m, 8m, 16m)
       If error is in "recoverable_errors" list: Retry manually
       If error not in list: Escalate to Level 2

→ status='failed' (PERMANENT FAILURE)
   └─→ Error occurred that won't be retried automatically
       error_classification: 'permanent'
       last_error: ${Error message}
       
       Action: Analyze last_error
       Go to "Common Issues & Solutions" for error message
       If error is your fault: Fix and replay webhook
       If error is system: Escalate to Level 2
```

---

## Webhook Processing States

### State Machine Diagram

```
┌─────────┐
│ pending │  Webhook event received from Stripe
└────┬────┘
     │
     ├─→ Idempotency check: Already processed?
     │   ├─→ YES → status='idempotent' ✓ (return 200)
     │   └─→ NO → continue
     │
     ├─→ mark_webhook_processing() called
     │   └─→ status='processing'
     │
     ├─→ Validate signature, metadata, rate limits
     │   ├─→ FAIL → mark_webhook_failed() with 'permanent'
     │   │          status='failed' → moved to deadletter
     │   └─→ PASS → continue
     │
     ├─→ Upsert student, create billing record
     │   ├─→ ERROR → classify error
     │   │   ├─→ TRANSIENT (DB timeout, connection error)
     │   │   │   └─→ mark_webhook_failed() with 'transient'
     │   │   │       status='pending' → scheduled for retry
     │   │   │       next_retry_at = NOW() + exponential_backoff
     │   │   │
     │   │   └─→ PERMANENT (invalid email, missing data)
     │   │       └─→ mark_webhook_failed() with 'permanent'
     │   │           status='failed' → moved to deadletter
     │   │
     │   └─→ SUCCESS → continue
     │
     ├─→ Queue confirmation email (best-effort)
     │   └─→ Email failure is non-fatal
     │
     └─→ mark_webhook_succeeded()
         └─→ status='succeeded' ✓ (return 200)
```

### Status Meanings

| Status | Meaning | Next Action | HTTP Status |
|--------|---------|-------------|-------------|
| `pending` | Received, queued for processing | Process now | 202 Accepted |
| `processing` | Currently being processed | Wait | In progress |
| `succeeded` | Successfully processed | None | 200 OK |
| `failed` | Processing failed, won't retry | Manual review | Depends* |
| `idempotent` | Duplicate of already-processed event | None | 200 OK |
| `skipped` | Event type not handled | None | 200 OK |

*HTTP Status depends on error classification:
- TRANSIENT error → 500 Internal Server Error (tells Stripe to retry)
- PERMANENT error → 200 OK (tells Stripe not to retry)

### Error Classifications

```sql
-- TRANSIENT (should retry):
- Database connection timeout
- Network connectivity issue
- Supabase service temporarily down
- Rate limiter temporarily engaged

-- PERMANENT (should not retry):
- Invalid email format
- Missing required metadata (course_id)
- Invalid course_id (doesn't exist)
- Signature validation failed
- Webhook already processed (idempotent)
```

---

## Common Issues & Solutions

### Issue 1: "401 Unauthorized" — Signature Validation Failed

**Symptoms:**
- Webhook returns HTTP 401
- Stripe shows red X next to webhook attempt
- Error message: "Invalid webhook signature"

**Root Causes:**
1. STRIPE_WEBHOOK_SECRET is wrong
2. STRIPE_WEBHOOK_SECRET is not set
3. Webhook was sent with wrong signing secret

**Diagnosis:**

```bash
# Check if secret is set in Vercel
vercel env list | grep STRIPE_WEBHOOK_SECRET

# If not listed: Secret is not set
# If listed as (masked): Secret is set but might be wrong
```

**Solution:**

```bash
# Step 1: Get correct secret from Stripe
# Go to: https://dashboard.stripe.com/webhooks
# Click the webhook endpoint
# Copy "Signing Secret" (starts with "whsec_")

# Step 2: Update Vercel
vercel env add STRIPE_WEBHOOK_SECRET

# Paste the correct secret when prompted

# Step 3: Re-deploy to pick up new secret
vercel deploy --prod

# Step 4: Test with Stripe test event
# Go to: https://dashboard.stripe.com/webhooks
# Click endpoint, click "Send test webhook"
# Should return HTTP 200 with success message
```

**Prevent Future Occurrence:**
- Add STRIPE_WEBHOOK_SECRET to deployment checklist
- Verify secret matches when rotating in Stripe
- Set alert if webhook returns 401 for > 10 consecutive events

---

### Issue 2: "Rate Limit Exceeded" — Too Many Events from Same Email

**Symptoms:**
- Webhook returns HTTP 429 Too Many Requests
- Multiple webhooks for same email fail
- Error message: "Rate limit exceeded"

**Root Cause:**
Rate limiter detected > 10 events from same email within 60 seconds

**Diagnosis:**

```sql
-- Check rate limit violations
SELECT 
  COUNT(*) as violations,
  customer_email,
  DATE_TRUNC('minute', created_at) as minute
FROM public.webhook_audit_logs
WHERE event_type = 'rate_limit_exceeded'
GROUP BY customer_email, DATE_TRUNC('minute', created_at)
ORDER BY violations DESC;
```

**Solution:**

Option 1: **Wait** (Automatic Recovery)
- Rate limit resets every 60 seconds
- After 60 seconds, webhooks from same email will succeed
- Action: Do nothing, system will auto-recover

Option 2: **Increase Rate Limit** (If legitimate traffic)
- Edit `lib/security/webhook-security.ts`
- Find: `const MAX_EVENTS_PER_EMAIL_PER_MINUTE = 10`
- Change to higher value (e.g., 50)
- Redeploy: `vercel deploy --prod`

Option 3: **Whitelist Email** (If from corporate account)
- Add corporate email to allowlist
- Rate limit is bypassed for whitelisted emails
- Edit configuration in webhook-security.ts

**Prevent Future Occurrence:**
- Educate customers: Don't retry failed payments immediately
- Implement exponential backoff in client code
- Set alert if rate_limit_exceeded events > 5/minute

---

### Issue 3: Missing Student Record After Webhook

**Symptoms:**
- Webhook returns HTTP 200 (success)
- Student email doesn't appear in `students` table
- Billing record exists but no matching student

**Root Cause:**
One of:
1. Student upsert failed silently
2. Database permission issue
3. Student record was deleted after webhook

**Diagnosis:**

```sql
-- Check webhook status
SELECT status, last_error, error_classification 
FROM public.webhook_processing 
WHERE external_id = 'evt_xxx';
-- If status='failed': See "Issue 7" below

-- Check if student exists
SELECT id, email, email_verified 
FROM public.students 
WHERE email = 'test@example.com';
-- If no results: Student doesn't exist

-- Check billing record (orphaned)
SELECT student_id, course_id, amount_paid 
FROM public.billing_history 
WHERE external_invoice_id = 'cs_xxx';
-- If student_id is NULL: Student record is missing
```

**Solution:**

```sql
-- Step 1: Manually create student record
INSERT INTO public.students (email, email_verified)
VALUES ('test@example.com', true)
ON CONFLICT (email) DO NOTHING
RETURNING id;
-- Note: Save the returned student ID

-- Step 2: Update billing record with student_id
UPDATE public.billing_history
SET student_id = 'STUDENT_ID_FROM_ABOVE'
WHERE external_invoice_id = 'cs_xxx';

-- Step 3: Mark webhook as succeeded (if not already)
UPDATE public.webhook_processing
SET status = 'succeeded', processed_at = NOW()
WHERE external_id = 'evt_xxx';

-- Step 4: Verify fix
SELECT s.email, b.course_id, b.amount_paid
FROM public.students s
JOIN public.billing_history b ON s.id = b.student_id
WHERE s.email = 'test@example.com';
```

**Prevent Future Occurrence:**
- Add constraint to billing_history: student_id NOT NULL after upsert
- Add database test: "Student exists after webhook succeeds"
- Monitor orphaned billing records: `SELECT COUNT(*) FROM billing_history WHERE student_id IS NULL`

---

### Issue 4: Email Confirmation Not Sent

**Symptoms:**
- Webhook succeeds (HTTP 200)
- Student record created
- Student doesn't receive confirmation email
- Error message in logs: "Failed to queue confirmation email"

**Root Cause:**
One of:
1. BREVO_API_KEY not set
2. Brevo account rate-limited
3. Email domain not authorized in Brevo
4. Email queue worker crashed

**Diagnosis:**

```bash
# Check if Brevo API key is set
vercel env list | grep BREVO_API_KEY

# Check logs for email errors
vercel logs --since 1h | grep -i "email\|brevo"

# Check email queue
SELECT COUNT(*) as queued_emails 
FROM public.email_queue 
WHERE status = 'pending' AND created_at > NOW() - INTERVAL '1 hour';

# Check failed emails
SELECT subject, error_message, created_at 
FROM public.email_queue 
WHERE status = 'failed' AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Solution:**

**If BREVO_API_KEY not set:**
```bash
vercel env add BREVO_API_KEY
# Paste key from: https://app.brevo.com/settings/account
vercel deploy --prod
```

**If Brevo account rate-limited:**
```bash
# Check Brevo rate limit status
curl https://api.brevo.com/v3/account \
  -H "api-key: $BREVO_API_KEY"

# Response shows:
# - remaining_credits
# - email_send_limit
# - daily_remaining

# Solution: Add more Brevo credits or upgrade plan
```

**If email domain not authorized:**
```bash
# Go to: https://app.brevo.com/smtp-keys
# Verify sender email domain is authorized
# Add domain: support@dailyagile.com (if not present)
# Verify domain via DNS TXT record
```

**If email queue worker crashed:**
```bash
# Check worker logs
vercel logs --since 1h | grep "worker\|queue"

# Manually retry failed emails
SELECT id, email, subject, error_message 
FROM public.email_queue 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;

# Update status to 'pending' to retry
UPDATE public.email_queue 
SET status = 'pending', attempt_count = 0 
WHERE status = 'failed' AND id IN ('id1', 'id2', ...);
```

**Prevent Future Occurrence:**
- Set alert: If email queue has > 100 pending items for > 30 minutes
- Monitor Brevo credits: Alert if remaining < 1000
- Add retry logic: Queue automatically retries failed emails 3 times
- Test email delivery: Send test email before marking feature complete

---

### Issue 5: Webhook Processed Twice (Duplicate Student)

**Symptoms:**
- Stripe shows webhook was delivered once
- Database shows 2 billing records for same email and course_id
- Error message: "Unique constraint violation"

**Root Cause:**
Race condition: Two webhook processes overlapped, both created billing records

**Diagnosis:**

```sql
-- Find duplicate billing records
SELECT 
  student_id, 
  course_id, 
  COUNT(*) as duplicate_count,
  array_agg(id) as record_ids
FROM public.billing_history
GROUP BY student_id, course_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Check webhook_processing for race condition
SELECT 
  external_id,
  COUNT(*) as attempt_count,
  array_agg(id) as record_ids
FROM public.webhook_processing
WHERE status IN ('succeeded', 'processing')
GROUP BY external_id
HAVING COUNT(*) > 1;
```

**Solution:**

```sql
-- Step 1: Identify which billing record to keep (keep oldest)
SELECT id, created_at 
FROM public.billing_history
WHERE student_id = 'STUDENT_ID' AND course_id = 'COURSE_ID'
ORDER BY created_at ASC;

-- Step 2: Delete the duplicate (keep first one)
DELETE FROM public.billing_history
WHERE student_id = 'STUDENT_ID' 
  AND course_id = 'COURSE_ID'
  AND created_at > '2026-08-23 12:34:56'  -- Timestamp of second record
LIMIT 1;

-- Step 3: Verify only one record remains
SELECT COUNT(*) 
FROM public.billing_history
WHERE student_id = 'STUDENT_ID' AND course_id = 'COURSE_ID';
-- Expected: 1
```

**Prevent Future Occurrence:**
- Add UNIQUE constraint: `(student_id, course_id, date_trunc('day', created_at))`
- Add idempotency check before upsert
- Implement database-level row locking during webhook processing
- Monitor: `SELECT COUNT(*) FROM billing_history GROUP BY student_id, course_id HAVING COUNT(*) > 1`

---

### Issue 6: "Database Connection Timeout" — Transient Error

**Symptoms:**
- Webhook returns HTTP 500
- Error message: "Connection timeout", "ECONNREFUSED"
- Stripe will retry automatically in 5 minutes

**Root Cause:**
One of:
1. Supabase database is overloaded
2. Network connectivity issue
3. Connection pool exhausted
4. Supabase service temporarily down

**Diagnosis:**

```bash
# Check Supabase status
curl https://status.supabase.io/api/v2/summary.json | jq '.components[] | select(.name | contains("Database"))'

# Check database connections
supabase sql query "
  SELECT 
    datname, 
    usename, 
    application_name, 
    COUNT(*) as connection_count 
  FROM pg_stat_activity 
  GROUP BY datname, usename, application_name;
"

# Check for long-running queries
supabase sql query "
  SELECT 
    pid,
    usename,
    query,
    query_start,
    EXTRACT(EPOCH FROM (NOW() - query_start)) as seconds_running
  FROM pg_stat_activity
  WHERE query NOT LIKE '%pg_stat_activity%'
  ORDER BY query_start ASC;
"
```

**Solution:**

**If Supabase is down:**
- Wait 5-15 minutes for automatic recovery
- Stripe will retry the webhook automatically
- Monitor Supabase status: https://status.supabase.io
- Action: No immediate action needed (auto-retry by Stripe)

**If database connections exhausted:**
```sql
-- Kill idle connections (use with caution)
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
  AND query_start < NOW() - INTERVAL '5 minutes'
  AND pid <> pg_backend_pid();

-- Connection pool info
SHOW max_connections;
-- Increase if necessary: max_connections = 200
```

**If long-running query blocking new connections:**
```sql
-- Kill blocking query
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE query = 'LONG_QUERY_TEXT' 
  AND pid <> pg_backend_pid();

-- Investigate: Why is query slow?
EXPLAIN ANALYZE SELECT ...;
```

**Prevent Future Occurrence:**
- Set Supabase connection timeout: 30 seconds
- Add connection pool monitoring
- Alert if > 80% of max_connections in use
- Implement query timeout: 10 seconds for webhook processing

---

### Issue 7: "Invalid Metadata" — Missing Required Fields

**Symptoms:**
- Webhook returns HTTP 200
- status='failed', error_classification='permanent'
- Error message: "Missing course_id in session metadata"

**Root Cause:**
Stripe checkout session missing metadata fields

**Diagnosis:**

```sql
-- Check what metadata Stripe sent
SELECT 
  external_id,
  payload->'data'->'object'->>'customer_email' as email,
  payload->'data'->'object'->>'metadata' as metadata,
  last_error
FROM public.webhook_processing
WHERE status = 'failed' AND error_classification = 'permanent'
ORDER BY created_at DESC
LIMIT 10;
```

**Solution:**

**For customers:**
- Educate sales team: Course ID MUST be in Stripe checkout metadata
- Test checkout before sending to customers
- Add validation in Stripe dashboard: Metadata is required

**For failed webhooks:**
```sql
-- Manually create the missing record
-- (Same as Issue 3 solution: "Missing Student Record")
```

**Prevent Future Occurrence:**
- Add server-side validation in checkout creation
- Store course_id in Stripe line items (not just metadata)
- Test all checkout flows before launch
- Alert on "Invalid Metadata" errors

---

## SQL Debugging Queries

### Query 1: Webhook Health Overview (Last 1 Hour)

```sql
SELECT 
  DATE_TRUNC('minute', created_at)::timestamp as minute,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as succeeded,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN status = 'idempotent' THEN 1 END) as idempotent,
  COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
  ROUND(100.0 * COUNT(CASE WHEN status = 'succeeded' THEN 1 END) / COUNT(*), 2) as success_pct
FROM public.webhook_processing
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', created_at)
ORDER BY minute DESC;
```

**Expected Output:**
```
minute                 | total | succeeded | failed | idempotent | processing | success_pct
-----------------------+-------+-----------+--------+------------+------------+-------------
2026-08-23 14:00:00    | 142   | 140       | 1      | 1          | 0          | 98.59
2026-08-23 13:59:00    | 156   | 155       | 1      | 0          | 0          | 99.36
2026-08-23 13:58:00    | 148   | 147       | 0      | 1          | 0          | 99.32
```

### Query 2: Failed Webhooks Requiring Manual Review

```sql
SELECT 
  wp.id as processing_id,
  wp.external_id as stripe_event_id,
  wp.metadata->>'studentEmail' as student_email,
  wp.metadata->>'courseId' as course_id,
  wp.error_classification,
  wp.last_error,
  wp.attempt_number,
  wp.max_retries,
  wp.next_retry_at,
  wp.created_at,
  dl.id as deadletter_id,
  dl.status as deadletter_status,
  dl.error_summary
FROM public.webhook_processing wp
LEFT JOIN public.webhook_deadletter dl ON wp.id = dl.webhook_processing_id
WHERE wp.status = 'failed'
ORDER BY wp.created_at DESC
LIMIT 20;
```

**Expected Output:**
```
processing_id | stripe_event_id | student_email       | course_id           | error_classification | last_error
--------------+-----------------+---------------------+---------------------+-----------------------+--------------------
uuid-123      | evt_abc123      | test@example.com    | ai-for-business     | permanent             | Missing course_id in session metadata
uuid-124      | evt_abc124      | invalid-email@local | ai-for-business     | permanent             | Invalid email format
```

### Query 3: Idempotency Check (Duplicate Prevention Working?)

```sql
SELECT 
  COUNT(*) as total_events,
  COUNT(DISTINCT external_id) as unique_events,
  COUNT(*) - COUNT(DISTINCT external_id) as duplicates
FROM public.webhook_processing
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Expected Output:**
- total_events ≈ unique_events (no or very few duplicates)
- duplicates should be 0 or very low

```
total_events | unique_events | duplicates
-------------+---------------+------------
1543         | 1543          | 0
```

### Query 4: Rate Limit Violations in Last Hour

```sql
SELECT 
  customer_email,
  event_type,
  COUNT(*) as violation_count,
  MAX(created_at) as most_recent
FROM public.webhook_audit_logs
WHERE event_type = 'rate_limit_exceeded'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY customer_email, event_type
ORDER BY violation_count DESC;
```

**Expected Output:**
```
customer_email        | event_type             | violation_count | most_recent
-----------------------+------------------------+-----------------+-------------------------
test@example.com      | rate_limit_exceeded    | 3               | 2026-08-23 14:15:32
spammer@badactor.com  | rate_limit_exceeded    | 47              | 2026-08-23 14:14:21
```

### Query 5: Audit Trail for Specific Student

```sql
SELECT 
  action,
  actor_type,
  table_name,
  new_values,
  metadata,
  created_at
FROM public.webhook_audit_logs
WHERE new_values->>'email' = 'test@example.com'
   OR old_values->>'email' = 'test@example.com'
ORDER BY created_at DESC;
```

**Expected Output:**
```
action              | actor_type | table_name        | new_values                          | metadata  | created_at
---------------------+------------+-------------------+-------------------------------------+-----------+-------------------------
STUDENT_UPSERT      | webhook    | students          | {"email":"test@ex..."}              | {...}     | 2026-08-23 14:12:34
BILLING_INSERT      | webhook    | billing_history   | {"amount_paid":59.00, ...}          | {...}     | 2026-08-23 14:12:34
EMAIL_QUEUED        | system     | email_queue       | {"subject":"Welcome...", ...}       | {...}     | 2026-08-23 14:12:35
```

### Query 6: Orphaned Billing Records (No Student)

```sql
SELECT 
  bh.id as billing_id,
  bh.external_invoice_id,
  bh.student_id,
  bh.course_id,
  bh.amount_paid,
  bh.created_at
FROM public.billing_history bh
WHERE bh.student_id IS NULL
ORDER BY bh.created_at DESC;
```

**Expected Output:** Empty (should be no orphaned records)

```
(No rows)
```

### Query 7: Pending Retry Webhooks

```sql
SELECT 
  id,
  external_id,
  event_type,
  metadata->>'studentEmail' as student_email,
  error_classification,
  attempt_number,
  next_retry_at,
  EXTRACT(EPOCH FROM (next_retry_at - NOW())) as seconds_until_retry
FROM public.webhook_processing
WHERE status = 'pending' AND next_retry_at IS NOT NULL
ORDER BY next_retry_at ASC;
```

**Expected Output:**
```
id        | external_id | event_type                  | student_email   | error_classification | attempt_number | next_retry_at            | seconds_until_retry
----------+-------------+-----------------------------+-----------------+-----------------------+----------------+--------------------------+--------------------
uuid-1    | evt_123     | checkout.session.completed  | test@example.com| transient             | 1              | 2026-08-23 14:22:00      | 345
uuid-2    | evt_124     | checkout.session.completed  | user@domain.com | transient             | 2              | 2026-08-23 14:28:00      | 681
```

### Query 8: Feature Flags Status

```sql
SELECT 
  name,
  enabled,
  rollout_percentage,
  owner,
  updated_at
FROM public.feature_flags
ORDER BY name;
```

**Expected Output:**
```
name                                | enabled | rollout_percentage | owner    | updated_at
-------------------------------------+---------+--------------------+----------+------------------------
BILLING_PROCESSING_ENABLED          | t       | 100                | platform | 2026-08-23 10:00:00
EMAIL_NOTIFICATIONS_ENABLED         | t       | 100                | platform | 2026-08-23 10:00:00
METRICS_COLLECTION_ENABLED          | t       | 100                | platform | 2026-08-23 10:00:00
STUDENT_ENROLLMENT_ENABLED          | t       | 100                | platform | 2026-08-23 10:00:00
WEBHOOK_AUDIT_LOGGING_ENABLED       | t       | 100                | platform | 2026-08-23 10:00:00
WEBHOOK_PROCESSING_ENABLED          | t       | 100                | platform | 2026-08-23 10:00:00
```

---

## Webhook Replay Procedures

### Scenario 1: Replay a Single Failed Webhook

Sometimes a webhook fails due to temporary issue (DB timeout) and needs to be replayed.

```sql
-- Step 1: Find the webhook to replay
SELECT 
  id,
  external_id,
  payload,
  error_classification,
  last_error
FROM public.webhook_processing
WHERE external_id = 'evt_xxx'
LIMIT 1;

-- Step 2: Reset status to 'pending' to retry
UPDATE public.webhook_processing
SET 
  status = 'pending',
  attempt_number = attempt_number + 1,
  next_retry_at = NOW(),
  last_error = NULL,
  error_details = NULL
WHERE external_id = 'evt_xxx';

-- Step 3: Verify
SELECT status, attempt_number, next_retry_at 
FROM public.webhook_processing 
WHERE external_id = 'evt_xxx';
-- Expected: status='pending', attempt_number incremented, next_retry_at = NOW()

-- Step 4: Trigger webhook processing
-- (Webhook will be processed by next cron job or manual trigger)
-- OR manually invoke webhook handler with the payload above
```

### Scenario 2: Bulk Replay Failed Webhooks (Last 1 Hour)

```sql
-- Reset all failed webhooks from last hour with transient errors
UPDATE public.webhook_processing
SET 
  status = 'pending',
  attempt_number = attempt_number + 1,
  next_retry_at = NOW(),
  last_error = NULL,
  error_details = NULL
WHERE 
  status = 'failed'
  AND error_classification = 'transient'
  AND created_at > NOW() - INTERVAL '1 hour'
  AND attempt_number < max_retries;

-- Verify
SELECT COUNT(*) as replayed_webhooks
FROM public.webhook_processing
WHERE status = 'pending' AND next_retry_at <= NOW();
```

### Scenario 3: Replay Webhook with Modified Metadata

If metadata was wrong (e.g., invalid course_id), fix it and replay:

```sql
-- Step 1: Update the payload with corrected metadata
UPDATE public.webhook_processing
SET 
  payload = jsonb_set(
    payload,
    '{data,object,metadata,course_id}',
    '"ai-for-business"'
  ),
  status = 'pending',
  attempt_number = attempt_number + 1,
  next_retry_at = NOW(),
  last_error = NULL
WHERE external_id = 'evt_xxx';

-- Step 2: Verify metadata was updated
SELECT payload->'data'->'object'->>'metadata' as metadata
FROM public.webhook_processing
WHERE external_id = 'evt_xxx';
```

### Scenario 4: Manually Trigger Webhook Processing (Testing)

If you want to manually invoke the webhook handler:

```bash
# Get the webhook payload from database
supabase sql query "
  SELECT payload 
  FROM public.webhook_processing 
  WHERE external_id = 'evt_xxx';
" | jq '.payload'

# Call webhook endpoint directly (local testing only)
curl -X POST http://localhost:3000/api/quiz/stripe/webhook \
  -H "Content-Type: application/json" \
  -d @payload.json

# For production (requires correct signature)
# Use Stripe CLI to resend webhook:
stripe events resend evt_xxx
```

---

## Escalation Matrix

### Level 1: On-Call Engineer (Self-Help)

**When:** Issues you can diagnose and fix yourself  
**Time to Resolution:** < 15 minutes  
**Tools:** This runbook, SQL queries, Vercel CLI  

**Authority:**
- ✅ Restart processes
- ✅ Run SQL queries (SELECT/UPDATE only)
- ✅ Check logs and monitoring
- ✅ Replay failed webhooks
- ✅ Update feature flags
- ❌ Delete data
- ❌ Modify code
- ❌ Change database schema

### Level 2: Platform Lead

**When:** Requires code change, critical data loss, or permission escalation  
**Contact:** tkiran204@gmail.com  
**Response Time:** 30 minutes  
**Authority:**
- ✅ All Level 1 actions
- ✅ Modify environment variables
- ✅ Deploy code changes
- ✅ Database schema changes
- ✅ Delete/restore data (with approval)

### Level 3: External Support

**When:** Third-party service issues  
**Contacts:**
- **Vercel:** https://vercel.com/support
- **Supabase:** support@supabase.io
- **Stripe:** https://support.stripe.com

### Quick Escalation Scenarios

| Scenario | Level | Action |
|----------|-------|--------|
| Webhook returns 401 | 1 | Update STRIPE_WEBHOOK_SECRET (Level 1) |
| Rate limit false alarm | 1 | Check metrics, adjust if needed (Level 1) |
| Supabase down | 1 | Monitor status.supabase.io, wait (Level 1) |
| Database query optimization | 2 | Add index, analyze EXPLAIN plan (Level 2) |
| Stripe configuration issue | 3 | Contact Stripe support (Level 3) |
| Production data corruption | 2 | Restore from backup (Level 2) |
| Unknown errors in logs | 2 | Investigate and fix code (Level 2) |

---

## Reference: Recovery Time Objectives

| Scenario | RTO | Recovery Steps |
|----------|-----|-----------------|
| Webhook endpoint down | 15 min | Redeploy via Vercel CLI |
| Database connection timeout | 5 min | Monitor Supabase status, auto-retry |
| Missing environment variable | 10 min | Add to Vercel, redeploy |
| Invalid webhook secret | 15 min | Get correct secret from Stripe, update Vercel, redeploy |
| Stripe webhook not being received | 30 min | Verify network, DNS, firewall, recreate endpoint |
| Mass webhook failures | 30 min | Identify root cause, replay webhooks |
| Data corruption | 2 hours | Restore from backup, manual validation |

---

**Document Control**
- Version: 2.0
- Last Updated: 2026-08-23
- Next Review: 2026-09-23
- Owner: Platform Operations Team
