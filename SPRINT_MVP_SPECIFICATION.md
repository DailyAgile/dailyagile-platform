# DailyAgile Quiz MVP Specification
## 11-15 Day Rapid Sprint
**Owner:** Product Requirements & Coordination Agent  
**Sprint Dates:** Days 1-15  
**Target Launch:** Day 13-14  
**Last Updated:** Sprint Day 1

---

## 1. EXECUTIVE SUMMARY

**What:** Minimal Viable Product for DailyAgile quiz system — core instructor-led assessment workflow.  
**Who:** Instructors (create/assign quizzes) + Students (take quizzes, request extensions)  
**Why:** Validate market demand for interactive assessments before scaling to full LMS features.  
**Success Metric:** 3 instructors create 5+ quizzes, 50+ students complete submissions, zero critical bugs at launch.

---

## 2. MVP SCOPE — WHAT'S IN

### 2.1 STUDENT FLOWS (Core)
- ✅ **Authentication:** Email magic link (no password complexity)
  - Student receives: `dailyagile.com/auth?token=xyz123`
  - Auto-logs in, redirects to dashboard
  
- ✅ **Quiz Entry:** Enter assignment code → load quiz
  - Code format: `6-char alphanumeric (e.g., AB12CD)`
  - Quizzes load in sequence: question 1 → 2 → 3 etc.
  - Timer display (minutes:seconds remaining)
  
- ✅ **Quiz Taking:**
  - Question types: multiple-choice only (radio buttons)
  - Answer one question per page, "Next" button advances
  - Save answer locally (IndexedDB) — survives refresh
  - Timer enforces deadline (auto-submit at 0:00)
  
- ✅ **Results Submission:**
  - Student reviews answers before final submit
  - One-way: once submitted, no edit
  - Score displays immediately: "You scored 75% (15/20)"
  - Certificate badge for ≥70% (displays on results page)
  
- ✅ **Assignment Requests:**
  - "Request Extension" button on expired quiz
  - Form: reason (text) + new deadline preference
  - Submits to instructor inbox (via email + in-app notification)

### 2.2 INSTRUCTOR FLOWS (Core)
- ✅ **Authentication:** CSV bulk import only
  - Admin uploads CSV: `instructors.csv` with columns:
    - `email` | `first_name` | `last_name` | `cell_number` | `location` | `courses_they_teach`
  - Creates instructor accounts (password = temporary, reset on first login)
  - No self-signup (MVP — batch import only)
  
- ✅ **Quiz Creation:**
  - Dashboard: "Create Quiz" button → form
  - Fields: title, description, time_limit_minutes, course
  - Add questions: title + 4 options + mark correct answer
  - Bulk add via JSON upload (optional)
  - Save → gets unique assignment code
  
- ✅ **Quiz Assignment:**
  - Pick quiz from library
  - Set: due date + time
  - Assign to: course (all students) OR specific student list
  - Action: sends email + in-app notification to students with code
  
- ✅ **Results View:**
  - Table: Student | Score | % | Status (submitted/pending/overdue)
  - Filter: by score range, status, date range
  - Export CSV (student name, email, score, time_taken, timestamp)
  - Detail view per student: answers + instructor notes field

### 2.3 DATABASE SCHEMA (Minimal Set)

