# DailyAgile Quiz MVP — Acceptance Criteria by Agent
## 10-Agent Sprint Success Definitions

**Document Purpose:** Define exactly what "done" means for each agent. Sign-off requires ALL criteria met.  
**Sprint Duration:** Days 1-15  
**Created:** Sprint Day 1  

---

## 1️⃣ SECURITY AGENT — 🔐

### Responsibility
Ensure all security vulnerabilities are identified and fixed. All data is protected. All authentication is secure.

### Acceptance Criteria

#### 1.1 Authentication & Authorization
- [ ] **Magic Link Tokens**
  - Tokens expire after 15 minutes (not reusable after)
  - Tokens are cryptographically random (min 32 bytes entropy)
  - Tokens are logged to audit table (who, when, IP, success/failure)
  - One-time use enforced (attempting reuse returns 401)
  - Token transmitted over HTTPS only (no HTTP fallback)

- [ ] **Student Auth Boundaries**
  - Students can only view their own quiz attempts (not other students' data)
  - Students cannot modify quiz submissions after "Submit" button clicked
  - Students cannot see instructor-only fields (scoring rubric, feedback from other students)

- [ ] **Instructor Auth Boundaries**
  - Instructors can only see students in their assigned courses
  - Instructors cannot see financial data (payment info) outside their scope
  - CSV import only allows email/name/location fields (no sensitive escalation)

#### 1.2 Data Protection
- [ ] **SQL Injection Prevention**
  - All DB queries use parameterized statements (no string interpolation)
  - Tested with OWASP SQLi payloads (e.g., `'; DROP TABLE students; --`)
  - Zero SQL errors in logs when tested

- [ ] **XSS Prevention**
  - All user inputs escaped before rendering (HTML, URL, JS context-aware escaping)
  - Content Security Policy (CSP) header enforced: `script-src 'self'`
  - Tested with XSS payloads (e.g., `<script>alert('xss')</script>`)
  - React/Next.js auto-escaping verified

- [ ] **CSRF Protection**
  - All state-changing endpoints (POST/PUT/DELETE) require CSRF token
  - CSRF tokens tied to session (one-time use after request completes)
  - SameSite cookie attribute set to `Strict`

- [ ] **Sensitive Data**
  - Passwords never stored (use magic link only)
  - API keys never logged or sent in responses
  - Student email hashed in audit logs (not plain text)
  - Quiz submissions never include instructor notes in student-facing API responses

#### 1.3 Rate Limiting & Brute Force
- [ ] **Quiz Submission Rate Limit**
  - Max 5 quiz submissions per student per hour per quiz
  - Tracked by student_id + quiz_id + hour
  - Returns 429 (Too Many Requests) with retry-after header when exceeded
  - Tested with automated submissions

- [ ] **Magic Link Request Rate Limit**
  - Max 3 magic link requests per email per hour
  - Returns 429 after limit exceeded
  - Prevents password reset brute force on email discovery

- [ ] **Login Attempt Tracking**
  - Logs all successful/failed logins to audit table
  - Alerts if 5+ failed logins from same IP in 15 mins

#### 1.4 OWASP Top 10 Coverage
- [ ] **Broken Authentication** → Covered by 1.1, 1.2
- [ ] **Broken Access Control** → Covered by 1.1, 1.2
- [ ] **Injection** → Covered by 1.2
- [ ] **Insecure Deserialization** → No deserialization; all JSON parsing validates schema
- [ ] **Broken Encryption** → HTTPS enforced; encryption at rest via Supabase default
- [ ] **Security Misconfiguration** → Security headers audit (CSP, X-Frame-Options, etc.)
- [ ] **Sensitive Data Exposure** → Covered by 1.2
- [ ] **XML External Entities** → No XML parsing used
- [ ] **Broken Access Control (again)** → Covered by 1.2
- [ ] **Using Components with Known Vulnerabilities** → Dependency audit via `npm audit`, zero critical/high

#### 1.5 Compliance & Audit
- [ ] **Audit Logging**
  - All logins logged (student_id, timestamp, IP, success)
  - All quiz submissions logged (student_id, quiz_id, timestamp, score)
  - All extension requests logged (student_id, reason, status, timestamp)
  - Logs kept for 5 years (Supabase retention)
  - Logs accessible only to admin (not student-facing)

- [ ] **Data Retention**
  - Quiz attempts never deleted (compliance)
  - Student personal data deletion implemented (GDPR/CCPA right-to-be-forgotten)
  - Deletion cascades to quiz_attempts, quiz_responses, extension_requests

#### 1.6 Security Testing
- [ ] **Penetration Test Checklist**
  - [ ] OWASP Top 10 scan passed
  - [ ] Dependency vulnerability audit (npm audit): zero critical/high
  - [ ] Manual testing with ZAP or Burp Community Edition
  - [ ] Documentation of findings + resolution status

- [ ] **Code Review**
  - Security Agent reviews all auth/data-access code
  - Approves Backend Agent's pull request

### Sign-Off
**Security Agent declares "DONE" when:** All criteria 1.1-1.6 met + code review approved + penetration testing passed.

---

## 2️⃣ DATABASE AGENT — 🗄️

### Responsibility
Design, create, and maintain the database schema. Ensure all data is structured correctly and accessible efficiently.

### Acceptance Criteria

#### 2.1 Schema Creation
- [ ] **All 6 MVP Tables Created**
  - `quizzes` (instructor-created quizzes)
  - `quiz_assignments` (when quiz assigned to students)
  - `quiz_questions` (existing, reused)
  - `quiz_responses` (existing, reused)
  - `quiz_scores` (final results)
  - `extension_requests` (student extension requests)

- [ ] **Table Structure (Detailed)**

  **quizzes table:**
  ```sql
  id: UUID (PK)
  instructor_id: UUID (FK → users)
  course_id: UUID (FK → courses)
  title: TEXT
  description: TEXT
  assignment_code: TEXT (UNIQUE, 6-char alphanumeric)
  time_limit_minutes: INT
  created_at: TIMESTAMPTZ (DEFAULT NOW())
  ```

  **quiz_assignments table:**
  ```sql
  id: UUID (PK)
  quiz_id: UUID (FK → quizzes)
  due_date: TIMESTAMPTZ
  assigned_to_course_id: UUID (FK → courses)
  assigned_to_students: JSONB (array of student_ids or NULL for whole course)
  created_by_instructor_id: UUID (FK → users)
  created_at: TIMESTAMPTZ (DEFAULT NOW())
  ```

  **quiz_scores table:**
  ```sql
  id: UUID (PK)
  student_id: UUID (FK → users)
  quiz_id: UUID (FK → quizzes)
  score_percentage: INT (0-100)
  time_taken_seconds: INT
  submitted_at: TIMESTAMPTZ
  created_at: TIMESTAMPTZ (DEFAULT NOW())
  ```

  **extension_requests table:**
  ```sql
  id: UUID (PK)
  student_id: UUID (FK → users)
  quiz_id: UUID (FK → quizzes)
  reason: TEXT
  requested_new_deadline: TIMESTAMPTZ
  status: TEXT ('pending', 'approved', 'rejected')
  instructor_notes: TEXT
  responded_at: TIMESTAMPTZ
  created_at: TIMESTAMPTZ (DEFAULT NOW())
  ```

#### 2.2 Indexes & Performance
- [ ] **Indexes Created**
  - `quizzes.assignment_code` (UNIQUE index for lookups)
  - `quiz_assignments.due_date` (range queries)
  - `quiz_scores.student_id` (student results lookups)
  - `quiz_scores.quiz_id` (quiz results lookups)
  - `quiz_responses.student_id + quiz_id` (composite for student submissions)
  - `extension_requests.status` (filtering pending requests)

- [ ] **Query Performance Targets**
  - Load student's assigned quizzes: <100ms (1000 students)
  - Fetch quiz results table (20 students): <200ms
  - Insert quiz response: <50ms
  - Calculate quiz score: <100ms

#### 2.3 Constraints & Integrity
- [ ] **Foreign Key Constraints**
  - All FK references enforced (no orphaned records)
  - ON DELETE CASCADE set appropriately (e.g., delete course → delete quizzes)
  - Tested with manual SQL violations (rejected)

- [ ] **Business Logic Constraints**
  - `assignment_code` must be 6 chars, alphanumeric (CHECK constraint)
  - `score_percentage` must be 0-100 (CHECK constraint)
  - `extension_request.status` must be in ('pending', 'approved', 'rejected')
  - `time_limit_minutes` must be > 0

- [ ] **Unique Constraints**
  - Only one active score per student per quiz (UNIQUE on student_id + quiz_id)
  - Assignment codes are globally unique (UNIQUE on assignment_code)

#### 2.4 Migrations & Versioning
- [ ] **Migration Scripts**
  - Each table creation = separate migration file
  - Naming: `[timestamp]_create_quizzes.sql`
  - All migrations versioned in Supabase (tracked in schema_migrations table)
  - Rollback tested (ability to undo each migration)

- [ ] **Deployment Process**
  - Migrations auto-run on app startup (via Liquibase or Supabase CLI)
  - No manual SQL execution required
  - Zero data loss during migration (backups tested)
  - Tested in staging environment before prod

#### 2.5 Data Backup & Recovery
- [ ] **Backup Strategy**
  - Supabase automated backups enabled (daily)
  - Point-in-time recovery available (5-day window)
  - Test restore from backup (quarterly)
  - Backup location != production location (multi-region safety)

- [ ] **Data Retention**
  - Quiz attempts: kept 5 years
  - Deleted student data: cascaded deletion tested
  - Audit logs: kept indefinitely

#### 2.6 Monitoring & Alerting
- [ ] **Database Health**
  - Connection pool monitoring (max 20 connections configured)
  - Query performance dashboard (Supabase metrics)
  - Disk space alerts (trigger at 80% full)
  - Replication lag monitored (if applicable)

### Sign-Off
**Database Agent declares "DONE" when:** All tables created + indexed + migrations working + tested in staging + zero data loss on rollback.

---

## 3️⃣ DEVOPS AGENT — 🚀

### Responsibility
Build and maintain CI/CD pipeline. Deploy code safely. Enable feature flags. Monitor production.

### Acceptance Criteria

#### 3.1 CI/CD Pipeline
- [ ] **GitHub Actions Workflow**
  - Trigger: push to any branch
  - Stages:
    1. **Lint** (ESLint, Prettier check) — 2 min max
    2. **Test** (Jest unit tests) — 5 min max
    3. **Build** (Next.js build) — 5 min max
    4. **Deploy to Staging** — automatic
    5. **Deploy to Production** — manual approval required

- [ ] **Build Artifacts**
  - Docker image built (if self-hosted) OR Vercel auto-deploy (if Vercel)
  - Image tagged with git commit SHA
  - Build logs kept for 30 days

- [ ] **Deployment Strategy**
  - Blue-green deployment (old version stays live, new version tested, then switch)
  - Rollback in <5 minutes (one command: `npm run rollback:prod`)
  - Database migrations run AFTER new code deployed (not before)

#### 3.2 Environment Configuration
- [ ] **Three Environments**
  - **Development** (localhost, .env.local)
    - SQL_LOG=true (log all DB queries)
    - DEBUG=true
    - FEATURE_FLAGS_OVERRIDE=true (toggle flags without re-deploy)
  
  - **Staging** (staging.dailyagile.com)
    - Mirrors production exactly
    - Same DB size/data (anonymized copy of production)
    - All feature flags OFF by default (test individually)
  
  - **Production** (dailyagile.com)
    - SQL_LOG=false (performance)
    - DEBUG=false
    - FEATURE_FLAGS from backend (togglable via admin UI)

- [ ] **Secrets Management**
  - All API keys stored in Vercel Environment Variables (or GitHub Secrets)
  - Never committed to git (checked by pre-commit hook)
  - Rotated annually (ANTHROPIC_API_KEY, etc.)
  - Accessed via env var, not hardcoded

#### 3.3 Feature Flags
- [ ] **Flag Infrastructure**
  - All 9 flags stored in database (flags table)
  - Flags fetched on app startup + cached (5-min TTL)
  - Manual toggle in admin UI (sets flag value)
  - Toggling re-fetches immediately (WebSocket push or polling)

- [ ] **Flag Implementation in Code**
  ```typescript
  // Example in Frontend
  if (featureFlags.STUDENT_TIMER_DISPLAY) {
    <Timer visible />
  }
  ```

- [ ] **Logging**
  - Every quiz attempt logs which flags were active
  - Enables post-launch A/B testing (can see if flag affected behavior)

#### 3.4 Database Migrations on Deploy
- [ ] **Auto-Run Migrations**
  - On deploy to staging/production, migrations auto-run
  - Trigger: health-check endpoint verifies schema is current
  - Rollback: previous schema version available (tested)
  - Zero downtime migrations (if schema change requires it, tested)

#### 3.5 Monitoring & Alerting
- [ ] **Error Tracking**
  - Sentry integrated (all errors logged to dashboard)
  - Alert if error rate > 1% (Slack notification)
  - Alert if 5xx errors from production (page alert)

- [ ] **Performance Monitoring**
  - Vercel Analytics (page load, Cumulative Layout Shift)
  - Database query slow-log (alert if query > 1 second)
  - API endpoint latency tracked (p50, p95, p99)

- [ ] **Uptime Monitoring**
  - Uptime Robot (ping health-check endpoint every 5 mins)
  - Alert if down >1 minute

- [ ] **Dashboards**
  - Vercel dashboard live (deployments, CPU, memory)
  - Supabase dashboard live (DB size, connections, replication)
  - Sentry dashboard live (error trends)

#### 3.6 Deployment Checklist
- [ ] **Pre-Deployment (every deploy)**
  - Tests pass (100% green)
  - Code reviewed
  - Feature flags set for this release (documented)
  - Database migrations tested in staging with rollback
  - Staging passed QA

- [ ] **Deployment Execution**
  - Code pushed to main
  - GitHub Actions triggered automatically
  - Notification posted to #deployments Slack channel
  - If production, message includes rollback instructions

- [ ] **Post-Deployment**
  - Verify health-check returns 200 OK
  - Spot-check key pages load
  - Monitor error logs for 30 mins (no spike)
  - Log deployment to deployment_log table (timestamp, commit, deployer, duration)

### Sign-Off
**DevOps Agent declares "DONE" when:** CI/CD working end-to-end + feature flags deployed + monitoring live + rollback tested.

---

## 4️⃣ BACKEND AGENT — 🔧

### Responsibility
Build all API endpoints. Implement business logic. Integrate with database and external services.

### Acceptance Criteria

#### 4.1 Authentication Endpoints (3 endpoints)
- [ ] **POST /auth/request-magic-link**
  - Input: `{ email }`
  - Output: `{ message: "Check your email for login link" }`
  - Behavior:
    - Validates email format
    - Generates token + stores in magic_links table
    - Sends email via `support@dailyagile.com` (Gmail MCP)
    - Rate-limited: 3 requests/hour per email
  - Tested: Valid email, invalid email, rate limit

- [ ] **GET /auth/verify?token=xyz**
  - Input: Query param token
  - Output: Sets session cookie, redirects to /dashboard
  - Behavior:
    - Validates token (exists, not expired, not used)
    - Marks token as used
    - Creates/updates session
    - Redirects to student dashboard (if student) or instructor dashboard (if instructor)
  - Tested: Valid token, expired token, reused token, missing token

- [ ] **GET /auth/me**
  - Input: Session cookie (via middleware)
  - Output: `{ user_id, email, role, courses }`
  - Behavior: Returns current logged-in user, or 401 if not authenticated
  - Tested: Valid session, expired session, no session

#### 4.2 Quiz Management Endpoints (6 endpoints)
- [ ] **POST /quiz/create** (instructor only)
  - Input: `{ title, description, course_id, time_limit_minutes, questions: [{text, options, correct_index}] }`
  - Output: `{ quiz_id, assignment_code }`
  - Behavior:
    - Validates instructor owns course
    - Generates unique 6-char code
    - Creates quiz + all questions in transaction
  - Tested: Valid input, missing fields, invalid course, large question count

- [ ] **POST /quiz/assign** (instructor only)
  - Input: `{ quiz_id, due_date, assign_to_course_id OR assign_to_student_ids: [] }`
  - Output: `{ assignment_id, email_count }`
  - Behavior:
    - Creates quiz_assignment record
    - Fetches target students (by course or explicit list)
    - Sends email to each student with assignment code
    - Logs assignment to audit table
  - Tested: Valid quiz, invalid course, 1000+ students

- [ ] **GET /quiz/:code** (any authenticated user)
  - Input: URL param code (e.g., AB12CD)
  - Output: `{ quiz_id, title, description, time_limit_minutes, questions: [], deadline }`
  - Behavior:
    - Validates code exists + student assigned to it
    - Checks deadline (if expired, includes "expired: true")
    - Returns questions without correct answers
  - Tested: Valid code, invalid code, expired quiz, not assigned

- [ ] **POST /quiz/:code/answer** (student only)
  - Input: `{ question_index, selected_option }`
  - Output: `{ saved: true }`
  - Behavior:
    - Validates student + quiz + question index
    - Creates quiz_response record (with answer)
    - Saves locally (IndexedDB on client) + to DB
  - Tested: Valid answer, invalid question, resubmit same question

- [ ] **POST /quiz/:code/submit** (student only)
  - Input: `{ }`
  - Output: `{ quiz_id, score_percentage, passed: true/false }`
  - Behavior:
    - Validates all questions answered
    - Calculates score (correct answers / total questions * 100)
    - Creates quiz_scores record (immutable)
    - Marks quiz_responses as submitted (lock from edits)
    - Logs submission to audit table
  - Tested: Full quiz, partial answers (rejected), resubmit (rejected)

- [ ] **GET /quiz/:id/results** (instructor only)
  - Input: quiz_id (URL param)
  - Output: `{ quiz_title, submissions: [{student_id, name, score, time_taken, submitted_at}] }`
  - Behavior:
    - Validates instructor owns quiz (via course)
    - Returns all submissions + scores
    - Allows filtering by score range, status
  - Tested: Valid quiz, no submissions, large result set (1000+)

#### 4.3 Student Results Endpoints (2 endpoints)
- [ ] **GET /quiz/:id/results/:studentId** (instructor only)
  - Input: quiz_id, student_id (URL params)
  - Output: `{ student: {name, email}, responses: [{question, student_answer, correct_answer, correct: true/false}], score, time_taken }`
  - Behavior:
    - Validates instructor owns quiz
    - Returns all responses (student answers + correct answers)
    - Includes feedback field (instructor can add notes)
  - Tested: Valid student, invalid student, instructor not owner

- [ ] **GET /me/quiz-results** (student only)
  - Input: (none)
  - Output: `{ completed_quizzes: [{quiz_title, score, passed, certificate_earned, submitted_at}] }`
  - Behavior:
    - Returns all quizzes student completed
    - Shows scores + pass/fail
  - Tested: No quizzes completed, multiple quizzes completed

#### 4.4 Extension Request Endpoints (3 endpoints)
- [ ] **POST /extension/request** (student only)
  - Input: `{ quiz_id, reason, requested_new_deadline }`
  - Output: `{ request_id, status: 'pending' }`
  - Behavior:
    - Validates quiz expired
    - Creates extension_request record
    - Sends email to instructor + in-app notification
  - Tested: Valid quiz, not expired (rejected), invalid quiz

- [ ] **POST /extension/:id/approve** (instructor only)
  - Input: `{ new_deadline, instructor_notes }`
  - Output: `{ status: 'approved', new_deadline }`
  - Behavior:
    - Validates instructor owns quiz
    - Updates extension_request status
    - Sends email to student (approved + new deadline)
  - Tested: Valid request, invalid request, not instructor's quiz

- [ ] **POST /extension/:id/reject** (instructor only)
  - Input: `{ instructor_notes }`
  - Output: `{ status: 'rejected' }`
  - Behavior:
    - Sends rejection email to student with reason
  - Tested: Valid request, already responded request

#### 4.5 CSV Export (1 endpoint)
- [ ] **GET /quiz/:id/results/export** (instructor only)
  - Input: quiz_id (URL param)
  - Output: CSV file download
  - Behavior:
    - Generates CSV: student_name, email, score, time_taken, submitted_at
    - Sets Content-Disposition: attachment
  - Tested: Large result set (10K+ rows), memory usage

#### 4.6 API Quality Standards
- [ ] **Response Format**
  - All responses are JSON (except CSV export)
  - Success: `{ data: ..., status: 200 }`
  - Error: `{ error: "human-readable message", status: 400/401/500 }`
  - No stack traces in error responses (production)

- [ ] **Error Handling**
  - 400: Invalid input (missing fields, bad format)
  - 401: Unauthenticated (no session cookie)
  - 403: Unauthorized (student accessing instructor quiz)
  - 404: Resource not found
  - 409: Conflict (e.g., quiz already submitted)
  - 429: Rate limited
  - 500: Server error (log to Sentry)

- [ ] **Performance**
  - All endpoints respond in <200ms (p95)
  - Concurrent load: 1000 students taking quiz simultaneously (tested)
  - No N+1 query problems (pre-fetch relations)
  - Queries use indexes (explain plan verified)

- [ ] **Input Validation**
  - All inputs validated server-side (not relying on frontend)
  - No SQL injection vulnerable inputs
  - No XSS vulnerable inputs
  - Max lengths enforced (e.g., reason <500 chars)

- [ ] **Documentation**
  - OpenAPI/Swagger spec generated (endpoints, schemas, examples)
  - Postman collection exported (for manual testing)
  - Every endpoint documented with: purpose, input/output, error cases

### Sign-Off
**Backend Agent declares "DONE" when:** All 12 endpoints built + tested + documented + <200ms latency + load tested (1000 concurrent).

---

## 5️⃣ FRONTEND AGENT — 🎨

### Responsibility
Build all UI pages. Ensure responsive design. Implement client-side business logic.

### Acceptance Criteria

#### 5.1 Login Flow (1 page)
- [ ] **Page: `/auth/login`**
  - Elements:
    - Email input field (focus on load)
    - "Send Login Link" button
    - Error message (if invalid email or rate limited)
    - Success message (if email sent)
  - Behavior:
    - On submit: call POST /auth/request-magic-link
    - Show loading state during request
    - Show success message for 5 seconds
    - Store email in localStorage (pre-fill on return)
  - Validation:
    - Email format checked (regex or HTML5 validation)
    - Show error if validation fails (don't submit)
  - Mobile responsive: works on 320px width
  - Accessibility: keyboard navigation, screen reader labels
  - Tested: Valid email, invalid email, rate limit message

#### 5.2 Magic Link Verification (1 page)
- [ ] **Page: `/auth/verify?token=xyz`**
  - Elements:
    - "Logging you in..." loading message
    - Auto-submit on page load (no user interaction)
  - Behavior:
    - On mount: call GET /auth/verify?token=xyz
    - If success: redirect to /dashboard after 1 second
    - If failure: show "Link expired" message + link to login
  - Tested: Valid token, expired token, invalid token

#### 5.3 Student Dashboard (1 page)
- [ ] **Page: `/student/dashboard`**
  - Elements:
    - Greeting: "Welcome, [First Name]"
    - "Assigned Quizzes" section (table or card list)
    - Each quiz shows: title, due date, status (pending/submitted/overdue)
    - "Take Quiz" button per quiz
    - "View Results" button (if submitted)
  - Behavior:
    - Load quizzes from GET /quiz/[list endpoint]
    - Filter: only show quizzes assigned to this student
    - Color-code status: red (overdue), yellow (due soon), green (time left)
    - Sort by due date (soonest first)
  - Tested: 0 quizzes, 1 quiz, 50 quizzes, sort and filter
  - Mobile responsive: card view on mobile, table on desktop

#### 5.4 Quiz-Taking UI (1 page)
- [ ] **Page: `/quiz/:code`**
  - Layout:
    - Top bar: Quiz title + timer (countdown)
    - Main area: Question + 4 radio button options
    - Bottom: Previous + Next buttons (or question 1 of 20)
  - Elements:
    - Question text (centered, large font)
    - 4 radio buttons (large, touch-friendly)
    - "Next" button (orange, prominent)
    - "Back" button (disabled on Q1)
    - Progress bar: filled for each completed question
    - Timer: MM:SS format, updates every second
  - Behavior:
    - On load: call GET /quiz/:code, show Q1
    - Store answers locally (IndexedDB) + send to server
    - Timer counts down from time_limit_minutes
    - On timer end: auto-submit quiz
    - If connection lost: show "offline" badge, retry sync on reconnect
    - "Review" page before final submit (show all answers, edit button per Q)
    - "Submit Quiz" button: one-way (confirmation modal)
  - Validation:
    - Must answer current Q before "Next" (optionally: allow skip)
    - Show error if required field empty
  - Mobile responsive:
    - Full-width questions
    - Larger touch targets (radio buttons)
    - Timer sticky at top
  - Accessibility:
    - ARIA labels for radio buttons
    - Keyboard: Tab to move between options, Enter to select
  - Tested: All questions, navigate back/forward, timer countdown, offline sync

#### 5.5 Results Page (1 page)
- [ ] **Page: `/quiz/:id/results`**
  - Elements:
    - Large score display: "You scored 75% (15/20)"
    - Pass/fail badge (green if ≥70%, red if <70%)
    - Certificate badge (if ≥70%): downloadable PNG
    - Time taken: "Completed in 12 minutes"
    - "View Detailed Answers" link (optional)
    - "Request Extension" button (if quiz expired)
    - "Take Another Quiz" or "Back to Dashboard" button
  - Behavior:
    - Show immediately after submit (no page refresh)
    - Certificate downloadable (PNG with student name + score)
  - Mobile responsive: centered, readable on small screens
  - Tested: Passing score, failing score, extension button visibility

#### 5.6 Extension Request Form (1 modal/page)
- [ ] **Modal: Extension Request**
  - Elements:
    - Quiz title (read-only)
    - "Why do you need more time?" text area (500 chars max)
    - "Preferred new deadline" date picker
    - "Submit Request" + "Cancel" buttons
  - Behavior:
    - Opens from results page "Request Extension" button
    - Validate: reason not empty, deadline in future
    - On submit: call POST /extension/request
    - Show success message: "Request sent! Instructor will respond within 24h"
  - Tested: Valid form, missing reason, past deadline

#### 5.7 Instructor Dashboard (1 page)
- [ ] **Page: `/instructor/dashboard`**
  - Elements:
    - "Create New Quiz" button (orange, prominent)
    - "My Quizzes" list: quiz title, date created, #submissions, #pending
    - Search/filter by course, date range
    - "View Results" link per quiz
  - Behavior:
    - Load from GET /[quizzes endpoint]
    - Sort by date created (newest first)
  - Tested: No quizzes, 1 quiz, 50 quizzes

#### 5.8 Create Quiz Page (1 page)
- [ ] **Page: `/instructor/quiz/create`**
  - Elements:
    - Form section 1: Quiz metadata
      - Title input
      - Description textarea
      - Course dropdown
      - Time Limit (minutes) number input
    - Form section 2: Add Questions
      - Question text input
      - 4 option inputs (A, B, C, D)
      - Radio button: mark correct answer
      - "Add Question" button
      - "Delete Question" button per question
    - Form section 3: Actions
      - "Publish Quiz" button (validates ≥1 question)
      - "Save Draft" button (optional)
  - Behavior:
    - On publish: call POST /quiz/create
    - Show loading state
    - On success: show assignment code + "Copy to Clipboard" + "Next: Assign Students"
  - Validation:
    - Title not empty
    - At least 1 question
    - Each question has 4 options
    - Exactly 1 correct answer per question
  - Tested: Publish quiz, edit before publish, duplicate questions

#### 5.9 Assign Quiz Page (1 page)
- [ ] **Page: `/instructor/quiz/:id/assign`**
  - Elements:
    - Quiz title (read-only)
    - Due date + time picker
    - "Assign to:" radio buttons
      - All students in [course name]
      - Specific students (list + multi-select)
    - "Send Invites" button
  - Behavior:
    - On submit: call POST /quiz/assign
    - Show loading state
    - On success: "Quiz assigned! Students will receive email in 1-2 mins"
    - Redirect to results page after 2 seconds
  - Tested: Assign to course, assign to students

#### 5.10 Quiz Results Table (1 page)
- [ ] **Page: `/instructor/quiz/:id/results`**
  - Elements:
    - Quiz title (read-only)
    - Filter section: Score range, Status (submitted/pending/overdue), Date range
    - Results table:
      - Columns: Student Name | Score | % | Time Taken | Status | Actions
      - Sortable by each column
      - Pagination (25 per page)
      - "Export CSV" button
      - "View Details" link per student (opens detail page)
  - Behavior:
    - Load from GET /quiz/:id/results
    - Filters update table in real-time
    - CSV export downloads file
  - Tested: Large result set (1000+ rows), filtering, sorting, export

#### 5.11 Student Results Detail Page (1 page)
- [ ] **Page: `/instructor/quiz/:id/results/:studentId`**
  - Elements:
    - Student name + email (read-only)
    - Quiz title + score + time taken
    - Answers breakdown:
      - Question 1: [text]
        - Student answered: Option B ✓
        - Correct answer: Option B ✓
      - Question 2: [text]
        - Student answered: Option A ✗
        - Correct answer: Option C
    - "Instructor Notes" textarea (instructor can add feedback)
    - "Save Notes" button
    - Pagination: Next/Previous student
  - Behavior:
    - Load from GET /quiz/:id/results/:studentId
    - Save notes to backend (PUT endpoint)
  - Tested: Correct answers, incorrect answers, add notes

#### 5.12 Extension Requests Page (1 page, instructor)
- [ ] **Page: `/instructor/extensions`**
  - Elements:
    - Pending requests table:
      - Student Name | Quiz | Reason | Requested Deadline | Actions
    - "View Details" link per request (opens modal)
    - Filter: status (pending/approved/rejected)
  - Modal: Approve/Reject
    - Shows request details
    - "Approve" button: set new deadline, add notes, submit
    - "Reject" button: add reason/notes, submit
  - Behavior:
    - Load from GET /[extensions endpoint]
    - Approve: call POST /extension/:id/approve
    - Reject: call POST /extension/:id/reject
  - Tested: Approve request, reject request, no pending requests

#### 5.13 UI Standards
- [ ] **Consistent Branding**
  - Colors: Navy (#1E3A5F) headers, Teal (#0891B2) accents, Orange (#EA580C) CTAs
  - Font: Cambria for headers, Calibri for body
  - Logo in top-left corner (all pages)
  - Tagline "Accelerate Business Agility" in footer

- [ ] **Responsive Design**
  - Breakpoints: 320px (mobile), 768px (tablet), 1024px (desktop)
  - All pages tested on all breakpoints
  - Touch targets: min 44×44px (mobile)
  - Text readable without zoom (16px minimum)

- [ ] **Accessibility (WCAG 2.1 AA)**
  - Keyboard navigation: all interactive elements (Tab, Enter, Arrow keys)
  - Screen reader: labels, aria-labels, semantic HTML
  - Color contrast: text ≥4.5:1, UI elements ≥3:1
  - No keyboard traps
  - Focus indicators visible

- [ ] **Performance**
  - Page load: <2 seconds (LCP metric)
  - Interactive: <3.5 seconds (INP metric)
  - Cumulative Layout Shift: <0.1
  - Images optimized (WebP, lazy loading)
  - Code splitting (separate bundles for pages)

- [ ] **Error States**
  - Network error: show "Connection lost" message + retry button
  - Form validation: clear error messages below field
  - API errors: show user-friendly message (not stack trace)
  - 404 page: "Quiz not found" + link to dashboard

### Sign-Off
**Frontend Agent declares "DONE" when:** All 12 pages built + responsive on all breakpoints + accessible (WCAG AA) + <2s load time.

---

## 6️⃣ FEATURE FLAGS AGENT — 🚩

### Responsibility
Design and implement the feature flag system. Enable safe rollout of new features.

### Acceptance Criteria

#### 6.1 Flag Configuration
- [ ] **All 9 Flags Defined**
  ```typescript
  const FLAGS = {
    // Student flags
    STUDENT_TIMER_DISPLAY: true,
    STUDENT_REVIEW_BEFORE_SUBMIT: true,
    STUDENT_EXTENSION_REQUESTS: true,
    STUDENT_INSTANT_RESULTS: true,
    
    // Instructor flags
    INSTRUCTOR_BULK_UPLOAD: true,
    INSTRUCTOR_RESULTS_EXPORT: true,
    INSTRUCTOR_EXTENSION_APPROVAL: true,
    INSTRUCTOR_STUDENT_NOTES: true,
    
    // Platform flags
    MAGIC_LINK_AUTH: true,
  };
  ```

- [ ] **Flag Storage**
  - Flags stored in Supabase table: `feature_flags`
  - Columns: `flag_name` (TEXT, PK) | `enabled` (BOOLEAN) | `updated_at` (TIMESTAMPTZ)
  - All 9 flags inserted at setup time

#### 6.2 Flag Fetching & Caching
- [ ] **Initial Load**
  - On app startup: call GET /feature-flags
  - Store in Redux/Zustand/Context
  - Cache for 5 minutes (TTL)
  - If cache miss: fetch from backend

- [ ] **Manual Toggle**
  - Admin UI (or CLI): toggle flag value
  - Write to database immediately
  - Broadcast update to all connected clients (via WebSocket or polling)
  - Clients re-fetch flags without page reload

- [ ] **Fallback Values**
  - If feature-flags endpoint down: use default values (all flags = false, safer fallback)
  - App still works with fallback (degraded experience)

#### 6.3 Flag Usage in Code
- [ ] **Frontend Implementation**
  - Every feature gated by flag:
    ```typescript
    if (flags.STUDENT_TIMER_DISPLAY) {
      <QuizTimer />
    }
    ```
  - No hard-coded "true/false" for feature toggles
  - Flags checked at component level

- [ ] **Backend Implementation**
  - Every endpoint checks flags before returning data
  - If flag disabled, endpoint returns 400 (Bad Request) with message
  - Example: if INSTRUCTOR_RESULTS_EXPORT disabled, GET .../export returns error

#### 6.4 Logging
- [ ] **Flag Audit Log**
  - Every quiz attempt logs: quiz_id, active_flags, timestamp
  - Enables post-launch analysis: "Was feature X on when student Z took quiz?"
  - Table: `quiz_attempt_flags` (quiz_attempt_id, flag_name, flag_value, timestamp)

#### 6.5 Admin UI (Optional but Good)
- [ ] **Flag Toggle Dashboard** (admin-only page)
  - List all flags + current value (enabled/disabled)
  - Toggle button per flag
  - On toggle: update database + notify all clients
  - Show history of changes (when flag toggled, who toggled it, value)
  - Tested: Toggle flag, verify clients update

#### 6.6 Testing
- [ ] **Flag Variants Testing**
  - Automated tests run with flags ON and flags OFF
  - Example: unit test quiz submission with STUDENT_INSTANT_RESULTS = true and false
  - Coverage: at least 1 test per flag

### Sign-Off
**Feature Flags Agent declares "DONE" when:** All 9 flags deployed + toggleable + cached + clients re-fetch without reload + tested with flag ON/OFF.

---

## 7️⃣ VIDEO AGENT — 📹

### Responsibility
Produce 3 instructional videos. Upload to YouTube. Embed in help pages.

### Acceptance Criteria

#### 7.1 Video 1: "How to Create a Quiz"
- [ ] **Specifications**
  - Duration: 59-61 seconds (exactly 60 ± 1 second)
  - Resolution: 1920×1080 (16:9 widescreen)
  - Codec: H.264 video, AAC audio (MP4 container)
  - Frame rate: 30 fps
  - Bitrate: 5-8 Mbps video, 128 kbps audio
  - File size: <50 MB

- [ ] **Content**
  - Follows script exactly (60 words of voiceover)
  - Shows instructor dashboard → create button → form fill → publish → code appears
  - Branding: Navy background, Teal accents, Orange buttons
  - Font: Cambria titles, Calibri body text
  - Background music: Upbeat, 30 dB under voiceover
  - Voiceover: Clear, warm, encouraging tone

- [ ] **Captions**
  - Auto-generated by YouTube + manually reviewed
  - Accuracy: 100% (no misheard words)
  - Timing: captions sync with audio
  - Placement: not covering key UI elements

- [ ] **Quality Check**
  - No rendering artifacts (glitches, pixelation)
  - No console errors in logs
  - Audio levels consistent (no sudden peaks)
  - Timing exact (frame count matches script)

- [ ] **Upload to YouTube**
  - Channel: DailyAgile (learners@dailyagile.com)
  - Visibility: Unlisted (shareable via link, not in search)
  - Title: "How to Create a Quiz | DailyAgile"
  - Description: (see REMOTION_VIDEO_SCRIPTS.md)
  - Tags: quiz, tutorial, teacher, create-quiz, how-to
  - Playlist: DailyAgile Help Videos
  - Link provided to Backend Agent for embedding

#### 7.2 Video 2: "How to Take a Quiz"
- [ ] **Specifications**
  - Same as Video 1 (duration, resolution, codec, bitrate)

- [ ] **Content**
  - Script: 61 words max
  - Shows student receiving email → entering code → taking quiz → reviewing answers → submitting → viewing score
  - Tone: Supportive, reassuring, encouraging
  - Branding: consistent with Video 1
  - Background music: Gentle, 25 dB under voiceover

- [ ] **Captions & Upload**
  - Same as Video 1 (100% accuracy, YouTube unlisted)
  - Title: "How to Take a Quiz | DailyAgile"
  - Playlist: DailyAgile Help Videos

#### 7.3 Video 3: "How to Request an Extension"
- [ ] **Specifications**
  - Same as Video 1 (duration, resolution, codec, bitrate)

- [ ] **Content**
  - Script: 60 words max
  - Shows overdue quiz → request extension button → form submission → confirmation
  - Tone: Compassionate, non-judgmental, supportive
  - Branding: consistent
  - Background music: Calm, 20 dB under voiceover

- [ ] **Captions & Upload**
  - Same as Video 1
  - Title: "How to Request an Extension | DailyAgile"
  - Playlist: DailyAgile Help Videos

#### 7.4 Video Distribution
- [ ] **YouTube Embedding**
  - Video links (unlisted URLs) provided to Backend Agent
  - Embedded in 3 help pages (iframes):
    - `/help/create-quiz.html`
    - `/help/take-quiz.html`
    - `/help/request-extension.html`
  - Tested: videos play in iframes without errors

- [ ] **Fallback for Offline**
  - Video component shows fallback if YouTube down (rare)
  - Fallback: "Video unavailable. See text guide below."
  - Text guide present on page

#### 7.5 Video Metadata
- [ ] **Thumbnail**
  - Custom thumbnail per video (not auto-generated)
  - DailyAgile branding (navy + teal + orange)
  - Text: "How to Create Quiz" / "How to Take Quiz" / "How to Request Extension"
  - Consistency: same template for all 3

### Sign-Off
**Video Agent declares "DONE" when:** 3 videos rendered + uploaded to YouTube (unlisted) + captions 100% accurate + embedded in help pages + tested playback in iframes.

---

## 8️⃣ TESTING AGENT — 🧪

### Responsibility
Build and maintain test suites. Achieve 80%+ code coverage. Verify entire quiz workflow.

### Acceptance Criteria

#### 8.1 Unit Tests
- [ ] **Setup**
  - Jest configured (npm run test)
  - Coverage reports generated (npx jest --coverage)
  - Threshold: ≥80% coverage (lines, branches, functions)

- [ ] **Test Categories**
  - Authentication logic (token generation, validation)
  - Quiz scoring calculation
  - Extension request status transitions
  - Input validation (email, quiz code, quiz data)
  - Error handling (missing fields, invalid data)

- [ ] **Example Test Cases**
  - `generateToken()` creates random string
  - `validateToken()` rejects expired/used tokens
  - `calculateScore()` correctly computes percentage
  - `requestExtension()` sets status to pending
  - `validateQuizCode()` rejects invalid formats

- [ ] **Coverage Report**
  - Statements: ≥80%
  - Branches: ≥75% (else/if branches)
  - Functions: ≥80%
  - Lines: ≥80%

#### 8.2 Integration Tests
- [ ] **Full Quiz Workflow**
  - Test scenario: Student creates account → receives quiz → answers questions → submits → sees score
  - Test scenario: Instructor creates quiz → assigns to students → sees results
  - Test scenario: Student requests extension → instructor approves → student can retake
  - All tests use real database (staging environment)

- [ ] **Test Cases**
  - Valid quiz creation + publishing (generates code)
  - Quiz assignment to course (students notified)
  - Student quiz submission (all answers saved)
  - Score calculation (correct answer count)
  - Extension request workflow (approval, rejection)

- [ ] **Coverage**
  - Critical paths 100% tested
  - Edge cases covered (no answers submitted, partial answers, etc.)
  - Error scenarios (invalid inputs, missing data)

#### 8.3 End-to-End Tests (E2E)
- [ ] **Tool: Cypress**
  - Automated browser tests (Chrome)
  - Run on staging environment
  - No manual intervention needed

- [ ] **Test Scenarios**
  - **Student Flow:**
    1. Open login page
    2. Enter email
    3. Click "Send Login Link"
    4. Open email link (simulated)
    5. Dashboard loads
    6. Click "Take Quiz"
    7. Answer all questions
    8. Click "Submit"
    9. See results page

  - **Instructor Flow:**
    1. Login as instructor (fixture: CSV-imported account)
    2. Create new quiz
    3. Add 5 questions
    4. Publish (get assignment code)
    5. Assign to course
    6. See results table (0 submissions initially)
    7. Add student note
    8. Export CSV

  - **Extension Flow:**
    1. Student views expired quiz
    2. Click "Request Extension"
    3. Fill form + submit
    4. Instructor sees pending request
    5. Approve request
    6. Student receives email confirmation

- [ ] **Test Execution**
  - `npm run test:e2e` runs all scenarios
  - Expected duration: <10 minutes
  - All tests pass before deployment

#### 8.4 Load Testing
- [ ] **Setup**
  - Tool: k6 or Apache JMeter
  - Target: 1000 concurrent students taking quiz

- [ ] **Test Scenario**
  - Ramp up: 0 → 1000 users over 2 minutes
  - Steady state: 1000 users for 5 minutes (each submitting 1 quiz)
  - Ramp down: 1000 → 0 over 2 minutes

- [ ] **Success Criteria**
  - 0% error rate (all 1000 submissions succeed)
  - P95 latency: <500ms per endpoint
  - Database: <80% CPU, <80% connections
  - No timeouts or dropped connections

- [ ] **Results**
  - Load test report generated (includes graphs)
  - Stored in /load-test-results/

#### 8.5 Mobile Responsiveness Tests
- [ ] **Breakpoints Tested**
  - 320px (iPhone SE)
  - 375px (iPhone 12)
  - 768px (iPad)
  - 1024px (Desktop)

- [ ] **Elements Checked**
  - Text readable (no cutoff)
  - Buttons clickable (≥44×44px)
  - Forms stack vertically (mobile)
  - Images scale proportionally
  - No horizontal scroll on mobile

- [ ] **Tools**
  - Chrome DevTools responsive mode
  - Real device testing (2+ iPhones, 1+ Android)

#### 8.6 Accessibility Tests
- [ ] **WCAG 2.1 Level AA Compliance**
  - Tool: axe-core + Lighthouse
  - Color contrast: ≥4.5:1 (normal text)
  - Keyboard navigation: Tab through all interactive elements
  - Screen reader: all labels present, semantic HTML

- [ ] **Manual Testing**
  - Test with NVDA (Windows) and VoiceOver (Mac)
  - Test with keyboard only (no mouse)
  - Verify focus indicators visible

- [ ] **Issues Found → Fixed**
  - All issues documented + fixed before launch

#### 8.7 Security Tests (via Security Agent)
- [ ] **OWASP Top 10 Scan**
  - Tool: OWASP ZAP or Burp Suite Community
  - Scope: All quiz endpoints
  - Report: generated + documented

- [ ] **Manual Testing**
  - SQL injection payloads tested
  - XSS payloads tested
  - CSRF token validation tested
  - Rate limiting tested

#### 8.8 Test Maintenance
- [ ] **CI/CD Integration**
  - Tests run on every push (GitHub Actions)
  - Fail build if tests don't pass
  - Coverage report generated + uploaded to artifact

- [ ] **Test Data**
  - Fixtures: sample students, instructors, quizzes
  - Factories: auto-generate test data
  - Database reset after each test (test isolation)

### Sign-Off
**Testing Agent declares "DONE" when:** 80%+ coverage achieved + all integration tests pass + E2E tests on staging pass + load test verified 1000 concurrent users + accessibility tests pass.

---

## 9️⃣ DOCUMENTATION AGENT — 📚

### Responsibility
Write all user-facing and developer documentation. Ensure every feature is documented.

### Acceptance Criteria

#### 9.1 API Documentation
- [ ] **OpenAPI/Swagger Specification**
  - Document all 12 endpoints (path, method, params, response)
  - Include request/response examples
  - Specify error codes + messages
  - Mark endpoints with auth requirements (student/instructor)

- [ ] **Postman Collection**
  - Export from OpenAPI spec OR create manually
  - Include all 12 endpoints
  - Environment variables: base_url, auth_token
  - Pre-configured requests (ready to run)
  - Export: `.json` file for import into Postman

- [ ] **Deployment**
  - OpenAPI spec published to: `/docs/api.json`
  - Swagger UI (interactive): `/docs/api`
  - Postman collection link in README

#### 9.2 User Guides
- [ ] **Student Guide (2-3 pages)**
  - Title: "Student Guide to DailyAgile Quizzes"
  - Topics:
    1. Getting Started (login, dashboard)
    2. Taking a Quiz (code entry, answering, timer, review)
    3. Viewing Results (score, certificate badge)
    4. Requesting an Extension (when, how, approval process)
    5. Troubleshooting (common errors)
  - Format: PDF or markdown (published as HTML)
  - Includes: screenshots, examples, tone is helpful + encouraging

- [ ] **Instructor Guide (3-4 pages)**
  - Title: "Instructor Guide to DailyAgile Quizzes"
  - Topics:
    1. Getting Started (account creation via CSV)
    2. Creating a Quiz (form walkthrough, question types)
    3. Assigning Quizzes (to courses or individual students)
    4. Viewing Results (table, filtering, exporting CSV)
    5. Student Details (viewing individual answers)
    6. Approving Extensions (workflow, communication)
    7. Troubleshooting (common errors)
  - Format: PDF or markdown (published as HTML)
  - Includes: screenshots, step-by-step instructions

- [ ] **Admin Guide (1-2 pages)**
  - Title: "Admin Guide: Bulk Importing Instructors"
  - Topics:
    1. CSV File Format (columns, required fields)
    2. Sample CSV (downloadable template)
    3. Upload Process (where to upload, validation)
    4. Troubleshooting (common upload errors)
  - Format: Markdown (published as HTML)

#### 9.3 Troubleshooting & FAQ
- [ ] **FAQ Document (1 page)**
  - 10-15 common questions + answers
  - Topics:
    - "I didn't receive the quiz code email"
    - "The timer ran out but I didn't submit"
    - "I got a score but expected higher"
    - "How do I request an extension?"
    - "Can I retake a quiz?"
    - "What if the quiz page won't load?"
  - Tone: helpful, reassuring
  - Includes: contact support if issue not resolved

#### 9.4 Database Schema
- [ ] **ER Diagram**
  - Visual: table relationships + keys
  - Format: PNG or SVG
  - Shows: tables, columns, relationships (FK arrows)

- [ ] **Table Descriptions (1-2 pages)**
  - Each table: name, purpose, columns + types
  - Example:
    ```
    Table: quizzes
    Purpose: Store instructor-created quizzes
    Columns:
    - id (UUID, PK): Unique identifier
    - instructor_id (UUID, FK): Who created this quiz
    - title (TEXT): Quiz title
    - assignment_code (TEXT, UNIQUE): 6-char code for students
    ...
    ```

#### 9.5 Architecture Overview
- [ ] **System Architecture (1 page)**
  - Diagram: Frontend → Backend → Database (boxes + arrows)
  - Description: data flow (student submits quiz → server saves response → calculates score)
  - Technology stack: Next.js, Node.js, Supabase, Vercel

- [ ] **Deployment Process (1 page)**
  - Diagram: git push → GitHub Actions → Test → Deploy to Staging/Prod
  - Steps: git commit → push → automated tests → manual approval → live

#### 9.6 Code Comments
- [ ] **Public Functions Documented**
  - JSDoc format (JavaScript/TypeScript)
  - Example:
    ```typescript
    /**
     * Calculate quiz score as percentage
     * @param {number} correctCount - Number of correct answers
     * @param {number} totalQuestions - Total questions in quiz
     * @returns {number} Score as percentage (0-100)
     */
    function calculateScore(correctCount, totalQuestions) { ... }
    ```

- [ ] **Complex Logic Commented**
  - Inline comments explaining "why", not "what"
  - Example: "Check deadline against server time, not client time (prevents cheating)"

#### 9.7 README
- [ ] **Project README (already exists, update with MVP content)**
  - Quick Start (how to set up locally)
  - API Documentation (link to OpenAPI)
  - User Guides (links to PDFs/markdown)
  - Architecture (link to diagram)
  - Deployment (link to process doc)
  - Support (how to report bugs, contact support)

#### 9.8 Help Pages (HTML)
- [ ] **In-App Help Pages**
  - `/help/create-quiz.html` (embeds Video 1)
  - `/help/take-quiz.html` (embeds Video 2)
  - `/help/request-extension.html` (embeds Video 3)
  - Each page: video + text guide + link to full guide PDF

### Sign-Off
**Documentation Agent declares "DONE" when:** API docs complete (OpenAPI + Postman) + user guides written + FAQ published + schema diagram drawn + all help pages live.

---

## 🔟 QA / LAUNCH AGENT — ✅

### Responsibility
Verify MVP is ready to launch. Conduct final testing. Coordinate launch activities.

### Acceptance Criteria

#### 10.1 Pre-Launch Testing (3-5 days before)
- [ ] **Staging Environment Final Check**
  - All 10 agents completed their work
  - All code merged to main branch
  - All tests passing (100% green)
  - Feature flags set correctly (all MVP flags ON)
  - Database migrations applied to staging

- [ ] **Real User Testing**
  - 5 real users (mix of students + instructors)
  - Each completes full workflow (create quiz → assign → take → see results)
  - Users provide feedback (survey or interview)
  - Critical bugs fixed, non-critical logged for post-launch

#### 10.2 Launch Checklist (Day 13-14)

**Technical Readiness:**
- [ ] All tests pass (CI/CD green)
- [ ] Database backups configured + tested
- [ ] Monitoring dashboards live (Sentry, Vercel, Supabase)
- [ ] Incident response plan documented (contacts, escalation, rollback steps)
- [ ] Rollback procedure tested (can revert in <5 mins)
- [ ] Feature flags set correctly for launch

**Content Readiness:**
- [ ] 3 videos uploaded to YouTube + embedded
- [ ] All documentation published (guides, FAQs, help pages)
- [ ] Email templates reviewed (quiz assigned, extension approval/rejection, etc.)
- [ ] In-app announcements written (dashboard banner, Slack message, LinkedIn post)

**Operational Readiness:**
- [ ] Support team trained (FAQ, common issues, escalation)
- [ ] Customer support email template ready
- [ ] Incident response contacts documented (CEO, Backend lead, DevOps lead)
- [ ] First-response SLA: <1 hour for critical issues

#### 10.3 Go/No-Go Decision
- [ ] **Checklist for Go/No-Go Meeting (Day 13)**
  - Organized by agent team:
    - Security Agent: "All vulnerabilities fixed ✅" or "X blockers remain"
    - Database Agent: "Migrations working, zero data loss ✅" or "X blockers remain"
    - DevOps Agent: "CI/CD live, one-click deploy ✅" or "X blockers remain"
    - Backend Agent: "All 12 endpoints tested ✅" or "X blockers remain"
    - Frontend Agent: "All pages responsive, accessible ✅" or "X blockers remain"
    - Feature Flags Agent: "All flags deployed, toggleable ✅" or "X blockers remain"
    - Video Agent: "3 videos embedded ✅" or "X blockers remain"
    - Testing Agent: "80%+ coverage, E2E pass ✅" or "X blockers remain"
    - Documentation Agent: "All docs live ✅" or "X blockers remain"
    - QA/Launch Agent: "Staging tested, real users approve ✅" or "X blockers remain"

- [ ] **Decision Document**
  - Status: GO or NO-GO
  - If NO-GO: list blockers + proposed fix + new launch date
  - If GO: proceed to launch announcement

#### 10.4 Launch Announcement
- [ ] **Email to Existing Students**
  - Subject: "New: Interactive Quizzes Now Live!"
  - Body: "Create quizzes, take quizzes, request extensions. Learn more at [link]"
  - Send via support@dailyagile.com (Gmail MCP)

- [ ] **In-App Announcement**
  - Dashboard banner (top): "🎉 New Quiz Feature Launched! Create and take interactive quizzes."
  - Banner visible for 2 weeks (then auto-hide)
  - Dismiss button (user can close)

- [ ] **Slack Announcement (#announcements)**
  - Message: "Quiz MVP shipped! 🚀 Instructors can now create quizzes, students can take them. [Help docs link]"

- [ ] **LinkedIn Post (organic)**
  - Post: "Excited to launch interactive quiz system in DailyAgile! Students can now take quizzes with real-time feedback, instructors can see results. Accelerate Business Agility. [link]"
  - Hashtags: #edtech #ai #agile #learning

#### 10.5 Post-Launch Monitoring (Day 1-7)
- [ ] **Hour 1 (Critical Monitoring)**
  - Backend team on standby
  - Monitor: error rate, response times, database connections
  - Alert threshold: error rate >1% (immediate investigation)

- [ ] **Day 1 Metrics**
  - # of quizzes created: target ≥3
  - # of student quiz submissions: target ≥50
  - Error rate: target <0.1%
  - P95 latency: target <200ms
  - User feedback collected (emails, surveys)

- [ ] **Day 3-7**
  - Continue monitoring
  - Fix any critical bugs (same day)
  - Collect user feedback daily
  - Post daily standup summary (brief update to stakeholders)

- [ ] **Success Criteria**
  - ✅ 3+ instructors created quizzes
  - ✅ 50+ student submissions
  - ✅ 0 critical bugs
  - ✅ Average quiz completion time 15-25 mins
  - ✅ 70%+ of students score ≥70% (passing rate)
  - ✅ 5+ extension requests (feature validation)

#### 10.6 Known Issues & Workarounds
- [ ] **Issue Log**
  - Any bugs found during real user testing: logged + prioritized
  - Critical (launch blocker): fixed before launch
  - High (severe degradation): fixed in launch hotfix (within 24h)
  - Medium (workaround available): fixed in next sprint (post-launch)
  - Low (cosmetic): added to backlog

#### 10.7 Post-Launch Backlog
- [ ] **Features NOT in MVP (documented for future)**
  - Analytics dashboard (quiz performance trends)
  - LMS integrations (Canvas, Blackboard)
  - White-label branding
  - Advanced question types (essay, drag-drop)
  - Leaderboards / gamification
  - Live proctoring
  - AI-generated quiz suggestions

### Sign-Off
**QA/Launch Agent declares "DONE" when:** Real user testing passed + go/no-go decision made + launch announcement sent + post-launch monitoring active + success metrics being tracked.

---

---

## SIGN-OFF SUMMARY

**All 10 agents must sign off before MVP is considered COMPLETE:**

| Agent | Sign-Off Criteria | Status |
|-------|------------------|--------|
| 🔐 Security | All vulnerabilities fixed + OWASP Top 10 passed | Pending |
| 🗄️ Database | All tables created + indexed + migrations working | Pending |
| 🚀 DevOps | CI/CD live + feature flags deployed + monitoring active | Pending |
| 🔧 Backend | All 12 endpoints built + tested + <200ms latency | Pending |
| 🎨 Frontend | All 12 pages built + responsive + accessible | Pending |
| 🚩 Flags | All 9 flags deployed + toggleable + logged | Pending |
| 📹 Video | 3 videos uploaded to YouTube + embedded + captions accurate | Pending |
| 🧪 Testing | 80%+ coverage + E2E tests pass + load tested | Pending |
| 📚 Docs | API docs + user guides + FAQ + schema diagram complete | Pending |
| ✅ QA/Launch | Real user testing done + go/no-go approved + launch live | Pending |

**Overall MVP Status:** ▓▓▓░░░░░░░░ 30% (Specification + Video Scripts complete, Agent work starting)

---

*Acceptance Criteria document created: Sprint Day 1*  
*Last Updated: Sprint Day 1*  
*All agents: Begin work on your assigned tasks. Report daily status at 9:00 AM.*

