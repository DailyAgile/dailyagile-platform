# DailyAgile Platform - Deployment Documentation Index

**Complete guide to deploying the DailyAgile platform.**

---

## Quick Start (TL;DR)

### Local Development (First Time)

```bash
cd openMAIC
cp .env.local.example .env.local
# Edit .env.local with your Anthropic API key and Supabase credentials
pnpm install
pnpm dev
# App running at http://localhost:3000
```

### Staging Deployment

```bash
# Automatic on every push to main!
# Just commit and push:
git add .
git commit -m "Your feature"
git push origin main

# Check deployment:
# - GitHub Actions: https://github.com/DailyAgile/dailyagile-platform/actions
# - Vercel: https://vercel.com/dashboard
# - URL: https://staging-dailyagile.vercel.app
```

### Production Deployment (Manual, Day 15)

```bash
# Only when ready for launch day
# Follow: DEPLOYMENT_RUNBOOK.md → "Production Deployment" section
# Or run:
gh workflow run deploy.yml -f environment=production -r main
```

---

## Documentation Files

### 📖 Core Documentation (READ THESE FIRST)

| File | Purpose | For Whom | When |
|---|---|---|---|
| **[DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md)** | Step-by-step deployment procedures | All | Every deployment |
| **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** | Pre/post deployment checklists | All | Before & after deployment |
| **[ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)** | Configure local dev environment | Developers | First time setup |

### 🔧 Configuration & Infrastructure

| File | Purpose | For Whom | When |
|---|---|---|---|
| **[VERCEL_SETUP.md](./VERCEL_SETUP.md)** | Vercel project configuration | DevOps/Tech Lead | Initial setup & secrets |
| **[MONITORING_SETUP.md](./MONITORING_SETUP.md)** | Error tracking & monitoring | DevOps/Tech Lead | Initial setup & ongoing |
| **[.env.local.example](./.env.local.example)** | Environment variables template | Developers | Create .env.local |

### 🔄 CI/CD Pipelines

| File | Purpose |
|---|---|
| **.github/workflows/ci.yml** | Tests on every push (auto) |
| **.github/workflows/deploy.yml** | Staging & production deployment |

---

## Deployment Flowchart

```
┌─ Push to main
│
├─ GitHub Actions: Run Tests
│  ├─ Unit tests
│  ├─ E2E tests
│  ├─ TypeScript check
│  ├─ Lint
│  └─ All pass? → Continue
│                └─ Any fail? → Fix locally, push again
│
├─ Vercel: Deploy Staging
│  └─ Ready after ~5 min
│  └─ Access: https://staging-dailyagile.vercel.app
│
└─ On Day 15: Manual Production Deployment
   ├─ Run: gh workflow run deploy.yml -f environment=production -r main
   ├─ GitHub Actions: Run tests + build again
   ├─ Vercel: Deploy to production
   ├─ Post-deployment checks
   └─ Ready at: https://dailyagile.com
```

---

## Step-by-Step: Common Workflows

### Scenario 1: Local Development

**You:** Developer working on a feature

**Steps:**

1. **Setup** (first time only):
   ```bash
   cd openMAIC
   cp .env.local.example .env.local
   # Edit .env.local: add Anthropic API key, Supabase URL & keys
   pnpm install
   ```

2. **Work**:
   ```bash
   pnpm dev  # Start dev server on localhost:3000
   # Edit code...
   ```

3. **Test**:
   ```bash
   pnpm test           # Unit tests
   pnpm test:e2e       # E2E tests
   npx tsc --noEmit    # Type check
   pnpm lint           # Lint
   ```

4. **Commit & Push**:
   ```bash
   git add .
   git commit -m "Your feature description"
   git push origin main
   ```

5. **Check Staging** (automatic in 2-5 min):
   - Open: https://staging-dailyagile.vercel.app
   - Test your feature
   - Check GitHub Actions: https://github.com/DailyAgile/dailyagile-platform/actions

**Result:** Feature automatically deployed to staging, ready to test!

---

### Scenario 2: Staging Deployment (Automatic)

**What Happens:**

1. You push to main
2. GitHub Actions automatically runs tests
3. If all pass, Vercel deploys to staging
4. Slack notification sent
5. Ready at: https://staging-dailyagile.vercel.app

**No manual action needed!** (Staging is fully automatic)

---

### Scenario 3: Production Deployment (Manual, Day 15)

**You:** Tech Lead / DevOps Engineer on launch day

**Prerequisites:**
- All features tested in staging
- Team standing by
- Slack #prod-alerts channel open
- Monitoring dashboards open

**Steps:**

1. **Pre-deployment**:
   ```bash
   cd openMAIC
   
   # Verify everything is ready
   git status  # Clean working tree
   pnpm test   # All pass
   npx tsc --noEmit  # No errors
   ```

2. **Apply database migrations** (if any):
   ```bash
   supabase migration deploy --project-ref <prod-project-id>
   ```

3. **Trigger production deployment**:
   ```bash
   gh workflow run deploy.yml -f environment=production -r main
   ```

