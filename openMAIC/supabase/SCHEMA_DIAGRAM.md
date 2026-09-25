# DailyAgile Database Schema Diagram (ERD)

**Last Updated**: 2026-08-12  
**Version**: Phase 1 + Fixes (Migrations 001-014)  
**Scope**: ILT + Self-Paced Quiz System + Audit Logging

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CORE ENTITIES                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐        ┌──────────────┐        ┌──────────────┐     │
│  │ auth.users   │        │ classrooms   │        │ instructors  │     │
│  │ (Supabase)   │        │              │        │              │     │
│  ├──────────────┤        ├──────────────┤        ├──────────────┤     │
│  │ id (PK)      │<───┐   │ id (PK)      │<───┐   │ id (PK)      │     │
│  │ email        │    │   │ instructor_id├─┐  │   │ auth_user_id │     │
│  │ ...          │    └───┤ (FK→users)   │ │  └───┤ (FK→users)   │     │
│  └──────────────┘        │ stage_id     │ │      │ email        │     │
│                          │ title        │ │      │ first_name   │     │
│                          │ access_code  │ │      │ last_name    │     │
│                          │ settings     │ │      │ cell_number  │     │
│                          │ created_at   │ │      │ location     │     │
│                          │ is_active    │ │      │ courses_... │     │
│                          └──────────────┘ │      └──────────────┘     │
│                                         │                               │
│  ┌──────────────────────────────────────┘                              │
│  │                                                                      │
│  │  ┌────────────────┐                                                │
│  │  │ students       │                                                │
│  │  ├────────────────┤                                                │
│  │  │ id (PK)        │                                                │
│  │  │ email (UQ)     │                                                │
│  │  │ first_name     │ ◄── Migration 010: Added missing columns       │
│  │  │ last_name      │                                                │
│  │  │ password_hash  │                                                │
│  │  │ auth_user_id   │ ─┐                                             │
│  │  │ email_verified │  └──► (FK to auth.users)                       │
│  │  │ verified_at    │                                                │
│  │  │ is_active      │                                                │
│  │  │ is_verified    │ ◄── Deprecated, use email_verified             │
│  │  │ created_at     │                                                │
│  │  │ updated_at     │                                                │
│  │  └────────────────┘                                                │
│  │           │                                                         │
│  └───────────┼─────────────────────────────────────────────────────┘  │
│              │                                                         │
└──────────────┼─────────────────────────────────────────────────────────┘
               │
               │ Enrollment & Progress
               │
       ┌───────▼────────┬─────────────┬──────────────┐
       │                │             │              │
    ┌──▼─────────────┐  │  ┌─────────▼───────┐  ┌───▼─────────────┐
    │student_rosters │  │  │student_profiles │  │student_progress │
    ├────────────────┤  │  ├─────────────────┤  ├─────────────────┤
    │id (PK)         │  │  │id (PK)          │  │id (PK)          │
    │classroom_id────┤──┘  │student_id (UQ)──┐  │student_id (UQ)──┐
    │student_id──────┤─┐   │avatar_url       │  │total_quizzes    │
    │role            │ │   │bio              │  │average_score    │
    │enrollment_date │ │   │preferences      │  │streak_days      │
    │status          │ │   │created_at       │  │last_attempt_at  │
    │UNIQUE(c,s)     │ │   └─────────────────┘  └─────────────────┘
    └────────────────┘ │
                       │ (FK to students.id)
                       │
    ┌──────────────────┴────────────────────────┬──────────────────────┐
    │                                           │                      │
    │                                           │                      │
    ▼                                           ▼                      ▼
