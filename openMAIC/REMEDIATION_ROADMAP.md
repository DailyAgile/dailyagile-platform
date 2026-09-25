# DailyAgile Quiz Platform — Production Error Tracking & Health Check

**Date Implemented:** August 16, 2026
**Status:** Ready for Production

---

## 1. Sentry Error Tracking Integration

### Setup Complete

**Components Implemented:**
- `instrumentation.ts` — Sentry initialization for Next.js
- `@sentry/nextjs` installed (v10.70.0)
- Environment variable: `SENTRY_DSN`
- Error capture wired to `/api/quiz-grade` endpoint

### Configuration

**Environment File:** `.env.local`

```
# Sentry (Error tracking & performance monitoring)
SENTRY_DSN=https://<your-key>@o0.ingest.sentry.io/<project-id>
```

**To Get Your DSN:**
1. Go to https://sentry.io/
2. Create a new project (or use existing)
3. Select "Next.js" as the platform
4. Copy the DSN from Settings → Client Keys (DSN)
5. Paste into `.env.local` as `SENTRY_DSN`

### How It Works

**Automatic Capture:**
- All unhandled server-side errors in Next.js route handlers
- Network errors, timeouts, API failures
- Error rate monitoring and alerts

**Manual Capture:**
- Quiz grading failures (tagged with question type, points, language)
- Database persistence errors
- AI service failures

**Tag Structure:**
```
tags:
  component: "quiz-grading" | "quiz-grade-endpoint" | "health-check-endpoint"
  questionType: "short_answer" | "essay" | "code" | "scenario"
  feature: "grading"
  severity: "critical" | "warning"

contexts:
  quiz:
    question_snippet: "first 60 chars of question"
    points: 100
    language: "en" | "zh-CN"
```

### Monitoring & Alerts

**Dashboard Setup (in Sentry):**
1. Go to Issues → configure filters
2. Set up alerts for `[production] quiz-grade-endpoint` errors
3. Recommended: Email alerts when error rate > 5% or > 10 errors/hour

**Metrics to Monitor:**
- Error rate per question type
- API response latency (in Sentry Traces)
- P95/P99 response times
- Rate limit violations (429 errors)

---

## 2. Health Check Endpoint

### Endpoint URL

**Production:** `https://dailyagile.com/api/health`
**Development:** `http://localhost:3002/api/health`

### Response Codes

- **200 OK** — All critical services healthy
- **503 Service Unavailable** — One or more critical services down/degraded

### Response Structure

```json
{
  "status": "healthy" | "degraded",
  "timestamp": "2026-08-16T15:45:30.123Z",
  "checks": [
    {
      "name": "Supabase Database",
      "status": "healthy" | "degraded" | "down",
      "latency_ms": 145,
      "error": "optional error message",
      "timestamp": "2026-08-16T15:45:30.123Z"
    },
    {
      "name": "Anthropic Claude API",
      "status": "healthy" | "degraded" | "down",
      "latency_ms": 230,
      "error": null,
      "timestamp": "2026-08-16T15:45:30.123Z"
    },
    {
      "name": "Email Service (Brevo)",
      "status": "healthy" | "degraded" | "down",
      "latency_ms": 890,
      "error": null,
      "timestamp": "2026-08-16T15:45:30.123Z"
    }
  ],
  "overall_latency_ms": 1265
}
```

### Critical vs Optional Checks

**Critical (returns 503 if down):**
1. Supabase Database
2. Anthropic Claude API

**Optional (non-critical, no 503):**
- Email Service (Brevo)

### What Gets Checked

#### 1. Supabase Database
- **Method:** HEAD request to `/rest/v1/`
- **Timeout:** 5 seconds
- **Credentials:** `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- **Success:** HTTP 200 or 404 (both indicate service running)

#### 2. Claude API
- **Method:** GET `/v1/models` endpoint
- **Timeout:** 5 seconds
- **Credentials:** `ANTHROPIC_API_KEY`
- **Success:** HTTP 200 (verifies API key and connectivity)
- **Note:** Lightweight call, no quota consumed

#### 3. Email Service (Brevo)
- **Method:** GET `/v3/account` endpoint
- **Timeout:** 5 seconds
- **Credentials:** `BREVO_API_KEY`
- **Success:** HTTP 200 (verifies account is active)
- **Note:** Non-critical — if Brevo is down, students can still take quizzes

### Monitoring Integration

**Uptime Monitoring (recommended tools):**
- Vercel Analytics (built-in)
- UptimeRobot — ping `/api/health` every 5 minutes
- Sentry Crons — schedule daily health check

**Example Uptime Robot Setup:**
1. Go to https://uptimerobot.com/
2. Create new monitor
3. Name: "DailyAgile Health Check"
4. URL: `https://dailyagile.com/api/health`
5. Monitor interval: 5 minutes
6. Alert on HTTP status codes: 5xx (500-599)
7. Alert contacts: your email

**Example Sentry Cron Setup:**
```typescript
// In quiz grading endpoint or scheduled task
import { captureCheckIn } from '@sentry/nextjs';

captureCheckIn({
  monitorSlug: 'quiz-health',
  status: 'ok', // or 'error'
  duration: latency_ms,
});
```

### Testing the Endpoint

**Local Development:**
```bash
curl http://localhost:3002/api/health | jq .
```

**Production:**
```bash
curl https://dailyagile.com/api/health | jq .
```

**With Pretty Print:**
```bash
curl -s https://dailyagile.com/api/health | python -m json.tool
```

