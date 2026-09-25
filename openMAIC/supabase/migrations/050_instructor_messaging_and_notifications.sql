-- Migration 050: Instructor Messaging and Notifications System
-- Depends on: 049_create_instructor_roles_table
-- Created: 2026-08-28
-- Purpose: Support bulk messaging to students and track notification delivery

-- ============================================================================
-- 1. CREATE INSTRUCTOR_MESSAGES TABLE
-- Track messages sent by instructors to students
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.instructor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id TEXT NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  message_type VARCHAR(50) NOT NULL DEFAULT 'general', -- 'general', 'reminder', 'announcement'
  subject TEXT,
  body TEXT NOT NULL,
  recipient_type VARCHAR(50) NOT NULL, -- 'individual', 'group', 'all'
  recipient_count INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sent', 'failed'
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_message_type CHECK (message_type IN ('general', 'reminder', 'announcement')),
  CONSTRAINT valid_recipient_type CHECK (recipient_type IN ('individual', 'group', 'all')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'scheduled', 'sent', 'failed'))
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_messages_instructor ON public.instructor_messages(instructor_id);
CREATE INDEX IF NOT EXISTS idx_messages_quiz ON public.instructor_messages(quiz_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.instructor_messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.instructor_messages(created_at DESC);

-- ============================================================================
-- 2. CREATE MESSAGE_RECIPIENTS TABLE
-- Track individual message delivery to each student
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.instructor_messages(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL,
  delivery_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_delivery_status CHECK (delivery_status IN ('pending', 'sent', 'failed', 'bounced')),
  UNIQUE(message_id, student_id)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_recipients_message ON public.message_recipients(message_id);
CREATE INDEX IF NOT EXISTS idx_recipients_student ON public.message_recipients(student_id);
CREATE INDEX IF NOT EXISTS idx_recipients_status ON public.message_recipients(delivery_status);
CREATE INDEX IF NOT EXISTS idx_recipients_delivered ON public.message_recipients(delivered_at DESC);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.instructor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_recipients ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Allow service role access to messages"
  ON public.instructor_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role access to recipients"
  ON public.message_recipients
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- MIGRATION COMPLETE
-- Tables ready for instructor messaging and notifications
-- ============================================================================