4. **Monitor**:
   - Watch GitHub Actions: https://github.com/DailyAgile/dailyagile-platform/actions
   - Expect: ~5 minutes for build + deploy
   - Check Vercel: https://vercel.com/dashboard

5. **Post-deployment**:
   - Verify: https://dailyagile.com loads
   - Check Sentry: No new errors
   - Run smoke tests (see DEPLOYMENT_RUNBOOK.md)
   - Announce in Slack

**Result:** Production live at dailyagile.com! 🎉

---

## Configuration Checklist

### Before First Deployment

- [ ] **GitHub Actions**:
  - [ ] ci.yml configured (automatic tests)
  - [ ] deploy.yml configured (staging + prod deployments)

- [ ] **Vercel Project**:
  - [ ] Project created at https://vercel.com/dashboard
  - [ ] GitHub repo connected
  - [ ] All environment variables set (see VERCEL_SETUP.md)

- [ ] **Environment Variables** (Vercel + Local):
  - [ ] ANTHROPIC_API_KEY
  - [ ] SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
  - [ ] SENTRY_AUTH_TOKEN (for monitoring)
  - [ ] STRIPE keys (if payments enabled)

- [ ] **Monitoring**:
  - [ ] Sentry project created
  - [ ] Slack integration configured
  - [ ] Uptime monitoring set up

- [ ] **Supabase**:
  - [ ] Staging database created
  - [ ] Production database ("reconnection" project) accessible
  - [ ] Migrations applied to both

- [ ] **Database Backups**:
  - [ ] Supabase auto-backups enabled
  - [ ] Restore process tested (practice restoring to staging)

---

## Troubleshooting Quick Links

| Problem | Solution |
|---|---|
| Build fails locally | → ENVIRONMENT_SETUP.md → "Troubleshooting" |
| Staging deployment fails | → DEPLOYMENT_RUNBOOK.md → "Staging Deployment" |
| Production deployment fails | → DEPLOYMENT_RUNBOOK.md → "Troubleshooting" |
| Tests fail | → DEPLOYMENT_RUNBOOK.md → "CI/CD Troubleshooting" |
| Database won't connect | → ENVIRONMENT_SETUP.md → "Database Setup" |
| Vercel missing env vars | → VERCEL_SETUP.md → "Troubleshooting" |
| Sentry not capturing errors | → MONITORING_SETUP.md → "Troubleshooting" |
| Too many false alerts | → MONITORING_SETUP.md → "Troubleshooting" |

---

## Key Files & Directories

### Configuration Files

```
openMAIC/
├── vercel.json              ← Vercel deployment config
├── next.config.ts           ← Next.js config
├── .env.local.example       ← Environment template
├── .env.local               ← Your local secrets (gitignored)
├── .github/workflows/
│   ├── ci.yml              ← Automatic tests on push
│   └── deploy.yml          ← Staging & production deployment
└── supabase/
    └── migrations/         ← Database migrations
```

### Documentation Files

```
openMAIC/
├── DEPLOYMENT_INDEX.md      ← This file (overview)
├── DEPLOYMENT_RUNBOOK.md    ← Step-by-step procedures
├── DEPLOYMENT_CHECKLIST.md  ← Pre/post checks
├── ENVIRONMENT_SETUP.md     ← Local dev setup
├── VERCEL_SETUP.md          ← Vercel configuration
└── MONITORING_SETUP.md      ← Error tracking & monitoring
```

---

## Environment Variables Reference

### Quick Copy-Paste (for .env.local)

```bash
# Local Development
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-v0-...           # Get from console.anthropic.com
SUPABASE_URL=https://staging.supabase.co  # Your staging DB
SUPABASE_ANON_KEY=eyJ...                  # From Supabase project
SUPABASE_SERVICE_KEY=eyJ...               # From Supabase project
JWT_SECRET=your-random-secret-min-32-chars
```

### For Vercel (Preview)

Set in: https://vercel.com/dashboard/project/dailyagile-platform/settings/environment-variables

```
VERCEL_ENV = staging
NEXT_PUBLIC_APP_URL = https://staging-dailyagile.vercel.app
SUPABASE_URL = https://staging.supabase.co
SUPABASE_ANON_KEY = eyJ... (staging)
SUPABASE_SERVICE_KEY = eyJ... (staging)
ANTHROPIC_API_KEY = sk-ant-v0-...
(Scope: Preview & Development)
```

### For Vercel (Production)

```
VERCEL_ENV = production
NEXT_PUBLIC_APP_URL = https://dailyagile.com
SUPABASE_URL = https://reconnection.supabase.co
SUPABASE_ANON_KEY = eyJ... (production)
SUPABASE_SERVICE_KEY = eyJ... (production)
ANTHROPIC_API_KEY = sk-ant-v0-...
SENTRY_AUTH_TOKEN = ...
(Scope: Production)
```

**See ENVIRONMENT_SETUP.md for complete list.**

---

## Tools & Services Used

