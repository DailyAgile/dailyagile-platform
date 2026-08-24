-- Migration 018: Add Numeric Quiz Codes
-- Adds an 8-digit numeric quiz code for easy sharing
-- Date: 2026-08-13

-- Add quiz_code column to quizzes table
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS quiz_code INTEGER UNIQUE NOT NULL DEFAULT 10000000;

-- Create index on quiz_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_quizzes_quiz_code ON quizzes(quiz_code);

-- Function to generate unique 8-digit numeric quiz code
CREATE OR REPLACE FUNCTION generate_unique_quiz_code()
RETURNS INTEGER AS $$
DECLARE
  new_code INTEGER;
  max_attempts INTEGER := 100;
  attempt INTEGER := 0;
BEGIN
  -- Generate random 8-digit number (10000000 to 99999999)
  LOOP
    new_code := 10000000 + floor(random() * 90000000)::integer;

    -- Check if code is unique
    IF NOT EXISTS (SELECT 1 FROM quizzes WHERE quiz_code = new_code) THEN
      RETURN new_code;
    END IF;

    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique quiz code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update existing quizzes with unique codes if they don't have one
-- This preserves existing quiz UUIDs as internal IDs
UPDATE quizzes
SET quiz_code = generate_unique_quiz_code()
WHERE quiz_code = 10000000;

-- Add constraint to ensure quiz_code is always set
ALTER TABLE quizzes
  ADD CONSTRAINT check_quiz_code_valid
  CHECK (quiz_code >= 10000000 AND quiz_code <= 99999999);
