# Database Index Strategy

**Date**: 2026-08-12  
**Purpose**: Optimize query performance for high-traffic quiz/grading operations  
**Scope**: All migrations 001-014

---

## Index Design Principles

1. **Selectivity**: Indexes on columns with high cardinality (many distinct values)
2. **Composite Indexes**: Multi-column indexes for common filter+sort patterns
3. **Partial Indexes**: Filter to active/non-deleted rows only (reduce size)
4. **Prefix Optimization**: Put most selective column first in composite indexes
5. **Sort Optimization**: Include sort column in composite index for skip-scan
6. **Coverage**: Try to include all needed columns to avoid table lookups (covering indexes)

---

## Critical Indexes by Use Case

### 1. STUDENT QUIZ SUBMISSIONS (High Volume)

**Use Case**: Student takes quiz, system needs to:
- Find active assignments for student
- Check attempt count
- Retrieve latest session
- Update response

```sql
-- Migration 007: Attempt tracking query
-- SELECT * FROM quiz_sessions 
-- WHERE assignment_id = ? AND student_id = ? AND status = 'completed'
-- ORDER BY started_at DESC
CREATE INDEX idx_quiz_sessions_assignment_student_status 
  ON public.quiz_sessions(assignment_id, student_id, status)
  WHERE status IN ('in_progress', 'completed');

-- Migration 006: Assignment lookup for student
-- SELECT * FROM quiz_assignments 
-- WHERE student_id = ? AND is_active = true AND expires_at > NOW()
CREATE INDEX idx_quiz_assignments_student_active 
  ON public.quiz_assignments(student_id, is_active)
  WHERE is_active = true AND expires_at > NOW();

-- Migration 007: Race condition prevention (FOR UPDATE locking)
-- get_next_attempt_number() function
-- Must find rows before locking - this index speeds up the SELECT FOR UPDATE
CREATE INDEX idx_quiz_sessions_for_locking 
  ON public.quiz_sessions(assignment_id, student_id)
  WHERE status IN ('completed', 'in_progress');

-- Migration 008: 2FA validation (FOR UPDATE locking)
-- validate_2fa_code() function
-- SELECT FOR UPDATE from pending_2fa_confirmations
CREATE INDEX idx_pending_2fa_for_validation 
  ON public.pending_2fa_confirmations(instructor_email, quiz_id, operation_type)
  WHERE is_used = FALSE;

```

**Rationale**:
- `assignment_id` first (filters by specific assignment)
- `student_id` second (filters by specific student within assignment)
- `status` third (most selective - only active/completed)
- Partial index: `WHERE is_active = true` reduces index size

---

### 2. QUIZ ASSIGNMENT DISCOVERY (Self-Paced Path)

**Use Case**: Student navigates to my-assignments page, needs to:
- List all assignments for this student
- Show remaining time to deadline
- Indicate if expired or completed

```sql
-- SELECT * FROM quiz_assignments 
-- WHERE student_id = ? AND is_active = true
-- ORDER BY expires_at ASC
CREATE INDEX idx_quiz_assignments_student_expires 
  ON public.quiz_assignments(student_id, is_active, expires_at)
  WHERE is_active = true;

-- Alternative: Assignment by code (shareable link)
-- SELECT * FROM quiz_assignments WHERE assignment_code = ?
CREATE INDEX idx_quiz_assignments_code 
  ON public.quiz_assignments(assignment_code)
  WHERE is_active = true;

```

**Rationale**:
- Composite includes sort column for efficient ORDER BY
- Partial index improves performance for non-archived assignments

---

### 3. INSTRUCTOR DASHBOARD (Analytics & Monitoring)

**Use Case**: Instructor opens dashboard to:
- See all quizzes they created
- See all students in each class
- Get class statistics

```sql
-- SELECT * FROM quizzes 
-- WHERE instructor_id = ? AND is_active = true AND deleted_at IS NULL
CREATE INDEX idx_quizzes_instructor_active 
  ON public.quizzes(instructor_id, is_active)
  WHERE is_active = true AND deleted_at IS NULL;

-- SELECT * FROM live_quiz_sessions 
-- WHERE classroom_id = ? AND status IN ('pending', 'live', 'paused')
-- ORDER BY started_at DESC
CREATE INDEX idx_live_quiz_sessions_classroom_active 
  ON public.live_quiz_sessions(classroom_id, status, started_at DESC)
  WHERE status IN ('pending', 'live', 'paused');

-- SELECT * FROM assignment_extension_requests 
-- WHERE status = 'pending' ORDER BY requested_at ASC
CREATE INDEX idx_extension_requests_pending 
  ON public.assignment_extension_requests(status, requested_at)
  WHERE status = 'pending';

```

