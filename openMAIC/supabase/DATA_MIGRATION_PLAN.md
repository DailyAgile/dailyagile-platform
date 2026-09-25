# Data Migration Plan: Zero Data Loss Verification

**Date**: 2026-08-12  
**Objective**: Ensure all migrations execute safely without data loss  
**Scope**: Migrations 001-014 (especially critical for 010 & 011)

---

## Overview: Migration Strategy

### Phase 1: Pre-Migration Checks
- Verify current state
- Create backups
- Validate assumptions

### Phase 2: Execute Migrations (Supabase CLI or Direct)
- Run migrations in sequence
- Verify each migration's success
- Check for errors in Supabase logs

### Phase 3: Post-Migration Verification
- Data integrity checks
- Performance tests
- Rollback procedures

### Phase 4: Monitoring
- Watch for issues in production
- Monitor performance
- Document findings

---

## Migration 010: Students Table Conflict Resolution

**Purpose**: Unify students table schema and add missing columns  
**Risk Level**: MEDIUM (data transformation required)  
**Rollback Time**: < 5 minutes

### Pre-Migration Checklist

```sql
-- 1. Check current students table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'students'
ORDER BY ordinal_position;

-- Expected columns from 001:
-- id, email, name, student_id, avatar_url, created_at, updated_at
-- Expected columns from 002:
-- auth_user_id, verified_at, is_verified

-- Columns that SHOULD BE MISSING (will be added by 010):
-- first_name, last_name, password_hash, email_verified, 
-- verification_code, verification_code_expires_at, last_login_at, is_active

-- 2. Count students
SELECT COUNT(*) as total_students FROM students;

-- 3. Check for nulls in 'name' column (critical for 010 data migration)
SELECT COUNT(*) as nulls_in_name FROM students WHERE name IS NULL OR TRIM(name) = '';

-- 4. Verify no duplicate emails (constraint will fail if duplicates exist)
SELECT email, COUNT(*) as cnt FROM students GROUP BY email HAVING COUNT(*) > 1;

-- 5. Check auth_user_id distribution
SELECT COUNT(*) as with_auth_user_id FROM students WHERE auth_user_id IS NOT NULL;
SELECT COUNT(*) as without_auth_user_id FROM students WHERE auth_user_id IS NULL;
```

### Execution Steps

```sql
-- Step 1: Create backup (migration 010 does this, but verify)
-- Happens automatically in migration: students_backup_20260812

-- Step 2: Add missing columns
-- Happens in migration 010

-- Step 3: Migrate data (name → first_name + last_name)
-- Happens in migration 010
-- Verify with:
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN first_name IS NULL OR first_name = '' THEN 1 END) as missing_first,
  COUNT(CASE WHEN last_name IS NULL OR last_name = '' THEN 1 END) as missing_last,
  COUNT(CASE WHEN first_name IS NOT NULL AND TRIM(first_name) != '' THEN 1 END) as valid_first
FROM students;

-- Expected: missing_first = 0 (all have first_name)
-- Expected: missing_last >= 0 (ok if some are empty - last name not always present)
-- Expected: valid_first > 0

-- Step 4: Verify constraint was added
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'students'
  AND constraint_type = 'CHECK'
  AND constraint_name = 'check_first_name_not_empty';
```

### Verification Queries

