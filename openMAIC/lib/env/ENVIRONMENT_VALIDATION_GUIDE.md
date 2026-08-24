# Environment Validation System - Complete Guide

## Overview

This document describes the environment validation system that ensures all critical environment variables are set before the application runs.

**Key Feature:** Validation happens at **build time** and **startup**, failing immediately with clear error messages if required variables are missing.

---

## Critical Environment Variables

These variables **MUST** be set for the application to start:

### 1. STRIPE_SECRET_KEY
- **Description:** Stripe API secret key for payment processing
- **Format:** Must start with `sk_test_` (development) or `sk_live_` (production)
- **Example:** `sk_live_1234567890abcdefghijklmnop`
- **Where to get:** https://dashboard.stripe.com/apikeys
- **Used by:** Payment processing, Stripe client initialization

### 2. STRIPE_WEBHOOK_SECRET
- **Description:** Stripe webhook signing secret for validating incoming webhooks
- **Format:** Must start with `whsec_`
- **Example:** `whsec_test_1234567890abcdefghijklmnop`
- **Where to get:** https://dashboard.stripe.com/webhooks (click on your endpoint)
- **Used by:** Webhook signature validation in `/api/quiz/stripe/webhook`
- **Important:** Rotating this in Stripe invalidates the old secret immediately

### 3. SUPABASE_URL
- **Description:** Database connection URL for Supabase
- **Format:** Must be an HTTPS URL to supabase.co
- **Example:** `https://abc123xyz.supabase.co`
- **Where to get:** https://app.supabase.com > Settings > Database > Connection string
- **Used by:** All database operations through the Supabase client

### 4. SUPABASE_SERVICE_ROLE_KEY
- **Description:** Supabase service role API key for server-side database operations
- **Format:** JWT token (starts with `eyJ`)
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to get:** https://app.supabase.com > Settings > API
- **Security:** Keep this secret! Only use on server side, never expose to client
- **Used by:** Server-side API routes, webhook handlers

---

## Optional Environment Variables

These are recommended but not required for startup:

| Variable | Description | Impact if Missing |
|----------|-------------|-------------------|
| `NEXT_PUBLIC_APP_URL` | Application base URL for email links | Email links default to localhost:3000 |
| `BREVO_API_KEY` | Email service API key | Confirmation emails won't send |
| `LOG_LEVEL` | Logging level (error/warn/info/debug) | Defaults to 'info' |

---

## Validation Architecture

### 1. Build Time Validation
**File:** `next.config.ts`

When running `npm run build` or `pnpm build`:
- Imports `@/lib/env/validation` module
- All critical env vars are checked
- Build fails if any variable is missing
- Error output shows exactly which variables are missing

**Benefit:** Catch configuration errors before deploying

### 2. Runtime Validation
**Files:** `app/layout.tsx`, `lib/env/init.ts`

When the application server starts:
- App layout imports `@/lib/env/init`
- Validation runs on every server startup
- Logs summary of environment status
- Startup fails if critical variables are missing

**Benefit:** Ensures configuration is valid even if env vars change between build and deploy

### 3. Stripe Config Validation
**File:** `lib/server/stripe-config.ts`

When any Stripe-related API route is called:
- Validates `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
- Throws `StripeConfigError` if missing or invalid
- Prevents webhook processing with missing secret

**Benefit:** Additional layer of protection for payment-critical operations

---

## Error Messages

### Missing Critical Variable
```
❌ CRITICAL ENVIRONMENT VARIABLES MISSING
The following required variables are not set:
  - STRIPE_WEBHOOK_SECRET: Required for Stripe webhook processing
  - SUPABASE_URL: Required for database operations

Action: Set these variables in .env.local or deployment environment
Deployment will fail without these critical variables.

Reference: See CLAUDE.md for complete .env.local template
```

### Invalid Format
```
EnvironmentValidationError: Invalid format for STRIPE_SECRET_KEY.
Expected pattern: /^sk_(test_|live_)/
```

### Optional Variable Missing (Warning)
```
⚠️  OPTIONAL ENVIRONMENT VARIABLES NOT SET
These are recommended but not required:
  ⚠️  NEXT_PUBLIC_APP_URL: Application URL for email links and redirects
  ⚠️  BREVO_API_KEY: Email service API key (optional if not sending emails)

