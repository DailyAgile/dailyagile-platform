-- Migration 026: Complete Instructor Authentication Schema
-- Depends on: 025_quiz_module_extensions
-- Created: 2026-08-14
-- Purpose: Complete instructor auth system with password+OTP, email verification, password reset

/**
 * Complete Instructor Authentication Schema
 * - Remove auth.users dependency
 * - Support password + OTP authentication
 * - Email verification
 * - Password reset flow
 */

-- ============================================================================
-- UPDATE INSTRUCTORS TABLE
-- ============================================================================

-- Add password and verification columns
ALTER TABLE instructors
ADD COLUMN password_hash TEXT,
ADD COLUMN email_verified_at TIMESTAMPTZ;

-- Verify instructor on creation (they'll re-verify during signup)
UPDATE instructors SET email_verified_at = NOW() WHERE email_verified_at IS NULL;

-- ============================================================================
-- OTP CODES TABLE (for OTP login attempts)
-- ============================================================================

CREATE TABLE instructor_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_instructor_otp_codes_email ON instructor_otp_codes(email);
CREATE INDEX idx_instructor_otp_codes_expires ON instructor_otp_codes(expires_at);

-- ============================================================================
-- EMAIL VERIFICATION TABLE (for signup verification)
-- ============================================================================

CREATE TABLE instructor_email_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_instructor_email_verification_email ON instructor_email_verification(email);
CREATE INDEX idx_instructor_email_verification_token ON instructor_email_verification(token);
CREATE INDEX idx_instructor_email_verification_expires ON instructor_email_verification(expires_at);

-- ============================================================================
-- PASSWORD RESET TABLE
-- ============================================================================

CREATE TABLE instructor_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_instructor_password_resets_instructor_id ON instructor_password_resets(instructor_id);
CREATE INDEX idx_instructor_password_resets_email ON instructor_password_resets(email);
CREATE INDEX idx_instructor_password_resets_token ON instructor_password_resets(token);
CREATE INDEX idx_instructor_password_resets_expires ON instructor_password_resets(expires_at);

-- ============================================================================
-- CLEANUP: Remove old auth-related tables (no longer needed)
-- ============================================================================

-- Drop the foreign key constraint from instructors to auth.users
ALTER TABLE instructors DROP CONSTRAINT instructors_id_fkey;

-- Make instructors.id a regular UUID PK (not referencing auth.users)
-- The id column already exists and is UUID, just remove the FK

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE instructor_otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_email_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_password_resets ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies are minimal since these are internal auth tables
-- accessed only by backend service role, not by users directly