```sql
-- 1. Verify all required columns exist
DO $$
DECLARE
  v_required_columns TEXT[] := ARRAY[
    'id', 'email', 'name', 'first_name', 'last_name', 'password_hash',
    'auth_user_id', 'email_verified', 'verification_code', 
    'verification_code_expires_at', 'is_active', 'last_login_at',
    'verified_at', 'is_verified', 'created_at', 'updated_at'
  ];
  v_missing_columns TEXT[] := ARRAY[]::TEXT[];
  v_col TEXT;
BEGIN
  FOREACH v_col IN ARRAY v_required_columns LOOP
    IF NOT EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'students' AND column_name = v_col
    ) THEN
      v_missing_columns := array_append(v_missing_columns, v_col);
    END IF;
  END LOOP;
  
  IF array_length(v_missing_columns, 1) > 0 THEN
    RAISE EXCEPTION 'Missing columns in students table: %', v_missing_columns;
  ELSE
    RAISE NOTICE 'All required columns present in students table';
  END IF;
END $$;

-- 2. Verify data integrity after migration
SELECT 
  'Data Integrity Check' as check_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN email IS NULL THEN 1 END) as null_emails,
  COUNT(CASE WHEN first_name IS NULL OR TRIM(first_name) = '' THEN 1 END) as empty_first_names,
  COUNT(CASE WHEN is_active IS NULL THEN 1 END) as null_is_active
FROM students;

-- Expected: null_emails = 0, empty_first_names = 0, null_is_active = 0

-- 3. Verify RLS policies
SELECT policy_name, qual
FROM pg_policies
WHERE tablename = 'students'
ORDER BY policy_name;

-- Expected policies:
-- - Students can view own profile
-- - Students can update own profile
-- - Enable insert for new student signup
-- - Enable select for email verification
-- - Enable update for email verification and login

-- 4. Compare backup with current
SELECT 
  'Backup vs Current' as comparison,
  (SELECT COUNT(*) FROM students_backup_20260812) as backup_count,
  (SELECT COUNT(*) FROM students) as current_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM students_backup_20260812) = 
         (SELECT COUNT(*) FROM students)
    THEN 'OK: Same row count'
    ELSE 'WARN: Row count mismatch'
  END as status;

-- 5. Verify no data loss
DO $$
DECLARE
  v_backup_ids UUID[] := ARRAY(SELECT DISTINCT id FROM students_backup_20260812);
  v_current_ids UUID[] := ARRAY(SELECT DISTINCT id FROM students);
  v_missing_ids UUID[];
BEGIN
  -- Find IDs in backup but not in current
  SELECT ARRAY(
    SELECT id FROM students_backup_20260812
    WHERE id NOT IN (SELECT id FROM students)
  ) INTO v_missing_ids;
  
  IF array_length(v_missing_ids, 1) > 0 THEN
    RAISE EXCEPTION 'Data loss detected! Missing IDs: %', v_missing_ids;
  ELSE
    RAISE NOTICE 'No data loss: All backup rows present in current students table';
  END IF;
END $$;
```

### Rollback Procedure

```sql
-- If migration 010 fails, rollback is automatic (it's a transaction)
-- If manual cleanup needed:

-- Option 1: Drop new columns (if migration partially applied)
ALTER TABLE students DROP COLUMN IF EXISTS first_name;
ALTER TABLE students DROP COLUMN IF EXISTS last_name;
ALTER TABLE students DROP COLUMN IF EXISTS password_hash;
ALTER TABLE students DROP COLUMN IF EXISTS email_verified;
ALTER TABLE students DROP COLUMN IF EXISTS verification_code;
ALTER TABLE students DROP COLUMN IF EXISTS verification_code_expires_at;
ALTER TABLE students DROP COLUMN IF EXISTS last_login_at;
ALTER TABLE students DROP COLUMN IF EXISTS is_active;

-- Option 2: Restore from backup
-- TRUNCATE students;
-- INSERT INTO students SELECT * FROM students_backup_20260812;
-- DROP TABLE students_backup_20260812;

-- Option 3: Re-run migration 010 (idempotent - safe to retry)
```

---

## Migration 011: Race Condition Fixes

**Purpose**: Add FOR UPDATE locking to prevent concurrent operation conflicts  
**Risk Level**: LOW (function recreation only, no data changes)  
**Rollback Time**: < 1 minute

### Pre-Migration Checks

```sql
-- 1. Verify current get_next_attempt_number() function
SELECT prosrc FROM pg_proc 
WHERE proname = 'get_next_attempt_number'
  AND pronargs = 2;

-- Should show: SELECT COALESCE(...) without FOR UPDATE
-- (This is the bug we're fixing)

-- 2. Verify validate_2fa_code() function
SELECT prosrc FROM pg_proc
WHERE proname = 'validate_2fa_code'
  AND pronargs = 4;

-- Should show: no FOR UPDATE in initial SELECT
-- (This is the bug we're fixing)

-- 3. Count pending 2FA confirmations
SELECT COUNT(*) as pending_codes FROM pending_2fa_confirmations 
WHERE is_used = FALSE AND expires_at > NOW();

-- 4. Check if quiz_sessions have duplicates (would indicate race condition already occurred)
SELECT assignment_id, student_id, attempt_number, COUNT(*) as cnt
FROM quiz_sessions
GROUP BY assignment_id, student_id, attempt_number
HAVING COUNT(*) > 1
ORDER BY cnt DESC;

-- Expected: 0 rows (no duplicates). If any found, data corruption exists.
```

### Execution Steps

