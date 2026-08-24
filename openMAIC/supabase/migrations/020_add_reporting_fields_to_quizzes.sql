-- Migration 020: Add Comprehensive Reporting Fields to Quizzes Table
-- Adds fields for analytics, categorization, and quality metrics
-- Enables advanced reporting and dashboard capabilities
-- Date: 2026-08-13

-- ============================================================================
-- HIGH PRIORITY: Learning & Engagement Metrics
-- ============================================================================

ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS average_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pass_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_time_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS required_pass_score INTEGER DEFAULT 70;

-- Add constraint for difficulty_level
ALTER TABLE quizzes
ADD CONSTRAINT check_difficulty_level
CHECK (difficulty_level IN ('easy', 'medium', 'hard'));

-- ============================================================================
-- HIGH PRIORITY: Organization & Categorization
-- ============================================================================

ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS quiz_category VARCHAR(50) DEFAULT 'practice',
ADD COLUMN IF NOT EXISTS module_id UUID,
ADD COLUMN IF NOT EXISTS learning_objectives JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

-- Add constraint for quiz_category
ALTER TABLE quizzes
ADD CONSTRAINT check_quiz_category
CHECK (quiz_category IN ('assessment', 'practice', 'certification', 'checkpoint', 'diagnostic'));

-- ============================================================================
-- HIGH PRIORITY: Status & Versioning
-- ============================================================================

ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS quiz_status VARCHAR(20) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_certificate BOOLEAN DEFAULT FALSE;

-- Add constraint for quiz_status
ALTER TABLE quizzes
ADD CONSTRAINT check_quiz_status
CHECK (quiz_status IN ('draft', 'published', 'archived'));

-- ============================================================================
-- MEDIUM PRIORITY: Advanced Analytics
-- ============================================================================

ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS unique_students_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_attempts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_rating DECIMAL(3,1),
ADD COLUMN IF NOT EXISTS question_quality_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pass_rate_baseline DECIMAL(5,2);

-- ============================================================================
-- MEDIUM PRIORITY: Time Tracking Details
-- ============================================================================

ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS average_time_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_time_seconds INTEGER,
ADD COLUMN IF NOT EXISTS max_time_seconds INTEGER,
ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

-- ============================================================================
-- LOW PRIORITY: Relational & Business Fields
-- ============================================================================

ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS prerequisite_quiz_id UUID,
ADD COLUMN IF NOT EXISTS parent_module_id UUID,
ADD COLUMN IF NOT EXISTS organization_id UUID,
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS language_code VARCHAR(5) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS price_tier VARCHAR(20) DEFAULT 'free';