┌──────────────────┐                 ┌──────────────────┐   ┌──────────────┐
│ student_quiz_    │                 │ quiz_statistics  │   │ verification │
│ history          │                 │                  │   │ _attempts    │
├──────────────────┤                 ├──────────────────┤   ├──────────────┤
│id (PK)           │                 │id (PK)           │   │id (PK)       │
│student_id (FK)   │                 │quiz_id (UQ/FK)   │   │email         │
│quiz_id (FK)      │                 │total_attempts    │   │ip            │
│score             │                 │average_score     │   │created_at    │
│percentage        │                 │pass_rate         │   │              │
│time_taken_seconds│                 │difficulty_level  │   │ (for OTP     │
│attempted_at      │                 │updated_at        │   │  rate limit) │
│passed            │                 └──────────────────┘   └──────────────┘
│answers (JSONB)   │
└──────────────────┘
```

---

## Quiz System Schema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         QUIZ MANAGEMENT                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐                                                  │
│  │ quizzes          │                                                  │
│  ├──────────────────┤                                                  │
│  │ id (PK)          │                                                  │
│  │ classroom_id (FK)├─┐                                               │
│  │ instructor_id(FK)├─┐                                               │
│  │ title            │ │                                               │
│  │ description      │ │                                               │
│  │ total_questions  │ │                                               │
│  │ total_points     │ │                                               │
│  │ settings (JSONB) │ │                                               │
│  │ is_active        │ │                                               │
│  │ deleted_at       │ │ ◄── Migration 006: Soft delete               │
│  │ created_at       │ │                                               │
│  │ updated_at       │ │                                               │
│  └──────────────────┘ │                                               │
│           │           │                                               │
│           └─┬─────────┘                                               │
│             │                                                         │
│  ┌──────────▼──────────┐                                              │
│  │ quiz_questions      │                                              │
│  ├─────────────────────┤                                              │
│  │ id (PK)             │                                              │
│  │ quiz_id (FK)        │                                              │
│  │ question_number     │ ◄── Per-quiz unique question ID              │
│  │ question            │                                              │
│  │ question_normalized │ ◄── Migration 006: For duplicate detection   │
│  │ question_hash (MD5) │                                              │
│  │ option_a/b/c/d/e    │ ◄── 5 multiple-choice options                │
│  │ correct_answer      │                                              │
│  │ explanation         │                                              │
│  │ source_link         │                                              │
│  │ timer_seconds       │                                              │
│  │ points              │                                              │
│  │ created_at          │                                              │
│  │ UNIQUE(quiz, qnum)  │                                              │
│  └─────────────────────┘                                              │
│           │                                                            │
│           │                                                            │
└───────────┼────────────────────────────────────────────────────────────┘
            │
            │ Question being answered
            │
     ┌──────▼────────────────────────────────────────────────┐
     │                                                        │
     │  ┌──────────────────────┐      ┌──────────────────┐  │
     │  │ quiz_sessions        │      │ quiz_responses   │  │
     │  ├──────────────────────┤      ├──────────────────┤  │
     │  │ id (PK)              │      │ id (PK)          │  │
     │  │ quiz_id (FK)         │      │ session_id (FK)  │  │
     │  │ student_id (FK)      │      │ question_id (FK) │  │
     │  │ classroom_id         │      │ selected_answer  │  │
     │  │ started_at           │      │ is_correct       │  │
     │  │ submitted_at         │      │ time_taken_sec   │  │
     │  │ score                │      │ submitted_at     │  │
     │  │ percentage           │      │ attempt_number   │  │
     │  │ status               │      │ response_order   │  │
     │  │ attempt_number       │◄─────┤ time_on_question │  │
     │  │ time_spent_seconds   │      │ UNIQUE(s,q)      │  │
     │  │ ip_address           │      └──────────────────┘  │
     │  │ student_email        │          ▲                 │
     │  │ student_name         │          │                 │
     │  │ quiz_snapshot_id (FK)├─────────┴─ Migration 006:  │
     │  │ UNIQUE(q,s,start)    │          Links to snapshot │
     │  └──────────────────────┘                            │
     │                                                       │
     └───────────────────────────────────────────────────────┘
```

---

