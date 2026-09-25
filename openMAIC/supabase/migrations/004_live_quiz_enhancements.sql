-- Live Quiz Enhancements
-- Purpose: Add missing columns for join codes, student names, answer reveal, and timer control

-- Add missing columns to live_quiz_sessions if they don't exist
ALTER TABLE live_quiz_sessions
ADD COLUMN IF NOT EXISTS join_code VARCHAR(8) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
ADD COLUMN IF NOT EXISTS quiz_id UUID,
ADD COLUMN IF NOT EXISTS question_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS question_duration_seconds INT DEFAULT 60,
ADD COLUMN IF NOT EXISTS show_answer BOOLEAN DEFAULT false;

-- Add index for join code lookups
CREATE INDEX IF NOT EXISTS idx_live_quiz_sessions_join_code ON live_quiz_sessions(join_code);

-- Add missing columns to live_quiz_participants
ALTER TABLE live_quiz_participants
ADD COLUMN IF NOT EXISTS student_id TEXT,
ADD COLUMN IF NOT EXISTS student_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS icon VARCHAR(10);

-- Modify student_id column type in live_quiz_responses if needed
-- This allows TEXT student IDs (from browsers) instead of UUIDs
ALTER TABLE live_quiz_responses
ALTER COLUMN student_id TYPE TEXT;

-- Drop and recreate the student reference constraint if needed
ALTER TABLE live_quiz_participants
DROP CONSTRAINT IF EXISTS live_quiz_participants_student_id_fkey;

-- Update index for participants with text student_id
DROP INDEX IF EXISTS idx_live_quiz_participants_student;
CREATE INDEX IF NOT EXISTS idx_live_quiz_participants_student ON live_quiz_participants(student_id);