```sql
-- Existing from Phase 1 (use these)
users (students)
courses  
quiz_questions
quiz_attempts
quiz_responses

-- New for MVP:
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  title TEXT NOT NULL,
  description TEXT,
  assignment_code TEXT UNIQUE NOT NULL,
  time_limit_minutes INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quiz_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id),
  due_date TIMESTAMPTZ NOT NULL,
  assigned_to_course_id UUID REFERENCES courses(id),
  assigned_to_students JSONB, -- [student_ids] or null for whole course
  created_by_instructor_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE extension_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id),
  quiz_id UUID REFERENCES quizzes(id),
  reason TEXT NOT NULL,
  requested_new_deadline TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  instructor_notes TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quiz_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id),
  quiz_id UUID REFERENCES quizzes(id),
  score_percentage INT NOT NULL,
  time_taken_seconds INT,
  submitted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. MVP SCOPE — WHAT'S OUT

### 🚫 Explicitly OUT (post-launch backlog)
- ❌ Analytics dashboard (quiz performance trends, cohort analytics)
- ❌ LMS integrations (Canvas, Blackboard, Moodle)
- ❌ White-label branding (custom domain, CSS overrides)
- ❌ Question types beyond multiple-choice (essay, drag-drop, code, video)
- ❌ Peer review system
- ❌ Leaderboards / gamification
- ❌ Live proctoring / video monitoring
- ❌ AI-generated quiz suggestions
- ❌ A/B testing framework
- ❌ Advanced reporting (item analysis, discrimination index)
- ❌ Bulk student import (use CSV upload for instructors only, no student self-import)
- ❌ Integration with DailyAgile's ElevenLabs or Remotion video content (separate concern)
- ❌ Progress tracking across courses (only per-quiz results)
- ❌ Certificate PDFs (MVP: on-screen badge only)

---

## 4. FEATURE FLAGS (Built But Hidden)

All features ship behind flags — toggled by backend team. Allows instant A/B testing post-launch.

```typescript
// featuresFlags.ts
export const FLAGS = {
  // Student flags
  STUDENT_TIMER_DISPLAY: true,      // Show countdown timer
  STUDENT_REVIEW_BEFORE_SUBMIT: true, // Review page before final submit
  STUDENT_EXTENSION_REQUESTS: true,  // "Request Extension" button visible
  STUDENT_INSTANT_RESULTS: true,     // Show score immediately
  
  // Instructor flags
  INSTRUCTOR_BULK_UPLOAD: true,      // JSON question upload
  INSTRUCTOR_RESULTS_EXPORT: true,   // CSV download
  INSTRUCTOR_EXTENSION_APPROVAL: true, // Approve/reject UI
  INSTRUCTOR_STUDENT_NOTES: true,    // Feedback field per student
  
  // Platform flags
  MAGIC_LINK_AUTH: true,
  PWA_ENABLED: true,
  MAINTENANCE_MODE: false,
};
```

---

## 5. USER FLOWS (DETAILED)

### 5.1 Student Quiz Flow
```
1. Email arrives: "Quiz available: JavaScript Basics"
   └─ Link: dailyagile.com/quiz/enter-code
   
2. Student enters code: AB12CD
   └─ Backend validates code, loads quiz
   
3. Quiz UI loads:
   └─ Question 1 (60 mins remaining)
   ├─ Question text
   ├─ 4 radio button options
   ├─ "Next" button
   
4. Student answers Q1, clicks "Next"
   └─ Answer saved locally + sent to backend
   ├─ Question 2 loads (59 mins remaining)
   
5. After last question, "Review" page:
   └─ All answers listed
   ├─ "Edit" button per question (returns to that Q)
   ├─ "Submit Quiz" button
   
6. Student clicks "Submit"
   └─ Final answers locked to database
   ├─ Results page: "Score: 75% (15/20)"
   ├─ Certificate badge (if ≥70%)
   ├─ "Request Extension" button (if quiz expired)
   
7. Extension request (if needed):
   └─ Form: reason, preferred new deadline
   ├─ Submit → instructor email + in-app notification
   └─ "Your request sent. Instructor will respond within 24h."
```

### 5.2 Instructor Quiz Creation Flow
```
1. Instructor logs in (via CSV import)
   └─ Dashboard loads

2. Click "Create New Quiz"
   └─ Form opens:
   ├─ Title: "JavaScript Basics"
   ├─ Description: "Test your JS fundamentals"
   ├─ Course: [Dropdown: AI for Engineers]
   ├─ Time Limit: 60 minutes
   ├─ Save → gets code: AB12CD
   
3. Click "Add Questions"
   └─ Question builder:
   ├─ Q1 Title: "What is a closure?"
   ├─ Option A: "A programming language"
   ├─ Option B: "A function with access to outer scope variables" [CORRECT]
   ├─ Option C: "An error in JavaScript"
   ├─ Option D: "A deprecated feature"
   ├─ Save Q1 → Add Q2...
   
4. After 20 questions, click "Publish Quiz"
   └─ Quiz ready for assignment

5. Click "Assign This Quiz"
   └─ Form:
   ├─ Due Date: 2026-08-14 17:00
   ├─ Assign To: [All students in AI for Engineers]
   ├─ Send Invites → students get email with code
   
