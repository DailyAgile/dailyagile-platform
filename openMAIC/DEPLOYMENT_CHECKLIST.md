# Deployment Checklists

Quick reference checklists for safe, reliable deployments.

---

## Pre-Deployment Checklist (Every Deployment)

### 24 Hours Before

- [ ] **Code Review**: All changes reviewed by team
- [ ] **Test Coverage**: All modified functions have tests
- [ ] **Migrations**: Database migrations reviewed by DBA/lead
- [ ] **Dependencies**: No major version bumps without testing
- [ ] **Performance**: No known slowdowns in changed code
- [ ] **Security**: No hardcoded secrets, API keys, or passwords
- [ ] **Documentation**: README or docs updated if needed
- [ ] **Backup**: Database backup created (Supabase auto-backups this)

### 1 Hour Before

- [ ] **Tests Passing**: All CI checks green
  ```bash
  pnpm test
  pnpm test:e2e
  npx tsc --noEmit
  pnpm lint
  ```

- [ ] **Build Succeeds Locally**:
  ```bash
  rm -rf .next node_modules
  pnpm install
  pnpm build
  ```

- [ ] **No Uncommitted Changes**:
  ```bash
  git status
  # Should show: "nothing to commit, working tree clean"
  ```

- [ ] **Latest Changes Pushed**:
  ```bash
  git log --oneline -1
  # Verify this commit is on GitHub
  ```

- [ ] **Environment Variables Verified**:
  - [ ] SUPABASE_URL set
  - [ ] ANTHROPIC_API_KEY set
  - [ ] STRIPE keys set (if payments enabled)
  - [ ] No validation errors

- [ ] **Database Ready**:
  - [ ] No pending migrations
  - [ ] Database is healthy (no errors in logs)
  - [ ] Backup recent (< 24 hours)

- [ ] **Monitoring Dashboards Open**:
  - [ ] Sentry: https://sentry.io/organizations/dailyagile/issues/
  - [ ] Vercel: https://vercel.com/dashboard
  - [ ] Slack #prod-alerts channel open

### Deployment Execution

- [ ] **Trigger Deployment**:
  ```bash
  # For staging (automatic on push, but can manually re-trigger):
  gh workflow run deploy.yml -f environment=staging -r main
  
  # For production (manual only):
  gh workflow run deploy.yml -f environment=production -r main
  ```

- [ ] **Monitor Build** (GitHub Actions):
  - [ ] Build job starts
  - [ ] All tests pass
  - [ ] Lint passes
  - [ ] TypeScript passes
  - [ ] Build completes
  - Expected time: 2-5 minutes

- [ ] **Monitor Deployment** (Vercel):
  - [ ] Deployment starts
  - [ ] Build output looks good
  - [ ] No errors in function output
  - [ ] Deployment completes
  - Expected time: 1-2 minutes

- [ ] **Verify Deployed** (Slack):
  - [ ] Automatic notification received
  - [ ] Notification includes deployment URL

---

## Post-Deployment Checklist (Immediately After)

### Health Checks (< 2 minutes)

- [ ] **URL Accessible**:
  ```bash
  curl -I https://dailyagile.com
  # Should return: HTTP 200 OK
  ```

- [ ] **API Health Endpoint**:
  ```bash
  curl https://dailyagile.com/api/health
  # Should return: {"status":"ok"}
  ```

- [ ] **Database Connected**:
  ```bash
  curl https://dailyagile.com/api/db-status
  # Should return connection status
  ```

- [ ] **Frontend Loads**:
  - [ ] Open https://dailyagile.com
  - [ ] Page loads without errors (check console)
  - [ ] No 500 errors

- [ ] **Sentry Reporting**:
  - [ ] No new error spikes (vs. pre-deployment)
  - [ ] Error rate is normal

### Smoke Tests (< 5 minutes)

**Test each critical user flow:**

- [ ] **Landing Page**:
  - [ ] Navigate to https://dailyagile.com
  - [ ] Layout looks correct
  - [ ] No broken images
  - [ ] CTAs are clickable

- [ ] **Authentication**:
  - [ ] Login page loads
  - [ ] Email field accepts input
  - [ ] Submit button works
  - [ ] 2FA flow starts

- [ ] **Student Dashboard**:
  - [ ] After login, dashboard loads
  - [ ] Student progress visible
  - [ ] Course list populated

- [ ] **Quiz Module**:
  - [ ] Quiz loads
  - [ ] Questions display correctly
  - [ ] Answer submission works
  - [ ] Score calculation works

- [ ] **API Performance**:
  ```bash
  # Check response times
  time curl https://dailyagile.com/api/health
  # Should be < 100ms
  ```

- [ ] **Mobile Responsive**:
  - [ ] Open on iPhone/Android simulator
  - [ ] Layout adapts correctly
  - [ ] Touch interactions work

### Monitoring Setup (< 2 minutes)

- [ ] **Sentry Alerts Active**:
  - [ ] Critical error alert configured
  - [ ] Slack channel notified
  - [ ] Email alerts enabled

- [ ] **Vercel Analytics**:
  - [ ] Check recent deployments
  - [ ] Response times normal
  - [ ] No unusual error rates

- [ ] **Uptime Monitor**:
  - [ ] Monitoring service confirms up
  - [ ] No alerts triggered

### Notification (< 1 minute)

- [ ] **Slack**: Announcement sent to #general
- [ ] **Email**: Notification to tkiran204@gmail.com (if important)
- [ ] **GitHub**: Release notes added

### Roll Back Decision

**Stay with deployment if:**
- [ ] All checks passing
- [ ] No new error spikes
- [ ] Performance is acceptable
- [ ] User flows working

