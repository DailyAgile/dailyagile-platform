# Environment Setup Guide

Complete guide to configuring environments for DailyAgile Platform.

---

## Local Development Setup

### 1. Copy Environment Template

```bash
cd openMAIC
cp .env.local.example .env.local
```

### 2. Fill in Required Variables

Edit `.env.local` and add:

```bash
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Anthropic
ANTHROPIC_API_KEY=sk-ant-v0-... # Get from https://console.anthropic.com

# Supabase (use staging/dev database)
SUPABASE_URL=https://your-staging.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Optional: JWT Secret for local auth
JWT_SECRET=your-local-secret-min-32-chars
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Verify Database Connection

```bash
# Start dev server
pnpm dev

# In another terminal, test API
curl http://localhost:3000/api/health
# Should return: {"status":"ok"}
```

### 5. Run Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Type check
npx tsc --noEmit

# Lint
pnpm lint
```

### 6. Verify Setup

```bash
# Check all environment variables are loaded
echo "Node env: $NODE_ENV"
echo "Supabase URL: $SUPABASE_URL"
echo "App URL: $NEXT_PUBLIC_APP_URL"
```

---

## Staging Environment (Vercel Preview)

### Where to Configure

**Vercel Project Settings**: https://vercel.com/dashboard/project/dailyagile-platform/settings/environment-variables

### Required Variables

```
Environment: Preview

VERCEL_ENV=staging
SUPABASE_URL=https://staging.supabase.co
SUPABASE_ANON_KEY=eyJ...staging...
SUPABASE_SERVICE_KEY=eyJ...staging...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=https://staging-dailyagile.vercel.app
```

### Optional Variables

```
LOG_LEVEL=debug
SENTRY_AUTH_TOKEN=...
```

### Automatic Deployment

- Every push to `main` automatically deploys to staging
- Staging URL: https://staging-dailyagile.vercel.app
- Takes 2-5 minutes

### Test Staging

```bash
# Check if staging is online
curl https://staging-dailyagile.vercel.app/api/health

# View logs
vercel logs --project=dailyagile-platform --since=1h
```

---

## Production Environment (Vercel)

### Where to Configure

**Vercel Project Settings**: https://vercel.com/dashboard/project/dailyagile-platform/settings/environment-variables

### Required Variables

```
Environment: Production

VERCEL_ENV=production
SUPABASE_URL=https://reconnection.supabase.co
SUPABASE_ANON_KEY=eyJ...production...
SUPABASE_SERVICE_KEY=eyJ...production...
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://dailyagile.com
SENTRY_AUTH_TOKEN=...
```

### Optional Variables

```
LOG_LEVEL=info
STRIPE_TRACK_A_PRICE_ID=price_...
STRIPE_TRACK_B_ENGINEER_PRICE_ID=price_...
STRIPE_TRACK_B_DEVOPS_PRICE_ID=price_...
STRIPE_BUNDLE_PRICE_ID=price_...
```

### Manual Deployment

Production deployments are manual-only:

```bash
# Via GitHub Actions
gh workflow run deploy.yml -f environment=production -r main

# Then monitor:
# https://github.com/DailyAgile/dailyagile-platform/actions
```

---

## Environment Variable Reference

### Application Variables

| Variable | Type | Environment | Required | Example | Notes |
|---|---|---|---|---|---|
| `NODE_ENV` | string | All | Yes | `development` | Set by deployment platform |
| `VERCEL_ENV` | string | All | Yes | `production` | Set by Vercel |
| `NEXT_PUBLIC_APP_URL` | URL | All | Yes | `https://dailyagile.com` | Public-facing URL |
| `NEXT_PUBLIC_BRAND_NAME` | string | All | No | `DailyAgile` | Brand name |

### Anthropic / LLM

| Variable | Type | Env | Req | Example | Notes |
|---|---|---|---|---|---|
| `ANTHROPIC_API_KEY` | secret | All | Yes | `sk-ant-v0-...` | Get from https://console.anthropic.com |
| `DEFAULT_MODEL` | string | All | Yes | `anthropic:claude-3-5-haiku-20241022` | Can be any configured model |

