# Quiz Feature — Phase 2: ILT (Instructor-Led Training) Implementation Plan (REVISED)

**Date:** August 6, 2026  
**Status:** 🎯 Planning Phase — REVISED Based on Multi-Perspective Review  
**Target Launch:** 6-8 weeks (revised from 4-6 weeks)

---

## 📋 Executive Summary

Phase 2 extends the quiz system with instructor-facing tools required for classroom management and assessment tracking. This enables real-time monitoring, bulk content import, and detailed performance analytics needed for Instructor-Led Training (ILT) courses.

**Based on comprehensive review from Student, Teacher, Technical Architect, and Database Administrator perspectives, this plan now includes critical security, compliance, and infrastructure requirements that were initially underspecified.**

**Phase 2 Scope (Revised):**
- Student roster management (add/import students)
- Quiz submission persistence (database storage)
- Gradebook & grade export (CSV)
- Real-time progress monitoring dashboard ⭐ **[REQUIRES INFRASTRUCTURE SPIKE]**
- Instructor controls (pause, unlock, view live answers)
- Per-student performance reports
- **[NEW] Complete RLS security policies**
- **[NEW] GDPR compliance (audit logging, data export/deletion)**
- **[NEW] Data validation constraints**

**Estimated Effort:** 6-8 weeks (revised from 4-6)  
**Tech Stack:** TypeScript, Next.js 15, Supabase (database), React  
**Critical Path Item:** WebSocket infrastructure validation (Week 1)

---

## ⚠️ Review Findings Summary

### Ratings from Multi-Perspective Review
| Perspective | Rating | Main Concern |
|---|---|---|
| **Student** | 6.5/10 | Surveillance anxiety; needs transparency & opt-in |
| **Teacher** | 7/10 | No student-facing features; missing communication tools |
| **Technical Architect** | 6/10 | WebSocket on serverless won't scale; real-time untested |
| **Database Administrator** | 6/10 | RLS incomplete; cost explosion; GDPR gaps |

### Critical Issues Addressed in This Revision

**1. Real-Time Infrastructure Risk (Architect & DBA Consensus)**
- Original plan: WebSocket on Vercel serverless
- Problem: Won't scale to 1000+ concurrent users (500 msg/sec = 6K queries/sec)
- **Supabase Pro API limit: 50K queries/day** — current approach would exceed budget
- **Revised approach:** Implement PostgreSQL LISTEN/NOTIFY or dedicated Socket.io backend
- **Action:** 1-week infrastructure spike before Tier 2 commitment

**2. Data Security Gaps (DBA & Architect)**
- Original plan: Basic RLS policies mentioned only for `classrooms` table
- Problem: No policies for sensitive tables (`quiz_answers`, `quiz_submissions`, `instructor_sessions`)
- Risk: Multi-tenant data isolation failure if app-layer auth fails
- **Revised approach:** Comprehensive RLS testing + security audit before launch
- **Action:** Allocate 1 week pre-launch security review

**3. Student Experience Gaps (Student & Teacher Reviews)**
- Original: Instructor-centric, no student-facing dashboard
- Problem: Students can't see their progress; real-time monitoring feels like surveillance
- Teacher feedback: "Hold adoption until Phase 2.2 ships with student features"
- **Revised approach:** Phase 2 focused on instructor needs; Phase 2.2 (separate doc) covers student features
- **Action:** Plan Phase 2.2 immediately (see separate document)

**4. Database Transaction & Consistency Issues (DBA)**
- Problem: Quiz submission requires multi-step transaction; no isolation level specified
- Risk: Race conditions if 2 students submit simultaneously
- **Revised approach:** Define transaction isolation levels; add CHECK constraints
- **Action:** Add constraint validation to database schema

**5. GDPR Compliance Missing (DBA)**
- Problem: No audit logging, no data export/deletion endpoints
- Risk: Regulatory violation if institution is in EU/UK
- **Revised approach:** Implement from Day 1, not Phase 3
- **Action:** Add audit_logs table; implement /api/students/:id/data-export

**6. CSV Import Performance (Architect)**
- Problem: Client-side parsing of 10K rows blocks UI, exhausts memory
- **Revised approach:** Server-side async processing with streaming validation
- **Action:** Move CSV processing to background job (defer Tier 3 → later phase)

---

## 🏗️ Architecture Overview