-- ============================================================================
-- INDEXES FOR FAST REPORTING QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quizzes_difficulty_level ON quizzes(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_quizzes_quiz_category ON quizzes(quiz_category);
CREATE INDEX IF NOT EXISTS idx_quizzes_quiz_status ON quizzes(quiz_status);
CREATE INDEX IF NOT EXISTS idx_quizzes_module_id ON quizzes(module_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_is_public ON quizzes(is_public);
CREATE INDEX IF NOT EXISTS idx_quizzes_requires_certificate ON quizzes(requires_certificate);
CREATE INDEX IF NOT EXISTS idx_quizzes_average_score ON quizzes(average_score DESC);
CREATE INDEX IF NOT EXISTS idx_quizzes_pass_rate ON quizzes(pass_rate DESC);
CREATE INDEX IF NOT EXISTS idx_quizzes_student_usage_count ON quizzes(student_usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_quizzes_language_code ON quizzes(language_code);

-- ============================================================================
-- HELPER FUNCTIONS FOR ANALYTICS
-- ============================================================================

-- Function to calculate average score from quiz_attempts/submissions
CREATE OR REPLACE FUNCTION calculate_quiz_average_score(quiz_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  avg_score DECIMAL;
BEGIN
  SELECT AVG(CAST(score AS DECIMAL)) INTO avg_score
  FROM quiz_submissions
  WHERE quiz_id = $1;

  RETURN COALESCE(avg_score, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate pass rate (percentage of students with score >= required_pass_score)
CREATE OR REPLACE FUNCTION calculate_quiz_pass_rate(quiz_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  pass_rate DECIMAL;
  pass_threshold INTEGER;
BEGIN
  SELECT required_pass_score INTO pass_threshold FROM quizzes WHERE id = quiz_id;

  SELECT ROUND(
    (COUNT(CASE WHEN CAST(score AS INTEGER) >= pass_threshold THEN 1 END)::DECIMAL /
     NULLIF(COUNT(*), 0) * 100)::NUMERIC,
    2
  ) INTO pass_rate
  FROM quiz_submissions
  WHERE quiz_id = $1;

  RETURN COALESCE(pass_rate, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate average time to complete (from quiz_submissions)
CREATE OR REPLACE FUNCTION calculate_quiz_average_time(quiz_id UUID)
RETURNS INTEGER AS $$
DECLARE
  avg_time INTEGER;
BEGIN
  SELECT AVG(CAST(EXTRACT(EPOCH FROM (completed_at - submitted_at)) AS INTEGER))::INTEGER INTO avg_time
  FROM quiz_submissions
  WHERE quiz_id = $1 AND completed_at IS NOT NULL;

  RETURN COALESCE(avg_time, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to sync all metrics (call after new submissions batch)
CREATE OR REPLACE FUNCTION sync_quiz_metrics(quiz_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE quizzes
  SET
    average_score = calculate_quiz_average_score(quiz_id),
    pass_rate = calculate_quiz_pass_rate(quiz_id),
    average_time_seconds = calculate_quiz_average_time(quiz_id),
    average_time_minutes = ROUND(calculate_quiz_average_time(quiz_id) / 60.0)::INTEGER,
    unique_students_count = (
      SELECT COUNT(DISTINCT student_id)
      FROM quiz_submissions
      WHERE quiz_id = $1
    ),
    total_attempts_count = (
      SELECT COUNT(*)
      FROM quiz_submissions
      WHERE quiz_id = $1
    )
  WHERE id = quiz_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- REPORTING VIEWS
-- ============================================================================

-- View: Quiz Health Dashboard
CREATE OR REPLACE VIEW vw_quiz_health AS
SELECT
  id,
  title,
  quiz_code,
  difficulty_level,
  quiz_category,
  quiz_status,
  average_score,
  pass_rate,
  average_time_minutes,
  student_usage_count,
  unique_students_count,
  total_attempts_count,
  engagement_score,
  quality_rating,
  instructor_id,
  created_at,
  updated_at,
  last_used_at
FROM quizzes
WHERE deleted_at IS NULL
ORDER BY student_usage_count DESC;

-- View: Instructor Quiz Summary
CREATE OR REPLACE VIEW vw_instructor_quiz_summary AS
SELECT
  instructor_id,
  COUNT(*) as total_quizzes,
  COUNT(CASE WHEN quiz_status = 'published' THEN 1 END) as published_quizzes,
  COUNT(CASE WHEN quiz_status = 'draft' THEN 1 END) as draft_quizzes,
  ROUND(AVG(average_score)::NUMERIC, 2) as avg_quiz_score,
  ROUND(AVG(pass_rate)::NUMERIC, 2) as avg_quiz_pass_rate,
  SUM(student_usage_count) as total_student_completions,
  MAX(updated_at) as last_quiz_updated
FROM quizzes
WHERE deleted_at IS NULL
GROUP BY instructor_id;

-- View: Module Performance Analysis
CREATE OR REPLACE VIEW vw_module_performance AS
SELECT
  module_id,
  COUNT(*) as quiz_count,
  ROUND(AVG(average_score)::NUMERIC, 2) as module_avg_score,
  ROUND(AVG(pass_rate)::NUMERIC, 2) as module_pass_rate,
  ROUND(AVG(average_time_minutes)::NUMERIC, 0)::INTEGER as module_avg_time_minutes,
  SUM(student_usage_count) as total_module_attempts,
  COUNT(DISTINCT instructor_id) as instructor_count
FROM quizzes
WHERE deleted_at IS NULL AND module_id IS NOT NULL
GROUP BY module_id;

-- View: Engagement by Difficulty
CREATE OR REPLACE VIEW vw_engagement_by_difficulty AS
SELECT
  difficulty_level,
  COUNT(*) as quiz_count,
  ROUND(AVG(student_usage_count)::NUMERIC, 0)::INTEGER as avg_usage,
  ROUND(AVG(average_time_minutes)::NUMERIC, 0)::INTEGER as avg_time_minutes,
  ROUND(AVG(average_score)::NUMERIC, 2) as avg_score,
  ROUND(AVG(pass_rate)::NUMERIC, 2) as avg_pass_rate,
  ROUND(AVG(engagement_score)::NUMERIC, 2) as avg_engagement_score
FROM quizzes
WHERE deleted_at IS NULL
GROUP BY difficulty_level
ORDER BY difficulty_level;

-- View: Unused Quizzes (created but never attempted)
CREATE OR REPLACE VIEW vw_unused_quizzes AS
SELECT
  id,
  title,
  quiz_code,
  difficulty_level,
  quiz_category,
  created_at,
  instructor_id
FROM quizzes
WHERE deleted_at IS NULL
  AND student_usage_count = 0
  AND instructor_usage_count = 0
ORDER BY created_at DESC;

-- View: Top Performing Quizzes
CREATE OR REPLACE VIEW vw_top_performing_quizzes AS
SELECT
  title,
  quiz_code,
  difficulty_level,
  average_score,
  pass_rate,
  student_usage_count,
  engagement_score,
  quality_rating,
  instructor_id
FROM quizzes
WHERE deleted_at IS NULL AND quiz_status = 'published'
ORDER BY
  COALESCE(quality_rating, 0) DESC,
  student_usage_count DESC
LIMIT 50;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT 'Reporting Fields Added' as check_type,
       column_name, data_type
FROM information_schema.columns
WHERE table_name = 'quizzes'
  AND column_name IN (
    'difficulty_level', 'average_score', 'pass_rate', 'average_time_minutes',
    'quiz_category', 'module_id', 'learning_objectives', 'tags',
    'quiz_status', 'version_number', 'is_public', 'requires_certificate',
    'unique_students_count', 'total_attempts_count', 'engagement_score',
    'quality_rating', 'language_code'
  )
ORDER BY column_name;

SELECT 'Reporting Indexes Created' as check_type,
       indexname
FROM pg_indexes
WHERE tablename = 'quizzes'
  AND indexname LIKE 'idx_quizzes_%'
ORDER BY indexname;

SELECT 'Reporting Views Created' as check_type,
       table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'VIEW'
  AND table_name LIKE 'vw_%'
ORDER BY table_name;

SELECT 'Analytics Functions Created' as check_type,
       routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_name LIKE '%calculate%' OR routine_name LIKE '%sync%')
ORDER BY routine_name;
