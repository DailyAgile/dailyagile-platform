-- Migration 051: Create Cohort Members Table
-- Depends on: 050_create_student_cohorts
-- Created: 2026-08-28
-- Purpose: Track which students belong to which cohorts

-- ============================================================================
-- 1. CREATE COHORT_MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cohort_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES public.student_cohorts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure each student appears only once per cohort
  CONSTRAINT unique_member_per_cohort UNIQUE (cohort_id, student_id)
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort ON public.cohort_members(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_members_student ON public.cohort_members(student_id);
CREATE INDEX IF NOT EXISTS idx_cohort_members_added ON public.cohort_members(added_at);

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.cohort_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. RLS POLICIES FOR COHORT_MEMBERS
-- ============================================================================

-- Instructors can view members of their cohorts
CREATE POLICY "Instructors can view members of own cohorts"
  ON public.cohort_members
  FOR SELECT
  USING (
    cohort_id IN (
      SELECT id FROM public.student_cohorts
      WHERE instructor_id = auth.jwt() ->> 'email' OR instructor_id = current_user_id()
    )
  );

-- Instructors can add members to their cohorts
CREATE POLICY "Instructors can add members to own cohorts"
  ON public.cohort_members
  FOR INSERT
  WITH CHECK (
    cohort_id IN (
      SELECT id FROM public.student_cohorts
      WHERE instructor_id = auth.jwt() ->> 'email' OR instructor_id = current_user_id()
    )
  );

-- Instructors can remove members from their cohorts
CREATE POLICY "Instructors can remove members from own cohorts"
  ON public.cohort_members
  FOR DELETE
  USING (
    cohort_id IN (
      SELECT id FROM public.student_cohorts
      WHERE instructor_id = auth.jwt() ->> 'email' OR instructor_id = current_user_id()
    )
  );

-- Students can view cohorts they belong to
CREATE POLICY "Students can view their cohorts"
  ON public.cohort_members
  FOR SELECT
  USING (
    student_id = (SELECT id FROM public.students WHERE email = auth.jwt() ->> 'email')
  );

-- Service role has full access for backend operations
CREATE POLICY "Backend full access to cohort members"
  ON public.cohort_members
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 4. HELPER VIEW: COHORT_SUMMARY
-- Get cohort info with member count
-- ============================================================================

CREATE OR REPLACE VIEW public.cohort_summary AS
SELECT
  c.id,
  c.instructor_id,
  c.name,
  c.description,
  c.created_at,
  c.updated_at,
  c.is_active,
  COUNT(cm.id)::INTEGER AS member_count
FROM public.student_cohorts c
LEFT JOIN public.cohort_members cm ON c.id = cm.cohort_id
GROUP BY c.id, c.instructor_id, c.name, c.description, c.created_at, c.updated_at, c.is_active;

-- Grant access to view
GRANT SELECT ON public.cohort_summary TO service_role;
GRANT SELECT ON public.cohort_summary TO authenticated;

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, DELETE ON public.cohort_members TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.cohort_members_id_seq TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- Cohort members table created for managing cohort membership
-- ============================================================================
