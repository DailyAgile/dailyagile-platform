-- Migration 052: Create Quiz Attempts Table
-- Tracks student quiz submission attempts with scores and timing
-- Date: 2026-08-28

-- ============================================================================
-- CREATE QUIZ_ATTEMPTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.quiz_assignments(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  status VARCHAR DEFAULT 'pending',  -- pending, in_progress, completed, abandoned
  score INTEGER,
  percentage INTEGER,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_percentage CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),
  CONSTRAINT check_score CHECK (score IS NULL OR score >= 0),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'abandoned'))
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON public.quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_assignment_id ON public.quiz_attempts(assignment_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON public.quiz_attempts(status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_attempted_at ON public.quiz_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_submitted_at ON public.quiz_attempts(submitted_at);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_student ON public.quiz_attempts(quiz_id, student_id);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Students can view their own attempts
CREATE POLICY "students_view_own_attempts" ON public.quiz_attempts
  FOR SELECT
  USING (
    student_id = (SELECT id FROM public.students WHERE email = auth.jwt() ->> 'email')
    OR student_id::text = auth.uid()
  );

-- Students can create attempts
CREATE POLICY "students_create_attempts" ON public.quiz_attempts
  FOR INSERT
  WITH CHECK (
    student_id = (SELECT id FROM public.students WHERE email = auth.jwt() ->> 'email')
    OR student_id::text = auth.uid()
  );

-- Students can update their own attempts
CREATE POLICY "students_update_own_attempts" ON public.quiz_attempts
  FOR UPDATE
  USING (
    student_id = (SELECT id FROM public.students WHERE email = auth.jwt() ->> 'email')
    OR student_id::text = auth.uid()
  )
  WITH CHECK (
    student_id = (SELECT id FROM public.students WHERE email = auth.jwt() ->> 'email')
    OR student_id::text = auth.uid()
  );

-- Instructors can view attempts for their quizzes
CREATE POLICY "instructors_view_attempts" ON public.quiz_attempts
  FOR SELECT
  USING (
    quiz_id IN (
      SELECT id FROM public.quizzes
      WHERE instructor_id = auth.jwt() ->> 'email'
      OR instructor_id::text = auth.uid()
    )
  );

-- Service role can do anything
CREATE POLICY "service_role_quiz_attempts" ON public.quiz_attempts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.quiz_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