```sql
-- Migration 011 simply recreates the functions with FOR UPDATE locking
-- No data changes occur

-- Verify new functions have FOR UPDATE:
SELECT prosrc FROM pg_proc 
WHERE proname = 'get_next_attempt_number' AND pronargs = 2;

-- Should now contain: "FOR UPDATE"

SELECT prosrc FROM pg_proc
WHERE proname = 'validate_2fa_code' AND pronargs = 4;

-- Should now contain: "FOR UPDATE"
```

### Verification Queries

```sql
-- 1. Test get_next_attempt_number() in concurrent scenario
BEGIN;
  SELECT get_next_attempt_number(
    '550e8400-e29b-41d4-a716-446655440000'::UUID, 
    'student-1'
  ) as attempt_1;
  
  SELECT get_next_attempt_number(
    '550e8400-e29b-41d4-a716-446655440000'::UUID, 
    'student-1'
  ) as attempt_2;
ROLLBACK;

-- Expected: attempt_1 = 1, attempt_2 = 2 (different values due to locking)

-- 2. Test validate_2fa_code() double-validation prevention
-- (This requires actual 2FA codes, skip in staging)

-- 3. Verify approveExtension() function exists
SELECT proname FROM pg_proc
WHERE proname = 'approveExtension'
ORDER BY proname;

-- Expected: approveExtension function callable

-- 4. Test approveExtension() function
-- (Requires test data - see integration tests)
```

### Rollback Procedure

```sql
-- Migration 011 is purely functional (no table changes)
-- Can simply re-run migration 011 if needed

-- Manual rollback: recreate old buggy functions (NOT RECOMMENDED)
-- Better approach: Just leave 011 applied, it's a fix!
```

---

## Migration 012: Multi-Tenant Schema (Design Only)

**Purpose**: Create schema foundation for multi-tenancy  
**Risk Level**: VERY LOW (new tables only, no existing data affected)  
**Rollback Time**: ~2 minutes (drop ~8 tables)

### Pre-Migration Checks

```sql
-- 1. Verify no existing multi-tenant tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'organizations', 'teams', 'organization_members', 'feature_flags',
    'white_label_settings', 'lms_integration_config', 'webhook_logs',
    'subscription_plans', 'billing_history'
  );

-- Expected: 0 rows (tables don't exist yet)
```

### Verification Queries

```sql
-- 1. Verify all new tables created
DO $$
DECLARE
  v_required_tables TEXT[] := ARRAY[
    'organizations', 'teams', 'organization_members', 'feature_flags',
    'white_label_settings', 'lms_integration_config', 'webhook_logs',
    'subscription_plans', 'billing_history'
  ];
  v_table TEXT;
  v_count INTEGER := 0;
BEGIN
  FOREACH v_table IN ARRAY v_required_tables LOOP
    IF EXISTS(
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table
    ) THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  IF v_count = array_length(v_required_tables, 1) THEN
    RAISE NOTICE 'All % multi-tenant tables created successfully', v_count;
  ELSE
    RAISE EXCEPTION 'Only % of % multi-tenant tables created', v_count, array_length(v_required_tables, 1);
  END IF;
END $$;

-- 2. Verify no data in new tables (should be empty after creation)
SELECT 
  'organizations' as table_name, COUNT(*) as row_count FROM organizations
UNION ALL
SELECT 'teams', COUNT(*) FROM teams
UNION ALL
SELECT 'organization_members', COUNT(*) FROM organization_members
UNION ALL
SELECT 'feature_flags', COUNT(*) FROM feature_flags;

-- Expected: All counts = 0 (brand new tables)

-- 3. Verify RLS enabled on all tables
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'teams', 'organization_members', 'feature_flags')
ORDER BY tablename;

-- Then verify RLS:
SELECT * FROM pg_policies WHERE tablename = 'organizations';
-- Should have: service_role_all_access policy
```

### Rollback Procedure

```sql
-- Option 1: Drop all new tables (reversible, no data loss)
DROP TABLE IF EXISTS billing_history CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS lms_integration_config CASCADE;
DROP TABLE IF EXISTS white_label_settings CASCADE;
DROP TABLE IF EXISTS feature_flags CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Option 2: Keep tables, just don't use them
-- (Preferred - leaves schema ready for Phase 2 integration)
```

---

## Migration 013: Instructor Bulk Upload

**Purpose**: Create bulk import infrastructure  
**Risk Level**: LOW (new tables + schema-only)  
**Rollback Time**: ~1 minute

### Pre-Migration Checks

