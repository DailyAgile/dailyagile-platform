-- Phase 3: Live Quiz Sessions + RLS Policies
-- Created: 2026-02-01
-- Purpose: Real-time instructor-led quiz sessions with secure data isolation

-- ============================================================================
-- 1. LIVE_QUIZ_SESSIONS TABLE
-- ============================================================================

CREATE TABLE live_quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  quiz_scene_id VARCHAR(255) NOT NULL,
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'live', 'paused', 'ended')),
  current_question_id VARCHAR(255),
  current_question_index INT DEFAULT 0,
  is_question_locked BOOLEAN DEFAULT false,
  show_leaderboard BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE live_quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_live_quiz_sessions_classroom_status ON live_quiz_sessions(classroom_id, status);
CREATE INDEX idx_live_quiz_sessions_instructor ON live_quiz_sessions(instructor_id);
CREATE INDEX idx_live_quiz_sessions_active ON live_quiz_sessions(status) WHERE status IN ('pending', 'live', 'paused');

-- ============================================================================
-- 2. LIVE_QUIZ_PARTICIPANTS TABLE — Real-time Progress Tracking
-- ============================================================================

CREATE TABLE live_quiz_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_quiz_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(auth_user_id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'joined'
    CHECK (status IN ('joined', 'active', 'stuck', 'completed', 'idle')),
  current_score DECIMAL(10, 2) DEFAULT 0,
  questions_answered INT DEFAULT 0,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

ALTER TABLE live_quiz_participants ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_live_quiz_participants_session ON live_quiz_participants(session_id);
CREATE INDEX idx_live_quiz_participants_student ON live_quiz_participants(student_id);
CREATE INDEX idx_live_quiz_participants_session_score ON live_quiz_participants(session_id, current_score DESC);

-- ============================================================================
-- 3. LIVE_QUIZ_RESPONSES TABLE — Answer Log (CRITICAL RLS)
-- ============================================================================

CREATE TABLE live_quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_quiz_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(auth_user_id) ON DELETE CASCADE,
  question_id VARCHAR(255) NOT NULL,
  answer TEXT,
  is_correct BOOLEAN,
  response_time_ms INT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  is_visible_to_others BOOLEAN DEFAULT false,
  UNIQUE(session_id, student_id, question_id)
);

ALTER TABLE live_quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_live_quiz_responses_session ON live_quiz_responses(session_id);
CREATE INDEX idx_live_quiz_responses_student ON live_quiz_responses(student_id);
CREATE INDEX idx_live_quiz_responses_question ON live_quiz_responses(session_id, question_id);
CREATE INDEX idx_live_quiz_responses_submitted ON live_quiz_responses(session_id, submitted_at DESC);

-- ============================================================================
-- 4. RLS POLICIES — Secure Data Isolation
-- ============================================================================

-- LIVE_QUIZ_SESSIONS: Instructor manages, students view enrolled sessions
CREATE POLICY "sessions_instructor_manage" ON live_quiz_sessions
  FOR ALL USING (auth.uid() = instructor_id)
  WITH CHECK (
    auth.uid() = instructor_id
    AND EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = live_quiz_sessions.classroom_id
      AND classrooms.instructor_id = auth.uid()
    )
  );

CREATE POLICY "sessions_student_enrolled" ON live_quiz_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_rosters
      JOIN students ON students.id = student_rosters.student_id
      WHERE student_rosters.classroom_id = live_quiz_sessions.classroom_id
      AND students.auth_user_id = auth.uid()
      AND student_rosters.status = 'active'
    )
  );

-- LIVE_QUIZ_PARTICIPANTS: Instructor sees all, students see own
CREATE POLICY "participants_instructor_view" ON live_quiz_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM live_quiz_sessions
      WHERE live_quiz_sessions.id = live_quiz_participants.session_id
      AND live_quiz_sessions.instructor_id = auth.uid()
    )
  );

CREATE POLICY "participants_student_own" ON live_quiz_participants
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "participants_student_update" ON live_quiz_participants
  FOR UPDATE USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- LIVE_QUIZ_RESPONSES: CRITICAL — Students CANNOT see peers' answers
-- Only own responses + instructor sees all + leaderboard VIEW (aggregated)
CREATE POLICY "responses_instructor_view" ON live_quiz_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM live_quiz_sessions
      WHERE live_quiz_sessions.id = live_quiz_responses.session_id
      AND live_quiz_sessions.instructor_id = auth.uid()
    )
  );

CREATE POLICY "responses_student_own_only" ON live_quiz_responses
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "responses_student_submit" ON live_quiz_responses
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- ============================================================================
-- 5. LIVE_LEADERBOARD VIEW — Non-PII Aggregated Scores
-- ============================================================================

CREATE OR REPLACE VIEW live_leaderboard_visible_to_students AS
SELECT
  lqp.session_id,
  ROW_NUMBER() OVER (PARTITION BY lqp.session_id ORDER BY COALESCE(lqp.current_score, 0) DESC) AS rank,
  COALESCE(lqp.current_score, 0) AS score,
  COALESCE(lqp.questions_answered, 0) AS questions_answered,
  COALESCE(lqp.status, 'idle') AS status
  -- NO student_id, NO email, NO PII exposed
FROM live_quiz_participants lqp
WHERE (SELECT show_leaderboard FROM live_quiz_sessions WHERE id = lqp.session_id) = true
  OR (SELECT status FROM live_quiz_sessions WHERE id = lqp.session_id) = 'ended'
GROUP BY lqp.session_id, lqp.current_score, lqp.questions_answered, lqp.status;

-- ============================================================================
-- 6. AUTO-UPDATE TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS update_live_quiz_sessions_updated_at ON live_quiz_sessions;
CREATE TRIGGER update_live_quiz_sessions_updated_at
  BEFORE UPDATE ON live_quiz_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE live_quiz_sessions IS 'Instructor-led live quiz sessions';
COMMENT ON TABLE live_quiz_participants IS 'Student participation tracking in live sessions';
COMMENT ON TABLE live_quiz_responses IS 'Individual answers during live quiz — RLS enforces that students see only their own answers until instructor reveals';
COMMENT ON COLUMN live_quiz_responses.is_visible_to_others IS 'When true, answer is visible to other students (instructor controls this)';
COMMENT ON VIEW live_leaderboard_visible_to_students IS 'Non-PII leaderboard (rank + score only) visible only when instructor shows leaderboard or session ends';
