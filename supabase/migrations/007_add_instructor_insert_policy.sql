-- Add INSERT Policy for Instructors Table
-- File: 007_add_instructor_insert_policy.sql
-- Purpose: Allow service role to create new instructor accounts during signup
-- Date: 2026-08-15
--
-- Context: The instructors table had SELECT and UPDATE policies via auth.uid()
-- but was missing INSERT policy. Service role needs to create new accounts.

CREATE POLICY "service_role_insert_instructors"
  ON instructors
  FOR INSERT
  WITH CHECK (true);

-- ==================== MIGRATION SUMMARY ====================
-- Policies added: 1
-- Tables fixed: 1 (instructors)
-- Status: Signup flow can now create new instructor records