### Current State (Phase 1)
```
┌─────────────────────────────────────┐
│  Quiz UI (Student-facing)           │
│  ├─ Quiz Form (create questions)    │
│  ├─ Quiz View (take quiz)           │
│  └─ Results (localStorage)          │
└──────────────┬──────────────────────┘
               │
        ┌──────▼──────────┐
        │  localStorage   │
        │  + File Storage │
        │  (classroom)    │
        └─────────────────┘
```

### Phase 2 Architecture (REVISED)
```
┌─────────────────────────────────────────────────────────────────┐
│                  OpenMAIC System (Phase 2 - REVISED)            │
├──────────────────────────┬──────────────────────────────────────┤
│   Student Features       │   Instructor Features                │
│  ┌────────────────────┐  │  ┌──────────────────────────────────┐ │
│  │ Quiz Taking        │  │  │ Classroom Mgmt Dashboard         │ │
│  │ Offline Mode       │  │  │ ├─ Student Roster (add/import)   │ │
│  │ Results (in DB)    │  │  │ ├─ Real-time Progress Monitor    │ │
│  └────────────────────┘  │  │ ├─ Grade Export (CSV)            │ │
│                          │  │ ├─ Per-Student Reports           │ │
│                          │  │ ├─ Lock/Pause Controls           │ │
│  [Phase 2.2]             │  │ └─ Access Controls (RLS)          │ │
│  ├─ Progress Dashboard   │  │                                  │ │
│  ├─ View My Grades       │  │ [Phase 2.2 - Teacher]            │ │
│  └─ Quiz History         │  │ ├─ Quiz Import (CSV)             │ │
│                          │  │ ├─ Analytics Dashboard           │ │
│                          │  │ └─ Announcements/Messaging       │ │
│                          │  └──────────────────────────────────┘ │
├──────────────────────────┼──────────────────────────────────────┤
│          API Layer (Phase 2 additions + Security)                │
│  Instructor APIs:                                                │
│  ├─ POST /classrooms/:id/students (add single)                  │
│  ├─ POST /classrooms/:id/students/bulk-import (CSV upload)      │
│  ├─ GET /classrooms/:id/students (roster with filters)          │
│  ├─ POST /classrooms/:id/instructor-session (start monitoring)  │
│  ├─ GET /classrooms/:id/instructor-session/:id/progress (live)  │
│  ├─ POST /classrooms/:id/quiz/:id/lock (pause quiz)             │
│  ├─ GET /classrooms/:id/gradebook (export CSV)                  │
│  ├─ GET /classrooms/:id/students/:id/report (per-student)       │
│  │                                                               │
│  NEW - Compliance & Security:                                    │
│  ├─ GET /students/:id/data-export (GDPR data portability)       │
│  ├─ DELETE /students/:id/data (GDPR right to be forgotten)      │
│  ├─ GET /classrooms/:id/audit-logs (access logging)             │
│  │                                                               │
│  Existing: /api/quiz-grade (AI grading), POST quiz-submissions  │
├──────────────────────────┼──────────────────────────────────────┤
│         Database Layer (NEW - Supabase PostgreSQL + RLS)         │
│  Core Tables:                                                    │
│  ├─ classrooms                 (instructor + settings)           │
│  ├─ students                   (email, name, ID)                │
│  ├─ student_rosters            (enrollment tracking)            │
│  ├─ quiz_submissions           (answers, scores)                │
│  ├─ quiz_answers               (individual answers + feedback)  │
│  │                                                               │
│  NEW - Security & Compliance:                                    │
│  ├─ instructor_sessions        (monitoring sessions)            │
│  ├─ audit_logs                 (data access logging) [NEW]       │
│  └─ RLS policies               (all tables) [ENHANCED]           │
├──────────────────────────┼──────────────────────────────────────┤
│    Real-Time Layer (REVISED - Needs Infrastructure Spike)        │
│  ❌ Avoid: Vercel serverless WebSocket                          │
│  ✅ Use: Supabase Realtime (LISTEN/NOTIFY) OR Socket.io backend │
│    Load capacity: 1000+ concurrent connections                  │
│    Message rate: 500 msg/sec (30 students × 100 instructors)    │
│    Cost model: Validated before Tier 2 commitment                │
└──────────────────────────┴──────────────────────────────────────┘
```

---

## 🗄️ Database Schema Design (REVISED)

### 1. Core Tables

