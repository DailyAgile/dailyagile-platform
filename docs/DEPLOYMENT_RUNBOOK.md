# DailyAgile Platform — Deployment Runbook

**Version:** 2.0  
**Last Updated:** 2026-08-23  
**Owner:** Platform Operations Team  
**Estimated Time:** 30-45 minutes  

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Database Migrations](#database-migrations)
5. [Webhook Endpoint Registration](#webhook-endpoint-registration)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring Setup](#monitoring-setup)
8. [Rollback Procedures](#rollback-procedures)
9. [Emergency Contacts](#emergency-contacts)

---

## Pre-Deployment Checklist

Before deploying to production, verify all items below:

- [ ] **Git Status**: All changes committed to `main` branch
- [ ] **Environment Variables**: All 15+ required vars configured in Vercel
- [ ] **Database**: Staging database tested with migrations 032 and 040
- [ ] **Stripe Account**: Webhook secret and API key available
- [ ] **Supabase Account**: Service role key for migrations
- [ ] **Brevo Account**: API key for email notifications (optional)
- [ ] **SSL Certificate**: HTTPS enabled for webhook endpoint
- [ ] **Backup**: Current production database backed up
- [ ] **Communication**: Stakeholders notified of deployment window
- [ ] **Runbook Version**: This document reviewed and understood by operator

---

## Prerequisites

### System Requirements

- **Vercel Account**: With admin access to DailyAgile project
- **GitHub Account**: Push access to `dailyagile-platform` repo
- **Supabase Project**: Production and staging databases configured
- **Stripe Account**: Live mode enabled for payments
- **Brevo Account**: SMTP configured for transactional emails (optional)
- **Local Machine**: Node.js 18+ installed with pnpm or npm

### Required Access

```bash
# Verify you can access Vercel
vercel whoami

# Verify you can access GitHub
git remote -v

# Verify Supabase CLI installed
supabase --version

# Check Node.js version
node --version  # Should be 18.0.0 or higher
```

### Environment Variables Needed

All variables must be set in Vercel project settings. Do NOT commit to Git.

**Tier 1: Critical (Must Have)**

```
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_KEY=sb_private_...
```

**Tier 2: Important (Highly Recommended)**

```
BREVO_API_KEY=xkeysib-...
JWT_SECRET=<random-64-char-string>
PASSWORD_SALT=<random-32-char-string>
OTP_SECRET=<random-32-char-string>
```

**Tier 3: Optional (Nice-to-Have)**

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
NEXT_PUBLIC_APP_URL=https://dailyagile.com
NEXT_PUBLIC_BRAND_NAME=DailyAgile
PLATFORM_OWNER_USER_ID=f47ac10b-58cc-4372-a567-0e02b2c3d479
ACCESS_CODE=dailyagile-2026
MAX_TOKENS=1000
```

---

## Step-by-Step Deployment

### Step 1: Verify Git State (5 minutes)

```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Check status
git status
# Expected output: "On branch main, Your branch is up to date with 'origin/main'"

# Verify no uncommitted changes
git diff HEAD
# Should output nothing
```

### Step 2: Verify Environment Variables in Vercel (5 minutes)

Open Vercel dashboard: https://vercel.com/dashboard

Navigate to: **DailyAgile Project** → **Settings** → **Environment Variables**

**Verify these 6 critical variables are set:**

```
✓ ANTHROPIC_API_KEY (masked)
✓ STRIPE_SECRET_KEY (masked)
✓ STRIPE_WEBHOOK_SECRET (masked)
✓ SUPABASE_URL (visible)
✓ SUPABASE_ANON_KEY (visible)
✓ SUPABASE_SERVICE_KEY (masked)
```

**Action if missing:**
1. Click "Add New Environment Variable"
2. Enter name and value
3. Select environments: Production
4. Click "Save"

### Step 3: Run Database Migrations (10 minutes)

**IMPORTANT:** Migrations must be run BEFORE deploying new code that depends on them.

#### Migration 032: Webhook Error Handling & Idempotency

```bash
# Login to Supabase CLI
supabase login

# Set project (if multiple projects)
supabase projects list
supabase link --project-ref xxx

# Run migration 032
supabase migration up --name 032_webhook_error_handling_and_idempotency

# Verify migration succeeded
supabase status

# Expected output:
# 032_webhook_error_handling_and_idempotency.sql     [OK]
```

**Tables created by Migration 032:**
- `webhook_processing` (idempotency tracking)
- `webhook_deadletter` (failed webhooks for review)
- `stripe_transaction_idempotency` (transaction deduplication)

**Helper functions created:**
- `check_webhook_idempotency()` — Check if webhook already processed
- `mark_webhook_processing()` — Mark webhook as in-progress
- `mark_webhook_succeeded()` — Mark webhook as successful
- `mark_webhook_failed()` — Mark webhook as failed with error classification

#### Migration 040: Webhook Observability Infrastructure

```bash
# Run migration 040
supabase migration up --name 040_webhook_observability

# Verify migration succeeded
supabase status

# Expected output:
# 040_webhook_observability.sql                      [OK]
```

**Tables created by Migration 040:**
- `webhook_audit_logs` (immutable audit trail, PCI DSS compliant)
- `feature_flags` (dynamic feature flags, no app restart)
- `webhook_metrics` (time-series metrics for monitoring)

**Sample feature flags inserted:**
- `WEBHOOK_PROCESSING_ENABLED` (kill switch)
- `EMAIL_NOTIFICATIONS_ENABLED`
- `BILLING_PROCESSING_ENABLED`

### Step 4: Test Database Migrations (5 minutes)

**Verify tables exist in Supabase:**

```sql
-- Query 1: Check webhook_processing table
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'public' AND TABLE_NAME LIKE 'webhook%'
ORDER BY TABLE_NAME;

-- Expected output:
-- webhook_audit_logs
-- webhook_deadletter
-- webhook_metrics
-- webhook_processing

-- Query 2: Verify indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' AND tablename = 'webhook_processing'
ORDER BY indexname;

-- Expected output: (10+ indexes)
-- idx_webhook_processing_created_at
-- idx_webhook_processing_external_id
-- idx_webhook_processing_next_retry
-- idx_webhook_processing_resource
-- idx_webhook_processing_source_type
-- idx_webhook_processing_status
-- idx_webhook_processing_stripe_event_unique
-- ...

-- Query 3: Check feature flags
SELECT name, enabled, rollout_percentage FROM public.feature_flags 
ORDER BY name;

-- Expected output:
-- BILLING_PROCESSING_ENABLED        | t | 100
-- EMAIL_NOTIFICATIONS_ENABLED        | t | 100
-- METRICS_COLLECTION_ENABLED         | t | 100
-- STUDENT_ENROLLMENT_ENABLED         | t | 100
-- WEBHOOK_AUDIT_LOGGING_ENABLED      | t | 100
-- WEBHOOK_PROCESSING_ENABLED         | t | 100
```

### Step 5: Build and Deploy (10 minutes)

**Option A: Deploy via Vercel CLI (Recommended)**

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel deploy --prod

# Wait for build to complete (~3-5 minutes)

# Output will show deployment URL
# Expected: https://dailyagile.vercel.app
```

**Option B: Deploy via GitHub (Automatic)**

```bash
# Create a git tag for this deployment
git tag -a deploy-2026-08-23 -m "Webhook infrastructure deployment"

# Push tag (automatically triggers Vercel build)
git push origin deploy-2026-08-23

# Monitor build progress at:
# https://vercel.com/dashboard → DailyAgile → Deployments
```

**Option C: Manual Vercel Console Deploy**

1. Go to https://vercel.com/dashboard
2. Select DailyAgile project
3. Click "Deployments" tab
4. Click "New Deployment"
5. Select branch: `main`
6. Click "Deploy"

### Step 6: Verify Deployment (5 minutes)

```bash
# Check deployment status
vercel env list

# Test API endpoint
curl -X GET https://dailyagile.vercel.app/api/quiz/stripe/webhook/health

# Expected response:
# HTTP 200 OK
# { "status": "healthy" }

# Check Vercel logs for errors
vercel logs --since 2h

# Expected: No ERROR level logs
```

---

## Webhook Endpoint Registration

After deploying to Vercel, register the webhook endpoint with Stripe.

### Step 1: Get Endpoint URL

From Vercel dashboard, note the deployment URL:
```
https://dailyagile.vercel.app
```

The webhook endpoint URL is:
```
https://dailyagile.vercel.app/api/quiz/stripe/webhook
```

### Step 2: Register Webhook in Stripe

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add an endpoint"
3. Enter URL: `https://dailyagile.vercel.app/api/quiz/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed` (REQUIRED)
5. Click "Add endpoint"

### Step 3: Retrieve Webhook Secret

After adding endpoint, Stripe displays the webhook secret:

```
whsec_xxx...
```

**CRITICAL**: Copy this secret and update in Vercel:

```bash
# Update environment variable in Vercel
vercel env add STRIPE_WEBHOOK_SECRET

# Paste the secret when prompted

# Re-deploy to pick up the new secret
vercel deploy --prod
```

### Step 4: Test Webhook Delivery

**Send test event from Stripe:**

1. Go to https://dashboard.stripe.com/webhooks
2. Click the endpoint you just created
3. Click "Send test webhook"
4. Select event type: `checkout.session.completed`
5. Click "Send test event"

**Verify webhook was received:**

```bash
# Check webhook_processing table for test event
supabase sql query

SELECT id, external_id, status, event_type, created_at 
FROM public.webhook_processing 
ORDER BY created_at DESC 
LIMIT 5;

# Expected output: Test event should have status='succeeded' or 'processing'
```

**Alternative: Test via curl**

```bash
# Create test webhook payload
cat > /tmp/test_webhook.json <<'EOF'
{
  "id": "evt_test_12345",
  "object": "event",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_12345",
      "customer_email": "test@example.com",
      "amount_total": 5900,
      "currency": "usd",
      "metadata": {
        "course_id": "ai-for-business",
        "product_type": "quiz"
      }
    }
  }
}
EOF

# Get webhook secret from Vercel
WEBHOOK_SECRET=$(vercel env list | grep STRIPE_WEBHOOK_SECRET | awk '{print $2}')

# Sign the request
TIMESTAMP=$(date +%s)
SIGNATURE=$(echo -n "${TIMESTAMP}.$(cat /tmp/test_webhook.json)" | \
  openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')

# Send test request
curl -X POST https://dailyagile.vercel.app/api/quiz/stripe/webhook \
  -H "stripe-signature: t=${TIMESTAMP},v1=${SIGNATURE}" \
  -H "Content-Type: application/json" \
  -d @/tmp/test_webhook.json

# Expected response: HTTP 200 OK
# { "success": true }
```

---

## Post-Deployment Verification

### Health Checks (5 minutes)

Run these checks immediately after deployment:

```bash
# Check 1: API is responsive
curl -s -o /dev/null -w "%{http_code}" https://dailyagile.vercel.app/api/quiz/stripe/webhook/health
# Expected: 200

# Check 2: Database connection works
supabase sql query "SELECT current_timestamp;"
# Expected: current timestamp

# Check 3: Feature flags are readable
supabase sql query "SELECT COUNT(*) FROM public.feature_flags WHERE enabled = true;"
# Expected: 5+

# Check 4: No recent errors in logs
vercel logs --since 30m | grep ERROR
# Expected: (empty or no ERROR lines)
```

### Functional Tests (10 minutes)

**Test 1: Webhook Processing End-to-End**

```bash
# Simulate a Stripe checkout completion
# Use Stripe Dashboard test mode → Create test payment

# Verify student was created
supabase sql query "SELECT email, created_at FROM public.students WHERE email = 'test@example.com';"

# Verify billing record was created
supabase sql query "SELECT * FROM public.billing_history WHERE student_id = (SELECT id FROM students WHERE email = 'test@example.com' LIMIT 1);"

# Verify webhook was logged
supabase sql query "SELECT * FROM public.webhook_processing WHERE status = 'succeeded' ORDER BY created_at DESC LIMIT 1;"
```

**Test 2: Idempotency (Duplicate Event)**

```bash
# Send the same webhook twice (same event ID)
# Verify second attempt is marked as idempotent

supabase sql query "
  SELECT COUNT(*) as duplicate_count 
  FROM public.webhook_processing 
  WHERE external_id = 'evt_test_12345';
" 

# Expected: 1 record (only processed once)
```

**Test 3: Rate Limiting**

```bash
# Send 5 webhooks from same email within 60 seconds
# 4th and 5th should be rate-limited

supabase sql query "
  SELECT status, COUNT(*) 
  FROM public.webhook_processing 
  WHERE external_id LIKE 'evt_ratelimit%' 
  GROUP BY status;
"

# Expected: Some with status='failed' due to rate limit
```

---

## Monitoring Setup

### Production Metrics to Watch

Configure alerts in Vercel for:

**1. Error Rate**
- **Metric**: `error_count / total_requests`
- **Threshold**: Alert if > 1% over 5 minutes
- **Action**: Check webhook logs immediately

**2. Webhook Latency**
- **Metric**: `webhook_processing_duration_ms`
- **Threshold**: Alert if p95 > 5000ms
- **Action**: Check database performance

**3. Failed Webhooks**
- **Metric**: COUNT(*) WHERE status='failed' in webhook_deadletter
- **Threshold**: Alert if > 0 in 1 hour
- **Action**: Manual review required

**4. Database Connections**
- **Metric**: Active connections to webhook_processing table
- **Threshold**: Alert if > 20 concurrent connections
- **Action**: Check for query deadlocks

### Vercel Monitoring Dashboard

Set up Vercel alerts:

1. Go to https://vercel.com/dashboard/settings/monitoring
2. Configure alerts for:
   - **Status**: Alert on deployment failures
   - **Error Rate**: Alert if > 1% of requests fail
   - **Response Time**: Alert if p99 > 5s
   - **Build Time**: Alert if > 15 minutes

### Database Query for Monitoring

```sql
-- Query: Webhook health check (run every 5 minutes)
SELECT 
  DATE_TRUNC('minute', created_at)::timestamp as minute,
  COUNT(*) as total_webhooks,
  COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as succeeded,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN status = 'idempotent' THEN 1 END) as idempotent,
  ROUND(100.0 * COUNT(CASE WHEN status = 'succeeded' THEN 1 END) / COUNT(*), 2) as success_rate
FROM public.webhook_processing
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', created_at)
ORDER BY minute DESC;
```

---

## Rollback Procedures

### Scenario 1: Deployment Causes 500 Errors

**Symptom**: Vercel shows 50%+ error rate, webhooks failing

**Action:**

```bash
# Option 1: Revert to previous deployment
vercel rollback

# Option 2: Manual revert
git revert HEAD
git push origin main

# Monitor error rate
vercel logs --since 5m | grep ERROR | head -20
```

**Expected**: Error rate drops to < 1% within 2 minutes

### Scenario 2: Database Migration Failed

**Symptom**: Migration 032 or 040 failed to apply

**Action:**

```bash
# Check migration status
supabase migration status

# If migration is stuck:
supabase migration repair

# Re-run migration
supabase migration up --name 032_webhook_error_handling_and_idempotency

# Verify
supabase status
```

### Scenario 3: Webhook Secret Incorrect

**Symptom**: All webhooks return 401 Unauthorized

**Action:**

```bash
# Get correct secret from Stripe Dashboard
# Go to: https://dashboard.stripe.com/webhooks

# Update Vercel environment variable
vercel env add STRIPE_WEBHOOK_SECRET

# Paste correct secret

# Re-deploy
vercel deploy --prod

# Verify with test webhook
# (See "Test Webhook Delivery" section above)
```

### Scenario 4: Data Corruption or Loss

**Only if critical data was affected:**

```bash
# 1. Stop webhook processing immediately
supabase sql query "UPDATE public.feature_flags SET enabled = false WHERE name = 'WEBHOOK_PROCESSING_ENABLED';"

# 2. Restore from backup
# Contact Supabase support or your database administrator

# 3. Re-run migrations (if they were part of the issue)
supabase migration up

# 4. Verify data integrity
supabase sql query "SELECT COUNT(*) FROM public.students WHERE email_verified = true;"

# 5. Resume webhook processing
supabase sql query "UPDATE public.feature_flags SET enabled = true WHERE name = 'WEBHOOK_PROCESSING_ENABLED';"
```

---

## Emergency Contacts

### Escalation Path

**Level 1 — On-Call Engineer** (Response time: 15 minutes)
- Phone: [INSERT CONTACT]
- Slack: @dailyagile-oncall
- Availability: 24/7

**Level 2 — Platform Lead** (Response time: 30 minutes)
- Email: tkiran204@gmail.com
- Slack: @kiran
- Availability: 9am-6pm PT

**Level 3 — Third-Party Support**
- **Vercel Support**: https://vercel.com/support (Enterprise)
- **Supabase Support**: https://supabase.com/docs/guides/database/troubleshooting
- **Stripe Support**: https://support.stripe.com (Live chat in dashboard)

### Common Issues & Quick Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| Webhook secret wrong | 401 Unauthorized | See Scenario 3 above |
| Database migration failed | Table doesn't exist | See Scenario 2 above |
| High error rate | 500+ errors | Check Vercel logs, See Scenario 1 |
| Rate limiting | 429 Too Many Requests | Increase rate limit or wait 60 seconds |
| Email not sending | Student doesn't receive confirmation | Check BREVO_API_KEY, verify email queue |

---

## Deployment Summary Checklist

After completing deployment, mark off each item:

- [ ] Git main branch verified
- [ ] Environment variables verified in Vercel (6+ critical vars)
- [ ] Migration 032 applied successfully
- [ ] Migration 040 applied successfully
- [ ] Database tables verified (webhook_processing, webhook_audit_logs, etc.)
- [ ] Build completed without errors
- [ ] Deployment URL accessible and responsive
- [ ] Webhook endpoint registered in Stripe
- [ ] Webhook secret configured in Vercel
- [ ] Test webhook sent and logged successfully
- [ ] Health checks passed (API, DB, Logs)
- [ ] Functional tests passed (webhook, idempotency, rate limit)
- [ ] Monitoring dashboard configured
- [ ] Team notified of successful deployment
- [ ] This runbook reviewed with next on-call engineer

---

## Appendix: Useful Commands

```bash
# View deployment history
vercel deploy --list

# View current environment variables
vercel env list

# Add/update environment variable
vercel env add VARIABLE_NAME

# View logs
vercel logs --since 1h

# Check Supabase status
supabase status

# Run database query
supabase sql query "SELECT * FROM public.webhook_processing LIMIT 5;"

# Connect to database with psql
psql "postgresql://postgres:password@host:port/database"
```

---

**Document Control**
- Version: 2.0
- Last Updated: 2026-08-23
- Next Review: 2026-09-23
- Owner: Platform Operations Team
- Approval: [SIGN OFF]
