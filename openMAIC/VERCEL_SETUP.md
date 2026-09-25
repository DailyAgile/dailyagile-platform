# Vercel Configuration & Secrets Setup

Complete guide to configuring Vercel for DailyAgile Platform.

---

## Initial Vercel Project Setup

### Step 1: Connect GitHub Repository

1. Go to: https://vercel.com/new
2. **Import Git Repository**: Select "GitHub"
3. **Choose Repository**: DailyAgile/dailyagile-platform
4. **Create Organization**: DailyAgile (if not already created)
5. **Click "Import"**

### Step 2: Configure Project

1. **Project Name**: dailyagile-platform
2. **Framework**: Next.js (auto-detected)
3. **Root Directory**: `openMAIC`
4. **Build Command**: `pnpm build`
5. **Install Command**: `pnpm install`
6. **Output Directory**: `.next`

### Step 3: Set Environment Variables

Go to: https://vercel.com/dashboard/project/dailyagile-platform/settings/environment-variables

Add variables for each environment (see below).

### Step 4: Deploy

Click "Deploy" and wait for initial deployment (~5 minutes).

---

## Environment Variables by Environment

### All Environments (Preview + Production)

These variables apply to ALL deployments (staging and production):

| Key | Value | Scope |
|---|---|---|
| `NODE_ENV` | `production` | All |
| `NEXT_PUBLIC_APP_URL` | Set per environment below | All |
| `NEXT_PUBLIC_BRAND_NAME` | `DailyAgile` | All |
| `DEFAULT_MODEL` | `anthropic:claude-3-5-haiku-20241022` | All |
| `LOG_LEVEL` | `info` | All |

### Preview/Staging Environment

Go to Vercel Settings → Environment Variables

**Add these with scope "Preview & Development":**

| Key | Value | Notes |
|---|---|---|
| `VERCEL_ENV` | `staging` | For code to detect staging |
| `NEXT_PUBLIC_APP_URL` | `https://staging-dailyagile.vercel.app` | Public staging URL |
| `SUPABASE_URL` | `https://staging.supabase.co` | Staging DB URL |
| `SUPABASE_ANON_KEY` | `eyJ...` (staging anon key) | Get from Supabase project settings |
| `SUPABASE_SERVICE_KEY` | `eyJ...` (staging service key) | Get from Supabase project settings |
| `SUPABASE_JWT_SECRET` | `your-staging-jwt-secret` | For local RLS testing |
| `ANTHROPIC_API_KEY` | `sk-ant-v0-...` | From console.anthropic.com |
| `SENTRY_AUTH_TOKEN` | `sentry_token_...` | For Sentry deployment tracking |

### Production Environment

**Add these with scope "Production":**

| Key | Value | Notes |
|---|---|---|
| `VERCEL_ENV` | `production` | For code to detect production |
| `NEXT_PUBLIC_APP_URL` | `https://dailyagile.com` | Production URL |
| `SUPABASE_URL` | `https://reconnection.supabase.co` | Production DB URL |
| `SUPABASE_ANON_KEY` | `eyJ...` (prod anon key) | Get from production Supabase project |
| `SUPABASE_SERVICE_KEY` | `eyJ...` (prod service key) | Get from production Supabase project |
| `SUPABASE_JWT_SECRET` | `your-prod-jwt-secret` | Production JWT secret |
| `ANTHROPIC_API_KEY` | `sk-ant-v0-...` | Production API key |
| `STRIPE_PUBLIC_KEY` | `pk_live_...` | From Stripe live keys (if payments) |
| `STRIPE_SECRET_KEY` | `sk_live_...` | From Stripe live keys (if payments) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | From Stripe webhook config |
| `SENTRY_AUTH_TOKEN` | `sentry_token_...` | For Sentry deployment tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | `https://abc@123.ingest.sentry.io/456` | Public Sentry DSN |

### Optional Variables (for future features)

Add these when needed:

| Key | Environment | Use Case |
|---|---|---|
| `STRIPE_TRACK_A_PRICE_ID` | All | Track A course pricing |
| `STRIPE_TRACK_B_ENGINEER_PRICE_ID` | All | Track B Engineer course |
| `STRIPE_TRACK_B_DEVOPS_PRICE_ID` | All | Track B DevOps course |
| `STRIPE_BUNDLE_PRICE_ID` | All | Bundle pricing |
| `TTS_ELEVENLABS_API_KEY` | All | Video narration |
| `GMAIL_USER` | All | Email notifications |

---

## How to Add Environment Variables

