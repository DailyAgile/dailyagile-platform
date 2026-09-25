# Migration Validation Runbook

**Purpose:** Dry-run migrations on production-like data before production deploy  
**Timeline:** Day 4 (Jan 18, 2026)  
**Owner:** DevOps + QA Lead

---

## PHASE 1: DRY-RUN ON BACKUP (Morning — 2 hours)

### Step 1.1: Create Production Backup
```bash
# Backup from Supabase production (use CLI or dashboard)
supabase db pull production_backup.sql

# Verify backup integrity
ls -lh production_backup.sql
wc -l production_backup.sql  # Should be 10K+ lines
```

### Step 1.2: Create Test Database
```bash
# Spin up temporary test Postgres instance (or use local Docker)
docker run -d \
  --name quiz-test-db \
  -e POSTGRES_PASSWORD=test-pwd \
  -e POSTGRES_DB=test_db \
  postgres:15

# Wait for startup
sleep 5

# Restore backup to test DB
pg_restore -h localhost -U postgres -d test_db < production_backup.sql
```

### Step 1.3: Run Migration Against Test DB
```bash
# Apply migration 002 (Phase 2 extensions)
psql -h localhost -U postgres -d test_db < supabase/migrations/002_quiz_module_extensions.sql

# Check for errors (should have 0 errors)
echo $?  # Should be 0
```

### Step 1.4: Data Integrity Checks
```bash
# Run SQL validation queries against test DB
psql -h localhost -U postgres -d test_db << 'EOF'

-- 1. Verify quiz_answers rows unchanged
SELECT 'quiz_answers row count' as check,
  COUNT(*) as value FROM quiz_answers;

-- 2. Check for NULL violations in new columns
SELECT 'instructor_score nullable' as check,
  COUNT(*) as value FROM quiz_answers WHERE instructor_score IS NOT NULL;

-- 3. Verify effective_score calculation
SELECT 'effective_score generated' as check,
  COUNT(DISTINCT effective_score) as unique_values FROM quiz_answers;

-- 4. Verify RLS policies created
SELECT 'RLS policies count' as check,
  COUNT(*) as value FROM pg_policies WHERE tablename IN ('quiz_submissions', 'quiz_answers');

-- 5. Check NEW constraint exists
SELECT 'instructor_score constraint' as check,
  COUNT(*) as value FROM information_schema.table_constraints
  WHERE constraint_name = 'instructor_score_requires_graded_by';

-- 6. Verify indexes exist
SELECT 'indexes created' as check,
  COUNT(*) as value FROM pg_indexes
  WHERE tablename IN ('quiz_answers', 'quiz_submissions');

EOF
```

### Step 1.5: Performance Baseline
```bash
# Query performance before migration
psql -h localhost -U postgres -d test_db -c "
  EXPLAIN ANALYZE
  SELECT * FROM quiz_answers
  WHERE grading_status = 'ungraded'
  LIMIT 100;
"

# Should complete in <100ms
```

---

## PHASE 2: ROLLBACK TEST (Midday — 1 hour)