## Quiz Assignment System (Self-Paced Delivery)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   ASSIGNMENT & VERSIONING                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────┐      ┌───────────────────┐                │
│  │ quiz_assignments       │      │ quiz_snapshots    │                │
│  ├────────────────────────┤      ├───────────────────┤                │
│  │ id (PK)                │      │ id (PK)           │                │
│  │ quiz_id (FK)           │      │ original_quiz_id  │                │
│  │ instructor_id (TEXT)   │      │ assignment_id(UQ) │                │
│  │ student_id (FK)        │      │ quiz_definition   │                │
│  │ assignment_code (UQ)   │ ─┐   │ snapshot_hash     │                │
│  │ assignment_url         │  │   │ created_at        │                │
│  │ expires_at (CHECK>now) │  └──►│ (Frozen copy of   │                │
│  │ status                 │      │  quiz at time of  │                │
│  │ is_active              │      │  assignment)      │                │
│  │ attempt_limit          │      │                   │                │
│  │ created_at             │      │ ◄── Migration 006: │                │
│  │ updated_at             │      │ Preserves quiz    │                │
│  │ CHECK(attempt_limit    │      │ history after     │                │
│  │   BETWEEN 1-100)       │      │ hard delete       │                │
│  │ UNIQUE(quiz, student)  │      │                   │                │
│  └────────────────────────┘      └───────────────────┘                │
│           │                                                            │
│           │                                                            │
│  ┌────────▼─────────────────────────────────────────┐                │
│  │ assignment_extension_requests                     │                │
│  ├───────────────────────────────────────────────────┤                │
│  │ id (PK)                                           │                │
│  │ assignment_id (FK)                                │                │
│  │ student_id (FK)                                   │                │
│  │ request_type: 'extension' | 'new_code'           │                │
│  │ requested_at                                      │                │
│  │ status: pending, approved, denied                │                │
│  │ instructor_response                              │                │
│  │ approved_by (email)                              │                │
│  │ approved_at                                       │                │
│  │ new_expiry_date (if extension)                   │                │
│  │ new_assignment_id (if new_code)                  │                │
│  └───────────────────────────────────────────────────┘                │
│                                                                         │
│  ┌────────────────────────┐                                            │
│  │ quiz_versions          │ ◄── Migration 007:                        │
│  ├────────────────────────┤      Version history for audit            │
│  │ id (PK)                │                                            │
│  │ quiz_id (FK)           │                                            │
│  │ version_number         │                                            │
│  │ title                  │                                            │
│  │ total_questions        │                                            │
│  │ total_points           │                                            │
│  │ settings (JSONB)       │                                            │
│  │ changed_by             │                                            │
│  │ changed_at             │                                            │
│  │ change_description     │                                            │
│  │ UNIQUE(quiz, version)  │                                            │
│  └────────────────────────┘                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Attempt Tracking & Analytics

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ATTEMPT & ANALYTICS                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────┐                                          │
│  │ quiz_attempt_resets      │ ◄── Migration 007:                      │
│  ├──────────────────────────┤      Instructor reset audit trail       │
│  │ id (PK)                  │                                          │
│  │ quiz_session_id (FK)     │                                          │
│  │ student_id (FK)          │                                          │
│  │ assignment_id (FK)       │                                          │
│  │ reset_by (email)         │                                          │
│  │ reason                   │                                          │
│  │ reset_at                 │                                          │
│  └──────────────────────────┘                                          │
│                                                                         │
│  ┌──────────────────────────┐                                          │
│  │ quiz_audit_log           │                                          │
│  ├──────────────────────────┤                                          │
│  │ id (PK)                  │                                          │
│  │ quiz_id (FK)             │                                          │
│  │ action                   │                                          │
│  │ instructor_id (FK)       │                                          │
│  │ details (JSONB)          │                                          │
│  │ created_at               │                                          │
│  └──────────────────────────┘                                          │
│                                                                         │
│  VIEWS (for quick analytics):                                          │
│  ┌──────────────────────────┐      ┌──────────────────────────┐       │
│  │ quiz_statistics          │      │ student_quiz_progress    │       │
│  ├──────────────────────────┤      ├──────────────────────────┤       │
│  │ quiz_id                  │      │ student_id               │       │
│  │ total_attempts           │      │ email                    │       │
│  │ completed_attempts       │      │ quiz_id                  │       │
│  │ avg_percentage           │      │ title                    │       │
│  │ max_percentage           │      │ session_id               │       │
│  │ min_percentage           │      │ status                   │       │
│  └──────────────────────────┘      │ score, percentage        │       │
│                                    │ started_at, submitted_at │       │
│                                    │ answered_count           │       │
│                                    │ correct_count            │       │
│                                    │ total_questions          │       │
│                                    └──────────────────────────┘       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2FA & Security

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    2FA & SECURITY OPERATIONS                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────┐                               │
│  │ pending_2fa_confirmations          │ ◄── Migration 008:            │
│  ├────────────────────────────────────┤      For hard_delete ops      │
│  │ id (PK)                            │                               │
│  │ instructor_email                   │                               │
│  │ quiz_id (FK)                       │                               │
│  │ quiz_title                         │                               │
│  │ operation_type: 'hard_delete',...  │                               │
│  │ two_fa_code (6-digit)              │                               │
│  │ created_at                         │                               │
│  │ expires_at (10 minutes)            │                               │
│  │ used_at                            │                               │
│  │ failed_attempts                    │                               │
│  │ is_used                            │                               │
│  │ INDEX on (email, quiz, op, code)   │                               │
│  └────────────────────────────────────┘                               │
│                                                                         │
│  FUNCTIONS (Migration 008):                                            │
│  • create_pending_2fa_confirmation()  ─ Generate 6-digit code         │
│  • validate_2fa_code() ◄─── Migration 011: Added FOR UPDATE locking   │
│                                                                         │
│  FUNCTIONS (Migration 011):                                            │
│  • approveExtension() ─ Atomic extension approval                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Live Quiz Sessions (Instructor-Led)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      LIVE QUIZ SESSIONS (ILT)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────┐                                        │
│  │ live_quiz_sessions         │                                        │
│  ├────────────────────────────┤                                        │
│  │ id (PK)                    │                                        │
│  │ classroom_id (FK)          │                                        │
│  │ quiz_scene_id              │                                        │
│  │ instructor_id (FK)         │                                        │
│  │ status                     │                                        │
│  │ current_question_id        │                                        │
│  │ current_question_index     │                                        │
│  │ is_question_locked         │                                        │
│  │ show_leaderboard           │                                        │
│  │ started_at, ended_at       │                                        │
│  │ created_at, updated_at     │                                        │
│  │ INDEX on (classroom, status)                                        │
│  └────────────────────────────┘                                        │
│           │                                                             │
│  ┌────────┴─────────┬──────────────────────┐                          │
│  │                  │                      │                          │
│  ▼                  ▼                      ▼                          │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│ │live_quiz_        │  │live_quiz_        │  │live_leaderboard  │     │
│ │participants      │  │responses         │  │_visible_to_      │     │
│ ├──────────────────┤  ├──────────────────┤  │students (VIEW)   │     │
│ │id (PK)           │  │id (PK)           │  ├──────────────────┤     │
│ │session_id (FK)   │  │session_id (FK)   │  │session_id        │     │
│ │student_id (FK)   │  │student_id (FK)   │  │rank              │     │
│ │status            │  │question_id       │  │score             │     │
│ │current_score     │  │answer            │  │questions_answered│     │
│ │questions_answered│  │is_correct        │  │status            │     │
│ │last_activity     │  │response_time_ms  │  │                  │     │
│ │created_at        │  │submitted_at      │  │(NO PII exposed)  │     │
│ │UNIQUE(s,student) │  │is_visible_to_    │  │                  │     │
│ │                  │  │others            │  │                  │     │
│ │ ◄── Real-time    │  │UNIQUE(s,student  │  │ ◄── Aggregated   │     │
│ │   progress       │  │,question)        │  │    non-PII view  │     │
│ │   tracking       │  │                  │  │    only          │     │
│ │                  │  │ ◄── CRITICAL RLS:│  │                  │     │
│ │                  │  │ Students see     │  │                  │     │
│ │                  │  │ only own answers │  │                  │     │
│ │                  │  │ until revealed   │  │                  │     │
│ └──────────────────┘  └──────────────────┘  └──────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Grading & Instructor Operations

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    HYBRID GRADING SYSTEM (AI + Instructor)              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────────┐                           │
│  │ quiz_answers (Extended in 002)         │                           │
│  ├────────────────────────────────────────┤                           │
│  │ id (PK)                                │                           │
│  │ submission_id (FK)                     │                           │
│  │ question_id                            │                           │
│  │ user_answer                            │                           │
│  │ correct_answer                         │                           │
│  │ is_correct (computed)                  │                           │
│  │ points_earned                          │                           │
│  │ max_points                             │                           │
│  │ feedback (original)                    │                           │
│  │ question_type (extended in 002)        │                           │
│  │ ────── Grading Columns (002) ──────    │                           │
│  │ grading_status                         │                           │
│  │ ai_score                               │                           │
│  │ ai_feedback                            │                           │
│  │ ai_graded_at                           │                           │
│  │ instructor_score (override)            │                           │
│  │ instructor_feedback                    │                           │
│  │ graded_by (FK→users)                   │                           │
│  │ reviewed_at                            │                           │
│  │ is_instructor_graded                   │                           │
│  │ effective_score (GENERATED: inst>ai>   │                           │
│  │                 points_earned)         │                           │
│  └────────────────────────────────────────┘                           │
│                                                                         │
│  FLOW:                                                                  │
│  1. Student submits answer → points_earned                            │
│  2. AI grades (if enabled) → ai_score + ai_feedback                   │
│  3. Instructor can override → instructor_score (requires graded_by)   │
│  4. effective_score = MAX(instructor_score, ai_score, points_earned)  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Audit & Compliance

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    GDPR AUDIT LOGGING (Migration 014)                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────┐                             │
│  │ audit_logs_immutable                 │                             │
│  ├──────────────────────────────────────┤                             │
│  │ id (PK)                              │ ◄── INSERT ONLY            │
│  │ actor_id (FK→users)                  │ ◄── No UPDATE/DELETE      │
│  │ actor_email                          │     (RLS enforced)        │
│  │ actor_ip_address (INET)              │                             │
│  │ actor_user_agent                     │                             │
│  │ organization_id (FK)                 │                             │
│  │ classroom_id (FK)                    │                             │
│  │ action (CHECK: create, update, ...   │                             │
│  │         login, verify, approve, ...)  │                             │
│  │ resource_type (CHECK: student, course│                             │
│  │                quiz, grade, ...)     │                             │
│  │ resource_id                          │                             │
│  │ resource_name                        │                             │
│  │ changes (JSONB: {before, after})     │                             │
│  │ details (JSONB)                      │                             │
│  │ status: success, denied, error       │                             │
│  │ error_message                        │                             │
│  │ created_at (IMMUTABLE)               │                             │
│  │ data_subject_id (for GDPR access)    │                             │
│  │ retention_until (for GDPR deletion)  │                             │
│  │ ┌────────────────────────────────┐   │                             │
│  │ │ INDEX Strategy (see separate   │   │                             │
│  │ │ INDEX_STRATEGY.md)             │   │                             │
│  │ └────────────────────────────────┘   │                             │
│  │                                      │                             │
│  │ FUNCTIONS:                           │                             │
│  │ • log_audit_event()                  │                             │
│  │ • audit_log_trigger_function()       │                             │
│  │ • get_data_subject_access_logs()     │                             │
│  │ • mark_data_for_deletion()           │                             │
│  │ • cleanup_expired_audit_logs()       │                             │
│  │                                      │                             │
│  │ TRIGGERS on:                         │                             │
│  │ • students (INSERT/UPDATE/DELETE)    │                             │
│  │ • quizzes (INSERT/UPDATE/DELETE)     │                             │
│  │ • quiz_responses (INSERT/UPDATE)     │                             │
│  │ • quiz_sessions (INSERT/UPDATE)      │                             │
│  └──────────────────────────────────────┘                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Tenant Schema (Migration 012 - FUTURE USE)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 MULTI-TENANT FOUNDATION (Migration 012)                 │
├─────────────────────────────────────────────────────────────────────────┤
│                    (Designed but NOT integrated yet)                    │
│                                                                         │
│  ┌──────────────────────┐                                              │
│  │ organizations        │                                              │
│  ├──────────────────────┤                                              │
│  │ id (PK)              │                                              │
│  │ name                 │                                              │
│  │ slug (UQ)            │                                              │
│  │ billing_tier         │                                              │
│  │ subscription_status  │                                              │
│  │ max_students         │                                              │
│  │ max_instructors      │                                              │
│  │ settings (JSONB)     │                                              │
│  │ created_at           │                                              │
│  └──────────────────────┘                                              │
│           │                                                             │
│  ┌────────┴──────────┬──────────────────────────────────────┐          │
│  │                   │                                      │          │
│  ▼                   ▼                                      ▼          │
│ ┌──────────────────┐  ┌──────────────────────┐  ┌──────────────────┐ │
│ │ organization_    │  │ teams                │  │ feature_flags    │ │
│ │ members          │  ├──────────────────────┤  ├──────────────────┤ │
│ ├──────────────────┤  │ id (PK)              │  │ id (PK)          │ │
│ │ id (PK)          │  │ organization_id (FK) │  │ organization_id  │ │
│ │ organization_id  │  │ name                 │  │ flag_name        │ │
│ │ user_id (FK)     │  │ type                 │  │ flag_key         │ │
│ │ email            │  │ max_members          │  │ is_enabled       │ │
│ │ role             │  │ is_archived          │  │ rollout_percent  │ │
│ │ permissions (*)  │  │ created_at           │  │ config (JSONB)   │ │
│ │ status           │  │ updated_at           │  └──────────────────┘ │
│ │ UNIQUE(org, user)│  └──────────────────────┘                        │
│ └──────────────────┘                                                   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │ white_label_settings                                        │      │
│  ├─────────────────────────────────────────────────────────────┤      │
│  │ id (PK)                                                     │      │
│  │ organization_id (UQ/FK)                                     │      │
│  │ logo_url, favicon_url                                       │      │
│  │ primary_color, secondary_color                              │      │
│  │ custom_domain, custom_css                                   │      │
│  │ hide_dailyagile_branding                                    │      │
│  └─────────────────────────────────────────────────────────────┘      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │ lms_integration_config (for Canvas, Blackboard, etc.)      │      │
│  ├─────────────────────────────────────────────────────────────┤      │
│  │ id (PK)                                                     │      │
│  │ organization_id (UQ/FK)                                     │      │
│  │ lms_type                                                    │      │
│  │ api_key_encrypted, api_secret_encrypted                     │      │
│  │ auto_sync_students, auto_sync_grades                        │      │
│  │ field_mappings, role_mappings (JSONB)                       │      │
│  │ is_connected, last_sync_at                                  │      │
│  └─────────────────────────────────────────────────────────────┘      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │ webhook_logs                                                │      │
│  ├─────────────────────────────────────────────────────────────┤      │
│  │ id (PK)                                                     │      │
│  │ organization_id (FK)                                        │      │
│  │ event_type                                                  │      │
│  │ resource_type, resource_id                                  │      │
│  │ webhook_url, payload, response_status                       │      │
│  │ attempt_number, is_delivered                                │      │
│  └─────────────────────────────────────────────────────────────┘      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │ subscription_plans & billing_history                        │      │
│  │ (Pricing tiers and payment tracking)                        │      │
│  └─────────────────────────────────────────────────────────────┘      │
│                                                                         │
│  PHASE 2-4 (Future):                                                   │
│  • Add tenant_id to existing tables                                    │
│  • Update RLS policies to filter by org_id                            │
│  • Create get_current_organization_id() helper                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Instructor Bulk Upload (Migration 013)

