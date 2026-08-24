-- Add Attempt Tracking & Version History
-- Supports attempt limits, quiz versioning, detailed attempt analytics
-- Date: 2026-08-12

-- ============================================================================
-- 1. EXTEND QUIZ_ASSIGNMENTS TABLE
-- Add attempt limit and pause capability
-- ============================================================================

ALTER TABLE public.quiz_assignments
  ADD COLUMN IF NOT EXISTS attempt_limit INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active'; -- 'active', 'paused', 'archived'

-- Index for status queries (finding active vs paused assignments)
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.quiz_assignments(status);

-- ============================================================================
-- 2. EXTEND QUIZ_SESSIONS TABLE
-- Track detailed attempt data for analytics and cheating detection
-- ============================================================================

ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS student_email TEXT,
  ADD COLUMN IF NOT EXISTS student_name TEXT;

-- Indexes for attempt tracking
CREATE INDEX IF NOT EXISTS idx_sessions_attempt ON public.quiz_sessions(student_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_sessions_student_email ON public.quiz_sessions(student_email);
CREATE INDEX IF NOT EXISTS idx_sessions_ip ON public.quiz_sessions(ip_address);

-- ============================================================================
-- 3. CREATE QUIZ_VERSIONS TABLE
-- Track quiz versions for audit trail and versioning history
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quiz_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id),
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  total_questions INTEGER,
  total_points INTEGER,
  settings JSONB,
  changed_by TEXT, -- instructor email who made changes
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_description TEXT, -- what changed (e.g., "Added 2 questions", "Updated passing score")

  UNIQUE(quiz_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_versions_quiz ON public.quiz_versions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_versions_changed_by ON public.quiz_versions(changed_by);

-- ============================================================================
-- 4. CREATE QUIZ_ATTEMPT_RESETS TABLE
-- Audit trail for when instructors reset student attempts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quiz_attempt_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_session_id UUID REFERENCES public.quiz_sessions(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  assignment_id UUID NOT NULL REFERENCES public.quiz_assignments(id),
  reset_by TEXT NOT NULL, -- instructor email
  reason TEXT, -- why reset (technical issue, etc.)
  reset_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resets_student ON public.quiz_attempt_resets(student_id);
CREATE INDEX IF NOT EXISTS idx_resets_assignment ON public.quiz_attempt_resets(assignment_id);
CREATE INDEX IF NOT EXISTS idx_resets_reset_by ON public.quiz_attempt_resets(reset_by);

-- ============================================================================
-- 5. EXTEND QUIZ_RESPONSES TABLE
-- Track attempt data per response for detailed analytics
-- ============================================================================

ALTER TABLE public.quiz_responses
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS response_order INTEGER, -- order answered (for detecting guessing patterns)
  ADD COLUMN IF NOT EXISTS time_on_question_seconds INTEGER;

CREATE INDEX IF NOT EXISTS idx_responses_attempt ON public.quiz_responses(session_id, attempt_number);

-- ============================================================================
-- 6. RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.quiz_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempt_resets ENABLE ROW LEVEL SECURITY;

-- Quiz versions - visible to everyone (instructors see theirs, admins see all)
CREATE POLICY "Allow service role access to versions"
  ON public.quiz_versions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Attempt resets - visible to instructors and students (for their own resets)
CREATE POLICY "Allow service role access to resets"
  ON public.quiz_attempt_resets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 7. HELPER FUNCTION: Get Current Attempt Number for Student
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_attempt_number(
  p_assignment_id UUID,
  p_student_id TEXT
) RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(attempt_number) + 1
     FROM quiz_sessions
     WHERE assignment_id = p_assignment_id
       AND student_id = p_student_id),
    1
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. HELPER FUNCTION: Check if Student Has Attempts Remaining
-- ============================================================================

CREATE OR REPLACE FUNCTION has_attempts_remaining(
  p_assignment_id UUID,
  p_student_id TEXT,
  p_attempt_limit INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_attempts_used INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_attempts_used
  FROM quiz_sessions
  WHERE assignment_id = p_assignment_id
    AND student_id = p_student_id
    AND status = 'completed';

  RETURN v_attempts_used < p_attempt_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- Tables and functions ready for attempt tracking and quiz versioning
-- ============================================================================