| Tool | Purpose | Cost | Setup |
|---|---|---|---|
| **Vercel** | Hosting & deployment | Free tier | https://vercel.com/dashboard |
| **Supabase** | Database & auth | Free tier (for MVP) | https://supabase.co/dashboard |
| **GitHub** | Source control & CI/CD | Free public repo | https://github.com/DailyAgile |
| **Sentry** | Error tracking | Free tier | https://sentry.io/organizations/dailyagile |
| **Anthropic API** | LLM for OpenMAIC | Pay as you go | https://console.anthropic.com |
| **Uptime Robot** | Monitoring | Free tier | https://uptimerobot.com |

---

## Communication Channels

| Channel | Purpose | Notifications |
|---|---|---|
| **GitHub Actions** | CI/CD status | Email (on failure) |
| **Slack #prod-alerts** | Production alerts | Real-time Sentry errors |
| **Vercel Dashboard** | Deployment status | Email (on failure) |
| **Sentry** | Error tracking | Email + Slack |

---

## Monthly Checklist

**First of every month:**

- [ ] Rotate API keys (Anthropic, Stripe, JWT_SECRET)
- [ ] Review Sentry issues (resolve/snooze old ones)
- [ ] Check database performance (Supabase)
- [ ] Review Vercel usage & billing
- [ ] Update dependencies: `pnpm update`
- [ ] Run security audit: `pnpm audit fix`
- [ ] Test database restore procedure

---

## Support & Questions

**For help with:**

| Topic | See | Contact |
|---|---|---|
| Local development setup | ENVIRONMENT_SETUP.md | Dev team |
| Staging deployment | DEPLOYMENT_RUNBOOK.md | Tech lead |
| Production deployment | DEPLOYMENT_RUNBOOK.md | Tech lead + on-call |
| Error tracking setup | MONITORING_SETUP.md | DevOps |
| Vercel configuration | VERCEL_SETUP.md | DevOps |
| Database issues | Supabase docs | Tech lead |

---

## Timeline to Launch

| Day | Task | Owner | Status |
|---|---|---|---|
| **Days 1-2** | Setup deployment infrastructure | DevOps | ✅ (This doc) |
| **Days 3-5** | Develop core features | Dev team | 🔄 |
| **Days 6-10** | Feature testing & refinement | QA | 🔄 |
| **Days 11-14** | Staging testing & optimization | All | 🔄 |
| **Day 15** | Production launch | Tech lead + on-call | 🎯 |

---

## Quick Reference Commands

```bash
# ── Local Development ──────────────────────────────────────
pnpm dev           # Start dev server (localhost:3000)
pnpm test          # Run unit tests
pnpm test:e2e      # Run E2E tests
pnpm build         # Build for production
pnpm lint          # Check code style
pnpm format        # Fix code style
npx tsc --noEmit   # Type check

# ── Git & Deployment ──────────────────────────────────────
git status         # Check uncommitted changes
git push origin main  # Push to trigger staging deploy
git log --oneline  # View recent commits

# ── GitHub Actions ────────────────────────────────────────
gh workflow run deploy.yml -f environment=production -r main  # Trigger prod deploy
gh run list        # View recent workflow runs
gh run view <id>   # View specific run details

# ── Vercel CLI ────────────────────────────────────────────
vercel link        # Link local project to Vercel
vercel env ls      # List environment variables
vercel logs --follow  # Stream production logs
vercel deployments # List all deployments
vercel --prod      # Deploy to production (manual)

# ── Supabase CLI ──────────────────────────────────────────
supabase link      # Link to Supabase project
supabase migration list --project-ref <id>  # List migrations
supabase migration deploy --project-ref <id>  # Apply migrations

# ── Monitoring ────────────────────────────────────────────
curl https://dailyagile.com/api/health  # Check if live
curl -I https://dailyagile.com  # Check SSL, headers
```

---

## Disaster Recovery

**If production goes down:**

1. **Check status**:
   - Vercel dashboard: https://vercel.com/dashboard
   - Sentry errors: https://sentry.io/organizations/dailyagile/issues/
   - GitHub Actions: Recent deployment logs

2. **Immediate action**:
   - If code issue: Rollback (see DEPLOYMENT_RUNBOOK.md)
   - If database issue: Check Supabase logs
   - If Vercel issue: Wait or contact Vercel support

3. **Communicate**:
   - Announce in Slack #prod-alerts
   - Update status page
   - Contact stakeholders

4. **Post-incident**:
   - Document what happened
   - Create GitHub issue for fix
   - Review checklist to prevent next time

---

## Document Versioning

| Version | Date | Changes |
|---|---|---|
| 1.0 | Aug 2026 | Initial deployment infrastructure |
| | | CI/CD pipeline setup |
| | | All documentation created |

**Last Updated:** August 2026
**Next Review:** Before Day 15 launch
**Owner:** DevOps / Tech Lead

---

**You are ready to deploy! 🚀**

Start with:
1. ENVIRONMENT_SETUP.md (if local dev setup needed)
2. VERCEL_SETUP.md (if Vercel configuration needed)
3. DEPLOYMENT_RUNBOOK.md (for actual deployment)

Good luck with the launch! 🎉
