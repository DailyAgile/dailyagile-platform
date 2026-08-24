-- Migration 025: Quiz Module Extensions
-- Depends on: 024_add_rls_policies_instructor_auth
-- Created: 2026-01-15
-- Purpose: Link students to auth.users, add AI+instructor grading, audit trail

-- Phase 2: Quiz Module Extensions — Student Identity + Hybrid Grading
-- Created: 2026-01-15
-- Purpose: Link students to auth.users, add AI+instructor grading, audit trail

-- ============================================================================
-- 1. STUDENT TABLE EXTENSIONS — Link to Supabase Auth
-- ============================================================================

ALTER TABLE students
  ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN verified_at TIMESTAMPTZ,
  ADD COLUMN is_verified BOOLEAN DEFAULT false;

CREATE INDEX idx_students_auth_user_id ON students(auth_user_id);

-- ============================================================================
-- 2. QUIZ_ANSWERS EXTENSIONS — AI + Instructor Hybrid Grading
-- ============================================================================

ALTER TABLE quiz_answers
  ADD COLUMN grading_status VARCHAR(50) DEFAULT 'ungraded'
    CHECK (grading_status IN ('ungraded', 'ai_graded', 'instructor_reviewed', 'instructor_overridden')),
  ADD COLUMN ai_score NUMERIC,
  ADD COLUMN ai_feedback TEXT,
  ADD COLUMN ai_graded_at TIMESTAMPTZ,
  ADD COLUMN instructor_score NUMERIC,
  ADD COLUMN instructor_feedback TEXT,
  ADD COLUMN graded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN is_instructor_graded BOOLEAN DEFAULT false;

-- Integrity constraint: if instructor_score is set, graded_by must be set
ALTER TABLE quiz_answers
  ADD CONSTRAINT instructor_score_requires_graded_by
    CHECK ((instructor_score IS NOT NULL) = (graded_by IS NOT NULL));

-- Calculated column: effective score (instructor override wins, else AI, else points_earned)
ALTER TABLE quiz_answers
  ADD COLUMN effective_score NUMERIC GENERATED ALWAYS AS (
    COALESCE(instructor_score, ai_score, points_earned)
  ) STORED;

-- Update quiz_answers.question_type CHECK to include new types
ALTER TABLE quiz_answers
  DROP CONSTRAINT IF EXISTS quiz_answers_question_type_check;

ALTER TABLE quiz_answers
  ADD CONSTRAINT quiz_answers_question_type_check
    CHECK (question_type IN ('single', 'multiple', 'short_answer', 'essay', 'code', 'scenario'));

CREATE INDEX idx_quiz_answers_grading_status ON quiz_answers(grading_status);
CREATE INDEX idx_quiz_answers_graded_by ON quiz_answers(graded_by);

-- ============================================================================
-- 3. VERIFICATION_ATTEMPTS TABLE — Rate Limiting for Email OTP
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  ip VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_attempts_email_created ON verification_attempts(email, created_at);

-- ============================================================================
-- 4. AUDIT LOGGING — Grade Override Trail
-- ============================================================================

-- Trigger: Log all instructor grade overrides
CREATE OR REPLACE FUNCTION audit_grade_override()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.instructor_score IS NOT NULL AND OLD.instructor_score IS NULL THEN
    INSERT INTO audit_logs (
      classroom_id,
      actor_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      (SELECT classroom_id FROM quiz_submissions WHERE id = NEW.submission_id),
      NEW.graded_by,
      'instructor_override_grade',
      'quiz_answer',
      NEW.id,
      jsonb_build_object(
        'question_id', NEW.question_id,
        'before_score', OLD.points_earned,
        'after_score', NEW.instructor_score,
        'feedback', NEW.instructor_feedback,
        'timestamp', NOW()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_grade_override ON quiz_answers;
CREATE TRIGGER on_grade_override AFTER UPDATE ON quiz_answers
  FOR EACH ROW EXECUTE FUNCTION audit_grade_override();

-- ============================================================================
-- 5. RLS POLICIES — Self-Paced + ILT Isolation
-- ============================================================================

-- Students can read/write their own quiz submissions
CREATE POLICY "quiz_submissions_student_own" ON quiz_submissions
  FOR ALL USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Instructor can read submissions for their classrooms
CREATE POLICY "quiz_submissions_instructor_class" ON quiz_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = quiz_submissions.classroom_id
      AND classrooms.instructor_id = auth.uid()
    )
  );

-- Student can read/write their own answers
CREATE POLICY "quiz_answers_student_own" ON quiz_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quiz_submissions
      WHERE quiz_submissions.id = quiz_answers.submission_id
      AND quiz_submissions.student_id = auth.uid()
    )
  );

-- Instructor can read answers for their classroom submissions
CREATE POLICY "quiz_answers_instructor_view" ON quiz_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_submissions
      JOIN classrooms ON classrooms.id = quiz_submissions.classroom_id
      WHERE quiz_submissions.id = quiz_answers.submission_id
      AND classrooms.instructor_id = auth.uid()
    )
  );

-- Instructor can update grades in their classrooms
CREATE POLICY "quiz_answers_instructor_grade" ON quiz_answers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quiz_submissions
      JOIN classrooms ON classrooms.id = quiz_submissions.classroom_id
      WHERE quiz_submissions.id = quiz_answers.submission_id
      AND classrooms.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_submissions
      JOIN classrooms ON classrooms.id = quiz_submissions.classroom_id
      WHERE quiz_submissions.id = quiz_answers.submission_id
      AND classrooms.instructor_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX idx_quiz_submissions_student_classroom ON quiz_submissions(student_id, classroom_id);
CREATE INDEX idx_quiz_submissions_created_at ON quiz_submissions(created_at DESC);
CREATE INDEX idx_quiz_answers_submission_id ON quiz_answers(submission_id);
CREATE INDEX idx_quiz_answers_effective_score ON quiz_answers(effective_score);

-- ============================================================================
-- 7. COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE verification_attempts IS 'Rate limiting for email OTP sending';
COMMENT ON COLUMN quiz_answers.grading_status IS 'ungraded | ai_graded | instructor_reviewed | instructor_overridden';
COMMENT ON COLUMN quiz_answers.effective_score IS 'Final score: instructor override > AI score > points_earned';
COMMENT ON COLUMN students.auth_user_id IS 'Links self-paced student to Supabase auth.users for authentication';