---

### 4. QUIZ RESPONSE ANALYTICS

**Use Case**: Calculate class statistics:
- Which questions students struggle with
- Average score per question
- Time spent per question

```sql
-- SELECT COUNT(*), AVG(is_correct) FROM quiz_responses qr
-- JOIN quiz_questions qq ON qr.question_id = qq.id
-- WHERE qq.quiz_id = ? AND qr.session_id IN (...)
CREATE INDEX idx_quiz_responses_question 
  ON public.quiz_responses(question_id)
  INCLUDE (is_correct, time_taken_seconds);  -- covering index

-- SELECT * FROM quiz_sessions 
-- WHERE quiz_id = ? AND status = 'completed'
CREATE INDEX idx_quiz_sessions_quiz_completed 
  ON public.quiz_sessions(quiz_id, status)
  WHERE status = 'completed';

```

---

### 5. STUDENT ACTIVITY TRACKING (Real-Time)

**Use Case**: Live quiz leaderboard needs to:
- Rank students by current score
- Show last activity time
- Detect "stuck" students

```sql
-- SELECT * FROM live_quiz_participants 
-- WHERE session_id = ? 
-- ORDER BY current_score DESC
CREATE INDEX idx_live_participants_session_score 
  ON public.live_quiz_participants(session_id, current_score DESC);

-- SELECT * FROM live_quiz_participants 
-- WHERE session_id = ? AND last_activity < NOW() - INTERVAL '5 minutes'
CREATE INDEX idx_live_participants_inactive 
  ON public.live_quiz_participants(session_id, last_activity)
  WHERE status != 'completed';

```

---

### 6. AUDIT LOGGING (GDPR Compliance)

**Use Case**: Respond to data subject access request:
- Find all logs involving this student
- Export in chronological order

```sql
-- SELECT * FROM audit_logs_immutable 
-- WHERE data_subject_id = ? 
-- ORDER BY created_at DESC
CREATE INDEX idx_audit_logs_subject_time 
  ON public.audit_logs_immutable(data_subject_id, created_at DESC);

-- SELECT * FROM audit_logs_immutable 
-- WHERE actor_id = ? AND created_at > NOW() - INTERVAL '7 days'
-- ORDER BY created_at DESC
CREATE INDEX idx_audit_logs_actor_time 
  ON public.audit_logs_immutable(actor_id, created_at DESC);

-- SELECT * FROM audit_logs_immutable 
-- WHERE retention_until < NOW() AND retention_until IS NOT NULL
CREATE INDEX idx_audit_logs_cleanup 
  ON public.audit_logs_immutable(retention_until)
  WHERE retention_until IS NOT NULL;

```

---

### 7. GRADING & INSTRUCTOR REVIEW (Hybrid AI + Human)

**Use Case**: Instructor reviews submissions:
- Find ungraded answers
- Sort by time submitted
- Filter by status

```sql
-- SELECT * FROM quiz_answers 
-- WHERE grading_status IN ('ungraded', 'ai_graded') 
-- ORDER BY created_at ASC
CREATE INDEX idx_quiz_answers_grading_status 
  ON public.quiz_answers(grading_status, created_at)
  WHERE grading_status IN ('ungraded', 'ai_graded');

-- SELECT * FROM quiz_answers 
-- WHERE graded_by = ? AND reviewed_at > NOW() - INTERVAL '30 days'
CREATE INDEX idx_quiz_answers_graded_by_time 
  ON public.quiz_answers(graded_by, reviewed_at DESC)
  WHERE graded_by IS NOT NULL;

```

---

### 8. DUPLICATE DETECTION (Quiz Question Management)

**Use Case**: Prevent duplicate questions in quiz:
- Detect exact duplicates by MD5 hash
- Detect near-duplicates by normalized text

```sql
-- SELECT * FROM quiz_questions 
-- WHERE quiz_id = ? AND question_hash = ?
CREATE INDEX idx_quiz_questions_hash 
  ON public.quiz_questions(quiz_id, question_hash);

-- SELECT * FROM quiz_questions 
-- WHERE quiz_id = ? AND question_normalized = ?
CREATE INDEX idx_quiz_questions_normalized 
  ON public.quiz_questions(quiz_id, question_normalized);

```

