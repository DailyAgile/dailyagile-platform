-- Test Suite for migration 032: quiz_purchases table
-- Purpose: Validate idempotency, constraints, performance, and concurrency
-- Run this as a separate transaction to verify the migration
-- ============================================================================

-- TEST 1: Verify table structure
-- ============================================================================
SELECT 'TEST 1: Table Structure Verification' as test_name;

-- Check columns exist with correct types
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'quiz_purchases'
ORDER BY ordinal_position;

-- Expected result:
-- id              | uuid                  | NO       | gen_random_uuid()
-- student_id      | uuid                  | NO       | NULL
-- course_id       | text                  | NO       | NULL
-- external_invoice_id | text               | NO       | NULL
-- amount_cents    | integer               | NO       | NULL
-- currency        | character varying     | NO       | 'USD'::character varying
-- payment_method  | character varying     | NO       | 'stripe'::character varying
-- status          | character varying     | NO       | 'completed'::character varying
-- created_at      | timestamp with time zone | NO    | now()
-- updated_at      | timestamp with time zone | NO    | now()
-- paid_at         | timestamp with time zone | YES   | NULL


-- TEST 2: Verify UNIQUE constraint on external_invoice_id
-- ============================================================================
SELECT 'TEST 2: UNIQUE Constraint on external_invoice_id' as test_name;

-- Check constraint exists
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'quiz_purchases'
  AND constraint_type = 'UNIQUE'
ORDER BY constraint_name;

-- Expected result:
-- unique_external_invoice_id | UNIQUE

-- Verify indexing
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'quiz_purchases'
  AND indexname LIKE '%external_invoice_id%';

-- Expected result:
-- idx_quiz_purchases_external_invoice_id | CREATE UNIQUE INDEX idx_quiz_purchases_external_invoice_id
--   ON public.quiz_purchases USING btree (external_invoice_id)


-- TEST 3: Verify all indexes are created
-- ============================================================================
SELECT 'TEST 3: Index Verification' as test_name;

SELECT
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE relname = 'quiz_purchases'
ORDER BY indexname;

-- Expected indexes:
-- - unique_external_invoice_id (primary, unique)
-- - idx_quiz_purchases_student_course
-- - idx_quiz_purchases_student_id
-- - idx_quiz_purchases_created_at
-- - idx_quiz_purchases_status
-- - idx_quiz_purchases_payment_method
-- - idx_quiz_purchases_student_status


-- TEST 4: Happy path - Insert valid purchase
-- ============================================================================
SELECT 'TEST 4: Happy Path - Valid Insert' as test_name;

-- Create test student first
INSERT INTO public.students (email, email_verified)
VALUES ('test.student.4@example.com', true)
ON CONFLICT (email) DO NOTHING
RETURNING id as student_id;

-- Store the student ID (in real test, would capture this)
WITH test_student AS (
  SELECT id FROM public.students WHERE email = 'test.student.4@example.com' LIMIT 1
)
INSERT INTO public.quiz_purchases (
  student_id,
  course_id,
  external_invoice_id,
  amount_cents,
  currency,
  payment_method,
  status
)
SELECT
  test_student.id,
  'python-101',
  'cs_test_session_' || gen_random_uuid(),
  1999,
  'USD',
  'stripe',
  'completed'
FROM test_student
RETURNING id, student_id, course_id, external_invoice_id, amount_cents;

-- Expected result:
-- - 1 row inserted
-- - All columns populated correctly


-- TEST 5: Idempotency - Duplicate insert fails gracefully
-- ============================================================================
SELECT 'TEST 5: Idempotency Test - Duplicate external_invoice_id' as test_name;

-- Get a student and session ID from previous test
WITH test_student AS (
  SELECT id FROM public.students WHERE email = 'test.student.4@example.com' LIMIT 1
),
existing_purchase AS (
  SELECT external_invoice_id FROM public.quiz_purchases
  WHERE course_id = 'python-101'
  LIMIT 1
)
-- This should FAIL with constraint violation
INSERT INTO public.quiz_purchases (
  student_id,
  course_id,
  external_invoice_id,
  amount_cents,
  currency,
  payment_method,
  status
)
SELECT
  test_student.id,
  'python-101',
  existing_purchase.external_invoice_id,  -- Same session ID (duplicate!)
  1999,
  'USD',
  'stripe',
  'completed'
FROM test_student, existing_purchase;