### Step 2.1: Create Rollback Script
```bash
# File: supabase/migrations/002_rollback.sql
cat > supabase/migrations/002_rollback.sql << 'EOF'
-- Rollback: Quiz Module Extensions (Phase 2)
-- Created: 2026-01-15

-- Drop triggers
DROP TRIGGER IF EXISTS on_grade_override ON quiz_answers;
DROP FUNCTION IF EXISTS audit_grade_override();

-- Drop policies
DROP POLICY IF EXISTS quiz_submissions_student_own ON quiz_submissions;
DROP POLICY IF EXISTS quiz_submissions_instructor_class ON quiz_submissions;
DROP POLICY IF EXISTS quiz_answers_student_own ON quiz_answers;
DROP POLICY IF EXISTS quiz_answers_instructor_view ON quiz_answers;
DROP POLICY IF EXISTS quiz_answers_instructor_grade ON quiz_answers;

-- Drop indexes
DROP INDEX IF EXISTS idx_quiz_answers_grading_status;
DROP INDEX IF EXISTS idx_quiz_answers_graded_by;
DROP INDEX IF EXISTS idx_quiz_submissions_student_classroom;
DROP INDEX IF EXISTS idx_quiz_submissions_created_at;
DROP INDEX IF EXISTS idx_quiz_answers_submission_id;
DROP INDEX IF EXISTS idx_quiz_answers_effective_score;

-- Drop verification_attempts table
DROP TABLE IF EXISTS verification_attempts;

-- Drop columns from students
ALTER TABLE students
  DROP COLUMN IF EXISTS is_verified,
  DROP COLUMN IF EXISTS verified_at,
  DROP COLUMN IF EXISTS auth_user_id;

-- Drop columns from quiz_answers
ALTER TABLE quiz_answers
  DROP COLUMN IF EXISTS effective_score,
  DROP COLUMN IF EXISTS is_instructor_graded,
  DROP COLUMN IF EXISTS reviewed_at,
  DROP COLUMN IF EXISTS graded_by,
  DROP COLUMN IF EXISTS instructor_feedback,
  DROP COLUMN IF EXISTS instructor_score,
  DROP COLUMN IF EXISTS ai_graded_at,
  DROP COLUMN IF EXISTS ai_feedback,
  DROP COLUMN IF EXISTS ai_score,
  DROP COLUMN IF EXISTS grading_status;

-- Restore original question_type check
ALTER TABLE quiz_answers
  DROP CONSTRAINT IF EXISTS quiz_answers_question_type_check;

ALTER TABLE quiz_answers
  ADD CONSTRAINT quiz_answers_question_type_check
    CHECK (question_type IN ('single', 'multiple', 'short_answer'));

EOF
```

### Step 2.2: Test Rollback
```bash
# Apply rollback to test DB
psql -h localhost -U postgres -d test_db < supabase/migrations/002_rollback.sql

# Verify original schema restored
psql -h localhost -U postgres -d test_db -c "
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'quiz_answers'
  ORDER BY ordinal_position;
"

# Should NOT show: ai_score, instructor_score, effective_score, grading_status
```

### Step 2.3: Rollback Verification Queries
```bash
psql -h localhost -U postgres -d test_db << 'EOF'

-- Verify columns removed
SELECT COUNT(*) as column_count FROM information_schema.columns
WHERE table_name = 'quiz_answers';
-- Should match pre-migration count (roughly 10-12 columns)

-- Verify table still queryable
SELECT COUNT(*) FROM quiz_answers;
-- Should match original row count

-- Verify RLS removed
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'quiz_answers';
-- Should be 0

EOF
```

---

## PHASE 3: STAGING DEPLOY (Afternoon — 1 hour)

### Step 3.1: Deploy to Staging
```bash
# Connect to Supabase staging project
export SUPABASE_PROJECT_ID="your-staging-project-id"
export SUPABASE_ACCESS_TOKEN="your-access-token"

# Push migration to staging
supabase db push --db-url postgresql://... < supabase/migrations/002_quiz_module_extensions.sql

# Verify in Supabase dashboard
# - Check schema browser for new columns
# - Check policies tab for RLS policies
```

### Step 3.2: Run E2E Tests Against Staging
```bash
# Run full test suite
npm run test:e2e:staging

# Key tests to verify:
# ✓ Student quiz submission creates quiz_submissions record
# ✓ Quiz_answers rows have ai_score/instructor_score columns
# ✓ RLS policy: student sees own submission only
# ✓ RLS policy: instructor sees classroom submissions
# ✓ Grading override PATCH endpoint works
# ✓ Audit log created on override
# ✓ Effective score calculated correctly
```

### Step 3.3: Load Test: Code Grading
```bash
# Simulate 20 concurrent code submissions
npm run test:load:code-grading -- --concurrency=20 --duration=60s

# Expected: <5s response time per request, zero failures
# Monitor: token usage, queue depth, fallback score rate
```

