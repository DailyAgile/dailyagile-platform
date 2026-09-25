# PRODUCTION LAUNCH GUIDE

**Date:** 2026-08-13  
**Status:** Ready for launch  
**Platform:** DailyAgile Quiz MVP  

---

## **📋 PRE-LAUNCH CHECKLIST** 

### **1. SUPABASE PRODUCTION DATABASE** 

#### Step 1: Create Production Project
```
1. Login to supabase.com
2. Click "New Project"
3. Name: "dailyagile-quiz-production"
4. Region: Select based on users (us-east-1, eu-west-1, etc)
5. Password: Generate strong password
6. Click "Create new project"
```

#### Step 2: Get Connection Details
```
1. Go to Project Settings → API
2. Copy: Project URL → SUPABASE_URL
3. Copy: anon public key → SUPABASE_ANON_KEY
4. Copy: service_role secret → SUPABASE_SERVICE_KEY
```

#### Step 3: Run Migrations
```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="eyJ..."

# Push all migrations (including new Phase 2 tables)
npx supabase db push

# Verify migration
npx supabase db list
```

Expected tables (17 total):
- students, quizzes, quiz_questions, quiz_attempts
- quiz_assignments, quiz_snapshots
- quiz_answers, quiz_results
- assignment_extension_requests
- admin_audit_logs
- certificates ← NEW
- quiz_engagement ← NEW
- analytics_summary ← NEW
- feature_flags, feature_flag_overrides
- instructor_bulk_uploads, instructor_bulk_upload_rows

#### Step 4: Enable Backups
```
1. Go to Project Settings → Backups
2. Enable: Daily backups (automatic)
3. Enable: Point-in-time recovery (PITR)
4. Set retention: 30 days
```

#### Step 5: Security Configuration
```
1. Go to Authentication → Settings
2. Site URL: https://yourdomain.com
3. Redirect URLs: https://yourdomain.com/auth/callback
4. JWT expiration: 604800 (7 days) ✓ Already set
5. JWT secret: Generate new one for production
```

---

### **2. STRIPE TEST ACCOUNT SETUP**

#### You Already Have: Test Account
- [ ] Test mode enabled (toggle in top-right)
- [ ] Test API keys visible
- [ ] Webhook signing secret ready

#### Step 1: Get Test Keys
```
1. Login to dashboard.stripe.com (test mode)
2. Go to Developers → API keys
3. Copy:
   - Publishable key (pk_test_...)   → STRIPE_PUBLISHABLE_KEY
   - Secret key (sk_test_...)         → STRIPE_SECRET_KEY
```

#### Step 2: Configure Webhooks
```
1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. URL: https://yourdomain.com/api/webhooks/stripe
   (For local testing: use ngrok or local tunnel)
4. Events: Select
   - payment_intent.succeeded
   - payment_intent.failed
   - charge.refunded
5. Copy webhook secret (whsec_...) → STRIPE_WEBHOOK_SECRET
```

#### Step 3: Create Test Products
```bash
# Use Stripe CLI for faster testing:
npm install -g @stripe/cli

# Authenticate
stripe login

# Create product and price
stripe products create \
  --name "DailyAgile Quiz - Beginner" \
  --description "Entry-level quiz course"

# List products to get product ID
stripe products list

# Create price (one-time payment)
stripe prices create \
  --unit-amount 9900 \
  --currency usd \
  --product "prod_..." \
  --billing-scheme per_unit
```

#### Step 4: Test Payment Flow
```bash
# Create test payment with test card
# Card: 4242 4242 4242 4242
# Expiry: 12/34
# CVC: 567

curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "productId": "prod_...",
    "priceId": "price_..."
  }'
```

---

### **3. BREVO EMAIL VERIFICATION**

#### You Already Have: Configuration
- ✅ BREVO_API_KEY
- ✅ BREVO_SENDER_EMAIL (support@dailyagile.com)
- ✅ Email templates for: login codes, certificates, receipts

#### Step 1: Verify Sender Domain
```
1. Login to brevo.com
2. Go to Senders & contacts → Senders
3. Verify: support@dailyagile.com is approved
4. If not approved:
   - Click "Verify new sender"
   - Add MX/SPF records to your domain
   - Wait for verification (~2 hours)
```