---

### 9. BULK UPLOAD PROCESSING (Migration 013)

**Use Case**: Process instructor CSV upload:
- Find rows by status
- Identify validation errors
- Update created/updated instructor IDs

```sql
-- SELECT * FROM instructor_bulk_upload_rows 
-- WHERE upload_id = ? AND status = 'pending'
-- ORDER BY row_number ASC
CREATE INDEX idx_bulk_upload_rows_status 
  ON public.instructor_bulk_upload_rows(upload_id, status)
  WHERE status IN ('pending', 'processing');

-- SELECT * FROM instructor_bulk_uploads 
-- WHERE uploaded_by_user_id = ? AND status IN ('pending', 'processing')
CREATE INDEX idx_bulk_uploads_user_status 
  ON public.instructor_bulk_uploads(uploaded_by_user_id, status)
  WHERE status IN ('pending', 'processing', 'completed');

-- SELECT * FROM instructors WHERE email = ?
CREATE INDEX idx_instructors_email 
  ON public.instructors(email);

```

---

### 10. EMAIL VERIFICATION (Migration 005)

**Use Case**: Verify student email:
- Lookup by email
- Check verification status
- Find expired codes

```sql
-- SELECT * FROM students WHERE email = ? LIMIT 1
CREATE INDEX idx_students_email_verified 
  ON public.students(LOWER(email), email_verified)
  WHERE email_verified = FALSE;

-- SELECT * FROM students 
-- WHERE verification_code = ? AND verification_code_expires_at > NOW()
CREATE INDEX idx_students_verification_code 
  ON public.students(verification_code)
  WHERE verification_code_expires_at > NOW();

```

---

## Summary of All Indexes

### By Migration

**Migration 001-004** (Original):
```sql
-- Students
idx_students_email
idx_students_student_id

-- Classrooms
idx_classrooms_instructor
idx_classrooms_access_code

-- Rosters
idx_rosters_classroom
idx_rosters_classroom_status
idx_rosters_student
idx_rosters_enrollment

-- Submissions
idx_submissions_classroom
idx_submissions_student
idx_submissions_classroom_student
idx_submissions_classroom_submitted
idx_submissions_status
idx_submissions_scene

-- Quiz Core
idx_quizzes_classroom_id
idx_quizzes_instructor_id
idx_quiz_questions_quiz_id
idx_quiz_sessions_quiz_id
idx_quiz_sessions_student_id
idx_quiz_sessions_classroom_id
idx_quiz_responses_session_id
idx_quiz_responses_question_id

-- Audit
idx_audit_classroom
idx_audit_actor
idx_audit_resource
idx_audit_created
```

**Migration 005**:
```sql
-- Students (auth integration)
idx_students_email
idx_students_email_verified

-- Student quiz history
idx_student_quiz_history_student_id
idx_student_quiz_history_quiz_id
idx_student_quiz_history_attempted_at

-- Student progress
idx_student_progress_student_id
```

**Migration 006** (Assignments):
```sql
-- Quiz assignments
idx_assignments_code
idx_assignments_student
idx_assignments_quiz
idx_assignments_expires
idx_assignments_instructor
idx_assignments_active

-- Quiz snapshots
idx_snapshots_assignment
idx_snapshots_original_quiz
idx_snapshots_hash

-- Quiz sessions
idx_sessions_snapshot
idx_sessions_assignment

-- Extension requests
idx_requests_assignment
idx_requests_student
idx_requests_status
idx_requests_pending

-- Quiz questions (duplicate detection)
idx_questions_normalized
idx_questions_hash
```

**Migration 007** (Attempt Tracking):
```sql
-- Quiz sessions (attempt tracking)
idx_sessions_attempt
idx_sessions_student_email
idx_sessions_ip

-- Quiz assignments
idx_assignments_status

-- Quiz versions
idx_versions_quiz
idx_versions_changed_by

-- Attempt resets
idx_resets_student
idx_resets_assignment
idx_resets_reset_by

-- Quiz responses (attempt)
idx_responses_attempt
```

**Migration 008** (2FA):
```sql
-- Pending 2FA confirmations
idx_pending_2fa_email_quiz
idx_pending_2fa_expires_at
idx_pending_2fa_code
```

**Migration 011** (Race Condition Fixes):
```sql
-- For locking efficiency
idx_quiz_sessions_assignment_student  -- WHERE status != 'completed'
idx_pending_2fa_not_used  -- WHERE is_used = FALSE
```

