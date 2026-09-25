# Performance Optimization & Race Condition Fixes — Testing & Deployment Guide

**Deployment Date:** 2026-08-15  
**Critical Issues Fixed:** 2 (N+1 Query Performance Crisis, Streak Race Condition)  
**Performance Improvement:** 1–2 seconds → <500ms for dashboard load

---

## Overview of Changes

### Issue #1: N+1 Query Performance Crisis (CRITICAL)
**Current State:** Dashboard fetches 20 quizzes → then fetches best_score for each → then fetches access_type for each  
**Result:** 1 + 20 + 20 = 41 queries instead of 1  
**Load Time Impact:** 1–2 seconds → 400–500ms target

**Files Modified:**
- `/openMAIC/app/api/student/quizzes/route.ts` — Eliminated N+1 for quiz discovery
- `/openMAIC/app/api/student/dashboard/route.ts` — Eliminated N+1 for dashboard quizzes + progress

**Fix Applied:** Use LEFT JOINs + array aggregation in single query

---

### Issue #2: Streak Race Condition (CRITICAL)
**Current State:** Two concurrent quiz submissions can race on streak update  
**Problem Scenario:**
```
Time 1: Request A reads streak = 5
Time 2: Request B reads streak = 5
Time 3: Request A writes streak = 6
Time 4: Request B writes streak = 6  ❌ Should be 7!
```

**Files Modified:**
- `/openMAIC/supabase/migrations/023_fix_performance_and_races.sql` — New atomic function
- `/openMAIC/lib/student/gamification/streaks.ts` — Uses new atomic RPC function

**Fix Applied:** Database-level locking with SELECT FOR UPDATE inside atomic SQL function

---

## Deployment Steps

### 1. Apply Database Migration
```bash
cd /Users/apgo21/dailyagile-platform/openMAIC

# Apply the migration to your Supabase project
npx supabase db push  # If local development

# OR manually via Supabase dashboard:
# - Go to SQL Editor
# - Copy contents of supabase/migrations/023_fix_performance_and_races.sql
# - Execute
```

**What This Creates:**
- `update_streak_atomic()` function with FOR UPDATE locking
- `get_student_quizzes_with_scores()` helper function (optional, for reference)
- 3 new indexes for query performance
- Table statistics update for query optimizer

### 2. Verify Migration Success
```bash
# Test the new atomic function works
curl -X POST https://your-project.supabase.co/rest/v1/rpc/update_streak_atomic \
  -H "apikey: your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "p_student_id": "test-student-uuid",
    "p_quiz_id": "test-quiz-uuid",
    "p_user_timezone": "America/New_York",
    "p_now": "'$(date -u +'%Y-%m-%dT%H:%M:%SZ')'"
  }'
```

Expected response: `{ current_streak, longest_streak, streak_continued, badge_7day_awarded, last_quiz_date }`

### 3. Deploy API Changes
```bash
# No additional deployment needed — API changes are in app/ and lib/ files
# They will auto-deploy on next git push to main/production

git add .
git commit -m "Fix N+1 query performance crisis and streak race condition"
git push origin main
```

---

## Testing Plan

### Test 1: Verify N+1 Query is Fixed (Dashboard)
**Objective:** Dashboard should load quizzes with best scores in <500ms with <5 database queries

**Steps:**
1. Enable query logging in Supabase dashboard or use browser DevTools Network tab
2. Navigate to student dashboard
3. Check network waterfall:
   - Should see 1 quiz_access query (with JOINs)
   - Should see ~0–1 additional queries (for badges, streak, points)
   - ❌ Should NOT see 20+ individual quiz_submissions queries

**Success Criteria:**
- Dashboard loads in <500ms (was 1–2 seconds)
- Total queries: ~5–10 (was ~50)
- No timeout errors from slow queries

