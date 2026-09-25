# Phase 2 ILT - Staging Deployment Guide

**Last Updated:** August 6, 2026  
**Environment:** Staging (Vercel preview)  
**Audience:** DevOps team, QA testers

---

## 🚀 Pre-Deployment Checklist

### Code Readiness
- ✅ All Tier 1 features merged to `staging` branch
- ✅ Database migrations tested locally
- ✅ API endpoints functional (manual testing complete)
- ✅ React components render without errors
- ✅ TypeScript strict mode passes (no `any` types)

### Environment Setup
- ✅ Supabase staging project created
- ✅ GitHub repo configured for Vercel integration
- ✅ Environment variables set (see `.env.staging` below)
- ✅ Database migrations ready to run

---

## 🔧 Step 1: Environment Setup

### 1.1 Create `.env.staging` File

Create `/Users/apgo21/dailyagile-platform/openMAIC/.env.staging`:

```bash
# Supabase (Staging)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-staging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key

# Auth
NEXTAUTH_SECRET=your-secret-for-staging
NEXTAUTH_URL=https://openmatic-staging.vercel.app

# Feature Flags
NEXT_PUBLIC_FEATURE_ILT=true
NEXT_PUBLIC_ENVIRONMENT=staging
```

### 1.2 Verify Supabase Staging Project

```bash
# Check Supabase project exists
supabase projects list

# Link local environment to staging project
supabase link --project-ref your-project-ref
```

---

## 🗄️ Step 2: Database Migration

### 2.1 Run Migrations on Staging

```bash
# From openMAIC directory
cd openMAIC

# Option A: Using Supabase CLI (recommended)
supabase db push --linked

# Option B: Manual SQL (if CLI doesn't work)
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Create new query
# 3. Copy-paste contents of supabase/migrations/001_create_ilt_tables.sql
# 4. Run query
```

### 2.2 Verify Migration Success

```bash
# Check tables were created
supabase db list-columns

# Should show:
# - classrooms
# - students
# - student_rosters
# - quiz_submissions
# - quiz_answers
# - instructor_sessions
# - audit_logs
```

### 2.3 Test RLS Policies

```bash
# Connect to staging database
psql postgresql://postgres:password@your-project-staging.supabase.co:5432/postgres

# List RLS policies
SELECT * FROM pg_policies WHERE tablename = 'student_rosters';

# Verify at least one policy exists per table
```

---

## 📦 Step 3: Deployment to Vercel

### 3.1 Push Code to Staging Branch

```bash
# From repo root
cd /Users/apgo21/dailyagile-platform

# Create/switch to staging branch
git checkout staging || git checkout -b staging

# Commit Phase 2 changes
git add .
git commit -m "Phase 2 ILT: Student roster management + CSV import

Features:
- Student roster CRUD (add, list, remove)
- CSV bulk import with validation
- Database schema with RLS
- Type-safe API endpoints
- React components (table, form)

Co-Authored-By: Claude Code <noreply@anthropic.com>"

# Push to remote
git push origin staging
```

### 3.2 Vercel Deployment

**Option A: Automatic (Recommended)**
```bash
# Vercel auto-deploys when staging branch is pushed
# Check deployment at: https://openmatic-staging.vercel.app
```

**Option B: Manual Deploy**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy staging environment
vercel deploy --prod --env staging

# Follow prompts, confirm settings
```

### 3.3 Wait for Deployment

```bash
# Check deployment status
vercel status

# Expected output:
# ✓ Deployment ready at: https://openmatic-staging.vercel.app
```

### 3.4 Verify Deployment Health

```bash
# Test health endpoint
curl https://openmatic-staging.vercel.app/api/health

# Response should be:
# { "status": "ok", "environment": "staging" }
```

---

## 🧪 Step 4: Smoke Testing

### 4.1 Manual Testing Checklist

```bash
# 1. Visit homepage
curl https://openmatic-staging.vercel.app

# 2. Create test classroom (if auth flows exist)
# TODO: Get auth token from staging
TOKEN="your-staging-jwt-token"