#### `classrooms` (extends existing)
```sql
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructor_id UUID NOT NULL,
  access_code VARCHAR(20) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (instructor_id) REFERENCES auth.users(id)
);

-- Critical indexes for performance
CREATE INDEX idx_classrooms_instructor ON classrooms(instructor_id);
CREATE INDEX idx_classrooms_access_code ON classrooms(access_code);
```

#### `students` (NEW)
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  student_id VARCHAR(255) UNIQUE,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_students_email ON students(email);
```

#### `student_rosters` (NEW)
```sql
CREATE TABLE student_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL,
  student_id UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'student',
  enrollment_date TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(classroom_id, student_id)
);

-- Critical indexes
CREATE INDEX idx_rosters_classroom ON student_rosters(classroom_id);
CREATE INDEX idx_rosters_classroom_status ON student_rosters(classroom_id, status);
CREATE INDEX idx_rosters_enrollment ON student_rosters(enrollment_date);
```

#### `quiz_submissions` (NEW - WITH CONSTRAINTS)
```sql
CREATE TABLE quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL,
  student_id UUID NOT NULL,
  scene_id VARCHAR(255) NOT NULL,
  quiz_id VARCHAR(255) NOT NULL,
  submitted_at TIMESTAMP,
  completed_at TIMESTAMP,
  score DECIMAL(10,2),
  max_score DECIMAL(10,2),
  percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN max_score > 0 THEN ROUND((score / max_score * 100)::NUMERIC, 2) ELSE NULL END
  ) STORED,
  status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  -- Constraint: score never exceeds max_score
  CHECK (score IS NULL OR max_score IS NULL OR score <= max_score)
);

-- Critical composite indexes for dashboard queries
CREATE INDEX idx_submissions_classroom ON quiz_submissions(classroom_id);
CREATE INDEX idx_submissions_student ON quiz_submissions(student_id);
CREATE INDEX idx_submissions_classroom_student ON quiz_submissions(classroom_id, student_id);
CREATE INDEX idx_submissions_classroom_submitted ON quiz_submissions(classroom_id, submitted_at DESC);
CREATE INDEX idx_submissions_status ON quiz_submissions(status);
```

#### `quiz_answers` (NEW - WITH CONSTRAINTS)
```sql
CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL,
  question_id VARCHAR(255) NOT NULL,
  question_text TEXT,
  user_answer TEXT,
  correct_answer TEXT,
  is_correct BOOLEAN,
  points_earned DECIMAL(10,2),
  max_points DECIMAL(10,2),
  feedback TEXT,
  question_type VARCHAR(50) CHECK (question_type IN ('single', 'multiple', 'short_answer')),
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (submission_id) REFERENCES quiz_submissions(id) ON DELETE CASCADE,
  CHECK (points_earned IS NULL OR max_points IS NULL OR points_earned <= max_points)
);

CREATE INDEX idx_answers_submission ON quiz_answers(submission_id);
CREATE INDEX idx_answers_question ON quiz_answers(question_id);
```

#### `instructor_sessions` (NEW)
```sql
CREATE TABLE instructor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL,
  instructor_id UUID NOT NULL,
  session_start TIMESTAMP DEFAULT NOW(),
  session_end TIMESTAMP,
  session_type VARCHAR(50) DEFAULT 'live',
  quiz_being_monitored VARCHAR(255),
  student_visibility BOOLEAN DEFAULT true,
  is_quiz_locked BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_classroom ON instructor_sessions(classroom_id);
CREATE INDEX idx_sessions_instructor ON instructor_sessions(instructor_id);
CREATE INDEX idx_sessions_active ON instructor_sessions(session_end) WHERE session_end IS NULL;
```

#### `audit_logs` (NEW - GDPR COMPLIANCE)
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL, -- 'quiz_submission', 'student_roster', etc.
  resource_id VARCHAR(255),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index for audit trail queries and GDPR data requests
CREATE INDEX idx_audit_classroom ON audit_logs(classroom_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

### 2. Row Level Security (RLS) Policies - COMPLETE SPECIFICATION

```sql
-- Enable RLS on all tables
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Classrooms: Instructors can only access their own
CREATE POLICY "instructors_manage_own_classrooms"
  ON classrooms FOR ALL
  USING (auth.uid() = instructor_id)
  WITH CHECK (auth.uid() = instructor_id);

-- Students enrolled in a classroom can view it
CREATE POLICY "students_view_enrolled_classrooms"
  ON classrooms FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM student_rosters
    WHERE student_rosters.classroom_id = classrooms.id
    AND student_rosters.student_id = auth.uid()
    AND student_rosters.status = 'active'
  ));