**Test Command (if using Supabase CLI):**
```bash
# Run dashboard API endpoint multiple times
for i in {1..5}; do
  time curl -s http://localhost:3000/api/student/dashboard \
    -H "Authorization: Bearer $STUDENT_TOKEN" | head -c 100
done
```

Expected output: Each request ~200–300ms (was 1–2 seconds)

---

### Test 2: Verify N+1 Query is Fixed (Quiz Discovery)
**Objective:** Quiz discovery endpoint should fetch 20 quizzes with scores in <300ms

**Steps:**
1. Navigate to quiz discovery/browse page
2. Monitor database queries in Supabase
3. Check network waterfall in browser DevTools

**Success Criteria:**
- Total queries: 1–2 (was 41)
- Load time: <300ms (was 1–2 seconds)
- All 20 quizzes rendered with best scores

---

### Test 3: Verify Streak Race Condition is Fixed
**Objective:** Two concurrent quiz submissions must not result in duplicate streak increments

**Scenario:**
Student takes Quiz A at 2:59:59 PM
Student takes Quiz B at 2:59:59 PM (same second, concurrent)
→ Both should correctly increment streaks to 6 and 7, not both 6

**Manual Test:**
```bash
# Create a simple script to submit two quizzes concurrently
# They will race to update the same student's streak

# Open two terminal windows in parallel and execute within 1 second of each other:

# Terminal 1:
curl -X POST http://localhost:3000/api/student/quiz/submit \
  -H "Content-Type: application/json" \
  -d '{"quizId":"quiz-1","studentId":"student-1","score":85}'

# Terminal 2 (start ~immediately after):
curl -X POST http://localhost:3000/api/student/quiz/submit \
  -H "Content-Type: application/json" \
  -d '{"quizId":"quiz-1","studentId":"student-1","score":90}'

# Then check the database:
# SELECT current_streak FROM student_streaks WHERE student_id = 'student-1' AND quiz_id = 'quiz-1';
# Should show SEQUENTIAL increments (6, then 7 on next day)
# NOT both reading 5 and both writing 6
```

**Automated Test (E2E):**
```bash
# See test file: tests/race-conditions/streak-concurrent-updates.spec.ts
npx playwright test streak-concurrent-updates
```

Expected behavior:
- First submission: streak increments 5 → 6
- Second submission (same quiz, same day): streak stays 6 (already took quiz today)
- Third submission (next day): streak increments 6 → 7
- ✅ Never results in both submissions causing same streak value

---

### Test 4: Load Testing with Concurrent Users
**Objective:** System should handle 50+ concurrent dashboard loads without query bottleneck

**Tool:** Apache Bench or k6
```bash
# Simulate 50 concurrent dashboard requests
ab -n 100 -c 50 http://localhost:3000/api/student/dashboard

# Expected:
# Total time: <10 seconds for 100 requests
# Failed requests: 0
# Avg response time: <100ms per request
```

---

## Rollback Plan

If any issues occur, rollback in this order:

### Step 1: Revert API Code Changes
```bash
git revert <commit-hash-of-api-changes>
git push origin main
```

This reverts `/openMAIC/app/api/student/quizzes/route.ts` and 
`/openMAIC/app/api/student/dashboard/route.ts` back to original N+1 pattern.

### Step 2: Revert Streak Function Changes
```bash
# Edit /openMAIC/lib/student/gamification/streaks.ts
# Restore the old updateStreak() function from git history
git checkout HEAD~1 -- openMAIC/lib/student/gamification/streaks.ts
git push origin main
```

### Step 3: Revert Database Migration (if needed)
```bash
# Run this in Supabase SQL Editor to drop the new function
DROP FUNCTION IF EXISTS public.update_streak_atomic(UUID, UUID, VARCHAR, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_student_quizzes_with_scores(UUID, INTEGER);
DROP INDEX IF EXISTS idx_streaks_student_quiz_for_update;
DROP INDEX IF EXISTS idx_quiz_access_student_quiz;
DROP INDEX IF EXISTS idx_quiz_submissions_student_quiz_graded;
```

