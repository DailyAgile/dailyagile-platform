-- Phase 2 ILT (Instructor-Led Training) Database Schema
-- Created: August 6, 2026

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. CLASSROOMS (extends existing, add ILT fields)
-- ============================================================================

-- Note: If classrooms table already exists, this migration adds ILT fields
-- For fresh install, creates full table

CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructor_id UUID NOT NULL,
  access_code VARCHAR(20) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add instructor_id FK if table already exists (no-op if already present)
ALTER TABLE classrooms ADD CONSTRAINT fk_classrooms_instructor
  FOREIGN KEY (instructor_id) REFERENCES auth.users(id) ON DELETE CASCADE
  ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_classrooms_instructor ON classrooms(instructor_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_access_code ON classrooms(access_code);

-- ============================================================================
-- 2. STUDENTS (NEW)
-- ============================================================================

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  student_id VARCHAR(255) UNIQUE,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_student_id ON students(student_id);

-- ============================================================================
-- 3. STUDENT_ROSTERS (NEW - enrollment tracking)
-- ============================================================================

CREATE TABLE student_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'teaching_assistant')),
  enrollment_date TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'unenrolled')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(classroom_id, student_id)
);

CREATE INDEX idx_rosters_classroom ON student_rosters(classroom_id);
CREATE INDEX idx_rosters_classroom_status ON student_rosters(classroom_id, status);
CREATE INDEX idx_rosters_student ON student_rosters(student_id);
CREATE INDEX idx_rosters_enrollment ON student_rosters(enrollment_date);

-- ============================================================================
-- 4. QUIZ_SUBMISSIONS (NEW - quiz submission tracking)
-- ============================================================================

CREATE TABLE quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  scene_id VARCHAR(255) NOT NULL,
  quiz_id VARCHAR(255) NOT NULL,
  submitted_at TIMESTAMP,
  completed_at TIMESTAMP,
  score DECIMAL(10,2),
  max_score DECIMAL(10,2),
  percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN max_score > 0 THEN ROUND((score::NUMERIC / max_score::NUMERIC * 100), 2) ELSE NULL END
  ) STORED,
  status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK (score IS NULL OR max_score IS NULL OR score <= max_score)
);

CREATE INDEX idx_submissions_classroom ON quiz_submissions(classroom_id);
CREATE INDEX idx_submissions_student ON quiz_submissions(student_id);
CREATE INDEX idx_submissions_classroom_student ON quiz_submissions(classroom_id, student_id);
CREATE INDEX idx_submissions_classroom_submitted ON quiz_submissions(classroom_id, submitted_at DESC);
CREATE INDEX idx_submissions_status ON quiz_submissions(status);
CREATE INDEX idx_submissions_scene ON quiz_submissions(scene_id);

-- ============================================================================
-- 5. QUIZ_ANSWERS (NEW - individual question answers)
-- ============================================================================

CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES quiz_submissions(id) ON DELETE CASCADE,
  question_id VARCHAR(255) NOT NULL,
  question_text TEXT,
  user_answer TEXT,
  correct_answer TEXT,
  is_correct BOOLEAN,
  points_earned DECIMAL(10,2),
  max_points DECIMAL(10,2),
  feedback TEXT,
  question_type VARCHAR(50) CHECK (question_type IN ('single', 'multiple', 'short_answer')),
  created_at TIMESTAMP DEFAULT NOW(),
  CHECK (points_earned IS NULL OR max_points IS NULL OR points_earned <= max_points)
);

CREATE INDEX idx_answers_submission ON quiz_answers(submission_id);
CREATE INDEX idx_answers_question ON quiz_answers(question_id);

-- ============================================================================
-- 6. INSTRUCTOR_SESSIONS (NEW - real-time monitoring sessions)
-- ============================================================================

CREATE TABLE instructor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start TIMESTAMP DEFAULT NOW(),
  session_end TIMESTAMP,
  session_type VARCHAR(50) DEFAULT 'live' CHECK (session_type IN ('live', 'async')),
  quiz_being_monitored VARCHAR(255),
  student_visibility BOOLEAN DEFAULT true,
  is_quiz_locked BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_classroom ON instructor_sessions(classroom_id);
CREATE INDEX idx_sessions_instructor ON instructor_sessions(instructor_id);
CREATE INDEX idx_sessions_active ON instructor_sessions(session_end) WHERE session_end IS NULL;

-- ============================================================================
-- 7. AUDIT_LOGS (NEW - GDPR compliance & data access tracking)
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_classroom ON audit_logs(classroom_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) - CRITICAL FOR MULTI-TENANT DATA ISOLATION
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- CLASSROOMS: Instructors can manage their own; students can view enrolled
CREATE POLICY "classrooms_instructor_manage" ON classrooms
  FOR ALL USING (auth.uid() = instructor_id) WITH CHECK (auth.uid() = instructor_id);