# 3. Test roster API
curl "https://openmatic-staging.vercel.app/api/classrooms/test-id/students" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 with empty list or students
```

### 4.2 Browser Testing

1. Open https://openmatic-staging.vercel.app in Chrome
2. Open DevTools (F12)
3. Check Console for errors (should be clean)
4. Check Network tab for failed requests
5. Navigate to `/dashboard` or quiz feature

### 4.3 Database Connection Test

```bash
# Test Supabase connection from deployed app
# Add temporary debug endpoint at /api/debug/db

// In app/api/debug/db/route.ts
export async function GET(request: NextRequest) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  );

  const { data, error } = await supabase
    .from('classrooms')
    .select('COUNT(*)', { count: 'exact' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'ok', data });
}

# Then test:
curl https://openmatic-staging.vercel.app/api/debug/db
```

---

## 📊 Step 5: Performance Baseline

### 5.1 Measure Page Load Time

```bash
# Use Lighthouse in Chrome DevTools
# 1. Open DevTools (F12)
# 2. Go to Lighthouse tab
# 3. Run audit (desktop + mobile)
# 4. Record scores for baseline:
#    - Performance: target >80
#    - Accessibility: target >90
#    - Best Practices: target >85
#    - SEO: target >90
```

### 5.2 API Response Time

```bash
# Measure endpoint latency
curl -w "\nTotal time: %{time_total}s\n" \
  "https://openmatic-staging.vercel.app/api/classrooms/test-id/students?page=1" \
  -H "Authorization: Bearer $TOKEN"

# Target: <500ms for single page load
```

### 5.3 Database Query Performance

```sql
-- Check slow queries in staging
SELECT 
  query,
  calls,
  mean_time,
  total_time
FROM pg_stat_statements
WHERE query NOT LIKE 'BEGIN%'
ORDER BY mean_time DESC
LIMIT 10;

-- All queries should be <100ms
```

---

## 🔍 Step 6: Verify Features

### 6.1 Test Student Roster

**Manual Flow:**
1. Log in as instructor
2. Navigate to classroom settings
3. Click "Add Student"
4. Fill in form: email, name, student ID
5. Click submit
6. Verify student appears in roster table
7. Search for student by name
8. Click remove → confirm → verify removed

**Expected Results:**
- ✅ Form validates email format
- ✅ Student added to database
- ✅ Appears in paginated list
- ✅ Search filters results
- ✅ Remove changes status (soft delete)

### 6.2 Test CSV Import

**Prepare test file:**
```csv
Email,Name,Student ID
alice@test.com,Alice Test,TEST-001
bob@test.com,Bob Test,TEST-002
carol@test.com,Carol Test,TEST-003
```

**Manual Flow:**
1. Navigate to CSV import
2. Drag-drop CSV file
3. Review validation preview
4. Click "Import"
5. Verify success message
6. Check roster for new students

**Expected Results:**
- ✅ File parses without errors
- ✅ Preview shows all 3 students
- ✅ Import button enabled
- ✅ Students added to database
- ✅ Appear in roster immediately

### 6.3 Test Error Cases

**Invalid CSV:**
```csv
Email,Name
invalid-email-format,Alice  # Missing @
,Bob  # Missing email
carol@test.com,Carol Test  # Valid
```

**Expected:**
- ✅ First row errors reported
- ✅ Second row errors reported
- ✅ Third row marked for import
- ✅ User can fix and retry

---

## 🔐 Step 7: Security Verification

### 7.1 Test RLS Policies

```bash
# As Instructor A, can they see Instructor B's classroom?
TOKEN_A="instructor-a-token"
TOKEN_B="instructor-b-token"

# Instructor A lists their students
curl "https://openmatic-staging.vercel.app/api/classrooms/classroom-a/students" \
  -H "Authorization: Bearer $TOKEN_A"
# Should return: [students]

# Instructor A tries to access Instructor B's classroom
curl "https://openmatic-staging.vercel.app/api/classrooms/classroom-b/students" \
  -H "Authorization: Bearer $TOKEN_A"
# Should return: 403 Forbidden
```

### 7.2 Verify Audit Logging

```bash
# Check audit_logs table for events
SELECT COUNT(*) FROM audit_logs 
WHERE classroom_id = 'test-classroom'
ORDER BY created_at DESC;

# Should see entries for:
# - student_added
# - roster_viewed
# - student_removed
# - bulk_import_students
```

### 7.3 Test Input Validation

```bash
# Try to add student with invalid email
curl -X POST "https://openmatic-staging.vercel.app/api/classrooms/test-id/students" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","name":"Test"}'

