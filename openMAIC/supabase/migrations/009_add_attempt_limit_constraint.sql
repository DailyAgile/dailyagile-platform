-- Add database-level CHECK constraint for attemptLimit
-- Date: 2026-08-12

-- ============================================================================
-- ADD CHECK CONSTRAINT ON ATTEMPT_LIMIT
-- Ensures attemptLimit is always between 1 and 100 at database level
-- ============================================================================

ALTER TABLE public.quiz_assignments
  ADD CONSTRAINT check_attempt_limit_range
  CHECK (attempt_limit >= 1 AND attempt_limit <= 100);

-- ============================================================================
-- MIGRATION COMPLETE
-- Database now enforces attemptLimit constraints
-- ============================================================================