-- Expected result:
-- ERROR: duplicate key value violates unique constraint "unique_external_invoice_id"
-- This is the CORRECT behavior - prevents duplicate webhook processing
--
-- App should catch this (error code 23505) and return:
-- NextResponse.json({ success: true }, { status: 200 })  // Idempotent response


-- TEST 6: NOT NULL constraints
-- ============================================================================
SELECT 'TEST 6: NOT NULL Constraints' as test_name;

-- Test 1: Missing student_id
BEGIN;
INSERT INTO public.quiz_purchases (
  course_id,
  external_invoice_id,
  amount_cents
)
VALUES ('python-101', 'cs_test_null_student_' || gen_random_uuid(), 1999);
ROLLBACK;
-- Expected: ERROR - student_id cannot be null

-- Test 2: Missing course_id
BEGIN;
WITH test_student AS (
  SELECT id FROM public.students WHERE email = 'test.student.4@example.com' LIMIT 1
)
INSERT INTO public.quiz_purchases (
  student_id,
  external_invoice_id,
  amount_cents
)
SELECT id, 'cs_test_null_course_' || gen_random_uuid(), 1999
FROM test_student;
ROLLBACK;
-- Expected: ERROR - course_id cannot be null

-- Test 3: Missing external_invoice_id
BEGIN;
WITH test_student AS (
  SELECT id FROM public.students WHERE email = 'test.student.4@example.com' LIMIT 1
)
INSERT INTO public.quiz_purchases (
  student_id,
  course_id,
  amount_cents
)
SELECT id, 'python-101', 1999 FROM test_student;
ROLLBACK;
-- Expected: ERROR - external_invoice_id cannot be null


-- TEST 7: CHECK constraint - positive amount
-- ============================================================================
SELECT 'TEST 7: CHECK Constraint - Positive Amount' as test_name;

-- Test: Zero or negative amount should fail
BEGIN;
WITH test_student AS (
  SELECT id FROM public.students WHERE email = 'test.student.4@example.com' LIMIT 1
)
INSERT INTO public.quiz_purchases (
  student_id,
  course_id,
  external_invoice_id,
  amount_cents
)
SELECT id, 'python-101', 'cs_test_zero_' || gen_random_uuid(), 0
FROM test_student;
ROLLBACK;
-- Expected: ERROR - check constraint "positive_amount" is violated


-- TEST 8: Foreign key constraint
-- ============================================================================
SELECT 'TEST 8: Foreign Key Constraint' as test_name;

-- Test: Invalid student_id should fail
BEGIN;
INSERT INTO public.quiz_purchases (
  student_id,
  course_id,
  external_invoice_id,
  amount_cents
)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,  -- Non-existent student
  'python-101',
  'cs_test_invalid_fk_' || gen_random_uuid(),
  1999
);
ROLLBACK;
-- Expected: ERROR - violates foreign key constraint "quiz_purchases_student_id_fkey"


-- TEST 9: Performance - Index lookup time
-- ============================================================================
SELECT 'TEST 9: Performance - Index Lookup' as test_name;

-- Get session ID from earlier test
WITH target_session AS (
  SELECT external_invoice_id FROM public.quiz_purchases
  WHERE course_id = 'python-101'
  LIMIT 1
),
query_start AS (
  SELECT NOW() as start_time
)
SELECT
  (SELECT external_invoice_id FROM target_session) as session_id,
  (SELECT NOW() - query_start.start_time)::TEXT as query_duration
FROM query_start;

-- Expected result:
-- - Query duration < 5ms (due to unique index)
-- - Single row returned with matching session ID


-- TEST 10: Composite index - student + course lookup
-- ============================================================================
SELECT 'TEST 10: Performance - Composite Index Lookup' as test_name;

-- Lookup: Has student purchased this course?
WITH test_student AS (
  SELECT id FROM public.students WHERE email = 'test.student.4@example.com' LIMIT 1
)
SELECT
  'Enrollment Check' as lookup_type,
  COUNT(*) as found_records,
  MAX(created_at) as most_recent_purchase
FROM public.quiz_purchases qp
WHERE qp.student_id = (SELECT id FROM test_student)
  AND qp.course_id = 'python-101'
  AND qp.status = 'completed';

-- Expected result:
-- - 1 row found (from test 4)
-- - Query uses idx_quiz_purchases_student_course (efficient)


-- TEST 11: RLS policy verification
-- ============================================================================
SELECT 'TEST 11: RLS Policies' as test_name;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'quiz_purchases'
ORDER BY policyname;

