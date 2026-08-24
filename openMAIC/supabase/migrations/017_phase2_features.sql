-- Phase 2: Certificates, Analytics, Leaderboards

-- Certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  quiz_id TEXT NOT NULL,
  certificate_id TEXT UNIQUE NOT NULL,
  score INTEGER NOT NULL,
  student_name TEXT NOT NULL,
  quiz_title TEXT NOT NULL,
  completion_date DATE NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz engagement tracking
CREATE TABLE IF NOT EXISTS quiz_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  quiz_id TEXT NOT NULL,
  time_spent_minutes INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  tracked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics summary (cached)
CREATE TABLE IF NOT EXISTS analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  quiz_id TEXT,
  total_attempts INTEGER DEFAULT 0,
  completed_attempts INTEGER DEFAULT 0,
  average_score NUMERIC DEFAULT 0,
  completion_rate NUMERIC DEFAULT 0,
  total_time_spent_minutes INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, quiz_id)
);

-- Indexes
CREATE INDEX idx_certificates_student ON certificates(student_id);
CREATE INDEX idx_certificates_quiz ON certificates(quiz_id);
CREATE INDEX idx_certificates_date ON certificates(issued_at);
CREATE INDEX idx_engagement_student ON quiz_engagement(student_id);
CREATE INDEX idx_engagement_quiz ON quiz_engagement(quiz_id);
CREATE INDEX idx_analytics_student ON analytics_summary(student_id);

-- Row-level security
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "students_view_own_certificates"
  ON certificates FOR SELECT
  USING (auth.uid()::text = student_id::text OR auth.role() = 'authenticated');

CREATE POLICY "students_view_own_engagement"
  ON quiz_engagement FOR SELECT
  USING (auth.uid()::text = student_id::text OR auth.role() = 'authenticated');

CREATE POLICY "students_view_own_analytics"
  ON analytics_summary FOR SELECT
  USING (auth.uid()::text = student_id::text OR auth.role() = 'authenticated');