### Step 3.4: Security Review Checklist
```bash
# Verify no data leakage
- [ ] Student A cannot see Student B's quiz answers (RLS test)
- [ ] Instructor A cannot override Instructor B's grades (auth test)
- [ ] Non-enrolled student cannot access classroom quizzes (enrollment test)
- [ ] Self-paced student only sees own classroom submissions (RLS test)

# Verify audit trail
- [ ] Grade override logged with before/after scores
- [ ] Graded_by field set to instructor ID
- [ ] Reviewed_at timestamp populated
```

---

## PHASE 4: PRODUCTION DEPLOY (Evening — 30 min)

### Step 4.1: Pre-Deploy Checklist
```bash
# Verify production backup exists
ls -lh production_backup_2026-01-18.sql

# Verify migration scripts are correct
diff supabase/migrations/002_quiz_module_extensions.sql <(git show HEAD:supabase/migrations/002_quiz_module_extensions.sql)
# Should show no difference (exact file in git)

# Verify rollback script is ready
test -f supabase/migrations/002_rollback.sql
echo "Rollback ready: $?"
```

### Step 4.2: Maintenance Window (1 hour)
```bash
# 1. Announce maintenance to users
#    "Scheduled maintenance: 2:00-3:00 AM PT. Services will be temporarily unavailable."

# 2. Disable write access to quiz_submissions table (optional safeguard)
#    ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;
#    CREATE POLICY "submissions_disabled" ON quiz_submissions
#      FOR ALL USING (false) WITH CHECK (false);

# 3. Create production backup
supabase db pull production_backup_2026-01-18.sql

# 4. Apply migration to production
supabase db push --db-url <PRODUCTION_URL> < supabase/migrations/002_quiz_module_extensions.sql

# 5. Verify schema in production
#    Run same integrity checks as Phase 1, Step 1.4

# 6. Re-enable write access
#    DROP POLICY "submissions_disabled" ON quiz_submissions;

# 7. Announce completion
#    "Maintenance complete. All systems operational."
```

### Step 4.3: Post-Deploy Monitoring (First 2 hours)
```bash
# Monitor error rate (should stay <0.1%)
# Monitor query latency (p99 should be <200ms)
# Monitor token usage (should be stable)
# Check for any RLS policy violations in logs

# Alert thresholds:
# - Error rate > 1% → escalate
# - Query latency p99 > 500ms → investigate
# - Unexpected "permission denied" errors → rollback

# If issues detected:
1. Apply rollback: psql <PROD_URL> < supabase/migrations/002_rollback.sql
2. Restore from backup (if needed)
3. Post-mortem: document and fix
4. Re-test in staging
5. Retry production deploy
```

---

## ROLLBACK PROCEDURE (Emergency)

If something goes wrong in production:

```bash
# 1. Stop writes to quiz_submissions (safeguard)
psql $PRODUCTION_URL << 'EOF'
CREATE POLICY "submissions_readonly" ON quiz_submissions
  FOR ALL USING (true) WITH CHECK (false);
EOF

# 2. Apply rollback migration
psql $PRODUCTION_URL < supabase/migrations/002_rollback.sql

# 3. Verify schema restored
psql $PRODUCTION_URL -c "
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_name = 'quiz_answers';
"

# 4. Restore from backup (if rollback insufficient)
# Note: This requires manual intervention from Supabase support
# or pg_restore if you have direct DB access

# 5. Post-mortem:
#    - What went wrong?
#    - Why didn't staging catch it?
#    - What changes to fix it?
#    - Re-test, re-deploy
```

---

## SIGN-OFF CHECKLIST

- [ ] Dry-run passed all checks (Phase 1)
- [ ] Rollback tested and verified (Phase 2)
- [ ] Staging deployment successful (Phase 3)
- [ ] E2E tests passing on staging
- [ ] Load test passed (<5s response time)
- [ ] Security review signed off
- [ ] Production backup created
- [ ] Maintenance window scheduled
- [ ] Monitoring alerts configured
- [ ] On-call team briefed on rollback procedure
- [ ] Rollback script verified and tested

**Sign-off:** _____________ (DevOps Lead) — Date: _________

---

**Questions? Escalate to:** devops-lead@dailyagile.com  
**Runbook version:** 1.0  
**Last updated:** 2026-01-15
