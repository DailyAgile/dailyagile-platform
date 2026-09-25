-- Migration 053: Create Email Logs Table
-- Tracks all email reminders sent to students (for audit and retry)
-- Date: 2026-08-28

-- ============================================================================
-- CREATE EMAIL_LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  instructor_id TEXT NOT NULL,  -- Email of instructor who sent reminder
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  email_queue_id UUID REFERENCES public.email_queue(id) ON DELETE SET NULL,
  email_type VARCHAR DEFAULT 'quiz-reminder',  -- quiz-reminder, etc.
  subject TEXT NOT NULL,
  status VARCHAR DEFAULT 'queued',  -- queued, sending, sent, failed, dlq
  message_id TEXT,  -- External message ID from Brevo
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  include_quiz_link BOOLEAN DEFAULT true,
  include_deadline BOOLEAN DEFAULT false,
  deadline_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + interval '90 days'),

  -- Constraints
  CONSTRAINT valid_email_type CHECK (email_type IN ('quiz-reminder', 'certificate', 'enrollment')),
  CONSTRAINT valid_status CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'dlq')),
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries)
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_email_logs_quiz_id ON public.email_logs(quiz_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_instructor_id ON public.email_logs(instructor_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_student_id ON public.email_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_expires_at ON public.email_logs(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_quiz_student ON public.email_logs(quiz_id, student_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_pending ON public.email_logs(status) WHERE status IN ('queued', 'sending');

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Instructors can view logs for their own quiz reminders
CREATE POLICY "instructors_view_email_logs" ON public.email_logs
  FOR SELECT
  USING (
    instructor_id = auth.jwt() ->> 'email'
    OR quiz_id IN (
      SELECT id FROM public.quizzes
      WHERE instructor_id = auth.jwt() ->> 'email'
    )
  );

-- Instructors can create email logs (via API)
CREATE POLICY "instructors_create_email_logs" ON public.email_logs
  FOR INSERT
  WITH CHECK (
    instructor_id = auth.jwt() ->> 'email'
  );

-- Service role can do anything
CREATE POLICY "service_role_email_logs" ON public.email_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT ON public.email_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_logs TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
