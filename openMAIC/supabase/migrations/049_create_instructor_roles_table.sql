/**
 * Migration 049: Instructor Roles Table
 * Enables instructors to assign admin/viewer roles to other instructors on their quizzes
 * Date: 2026-08-27
 */

CREATE TABLE instructor_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'viewer')),
  assigned_by UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure each instructor has only one role per quiz
  UNIQUE(quiz_id, instructor_id)
);

-- Indexes for common queries
CREATE INDEX idx_instructor_roles_quiz_id ON instructor_roles(quiz_id);
CREATE INDEX idx_instructor_roles_instructor_id ON instructor_roles(instructor_id);
CREATE INDEX idx_instructor_roles_role ON instructor_roles(role);

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_instructor_roles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_instructor_roles_update_timestamp
  BEFORE UPDATE ON instructor_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_instructor_roles_timestamp();

-- RLS: Instructors can read roles for their own quizzes
ALTER TABLE instructor_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors can read roles for their quizzes" ON instructor_roles
  FOR SELECT USING (
    quiz_id IN (
      SELECT id FROM quizzes
      WHERE instructor_id = auth.uid()
    )
    OR instructor_id = auth.uid()
  );

CREATE POLICY "Instructors can manage roles for their quizzes" ON instructor_roles
  FOR INSERT WITH CHECK (
    quiz_id IN (
      SELECT id FROM quizzes
      WHERE instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can update roles for their quizzes" ON instructor_roles
  FOR UPDATE USING (
    quiz_id IN (
      SELECT id FROM quizzes
      WHERE instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can delete roles for their quizzes" ON instructor_roles
  FOR DELETE USING (
    quiz_id IN (
      SELECT id FROM quizzes
      WHERE instructor_id = auth.uid()
    )
  );
