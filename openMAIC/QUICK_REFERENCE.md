# Deployment Quick Reference Card

**Print this or keep it open during deployments.**

---

## Emergency Contacts

| Role | Name | Slack | Email |
|---|---|---|---|
| Owner | Kiran | @tkiran204 | tkiran204@gmail.com |
| Tech Lead | [Your name] | @[handle] | [email] |
| DevOps | [Your name] | @[handle] | [email] |

---

## Critical URLs

| Service | URL | Purpose |
|---|---|---|
| **Production** | https://dailyagile.com | Live app |
| **Staging** | https://staging-dailyagile.vercel.app | Test environment |
| **Vercel Dashboard** | https://vercel.com/dashboard | Deployments & logs |
| **GitHub Actions** | https://github.com/DailyAgile/dailyagile-platform/actions | CI/CD status |
| **Sentry** | https://sentry.io/organizations/dailyagile/issues/ | Error tracking |
| **Supabase** | https://supabase.co/dashboard/projects | Database |
| **Slack #prod-alerts** | [Slack workspace] | Alerts |

---

## Status Check (2 min)

```bash
# Is production live?
curl -I https://dailyagile.com
# Should return: HTTP 200 OK

# Are there errors?
# → Check: https://sentry.io/organizations/dailyagile/issues/

# Was it recently deployed?
# → Check: https://vercel.com/dashboard/project/dailyagile-platform/deployments

# Is database connected?
# → Check: https://supabase.co/dashboard/projects
```

---

## Common Operations

### Start Development

```bash
cd openMAIC
pnpm install
pnpm dev
# Open: http://localhost:3000
```

### Test Before Push

```bash
pnpm test           # Unit tests
pnpm test:e2e       # E2E tests
npx tsc --noEmit    # Type check
pnpm lint           # Lint check
```

### Push to Trigger Staging

```bash
git add .
git commit -m "Your feature"
git push origin main
# Staging deploys automatically in 2-5 min
```

### Deploy to Production (Day 15 Only)

```bash
# Pre-flight checks
git status  # Must be clean
pnpm test   # Must pass

# Apply migrations (if any)
supabase migration deploy --project-ref [project-id]

# Trigger deployment
gh workflow run deploy.yml -f environment=production -r main

# Monitor
# → https://github.com/DailyAgile/dailyagile-platform/actions
# → https://vercel.com/dashboard
```

### Rollback Production (< 2 min)

```bash
# Option 1: Via Vercel (fastest)
# Go to: https://vercel.com/dashboard/project/dailyagile-platform/deployments
# Click previous deployment → "Promote to Production"

# Option 2: Via Git
git revert HEAD
git push origin main
```

### Check Production Logs

```bash
# Stream live logs
vercel logs dailyagile-platform --follow

# Last hour
vercel logs dailyagile-platform --since 1h

# Just errors
vercel logs dailyagile-platform | grep "ERROR"
```

---

## Pre-Deployment Checklist (5 min)

- [ ] Code committed: `git status` (clean)
- [ ] Tests pass: `pnpm test && pnpm test:e2e`
- [ ] Type check: `npx tsc --noEmit`
- [ ] Lint: `pnpm lint`
- [ ] Env vars set in Vercel
- [ ] Database migrations ready
- [ ] Team standing by
- [ ] Monitoring dashboards open

---

## Post-Deployment Checklist (5 min)

- [ ] URL loads: https://dailyagile.com
- [ ] No 500 errors: Check Sentry
- [ ] Tests still pass
- [ ] Smoke tests pass (login, quiz, etc.)
- [ ] Performance acceptable (< 500ms response time)
- [ ] Slack announcement sent
- [ ] Stakeholders notified

---

## Environment Variables Needed

### Local Development (.env.local)

```
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-v0-...
SUPABASE_URL=https://staging.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
JWT_SECRET=random-32-chars-or-more
```

### Vercel: Preview (Scope: Preview & Development)

```
VERCEL_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging-dailyagile.vercel.app
SUPABASE_URL=https://staging.supabase.co
SUPABASE_ANON_KEY=eyJ...(staging)
SUPABASE_SERVICE_KEY=eyJ...(staging)
ANTHROPIC_API_KEY=sk-ant-v0-...
```

### Vercel: Production (Scope: Production)

```
VERCEL_ENV=production
NEXT_PUBLIC_APP_URL=https://dailyagile.com
SUPABASE_URL=https://reconnection.supabase.co
SUPABASE_ANON_KEY=eyJ...(production)
SUPABASE_SERVICE_KEY=eyJ...(production)
ANTHROPIC_API_KEY=sk-ant-v0-...
SENTRY_AUTH_TOKEN=...
```

---

## Troubleshooting (30 sec)