**Roll back if:**
- [ ] Critical errors in Sentry
- [ ] Health check failing
- [ ] User flows broken
- [ ] Performance degraded (>2s response time)

---

## Staging Deployment Only Checklist

### Before Push

- [ ] **Feature branch tested locally**
- [ ] **All tests pass locally**
- [ ] **Code formatted**: `pnpm format`
- [ ] **Lint passes**: `pnpm lint`

### After Push to main

- [ ] **GitHub Actions running**: Check https://github.com/DailyAgile/dailyagile-platform/actions
- [ ] **Tests pass in CI**
- [ ] **Staging deployment triggered**
- [ ] **Vercel shows "Ready"**

### Test in Staging

- [ ] **URL works**: https://staging-dailyagile.vercel.app
- [ ] **New feature works as expected**
- [ ] **No regressions visible**
- [ ] **Performance acceptable**

---

## Production Deployment Only Checklist

### Pre-Deployment (All Items Required)

- [ ] **Staging tested**: Feature works perfectly in staging
- [ ] **No data loss risk**: Migrations are safe
- [ ] **Rollback plan reviewed**: Team knows how to revert
- [ ] **Team ready**: Someone monitoring for 30 min after deploy
- [ ] **Alert systems ready**: Sentry, monitoring, Slack
- [ ] **Database backed up**: Recent backup exists
- [ ] **DNS verified**: Domain pointing to Vercel
- [ ] **SSL certificate valid**: No certificate errors

### Deployment (Follow exactly)

1. [ ] **Run pre-checks**:
   ```bash
   git status  # Clean tree
   pnpm test   # All pass
   npx tsc --noEmit  # No type errors
   ```

2. [ ] **Apply database migrations** (if any):
   ```bash
   supabase migration deploy --project-ref <prod-project-id>
   ```

3. [ ] **Trigger production deployment**:
   ```bash
   gh workflow run deploy.yml -f environment=production -r main
   ```

4. [ ] **Monitor workflow**: Watch GitHub Actions in real-time
5. [ ] **Monitor deployment**: Check Vercel dashboard
6. [ ] **Wait for completion**: ~5 minutes total

### Post-Deployment (All Items Required)

- [ ] **Health checks pass** (see Post-Deployment Checklist)
- [ ] **Smoke tests pass** (see Post-Deployment Checklist)
- [ ] **No Sentry errors** (or just expected errors)
- [ ] **Slack notification sent**
- [ ] **Team notified**

### Did Something Go Wrong?

- [ ] **Immediate action**: Page down if critical error
- [ ] **Determine root cause**: Sentry, Vercel logs
- [ ] **Decide rollback vs. fix**:
  - Rollback if: Data corruption, major functionality broken
  - Fix if: Minor bug, backend only issue
- [ ] **Execute rollback** (see DEPLOYMENT_RUNBOOK.md)
- [ ] **Post-mortem**: Document what happened

---

## Monthly Maintenance Checklist

**First of every month:**

- [ ] **Rotate Anthropic API key**:
  1. Generate new key in console.anthropic.com
  2. Update Vercel environment variable
  3. Delete old key from Anthropic
  4. Verify deployment works with new key

- [ ] **Rotate Stripe keys** (if using live keys):
  1. Generate new keys in Stripe dashboard
  2. Update Vercel variables
  3. Delete old keys

- [ ] **Rotate JWT_SECRET** (every 3 months):
  1. Generate new secret: `openssl rand -base64 32`
  2. Update Vercel
  3. Re-deploy

- [ ] **Rotate ACCESS_CODE**:
  1. Generate new code
  2. Update Vercel environment
  3. Communicate to student support team

- [ ] **Review Sentry Issues**:
  - [ ] Resolve or snooze old issues
  - [ ] Check error trends

- [ ] **Review Database Performance**:
  - [ ] Check slow queries in Supabase
  - [ ] Add indexes if needed
  - [ ] Review backup sizes

- [ ] **Update Dependencies**:
  ```bash
  pnpm update
  pnpm audit fix
  # Test thoroughly before merging
  ```

- [ ] **Review Vercel Usage**:
  - [ ] Check bandwidth usage
  - [ ] Check build time trends
  - [ ] Optimize if needed

---

## Emergency Rollback Checklist

**Use if production is down or critically broken:**

### Immediate (< 1 minute)

- [ ] **Stop the bleed**: Rollback to last known good version
- [ ] **Verify rollback**: Test production is working
- [ ] **Notify stakeholders**: Slack + email

### Then (< 15 minutes)

- [ ] **Assess damage**: What went wrong?
- [ ] **Review logs**: Sentry, Vercel, database
- [ ] **Document issue**: Create incident log
- [ ] **Notify team**: Call/Slack critical team members

### Finally (< 1 hour)

- [ ] **Fix the code**: Debug locally
- [ ] **Test thoroughly**: All tests, staging deploy, production validation
- [ ] **Re-deploy**: Once confident
- [ ] **Monitor closely**: Watch for 30+ min

---

## Deployment Approval Matrix

| Deployment Type | Approval Required | Approver | Time to Deploy |
|---|---|---|---|
| Staging | None | Auto-deploy on push | 2-5 min |
| Hotfix → Production | Lead dev + 1 other | 2 people | 5 min |
| Feature → Production | Tech lead + Product | 2 people | 5 min |
| Database change → Production | DBA + Tech lead | 2 people | 10 min |
| Rollback | Anyone on-call | 1 person | < 2 min |

---

## Sign-Off

**Deployment completed by**: ________________
**Date/Time**: ________________
**Approved by**: ________________
**Issues encountered**: None / [List]:

---

**Last Updated:** August 2026
**Keep this checklist visible during deployments**
