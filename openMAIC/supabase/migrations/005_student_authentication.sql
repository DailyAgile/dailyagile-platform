-- Student Authentication System
-- Creates tables for student signup/login with email verification

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_code TEXT,
  verification_code_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- Student profiles
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  avatar_url TEXT,
  bio TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student quiz history (tracking attempts)
CREATE TABLE IF NOT EXISTS student_quiz_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER,
  percentage NUMERIC,
  time_taken_seconds INTEGER,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  passed BOOLEAN,
  answers JSONB DEFAULT '{}'
);

-- Quiz statistics (denormalized for fast queries)
CREATE TABLE IF NOT EXISTS quiz_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL UNIQUE REFERENCES quizzes(id) ON DELETE CASCADE,
  total_attempts INTEGER DEFAULT 0,
  average_score NUMERIC,
  pass_rate NUMERIC,
  difficulty_level TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student progress tracking
CREATE TABLE IF NOT EXISTS student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  total_quizzes_taken INTEGER DEFAULT 0,
  average_score NUMERIC,
  streak_days INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_email_verified ON students(email_verified);
CREATE INDEX IF NOT EXISTS idx_student_quiz_history_student_id ON student_quiz_history(student_id);
CREATE INDEX IF NOT EXISTS idx_student_quiz_history_quiz_id ON student_quiz_history(quiz_id);
CREATE INDEX IF NOT EXISTS idx_student_quiz_history_attempted_at ON student_quiz_history(attempted_at);
CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON student_progress(student_id);

-- Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_quiz_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;

-- Students can only view their own profile
CREATE POLICY "Students can view own profile" ON students
  FOR SELECT USING (auth.uid()::text = id::text);

-- Students can update their own profile
CREATE POLICY "Students can update own profile" ON students
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Students can view their own progress
CREATE POLICY "Students can view own progress" ON student_progress
  FOR SELECT USING (auth.uid()::text = student_id::text);

-- Students can view their own quiz history
CREATE POLICY "Students can view own quiz history" ON student_quiz_history
  FOR SELECT USING (auth.uid()::text = student_id::text);

-- Students can insert their own quiz attempts
CREATE POLICY "Students can insert quiz attempts" ON student_quiz_history
  FOR INSERT WITH CHECK (auth.uid()::text = student_id::text);