### Via Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/dashboard/project/dailyagile-platform/settings/environment-variables
2. Click "Add New"
3. **Name**: Enter variable name (e.g., `SUPABASE_URL`)
4. **Value**: Enter the value
5. **Environments**: Select scope:
   - **Preview & Development**: For staging deployments
   - **Production**: For production only
   - **Production & Preview & Development**: For all (use sparingly)
6. Click "Save"

### Via Vercel CLI

```bash
# Set for staging
vercel env add SUPABASE_URL --scope production

# Verify
vercel env ls
```

---

## Getting API Keys and Secrets

### Anthropic API Key

1. Go to: https://console.anthropic.com
2. Click "API Keys" in left sidebar
3. Click "Create new API key"
4. Copy the key (starts with `sk-ant-`)
5. Paste into Vercel environment variables

### Supabase Keys

1. Go to: https://supabase.co/dashboard/projects
2. Select project (staging or production)
3. Click "Settings" → "API"
4. Copy:
   - **Project URL**: The `SUPABASE_URL`
   - **Anon Key**: The `SUPABASE_ANON_KEY` (public, safe in browser)
   - **Service Role Key**: The `SUPABASE_SERVICE_KEY` (secret, server-only)
5. Paste into Vercel

### Sentry DSN

1. Go to: https://sentry.io/organizations/dailyagile/projects/
2. Select project: openmai
3. Click "Settings" → "Client Keys (DSN)"
4. Copy the DSN (starts with `https://`)
5. Paste as `NEXT_PUBLIC_SENTRY_DSN`

### Stripe Keys

1. Go to: https://dashboard.stripe.com/apikeys
2. Toggle between "Test" and "Live" data
3. Copy:
   - **Publishable Key**: The `STRIPE_PUBLIC_KEY`
   - **Secret Key**: The `STRIPE_SECRET_KEY`
4. For webhook secret:
   - Click "Webhooks"
   - Find endpoint: `https://dailyagile.com/api/webhooks/stripe`
   - Copy the signing secret as `STRIPE_WEBHOOK_SECRET`
5. Paste into Vercel

---

## Vercel Deployment Settings

### Build Settings

Go to: https://vercel.com/dashboard/project/dailyagile-platform/settings/git

**Verify:**
- Build Command: `pnpm build`
- Install Command: `pnpm install`
- Output Directory: `.next`
- Root Directory: `openMAIC`

### Function Configuration

Go to: https://vercel.com/dashboard/project/dailyagile-platform/settings/functions

**Set function runtime:**
- Node.js version: 20 (matches package.json)
- Memory: 1024 MB
- Max duration: 300 seconds (5 minutes)

### Domain Configuration

Go to: https://vercel.com/dashboard/project/dailyagile-platform/settings/domains

**Domains:**
- Production: `dailyagile.com`
- Staging: `staging-dailyagile.vercel.app` (auto-configured)

**SSL:**
- Should be automatic (Vercel provides free SSL)
- Verify certificate is valid

### Redirect Rules (if needed)

Go to: https://vercel.com/dashboard/project/dailyagile-platform/settings/redirects

**Examples:**

```
Source: /academy
Destination: /
Status: 307 (Temporary Redirect)

Source: /.well-known/security.txt
Destination: /security.txt
Status: 200
```

### Middleware

If you need to add middleware (authentication, redirects, etc.):

Create `middleware.ts` in project root:

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Add custom middleware logic here
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

---

## Vercel Monitoring

### Check Deployment Status

1. Go to: https://vercel.com/dashboard/project/dailyagile-platform/deployments
2. Click on any deployment to see:
   - Build logs
   - Function logs
   - Deployment duration
   - Errors (if any)

### View Analytics

1. Go to: https://vercel.com/dashboard/project/dailyagile-platform/analytics
2. Monitor:
   - Response times (should be < 500ms)
   - Status codes (should be > 99% 2xx)
   - Edge locations
   - Bandwidth usage

### View Function Logs

1. Go to: https://vercel.com/dashboard/project/dailyagile-platform/monitoring
2. Click on a function to view:
   - Execution time
   - Memory usage
   - Errors
   - Real-time logs (during deployment)

### Vercel CLI Monitoring

```bash
# View live logs (streaming)
vercel logs dailyagile-platform --follow

# View past logs (last 1 hour)
vercel logs dailyagile-platform --since 1h

# View specific function
vercel logs dailyagile-platform -- /api/health
```

---

## Preview Deployments

### What is a Preview Deployment?

- Automatic deployment created for each push to main
- URL: `https://dailyagile-platform-git-[branch].vercel.app`
- Staging environment (uses staging variables)
- Useful for testing before production merge

### How to Access Preview Deployment

1. Go to: https://vercel.com/dashboard/project/dailyagile-platform/deployments
2. Find the deployment for your commit
3. Click the URL to open it
4. Or click "Visit" button