#### Step 2: Test Email Sending
```bash
# Test certificate email
curl -X POST https://api.brevo.com/v3/smtp/email \
  -H "api-key: $BREVO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"email": "your-email@example.com"}],
    "sender": {"email": "support@dailyagile.com", "name": "DailyAgile"},
    "subject": "Your Certificate is Ready",
    "htmlContent": "<h1>Congratulations!</h1><p>You passed the quiz.</p>"
  }'

# Check Brevo logs for delivery status
```

#### Step 3: Configure Email Templates
```
In Brevo Dashboard:
1. Go to Email templates
2. Create/update templates for:
   - Login verification code
   - Certificate issued
   - Payment receipt
   - Quiz completed notification
3. Test each template with variables
```

#### Step 4: Set Up Bounce Handling
```
1. Go to Settings → Notifications
2. Enable: Bounce notifications
3. Add email for bounce alerts
4. Set up: Automatic unsubscribe on hard bounce
```

---

### **4. ENVIRONMENT VARIABLES**

Create `.env.production`:

```env
# Supabase Production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ... (from API settings)
SUPABASE_SERVICE_KEY=eyJ... (from API settings)

# Stripe Test (keep for MVP, switch to live later)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# Brevo Email
BREVO_API_KEY=your-api-key-here
BREVO_SENDER_EMAIL=support@dailyagile.com

# JWT
JWT_SECRET=generate-random-secret-here

# App Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Analytics (Optional)
SENTRY_DSN=https://...@sentry.io/...
```

---

### **5. VERCEL DEPLOYMENT**

#### Step 1: Connect Production Environment
```
1. Go to vercel.com → Your project
2. Settings → Environment Variables
3. Add all vars from `.env.production`
4. Scope: Production only
5. Click "Save"
```

#### Step 2: Pre-Deployment Checks
```bash
# Local verification
npm run build          # Must complete successfully
npm run test           # Must pass
npm run lint           # Must pass no errors

# Staging deployment (if available)
git push origin main   # Triggers staging deploy
```

#### Step 3: Production Deployment
```bash
# Automatic: Pushing to main deploys to production
# OR manual: Click "Deploy" in Vercel dashboard

# Monitor deployment
# Check: Vercel → Deployments → Production
# Verify: Site loads at https://yourdomain.com
```

---

### **6. POST-DEPLOYMENT VERIFICATION**

**Hour 1: Smoke Tests**
- [ ] Homepage loads
- [ ] Student signup works
- [ ] Student login works
- [ ] Quiz taking works (offline mode)
- [ ] Submission completes
- [ ] Certificate generated
- [ ] Analytics dashboard loads
- [ ] Leaderboard displays

**Hour 2: Payment Flow**
- [ ] Test student purchase (Stripe test card)
- [ ] Webhook received
- [ ] Student gets ACCESS_CODE
- [ ] Welcome email sent (Brevo)
- [ ] Progress tracked

**Hour 3: Admin Tests**
- [ ] Instructor can login
- [ ] Can create quiz
- [ ] Can view results
- [ ] Can manage extensions
- [ ] Bulk upload works

**Hour 4: Monitoring**
- [ ] Error logs empty (Sentry)
- [ ] Database performing (Supabase)
- [ ] Emails delivered (Brevo)
- [ ] Stripe webhooks firing

---

## **🚨 ROLLBACK PLAN**

If critical issue found:

```bash
# Option 1: Revert to previous commit
git revert HEAD
git push origin main

# Option 2: Rebuild from known-good commit
git checkout [known-good-commit]
git push --force origin main

# Option 3: Database restoration
# In Supabase: Settings → Backups → Restore from backup
```

---

## **📞 SUPPORT CONTACTS**

| Service | Contact | Status |
|---------|---------|--------|
| Supabase | supabase.com/support | Status page: status.supabase.com |
| Stripe | stripe.com/support | 24/7 webhook logs in dashboard |
| Brevo | brevo.com/support | Email logs in dashboard |
| Vercel | vercel.com/support | Automatic rollback available |

---

## **✅ LAUNCH READY**

All systems are configured and ready to deploy. Follow this guide in order and you'll have a production-grade platform live within 2 hours.

**Estimated setup time:** 60-90 minutes  
**Downtime risk:** None (all services are parallel)  
**Rollback time:** <5 minutes  

🚀 **Ready to go live!**