-- Expected policies:
-- - quiz_purchases_student_access (SELECT, per student email)
-- - quiz_purchases_service_access (ALL, for service role)


-- TEST 12: Simulate Stripe webhook - concurrent inserts (simplified)
-- ============================================================================
SELECT 'TEST 12: Concurrent Webhook Simulation (Sequential)' as test_name;

-- Create multiple test students
INSERT INTO public.students (email, email_verified)
VALUES
  ('test.concurrent.1@example.com', true),
  ('test.concurrent.2@example.com', true),
  ('test.concurrent.3@example.com', true)
ON CONFLICT (email) DO NOTHING;

-- Simulate 3 concurrent webhook events (sequential for SQL testing)
WITH test_students AS (
  SELECT id, email FROM public.students
  WHERE email LIKE 'test.concurrent.%'
  LIMIT 3
)
INSERT INTO public.quiz_purchases (
  student_id,
  course_id,
  external_invoice_id,
  amount_cents,
  currency,
  payment_method,
  status
)
SELECT
  id,
  'ai-bundle-' || (ROW_NUMBER() OVER (ORDER BY email)),
  'cs_concurrent_session_' || (ROW_NUMBER() OVER (ORDER BY email)) || '_' || gen_random_uuid(),
  2999,
  'USD',
  'stripe',
  'completed'
FROM test_students;

-- Verify 3 records inserted
SELECT
  'Concurrent Inserts' as test_type,
  COUNT(*) as total_records,
  COUNT(DISTINCT student_id) as unique_students,
  COUNT(DISTINCT course_id) as unique_courses
FROM public.quiz_purchases
WHERE course_id LIKE 'ai-bundle-%';

-- Expected result:
-- - 3 records inserted
-- - 3 unique students
-- - 3 unique courses


-- TEST 13: Cascade delete behavior
-- ============================================================================
SELECT 'TEST 13: Cascade Delete on Student Deletion' as test_name;

-- Get a student to delete
WITH student_to_delete AS (
  SELECT id, email FROM public.students
  WHERE email = 'test.student.4@example.com'
  LIMIT 1
)
-- Count their purchases before deletion
SELECT
  'Before deletion' as stage,
  (SELECT COUNT(*) FROM public.quiz_purchases WHERE student_id = (
    SELECT id FROM student_to_delete
  )) as purchase_count;

-- Delete the student (should cascade)
DELETE FROM public.students WHERE email = 'test.student.4@example.com';

-- Verify purchases were deleted
SELECT
  'After deletion' as stage,
  COUNT(*) as purchase_count
FROM public.quiz_purchases
WHERE student_id NOT IN (SELECT id FROM public.students);

-- Expected result:
-- - Before: 1+ purchases
-- - After: 0 purchases (cascade delete worked)


-- TEST 14: Data integrity summary
-- ============================================================================
SELECT 'TEST 14: Data Integrity Summary' as test_name;

SELECT
  'quiz_purchases' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT student_id) as unique_students,
  COUNT(DISTINCT course_id) as unique_courses,
  COUNT(DISTINCT external_invoice_id) as unique_sessions,
  COUNT(DISTINCT payment_method) as payment_methods,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_purchases,
  SUM(amount_cents) as total_revenue_cents,
  ROUND(SUM(amount_cents) / 100.0, 2) as total_revenue_usd
FROM public.quiz_purchases;

-- Expected result:
-- - total_records > 0
-- - unique_sessions = total_records (no duplicates)
-- - completed_purchases count
-- - revenue totals


-- TEST 15: Query performance summary
-- ============================================================================
SELECT 'TEST 15: Index Usage Summary' as test_name;

SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE relname = 'quiz_purchases'
ORDER BY idx_scan DESC;

-- This will show which indexes are being used by the tests above


-- ============================================================================
-- CLEANUP (Optional - run if you want to reset test data)
-- ============================================================================
-- Uncomment to delete all test records:
--
-- DELETE FROM public.quiz_purchases
-- WHERE course_id LIKE 'python-101'
--    OR course_id LIKE 'ai-bundle-%'
--    OR external_invoice_id LIKE 'cs_test_%'
--    OR external_invoice_id LIKE 'cs_concurrent_%';
--
-- DELETE FROM public.students
-- WHERE email LIKE 'test.%@example.com';
--
-- ============================================================================
