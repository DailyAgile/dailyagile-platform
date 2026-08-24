-- Migration 027: Quiz Assignment System & Snapshots
-- Depends on: 026_instructor_auth_complete
-- Created: 2026-08-12
-- Purpose: Assignment-based quiz delivery with expiry dates and historical preservation

-- Quiz Assignment System & Snapshots
-- Enables assignment-based quiz delivery with expiry dates and historical preservation
-- Date: 2026-08-12

-- ============================================================================
-- PHASE 0: DATABASE ARCHITECTURE
-- ============================================================================

-- 1. EXTEND QUIZZES TABLE
-- Add soft delete and active status tracking
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_quizzes_active ON public.quizzes(is_active);
CREATE INDEX IF NOT EXISTS idx_quizzes_instructor ON public.quizzes(instructor_id);

-- ============================================================================
-- 2. CREATE QUIZ_ASSIGNMENTS TABLE
-- Tracks which student can access which quiz, with expiry dates
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  instructor_id TEXT NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  assignment_code VARCHAR(50) UNIQUE NOT NULL,
  assignment_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR DEFAULT 'active', -- 'active', 'archived', 'expired'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,

  -- Ensure expiry is in the future or now at minimum
  CONSTRAINT expires_in_future CHECK (expires_at > NOW())
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_assignments_code ON public.quiz_assignments(assignment_code);
CREATE INDEX IF NOT EXISTS idx_assignments_student ON public.quiz_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_quiz ON public.quiz_assignments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_assignments_expires ON public.quiz_assignments(expires_at);
CREATE INDEX IF NOT EXISTS idx_assignments_instructor ON public.quiz_assignments(instructor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_active ON public.quiz_assignments(is_active);

-- ============================================================================
-- 3. CREATE QUIZ_SNAPSHOTS TABLE
-- Frozen copy of quiz definition at assignment time (for historical accuracy)
-- Allows hard delete of quiz while preserving student scores
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_quiz_id UUID NOT NULL REFERENCES public.quizzes(id),
  assignment_id UUID NOT NULL REFERENCES public.quiz_assignments(id) ON DELETE CASCADE,
  quiz_definition JSONB NOT NULL, -- Complete frozen copy of quiz + questions
  snapshot_hash TEXT NOT NULL,    -- md5 of definition for integrity checking
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_snapshots_assignment ON public.quiz_snapshots(assignment_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_original_quiz ON public.quiz_snapshots(original_quiz_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_hash ON public.quiz_snapshots(snapshot_hash);

-- ============================================================================
-- 4. UPDATE QUIZ_SESSIONS TABLE
-- Link to snapshot instead of live quiz definition
-- ============================================================================
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS quiz_snapshot_id UUID REFERENCES public.quiz_snapshots(id);

-- Keep quiz_id for backward compatibility, but prefer quiz_snapshot_id
-- When both exist: quiz_snapshot_id takes precedence (for assignments)

-- Index for snapshot lookups
CREATE INDEX IF NOT EXISTS idx_sessions_snapshot ON public.quiz_sessions(quiz_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_sessions_assignment ON public.quiz_sessions(quiz_id)
  WHERE quiz_snapshot_id IS NOT NULL;

-- ============================================================================
-- 5. CREATE ASSIGNMENT_EXTENSION_REQUESTS TABLE
-- Track student requests for deadline extensions or new assignment codes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assignment_extension_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.quiz_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  request_type VARCHAR NOT NULL, -- 'extension' or 'new_code'
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR DEFAULT 'pending', -- 'pending', 'approved', 'denied'
  instructor_response TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  new_expiry_date TIMESTAMPTZ, -- for extension requests
  new_assignment_id UUID REFERENCES public.quiz_assignments(id) ON DELETE SET NULL, -- for new_code requests

  CONSTRAINT valid_request_type CHECK (request_type IN ('extension', 'new_code')),
  CONSTRAINT extension_has_expiry CHECK (
    (request_type = 'extension' AND new_expiry_date IS NOT NULL) OR
    request_type = 'new_code'
  )
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_requests_assignment ON public.assignment_extension_requests(assignment_id);
CREATE INDEX IF NOT EXISTS idx_requests_student ON public.assignment_extension_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.assignment_extension_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_pending ON public.assignment_extension_requests(status)
  WHERE status = 'pending';

-- ============================================================================
-- 6. EXTEND QUIZ_QUESTIONS TABLE
-- Add normalized question text and hash for duplicate detection
-- ============================================================================
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS question_normalized TEXT,
  ADD COLUMN IF NOT EXISTS question_hash TEXT;

-- Populate normalized field for existing questions
-- Normalized: lowercase, trimmed, single spaces
UPDATE public.quiz_questions
SET question_normalized = LOWER(TRIM(REGEXP_REPLACE(question, '\s+', ' ', 'g')))
WHERE question_normalized IS NULL;

-- Calculate MD5 hash for existing questions (for fuzzy matching)
UPDATE public.quiz_questions
SET question_hash = MD5(COALESCE(question_normalized, LOWER(TRIM(REGEXP_REPLACE(question, '\s+', ' ', 'g')))))
WHERE question_hash IS NULL;

-- Indexes for duplicate detection
CREATE INDEX IF NOT EXISTS idx_questions_normalized ON public.quiz_questions(quiz_id, question_normalized);
CREATE INDEX IF NOT EXISTS idx_questions_hash ON public.quiz_questions(quiz_id, question_hash);

-- ============================================================================
-- 7. ENABLE ROW LEVEL SECURITY (RLS)
-- Control access to assignment data based on roles
-- ============================================================================

ALTER TABLE public.quiz_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_extension_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. RLS POLICIES FOR QUIZ_ASSIGNMENTS
-- ============================================================================

-- Instructors can see their own assignments
CREATE POLICY "Instructors can view their assignments"
  ON public.quiz_assignments
  FOR SELECT
  USING (instructor_id = current_user_id() OR instructor_id = auth.jwt() ->> 'email');

-- Instructors can create assignments
CREATE POLICY "Instructors can create assignments"
  ON public.quiz_assignments
  FOR INSERT
  WITH CHECK (instructor_id = current_user_id() OR instructor_id = auth.jwt() ->> 'email');

-- Instructors can update their assignments
CREATE POLICY "Instructors can update their assignments"
  ON public.quiz_assignments
  FOR UPDATE
  USING (instructor_id = current_user_id() OR instructor_id = auth.jwt() ->> 'email')
  WITH CHECK (instructor_id = current_user_id() OR instructor_id = auth.jwt() ->> 'email');

-- Students can see assignments assigned to them
CREATE POLICY "Students can view assigned assignments"
  ON public.quiz_assignments
  FOR SELECT
  USING (
    student_id = (SELECT id FROM public.students WHERE email = auth.jwt() ->> 'email')
    OR assignment_code IS NOT NULL -- Shareable links visible to anyone
  );

-- ============================================================================
-- 9. RLS POLICIES FOR QUIZ_SNAPSHOTS
-- ============================================================================

-- Snapshots are visible to students taking the assignment
CREATE POLICY "Students can view snapshots of their assignments"
  ON public.quiz_snapshots
  FOR SELECT
  USING (
    assignment_id IN (
      SELECT id FROM public.quiz_assignments
      WHERE student_id = (SELECT id FROM public.students WHERE email = auth.jwt() ->> 'email')
    )
  );

-- Instructors can view all snapshots for their quizzes
CREATE POLICY "Instructors can view snapshots of their quizzes"
  ON public.quiz_snapshots
  FOR SELECT
  USING (
    original_quiz_id IN (
      SELECT id FROM public.quizzes
      WHERE instructor_id = auth.jwt() ->> 'email'
    )
  );

-- ============================================================================
-- 10. RLS POLICIES FOR ASSIGNMENT_EXTENSION_REQUESTS
-- ============================================================================

-- Students can see their own requests
CREATE POLICY "Students can view their extension requests"
  ON public.assignment_extension_requests
  FOR SELECT
  USING (student_id = (SELECT id FROM public.students WHERE email = auth.jwt() ->> 'email'));

-- Students can create extension requests
CREATE POLICY "Students can create extension requests"
  ON public.assignment_extension_requests
  FOR INSERT
  WITH CHECK (student_id = (SELECT id FROM public.students WHERE email = auth.jwt() ->> 'email'));

-- Instructors can see requests for their assignments
CREATE POLICY "Instructors can view extension requests for their assignments"
  ON public.assignment_extension_requests
  FOR SELECT
  USING (
    assignment_id IN (
      SELECT id FROM public.quiz_assignments
      WHERE instructor_id = auth.jwt() ->> 'email'
    )
  );

-- Instructors can update requests for their assignments
CREATE POLICY "Instructors can approve/deny extension requests"
  ON public.assignment_extension_requests
  FOR UPDATE
  USING (
    assignment_id IN (
      SELECT id FROM public.quiz_assignments
      WHERE instructor_id = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    assignment_id IN (
      SELECT id FROM public.quiz_assignments
      WHERE instructor_id = auth.jwt() ->> 'email'
    )
  );

-- ============================================================================
-- 11. CREATE TRIGGER FUNCTION FOR UPDATED_AT
-- Auto-update timestamp when records change
-- ============================================================================

CREATE OR REPLACE FUNCTION update_assignment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to quiz_assignments
DROP TRIGGER IF EXISTS trigger_quiz_assignments_updated_at ON public.quiz_assignments;
CREATE TRIGGER trigger_quiz_assignments_updated_at
  BEFORE UPDATE ON public.quiz_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_assignment_timestamp();

-- ============================================================================
-- 12. GRANT PERMISSIONS
-- Allow service role and authenticated users to access new tables
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.quiz_assignments TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.quiz_snapshots TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.assignment_extension_requests TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- Tables created and indexed for assignment-based quiz delivery system
-- ============================================================================
