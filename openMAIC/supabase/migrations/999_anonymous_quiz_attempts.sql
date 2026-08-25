/**
 * Migration 999: Anonymous Quiz Attempts
 * Lightweight table for storing unauthenticated student quiz attempts
 * Used by the student quiz flow for practice/testing
 */

CREATE TABLE IF NOT EXISTS anonymous_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  quiz_code VARCHAR(8) NOT NULL,
  answers JSONB NOT NULL,  -- { "1": "A", "2": "B", ... }
  score_percentage INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anonymous_attempts_quiz_id ON anonymous_quiz_attempts(quiz_id);
CREATE INDEX idx_anonymous_attempts_created_at ON anonymous_quiz_attempts(created_at);

-- Enable RLS
ALTER TABLE anonymous_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Anyone can read/write their own attempts (based on session ID later)
CREATE POLICY "anonymous_read_own_attempts" ON anonymous_quiz_attempts
  FOR SELECT USING (true);

CREATE POLICY "anonymous_create_attempts" ON anonymous_quiz_attempts
  FOR INSERT WITH CHECK (true);