-- Student Rosters: Only instructor of the classroom can manage
CREATE POLICY "instructor_manage_roster"
  ON student_rosters FOR ALL
  USING (EXISTS (
    SELECT 1 FROM classrooms
    WHERE classrooms.id = student_rosters.classroom_id
    AND classrooms.instructor_id = auth.uid()
  ));

-- Quiz Submissions: Student can see own; Instructor can see class
CREATE POLICY "student_view_own_submissions"
  ON quiz_submissions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "instructor_view_class_submissions"
  ON quiz_submissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM classrooms
    WHERE classrooms.id = quiz_submissions.classroom_id
    AND classrooms.instructor_id = auth.uid()
  ));

-- Quiz Answers: Inherit submission permissions
CREATE POLICY "student_view_own_answers"
  ON quiz_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM quiz_submissions
    WHERE quiz_submissions.id = quiz_answers.submission_id
    AND quiz_submissions.student_id = auth.uid()
  ));

CREATE POLICY "instructor_view_class_answers"
  ON quiz_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM quiz_submissions
    JOIN classrooms ON classrooms.id = quiz_submissions.classroom_id
    WHERE quiz_submissions.id = quiz_answers.submission_id
    AND classrooms.instructor_id = auth.uid()
  ));

-- Instructor Sessions: Only the instructor can see their own
CREATE POLICY "instructor_view_own_sessions"
  ON instructor_sessions FOR ALL
  USING (auth.uid() = instructor_id);

-- Audit Logs: Instructor can view logs for their classrooms; users can see their own access
CREATE POLICY "instructor_view_classroom_audit"
  ON audit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM classrooms
    WHERE classrooms.id = audit_logs.classroom_id
    AND classrooms.instructor_id = auth.uid()
  ));

CREATE POLICY "user_view_own_access_logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = actor_id);
```

---

## ⚡ Infrastructure Decisions (REVISED - Week 1 Priority)

### WebSocket Architecture Decision Required (BEFORE Tier 2)

**Problem:** Real-time monitoring dashboard needs <2s latency for 1000 concurrent users.

**Option A: Supabase Realtime (RECOMMENDED for MVP)**
- Uses PostgreSQL LISTEN/NOTIFY
- Pros: No separate infrastructure, included with Supabase, scales to 1000+ connections
- Cons: Limited to 1000 concurrent connections (sufficient for MVP)
- Cost: Included in Supabase Pro (~$25-50/mo)
- Timeline: 3-5 days to implement

**Option B: Socket.io on Dedicated Server**
- Pros: Unlimited scalability, full control, proven at scale
- Cons: Requires ops overhead, additional server cost ($50-200/mo)
- Cost: Server + monitoring + ops
- Timeline: 1-2 weeks to implement + testing

**Option C: Vercel WebSocket (NOT RECOMMENDED)**
- ❌ Serverless architecture not designed for persistent connections
- ❌ Will hit rate limits at 500 msg/sec
- ❌ Cost explosion (estimated $500+/mo at scale)

**Recommendation:** Start with Option A (Supabase Realtime). Migrate to Option B only if we exceed 1000 concurrent users.

**Action Items (Week 1):**
1. ☐ Decision meeting: Select WebSocket approach (2 hours)
2. ☐ Load test selected approach (3000 messages/sec, 1000 connections)
3. ☐ Prototype real-time dashboard with selected tech
4. ☐ Cost validation + budget approval

---

## 🔒 Security & Compliance Requirements (NEW)

### Pre-Launch Security Audit (1 Week)
- [ ] RLS policy testing (all tables, all scenarios)
- [ ] Authorization testing (students can't see other students' data)
- [ ] API endpoint testing (invalid tokens rejected)
- [ ] JWT token validation over WebSocket
- [ ] Third-party security scan (OWASP top 10)

### GDPR Compliance (Mandatory for EU/UK Students)
- [x] Audit logging table (`audit_logs`)
- [x] Data export endpoint: `GET /students/:id/data-export`
- [x] Data deletion endpoint: `DELETE /students/:id/data`
- [ ] Data retention policy (document in settings)
- [ ] Consent management (students opt-in to monitoring)

### Data Validation Constraints
- [x] ENUM types for status fields (not VARCHAR)
- [x] CHECK constraints: `score <= max_score`
- [x] NOT NULL constraints on foreign keys
- [x] Decimal precision: DECIMAL(10,2) for scores
- [x] Percentage calculated by database (GENERATED ALWAYS)

---

## 📅 Revised Implementation Timeline

### Week 1: Infrastructure & Security Foundations
```
Mon-Tue: Decision & Planning
  ├─ WebSocket architecture decision meeting (Realtime vs Socket.io)
  ├─ Security review checklist setup
  └─ Database schema finalization