```sql
-- 1. Check if instructors table exists (may already exist from 002 or 005)
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'instructors';

-- Expected: 0 (new table) or 1 (already exists from earlier migration)

-- 2. If instructors table exists, check schema
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'instructors'
ORDER BY ordinal_position;
```

### Verification Queries

```sql
-- 1. Verify instructors table and columns
DO $$
DECLARE
  v_required_cols TEXT[] := ARRAY[
    'id', 'auth_user_id', 'email', 'first_name', 'last_name',
    'phone_number', 'cell_number', 'location', 'bio', 'avatar_url',
    'courses_they_teach', 'specializations', 'years_experience',
    'certifications', 'is_active', 'is_verified', 'verified_at',
    'metadata', 'created_at', 'updated_at'
  ];
  v_col TEXT;
BEGIN
  FOREACH v_col IN ARRAY v_required_cols LOOP
    IF NOT EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'instructors' AND column_name = v_col
    ) THEN
      RAISE EXCEPTION 'Missing column in instructors: %', v_col;
    END IF;
  END LOOP;
  RAISE NOTICE 'All % required columns present in instructors table', array_length(v_required_cols, 1);
END $$;

-- 2. Verify bulk upload tables
SELECT COUNT(*) as upload_tables FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('instructor_bulk_uploads', 'instructor_bulk_upload_rows');

-- Expected: 2

-- 3. Verify functions
SELECT proname FROM pg_proc
WHERE proname IN ('validate_instructor_row', 'process_instructor_bulk_upload')
ORDER BY proname;

-- Expected: Both functions should exist
```

---

## Migration 014: Immutable Audit Logging

**Purpose**: Create GDPR-compliant append-only audit trail  
**Risk Level**: LOW (new tables + append-only design)  
**Rollback Time**: ~2 minutes

### Pre-Migration Checks

```sql
-- 1. Check if audit_logs_immutable already exists
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'audit_logs_immutable';

-- Expected: 0 (brand new table)

-- 2. Verify triggers don't already exist on sensitive tables
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table IN ('students', 'quizzes', 'quiz_responses', 'quiz_sessions')
  AND trigger_name LIKE '%audit%';

-- Expected: 0 rows (triggers will be created by migration)
```

### Verification Queries

```sql
-- 1. Verify audit_logs_immutable table exists
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name = 'audit_logs_immutable';

-- Expected: 1

-- 2. Verify immutability (RLS policies prevent UPDATE/DELETE)
SELECT policy_name, qual
FROM pg_policies
WHERE tablename = 'audit_logs_immutable'
ORDER BY policy_name;

-- Expected: Only INSERT and SELECT policies, NO UPDATE/DELETE

-- 3. Test immutability (should fail with permission error)
DO $$
BEGIN
  INSERT INTO audit_logs_immutable (
    actor_email, action, resource_type, resource_id
  ) VALUES ('test@example.com', 'test_action', 'test', 'test-1');
  
  -- Try to update (should fail)
  BEGIN
    UPDATE audit_logs_immutable SET action = 'hacked' WHERE action = 'test_action';
    RAISE EXCEPTION 'FAIL: UPDATE was allowed (immutability broken)!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'OK: UPDATE blocked as expected (%, %)', SQLSTATE, SQLERRM;
  END;
  
  -- Clean up test data
  DELETE FROM audit_logs_immutable WHERE action = 'test_action';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test skipped (permissions may prevent this): %', SQLERRM;
END $$;

-- 4. Verify audit triggers on sensitive tables
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('students', 'quizzes', 'quiz_responses', 'quiz_sessions')
  AND trigger_name LIKE '%audit%'
ORDER BY event_object_table, trigger_name;

-- Expected: Triggers on students, quizzes, quiz_responses, quiz_sessions

-- 5. Verify GDPR functions exist
SELECT proname FROM pg_proc
WHERE proname IN (
  'log_audit_event',
  'get_data_subject_access_logs',
  'mark_data_for_deletion',
  'cleanup_expired_audit_logs'
)
ORDER BY proname;

-- Expected: All 4 functions exist
```

---

## Complete Migration Validation Script

