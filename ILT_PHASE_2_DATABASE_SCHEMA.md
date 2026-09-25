# Phase 2 ILT - Database Schema & Operations Guide

**Last Updated:** August 6, 2026  
**Version:** 2.0 (includes Quiz Submissions)  
**Audience:** Database administrators, backend engineers, platform operations

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Core Tables](#core-tables)
3. [Quiz Feature Tables](#quiz-feature-tables)
4. [RLS Policies](#rls-policies)
5. [Indexes & Performance](#indexes--performance)
6. [Common Queries](#common-queries)
7. [Data Integrity](#data-integrity)
8. [Soft Deletes & Recovery](#soft-deletes--recovery)

---

## Overview

The Phase 2 ILT database uses PostgreSQL (via Supabase) with Row-Level Security (RLS) for access control. All sensitive data is protected by RLS policies that enforce instructor-student access boundaries.

**Core Principles:**
- All mutations are logged to `audit_logs` for compliance
- Soft deletes via `status` column instead of hard deletes
- Timestamps (`created_at`, `updated_at`) track all changes
- JSON fields (`metadata`) store flexible data without schema changes

**Key Assumptions:**
- Supabase PostgreSQL 14+
- Auth users matched to instructor/student accounts
- All API requests include auth headers
- Migrations run before application starts

---

## Core Tables

### 1. classrooms

**Purpose:** Container for a learning experience. An instructor owns a classroom and students are enrolled.

```sql
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  access_code TEXT UNIQUE,  -- Students use to join
  max_students INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,  -- Custom instructor settings
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_classrooms_instructor_id ON classrooms(instructor_id);
CREATE INDEX idx_classrooms_access_code ON classrooms(access_code);
```

**Key Fields:**
- `access_code`: Used for student enrollment, should be unique per classroom
- `settings`: Stores instructor preferences (quiz time limits, retake rules, etc.)
- `stage_id`: Links to course/stage for hierarchical organization

**Status:** Always `is_active=true` for enrollments; no soft delete.

---

### 2. students

**Purpose:** Student profile. Tracks user data for all students across platform.

```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  student_id TEXT UNIQUE,  -- Institution ID (e.g., "STU-001")
  avatar_url TEXT,
  date_of_birth DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_student_id ON students(student_id);
```

**Key Fields:**
- `auth_user_id`: Links to Supabase auth user (1:1 relationship)
- `student_id`: External system ID, unique per institution
- `metadata`: Custom fields (institution, cohort, demographics)

**Status:** No soft delete; students exist globally.

---

### 3. student_rosters

**Purpose:** Junction table for classroom enrollment. Tracks when a student is added to a classroom.

```sql
CREATE TABLE student_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'student',  -- 'student' | 'teaching_assistant' | 'guest'
  enrollment_date TIMESTAMP DEFAULT now(),
  status TEXT DEFAULT 'active',  -- 'active' | 'dropped' | 'unenrolled'
  metadata JSONB DEFAULT '{}'::jsonb,  -- Enrollment-specific data
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(classroom_id, student_id)  -- One enrollment per classroom
);

CREATE INDEX idx_student_rosters_classroom_id ON student_rosters(classroom_id);
CREATE INDEX idx_student_rosters_student_id ON student_rosters(student_id);
CREATE INDEX idx_student_rosters_status ON student_rosters(status);
```

**Status Values:**
- `active`: Student is enrolled and can participate
- `dropped`: Student left; can rejoin (soft delete)
- `unenrolled`: Administratively removed (soft delete)

**Key Queries:**
```sql
-- Get active students in classroom
SELECT sr.*, s.name, s.email 
FROM student_rosters sr
JOIN students s ON sr.student_id = s.id
WHERE sr.classroom_id = $1 AND sr.status = 'active'
ORDER BY s.name;

-- Get all enrollments for student (across classrooms)
SELECT sr.*, c.title
FROM student_rosters sr
JOIN classrooms c ON sr.classroom_id = c.id
WHERE sr.student_id = $1 AND sr.status = 'active';
```

---

### 4. instructor_sessions

**Purpose:** Track when an instructor is monitoring their class (for live stats, quiz locking, etc.).

```sql
CREATE TABLE instructor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES auth.users(id),
  session_start TIMESTAMP DEFAULT now(),
  session_end TIMESTAMP,
  session_type TEXT DEFAULT 'monitoring',  -- 'monitoring' | 'live_quiz' | 'presentation'
  quiz_being_monitored UUID,  -- If session_type = 'live_quiz'
  student_visibility TEXT DEFAULT 'all',  -- 'all' | 'selected' | 'none'
  is_quiz_locked BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_instructor_sessions_classroom_id ON instructor_sessions(classroom_id);
CREATE INDEX idx_instructor_sessions_active ON instructor_sessions(session_end) 
  WHERE session_end IS NULL;
```

**Key Fields:**
- `session_end`: NULL means session is active; filled on end
- `quiz_being_monitored`: ID of quiz being actively proctored
- `is_quiz_locked`: If true, students cannot submit answers

---

### 5. audit_logs

**Purpose:** Compliance and debugging. Records all sensitive actions.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,  -- 'student_added', 'student_removed', 'quiz_submitted', etc.
  resource_type TEXT NOT NULL,  -- 'student', 'quiz_submission', 'classroom', etc.
  resource_id UUID,
  details JSONB,  -- Extra context (old_status, new_status, error_msg, etc.)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_audit_logs_classroom_id ON audit_logs(classroom_id);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

**Standard Actions:**
- `student_added` - Instructor added student to roster
- `student_removed` - Student soft-deleted from roster
- `quiz_submitted` - Student submitted quiz answers
- `quiz_graded` - System completed grading
- `roster_viewed` - Instructor viewed roster (optional, privacy-sensitive)
- `bulk_import_started` - CSV import initiated
- `bulk_import_completed` - CSV import finished

**Retention:** Keep indefinitely for compliance (GDPR requires 7-year audit trail in some jurisdictions).

---

## Quiz Feature Tables

### 6. quiz_questions

**Purpose:** Define questions for a quiz. Part of quiz content.

```sql
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,  -- Order in quiz (1, 2, 3, ...)
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,  -- 'multiple_choice' | 'short_answer' | 'essay' | 'true_false'
  difficulty TEXT DEFAULT 'medium',  -- 'easy' | 'medium' | 'hard'
  points_max INTEGER DEFAULT 1,
  options JSONB,  -- For MC: [{ id, text }, ...], for others: null
  correct_answer TEXT,  -- MC: "option_id", True/False: "true"/"false"
  explanation TEXT,  -- Shown to students after grading
  metadata JSONB,  -- Custom fields for extensions
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_number ON quiz_questions(quiz_id, question_number);
```

**Example: Multiple Choice**
```json
{
  "question_text": "What is machine learning?",
  "question_type": "multiple_choice",
  "points_max": 5,
  "options": [
    { "id": "a", "text": "A subset of AI" },
    { "id": "b", "text": "Same as AI" },
    { "id": "c", "text": "A programming language" }
  ],
  "correct_answer": "a",
  "explanation": "ML is indeed a subset of AI that focuses on learning from data."
}
```

**Example: Short Answer**
```json
{
  "question_text": "Explain prompt engineering in one sentence.",
  "question_type": "short_answer",
  "points_max": 10,
  "options": null,
  "correct_answer": null,  # Graded by Claude
  "explanation": "See feedback from AI grader below."
}
```

---

### 7. quiz_submissions

**Purpose:** One per student attempt at a quiz. Tracks overall score and status.

```sql
CREATE TABLE quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'in_progress',  -- 'in_progress' | 'submitted' | 'graded'
  score INTEGER,  -- NULL until graded
  max_score INTEGER,
  percentage INTEGER,  -- NULL until graded
  submitted_at TIMESTAMP,  -- NULL until student submits
  graded_at TIMESTAMP,  # NULL until grading complete
  time_spent_seconds INTEGER,
  graded_by_user_id UUID REFERENCES auth.users(id),  -- Who/what graded
  grading_notes TEXT,  -- Any grader comments
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_quiz_submissions_classroom_id ON quiz_submissions(classroom_id);
CREATE INDEX idx_quiz_submissions_student_id ON quiz_submissions(student_id);
CREATE INDEX idx_quiz_submissions_quiz_id ON quiz_submissions(quiz_id);
CREATE INDEX idx_quiz_submissions_status ON quiz_submissions(status);
CREATE INDEX idx_quiz_submissions_created_at ON quiz_submissions(created_at DESC);
CREATE INDEX idx_quiz_submissions_composite ON quiz_submissions(classroom_id, status, submitted_at);
```

**Status Lifecycle:**
```
START: in_progress (student begins quiz)
  ↓
STUDENT SUBMITS: submitted (answers locked, grading begins)
  ↓
GRADING COMPLETE: graded (score calculated)
```

**Key Constraints:**
- One active `in_progress` submission per student per quiz (enforce in app)
- `score` and `percentage` must be NULL if status != 'graded'
- `submitted_at` must be NULL if status = 'in_progress'
- `graded_at` must be NULL if status != 'graded'

**Common Patterns:**
```sql
-- Get all submissions for classroom, sorted by submission time
SELECT * FROM quiz_submissions
WHERE classroom_id = $1 AND status = 'graded'
ORDER BY submitted_at DESC;

-- Get average score for a quiz
SELECT 
  quiz_id,
  COUNT(*) as submissions,
  AVG(percentage) as avg_score,
  MIN(percentage) as min_score,
  MAX(percentage) as max_score
FROM quiz_submissions
WHERE classroom_id = $1 AND status = 'graded'
GROUP BY quiz_id;

-- Find students who haven't submitted yet
SELECT sr.student_id, s.name
FROM student_rosters sr
JOIN students s ON sr.student_id = s.id
LEFT JOIN quiz_submissions qs ON 
  qs.student_id = sr.student_id 
  AND qs.quiz_id = $1
WHERE sr.classroom_id = $2 
  AND qs.id IS NULL  -- No submission found
  AND sr.status = 'active';
```

---

### 8. quiz_answers

**Purpose:** Individual answer to one question in a submission. Supports grading and feedback.

```sql
CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES quiz_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id),
  question_text TEXT NOT NULL,  -- Denormalized for audit trail
  student_answer TEXT NOT NULL,
  correct_answer TEXT,  -- Denormalized from quiz_questions
  is_correct BOOLEAN,  -- NULL until graded
  points_earned INTEGER,  -- NULL until graded
  max_points INTEGER NOT NULL,
  feedback TEXT,  -- AI-generated explanation for wrong answers
  question_type TEXT NOT NULL,  -- Denormalized for context
  grading_time_ms INTEGER,  -- How long Claude took to grade
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_quiz_answers_submission_id ON quiz_answers(submission_id);
CREATE INDEX idx_quiz_answers_question_id ON quiz_answers(question_id);
```

**Grading Fields:**
- `is_correct`: true/false, NULL before grading
- `points_earned`: 0-max_points, NULL before grading
- `feedback`: "You said X, but the correct answer is Y because..."

**Example Row:**
```
submission_id: sub-123
question_id: q-456
question_text: "What is AI?"
student_answer: "It's when computers think"
correct_answer: "Narrow AI simulates human intelligence"
is_correct: false
points_earned: 2
max_points: 5
feedback: "Close! But AI doesn't actually 'think' — it's sophisticated pattern matching..."
question_type: "short_answer"
created_at: 2026-08-06T10:45:00Z
```

---

### 9. quiz_submission_status_history

**Purpose:** Audit trail for submission state changes. Compliance and debugging.

```sql
CREATE TABLE quiz_submission_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES quiz_submissions(id) ON DELETE CASCADE,
  old_status TEXT,  -- NULL if first transition from in_progress
  new_status TEXT NOT NULL,
  changed_by_user_id UUID REFERENCES auth.users(id),
  changed_by_system TEXT,  -- 'claude_grader', 'manual_override', etc.
  reason TEXT,  -- Why did status change? (e.g., "student clicked submit")
  metadata JSONB,  -- Extra context (e.g., {error: "Claude API timeout"})
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_submission_status_history_submission_id 
  ON quiz_submission_status_history(submission_id);
```

**Example Flow:**
```
1. in_progress → submitted (reason: "student clicked submit", changed_by_user_id: student-123)
2. submitted → graded (reason: "Claude grading completed", changed_by_system: "claude_grader")
```

---

## RLS Policies

### Classroom Access

```sql
-- Instructors can see/modify their own classrooms
CREATE POLICY "Instructors see own classrooms" ON classrooms
  FOR ALL USING (instructor_id = auth.uid());

-- Students can see classrooms they're enrolled in
CREATE POLICY "Students see enrolled classrooms" ON classrooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_rosters sr
      WHERE sr.classroom_id = classrooms.id
        AND sr.student_id = (SELECT id FROM students WHERE auth_user_id = auth.uid())
        AND sr.status = 'active'
    )
  );
```

### Student Roster Access

```sql
-- Instructors can see/manage rosters for their classrooms
CREATE POLICY "Instructors manage rosters" ON student_rosters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = student_rosters.classroom_id
        AND c.instructor_id = auth.uid()
    )
  );

-- Students can see roster (read-only) for classrooms they're in
CREATE POLICY "Students see roster" ON student_rosters
  FOR SELECT USING (
    (student_id = (SELECT id FROM students WHERE auth_user_id = auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = student_rosters.classroom_id
        AND c.instructor_id = auth.uid()
    )
  );
```

### Quiz Submission Access

```sql
-- Students can see/create submissions in their classrooms
CREATE POLICY "Students access own submissions" ON quiz_submissions
  FOR ALL USING (
    student_id = (SELECT id FROM students WHERE auth_user_id = auth.uid())
  );

-- Instructors can see submissions from their classrooms
CREATE POLICY "Instructors see class submissions" ON quiz_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = quiz_submissions.classroom_id
        AND c.instructor_id = auth.uid()
    )
  );
```

### Quiz Answers Access

```sql
-- Inherits submission access via submission_id
-- Students see own answers only
CREATE POLICY "Students see own answers" ON quiz_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_submissions qs
      WHERE qs.id = quiz_answers.submission_id
        AND (
          qs.student_id = (SELECT id FROM students WHERE auth_user_id = auth.uid())
          OR
          EXISTS (
            SELECT 1 FROM classrooms c
            WHERE c.id = qs.classroom_id
              AND c.instructor_id = auth.uid()
          )
        )
    )
  );
```

### Audit Logs Access

```sql
-- Instructors see logs for their classrooms
CREATE POLICY "Instructors see class audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = audit_logs.classroom_id
        AND c.instructor_id = auth.uid()
    )
  );

-- System can write logs (via service role)
CREATE POLICY "System writes audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);
```

**Testing RLS:**
```sql
-- As student, can I see another student's submission?
SELECT * FROM quiz_submissions 
WHERE student_id != (SELECT id FROM students WHERE auth_user_id = auth.uid());
-- Should return: 0 rows (RLS blocks)

-- As instructor, can I see my classroom submissions?
SELECT * FROM quiz_submissions 
WHERE classroom_id IN (SELECT id FROM classrooms WHERE instructor_id = auth.uid());
-- Should return: All submissions from my classrooms
```

---

## Indexes & Performance

### Key Indexes (Mandatory)

```sql
-- Student roster queries
CREATE INDEX idx_student_rosters_classroom_id ON student_rosters(classroom_id);
CREATE INDEX idx_student_rosters_student_id ON student_rosters(student_id);
CREATE INDEX idx_student_rosters_status ON student_rosters(status);

-- Quiz submission queries
CREATE INDEX idx_quiz_submissions_classroom_id ON quiz_submissions(classroom_id);
CREATE INDEX idx_quiz_submissions_student_id ON quiz_submissions(student_id);
CREATE INDEX idx_quiz_submissions_status ON quiz_submissions(status);

-- Audit trail queries
CREATE INDEX idx_audit_logs_classroom_id ON audit_logs(classroom_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

### Composite Indexes (Performance)

```sql
-- Common filter: "Get graded submissions for classroom, sorted by date"
CREATE INDEX idx_quiz_submissions_class_status_date 
  ON quiz_submissions(classroom_id, status, submitted_at DESC)
  WHERE status = 'graded';

-- Common filter: "Get student's quiz history"
CREATE INDEX idx_quiz_submissions_student_status
  ON quiz_submissions(student_id, status);
```

### Performance Targets

| Query | Target Latency | Notes |
|-------|---|---|
| List 50 students in roster | <100ms | paginated, indexed on classroom_id |
| Get student's submission history | <100ms | indexed on student_id + status |
| Get class quiz stats | <500ms | aggregation, may need caching |
| Add student to roster | <100ms | insert + audit log |
| Grade quiz (Claude) | 2-5 seconds | async, Claude API latency |

---

## Common Queries

### Roster Management

```sql
-- Get active students in classroom with count
SELECT 
  sr.id,
  sr.classroom_id,
  s.name,
  s.email,
  sr.enrollment_date,
  COUNT(qs.id) as quiz_count,
  AVG(qs.percentage) as avg_score
FROM student_rosters sr
JOIN students s ON sr.student_id = s.id
LEFT JOIN quiz_submissions qs ON sr.student_id = qs.student_id 
  AND qs.classroom_id = sr.classroom_id
  AND qs.status = 'graded'
WHERE sr.classroom_id = $1 
  AND sr.status = 'active'
GROUP BY sr.id, sr.classroom_id, s.name, s.email, sr.enrollment_date
ORDER BY s.name
LIMIT $2 OFFSET $3;

-- Search students by email or name
SELECT sr.*, s.* 
FROM student_rosters sr
JOIN students s ON sr.student_id = s.id
WHERE sr.classroom_id = $1
  AND sr.status = 'active'
  AND (
    s.email ILIKE $2 || '%'
    OR s.name ILIKE $2 || '%'
  )
ORDER BY s.name;
```

### Quiz Analytics

```sql
-- Classroom quiz statistics
SELECT 
  qs.quiz_id,
  COUNT(*) as total_attempts,
  COUNT(DISTINCT qs.student_id) as unique_students,
  AVG(qs.percentage) as avg_score,
  STDDEV(qs.percentage) as std_dev,
  MIN(qs.percentage) as min_score,
  MAX(qs.percentage) as max_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY qs.percentage) as median_score,
  ROUND(AVG(qs.time_spent_seconds)::numeric / 60, 2) as avg_time_minutes
FROM quiz_submissions qs
WHERE qs.classroom_id = $1
  AND qs.status = 'graded'
GROUP BY qs.quiz_id;

-- Student performance across quizzes
SELECT 
  sr.id,
  s.name,
  COUNT(qs.id) as quizzes_taken,
  COUNT(CASE WHEN qs.percentage >= 70 THEN 1 END) as passed,
  ROUND(AVG(qs.percentage)::numeric, 2) as avg_score,
  MAX(qs.submitted_at) as last_quiz_date
FROM student_rosters sr
JOIN students s ON sr.student_id = s.id
LEFT JOIN quiz_submissions qs ON sr.student_id = qs.student_id 
  AND qs.classroom_id = sr.classroom_id
  AND qs.status = 'graded'
WHERE sr.classroom_id = $1 
  AND sr.status = 'active'
GROUP BY sr.id, s.name
ORDER BY avg_score DESC;
```

### Audit & Debugging

```sql
-- Recent actions in classroom
SELECT 
  action,
  COUNT(*) as count,
  created_at
FROM audit_logs
WHERE classroom_id = $1
GROUP BY action, DATE(created_at)
ORDER BY created_at DESC
LIMIT 100;

-- Find if student was manually added or bulk-imported
SELECT * FROM audit_logs
WHERE classroom_id = $1
  AND action LIKE 'student_%'
  AND resource_id = (SELECT id FROM students WHERE email = $2)
ORDER BY created_at DESC;

-- Check grading timeline for a submission
SELECT * FROM quiz_submission_status_history
WHERE submission_id = $1
ORDER BY created_at;
```

---

## Data Integrity

### Constraints & Triggers

```sql
-- Prevent duplicate enrollments
ALTER TABLE student_rosters
  ADD CONSTRAINT unique_classroom_student 
  UNIQUE(classroom_id, student_id);

-- Auto-update updated_at timestamp
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_classrooms_updated_at
  BEFORE UPDATE ON classrooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Similar triggers for: students, student_rosters, quiz_submissions
```

### Data Validation (App-side)

```typescript
// Email validation
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Student ID validation (adjust pattern per institution)
const isValidStudentId = (id: string) => /^[A-Z0-9\-]{5,20}$/.test(id);

// Quiz score validation
const isValidScore = (score: number, maxScore: number) => 
  score >= 0 && score <= maxScore && Number.isInteger(score);
```

---

## Soft Deletes & Recovery

### Soft Delete Pattern

Instead of `DELETE`:

```sql
-- To soft-delete a student from classroom
UPDATE student_rosters
SET status = 'dropped', updated_at = now()
WHERE id = $1;

-- To soft-delete a submission (don't grade it)
UPDATE quiz_submissions
SET status = 'deleted', updated_at = now()
WHERE id = $1;
```

### Recovery Queries

```sql
-- Find all dropped students (can re-enroll)
SELECT sr.*, s.name, s.email
FROM student_rosters sr
JOIN students s ON sr.student_id = s.id
WHERE sr.classroom_id = $1 
  AND sr.status IN ('dropped', 'unenrolled')
ORDER BY sr.updated_at DESC;

-- Re-activate a dropped student
UPDATE student_rosters
SET status = 'active', updated_at = now()
WHERE id = $1;

-- Restore deleted submission (for audit)
SELECT * FROM quiz_submissions
WHERE status = 'deleted'
  AND student_id = $1
ORDER BY updated_at DESC;
```

### Backup & Restore Strategy

**Daily Backups (Supabase):**
- Supabase automatically backs up every 24 hours
- Point-in-time recovery available (check retention policy)
- Location: Supabase Dashboard → Backups

**Manual Recovery Example:**
```bash
# 1. Check backup status
supabase db backup list

# 2. If needed, restore from backup
supabase db restore --backup-id your-backup-id

# 3. Verify data integrity
# Run critical queries to ensure data looks good
```

---

## Compliance & Security

### GDPR Compliance

**Data Retention:**
- Audit logs: 7 years minimum (per regulations)
- Student data: Delete on request (except audit logs)
- Quiz submissions: Keep until student graduates + 1 year

**Data Export:**
```sql
-- Generate GDPR data export for student
SELECT * FROM students WHERE id = $1;
SELECT * FROM student_rosters WHERE student_id = $1;
SELECT * FROM quiz_submissions WHERE student_id = $1;
SELECT * FROM quiz_answers WHERE submission_id IN (
  SELECT id FROM quiz_submissions WHERE student_id = $1
);
```

### Security Best Practices

- All queries use parameterized statements (avoid SQL injection)
- RLS policies enforce access control
- No PII in log messages (no emails in error responses)
- Audit logging mandatory for all mutations
- Service role key never exposed to client

---

## Troubleshooting

### "Permission denied" on query

**Cause:** RLS policy blocking access

**Debug:**
```sql
-- Check which policies exist
SELECT * FROM pg_policies WHERE tablename = 'quiz_submissions';

-- Test as specific user
SET ROLE auth.uid_here;
SELECT * FROM quiz_submissions;
RESET ROLE;
```

**Solution:**
- Verify user is enrolled in classroom
- Check auth token is valid and not expired
- Review RLS policies in schema

### Slow queries (>1 second)

**Debug:**
```sql
-- Explain query plan
EXPLAIN ANALYZE
SELECT * FROM quiz_submissions 
WHERE classroom_id = $1 
  AND status = 'graded'
ORDER BY submitted_at DESC;

-- Look for "Seq Scan" (bad) vs "Index Scan" (good)
```

**Solution:**
- Add missing index on classroom_id + status
- Add LIMIT clause if fetching large result sets
- Check query is not doing N+1 lookups

### Out of disk space

**Check usage:**
```sql
SELECT sum(total_bytes) as total_used
FROM pg_tablespace_usage();
```

**Clean up:**
```sql
-- Delete old audit logs (keep 1 year)
DELETE FROM audit_logs
WHERE created_at < now() - interval '1 year';

-- Vacuum to reclaim space
VACUUM ANALYZE;
```

---

## Migration Checklist

Before deploying new schema changes:

- [ ] Migration file created and tested locally
- [ ] Backward compatibility verified (no breaking changes)
- [ ] RLS policies created for new tables
- [ ] Indexes created for foreign keys
- [ ] Triggers for timestamps added
- [ ] Rollback procedure documented
- [ ] Data migration script tested (if needed)
- [ ] Deployment window scheduled (off-peak)

---

**Schema Owner:** Database Team  
**Last Reviewed:** August 6, 2026  
**Next Review:** September 1, 2026

For questions or schema changes, contact the database team via #database Slack channel.