Wed-Thu: Infrastructure Validation
  ├─ Set up Supabase project
  ├─ Load test WebSocket approach (1000 connections)
  ├─ Complete RLS policies (all tables)
  └─ Design audit logging

Fri: Schema Implementation
  ├─ Run database migrations
  ├─ Create all indexes
  ├─ Deploy RLS policies
  └─ Verify constraints & data validation
```

### Week 2: Tier 1 MVP - Core Roster & Submissions
```
Mon-Tue: Roster API Development
  ├─ POST /classrooms/:id/students (add single)
  ├─ GET /classrooms/:id/students (list)
  ├─ Tests: Unit + E2E

Wed-Thu: Bulk Import
  ├─ CSV parsing (server-side, NOT client-side)
  ├─ POST /classrooms/:id/students/bulk-import
  ├─ Validation preview + error handling
  └─ Tests: CSV parsing, duplicate detection

Fri: Polish & Testing
  ├─ Error handling review
  ├─ Integration tests
  └─ Performance testing (100 student import)
```

### Week 3: Submission Storage & Grading
```
Mon-Tue: Quiz Submission API
  ├─ POST /classrooms/:id/quiz-submissions (store answers)
  ├─ GET /classrooms/:id/quiz-submissions/:id (retrieve)
  ├─ Database migration for Phase 1 data

Wed-Thu: Gradebook & Export
  ├─ GET /classrooms/:id/gradebook (CSV export)
  ├─ GET /classrooms/:id/students/:id/report (per-student)
  └─ UI: ReportCard, GradebookTable

Fri: Testing & Validation
  ├─ Export file format validation
  ├─ Data accuracy checks
  ├─ Performance on 10K submissions
```

### Week 4: Tier 2 - Real-Time Monitoring
```
Mon-Tue: WebSocket Connection & Live Stats
  ├─ POST /classrooms/:id/instructor-session (start session)
  ├─ WebSocket message routing (LISTEN/NOTIFY)
  ├─ Live stats aggregation (fast queries)

Wed-Thu: Instructor Dashboard
  ├─ InstructorDashboard component
  ├─ QuizLiveStats component
  ├─ StudentProgressTable (real-time updates)

Fri: Lock/Pause Feature
  ├─ POST /classrooms/:id/quiz/:id/lock
  ├─ WebSocket broadcast to students
  ├─ Test quiz state persistence
```

### Week 5: Testing & Optimization
```
Mon-Tue: Load Testing
  ├─ 100 concurrent students + 10 instructors
  ├─ WebSocket connection stability (>99.5%)
  ├─ Database query performance

Wed-Thu: Security Testing
  ├─ RLS policy verification
  ├─ Authorization boundary testing
  ├─ Audit logging validation

Fri: Performance Optimization
  ├─ Database query optimization
  ├─ Index effectiveness validation
  ├─ Caching strategy tuning
```

### Week 6: Documentation & Launch Prep
```
Mon-Tue: Documentation
  ├─ API documentation (OpenAPI/Swagger)
  ├─ Database schema documentation
  ├─ RLS policies explanation

Wed-Thu: Launch Checklist
  ├─ Final security audit
  ├─ Environment variables configured
  ├─ Monitoring/alerting set up
  ├─ Rollback plan documented

Fri: Soft Launch
  ├─ Deploy to staging
  ├─ Final E2E testing
  ├─ Deploy to production
```

### Week 7-8: Monitoring & Phase 2.2 Planning (If Needed)
```
Mon-Tue: Production Monitoring
  ├─ Error rate tracking
  ├─ WebSocket stability monitoring
  ├─ Database performance metrics

Wed-Fri: Phase 2.2 Kickoff (See separate document)
  ├─ Student progress dashboard
  ├─ Announcements/messaging
  ├─ Quiz scheduling & availability windows