### Supabase

| Variable | Type | Env | Req | Notes |
|---|---|---|---|---|
| `SUPABASE_URL` | URL | All | Yes | From Supabase project settings |
| `SUPABASE_ANON_KEY` | secret | All | Yes | Public key (safe in browser) |
| `SUPABASE_SERVICE_KEY` | secret | All | Yes | Secret key (server-only) |
| `SUPABASE_JWT_SECRET` | secret | All | No | For RLS policies |

### Authentication

| Variable | Type | Env | Req | Notes |
|---|---|---|---|---|
| `JWT_SECRET` | secret | All | No | Min 32 chars. Generate: `openssl rand -base64 32` |
| `ACCESS_CODE` | string | All | No | Monthly rotating code for course access |

### Stripe (Payments)

| Variable | Type | Env | Req | Notes |
|---|---|---|---|---|
| `STRIPE_PUBLIC_KEY` | secret | All | No | pk_test_* (dev) or pk_live_* (prod) |
| `STRIPE_SECRET_KEY` | secret | All | No | sk_test_* (dev) or sk_live_* (prod) |
| `STRIPE_WEBHOOK_SECRET` | secret | All | No | whsec_... for webhook verification |
| `STRIPE_*_PRICE_ID` | string | All | No | Product price IDs from Stripe |

### Error Tracking & Monitoring

| Variable | Type | Env | Req | Notes |
|---|---|---|---|---|
| `SENTRY_AUTH_TOKEN` | secret | All | No | From https://sentry.io |
| `NEXT_PUBLIC_SENTRY_DSN` | URL | All | No | Public DSN for client errors |
| `LOG_LEVEL` | enum | All | No | `debug`, `info`, `warn`, `error` |

### Text-to-Speech

| Variable | Type | Env | Req | Notes |
|---|---|---|---|---|
| `TTS_ELEVENLABS_API_KEY` | secret | All | No | For video narration |
| `TTS_ELEVENLABS_BASE_URL` | URL | All | No | Usually: `https://api.elevenlabs.io` |

### Email & Notifications

| Variable | Type | Env | Req | Notes |
|---|---|---|---|---|
| `GMAIL_USER` | email | All | No | support@dailyagile.com (not tkiran204@) |
| `SENDGRID_API_KEY` | secret | All | No | Alternative to Gmail |

---

## How to Get API Keys

### Anthropic API Key

1. Go to: https://console.anthropic.com
2. Sign in with Claude account (must be Claude Pro subscriber)
3. Navigate to: API keys
4. Click: "Create new API key"
5. Copy the key starting with `sk-ant-`
6. Store in Vercel environment variables

### Supabase Keys

1. Go to: https://supabase.co/dashboard/projects
2. Select the project
3. Click: Settings → API
4. Copy:
   - `SUPABASE_URL`: Project URL
   - `SUPABASE_ANON_KEY`: Anon public key (safe in browser)
   - `SUPABASE_SERVICE_KEY`: Service role key (server-only)

### Stripe Keys

1. Go to: https://dashboard.stripe.com/apikeys
2. Toggle: "Show test data" or "Show live data"
3. Copy:
   - `STRIPE_PUBLIC_KEY`: Publishable key
   - `STRIPE_SECRET_KEY`: Secret key
4. Get webhook secret:
   - Webhooks → Add endpoint
   - URL: `https://dailyagile.com/api/webhooks/stripe`
   - Events: `charge.succeeded`, `charge.failed`, `customer.subscription.updated`
   - Copy webhook secret

### Sentry Token

1. Go to: https://sentry.io/organizations/dailyagile/
2. Settings → Auth Tokens
3. Create new token with scopes: `project:releases:write`
4. Copy the token

### JWT Secret (Local Only)

Generate a secure random string:

```bash
# macOS/Linux
openssl rand -base64 32

# Or online: https://generate-random.org/base64-password-generator
```

---

## Database Setup

### Local Development

```bash
# Start Supabase locally
supabase start

# This runs a local PostgreSQL + emulated Supabase

# To stop:
supabase stop
```

### Staging Database

Uses a separate Supabase project or separate schema:

```bash
# List all databases
supabase projects list

# Check staging project ref
# Should see: staging-* in the project name
```

### Production Database

- **Project Name:** reconnection
- **URL:** https://reconnection.supabase.co

### Running Migrations

```bash
# List pending migrations
supabase migration list --project-ref <project-ref>

# Apply migrations
supabase migration deploy --project-ref <project-ref>

# Create new migration
supabase migration new <name>
```

---

## Vercel Project Setup

### First Time Setup

1. **Link repository**:
   ```bash
   cd openMAIC
   vercel link
   # Select: DailyAgile (organization)
   # Select: dailyagile-platform (project)
   ```

2. **Set environment variables**:
   - Go to: https://vercel.com/dashboard/project/dailyagile-platform/settings/environment-variables
   - Add all required variables (see above)
   - Set "Environments" per variable (Preview, Production, or Both)

3. **Configure domains**:
   - Production: dailyagile.com
   - Staging: staging-dailyagile.vercel.app (auto-configured)

### Deploy Manually (if needed)

```bash
# Test locally first
pnpm build
pnpm start

# Then deploy
vercel --prod  # production
vercel          # staging
```

---

## Troubleshooting

### Issue: "Cannot find env var ANTHROPIC_API_KEY"

**Cause:** Variable not set in Vercel

**Fix:**
1. Go to: https://vercel.com/dashboard/project/dailyagile-platform/settings/environment-variables
2. Add: `ANTHROPIC_API_KEY` with your key
3. Redeploy: `vercel --prod`

### Issue: "Supabase connection failed"

**Cause:** Wrong SUPABASE_URL or SUPABASE_ANON_KEY

**Fix:**
1. Verify URL format: `https://xxx.supabase.co`
2. Verify key starts with: `eyJ`
3. Make sure not using SERVICE_KEY in browser (use ANON_KEY)
4. Check Supabase project is not paused

### Issue: Tests fail with "Cannot connect to database"

**Cause:** Test environment using wrong database

**Fix:**
1. Check `.env.local` has SUPABASE_URL pointing to staging
2. Ensure Supabase project is not paused
3. Try: `supabase start` for local testing
4. Or skip tests locally: `SKIP_ENV_VALIDATION=true pnpm build`

### Issue: Vercel deployment hangs or times out

**Cause:** Long build time or test timeout

**Fix:**
1. Increase Vercel function timeout: vercel.json → `maxDuration: 300` (5 min)
2. Increase Playwright timeout: playwright.config.ts → `timeout: 60000`
3. Reduce parallel concurrency: set `PARALLEL_SCENE_CONCURRENCY=1`

### Issue: Missing environment variables in Vercel logs

**Cause:** Variables not configured for environment

**Fix:**
1. Edit `.env.local.example` with new variable
2. Add to Vercel: Settings → Environment Variables
3. Redeploy
4. Verify in Vercel logs

---

## Security Best Practices

1. **Never commit secrets**: `.env.local` is in `.gitignore`
2. **Rotate keys monthly**: Set calendar reminder to rotate API keys
3. **Use Vercel secrets only**: Don't hardcode in code
4. **Separate staging/prod databases**: Different credentials
5. **Review env var access**: Only team members need access
6. **Audit API key usage**: Check Vercel activity logs monthly
7. **JWT_SECRET**: Generate new one, rotate quarterly

---

## Verification Checklist

Before launching:

- [ ] Local dev setup works: `pnpm dev` and `pnpm test` pass
- [ ] Staging URL is accessible: https://staging-dailyagile.vercel.app
- [ ] Production URL is configured: https://dailyagile.com
- [ ] All env vars set in Vercel (Preview and Production)
- [ ] Database migrations tested
- [ ] Email/SMS templates configured
- [ ] Error tracking (Sentry) configured
- [ ] Monitoring alerts set up
- [ ] Stripe webhooks configured
- [ ] SSL certificate is valid
- [ ] Performance is acceptable (<500ms response time)
- [ ] All tests passing in CI/CD

---

**Last Updated:** August 2026
**Next Review:** Monthly or after adding new dependencies
