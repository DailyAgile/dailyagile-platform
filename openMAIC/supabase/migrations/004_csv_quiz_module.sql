/**
 * Migration 004: CSV Quiz Module
 * Adds support for multiple-choice quizzes with 5 options
 * Stores quiz questions and student answers
 * Date: 2026-01-15
 */

-- ============================================================================
-- QUIZ TABLES (Multiple Choice, 5 Options)
-- ============================================================================

CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  total_questions INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  settings JSONB DEFAULT '{"show_answers_after_submit": true, "allow_retakes": 3, "passing_score": 70}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question TEXT NOT NULL,
  timer_seconds INTEGER NOT NULL DEFAULT 60,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  option_e TEXT NOT NULL,
  correct_answer VARCHAR(1) NOT NULL,  -- A, B, C, D, or E
  explanation TEXT,
  source_link TEXT,
  points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E')),
  CHECK (timer_seconds >= 10 AND timer_seconds <= 600),
  CHECK (points > 0),
  UNIQUE(quiz_id, question_number)
);

-- ============================================================================
-- QUIZ SUBMISSION & ANSWER TABLES
-- ============================================================================

CREATE TABLE quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score INTEGER,
  percentage INTEGER,
  status VARCHAR(20) DEFAULT 'in_progress',  -- in_progress, completed
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Track when student attempts this quiz
  UNIQUE(quiz_id, student_id, started_at)
);