### Share Preview URL

```bash
# Get preview URL from Vercel CLI
vercel link  # Shows the preview URL

# Or find in Vercel dashboard and share directly
# Example: https://dailyagile-platform-git-feature-branch.vercel.app
```

---

## Rollback Deployment

### Quick Rollback (< 2 minutes)

1. Go to: https://vercel.com/dashboard/project/dailyagile-platform/deployments
2. Find a previous known-good deployment (check date)
3. Click on it
4. Click "Promote to Production"
5. Confirm the action

### Full Rollback (via Git)

1. Identify the last good commit:
   ```bash
   git log --oneline
   # Find the hash of a known-good commit
   ```

2. Create a revert commit:
   ```bash
   git revert HEAD
   # This creates a new commit that undoes the last commit
   ```

3. Push to trigger re-deployment:
   ```bash
   git push origin main
   # Vercel automatically deploys
   ```

---

## Vercel Secrets vs. Environment Variables

**Use Secrets for:**
- API keys (Anthropic, Stripe, etc.)
- Tokens (JWT, OAuth, etc.)
- Passwords
- Webhook secrets

**Use Environment Variables for:**
- URLs
- Feature flags
- Configuration
- Public values (prefixed with `NEXT_PUBLIC_`)

**In Vercel, they're the same thing** — just use "Environment Variables" section for both.

---

## Vercel Security Best Practices

1. **Rotate secrets monthly**:
   - Generate new API key in original service
   - Update in Vercel
   - Delete old key

2. **Use least privilege**:
   - Don't share production variables with team members
   - Use preview variables for development

3. **Monitor access**:
   - Check "Settings" → "Team members"
   - Only give access to who needs it
   - Review access monthly

4. **Audit logs**:
   - Check who deployed what and when
   - Vercel shows deployment history

5. **Never commit secrets**:
   - `.env.local` and `.env.local.example` are in `.gitignore`
   - Always use Vercel for sensitive values

---

## Troubleshooting

### Issue: "Missing required environment variable"

**Cause:** Variable not set in Vercel

**Fix:**
```bash
# 1. Check what's missing in build logs
# Vercel Dashboard → Click failing deployment

# 2. Add missing variable
# Settings → Environment Variables

# 3. Redeploy
vercel --prod
```

### Issue: "Deployment hangs or times out"

**Cause:** Build takes too long (> 15 min timeout)

**Fix:**
```bash
# 1. Check build logs for bottleneck
# Usually: tests taking too long

# 2. Optimize:
#    - Skip tests: SKIP_ENV_VALIDATION=true
#    - Reduce test suite
#    - Increase function timeout in vercel.json

# 3. Update vercel.json:
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 300  # Increase to 5 min
    }
  }
}

# 4. Commit and redeploy
```

### Issue: "Environment variables not found in logs"

**Cause:** Variables set for wrong environment scope

**Fix:**
```bash
# 1. Check variable scope
# Go to Settings → Environment Variables

# 2. For staging: scope should be "Preview & Development"
# For production: scope should be "Production"

# 3. Redeploy after fixing scope
vercel --prod
```

### Issue: "Works on staging but broken on production"

**Cause:** Different environment variables or data

**Fix:**
1. Compare env vars between staging and production
2. Check which var is different
3. Verify production var value is correct
4. Check production database has correct data
5. Redeploy if env var was wrong

---

## Vercel Pricing & Limits

### Free Plan (Current Setup)

- Deployments: Unlimited
- Bandwidth: 100GB/month
- Serverless Functions: 100 hours/month
- Build time: 6000 minutes/month
- Concurrent builds: 1

### When to Upgrade

- Approaching 100GB bandwidth/month → Upgrade
- Approaching 100 function hours/month → Optimize or upgrade
- Need team collaboration features → Upgrade to Pro

### Cost Estimation

- **Current usage**: < $20/month
- **Projected Year 1**: $200-500/month (with growth)
- **Projected Year 2**: $500-1500/month (with 500+ students)

---

## Links & Resources

| Resource | URL |
|---|---|
| Vercel Dashboard | https://vercel.com/dashboard |
| Project Settings | https://vercel.com/dashboard/project/dailyagile-platform/settings |
| Environment Variables | https://vercel.com/dashboard/project/dailyagile-platform/settings/environment-variables |
| Deployments | https://vercel.com/dashboard/project/dailyagile-platform/deployments |
| Analytics | https://vercel.com/dashboard/project/dailyagile-platform/analytics |
| Vercel Docs | https://vercel.com/docs |
| Next.js Deployment | https://nextjs.org/docs/deployment |

---

**Last Updated:** August 2026
**Keep this document updated as Vercel changes**
