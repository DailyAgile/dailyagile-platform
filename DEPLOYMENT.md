# DailyAgile Platform — Deployment Guide

## Prerequisites Setup ✓

- [x] OpenMAIC cloned from https://github.com/THU-MAIC/OpenMAIC
- [x] Dependencies configured (pnpm install in progress)
- [x] `.env.local` created with Anthropic API key template
- [x] `vercel.json` ready for Vercel deployment

## Step 1: Complete Environment Configuration

### Anthropic API Key (Required)
1. Visit https://console.anthropic.com/
2. Create/copy your API key
3. Update `openMAIC/.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
   ```
4. Save — never commit this file (already in .gitignore)

### Optional: Configure Supabase (for student progress tracking)
If deploying student progress features:
```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
```

### Optional: Configure Stripe (for course payments)
If deploying payment features:
```
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
STRIPE_TRACK_A_PRICE_ID=price_...
STRIPE_TRACK_B_ENGINEER_PRICE_ID=price_...
```

## Step 2: Verify Local Setup

```bash
cd openMAIC

# Verify dependencies installed
pnpm list | head -20

# Test local development server
pnpm dev
# Visit http://localhost:3000 in browser
```

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)
1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Connect GitHub → select dailyagile-platform repo
4. Select `openMAIC` as root directory (important!)
5. Add environment variables:
   - `ANTHROPIC_API_KEY` = your key from Step 1
   - `ACCESS_CODE` = monthly rotating code
   - Any Supabase/Stripe keys if configured
6. Deploy

### Option B: Deploy via CLI
```bash
cd openMAIC
npm install -g vercel
vercel login
vercel deploy --prod
# Follow prompts to add environment variables
```

## Step 4: Post-Deployment Verification

After deployment completes:

1. **Test API endpoint**: `https://your-domain.vercel.app/api/health`
2. **Check logs**: Vercel Dashboard → Deployments → View Logs
3. **Test course access**: Login with `ACCESS_CODE` from .env.local
4. **Verify LLM integration**: Create a test course, run a quiz interaction

## Environment Variables Summary

| Variable | Required? | Source | Notes |
|----------|-----------|--------|-------|
| `ANTHROPIC_API_KEY` | ✅ Yes | console.anthropic.com | Cost: ~£0.05/1M tokens (Haiku) |
| `ACCESS_CODE` | ✅ Yes | Generate random | Rotate monthly |
| `SUPABASE_URL/KEYS` | ⚠️ Optional | supabase.com | For progress tracking |
| `STRIPE_SECRET_KEY` | ⚠️ Optional | dashboard.stripe.com | For payments |
| `ELEVENLABS_API_KEY` | ⚠️ Optional | elevenlabs.io | For course narration |

## Monitoring & Costs

### Cost Tracking
- Claude Haiku: ~£0.0005/1K input, £0.0015/1K output
- Track monthly usage: `claude /cost` in Claude Code

### Performance Monitoring
- Vercel Dashboard shows deployment health
- Check function execution times in logs
- Monitor cold start times

### Scaling Considerations
- For 1,000+ concurrent users: Consider Vercel Pro plan
- Default: 10 seconds function timeout (configured for API in vercel.json)
- AI responses: 15–30 seconds (optimized with streaming)

## Troubleshooting

### Build Fails
```
Error: vercel.json references missing root
```
**Solution**: Verify you've selected `openMAIC` directory as project root during Vercel setup.

### API Returns 500 Error
```
Check Vercel logs: cat /path/to/logs
```
Likely causes:
- Missing ANTHROPIC_API_KEY
- Invalid API key
- Network timeout from Anthropic API

### Course Access Denied
```
"Invalid ACCESS_CODE"
```
**Solution**: Verify ACCESS_CODE in .env.local matches what's set in Vercel environment variables.

## Next Steps

1. ✅ **Local testing** — Run `pnpm dev`, test with local data
2. ✅ **Deploy to staging** — Deploy to Vercel with test API keys
3. ✅ **Load testing** — Test with 10–50 concurrent users
4. ✅ **Production deployment** — Deploy main branch to production
5. ✅ **Monitor** — Set up Vercel alerts for errors and latency

## Resources

- OpenMAIC Docs: https://github.com/THU-MAIC/OpenMAIC/blob/main/README.md
- Vercel Next.js Guide: https://vercel.com/docs/frameworks/nextjs
- Anthropic API Docs: https://docs.anthropic.com/
- Environment Setup Guide: See `.env.example` in openMAIC root

---

**Status**: ✅ Platform ready for deployment — awaiting Anthropic API key configuration