CREATE TABLE quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id),
  selected_answer VARCHAR(1),  -- A, B, C, D, or E (or NULL if not answered)
  is_correct BOOLEAN,
  time_taken_seconds INTEGER,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (selected_answer IS NULL OR selected_answer IN ('A', 'B', 'C', 'D', 'E')),
  UNIQUE(session_id, question_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_quizzes_classroom_id ON quizzes(classroom_id);
CREATE INDEX idx_quizzes_instructor_id ON quizzes(instructor_id);
CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_sessions_quiz_id ON quiz_sessions(quiz_id);
CREATE INDEX idx_quiz_sessions_student_id ON quiz_sessions(student_id);
CREATE INDEX idx_quiz_sessions_classroom_id ON quiz_sessions(classroom_id);
CREATE INDEX idx_quiz_responses_session_id ON quiz_responses(session_id);
CREATE INDEX idx_quiz_responses_question_id ON quiz_responses(question_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all quiz tables
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;

-- Quizzes: Only instructor who created can see/edit
CREATE POLICY "quizzes_instructor_only" ON quizzes
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "quizzes_student_can_view_published" ON quizzes
  FOR SELECT
  USING (
    classroom_id IN (
      SELECT classroom_id FROM student_rosters
      WHERE student_id = auth.uid()
    )
  );

-- Quiz Questions: Students can view questions of published quizzes
CREATE POLICY "quiz_questions_student_can_view" ON quiz_questions
  FOR SELECT
  USING (
    quiz_id IN (
      SELECT id FROM quizzes q
      WHERE q.classroom_id IN (
        SELECT classroom_id FROM student_rosters
        WHERE student_id = auth.uid()
      )
    )
  );

-- Quiz Sessions: Students only see their own sessions
CREATE POLICY "quiz_sessions_student_own" ON quiz_sessions
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "quiz_sessions_instructor_view" ON quiz_sessions
  FOR SELECT
  USING (
    classroom_id IN (
      SELECT id FROM classrooms
      WHERE instructor_id = auth.uid()
    )
  );

-- Quiz Responses: Students only see their own responses
CREATE POLICY "quiz_responses_student_own" ON quiz_responses
  USING (
    session_id IN (
      SELECT id FROM quiz_sessions
      WHERE student_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM quiz_sessions
      WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "quiz_responses_instructor_view" ON quiz_responses
  FOR SELECT
  USING (
    session_id IN (
      SELECT qs.id FROM quiz_sessions qs
      JOIN quizzes q ON qs.quiz_id = q.id
      WHERE q.classroom_id IN (
        SELECT id FROM classrooms
        WHERE instructor_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

/**
 * Calculate quiz session score based on responses
 */
CREATE OR REPLACE FUNCTION calculate_quiz_score(session_id UUID)
RETURNS TABLE(score INTEGER, percentage INTEGER, correct_count INTEGER, total_count INTEGER)
LANGUAGE SQL
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN qr.is_correct THEN qq.points ELSE 0 END), 0)::INTEGER as score,
    CASE
      WHEN SUM(qq.points) > 0
      THEN ROUND((SUM(CASE WHEN qr.is_correct THEN qq.points ELSE 0 END)::NUMERIC / SUM(qq.points)::NUMERIC) * 100)::INTEGER
      ELSE 0
    END as percentage,
    COUNT(CASE WHEN qr.is_correct THEN 1 END)::INTEGER as correct_count,
    COUNT(qr.id)::INTEGER as total_count
  FROM quiz_responses qr
  JOIN quiz_questions qq ON qr.question_id = qq.id
  WHERE qr.session_id = $1;
$$;

/**
 * Finalize quiz session after submission
 */
CREATE OR REPLACE FUNCTION finalize_quiz_session(session_id UUID)
RETURNS TABLE(score INTEGER, percentage INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_score INTEGER;
  v_percentage INTEGER;
BEGIN
  -- Calculate final score
  SELECT score, percentage INTO v_score, v_percentage
  FROM calculate_quiz_score(session_id);

  -- Update session with final score
  UPDATE quiz_sessions
  SET
    score = v_score,
    percentage = v_percentage,
    submitted_at = NOW(),
    status = 'completed'
  WHERE id = session_id;

  RETURN QUERY SELECT v_score, v_percentage;
END;
$$;

-- ============================================================================
-- AUDIT LOGGING FOR QUIZ CHANGES
-- ============================================================================

CREATE TABLE quiz_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id),
  action VARCHAR(50) NOT NULL,  -- created, updated, published, deleted
  instructor_id UUID REFERENCES auth.users(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_audit_log_quiz_id ON quiz_audit_log(quiz_id);
CREATE INDEX idx_quiz_audit_log_created_at ON quiz_audit_log(created_at);

/**
 * Log quiz creation
 */
CREATE OR REPLACE FUNCTION log_quiz_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO quiz_audit_log (quiz_id, action, instructor_id, details)
  VALUES (
    NEW.id,
    'created',
    NEW.instructor_id,
    jsonb_build_object('title', NEW.title, 'total_questions', NEW.total_questions)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quiz_creation_trigger
  AFTER INSERT ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION log_quiz_creation();

-- ============================================================================
-- VIEWS FOR QUIZ STATISTICS
-- ============================================================================

CREATE VIEW quiz_statistics AS
SELECT
  q.id as quiz_id,
  q.title,
  q.classroom_id,
  COUNT(DISTINCT qs.id) as total_attempts,
  COUNT(DISTINCT CASE WHEN qs.status = 'completed' THEN qs.id END) as completed_attempts,
  ROUND(AVG(CASE WHEN qs.status = 'completed' THEN qs.percentage END))::INTEGER as avg_percentage,
  MAX(qs.percentage) as max_percentage,
  MIN(qs.percentage) as min_percentage
FROM quizzes q
LEFT JOIN quiz_sessions qs ON q.id = qs.quiz_id
GROUP BY q.id, q.title, q.classroom_id;

CREATE VIEW student_quiz_progress AS
SELECT
  s.id as student_id,
  s.email,
  q.id as quiz_id,
  q.title,
  qs.id as session_id,
  qs.status,
  qs.score,
  qs.percentage,
  qs.started_at,
  qs.submitted_at,
  COUNT(qr.id) as answered_count,
  SUM(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) as correct_count,
  COUNT(qq.id) as total_questions
FROM students s
CROSS JOIN quizzes q
LEFT JOIN quiz_sessions qs ON s.id = qs.student_id AND q.id = qs.quiz_id
LEFT JOIN quiz_responses qr ON qs.id = qr.session_id
LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
GROUP BY s.id, s.email, q.id, q.title, qs.id, qs.status, qs.score, qs.percentage, qs.started_at, qs.submitted_at;
