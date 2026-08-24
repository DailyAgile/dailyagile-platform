-- Migration 019: Add Instructor Tracking, Audit Timestamps & Usage Metrics to Quizzes
-- Adds instructor_id, created_at, updated_at, deleted_at for audit trail
-- Adds total_questions, student_usage_count, instructor_usage_count for metrics
-- Date: 2026-08-13

-- Add instructor_id column (foreign key to instructors/auth.users)
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS instructor_id UUID;

-- Add audit timestamps
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add usage tracking metrics
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS student_usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS instructor_usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Create index on instructor_id for fast filtering
CREATE INDEX IF NOT EXISTS idx_quizzes_instructor_id ON quizzes(instructor_id);

-- Create index on deleted_at for soft delete queries
CREATE INDEX IF NOT EXISTS idx_quizzes_deleted_at ON quizzes(deleted_at);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at DESC);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quizzes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS trigger_quizzes_updated_at ON quizzes;

-- Create trigger to auto-update updated_at on any row change
CREATE TRIGGER trigger_quizzes_updated_at
BEFORE UPDATE ON quizzes
FOR EACH ROW
EXECUTE FUNCTION update_quizzes_updated_at();

-- Helper view for active quizzes only (not soft-deleted)
CREATE OR REPLACE VIEW active_quizzes AS
SELECT * FROM quizzes WHERE deleted_at IS NULL;

-- Helper function to soft-delete a quiz
CREATE OR REPLACE FUNCTION soft_delete_quiz(quiz_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE quizzes
  SET deleted_at = NOW()
  WHERE id = quiz_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Helper function to restore a soft-deleted quiz
CREATE OR REPLACE FUNCTION restore_quiz(quiz_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE quizzes
  SET deleted_at = NULL
  WHERE id = quiz_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update quiz usage metrics (called when a student takes/submits a quiz)
CREATE OR REPLACE FUNCTION increment_student_usage(quiz_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE quizzes
  SET
    student_usage_count = student_usage_count + 1,
    last_used_at = NOW()
  WHERE id = quiz_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update quiz usage metrics (called when instructor uses quiz in a session)
CREATE OR REPLACE FUNCTION increment_instructor_usage(quiz_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE quizzes
  SET
    instructor_usage_count = instructor_usage_count + 1,
    last_used_at = NOW()
  WHERE id = quiz_id;
END;
$$ LANGUAGE plpgsql;

-- Function to count and update total_questions based on quiz_questions table
CREATE OR REPLACE FUNCTION sync_quiz_question_count(quiz_id UUID)
RETURNS void AS $$
DECLARE
  question_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO question_count
  FROM quiz_questions
  WHERE quiz_id = $1;

  UPDATE quizzes
  SET total_questions = question_count
  WHERE id = quiz_id;
END;
$$ LANGUAGE plpgsql;

-- Verification queries (these show what was added)
SELECT 'Column Check: All Audit & Metrics Columns' as check_type,
       column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'quizzes'
  AND column_name IN (
    'instructor_id', 'created_at', 'updated_at', 'deleted_at',
    'total_questions', 'student_usage_count', 'instructor_usage_count', 'last_used_at'
  )
ORDER BY column_name;

SELECT 'Index Check' as check_type,
       indexname
FROM pg_indexes
WHERE tablename = 'quizzes' AND indexname LIKE 'idx_quizzes_%'
ORDER BY indexname;

SELECT 'Function Check' as check_type,
       routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%quiz%'
  AND (routine_name LIKE '%delete%' OR routine_name LIKE '%restore%'
       OR routine_name LIKE '%increment%' OR routine_name LIKE '%sync%')
ORDER BY routine_name;

SELECT 'Active Quizzes Count' as metric, COUNT(*) as count
FROM quizzes
WHERE deleted_at IS NULL;

SELECT 'Soft-Deleted Quizzes Count' as metric, COUNT(*) as count
FROM quizzes
WHERE deleted_at IS NOT NULL;

-- Show most used quizzes
SELECT 'Most Used By Students' as metric,
       title, quiz_code, student_usage_count, instructor_usage_count, last_used_at
FROM quizzes
WHERE deleted_at IS NULL
  AND (student_usage_count > 0 OR instructor_usage_count > 0)
ORDER BY student_usage_count DESC
LIMIT 10;