6. View Results
   └─ Table: Student | Score | Status | Time Taken
   ├─ Filter by score range (70-100%)
   ├─ Click student → see answers
   ├─ Add notes: "Excellent work on Q15-18"
   ├─ Export CSV
```

### 5.3 Mobile PWA Flow (Responsive)
```
1. Student on mobile, receives email link
   └─ Clicks link → auto-login → quiz loads
   
2. Quiz UI adapted for mobile:
   ├─ Full-width questions (single column)
   ├─ Large radio buttons (touch-friendly)
   ├─ Bottom navigation: [Previous] [Next] 
   ├─ Timer sticky at top
   
3. Student can lock screen, return later
   └─ Quiz state restored from IndexedDB
   ├─ Timer continues from server-side deadline
   ├─ Answer submission retries if offline initially
```

---

## 6. ACCEPTANCE CRITERIA BY AGENT

### 🔐 Security Agent
- ✅ Magic link tokens expire after 15 minutes
- ✅ Quiz codes are 6 chars, not enumerable (random, not sequential)
- ✅ Student can't edit quiz after submission (immutable records)
- ✅ Instructor can't see student email in assignment list (privacy)
- ✅ Extension requests don't expose quiz answers to students
- ✅ SQL injection + XSS + CSRF protection on all forms
- ✅ Rate limit: 5 quiz submissions per student per hour (prevent brute force)
- ✅ All vulnerabilities from OWASP Top 10 checked + documented

### 🗄️ Database Agent
- ✅ All tables created + migrations tested
- ✅ Indexes on: `quiz_code`, `student_id`, `quiz_id`, `submitted_at`
- ✅ Foreign key constraints enforced
- ✅ Data retention: quiz_attempts kept for 5 years (compliance)
- ✅ Backup strategy tested (Supabase automated backups)
- ✅ Zero data loss in deployment (rollback tested)
- ✅ Query performance: results table loads <500ms with 10K records

### 🚀 DevOps Agent
- ✅ CI/CD pipeline working (push → test → deploy to staging → manual approval → prod)
- ✅ One-click deploy: `npm run deploy:prod`
- ✅ Environment files: dev, staging, production (separated)
- ✅ Database migrations auto-run on deploy
- ✅ Feature flags can be toggled without redeploy
- ✅ Rollback capability tested (ability to revert in <5 mins)
- ✅ Monitoring: error tracking (Sentry), uptime dashboard

### 🔧 Backend Agent
- ✅ All 12 API endpoints built + tested
  1. POST `/auth/request-magic-link` — send email
  2. GET `/auth/verify?token=xyz` — login
  3. POST `/quiz/create` — instructor creates
  4. POST `/quiz/assign` — instructor assigns
  5. GET `/quiz/:code` — student loads quiz
  6. POST `/quiz/:code/answer` — submit single answer
  7. POST `/quiz/:code/submit` — final submit
  8. GET `/quiz/:id/results` — instructor sees results
  9. GET `/quiz/:id/results/:studentId` — detail view
  10. POST `/extension/request` — student requests extension
  11. POST `/extension/:id/approve` — instructor approves
  12. GET `/me/quizzes` — student sees assigned quizzes
- ✅ Response times: P95 <200ms
- ✅ Tested with 1000 concurrent students
- ✅ Error messages: clear, non-technical

### 🎨 Frontend Agent
- ✅ All pages built + responsive:
  1. Login page (email entry)
  2. Magic link verification page
  3. Student dashboard (assigned quizzes list)
  4. Quiz-taking UI (question + options + timer)
  5. Results page (score + badge)
  6. Extension request form
  7. Instructor dashboard (create/assign)
  8. Instructor results table
  9. Student detail view (answers)
  10. CSV export button
- ✅ Mobile responsive (tested on iPhone, Android)
- ✅ Accessibility: WCAG 2.1 AA (keyboard nav, screen reader tested)
- ✅ No console errors or warnings

### 🚩 Feature Flags Agent
- ✅ All 9 flags deployed + toggleable
- ✅ Flags fetched on app load from backend
- ✅ Re-fetch on manual toggle (no page refresh needed)
- ✅ Default values set (safe fallback if flag service down)
- ✅ Logging: what flags were active for each quiz attempt

### 📹 Video Agent
- ✅ 3 Remotion videos rendered to MP4
  1. "How to Create a Quiz" (60 sec)
  2. "How to Take a Quiz" (60 sec)
  3. "How to Request an Extension" (60 sec)
- ✅ Uploaded to YouTube (unlisted)
- ✅ Embedded in help pages
- ✅ Captions auto-generated (YouTube)

### 🧪 Testing Agent
- ✅ Unit tests: 80%+ coverage (all business logic)
- ✅ Integration tests: full quiz flow (create → assign → take → submit → extend)
- ✅ E2E tests: student + instructor journeys on staging
- ✅ Load test: 1000 concurrent quiz submissions
- ✅ Accessibility tests: axe-core + manual review
- ✅ Mobile tests: responsive breakpoints 320px, 768px, 1024px
- ✅ Security tests: OWASP Top 10 checklist passed

### 📚 Documentation Agent
- ✅ API documentation (OpenAPI spec + Postman collection)
- ✅ User guides:
  - Student guide: "How to take a quiz" (2 pages)
  - Instructor guide: "Create and assign quizzes" (3 pages)
- ✅ Admin guide: "Bulk import instructors" (1 page)
- ✅ Troubleshooting: FAQ + common errors
- ✅ Database schema diagram (ER diagram)
- ✅ Code comments: all public functions documented

### 🛡️ QA/Launch Agent
- ✅ Launch checklist completed (see Section 7 below)
- ✅ Staging environment tested by 5 real users
- ✅ Go/no-go decision documented
- ✅ Incident response plan (contacts, escalation, rollback procedure)
- ✅ Monitor dashboards live (Vercel, Supabase, Sentry)
- ✅ Customer support template ready (first-time support response)

---

## 7. LAUNCH CHECKLIST (Day 13-14)

### Pre-Launch (48 hours before)
- [ ] All tests pass (100% green in CI)
- [ ] Staging environment mirrors production exactly
- [ ] Database migrations tested on staging with rollback
- [ ] All 10 agents sign off (no blockers)
- [ ] Marketing copy finalized (emails, in-app messages)
- [ ] Support team briefed (knowledge base + FAQ)
- [ ] Customer incident response plan written
- [ ] Monitoring dashboards live (Sentry, Vercel, Supabase)

### Launch Day (Trigger)
- [ ] CEO/Owner approves launch (final sign-off)
- [ ] Backend team on standby for first hour
- [ ] Frontend team monitoring error logs
- [ ] Database team ready to fix data issues
- [ ] DevOps ready to rollback if needed
- [ ] Customer support ready (email + Slack)

### Announcement (Go-live)
- [ ] Email sent to existing ILT students: "Quiz beta now live"
- [ ] In-app banner on login: "New: Take quizzes & request extensions"
- [ ] Slack #announcements message (internal team)
- [ ] LinkedIn post (organic): "Excited to launch interactive quiz system"

### Post-Launch (Day 1-3)
- [ ] Monitor error rates (target: <0.1% 5xx errors)
- [ ] Monitor response times (target: P95 <200ms)
- [ ] Track adoption: # of quizzes created, # of submissions
- [ ] Collect 5+ user feedback points (Slack surveys)
- [ ] Fix any critical bugs within 2 hours
- [ ] Log all incidents (severity, resolution, time-to-fix)

### Success Metrics (First Week)
- ✅ 3+ instructors create quizzes
- ✅ 50+ student submissions
- ✅ 0 critical bugs in first 24h
- ✅ Average quiz completion time: 15-25 mins (as expected)
- ✅ 70%+ of students pass (score ≥70%)
- ✅ 5+ extension requests (shows feature is working)

---

## 8. DEFINITIONS & CONSTRAINTS

**Assignment Code:** 6-char alphanumeric, generated by backend, must be URL-safe (no special chars).  
**Quiz Timer:** Server-side countdown; client displays local countdown + queries server for truth every 30 seconds.  
**Magic Link:** Email token valid for 15 minutes, one-time use, invalidated after use.  
**Certificate Badge:** Displayed on results page if score ≥70%. PNG badge (DailyAgile branded), downloadable.  
**Extension Request:** Freezes student's ability to re-submit after deadline passes; instructor has 24h to respond.  
**Bulk Import:** CSV file, max 1000 rows, columns validated before import (no partial imports if validation fails).

---

## 9. KNOWN CONSTRAINTS

- **Browser support:** Chrome, Safari, Firefox (desktop + mobile), last 2 versions
- **Max quiz time:** 180 minutes (3 hours)
- **Max questions per quiz:** 100
- **Max options per question:** 4 (multiple-choice only, MVP scope)
- **Concurrent students per quiz:** 1000+ (load tested)
- **Data retention:** Quiz attempts kept 5 years (compliance), backups kept 30 days

---

## 10. SPRINT BOARD STRUCTURE

**Organized by agent team (10 columns):**

```
┌────────────┬────────────┬────────────┬────────────┬────────────┐
│ Security   │ Database   │ DevOps     │ Backend    │ Frontend   │
├────────────┼────────────┼────────────┼────────────┼────────────┤
│ 🔐 Token   │ 🗄️ Schema  │ 🚀 CI/CD   │ 🔧 Auth    │ 🎨 Login   │
│ expiry     │ created    │ pipeline   │ endpoint   │ page       │
│            │            │            │            │            │
│ 🔐 SQL     │ 🗄️ Indexes │ 🚀 Feature │ 🔧 Quiz    │ 🎨 Quiz UI │
│ injection  │ added      │ flags      │ endpoints  │            │
│            │            │            │            │            │
└────────────┴────────────┴────────────┴────────────┴────────────┘