```
┌─────────────────────────────────────────────────────────────────────────┐
│              INSTRUCTOR BULK UPLOAD SYSTEM (Migration 013)              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────┐                                           │
│  │ instructors             │                                           │
│  ├─────────────────────────┤                                           │
│  │ id (PK)                 │                                           │
│  │ auth_user_id (UQ)       │                                           │
│  │ email (UQ)              │                                           │
│  │ first_name, last_name   │                                           │
│  │ phone_number            │                                           │
│  │ cell_number ◄─── CSV col                                            │
│  │ location ◄─── CSV col                                              │
│  │ bio                     │                                           │
│  │ avatar_url              │                                           │
│  │ courses_they_teach (JSONB)                                          │
│  │ specializations (ARRAY) │                                           │
│  │ years_experience        │                                           │
│  │ certifications (JSONB)  │                                           │
│  │ is_active               │                                           │
│  │ is_verified             │                                           │
│  │ verified_at             │                                           │
│  │ created_at, updated_at  │                                           │
│  └─────────────────────────┘                                           │
│           ▲                                                             │
│           │                                                             │
│  ┌────────┴──────────────────────┐                                    │
│  │                               │                                    │
│  │  ┌──────────────────────────┐ │  ┌──────────────────────────────┐ │
│  │  │instructor_bulk_uploads   │ │  │instructor_bulk_upload_rows   │ │
│  │  ├──────────────────────────┤ │  ├──────────────────────────────┤ │
│  │  │id (PK)                   │ │  │id (PK)                       │ │
│  │  │upload_id (UQ)            │ │  │upload_id (FK)                │ │
│  │  │uploaded_by_email         │ │  │row_number                    │ │
│  │  │uploaded_by_user_id       │ │  │raw_data (JSONB)              │ │
│  │  │file_name, file_size      │ │  │status: pending, success,     │ │
│  │  │file_hash (MD5)           │ │  │        failed                 │ │
│  │  │row_count                 │ │  │created_instructor_id (FK)    │ │
│  │  │processed_row_count       │ │  │existing_instructor_id (FK)   │ │
│  │  │successful_row_count      │ │  │validation_errors (JSONB)     │ │
│  │  │failed_row_count          │ │  │validation_warnings (JSONB)   │ │
│  │  │status: pending,          │ │  │error_message                 │ │
│  │  │        processing,        │ │  │action_taken: created,        │ │
│  │  │        completed,         │ │  │              updated,        │ │
│  │  │        partial, failed    │ │  │              skipped,        │ │
│  │  │error_message             │ │  │              error           │ │
│  │  │error_details (JSONB)     │ │  │created_at, updated_at        │ │
│  │  │warning_details (JSONB)   │ │  └──────────────────────────────┘ │
│  │  │started_processing_at     │ │                                    │
│  │  │completed_at              │ │                                    │
│  │  │created_at, updated_at    │ │                                    │
│  │  └──────────────────────────┘ │                                    │
│  │                               │                                    │
│  │  FUNCTIONS:                   │                                    │
│  │  • validate_instructor_row()  │                                    │
│  │  • process_instructor_bulk_   │                                    │
│  │    upload()                   │                                    │
│  └───────────────────────────────┘                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Relationships Summary

| From Table | To Table | Type | Notes |
|-----------|----------|------|-------|
| classrooms | auth.users | FK | instructor_id → id |
| students | auth.users | FK | auth_user_id → id (optional, for OAuth) |
| student_rosters | classrooms | FK | classroom_id → id |
| student_rosters | students | FK | student_id → id |
| quizzes | classrooms | FK | classroom_id → id |
| quizzes | auth.users | FK | instructor_id → id |
| quiz_questions | quizzes | FK | quiz_id → id |
| quiz_sessions | quizzes | FK | quiz_id → id |
| quiz_sessions | students | FK | student_id → id |
| quiz_responses | quiz_sessions | FK | session_id → id |
| quiz_responses | quiz_questions | FK | question_id → id |
| quiz_assignments | quizzes | FK | quiz_id → id |
| quiz_assignments | students | FK | student_id → id (optional) |
| quiz_snapshots | quizzes | FK | original_quiz_id → id |
| quiz_snapshots | quiz_assignments | FK | assignment_id → id |
| assignment_extension_requests | quiz_assignments | FK | assignment_id → id |
| assignment_extension_requests | students | FK | student_id → id |
| live_quiz_sessions | classrooms | FK | classroom_id → id |
| live_quiz_sessions | auth.users | FK | instructor_id → id |
| live_quiz_participants | students | FK | student_id → auth_user_id |
| audit_logs_immutable | students | FK | data_subject_id → id (GDPR) |
| organizations | - | - | Top-level tenant (future) |
| instructor_bulk_uploads | auth.users | FK | uploaded_by_user_id → id |

---

## Migration Sequence

```
001_create_ilt_tables.sql
  ├─ CREATE: classrooms, students, student_rosters, quiz_submissions, quiz_answers,
  │           instructor_sessions, audit_logs (original)
  
