/**
 * ILT Platform: Sessions Table
 * Specific course delivery instances with dates and pricing
 * Migration: 048_create_ilt_sessions_table.sql
 */

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('in-person', 'virtual', 'hybrid')),
  schedule TEXT, -- e.g., "Monday & Wednesday, 6-8pm"
  times JSONB DEFAULT '[]', -- Array of specific time slots
  regular_price DECIMAL(10, 2),
  sale_price DECIMAL(10, 2),
  available_seats INTEGER DEFAULT 30,
  enrolled_count INTEGER DEFAULT 0,
  is_open BOOLEAN DEFAULT TRUE,
  location TEXT, -- For in-person sessions
  meeting_link TEXT, -- For virtual sessions (Zoom, Teams, etc.)
  capacity INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_sessions_course ON sessions(course_id);
CREATE INDEX idx_sessions_start_date ON sessions(start_date);
CREATE INDEX idx_sessions_open ON sessions(is_open);
CREATE INDEX idx_sessions_date_range ON sessions(start_date, end_date);

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sessions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sessions_update_timestamp
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_sessions_timestamp();

-- Trigger: Ensure end_date > start_date
CREATE OR REPLACE FUNCTION validate_session_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'end_date must be after start_date';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sessions_validate_dates
  BEFORE INSERT OR UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION validate_session_dates();

-- RLS: Everyone can read open sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read open sessions" ON sessions
  FOR SELECT USING (is_open = TRUE);
