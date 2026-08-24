# Environment Validation System

Complete startup validation system that ensures all critical environment variables are configured before the application runs.

## Quick Start

### For Developers

1. **Set up `.env.local`:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your values
   ```

2. **Start the app:**
   ```bash
   npm run dev
   ```

3. **You should see:**
   ```
   ✅ Environment validation passed - all critical variables set
   [Init] ✅ All critical environment variables validated at startup
   ```

### For DevOps/Deployment

1. **Set environment variables in your platform:**
   - Vercel: Project > Settings > Environment Variables
   - Docker: `-e VAR=value` flags or `.env` file
   - Kubernetes: ConfigMap or Secrets

2. **Ensure these are set:**
   - `STRIPE_SECRET_KEY` (starts with `sk_`)
   - `STRIPE_WEBHOOK_SECRET` (starts with `whsec_`)
   - `SUPABASE_URL` (HTTPS URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (starts with `sb_` or `eyJ`)

3. **Build will fail if missing** ← This is intentional and prevents broken deployments!

## Files

| File | Purpose |
|------|---------|
| `validation.ts` | Core validation logic and error handling |
| `init.ts` | Runtime initialization hook |
| `index.ts` | Module exports |
| `ENVIRONMENT_VALIDATION_GUIDE.md` | Complete guide with examples |
| `README.md` | This file |

## How It Works

### Build Time (next.config.ts)
```typescript
import '@/lib/env/validation';  // Throws if env vars missing
```
- Runs when you execute `npm run build`
- Fails the build immediately if required variables are missing
- Prevents deployment of broken configurations

### Runtime (app/layout.tsx)
```typescript
import '@/lib/env/init';  // Validates at server startup
```
- Runs when the server starts
- Validates environment again in case variables changed
- Logs validation results to console

### Critical Variables

| Variable | Required | Format | Purpose |
|----------|----------|--------|---------|
| `STRIPE_SECRET_KEY` | Yes | `sk_test_...` or `sk_live_...` | Payment processing |
| `STRIPE_WEBHOOK_SECRET` | Yes | `whsec_...` | Webhook validation |
| `SUPABASE_URL` | Yes | `https://xxx.supabase.co` | Database |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `sb_secret_...` or JWT | DB auth |

### Optional Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Email links |
| `BREVO_API_KEY` | (none) | Email service |
| `LOG_LEVEL` | `info` | Logging |

## Error Examples

### Missing STRIPE_WEBHOOK_SECRET
```
❌ CRITICAL ENVIRONMENT VARIABLES MISSING
The following required variables are not set:
  - STRIPE_WEBHOOK_SECRET: Required for Stripe webhook processing

Action: Set these variables in .env.local or deployment environment
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
  ⚠️  NEXT_PUBLIC_APP_URL: Application URL for email links
```

## Testing

Run the test suite:
```bash
npm test -- env-validation.test.ts
```

Results: 24 tests covering:
- All required variable validation
- Format validation (prefixes, patterns)
- Empty string and whitespace rejection
- Error message accuracy
- Summary generation
- Individual variable checks

## Troubleshooting

**"Build failed: Critical environment variables missing"**
1. Check which variables are listed as missing
2. Verify they're set in `.env.local` (local) or platform (deployed)
3. Restart the build

**"Cannot start dev server"**
1. Ensure `.env.local` exists and has all required variables
2. Run `npm run dev` again
3. Check console output for validation errors

**"Webhook processing fails with 'secret not configured'"**
1. Verify `STRIPE_WEBHOOK_SECRET` is set and non-empty
2. Get the correct secret from Stripe Dashboard
3. Make sure it starts with `whsec_`

## Documentation

- **Complete Guide:** See `ENVIRONMENT_VALIDATION_GUIDE.md` for:
  - Detailed variable descriptions
  - Where to get each value
  - Local development setup
  - Deployment instructions
  - Advanced configuration
  - FAQ and troubleshooting

## Related Files

- `next.config.ts` - Build-time validation entry point
- `app/layout.tsx` - Runtime validation entry point
- `lib/server/stripe-config.ts` - Stripe-specific validation
- `app/api/quiz/stripe/webhook/route.ts` - Webhook handler

## Summary

This system ensures:
- ✅ Configuration errors caught at build time (fail fast)
- ✅ Configuration errors caught at runtime (belt and suspenders)
- ✅ Clear error messages showing exactly what's wrong
- ✅ Comprehensive test coverage (24 tests)
- ✅ No silent failures - webhook won't process without secret
- ✅ Production-grade reliability

**Result:** It's impossible to deploy without required environment variables.