002_quiz_module_extensions.sql
  ├─ ALTER: students (add auth_user_id, verified_at, is_verified)
  ├─ ALTER: quiz_answers (add grading columns)
  ├─ CREATE: verification_attempts
  
003_live_quiz_sessions_rls.sql
  ├─ CREATE: live_quiz_sessions, live_quiz_participants, live_quiz_responses
  ├─ CREATE: live_leaderboard_visible_to_students VIEW
  
004_csv_quiz_module.sql
  ├─ CREATE: quizzes, quiz_questions, quiz_sessions, quiz_responses
  ├─ CREATE: calculate_quiz_score(), finalize_quiz_session() functions
  ├─ CREATE: quiz_audit_log
  ├─ CREATE: quiz_statistics, student_quiz_progress VIEWS
  
005_student_authentication.sql
  ├─ CREATE: IF NOT EXISTS students (ignored - table exists from 001)
  ├─ CREATE: student_profiles, student_quiz_history, quiz_statistics,
  │           student_progress
  
006_fix_students_rls_policies.sql
  ├─ ALTER: students RLS policies (INSERT, SELECT, UPDATE)
  
006_quiz_assignments_and_snapshots.sql
  ├─ ALTER: quizzes (add deleted_at, is_active)
  ├─ CREATE: quiz_assignments, quiz_snapshots
  ├─ ALTER: quiz_sessions (add quiz_snapshot_id)
  ├─ CREATE: assignment_extension_requests
  ├─ ALTER: quiz_questions (add normalized, hash)
  