CREATE POLICY "classrooms_student_view" ON classrooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_rosters
      WHERE student_rosters.classroom_id = classrooms.id
      AND student_rosters.student_id = auth.uid()
      AND student_rosters.status = 'active'
    )
  );

-- STUDENTS: Users can view their own profile; instructors can view their class students
CREATE POLICY "students_self_view" ON students
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "students_instructor_view" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_rosters sr
      JOIN classrooms c ON c.id = sr.classroom_id
      WHERE sr.student_id = students.id
      AND c.instructor_id = auth.uid()
    )
  );

-- STUDENT_ROSTERS: Instructor can manage; students can see their own enrollment
CREATE POLICY "rosters_instructor_manage" ON student_rosters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = student_rosters.classroom_id
      AND classrooms.instructor_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = student_rosters.classroom_id
      AND classrooms.instructor_id = auth.uid()
    )
  );

CREATE POLICY "rosters_student_view" ON student_rosters
  FOR SELECT USING (auth.uid() = student_id);

-- QUIZ_SUBMISSIONS: Student sees own; instructor sees class
CREATE POLICY "submissions_student_own" ON quiz_submissions
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "submissions_instructor_class" ON quiz_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = quiz_submissions.classroom_id
      AND classrooms.instructor_id = auth.uid()
    )
  );

CREATE POLICY "submissions_student_insert" ON quiz_submissions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "submissions_student_update" ON quiz_submissions
  FOR UPDATE USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

-- QUIZ_ANSWERS: Inherit submission permissions
CREATE POLICY "answers_student_view" ON quiz_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_submissions
      WHERE quiz_submissions.id = quiz_answers.submission_id
      AND quiz_submissions.student_id = auth.uid()
    )
  );

CREATE POLICY "answers_instructor_view" ON quiz_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_submissions
      JOIN classrooms ON classrooms.id = quiz_submissions.classroom_id
      WHERE quiz_submissions.id = quiz_answers.submission_id
      AND classrooms.instructor_id = auth.uid()
    )
  );

CREATE POLICY "answers_student_insert" ON quiz_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_submissions
      WHERE quiz_submissions.id = quiz_answers.submission_id
      AND quiz_submissions.student_id = auth.uid()
    )
  );

-- INSTRUCTOR_SESSIONS: Only instructor can see their sessions
CREATE POLICY "sessions_instructor_manage" ON instructor_sessions
  FOR ALL USING (auth.uid() = instructor_id) WITH CHECK (auth.uid() = instructor_id);

-- AUDIT_LOGS: Instructor sees classroom logs; users see their own access
CREATE POLICY "audit_instructor_view" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = audit_logs.classroom_id
      AND classrooms.instructor_id = auth.uid()
    )
  );

CREATE POLICY "audit_user_own_access" ON audit_logs
  FOR SELECT USING (auth.uid() = actor_id);

CREATE POLICY "audit_system_insert" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 9. FUNCTION: Log audit events
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_log(
  p_classroom_id UUID,
  p_actor_id UUID,
  p_action VARCHAR,
  p_resource_type VARCHAR,
  p_resource_id VARCHAR,
  p_details JSONB
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (classroom_id, actor_id, action, resource_type, resource_id, details)
  VALUES (p_classroom_id, p_actor_id, p_action, p_resource_type, p_resource_id, p_details)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. FUNCTION: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for classrooms
DROP TRIGGER IF EXISTS update_classrooms_updated_at ON classrooms;
CREATE TRIGGER update_classrooms_updated_at
  BEFORE UPDATE ON classrooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for student_rosters
DROP TRIGGER IF EXISTS update_rosters_updated_at ON student_rosters;
CREATE TRIGGER update_rosters_updated_at
  BEFORE UPDATE ON student_rosters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for quiz_submissions
DROP TRIGGER IF EXISTS update_submissions_updated_at ON quiz_submissions;
CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON quiz_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for instructor_sessions
DROP TRIGGER IF EXISTS update_sessions_updated_at ON instructor_sessions;
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON instructor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 11. COMMENTS (for documentation)
-- ============================================================================

COMMENT ON TABLE classrooms IS 'Classroom instances with instructor and settings';
COMMENT ON TABLE students IS 'Student profiles (email, name, ID)';
COMMENT ON TABLE student_rosters IS 'Enrollment records linking students to classrooms';
COMMENT ON TABLE quiz_submissions IS 'Quiz attempt records with scores and status';
COMMENT ON TABLE quiz_answers IS 'Individual question answers within submissions';
COMMENT ON TABLE instructor_sessions IS 'Real-time monitoring sessions during quiz';
COMMENT ON TABLE audit_logs IS 'Data access audit trail for GDPR compliance';

COMMENT ON COLUMN student_rosters.status IS 'active=enrolled, dropped=left class, unenrolled=removed by instructor';
COMMENT ON COLUMN quiz_submissions.status IS 'in_progress=taking quiz, submitted=awaiting grade, graded=complete';
COMMENT ON COLUMN audit_logs.action IS 'create, read, update, delete, export, etc.';