**Expected Output (healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2026-08-16T15:45:30.123Z",
  "checks": [
    {
      "name": "Supabase Database",
      "status": "healthy",
      "latency_ms": 145,
      "timestamp": "2026-08-16T15:45:30.123Z"
    },
    {
      "name": "Anthropic Claude API",
      "status": "healthy",
      "latency_ms": 230,
      "timestamp": "2026-08-16T15:45:30.123Z"
    },
    {
      "name": "Email Service (Brevo)",
      "status": "healthy",
      "latency_ms": 890,
      "timestamp": "2026-08-16T15:45:30.123Z"
    }
  ],
  "overall_latency_ms": 1265
}
```

---

## 3. Error Tracking in Quiz Grading

### Sentry Integration in Quiz Grade Endpoint

**File:** `/app/api/quiz-grade/route.ts`

**Error Capture Points:**

1. **Grading Errors (inner catch block)**
   - When AI model fails to grade a response
   - When question type routing fails
   - When code grading queue fails

   ```typescript
   Sentry.captureException(gradingError, {
     tags: {
       component: 'quiz-grading',
       questionType: questionType || 'unknown',
       feature: 'grading',
     },
     contexts: {
       quiz: {
         question_snippet: questionSnippet,
         points,
         language,
       },
     },
   });
   ```

2. **Critical Errors (outer catch block)**
   - When entire grading endpoint fails
   - CSRF validation failures
   - JSON parsing errors
   - Rate limit rejections

   ```typescript
   Sentry.captureException(error, {
     level: 'error',
     tags: {
       component: 'quiz-grade-endpoint',
       feature: 'grading',
       severity: 'critical',
     },
     contexts: {
       request: {
         question_snippet: questionSnippet,
         points: resolvedPoints,
       },
     },
   });
   ```

### Breadcrumb Trail

Every error includes:
- Timestamp of error
- Request headers (sanitized)
- Previous console logs
- Network requests made
- Browser state (client-side)

### Filtering in Sentry

**To see only quiz grading errors:**
```
component:quiz-grading OR component:quiz-grade-endpoint
```

**To see critical production errors:**
```
environment:production severity:critical
```

**To see errors for a specific question type:**
```
tags.questionType:essay
```

---

## 4. Deployment Checklist

Before deploying to production:

- [ ] Obtain Sentry DSN from https://sentry.io/
- [ ] Add `SENTRY_DSN` to Vercel environment variables
- [ ] Verify `SENTRY_DSN` is NOT in `.env.local` git history (it's sensitive)
- [ ] Test health endpoint: `curl https://staging.dailyagile.com/api/health`
- [ ] Configure uptime monitoring (UptimeRobot or similar)
- [ ] Set up Sentry alerts for error rate spikes
- [ ] Verify Supabase credentials are current
- [ ] Verify Claude API key has sufficient quota
- [ ] Verify Brevo email key is active

### Environment Variables Required

For production deployment to Vercel:

```
SENTRY_DSN=https://your-key@o0.ingest.sentry.io/your-project
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
BREVO_API_KEY=xkeysib-...
```

---

## 5. Troubleshooting

### Health Check Returns 503 for Supabase

**Possible Causes:**
1. `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` not configured
2. Supabase project is paused
3. Network connectivity issues
4. Supabase service is down

**Fix:**
```bash
# Test Supabase connectivity manually
curl -H "Authorization: Bearer your-service-key" \
     https://your-project.supabase.co/rest/v1/

# Should return 200 or 404 (both are OK)
```

### Health Check Returns 503 for Claude API

**Possible Causes:**
1. `ANTHROPIC_API_KEY` is invalid or expired
2. API key doesn't have `/v1/models` access
3. Rate limit exceeded on API key
4. Anthropic API is down

**Fix:**
```bash
# Verify API key
curl -H "Authorization: Bearer sk-ant-your-key" \
     https://api.anthropic.com/v1/models

# Should return 200 with list of available models
```

### Sentry Errors Not Appearing

**Possible Causes:**
1. `SENTRY_DSN` is invalid or malformed
2. Environment is not `production` (Sentry disabled in dev)
3. Error occurred before Sentry initialization
4. Error is being caught and suppressed

**Fix:**
```bash
# Check if SENTRY_DSN is set
echo $SENTRY_DSN

# Verify format: https://<key>@o0.ingest.sentry.io/<project>

# In development, enable Sentry:
NODE_ENV=production npm run dev

# Check browser console for Sentry SDK errors
```

---

## 6. Performance Considerations

**Health Check Overhead:**
- Runs 3 async checks in parallel (max 5 seconds timeout each)
- Average response time: 300-500ms in good conditions
- No database queries (uses REST API instead)
- Safe to call every 5 minutes from monitoring service

**Sentry Overhead:**
- Minimal — error capture is fire-and-forget
- Performance monitoring samples 10% of transactions (production)
- No blocking I/O in critical path

---

## 7. Next Steps

1. **Immediate (now):**
   - Set `SENTRY_DSN` in Vercel environment variables
   - Test health endpoint in staging

2. **This week:**
   - Configure uptime monitoring (UptimeRobot)
   - Set up Sentry alerts for error spikes
   - Monitor for false positives

3. **This month:**
   - Analyze error patterns from first production data
   - Optimize grading algorithm based on errors
   - Add custom metrics for student success rates

---

## File Reference

| File | Purpose |
|------|---------|
| `instrumentation.ts` | Sentry initialization for Next.js |
| `next.config.ts` | Enable `experimentalInstrumentationHook` |
| `.env.local` | `SENTRY_DSN` configuration |
| `app/api/quiz-grade/route.ts` | Quiz grading with Sentry error capture |
| `app/api/health/route.ts` | Health check endpoint (new) |
| `REMEDIATION_ROADMAP.md` | This file |

---

**Questions? Check Sentry docs:** https://docs.sentry.io/platforms/javascript/guides/nextjs/