```

**Total:** 6-8 weeks (more realistic than original 4-6)

---

## 💰 Cost Estimate (REVISED)

| Item | Cost | Notes |
|------|------|-------|
| **Supabase Pro** | $25-50/mo | Handles 1-10M rows, 50K API calls/day |
| **WebSocket Infrastructure** | Free (Realtime) or $50-200 (Socket.io) | Included if using Supabase Realtime |
| **Email Service** (optional) | Free-$20/mo | Use Supabase auth emails or SendGrid |
| **Monitoring** (optional) | Free | Vercel + Supabase built-in analytics |
| **Development Time** | ~$12K-16K | 200-240 hours @ $60-80/hr |
| **Security Audit** (contractor) | ~$2K-3K | 20-40 hours for pre-launch review |
| **Load Testing** (infrastructure) | ~$200 | Temporary server for load test |
| **TOTAL (Month 1)** | ~$27-75 + dev | Scales with users |

---

## 🎯 Go-Live Checklist (REVISED)

### Pre-Launch Security (Week 5)
- [ ] RLS policies tested on all tables (security audit)
- [ ] Authorization boundary testing complete
- [ ] Audit logging functional and tested
- [ ] Data export endpoint working
- [ ] Token validation over WebSocket
- [ ] OWASP top 10 scan passed

### Pre-Launch Performance (Week 5)
- [ ] Load test: 100 students + 10 instructors completed
- [ ] WebSocket: 1000 connections, <2s latency verified
- [ ] Database: 10K submissions, query <500ms p99
- [ ] CSV import: 1000 students in <30 seconds

### Pre-Launch Data (Week 6)
- [ ] Phase 1 data migration verified (count checks)
- [ ] Rollback procedure documented and tested
- [ ] Backup strategy configured in Supabase
- [ ] Data retention policy defined

### Launch Day (Week 6)
- [ ] All environment variables configured in Vercel
- [ ] RLS policies deployed to production
- [ ] Monitoring & alerting configured
- [ ] Error rate alert threshold set to >1%
- [ ] Team on standby for first 24 hours

### Post-Launch Monitoring (Week 7)
- [ ] Error rate tracking (target: <0.1%)
- [ ] WebSocket connection stability (target: >99.5%)
- [ ] API response time (target: <500ms p99)
- [ ] Database storage growth (alert at 70% of quota)
- [ ] Daily sync with team: issues, performance, adoption

---

## 🚨 Critical Risks & Mitigations (REVISED)

| Risk | Severity | Mitigation | Owner |
|------|----------|-----------|-------|
| **WebSocket architecture fails at scale** | 🔴 High | Spike in Week 1; load test before Tier 2 | Tech Lead |
| **RLS policies have gaps** | 🔴 High | Security audit + manual testing Week 5 | DBA |
| **Real-time queries bankrupt costs** | 🔴 High | Use LISTEN/NOTIFY, NOT REST API | Architect |
| **GDPR data export not working** | 🟠 Medium | Implement Week 2, test continuously | Backend Dev |
| **CSV import blocks UI** | 🟠 Medium | Server-side parsing + job queue | Backend Dev |
| **Race conditions on concurrent submissions** | 🟠 Medium | Transaction testing Week 3 | DBA |
| **Student privacy breach** | 🔴 High | RLS from Day 1, audit logging | DBA |
| **Data migration loses submissions** | 🟠 Medium | Verify counts; rollback plan | DevOps |
| **Merge conflicts between features** | 🟡 Low | Code review process, feature branches | Tech Lead |

---

## 📊 Success Metrics

### Technical Metrics (Week 7)
- ✅ WebSocket uptime: >99.5%
- ✅ API response time p99: <500ms
- ✅ Database query p99: <200ms
- ✅ Error rate: <0.1%
- ✅ RLS test coverage: 100%

### Adoption Metrics (Week 8)
- ✅ Instructor adoption: >60%
- ✅ Classrooms with rosters: >70%
- ✅ Quiz submissions: >500
- ✅ Export usage: >40%
- ✅ System uptime: 99.9%

---

## 📞 Next Steps

### This Week (Aug 6-10)
1. ☐ Review this revised plan with team
2. ☐ Make WebSocket infrastructure decision
3. ☐ Create Supabase project
4. ☐ Schedule Week 1 infrastructure sprint

### Next Week (Aug 13)
1. ☐ Start Week 1: Database setup
2. ☐ Load test WebSocket approach
3. ☐ Begin Feature 1: Student roster

---

**Owner:** tkiran204@gmail.com  
**Last Updated:** August 6, 2026 (REVISED with multi-perspective feedback)  
**Review Status:** Ready for team kickoff meeting
