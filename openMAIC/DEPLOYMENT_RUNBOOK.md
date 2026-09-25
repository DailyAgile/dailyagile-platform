# DailyAgile Platform - Deployment Runbook

**Last Updated:** August 2026
**Target Launch:** Day 15 of sprint

---

## Quick Reference

| Environment | URL | Database | Auto-Deploy | Trigger |
|---|---|---|---|---|
| **Staging** | https://staging-dailyagile.vercel.app | Supabase Staging | ✓ On push to main | GitHub push |
| **Production** | https://dailyagile.com | Supabase Prod (reconnection) | Manual | Workflow dispatch |

---

## Prerequisites Checklist

Before any deployment:

- [ ] All tests passing locally: `pnpm test && pnpm test:e2e`
- [ ] TypeScript check passing: `npx tsc --noEmit`
- [ ] ESLint check passing: `pnpm lint`
- [ ] Prettier check passing: `pnpm check`
- [ ] All secrets configured in Vercel (see [Vercel Secrets Setup](#vercel-secrets-setup))
- [ ] All database migrations tested locally
- [ ] Supabase connection tested

---

## Staging Deployment (Automatic)

### How It Works

1. **Push to main** → GitHub Actions CI runs automatically
2. **Tests pass** → Build artifact created
3. **Build succeeds** → Vercel staging deployment triggered
4. **Deployment complete** → Slack notification sent

### Monitoring Staging Deployment

1. Go to: https://github.com/DailyAgile/dailyagile-platform/actions
2. Find the latest "Deploy to Staging & Production" workflow
3. Click to view detailed logs
4. Check Vercel deployment: https://vercel.com/dashboard
5. Test at: https://staging-dailyagile.vercel.app

### Staging Database

- Uses separate Supabase staging database (or separate schema in main DB)
- **IMPORTANT:** Do NOT use production data on staging
- Safe to destroy and recreate for testing

---

## Production Deployment (Manual Approval Required)

### Step 1: Run Pre-Deployment Checks

```bash
# From project root
cd openMAIC

# 1. Verify all code is committed
git status
# Should show clean working tree

# 2. Run full test suite
pnpm install
pnpm test
pnpm test:e2e

# 3. Verify TypeScript
npx tsc --noEmit

# 4. Verify all env vars are set (see Vercel console)
echo "SUPABASE_URL: $SUPABASE_URL"
echo "ANTHROPIC_API_KEY: [set]"
```

### Step 2: Apply Database Migrations (if any)

**Option A: Supabase CLI (Recommended)**

```bash
# Install supabase-cli if not already installed
npm install -g supabase

# Login
supabase login

# List pending migrations
supabase migration list --project-ref <project-id>

# Apply migrations to production
supabase migration deploy --project-ref <project-id>

# Verify migration status
supabase migration list --project-ref <project-id>
```

**Option B: Supabase Dashboard**

1. Go to: https://supabase.co/dashboard/projects
2. Select the "reconnection" project
3. Navigate to: SQL Editor → Migrations
4. Review pending migrations
5. Click "Apply" for each migration
6. Verify success in the Migrations tab

**Option C: Manual SQL (Last Resort)**

1. Download migrations from `supabase/migrations/` directory
2. Open Supabase SQL Editor
3. Run each migration file in order (by number)
4. Verify each succeeds before moving to next

### Step 3: Trigger Production Deployment

**Via GitHub Web UI (Recommended)**

1. Go to: https://github.com/DailyAgile/dailyagile-platform/actions
2. Click "Deploy to Staging & Production" workflow
3. Click "Run workflow" dropdown
4. Select: `environment = production`
5. Click "Run workflow"
6. Monitor the workflow logs in real-time

**Via GitHub CLI**

```bash
gh workflow run deploy.yml \
  -f environment=production \
  -r main
```

### Step 4: Monitor Deployment

1. **GitHub Actions**: Watch the workflow at https://github.com/DailyAgile/dailyagile-platform/actions
2. **Vercel**: Check deployment dashboard at https://vercel.com/dashboard
3. **Logs**: Click the "Deploy to Vercel Production" step to view real-time output
4. **Expected time**: 2-5 minutes for build, 1-2 minutes for deployment

### Step 5: Post-Deployment Validation

#### Automated Checks (run automatically in workflow)

- [ ] HTTP health check returns 200
- [ ] Sentry is capturing errors
- [ ] GitHub Release created

#### Manual Verification

```bash
# 1. Check production is accessible
curl -I https://dailyagile.com

# 2. Test key endpoints
curl https://dailyagile.com/api/health

# 3. Check Supabase connection
curl https://dailyagile.com/api/db-status

# 4. Verify SSL certificate
curl -v https://dailyagile.com 2>&1 | grep certificate

# 5. Monitor error logs
# Go to: https://sentry.io/organizations/dailyagile/issues/
```

#### Smoke Tests (manual)

- [ ] Landing page loads (https://dailyagile.com)
- [ ] Quiz page loads (https://dailyagile.com/academy/quiz/test)
- [ ] Login flow works
- [ ] Student dashboard loads
- [ ] Quiz submission works
- [ ] API responses are fast (<2s)
- [ ] Mobile responsive

### Step 6: Notify Stakeholders

1. **Slack**: Automatic notification sent to #deployments
2. **Email**: Send manual notification to tkiran204@gmail.com:
   ```
   Subject: Production Deployment Complete - v[VERSION]
   
   DailyAgile platform deployed to production.
   
   URL: https://dailyagile.com
   Time: [TIMESTAMP]
   Commit: [HASH]
   ```
3. **GitHub**: Release notes automatically created

---

## Rollback Procedures

### Scenario 1: Deployment Failed During Build

**Symptoms:**
- GitHub Actions workflow fails with red X
- Build error in logs
- No Vercel deployment created

**Recovery:**

```bash
# 1. No action needed - nothing deployed
# 2. Fix the issue locally
# 3. Commit and push to main
# 4. Automatic staging deployment will retry
# 5. Once staging passes, retry production deployment
```

### Scenario 2: Deployment Succeeded But Production Has Bugs

**Symptoms:**
- Deployment completed successfully
- But production is broken (errors in Sentry)
- Need to revert quickly

**Quick Rollback (< 2 minutes):**

```bash
# 1. Go to Vercel dashboard: https://vercel.com/dashboard
# 2. Find the dailyagile-platform project
# 3. Go to: Deployments tab
# 4. Find the previous known-good deployment
# 5. Click the deployment
# 6. Click "Promote to Production" button
# 7. Confirm the action
```

**Full Rollback (if quick rollback doesn't work):**

1. **Revert commit**:
   ```bash
   git log --oneline -5  # Find previous good commit
   git revert HEAD       # Create new commit that reverts
   git push origin main
   ```

2. **Re-trigger deployment**:
   ```bash
   gh workflow run deploy.yml \
     -f environment=production \
     -r main
   ```

### Scenario 3: Database Migration Failed

**Symptoms:**
- Production deployment succeeded
- But database errors appear in Sentry
- Queries are failing

**Recovery:**

```bash
# 1. Check migration status
supabase migration list --project-ref <project-id>

# 2. Find the failed migration
# 3. Either:
#    a) Fix and re-apply using: supabase migration deploy
#    b) Rollback using: supabase migration revert (if available)
#    c) Manual fix via SQL Editor

# 4. Verify data integrity after fix
SELECT COUNT(*) FROM [affected_table];

# 5. If data lost, restore from backup:
#    - Go to Supabase dashboard
#    - Database → Backups
#    - Restore from recent backup before migration
```

### Scenario 4: Performance Degradation

**Symptoms:**
- Deployment successful but slow
- Timeout errors in Sentry
- API response times > 5s

**Diagnosis:**

```bash
# 1. Check Vercel logs
# Dashboard → Functions → Check compute time and logs

# 2. Check Sentry performance
# https://sentry.io/organizations/dailyagile/performance/

# 3. Check database query performance
# Supabase → SQL Editor → Run: EXPLAIN ANALYZE on slow queries

# 4. Check for large deployments
# Vercel → Analytics → Check response times by route
```

**Recovery:**

If performance is critical:

```bash
# 1. Rollback to previous version (see above)
# 2. Identify the problematic code locally
# 3. Optimize and test extensively
# 4. Re-deploy when ready
```

---

## Environment Variables Management

### Staging Environment

Set these secrets in Vercel (Project → Settings → Environment Variables):

```
VERCEL_ENV=staging
SUPABASE_URL=https://staging.supabase.co
SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_KEY=[staging-service-key]
ANTHROPIC_API_KEY=[your-key]
```

### Production Environment

Set these secrets in Vercel (Project → Settings → Environment Variables):

```
VERCEL_ENV=production
SUPABASE_URL=https://reconnection.supabase.co
SUPABASE_ANON_KEY=[prod-anon-key]
SUPABASE_SERVICE_KEY=[prod-service-key]
ANTHROPIC_API_KEY=[your-key]
STRIPE_SECRET_KEY=[prod-key]
SENTRY_AUTH_TOKEN=[token]
```

**IMPORTANT:** Never hardcode secrets in code or .env.local in production. Use Vercel environment variables only.

---

## Vercel Secrets Setup

### First Time Setup

1. Go to: https://vercel.com/dashboard/project/dailyagile-platform/settings/environment-variables

2. Add these environment variables:

   **For Staging:**
   ```
   Name: SUPABASE_URL
   Value: https://staging.supabase.co
   Environments: Preview & Development
   ```

   **For Production:**
   ```
   Name: SUPABASE_URL
   Value: https://reconnection.supabase.co
   Environments: Production
   ```

3. Repeat for all variables listed above

### Rotating Secrets

When rotating API keys (monthly recommended):

1. Generate new key in original service (Anthropic, Stripe, etc.)
2. Go to Vercel environment variables
3. Update the value
4. Vercel automatically redeploys with new secret
5. Delete old key from original service

---

## Monitoring & Alerts

### Sentry Error Tracking

1. **Dashboard:** https://sentry.io/organizations/dailyagile/issues/
2. **Configure alerts:** Settings → Alerts → Create Alert Rule
3. **Alert conditions:**
   - [ ] Alert on every error in production
   - [ ] Daily digest email
   - [ ] Slack notification in #prod-alerts

### Vercel Analytics

1. **Dashboard:** https://vercel.com/dashboard/project/dailyagile-platform/analytics
2. **Monitor:**
   - [ ] Response times (should be < 500ms)
   - [ ] Status code distribution
   - [ ] Request rate

### Uptime Monitoring

**Use one of these services:**

- **Uptime Robot** (free): https://uptimerobot.com/
  - Add: https://dailyagile.com/api/health
  - Alert: Email on downtime

- **Sentry**: Already configured, monitors performance

---

## Common Issues & Troubleshooting

### Issue: Build fails with "Module not found"

```
Error: Cannot find module 'xyz'
```

**Fix:**
```bash
# 1. Clear cache
rm -rf node_modules .next pnpm-lock.yaml

# 2. Reinstall
pnpm install

# 3. Rebuild locally
pnpm build

# 4. If still fails, check for circular dependencies
npx madge --circular .
```

### Issue: Vercel deployment hangs

**Fix:**
```bash
# 1. Cancel the deployment in Vercel dashboard
# 2. Check logs for timeout errors
# 3. If test timeout: increase in playwright.config.ts
# 4. Retry deployment
```

### Issue: Database migration conflicts

**Fix:**
```bash
# 1. Check migration status
supabase migration list --project-ref <id>

# 2. If stuck, manually check database:
# Supabase → SQL Editor → SELECT * FROM migrations;

# 3. If safe to continue, run:
supabase migration deploy --project-ref <id> --skip-error-checking
```

### Issue: Supabase connection errors in production

**Fix:**
```bash
# 1. Verify env vars in Vercel:
# Settings → Environment Variables → check SUPABASE_* vars

# 2. Test connection locally:
# Update .env.local with prod values (temporarily)
# pnpm dev
# Check console for connection errors

# 3. If RLS policy issue:
# Supabase → SQL Editor → Check RLS on affected tables
# Run: ALTER TABLE [table] DISABLE ROW LEVEL SECURITY;
```

---

## Day 15 Launch Checklist

**24 hours before launch:**
- [ ] All features tested in staging
- [ ] Database migrations reviewed and tested
- [ ] All env vars verified in Vercel
- [ ] Rollback plan reviewed with team
- [ ] Sentry alerts configured
- [ ] Slack #prod-alerts channel created

**1 hour before launch:**
- [ ] Team standing by
- [ ] Staging URL tested one final time
- [ ] Database backed up
- [ ] Monitoring dashboards open

**Launch (< 5 min):**
- [ ] Run production deployment (see [Production Deployment](#production-deployment-manual-approval-required))
- [ ] Monitor Vercel logs
- [ ] Confirm health check passes

**Immediately after:**
- [ ] Verify production URL loads
- [ ] Test key user flows
- [ ] Check Sentry (should show no errors)
- [ ] Monitor Vercel analytics for normal traffic

**Post-launch:**
- [ ] Announce in Slack
- [ ] Email stakeholders
- [ ] Log in project notes
- [ ] Celebrate! 🎉

---

## Support & Escalation

### Common Questions

**Q: Can I deploy on weekends?**
A: Yes, but have someone on-call to monitor for 30 min after deployment.

**Q: How do I deploy a hotfix?**
A: Push to main, wait for staging tests to pass, then run production deployment workflow.

**Q: What if production has a bug?**
A: Use rollback procedure (see above). Rollback takes < 5 min. Fix locally, re-deploy when ready.

**Q: How often should I deploy?**
A: As often as needed. Staging is risk-free. Production deployments take ~5 min and are fully reversible.

### Escalation Path

1. **Build fails**: Check GitHub Actions logs, fix locally, push again
2. **Deployment fails**: Check Vercel logs, use rollback if needed
3. **Production errors**: Check Sentry, use rollback if critical
4. **Database issues**: Check Supabase logs, contact Supabase support if needed
5. **Unknown issues**: Check Vercel logs, Sentry errors, and database status simultaneously

---

## Appendix: Script Cheat Sheet

```bash
# Test locally before pushing
pnpm test && pnpm test:e2e && npx tsc --noEmit && pnpm lint

# Build for production locally
pnpm build

# Check staging deployment
curl -I https://staging-dailyagile.vercel.app

# List Vercel deployments
vercel deployments

# Trigger manual production deployment
gh workflow run deploy.yml -f environment=production -r main

# View deployment logs
vercel logs dailyagile-platform

# Database: list migrations
supabase migration list --project-ref <project-id>

# Database: deploy migrations
supabase migration deploy --project-ref <project-id>
```

---

**Last Updated:** August 2026
**Next Review:** Before each production deployment
