/**
 * Migration 022: Gamification & Spaced Repetition System
 * Adds badge system, streak tracking, points, and SM-2 spaced repetition
 * Date: 2026-08-15
 */

-- ============================================================================
-- 1. BADGE TYPES ENUM TABLE
-- Define all badge types and metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.badge_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_url TEXT,
  unlock_criteria JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert badge types
INSERT INTO public.badge_types (id, name, description, unlock_criteria) VALUES
  ('first_quiz', 'First Quiz', 'Earned on first quiz attempt', '{"type": "first_attempt"}'),
  ('speed_runner', 'Speed Runner', 'Complete a quiz in less than 2 minutes', '{"type": "time_spent", "max_seconds": 120}'),
  ('accuracy_master', 'Accuracy Master', 'Score 95% or higher on any quiz', '{"type": "score", "min_percentage": 95}'),
  ('streaker', 'Streaker', 'Maintain a 7-day streak', '{"type": "streak", "min_days": 7}'),
  ('consistent_learner', 'Consistent Learner', 'Score 70% or higher on 5 consecutive quizzes', '{"type": "consecutive_passes", "count": 5, "min_percentage": 70}'),
  ('expert_badger', 'Expert Badger', 'Pass quizzes in 3 different industries', '{"type": "industries", "count": 3}'),
  ('night_owl', 'Night Owl', 'Complete quiz between 10 PM and 6 AM', '{"type": "time_of_day", "start_hour": 22, "end_hour": 6}'),
  ('week_warrior', 'Week Warrior', 'Complete 7 or more quizzes in a single week', '{"type": "weekly_volume", "min_count": 7}'),
  ('comeback_kid', 'Comeback Kid', 'Score 90% or higher after scoring below 50% on same quiz', '{"type": "score_improvement", "previous_max": 50, "new_min": 90}'),
  ('perfect_score', 'Perfect Score', 'Score 100% on any quiz', '{"type": "score", "min_percentage": 100}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. STUDENT BADGES TABLE
-- Track which badges each student has earned
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badge_types(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  quiz_session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(student_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_student_badges_student_id ON public.student_badges(student_id);
CREATE INDEX IF NOT EXISTS idx_student_badges_badge_id ON public.student_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_student_badges_awarded_at ON public.student_badges(awarded_at);

-- ============================================================================
-- 3. STUDENT STREAKS TABLE
-- Track consecutive quiz completion streaks per quiz
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_quiz_date DATE NOT NULL,
  user_timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(student_id, quiz_id)
);

CREATE INDEX IF NOT EXISTS idx_streaks_student_id ON public.student_streaks(student_id);
CREATE INDEX IF NOT EXISTS idx_streaks_quiz_id ON public.student_streaks(quiz_id);
CREATE INDEX IF NOT EXISTS idx_streaks_current_streak ON public.student_streaks(current_streak);

-- ============================================================================
-- 4. STUDENT POINTS TABLE
-- Track total points, monthly points, and leaderboard ranking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  points_this_month INTEGER DEFAULT 0,
  points_this_week INTEGER DEFAULT 0,
  global_rank INTEGER,
  industry_rank INTEGER,
  last_point_awarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_points_student_id ON public.student_points(student_id);
CREATE INDEX IF NOT EXISTS idx_student_points_total_points ON public.student_points(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_student_points_global_rank ON public.student_points(global_rank);

-- ============================================================================
-- 5. POINT AWARDS LOG TABLE
-- Audit trail for all point awards (for analytics and troubleshooting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.point_awards_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  quiz_session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  points_awarded INTEGER NOT NULL,
  base_points INTEGER NOT NULL,
  speed_bonus INTEGER DEFAULT 0,
  accuracy_bonus INTEGER DEFAULT 0,
  industry_multiplier NUMERIC DEFAULT 1.0,
  score_percentage INTEGER NOT NULL,
  time_spent_seconds INTEGER NOT NULL,
  industry TEXT,
  awarded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_awards_student_id ON public.point_awards_log(student_id);
CREATE INDEX IF NOT EXISTS idx_point_awards_session_id ON public.point_awards_log(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_point_awards_awarded_at ON public.point_awards_log(awarded_at);

-- ============================================================================
-- 6. SPACED REPETITION SCHEDULES TABLE
-- Implement SM-2 algorithm scheduling for each quiz
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spaced_repetition_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,

  -- SM-2 Algorithm State
  interval_days INTEGER DEFAULT 0,
  ease_factor NUMERIC DEFAULT 2.5, -- Starts at 2.5, minimum 1.3
  reps INTEGER DEFAULT 0,

  -- Scheduling
  next_recommended_date DATE NOT NULL,
  status TEXT DEFAULT 'new', -- new, learning, review, graduated

  -- History
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(student_id, quiz_id)
);

CREATE INDEX IF NOT EXISTS idx_spaced_rep_student_id ON public.spaced_repetition_schedules(student_id);
CREATE INDEX IF NOT EXISTS idx_spaced_rep_quiz_id ON public.spaced_repetition_schedules(quiz_id);
CREATE INDEX IF NOT EXISTS idx_spaced_rep_next_date ON public.spaced_repetition_schedules(next_recommended_date);
CREATE INDEX IF NOT EXISTS idx_spaced_rep_status ON public.spaced_repetition_schedules(status);

-- ============================================================================
-- 7. SPACED REPETITION HISTORY TABLE
-- Audit trail for SM-2 algorithm adjustments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spaced_repetition_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  quiz_session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,

  -- Quality rating (0-5)
  quality INTEGER NOT NULL CHECK (quality >= 0 AND quality <= 5),
  score_percentage INTEGER NOT NULL,

  -- SM-2 State Before
  interval_before INTEGER,
  ease_before NUMERIC,
  reps_before INTEGER,

  -- SM-2 State After
  interval_after INTEGER NOT NULL,
  ease_after NUMERIC NOT NULL,
  reps_after INTEGER NOT NULL,
  next_review_date DATE NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spaced_history_student_id ON public.spaced_repetition_history(student_id);
CREATE INDEX IF NOT EXISTS idx_spaced_history_quiz_id ON public.spaced_repetition_history(quiz_id);
CREATE INDEX IF NOT EXISTS idx_spaced_history_quality ON public.spaced_repetition_history(quality);

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_awards_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaced_repetition_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaced_repetition_history ENABLE ROW LEVEL SECURITY;

-- Students can view their own badges
CREATE POLICY "Students can view own badges" ON public.student_badges
  FOR SELECT USING (auth.uid()::text = student_id::text);

-- Students can view their own streaks
CREATE POLICY "Students can view own streaks" ON public.student_streaks
  FOR SELECT USING (auth.uid()::text = student_id::text);

-- Students can view their own points
CREATE POLICY "Students can view own points" ON public.student_points
  FOR SELECT USING (auth.uid()::text = student_id::text);

-- Service role can manage all (for API operations)
CREATE POLICY "Service role can manage badges" ON public.student_badges
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage streaks" ON public.student_streaks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage points" ON public.student_points
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage point awards" ON public.point_awards_log
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage spaced rep" ON public.spaced_repetition_schedules
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage spaced rep history" ON public.spaced_repetition_history
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- MIGRATION COMPLETE
-- Gamification and spaced repetition tables ready for use
-- ============================================================================