┌────────────┬────────────┬────────────┬────────────┬────────────┐
│ Flags      │ Video      │ Testing    │ Docs       │ QA/Launch  │
├────────────┼────────────┼────────────┼────────────┼────────────┤
│ 🚩 Flag    │ 📹 How to  │ 🧪 Unit    │ 📚 API     │ ✅ Launch  │
│ deployment │ Create     │ tests      │ docs       │ checklist   │
│            │            │            │            │            │
│ 🚩 Toggle  │ 📹 How to  │ 🧪 E2E     │ 📚 User    │ ✅ Incident│
│ admin      │ Take       │ tests      │ guides     │ response   │
│            │            │            │            │            │
└────────────┴────────────┴────────────┴────────────┴────────────┘
```

---

## 11. DAILY STANDUP FORMAT (Days 1-15)

**Time:** 9:00 AM daily (async, reported by each agent)  
**Format:** Report in format:
```
[AGENT NAME]
✅ Completed yesterday:
  - Item 1
  - Item 2

🔄 In progress today:
  - Item 1 (60% done, on track)
  - Item 2 (40% done, on track)

🚫 Blocked by:
  - Dependency X waiting on [Agent Y]
  
⚡ Notes:
  - This specific concern
```

**Example (Backend Agent Day 3):**
```
[BACKEND]
✅ Completed:
  - Auth endpoints (POST /auth/request, GET /auth/verify)
  - Quiz load endpoint (GET /quiz/:code)
  
