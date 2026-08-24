/**
 * Create Instructors Profile Table
 * Extends Supabase auth.users with instructor-specific profile data
 * Uses Supabase Auth for authentication (built-in magic links, passwords, etc.)
 */

CREATE TABLE instructors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'instructor', -- 'instructor' or 'admin'
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for queries
CREATE INDEX idx_instructors_email ON instructors(email);
CREATE INDEX idx_instructors_role ON instructors(role);

-- Enable RLS (Row Level Security)
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;

-- Policy: Instructors can read their own profile
CREATE POLICY "Instructors can read own profile" ON instructors
  FOR SELECT USING (auth.uid() = id);

-- Policy: Instructors can update their own profile
CREATE POLICY "Instructors can update own profile" ON instructors
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create instructor profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_instructor()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO instructors (id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email, '', '')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_instructor();
