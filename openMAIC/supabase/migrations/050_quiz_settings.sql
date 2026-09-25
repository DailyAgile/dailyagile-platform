-- Migration 050: Normalize Quiz Settings to Individual Columns
-- Converts settings JSONB to individual columns for easier querying and management
-- Maintains backward compatibility with existing JSONB column
-- Date: 2026-08-28

-- ============================================================================
-- ADD SETTINGS COLUMNS TO QUIZZES TABLE
-- ============================================================================

ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER,
ADD COLUMN IF NOT EXISTS allow_retakes BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_retakes INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS passing_score_percentage INTEGER DEFAULT 70,
ADD COLUMN IF NOT EXISTS show_answers_after_submit BOOLEAN DEFAULT true;

-- ============================================================================
-- ADD CONSTRAINTS FOR VALIDATION
-- ============================================================================

-- Constraint for time_limit_minutes: 0-120 minutes (or NULL for no limit)
ALTER TABLE quizzes
ADD CONSTRAINT check_time_limit_minutes
CHECK (time_limit_minutes IS NULL OR (time_limit_minutes >= 0 AND time_limit_minutes <= 120));

-- Constraint for passing_score_percentage: 0-100
ALTER TABLE quizzes
ADD CONSTRAINT check_passing_score_percentage
CHECK (passing_score_percentage >= 0 AND passing_score_percentage <= 100);

-- Constraint for max_retakes: 0-20
ALTER TABLE quizzes
ADD CONSTRAINT check_max_retakes
CHECK (max_retakes >= 0 AND max_retakes <= 20);

-- ============================================================================
-- MIGRATE EXISTING DATA FROM JSONB SETTINGS TO NEW COLUMNS
-- ============================================================================

-- Update from existing JSONB settings column
UPDATE quizzes
SET
  show_answers_after_submit = COALESCE((settings->>'show_answers_after_submit')::boolean, true),
  allow_retakes = CASE
    WHEN (settings->>'allow_retakes')::integer > 0 THEN true
    ELSE false
  END,
  max_retakes = COALESCE((settings->>'allow_retakes')::integer, 3),
  passing_score_percentage = COALESCE((settings->>'passing_score')::integer, 70)
WHERE settings IS NOT NULL;

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quizzes_allow_retakes ON quizzes(allow_retakes);
CREATE INDEX IF NOT EXISTS idx_quizzes_passing_score ON quizzes(passing_score_percentage);
CREATE INDEX IF NOT EXISTS idx_quizzes_time_limit ON quizzes(time_limit_minutes);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT 'Quiz Settings Columns Added' as check_type,
       column_name, data_type
FROM information_schema.columns
WHERE table_name = 'quizzes'
  AND column_name IN (
    'time_limit_minutes', 'allow_retakes', 'max_retakes',
    'passing_score_percentage', 'show_answers_after_submit'
  )
ORDER BY column_name;

SELECT 'Quiz Settings Indexes Created' as check_type,
       indexname
FROM pg_indexes
WHERE tablename = 'quizzes'
  AND indexname LIKE 'idx_quizzes_%'
  AND indexname IN ('idx_quizzes_allow_retakes', 'idx_quizzes_passing_score', 'idx_quizzes_time_limit')
ORDER BY indexname;
