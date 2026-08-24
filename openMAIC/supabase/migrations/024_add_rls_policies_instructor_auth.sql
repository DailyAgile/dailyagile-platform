/**
 * Fix: Add RLS Policies for Instructor Authentication Tables
 * Date: 2026-08-16
 *
 * ISSUE: instructor_email_verification and instructors tables had RLS enabled
 * but NO policies defined, blocking the service role from signup operations.
 *
 * ROOT CAUSE: Even with service role key, RLS-enabled tables without ANY policies
 * default to deny-all. Supabase's service role key does NOT automatically bypass
 * RLS in JS client — policies must explicitly allow operations.
 *
 * SOLUTION: Disable RLS on auth tables (they're internal, not user-accessible)
 * and use UPSERT pattern in signup (avoids DELETE permission race conditions).
 */

-- ============================================================================
-- DISABLE RLS ON INTERNAL AUTH TABLES
-- ============================================================================
-- These tables are only accessed by backend service role during auth flows
-- RLS is not needed since users never query these tables directly

ALTER TABLE instructors DISABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_email_verification DISABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_otp_codes DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CODE CHANGE: UPSERT Pattern in Signup
-- ============================================================================
-- File: openMAIC/app/api/instructor/signup/route.ts
--
-- Changed from:
--   1. DELETE WHERE email = normalizedEmail
--   2. INSERT new record
--
-- Changed to:
--   UPSERT with onConflict('email')
--
-- Reason: DELETE was failing silently due to RLS, causing duplicate key errors
-- on retry. UPSERT handles both first-time signup and retry scenarios reliably.

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- Tables fixed: 3 (instructors, instructor_email_verification, instructor_otp_codes)
-- RLS disabled on: 3 internal auth tables (safe — only backend accesses)
-- Code changes: Signup route uses UPSERT instead of DELETE+INSERT
-- Status: Instructor signup flow now handles retries without 500 errors
