-- Live Quiz Security Fix + Complete Column Setup
-- Purpose: Enable RLS, add missing columns, fix student_id type mismatch
-- Created: 2026-09-30

-- ============================================================================
-- 1. ENSURE ALL COLUMNS EXIST IN live_quiz_sessions
-- ============================================================================

ALTER TABLE live_quiz_sessions
ADD COLUMN IF NOT EXISTS show_answer BOOLEAN DEFAULT false;

-- Create index for show_answer queries
CREATE INDEX IF NOT EXISTS idx_live_quiz_sessions_show_answer 
  ON live_quiz_sessions(id, show_answer);

-- ============================================================================
-- 2. ENSURE ALL COLUMNS EXIST IN live_quiz_participants
-- ============================================================================

ALTER TABLE live_quiz_participants
ADD COLUMN IF NOT EXISTS student_name VARCHAR(255) DEFAULT 'Anonymous',
ADD COLUMN IF NOT EXISTS icon VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_live_quiz_participants_name 
  ON live_quiz_participants(student_name);

-- ============================================================================
-- 3. FIX student_id TYPE IN live_quiz_responses (UUID → TEXT)
-- ============================================================================

-- Only attempt type change if column is still UUID (idempotent)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'live_quiz_responses' 
    AND column_name = 'student_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE live_quiz_responses 
    ALTER COLUMN student_id TYPE TEXT USING student_id::TEXT;
  END IF;
END $$;

-- ============================================================================
-- 4. ENABLE RLS AND CREATE SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all three tables
ALTER TABLE live_quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_quiz_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_quiz_responses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS POLICIES FOR live_quiz_sessions
-- ============================================================================

-- Instructors can manage their own sessions
DROP POLICY IF EXISTS "sessions_instructor_full_access" ON live_quiz_sessions;
CREATE POLICY "sessions_instructor_full_access" ON live_quiz_sessions
  FOR ALL USING (auth.uid() = instructor_id)
  WITH CHECK (auth.uid() = instructor_id);

-- Students can view sessions they're participants in
DROP POLICY IF EXISTS "sessions_student_view_joined" ON live_quiz_sessions;
CREATE POLICY "sessions_student_view_joined" ON live_quiz_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM live_quiz_participants 
      WHERE session_id = live_quiz_sessions.id 
      AND student_id = (SELECT auth.uid()::TEXT)
    )
  );

-- ============================================================================
-- 6. RLS POLICIES FOR live_quiz_participants
-- ============================================================================

-- Instructors can view and modify all participants in their sessions
DROP POLICY IF EXISTS "participants_instructor_full" ON live_quiz_participants;
CREATE POLICY "participants_instructor_full" ON live_quiz_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM live_quiz_sessions 
      WHERE id = session_id 
      AND instructor_id = auth.uid()
    )
  );

-- Students can view only their own participant record
DROP POLICY IF EXISTS "participants_student_own_only" ON live_quiz_participants;
CREATE POLICY "participants_student_own_only" ON live_quiz_participants
  FOR SELECT USING (student_id = (SELECT auth.uid()::TEXT));

-- ============================================================================
-- 7. RLS POLICIES FOR live_quiz_responses (STRICT)
-- ============================================================================

-- CRITICAL: Students CANNOT see peer responses - only own
DROP POLICY IF EXISTS "responses_student_own_only" ON live_quiz_responses;
CREATE POLICY "responses_student_own_only" ON live_quiz_responses
  FOR SELECT USING (student_id = (SELECT auth.uid()::TEXT));

-- Students can INSERT (submit) their own answers
DROP POLICY IF EXISTS "responses_student_submit" ON live_quiz_responses;
CREATE POLICY "responses_student_submit" ON live_quiz_responses
  FOR INSERT WITH CHECK (student_id = (SELECT auth.uid()::TEXT));

-- Instructors can view all responses for their sessions
DROP POLICY IF EXISTS "responses_instructor_view_all" ON live_quiz_responses;
CREATE POLICY "responses_instructor_view_all" ON live_quiz_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM live_quiz_sessions 
      WHERE id = session_id 
      AND instructor_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON COLUMN live_quiz_sessions.show_answer IS 'When true, answers are revealed to all students via Realtime subscription';
COMMENT ON COLUMN live_quiz_participants.student_name IS 'Student name entered at join time (required, stored as entered)';
COMMENT ON COLUMN live_quiz_participants.icon IS 'Random emoji icon assigned deterministically based on student_id';
COMMENT ON CONSTRAINT live_quiz_responses_session_id_fkey ON live_quiz_responses IS 'References session for RLS policy checks';
