/**
 * Migration 021: Add publish status columns to quizzes
 * Adds is_published and published_at columns to track quiz publication status
 * Date: 2026-08-14
 */

-- Add publish status columns to quizzes table
ALTER TABLE quizzes
  ADD COLUMN is_published BOOLEAN DEFAULT FALSE,
  ADD COLUMN published_at TIMESTAMPTZ;

-- Create index for faster queries on published quizzes
CREATE INDEX idx_quizzes_is_published ON quizzes(is_published);
