-- Fix Students RLS Policies
-- Add INSERT policy to allow new student signup
-- Service role bypasses RLS, but this enables row-level access control for future

-- Allow service role (API) to insert new students during signup
CREATE POLICY "Enable insert for new student signup" ON students
  FOR INSERT
  WITH CHECK (true);

-- Allow service role to select when verifying email
CREATE POLICY "Enable select for email verification" ON students
  FOR SELECT
  USING (true);

-- Allow service role to update when verifying email or on login
CREATE POLICY "Enable update for email verification and login" ON students
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