# Should return: 400 VALIDATION_ERROR
```

---

## 📈 Step 8: Load Testing (Optional, for Scale Validation)

### 8.1 Simple Load Test with Artillery

```bash
# Install Artillery
npm install -g artillery

# Create load-test.yml
cat > load-test.yml <<EOF
config:
  target: "https://openmatic-staging.vercel.app"
  phases:
    - duration: 60
      arrivalRate: 10  # 10 requests per second
      name: "Warm up"
    - duration: 120
      arrivalRate: 50  # 50 requests per second
      name: "Ramp up"
scenarios:
  - name: "List Students"
    flow:
      - get:
          url: "/api/classrooms/test-id/students?page=1&limit=50"
          headers:
            Authorization: "Bearer {{ \$randomString(50) }}"
EOF

# Run test
artillery run load-test.yml
```

### 8.2 Interpret Results

```
Target: 50 requests/second
Expected:
- p50 latency: <200ms
- p95 latency: <500ms
- p99 latency: <1000ms
- Error rate: <1%
```

---

## ✅ Post-Deployment Checklist

- ✅ App deploys successfully to Vercel
- ✅ Health endpoint returns 200
- ✅ Database migrations run without errors
- ✅ All Tier 1 features functional (manual testing)
- ✅ No console errors or warnings
- ✅ RLS policies enforce access control
- ✅ Audit logs capture all mutations
- ✅ Form validation works correctly
- ✅ CSV import processes files correctly
- ✅ API response times <500ms
- ✅ Mobile responsive (test on iPhone)

---

## 🐛 Troubleshooting

### Issue: "Permission denied" on API endpoints

**Solution:**
```bash
# Check RLS policies are enabled
SELECT COUNT(*) FROM pg_policies 
WHERE tablename IN ('classrooms', 'students', 'student_rosters');

# Should return: 7+ policies

# Verify auth token is valid
# Check token expiration: decoded token should have exp > current time
```

### Issue: CSV file doesn't upload

**Solution:**
```bash
# Check file size
ls -lh your-file.csv

# Must be <10MB

# Verify Content-Type: text/csv
# Check Vercel function logs for errors
```

### Issue: Slow API responses (>1s)

**Solution:**
```bash
# Check database indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename = 'quiz_submissions';

# Should see indexes on:
# - classroom_id
# - student_id
# - (classroom_id, student_id)

# If missing, run migrations again
```

### Issue: Vercel deployment fails

**Solution:**
```bash
# Check build logs in Vercel dashboard
vercel logs --prod

# Common issues:
# - Environment variables not set
# - TypeScript compilation errors
# - Missing dependencies

# Fix and redeploy:
git push origin staging
```

---

## 🎯 Step 9: Week 2 Quiz Submission Feature Deployment

### 9.1 New Database Tables (Quiz Submissions)

```bash
# Run migration for quiz submission tables
cd openMAIC

# Option A: Using Supabase CLI
supabase db push --linked

# Option B: Manual SQL (Supabase Dashboard)
# Copy contents of supabase/migrations/002_create_quiz_submissions.sql
# Paste into SQL Editor and run
```

**New tables created:**
- `quiz_submissions` - Tracks student quiz attempts
- `quiz_answers` - Individual question responses
- `quiz_questions` - Question definitions
- `quiz_submission_status_history` - Audit trail of status changes

### 9.2 Update Environment Variables

Add to `.env.staging`:

```bash
# Quiz feature flags
NEXT_PUBLIC_FEATURE_QUIZ_SUBMISSIONS=true
NEXT_PUBLIC_QUIZ_SUBMISSION_TIMEOUT=1800000  # 30 minutes in ms

# Quiz grading (Claude API)
ANTHROPIC_API_KEY=sk-ant-...  # Claude API key for auto-grading
QUIZ_MAX_TOKENS_PER_SUBMISSION=2000

# Quiz settings
QUIZ_PASSING_SCORE=70
QUIZ_ALLOW_RETAKES=true
QUIZ_RETAKE_DELAY_HOURS=24
```

### 9.3 Verify Quiz Submission Database

```bash
# Check tables exist
supabase db list-columns

# Should show:
# - quiz_submissions
# - quiz_answers
# - quiz_questions
# - quiz_submission_status_history