**Migration 012** (Multi-Tenant):
```sql
-- Organizations
idx_organizations_slug
idx_organizations_billing_tier
idx_organizations_subscription_status

-- Teams
idx_teams_organization
idx_teams_archived

-- Organization members
idx_org_members_organization
idx_org_members_user
idx_org_members_email
idx_org_members_role

-- Feature flags
idx_feature_flags_organization
idx_feature_flags_key

-- White label
idx_white_label_organization

-- LMS integration
idx_lms_org
idx_lms_type

-- Webhook logs
idx_webhook_logs_organization
idx_webhook_logs_event
idx_webhook_logs_delivered
idx_webhook_logs_created

-- Billing
idx_billing_organization
idx_billing_status
idx_billing_created
```

**Migration 013** (Bulk Upload):
```sql
-- Instructors
idx_instructors_email
idx_instructors_auth_user_id
idx_instructors_is_active
idx_instructors_verified
idx_instructors_first_name
idx_instructors_last_name

-- Bulk uploads
idx_bulk_uploads_status
idx_bulk_uploads_uploaded_by
idx_bulk_uploads_created

-- Upload rows
idx_bulk_upload_rows_upload
idx_bulk_upload_rows_status
idx_bulk_upload_rows_instructor
```

**Migration 014** (Audit Logging):
```sql
-- Audit logs (immutable, append-only)
idx_audit_logs_actor
idx_audit_logs_actor_email
idx_audit_logs_organization
idx_audit_logs_classroom
idx_audit_logs_resource
idx_audit_logs_action
idx_audit_logs_created
idx_audit_logs_data_subject
idx_audit_logs_retention
```

---

## Performance Tuning Checklist

### Before Production Deployment

- [ ] Run `ANALYZE` on all tables to update statistics
- [ ] Check for missing foreign key indexes (PostgreSQL doesn't auto-create)
- [ ] Verify composite indexes match common WHERE + ORDER BY patterns
- [ ] Test index selectivity: `SELECT * FROM pg_stat_user_indexes;`
- [ ] Monitor slow queries: `log_min_duration_statement = 1000` (1 second)
- [ ] Set up auto-VACUUM: `autovacuum = on`, `autovacuum_naptime = 30s`
- [ ] Consider partial indexes for soft-deleted or archived rows

### Ongoing Monitoring

```sql
-- Find slow queries
SELECT query, calls, mean_time, max_time 
FROM pg_stat_statements 
WHERE mean_time > 100 
ORDER BY mean_time DESC;

-- Find unused indexes (bloat)
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find missing indexes (unused sequential scans)
SELECT schemaname, tablename, seq_scan, seq_tup_read 
FROM pg_stat_user_tables 
WHERE seq_scan > 1000 
  AND seq_tup_read > 1000000 
ORDER BY seq_tup_read DESC;

-- Check index size
SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid)) AS size 
FROM pg_stat_user_indexes 
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Migration-by-Migration Index Changes

| Migration | Indexes Added | Rationale |
|-----------|--------------|-----------|
| 001 | 12 core indexes | Foundation for classrooms, students, quizzes |
| 002 | 2 auth indexes | Support email verification flow |
| 003 | 3 live session indexes | Real-time leaderboard lookups |
| 004 | 7 quiz content indexes | Support quiz question/response queries |
| 006 | 12 assignment indexes | Self-paced delivery system |
| 007 | 6 attempt tracking indexes | Support attempt counting + analytics |
| 008 | 3 2FA indexes | Fast code validation + cleanup |
| 011 | 2 locking-specific indexes | Support FOR UPDATE queries |
| 012 | 15+ multi-tenant indexes | Future tenant isolation |
| 013 | 6 bulk upload indexes | CSV processing performance |
| 014 | 9 audit indexes | GDPR access + retention queries |
| **Total** | **~80 indexes** | Covers all critical paths |

---

## Index Maintenance Schedule

**Weekly**:
- Monitor slow query logs
- Check for bloated indexes

**Monthly**:
- ANALYZE all tables
- Review unused indexes (delete if not used in 30 days)
- Check index fragmentation (pg_tblspc)

**Quarterly**:
- REINDEX on maintenance window
- Review composite index strategies
- Profile high-volume operations

---

**Generated**: 2026-08-12  
**Schema Version**: 1.0 (Migrations 001-014)