Note: Application will start without these, but some features may be limited
```

---

## Local Development Setup

### 1. Create `.env.local` File
```bash
# Copy the template (or create new file)
touch .env.local
```

### 2. Add Required Variables
```bash
# Stripe (get from https://dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# Supabase (get from https://app.supabase.com)
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional but recommended
NEXT_PUBLIC_APP_URL=http://localhost:3000
BREVO_API_KEY=...  # optional for email
```

### 3. Start Development Server
```bash
npm run dev
# or
pnpm dev
```

The validation should show:
```
✅ Environment validation passed - all critical variables set
[Init] ✅ All critical environment variables validated at startup
```

---

## Deployment Validation

### Vercel Deployment

1. **Set Environment Variables in Vercel Dashboard:**
   - Go to: Project > Settings > Environment Variables
   - Add all critical variables
   - Set scope to: All Environments (or Production/Preview/Development as needed)

2. **Verify Before Deploy:**
   ```bash
   # Build locally with production env vars
   export NODE_ENV=production
   npm run build
   ```

3. **Build Will Fail If Missing:**
   - Vercel build logs will show clear error message
   - Deploy is blocked (good!)
   - Fix env vars and redeploy

### Docker/Self-Hosted

1. **Set Environment Variables:**
   ```bash
   export STRIPE_SECRET_KEY=sk_live_...
   export STRIPE_WEBHOOK_SECRET=whsec_...
   export SUPABASE_URL=https://...
   export SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

2. **Build Docker Image:**
   ```bash
   docker build -t dailyagile-app .
   # Build will validate env vars
   ```

3. **Run Container:**
   ```bash
   docker run -e STRIPE_SECRET_KEY=... \
              -e STRIPE_WEBHOOK_SECRET=... \
              -e SUPABASE_URL=... \
              -e SUPABASE_SERVICE_ROLE_KEY=... \
              dailyagile-app
   ```

---

## Troubleshooting

### "Missing required environment variable: STRIPE_WEBHOOK_SECRET"

**Cause:** Webhook secret not set in `.env.local`

**Solution:**
1. Get webhook secret from Stripe Dashboard: https://dashboard.stripe.com/webhooks
2. Copy the webhook endpoint ID (starts with `whsec_`)
3. Add to `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...`
4. Restart dev server: `Ctrl+C`, then `npm run dev`

### Build Fails with "Critical Environment Variables Missing"

**Cause:** One or more required variables not set during build

**Solution:**
1. Check which variables are reported as missing in error message
2. Verify they're set in `.env.local` (for local builds)
3. Verify they're set in Vercel/Docker environment variables
4. Make sure file is named `.env.local` (not `.env` or `.env.example`)
5. Don't commit `.env.local` to git (it's in `.gitignore`)

### "Cannot find module '@/lib/env/validation'"

**Cause:** Validation module not yet written

**Solution:**
- File is located at: `openMAIC/lib/env/validation.ts`
- File should exist and be properly formatted
- Try clearing cache: `rm -rf .next && npm run dev`

### Webhook Processing Fails with "Webhook secret not configured"

**Cause:** STRIPE_WEBHOOK_SECRET is empty at webhook processing time

**Solution:**
1. This shouldn't happen if build validation passed
2. Check that env vars are set in production environment
3. Check Vercel/Docker logs for startup messages
4. Verify webhook endpoint URL is correct in Stripe Dashboard

### "STRIPE_WEBHOOK_SECRET is invalid"

**Cause:** Secret doesn't start with `whsec_`

**Solution:**
1. Go to Stripe Dashboard: https://dashboard.stripe.com/webhooks
2. Find your webhook endpoint
3. Click "Reveal" to see the signing secret
4. Copy the correct secret (should start with `whsec_`)
5. Replace value in environment

---

## Testing Validation

### Test 1: Build Time Validation
```bash
# Remove webhook secret
unset STRIPE_WEBHOOK_SECRET

# Try to build
npm run build

# Should fail with error about missing STRIPE_WEBHOOK_SECRET
```

### Test 2: Runtime Validation
```bash
# Clear env vars
unset STRIPE_SECRET_KEY

# Start dev server
npm run dev

# Should fail at startup with error message
```

### Test 3: Valid Configuration
```bash
# Set all required vars (from .env.local)
source .env.local

# Start dev server
npm run dev

# Should see:
# ✅ Environment validation passed - all critical variables set
# [Init] ✅ All critical environment variables validated at startup
```

---

## Reference Files

- **Validation Module:** `lib/env/validation.ts`
- **Runtime Init:** `lib/env/init.ts`
- **Stripe Config:** `lib/server/stripe-config.ts`
- **Build Config:** `next.config.ts`
- **App Layout:** `app/layout.tsx`
- **Webhook Handler:** `openMAIC/app/api/quiz/stripe/webhook/route.ts`

---

## Summary

The environment validation system provides:

✅ **Build-time validation** - Fails fast before deployment  
✅ **Runtime validation** - Catches env var changes at startup  
✅ **Clear error messages** - Shows exactly which variables are missing  
✅ **Multiple layers** - Build, runtime, and webhook-specific validation  
✅ **Zero silent failures** - Webhook won't process with missing secret  

This ensures production incidents related to missing configuration variables are **impossible**.