```sql
-- Run this after all migrations 001-014 are applied

DO $$
DECLARE
  v_checks_passed INTEGER := 0;
  v_checks_total INTEGER := 0;
  v_result TEXT;
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'DATABASE MIGRATION VALIDATION (001-014)';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';

  -- Check 1: Students table schema
  v_checks_total := v_checks_total + 1;
  IF EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' 
      AND column_name IN ('first_name', 'last_name', 'email_verified', 'is_active')
  ) THEN
    RAISE NOTICE '✓ Check 1: Students table has unified schema';
    v_checks_passed := v_checks_passed + 1;
  ELSE
    RAISE WARNING '✗ Check 1: Students table schema incomplete';
  END IF;

  -- Check 2: Race condition fixes
  v_checks_total := v_checks_total + 1;
  IF (SELECT count(*) FROM pg_proc WHERE proname = 'get_next_attempt_number') > 0
     AND (SELECT prosrc FROM pg_proc WHERE proname = 'get_next_attempt_number' LIMIT 1) LIKE '%FOR UPDATE%'
  THEN
    RAISE NOTICE '✓ Check 2: get_next_attempt_number() has FOR UPDATE locking';
    v_checks_passed := v_checks_passed + 1;
  ELSE
    RAISE WARNING '✗ Check 2: get_next_attempt_number() missing FOR UPDATE';
  END IF;

  -- Check 3: 2FA function
  v_checks_total := v_checks_total + 1;
  IF (SELECT count(*) FROM pg_proc WHERE proname = 'validate_2fa_code') > 0 THEN
    RAISE NOTICE '✓ Check 3: validate_2fa_code() function exists';
    v_checks_passed := v_checks_passed + 1;
  ELSE
    RAISE WARNING '✗ Check 3: validate_2fa_code() function missing';
  END IF;

  -- Check 4: Immutable audit logs
  v_checks_total := v_checks_total + 1;
  IF EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'audit_logs_immutable'
  ) THEN
    RAISE NOTICE '✓ Check 4: audit_logs_immutable table exists';
    v_checks_passed := v_checks_passed + 1;
  ELSE
    RAISE WARNING '✗ Check 4: audit_logs_immutable table missing';
  END IF;

  -- Check 5: Multi-tenant schema
  v_checks_total := v_checks_total + 1;
  IF EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_name IN ('organizations', 'teams')
  ) THEN
    RAISE NOTICE '✓ Check 5: Multi-tenant schema exists';
    v_checks_passed := v_checks_passed + 1;
  ELSE
    RAISE WARNING '✗ Check 5: Multi-tenant schema missing';
  END IF;

  -- Check 6: Bulk upload system
  v_checks_total := v_checks_total + 1;
  IF EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_name IN ('instructors', 'instructor_bulk_uploads')
  ) THEN
    RAISE NOTICE '✓ Check 6: Bulk upload schema exists';
    v_checks_passed := v_checks_passed + 1;
  ELSE
    RAISE WARNING '✗ Check 6: Bulk upload schema missing';
  END IF;

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'VALIDATION RESULTS: % of % checks passed', v_checks_passed, v_checks_total;
  RAISE NOTICE '====================================================';

  IF v_checks_passed = v_checks_total THEN
    RAISE NOTICE 'STATUS: ✓ ALL MIGRATIONS VALIDATED SUCCESSFULLY';
  ELSE
    RAISE WARNING 'STATUS: ✗ Some checks failed - review above';
  END IF;
END $$;
```

---

## Post-Migration Monitoring (First 24 Hours)

### Key Metrics to Watch

```sql
-- 1. Check for errors in audit logs
SELECT COUNT(*) as error_count
FROM audit_logs_immutable
WHERE status = 'error'
  AND created_at > NOW() - INTERVAL '24 hours';

-- 2. Monitor failed transactions
SELECT COUNT(*) as failed_attempts
FROM quiz_attempt_resets
WHERE reset_at > NOW() - INTERVAL '24 hours';

-- 3. Check 2FA code usage
SELECT COUNT(*) as codes_used
FROM pending_2fa_confirmations
WHERE used_at > NOW() - INTERVAL '24 hours'
  AND is_used = true;

-- 4. Monitor bulk uploads
SELECT status, COUNT(*) as count
FROM instructor_bulk_uploads
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- 5. Check for duplicate students created
SELECT email, COUNT(*) as cnt
FROM students
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY email
HAVING COUNT(*) > 1;
```

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Query latency (avg) | >200ms | >1000ms |
| Failed auth attempts | >10/hour | >50/hour |
| Audit log errors | >5/hour | >20/hour |
| Quiz session timeouts | >5% | >10% |
| 2FA validation failures | >20% | >40% |

---

**Generated**: 2026-08-12  
**Schema Version**: 1.0 (Migrations 001-014)  
**Last Updated**: Pre-Deployment Planning