# Verify RLS policies on quiz tables
psql postgresql://postgres:password@your-project-staging.supabase.co:5432/postgres

SELECT * FROM pg_policies WHERE tablename LIKE 'quiz_%';
# Should return policies for quiz_submissions and quiz_answers
```

### 9.4 Test Quiz Submission Endpoints

```bash
TOKEN="your-staging-jwt-token"

# 1. Get available quizzes for classroom
curl "https://openmatic-staging.vercel.app/api/classrooms/cls-1/quizzes" \
  -H "Authorization: Bearer $TOKEN"

# 2. Start a quiz submission (creates in_progress record)
curl -X POST "https://openmatic-staging.vercel.app/api/classrooms/cls-1/quiz-submissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quiz_id": "quiz-123",
    "student_id": "stu-456"
  }'
# Response: { submission_id, status: "in_progress", created_at }

# 3. Submit answers
curl -X POST "https://openmatic-staging.vercel.app/api/classrooms/cls-1/quiz-submissions/sub-789/submit" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      { "question_id": "q-1", "student_answer": "Option A" },
      { "question_id": "q-2", "student_answer": "My answer text" }
    ]
  }'
# Response: { submission_id, status: "submitted", score, feedback }

# 4. View submission (with feedback)
curl "https://openmatic-staging.vercel.app/api/classrooms/cls-1/quiz-submissions/sub-789" \
  -H "Authorization: Bearer $TOKEN"
# Response: Full submission with answers, scores, feedback per question

# 5. View student's submission history
curl "https://openmatic-staging.vercel.app/api/classrooms/cls-1/students/stu-456/submissions?status=graded" \
  -H "Authorization: Bearer $TOKEN"
# Response: Paginated list of student's quiz submissions
```

### 9.5 Week 2 Testing Checklist (Quiz Submission)

- ✅ Database migrations run without errors
- ✅ Quiz submission endpoints respond 200
- ✅ Student can start quiz (creates in_progress submission)
- ✅ Student can submit answers (status changes to submitted)
- ✅ Claude API grades submission successfully
- ✅ Feedback returned to student (per-question)
- ✅ Submission visible in student's history
- ✅ Instructor can view class quiz statistics
- ✅ RLS policies prevent student from accessing others' submissions
- ✅ Soft-deleted submissions don't appear in lists
- ✅ API rate limiting works (prevent spam submissions)

---

## 📋 Rollback Plan

If critical issues found in staging:

```bash
# 1. Identify the problem
# 2. Fix on staging branch
# 3. Test thoroughly locally
# 4. Commit and push
# 5. Wait for auto-redeploy (or manually trigger)

# To manual redeploy:
vercel deploy --prod --env staging

# If quiz feature is broken, disable temporarily:
# In Vercel Environment Variables, set:
NEXT_PUBLIC_FEATURE_QUIZ_SUBMISSIONS=false

# Then push code to re-deploy with feature off

# Full database rollback (if migration failed):
# 1. Verify no data loss in backup
# 2. Restore from backup snapshot (Supabase → Backups)
# 3. Re-run migrations from known good state

# If disaster, roll back to previous version:
# In Vercel dashboard → Deployments → Previous version → Promote
```

---

## 📞 Support & Escalation

**If deployment fails:**
1. Check Vercel logs: `vercel logs --prod`
2. Check database migrations ran: Supabase dashboard
3. Verify environment variables set in Vercel
4. Check Claude API key is valid: test in local `.env.local`
5. Post error in #engineering Slack

**If features don't work:**
1. Check browser console for errors (F12)
2. Check Vercel function logs: `vercel logs --prod`
3. Test API endpoint directly with curl
4. Check RLS policies in Supabase
5. Verify Claude API responses: check Anthropic console

**If quiz submission is slow:**
1. Check Claude API latency (can be 2-5 seconds per submission)
2. Monitor database query performance: Supabase → Query Performance
3. Check if indexes exist on `quiz_submissions(classroom_id, student_id)`

---

**Deployment Owner:** DevOps Team  
**Testing Owner:** QA Team  
**Operations Owner:** Platform Team  
**Approval Gate:** All checks pass + smoke tests green = ready for production

**Ready to deploy? Proceed to Step 1 above.**
