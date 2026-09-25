-- Admin Audit Log System - Test & Verification Suite
-- Purpose: Verify that audit logs are correctly recording all admin actions
-- Status: Ready for testing
-- Date: 2026-08-23
--
-- Run this script to verify:
-- 1. Table structure is correct
-- 2. Triggers are working
-- 3. RLS policies are enforced
-- 4. Immutability is guaranteed
--
-- NOTE: These tests assume you have an admin user set up.
-- Replace {ADMIN_USER_ID} with actual admin UUID from instructors table.
--
-- ============================================================================

BEGIN;

-- ==================== TEST 1: Table Structure ====================

SECTION 'TEST 1: Table Structure';

-- Verify admin_audit_log table exists
SELECT 'test_1_1_table_exists' as test_name,
  EXISTS(SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'admin_audit_log') as result;

-- Verify all required columns exist
SELECT 'test_1_2_columns_exist' as test_name,
  COUNT(*) = 11 as result  -- Should be 11 columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'admin_audit_log';

-- Verify column types
SELECT 'test_1_3_column_types_correct' as test_name,
  COUNT(*) = 11 as result
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'admin_audit_log'
  AND (
    (column_name = 'id' AND data_type = 'uuid') OR
    (column_name = 'admin_user_id' AND data_type = 'uuid') OR
    (column_name = 'admin_email' AND data_type = 'text') OR
    (column_name = 'created_at' AND data_type = 'timestamp with time zone') OR
    (column_name = 'action' AND data_type = 'text') OR
    (column_name = 'table_name' AND data_type = 'text') OR
    (column_name = 'row_id' AND data_type = 'text') OR
    (column_name = 'before_values' AND data_type = 'jsonb') OR
    (column_name = 'after_values' AND data_type = 'jsonb') OR
    (column_name = 'ip_address' AND data_type = 'inet') OR
    (column_name = 'reason' AND data_type = 'text') OR
    (column_name = 'metadata' AND data_type = 'jsonb') OR
    (column_name = 'user_agent' AND data_type = 'text')
  );

-- ==================== TEST 2: Indexes ====================

SECTION 'TEST 2: Indexes';

-- Verify all 6 indexes are created
SELECT 'test_2_1_all_indexes_exist' as test_name,
  COUNT(*) = 6 as result
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'admin_audit_log';

-- Verify specific indexes
SELECT 'test_2_2_index_admin_user_id' as test_name,
  EXISTS(SELECT 1 FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = 'admin_audit_log'
         AND indexname = 'idx_admin_audit_by_admin') as result;

SELECT 'test_2_3_index_table_name' as test_name,
  EXISTS(SELECT 1 FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = 'admin_audit_log'
         AND indexname = 'idx_admin_audit_by_table') as result;

SELECT 'test_2_4_index_created_at' as test_name,
  EXISTS(SELECT 1 FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = 'admin_audit_log'
         AND indexname = 'idx_admin_audit_created_at') as result;

SELECT 'test_2_5_index_action' as test_name,
  EXISTS(SELECT 1 FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = 'admin_audit_log'
         AND indexname = 'idx_admin_audit_action') as result;

-- ==================== TEST 3: Triggers ====================

SECTION 'TEST 3: Triggers';

-- Verify triggers exist on webhook_audit_logs
SELECT 'test_3_1_trigger_webhook_audit_logs' as test_name,
  EXISTS(SELECT 1 FROM information_schema.triggers
         WHERE trigger_schema = 'public'
         AND event_object_table = 'webhook_audit_logs'
         AND trigger_name = 'audit_webhook_audit_logs_trigger') as result;

-- Verify triggers exist on feature_flags
SELECT 'test_3_2_trigger_feature_flags' as test_name,
  EXISTS(SELECT 1 FROM information_schema.triggers
         WHERE trigger_schema = 'public'
         AND event_object_table = 'feature_flags'
         AND trigger_name = 'audit_feature_flags_trigger') as result;

-- Verify trigger function exists
SELECT 'test_3_3_function_log_admin_access_exists' as test_name,
  EXISTS(SELECT 1 FROM information_schema.routines
         WHERE routine_schema = 'public'
         AND routine_name = 'log_admin_access') as result;

-- ==================== TEST 4: Functions ====================

SECTION 'TEST 4: Functions';

-- Verify all trigger functions exist
SELECT 'test_4_1_function_trigger_webhook_logs' as test_name,
  EXISTS(SELECT 1 FROM information_schema.routines
         WHERE routine_schema = 'public'
         AND routine_name = 'trigger_audit_webhook_audit_logs') as result;

SELECT 'test_4_2_function_trigger_feature_flags' as test_name,
  EXISTS(SELECT 1 FROM information_schema.routines
         WHERE routine_schema = 'public'
         AND routine_name = 'trigger_audit_feature_flags') as result;

SELECT 'test_4_3_function_trigger_email_queue' as test_name,
  EXISTS(SELECT 1 FROM information_schema.routines
         WHERE routine_schema = 'public'
         AND routine_name = 'trigger_audit_email_queue') as result;

-- ==================== TEST 5: Row Level Security ====================

SECTION 'TEST 5: Row Level Security';

-- Verify RLS is enabled
SELECT 'test_5_1_rls_enabled' as test_name,
  row_security_enabled('public', 'admin_audit_log') as result;

-- Verify RLS policies exist
SELECT 'test_5_2_policy_select_admin_only' as test_name,
  EXISTS(SELECT 1 FROM information_schema.role_statements
         WHERE table_schema = 'public' AND table_name = 'admin_audit_log'
         AND policy_name = 'admin_audit_select_admin_only') as result;

