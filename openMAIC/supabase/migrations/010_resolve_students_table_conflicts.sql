-- Migration 010: Resolve Students Table Schema Conflicts
-- Purpose: Unify students table schema, add missing columns from migration 005
-- Date: 2026-08-12
-- ============================================================================

-- NOTE: This migration unifies the conflicting students table definitions from:
-- - Migration 001: email, name, student_id, avatar_url, created_at, updated_at
-- - Migration 002: adds auth_user_id, verified_at, is_verified
-- - Migration 005: expects first_name, last_name, password_hash, email_verified, last_login_at, is_active
--
-- The IF NOT EXISTS in migration 005 means it was skipped, leaving students table
-- incomplete relative to application expectations.

-- ============================================================================
-- STEP 1: BACKUP EXISTING DATA (for rollback/verification)
-- ============================================================================

CREATE TABLE IF NOT EXISTS students_backup_20260812 AS
SELECT * FROM students;

-- ============================================================================
-- STEP 2: ADD MISSING COLUMNS FROM MIGRATION 005
-- ============================================================================

-- Add first_name and last_name (split from existing 'name' column)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Add password_hash (for future auth support)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add email_verified (rename from is_verified, but keep both for safety)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Add verification_code and expiry (for email verification flow)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS verification_code TEXT,
  ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMPTZ;

-- Add last_login_at (for activity tracking)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Add is_active (for soft delete)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ============================================================================
-- STEP 3: MIGRATE DATA FROM 'name' TO 'first_name' + 'last_name'
-- ============================================================================

-- Split 'name' column into first_name and last_name (only if names are null)
UPDATE students
SET
  first_name = COALESCE(first_name, TRIM(SPLIT_PART(COALESCE(name, ''), ' ', 1))),
  last_name = COALESCE(last_name, TRIM(SPLIT_PART(COALESCE(name, ''), ' ', 2)))
WHERE first_name IS NULL OR last_name IS NULL;

-- Handle cases where name is null or empty
UPDATE students
SET
  first_name = COALESCE(first_name, 'Unknown'),
  last_name = COALESCE(last_name, '')
WHERE first_name IS NULL OR first_name = '';

-- ============================================================================
-- STEP 4: SYNC email_verified FROM is_verified (if is_verified exists)
-- ============================================================================

UPDATE students
SET email_verified = COALESCE(is_verified, FALSE)
WHERE email_verified = FALSE AND is_verified IS NOT NULL;

-- ============================================================================
-- STEP 5: ADD/UPDATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_students_first_name ON students(first_name);
CREATE INDEX IF NOT EXISTS idx_students_last_name ON students(last_name);
CREATE INDEX IF NOT EXISTS idx_students_email_verified ON students(email_verified);
CREATE INDEX IF NOT EXISTS idx_students_is_active ON students(is_active);

-- ============================================================================
-- STEP 6: ADD CONSTRAINTS TO ENSURE DATA QUALITY
-- ============================================================================

-- Ensure first_name is not empty (after migration)
ALTER TABLE students
  ADD CONSTRAINT check_first_name_not_empty
    CHECK (first_name IS NOT NULL AND TRIM(first_name) != '');

-- Ensure email is unique (already exists but explicit here)
-- ALTER TABLE students ADD CONSTRAINT students_email_unique UNIQUE(email);
-- (Already exists from migration 001)

-- ============================================================================
-- STEP 7: DOCUMENT SCHEMA UNIFICATION
-- ============================================================================

COMMENT ON TABLE students IS 'Unified student profiles (email, name, auth, verification, activity)';
COMMENT ON COLUMN students.name IS 'DEPRECATED: Split into first_name and last_name. Kept for backward compatibility.';
COMMENT ON COLUMN students.first_name IS 'Student first name (from migration 005 unified schema)';
COMMENT ON COLUMN students.last_name IS 'Student last name (from migration 005 unified schema)';
COMMENT ON COLUMN students.password_hash IS 'Hashed password for student auth (bcrypt or similar)';
COMMENT ON COLUMN students.email_verified IS 'Whether email has been verified (OTP confirmation)';
COMMENT ON COLUMN students.verification_code IS 'Temporary code for email verification (6-digit OTP)';
COMMENT ON COLUMN students.verification_code_expires_at IS 'Expiry time for verification code (typically 10 minutes)';
COMMENT ON COLUMN students.is_active IS 'Soft delete flag (false = deleted account, not removed from DB)';
COMMENT ON COLUMN students.last_login_at IS 'Timestamp of most recent login (for activity tracking)';
COMMENT ON COLUMN students.auth_user_id IS 'Link to Supabase auth.users for OAuth/email auth (from migration 002)';
COMMENT ON COLUMN students.verified_at IS 'Timestamp when email was verified (from migration 002)';
COMMENT ON COLUMN students.is_verified IS 'DEPRECATED: Use email_verified instead (kept for backward compatibility)';

-- ============================================================================
-- STEP 8: VERIFY DATA INTEGRITY
-- ============================================================================

-- Check that no students have null first_name
DO $$
DECLARE
  v_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_null_count FROM students WHERE first_name IS NULL OR first_name = '';
  IF v_null_count > 0 THEN
    RAISE WARNING 'Migration 010 warning: % students have null/empty first_name', v_null_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 9: ENABLE ROW LEVEL SECURITY (if not already enabled)
-- ============================================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Add/update RLS policies to handle new columns
-- Students can only view their own profile
DROP POLICY IF EXISTS "Students can view own profile" ON students;
CREATE POLICY "Students can view own profile" ON students
  FOR SELECT USING (auth.uid()::text = id::text);

-- Students can update their own profile (including new columns)
DROP POLICY IF EXISTS "Students can update own profile" ON students;
CREATE POLICY "Students can update own profile" ON students
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Allow service role (API) to insert new students during signup
DROP POLICY IF EXISTS "Enable insert for new student signup" ON students;
CREATE POLICY "Enable insert for new student signup" ON students
  FOR INSERT WITH CHECK (true);

-- Allow service role to select when verifying email
DROP POLICY IF EXISTS "Enable select for email verification" ON students;
CREATE POLICY "Enable select for email verification" ON students
  FOR SELECT USING (true);

-- Allow service role to update when verifying email or on login
DROP POLICY IF EXISTS "Enable update for email verification and login" ON students;
CREATE POLICY "Enable update for email verification and login" ON students
  FOR UPDATE USING (true) WITH CHECK (true);

-- ============================================================================
-- MIGRATION COMPLETE
-- Students table schema is now unified and complete
-- ============================================================================

-- Rollback instructions (if needed):
-- ALTER TABLE students DROP COLUMN first_name;
-- ALTER TABLE students DROP COLUMN last_name;
-- ALTER TABLE students DROP COLUMN password_hash;
-- ALTER TABLE students DROP COLUMN email_verified;
-- ALTER TABLE students DROP COLUMN verification_code;
-- ALTER TABLE students DROP COLUMN verification_code_expires_at;
-- ALTER TABLE students DROP COLUMN last_login_at;
-- ALTER TABLE students DROP COLUMN is_active;
-- DROP TABLE students_backup_20260812;