| Issue | Check | Fix |
|---|---|---|
| Build fails | GitHub Actions logs | Check test failures |
| Staging won't deploy | Vercel dashboard | Check env vars |
| Production down | Sentry errors | Rollback or fix |
| Database won't connect | Supabase status | Check credentials |
| Slow performance | Vercel analytics | Check query performance |
| Alerts everywhere | Sentry false positives | Increase alert threshold |

---

## API Health Checks

```bash
# Is app running?
curl https://dailyagile.com/api/health

# Is database connected?
curl https://dailyagile.com/api/db-status

# Check response time
time curl https://dailyagile.com

# Check SSL certificate
curl -v https://dailyagile.com 2>&1 | grep "certificate"
```

---

## Deployment Timeline

| Phase | Time | What's Happening |
|---|---|---|
| **Build** | 2-5 min | GitHub Actions tests code |
| **Deploy** | 1-2 min | Vercel builds & deploys |
| **Ready** | ~5 min | App live & accessible |
| **Monitor** | 5+ min | Watch for errors in Sentry |

---

## Key Metrics to Watch

**First 5 minutes after deployment:**
- Response time (should be < 500ms)
- Error rate (should be 0%)
- 404 errors (should be 0%)

**After 30 minutes:**
- Error spike (should still be low)
- User traffic (check Vercel analytics)
- Database performance (check Supabase)

---

## Slack Notifications

### Expected Messages

**After successful staging deploy:**
```
✅ Staging Deployment successful
URL: https://staging-dailyagile.vercel.app
Branch: main
```

**After successful production deploy:**
```
✅ Production Deployment successful
Commit: abc123...
URL: https://dailyagile.com
```

### If Something Goes Wrong

**GitHub Actions failure:**
```
❌ CI/CD Check Failed
Check logs: https://github.com/DailyAgile/dailyagile-platform/actions
Fix & push again
```

---

## Database Migrations

### Check Pending

```bash
supabase migration list --project-ref [project-id]
```

### Apply to Production

```bash
supabase migration deploy --project-ref [project-id]
```

### Rollback Last Migration

```bash
supabase migration revert --project-ref [project-id] [migration-file]
```

---

## Team Roles & Responsibilities

| Role | Permission | Responsibility |
|---|---|---|
| **Developers** | Staging only | Write code, test features |
| **Tech Lead** | Staging + Production | Approve production deploys |
| **DevOps** | All environments | Infrastructure, secrets, monitoring |
| **On-Call** | Production | Respond to alerts, emergencies |

---

## Monthly Tasks

```
First of month:
  ☐ Rotate API keys (Anthropic, Stripe, JWT)
  ☐ Review Sentry issues
  ☐ Check database performance
  ☐ Update dependencies (pnpm update)
  ☐ Run security audit (pnpm audit fix)

Every deployment:
  ☐ Pre-deployment checklist
  ☐ Run deployment
  ☐ Post-deployment checklist
  ☐ Monitor for 30 min
  ☐ Document any issues
```

---

## Red Flags (Rollback Immediately)

🚨 **Rollback if you see:**
- All users getting 500 errors
- Data corruption in database
- Massive spike in error rate
- Users cannot log in or access core features
- Response times > 5 seconds
- Database connection errors

✅ **Can fix without rollback if:**
- Minor UI bugs
- Specific endpoint slow (fix query)
- Non-critical feature broken
- New Sentry errors (but app still works)

---

## Get Help

**Documentation:**
- Setup: ENVIRONMENT_SETUP.md
- Deploying: DEPLOYMENT_RUNBOOK.md
- Checklists: DEPLOYMENT_CHECKLIST.md
- Monitoring: MONITORING_SETUP.md
- Vercel: VERCEL_SETUP.md
- **Overview: DEPLOYMENT_INDEX.md** ← Start here

**People:**
- Local dev issues → Ask developers
- Staging deploy issues → Ask tech lead
- Production issues → Call tech lead + on-call
- Infrastructure issues → Ask DevOps

**Services:**
- Vercel support: https://vercel.com/support
- Supabase docs: https://supabase.io/docs
- GitHub docs: https://docs.github.com
- Sentry docs: https://docs.sentry.io

---

## Important Dates

| Date | Task | Owner |
|---|---|---|
| Day 1-2 | Setup infrastructure | ✅ Done |
| Day 3-5 | Feature development | In progress |
| Day 11-14 | Staging testing | Upcoming |
| **Day 15** | **Production launch** | 🎯 |

---

## Remember

✅ **Always:**
- Test locally before pushing
- Follow the checklist
- Monitor after deployment
- Document issues
- Communicate with team

❌ **Never:**
- Deploy Friday afternoon
- Commit secrets to git
- Skip tests
- Deploy without backups
- Make changes in production dashboard

---

**Printed: ________________**
**Deployed by: ________________**
**Approved by: ________________**

---

**Last Updated:** August 2026
**Keep this card handy during deployments!**