007_add_attempt_tracking.sql
  ├─ ALTER: quiz_assignments (add attempt_limit, status)
  ├─ ALTER: quiz_sessions (add attempt_number, time_spent_seconds, etc.)
  ├─ CREATE: quiz_versions, quiz_attempt_resets
  ├─ ALTER: quiz_responses (add attempt_number, response_order, time_on_q)
  ├─ CREATE: get_next_attempt_number(), has_attempts_remaining() functions
  
008_add_2fa_pending_confirmations.sql
  ├─ CREATE: pending_2fa_confirmations
  ├─ CREATE: create_pending_2fa_confirmation(), validate_2fa_code() functions
  
009_add_attempt_limit_constraint.sql
  ├─ ALTER: quiz_assignments (add CHECK constraint on attempt_limit)
  
010_resolve_students_table_conflicts.sql ◄─── FIX MIGRATION
  ├─ ADD: missing columns to students (first_name, last_name, etc.)
  ├─ MIGRATE: data from 'name' → first_name + last_name
  ├─ ADD: RLS policies (consolidated)
  
011_fix_race_conditions.sql ◄─── FIX MIGRATION
  ├─ RECREATE: get_next_attempt_number() WITH FOR UPDATE locking
  ├─ RECREATE: validate_2fa_code() WITH FOR UPDATE locking
  ├─ CREATE: approveExtension() atomic function
  
012_multi_tenant_schema.sql ◄─── DESIGN MIGRATION (not activated)
  ├─ CREATE: organizations, teams, organization_members
  ├─ CREATE: feature_flags, white_label_settings, lms_integration_config
  ├─ CREATE: webhook_logs, subscription_plans, billing_history
  
013_instructor_bulk_upload_schema.sql ◄─── NEW MIGRATION
  ├─ CREATE: instructors table (if needed)
  ├─ CREATE: instructor_bulk_uploads, instructor_bulk_upload_rows
  ├─ CREATE: validate_instructor_row(), process_instructor_bulk_upload() functions
  
014_immutable_audit_logging.sql ◄─── NEW MIGRATION
  ├─ CREATE: audit_logs_immutable (append-only, GDPR-ready)
  ├─ CREATE: audit triggers on sensitive tables
  ├─ CREATE: log_audit_event(), audit_log_trigger_function()
  ├─ CREATE: get_data_subject_access_logs(), mark_data_for_deletion(),
  │           cleanup_expired_audit_logs() (GDPR functions)
```

---

**Generated**: 2026-08-12  
**Schema Version**: 1.0 (Migrations 001-014)  
**Status**: Ready for deployment