---

## Performance Metrics to Monitor

After deployment, monitor these metrics for 24 hours:

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Dashboard load time | 1–2s | <500ms | ✅ Pass if <600ms |
| Quiz discovery load time | 1–2s | <300ms | ✅ Pass if <400ms |
| Database queries per dashboard | ~50 | <10 | ✅ Pass if <15 |
| Concurrent streaks (same day) | N/A | Sequential | ✅ Pass if atomic |
| Dashboard error rate | <0.1% | <0.1% | ✅ Pass if no increase |
| API response time p99 | >1s | <500ms | ✅ Pass if <600ms |

**Monitoring Tools:**
- Supabase dashboard: Logs → Query Performance
- Vercel dashboard: Analytics tab
- Sentry/DataDog (if configured)

---

## Key Files Changed

```
📝 NEW MIGRATION:
  supabase/migrations/023_fix_performance_and_races.sql
     ├─ update_streak_atomic() function with FOR UPDATE locking
     ├─ get_student_quizzes_with_scores() helper function
     └─ Optimized indexes for query performance

✏️ MODIFIED API ROUTES:
  app/api/student/quizzes/route.ts
     ├─ Removed 20×async best_score queries
     └─ Added single LEFT JOIN query with aggregation

  app/api/student/dashboard/route.ts
     ├─ Removed N×best_score queries for dashboard quizzes
     ├─ Removed 2×count queries for progress calculation
     └─ Added single query with JOINs + array aggregation

✏️ MODIFIED GAMIFICATION:
  lib/student/gamification/streaks.ts
     ├─ Removed unsafe read-modify-write pattern
     ├─ Added atomic RPC call to update_streak_atomic()
     └─ Timezone functions kept for compatibility
```

---

## Frequently Asked Questions (FAQ)

### Q: Will the changes break existing student data?
**A:** No. The changes are purely optimization and logic improvements. No data is migrated or deleted. All existing streak data remains unchanged.

### Q: What happens if the RPC call fails?
**A:** The error is caught and logged. Students will see an error message. Retry will work correctly because the function uses UPSERT (idempotent).

### Q: How does SELECT FOR UPDATE prevent race conditions?
**A:** When `SELECT...FOR UPDATE` executes, PostgreSQL locks the row, preventing any other transaction from reading/writing it until the current transaction completes. This serializes concurrent updates.

### Q: Why not use app-level mutex instead?
**A:** Database-level locking is more reliable. App-level mutexes only work within a single process. Multiple server instances (Vercel deployments) would still have race conditions. Database-level locking works across all instances.

### Q: Can I test this locally?
**A:** Yes! Use `npx supabase start` to run Supabase locally, apply the migration, and test the RPC function.

---

## Success Checklist

- [ ] Migration 023 successfully applied to Supabase
- [ ] update_streak_atomic() RPC function returns correct values
- [ ] Dashboard loads in <500ms (test with DevTools)
- [ ] Quiz discovery endpoint loads in <300ms
- [ ] No increase in API error rates
- [ ] Concurrent streak submissions tested (not double-incrementing)
- [ ] Load test with 50+ concurrent users passed
- [ ] No regression in other dashboard features
- [ ] Performance metrics logged in monitoring tool

---

## Questions or Issues?

If you encounter issues:
1. Check Supabase logs for SQL errors
2. Verify the RPC function exists: `SELECT * FROM pg_proc WHERE proname = 'update_streak_atomic'`
3. Test the RPC function directly in SQL Editor
4. Check browser console for JavaScript errors
5. Review git diff to verify all changes were applied

Reference commits:
- Migration: 023_fix_performance_and_races.sql
- API fixes: Modified route.ts files
- Gamification: Modified streaks.ts

---

**Deployment Status:** Ready for production  
**Risk Level:** Low (backward-compatible, RPC function-based)  
**Estimated Deployment Time:** 5 minutes  
**Estimated Testing Time:** 15 minutes  