🔄 In progress:
  - Quiz answer submission (POST /quiz/:code/answer) — 70% done
  - Results table endpoint — blocked on DB schema
  
🚫 Blocked by:
  - Waiting on Database Agent to confirm quiz_scores schema
  
⚡ Notes:
  - Will need help from Testing Agent to set up mock data
  - May need rate-limit discussion with Security Agent
```

---

## 12. BLOCKERS & DEPENDENCIES

**Critical Path (must resolve by day 5):**
1. Database schema approved + tables created
2. Backend auth endpoint working (magic link tested)
3. Frontend login page accepting email

**Parallel Tracks (can happen simultaneously):**
- Video creation (can start day 1, no code dependencies)
- Documentation (can start day 1, uses designs from Frontend)
- Testing infrastructure (can start when backends are stubbed)

---

## 13. CONTACT & ESCALATION

**Product Owner:** tkiran204@gmail.com  
**Coordination Agent:** This document owner (daily updates)  
**On-Call (if critical bug on Day 1 launch):** DevOps + Backend teams

**Escalation Path:**
1. Agent reports blocker in standup
2. Coordination Agent reaches out to dependent agent same day
3. If unresolved by end of day, escalate to Product Owner
4. Product Owner makes trade-off decision (scope, timeline, quality)

---

## SIGN-OFF

**Created by:** Product Requirements & Coordination Agent  
**Date:** Sprint Day 1  
**Status:** ACTIVE — agents should begin work immediately  
**Next Update:** Daily standup summaries starting Day 2

---

*This document is the single source of truth for MVP scope. Any changes require written approval from Product Owner.*