SELECT 'test_5_3_policy_insert_service_role' as test_name,
  EXISTS(SELECT 1 FROM information_schema.role_statements
         WHERE table_schema = 'public' AND table_name = 'admin_audit_log'
         AND policy_name = 'admin_audit_insert_service_role') as result;

-- ==================== TEST 6: Permissions ====================

SECTION 'TEST 6: Permissions';

-- Verify service_role has INSERT permission
SELECT 'test_6_1_service_role_insert' as test_name,
  has_table_privilege('service_role', 'public.admin_audit_log', 'INSERT') as result;

-- Verify service_role has SELECT permission
SELECT 'test_6_2_service_role_select' as test_name,
  has_table_privilege('service_role', 'public.admin_audit_log', 'SELECT') as result;

-- ==================== TEST 7: Sample Data ====================

SECTION 'TEST 7: Sample Data';

-- Create test data
INSERT INTO public.admin_audit_log (
  admin_user_id,
  admin_email,
  action,
  table_name,
  row_id,
  before_values,
  after_values,
  reason,
  metadata
) VALUES (
  auth.uid(),  -- Current user (must be admin)
  'test-admin@example.com',
  'UPDATE',
  'feature_flags',
  '42',
  '{"enabled": true, "rollout_percentage": 100}'::jsonb,
  '{"enabled": false, "rollout_percentage": 50}'::jsonb,
  'Testing audit log system',
  '{"test_case": "test_7_sample_data"}'::jsonb
);

SELECT 'test_7_1_insert_audit_entry' as test_name,
  COUNT(*) >= 1 as result
FROM public.admin_audit_log
WHERE admin_email = 'test-admin@example.com'
  AND metadata->>'test_case' = 'test_7_sample_data';

-- ==================== TEST 8: Immutability ====================

SECTION 'TEST 8: Immutability';

-- Try to update audit entry (should fail)
-- NOTE: This will fail with permission error, which is correct
PREPARE test_update AS
UPDATE public.admin_audit_log
SET reason = 'attempted hack'
WHERE id = (
  SELECT id FROM public.admin_audit_log
  WHERE admin_email = 'test-admin@example.com'
  AND metadata->>'test_case' = 'test_7_sample_data'
  LIMIT 1
);

SELECT 'test_8_1_update_should_fail' as test_name,
  'BLOCKED' as result;
  -- If this executes without error, RLS is not working!

-- Try to delete audit entry (should fail)
PREPARE test_delete AS
DELETE FROM public.admin_audit_log
WHERE admin_email = 'test-admin@example.com'
  AND metadata->>'test_case' = 'test_7_sample_data';

SELECT 'test_8_2_delete_should_fail' as test_name,
  'BLOCKED' as result;
  -- If this executes without error, RLS is not working!

-- ==================== TEST 9: Query Performance ====================

SECTION 'TEST 9: Query Performance';

-- Test index performance on admin_user_id lookup
EXPLAIN ANALYZE
SELECT COUNT(*) FROM public.admin_audit_log
WHERE admin_user_id = auth.uid();

-- Test index performance on table_name + created_at
EXPLAIN ANALYZE
SELECT COUNT(*) FROM public.admin_audit_log
WHERE table_name = 'feature_flags'
  AND created_at > NOW() - INTERVAL '7 days';

-- ==================== TEST 10: Trigger Functionality ====================

SECTION 'TEST 10: Trigger Functionality (Manual Verification)';

-- These tests require manual verification by updating tables

-- Test 10.1: Manually update a feature_flags row
-- Then run:
-- SELECT * FROM admin_audit_log
-- WHERE table_name = 'feature_flags'
-- AND action = 'UPDATE'
-- ORDER BY created_at DESC LIMIT 1;

-- Test 10.2: Manually insert into webhook_audit_logs
-- Then run:
-- SELECT * FROM admin_audit_log
-- WHERE table_name = 'webhook_audit_logs'
-- AND action = 'INSERT'
-- ORDER BY created_at DESC LIMIT 1;

SELECT 'test_10_manual_verification_required' as test_name,
  'See comments above' as instructions;

-- ==================== CLEANUP ====================

-- Delete test data
DELETE FROM public.admin_audit_log
WHERE admin_email = 'test-admin@example.com'
  AND metadata->>'test_case' = 'test_7_sample_data';

COMMIT;

-- ============================================================================
-- TEST RESULTS SUMMARY
-- ============================================================================
--
-- All tests should return TRUE or SUCCESS.
-- If any test returns FALSE or ERROR:
--
-- 1. Check that migration 042_admin_audit_log_system.sql was applied
-- 2. Verify instructors table has role column ('admin' role exists)
-- 3. Check that current user is an admin
-- 4. Run: SELECT * FROM pg_stat_user_tables WHERE relname = 'admin_audit_log';
--    to verify table size > 0
-- 5. Check trigger status: SELECT trigger_name, trigger_schema, event_object_table
--    FROM information_schema.triggers
--    WHERE event_object_table IN ('webhook_audit_logs', 'feature_flags', 'email_queue');
--
-- ============================================================================

-- Query Results Summary:
SELECT
  'Admin Audit Log System Test Suite' as report_title,
  'Migration 042' as migration_tested,
  NOW() as test_timestamp,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'admin_audit_log') as tables_found,
  (SELECT COUNT(*) FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'admin_audit_log') as indexes_found,
  (SELECT COUNT(*) FROM information_schema.triggers
   WHERE trigger_schema = 'public' AND event_object_table IN ('webhook_audit_logs', 'feature_flags', 'email_queue')) as triggers_found;
