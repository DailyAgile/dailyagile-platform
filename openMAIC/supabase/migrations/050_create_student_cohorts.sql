-- Migration 050: Create Student Cohorts Table
-- Depends on: 049_create_instructor_roles_table
-- Created: 2026-08-28
-- Purpose: Enable instructors to organize students into cohorts for bulk assignment

-- ============================================================================
-- 1. CREATE STUDENT_COHORTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,

  -- Ensure unique cohort names per instructor (case-insensitive)
  CONSTRAINT unique_cohort_name_per_instructor
    UNIQUE (instructor_id, LOWER(name))
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_cohorts_instructor ON public.student_cohorts(instructor_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_active ON public.student_cohorts(is_active);
CREATE INDEX IF NOT EXISTS idx_cohorts_created ON public.student_cohorts(created_at);

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.student_cohorts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. RLS POLICIES FOR STUDENT_COHORTS
-- ============================================================================

-- Instructors can view their own cohorts
CREATE POLICY "Instructors can view own cohorts"
  ON public.student_cohorts
  FOR SELECT
  USING (instructor_id = auth.jwt() ->> 'email' OR instructor_id = current_user_id());

-- Instructors can create cohorts
CREATE POLICY "Instructors can create cohorts"
  ON public.student_cohorts
  FOR INSERT
  WITH CHECK (instructor_id = auth.jwt() ->> 'email' OR instructor_id = current_user_id());

-- Instructors can update their own cohorts
CREATE POLICY "Instructors can update own cohorts"
  ON public.student_cohorts
  FOR UPDATE
  USING (instructor_id = auth.jwt() ->> 'email' OR instructor_id = current_user_id())
  WITH CHECK (instructor_id = auth.jwt() ->> 'email' OR instructor_id = current_user_id());

-- Instructors can delete their own cohorts
CREATE POLICY "Instructors can delete own cohorts"
  ON public.student_cohorts
  FOR DELETE
  USING (instructor_id = auth.jwt() ->> 'email' OR instructor_id = current_user_id());

-- Service role has full access for backend operations
CREATE POLICY "Backend full access to cohorts"
  ON public.student_cohorts
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 4. CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_cohort_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cohort_updated_at ON public.student_cohorts;
CREATE TRIGGER trigger_cohort_updated_at
  BEFORE UPDATE ON public.student_cohorts
  FOR EACH ROW
  EXECUTE FUNCTION update_cohort_timestamp();

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_cohorts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.student_cohorts_id_seq TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- Student cohorts table created for organizing students into groups
-- ============================================================================
