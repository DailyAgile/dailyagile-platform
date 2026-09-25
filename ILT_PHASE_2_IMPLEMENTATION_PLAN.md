# Quiz Feature — Phase 2: ILT (Instructor-Led Training) Implementation Plan

**Date:** August 6, 2026  
**Status:** 🎯 Planning Phase  
**Target Launch:** 4-6 weeks after Phase 1 MVP

---

## 📋 Executive Summary

Phase 2 extends the quiz system with instructor-facing tools required for classroom management and assessment tracking. This enables real-time monitoring, bulk content import, and detailed performance analytics needed for Instructor-Led Training (ILT) courses.

**Phase 2 Scope:**
- Student roster management (add/import students)
- Real-time progress monitoring dashboard
- CSV/Excel bulk import for quizzes
- Grade export and analytics
- Per-student performance reports
- Instructor controls (pause, unlock, view live answers)

**Estimated Effort:** 4-6 weeks  
**Tech Stack:** TypeScript, Next.js 15, Supabase (database), React

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

### Phase 2 Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                       OpenMAIC System (Phase 2)                 │
├──────────────────────────┬──────────────────────────────────────┤
│   Student Features       │   Instructor Features                │
│  ┌────────────────────┐  │  ┌──────────────────────────────────┐ │
│  │ Quiz Taking        │  │  │ Classroom Dashboard              │ │
│  │ Offline Mode       │  │  │ ├─ Student Roster                │ │
│  │ Results View       │  │  │ ├─ Real-time Progress            │ │
│  └────────────────────┘  │  │ ├─ Grade Analytics               │ │
│                          │  │ ├─ Performance Reports           │ │
│                          │  │ ├─ Quiz Management               │ │
│                          │  │ └─ Access Controls               │ │
│                          │  └──────────────────────────────────┘ │
├──────────────────────────┼──────────────────────────────────────┤
│                   API Layer (Phase 2 additions)                  │
│  ├─ /api/quiz-grade (existing)                                  │
│  ├─ /api/classrooms/:id/students (NEW)                          │
│  ├─ /api/classrooms/:id/progress (NEW)                          │
│  ├─ /api/classrooms/:id/export (NEW)                            │
│  ├─ /api/quizzes/import (NEW - CSV/Excel)                       │
│  └─ /api/classrooms/:id/reports (NEW)                           │
├──────────────────────────┼──────────────────────────────────────┤
│              Database Layer (NEW - Supabase)                     │
│  ├─ classrooms                                                  │
│  ├─ students                                                    │
│  ├─ student_rosters                                             │
│  ├─ quiz_submissions                                            │
│  ├─ quiz_answers                                                │
│  └─ instructor_sessions                                         │
└──────────────────────────┴──────────────────────────────────────┘
```

---

## 🗄️ Database Schema Design

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
```

#### `student_rosters` (NEW - junction table)
```sql
CREATE TABLE student_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL,
  student_id UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'student', -- 'student', 'teaching_assistant'
  enrollment_date TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'dropped', 'unenrolled'
  metadata JSONB DEFAULT '{}'::jsonb,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  UNIQUE(classroom_id, student_id)
);
```

#### `quiz_submissions` (NEW)
```sql
CREATE TABLE quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL,
  student_id UUID NOT NULL,
  scene_id VARCHAR(255) NOT NULL,
  quiz_id VARCHAR(255) NOT NULL,
  submitted_at TIMESTAMP,
  completed_at TIMESTAMP,
  score DECIMAL(5,2),
  max_score DECIMAL(5,2),
  percentage DECIMAL(5,2) GENERATED ALWAYS AS (CASE WHEN max_score > 0 THEN (score / max_score * 100) ELSE NULL END),
  status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'submitted', 'graded'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);
```

#### `quiz_answers` (NEW)
```sql
CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL,
  question_id VARCHAR(255) NOT NULL,
  question_text TEXT,
  user_answer TEXT,
  correct_answer TEXT,
  is_correct BOOLEAN,
  points_earned DECIMAL(5,2),
  max_points DECIMAL(5,2),
  feedback TEXT,
  question_type VARCHAR(50), -- 'single', 'multiple', 'short_answer'
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (submission_id) REFERENCES quiz_submissions(id) ON DELETE CASCADE
);
```

#### `instructor_sessions` (NEW)
```sql
CREATE TABLE instructor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL,
  instructor_id UUID NOT NULL,
  session_start TIMESTAMP DEFAULT NOW(),
  session_end TIMESTAMP,
  session_type VARCHAR(50) DEFAULT 'live', -- 'live', 'async'
  quiz_being_monitored VARCHAR(255),
  student_visibility BOOLEAN DEFAULT true,
  is_quiz_locked BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id),
  FOREIGN KEY (instructor_id) REFERENCES auth.users(id)
);
```

---

## 🎯 Feature Implementation Breakdown

### Feature 1: Student Roster Management

#### 1.1 Add Students Individually
- **UI Component:** `StudentRosterForm.tsx`
  - Input: Name, Email, Student ID (optional)
  - Validation: Email format, uniqueness per classroom
  - Action: Add to roster + send invite email

- **API:** `POST /api/classrooms/:classroomId/students`
  - Request: `{ name, email, studentId }`
  - Response: `{ id, email, name, enrollmentDate }`
  - Side effect: Send enrollment invite email

#### 1.2 Import Students from CSV
- **UI Component:** `StudentRosterImport.tsx`
  - File upload (CSV format)
  - Preview table showing parsed data
  - Validation preview (email format, duplicates)
  - Bulk import action

- **API:** `POST /api/classrooms/:classroomId/students/bulk-import`
  - Request: Form data with CSV file
  - Response: `{ imported: 45, failed: 2, errors: [...] }`
  - CSV Format:
    ```
    Email,Name,Student ID
    alice@example.com,Alice Johnson,STU001
    bob@example.com,Bob Smith,STU002
    ```

#### 1.3 View Roster
- **UI Component:** `StudentRosterTable.tsx`
  - Table: Name | Email | Student ID | Enrollment Date | Status | Actions
  - Filters: Status (active/dropped), Date range
  - Actions: Remove, Edit, Resend invite, View progress

- **API:** `GET /api/classrooms/:classroomId/students`
  - Query params: `?status=active&sort=name`
  - Response: `{ students: [...], count: 150, page: 1 }`

**Estimated Effort:** 1 week

---

### Feature 2: Quiz Import (CSV/Excel)

#### 2.1 CSV Format Definition
```csv
Question Type,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Points,Analysis
single,"What is AI?","Artificial Intelligence","Advanced Internet","Applied Informatics","None of above","A",1,"AI refers to simulated intelligence in machines"
multiple,"Which are LLM uses?","Chat","Image Generation","Code Completion","All above","A,C,D",2,"LLMs power multiple applications"
short_answer,"Explain supervised learning","[INSTRUCTOR GRADING]","","",,5,"Students should mention labeled training data"
```

#### 2.2 Import Workflow
- **UI Component:** `QuizImport.tsx`
  - File upload (CSV/XLSX)
  - Mapping wizard (match columns to question fields)
  - Preview: Show parsed questions
  - Validation: Detect missing required fields
  - Publish: Create quiz from imported data

- **API:** `POST /api/quizzes/import`
  - Request: Form data with file + classroomId
  - Response: `{ quizId, questionsCreated: 15, validation: { warnings: [...] } }`
  - Logic:
    1. Parse CSV/XLSX
    2. Validate structure
    3. Create QuizContent object
    4. Store in database
    5. Return quiz ID for linking to classroom

#### 2.3 Export Quiz as CSV
- **API:** `GET /api/classrooms/:classroomId/quizzes/:quizId/export`
  - Query param: `?format=csv|xlsx`
  - Response: File download (CSV or Excel)
  - Include: Questions, answers, points, metadata

**Estimated Effort:** 1.5 weeks

---

### Feature 3: Real-time Progress Monitoring Dashboard

#### 3.1 Instructor Dashboard Layout
```
┌─ Classroom Dashboard ────────────────────────────────┐
│                                                      │
│  Quiz: "AI Governance" • Live Session (12 students) │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Live Stats                                      │ │
│  │ ├─ Students Active: 12/15                       │ │
│  │ ├─ Avg Progress: 67%                            │ │
│  │ ├─ Avg Score (submitted): 78%                   │ │
│  │ └─ Time Remaining: 15 min                       │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Student Status (real-time updates)              │ │
│  │ ┌──────────────┬─────────┬──────┬────────────┐  │ │
│  │ │ Name         │ Status  │ Q #  │ Score      │  │ │
│  │ ├──────────────┼─────────┼──────┼────────────┤  │ │
│  │ │ Alice (🟢)   │ Active  │ 4/5  │ 80% (4/5)  │  │ │
│  │ │ Bob (🟠)     │ Stuck   │ 2/5  │ 50% (1/2)  │  │ │
│  │ │ Carol (🔴)   │ Idle    │ 1/5  │ N/A        │  │ │
│  │ │ Dave (✓)     │ Done    │ 5/5  │ 100% (5/5) │  │ │
│  │ └──────────────┴─────────┴──────┴────────────┘  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  [🔒 Lock Quiz] [📊 Analytics] [⚙️ Settings]        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### 3.2 UI Components
- **InstructorDashboard.tsx** (main container)
  - Real-time WebSocket connection for live updates
  - Refresh rate: every 2 seconds

- **QuizLiveStats.tsx**
  - Active students count
  - Average progress %
  - Average score (for submitted)
  - Time remaining (if timed quiz)

- **StudentProgressTable.tsx**
  - Sortable columns: Name, Status, Current Question, Score
  - Status indicators:
    - 🟢 Active (currently answering)
    - 🟠 Stuck (paused >5 min)
    - ⏸️ Paused
    - ✓ Completed
    - 🔴 Idle (not started)
  - Click row to view student's answers

- **StudentAnswerPreview.tsx** (modal)
  - Show student's current/submitted answers
  - Compare to correct answer
  - View AI feedback (if graded)

#### 3.3 Real-time Updates (WebSocket)
- **API:** `POST /api/classrooms/:classroomId/instructor-session`
  - Start monitoring session
  - Returns: WebSocket connection URL + session ID

- **WebSocket Messages:**
  ```typescript
  // Student submitted answer
  { type: 'question_answered', studentId, questionId, questionNum, timestamp }
  
  // Student submitted quiz
  { type: 'quiz_submitted', studentId, score, totalQuestions, timestamp }
  
  // Student started quiz
  { type: 'quiz_started', studentId, timestamp }
  
  // Status heartbeat every 5s
  { type: 'progress_update', progress: { ... }, timestamp }
  ```

#### 3.4 Instructor Controls
- **Lock/Pause Quiz**
  - API: `POST /api/classrooms/:classroomId/quiz/:quizId/lock`
  - Prevents new submissions, shows message to students

- **End Session**
  - API: `POST /api/classrooms/:classroomId/instructor-session/:sessionId/end`
  - Closes session, persists final scores

- **Force Unlock Question**
  - API: `POST /api/classrooms/:classroomId/quiz/:quizId/unlock-question`
  - Allows re-answering a locked question

**Estimated Effort:** 2 weeks

---

### Feature 4: Grade Export & Analytics

#### 4.1 Grade Book Export
- **API:** `GET /api/classrooms/:classroomId/gradebook`
  - Query: `?format=csv|xlsx`
  - Response: File download
  - CSV Format:
    ```
    Student Name,Email,Quiz 1,Quiz 2,Quiz 3,Avg Score
    Alice Johnson,alice@example.com,95,88,92,91.67
    Bob Smith,bob@example.com,78,81,85,81.33
    ```

#### 4.2 Analytics Dashboard
- **UI Component:** `ClassroomAnalytics.tsx`
  - Chart 1: Score Distribution (histogram)
  - Chart 2: Time Spent per Quiz (average)
  - Chart 3: Question Difficulty Heat Map
  - Chart 4: Student Mastery Trend (line chart)
  - Filter: Date range, quiz selection

- **API:** `GET /api/classrooms/:classroomId/analytics`
  - Query: `?startDate=2026-08-01&endDate=2026-08-31&quizId=optional`
  - Response:
    ```json
    {
      "scoreDistribution": { "0-50": 2, "51-75": 5, "76-100": 8 },
      "averageScore": 82.3,
      "avgTimePerQuestion": 45,
      "mostDifficultQuestions": [
        { "questionId": "q1", "avgScore": 0.45, "attempts": 15 }
      ],
      "studentMastery": {
        "Alice": [95, 88, 92],
        "Bob": [78, 81, 85]
      }
    }
    ```

#### 4.3 Individual Student Report
- **API:** `GET /api/classrooms/:classroomId/students/:studentId/report`
  - Response:
    ```json
    {
      "studentName": "Alice",
      "enrollmentDate": "2026-08-01",
      "status": "active",
      "quizzes": [
        {
          "quizId": "quiz1",
          "title": "AI Governance",
          "submittedAt": "2026-08-05T14:30:00Z",
          "score": 18,
          "maxScore": 20,
          "percentage": 90,
          "timeSpent": 1200,
          "answers": [
            { "questionId": "q1", "userAnswer": "A", "correct": true, "feedback": "Correct!" }
          ]
        }
      ],
      "averageScore": 91.67,
      "completionRate": 0.95
    }
    ```

- **UI Component:** `StudentReportCard.tsx`
  - Summary stats: Avg score, quizzes taken, completion rate
  - Quiz history table
  - Download report as PDF

**Estimated Effort:** 1.5 weeks

---

### Feature 5: Quiz Management Interface

#### 5.1 Instructor Quiz Editor
- **Extend existing QuizForm.tsx** for instructor-specific fields:
  - Time limit (optional)
  - Show correct answers after submission (toggle)
  - Randomize question order (toggle)
  - Randomize option order (toggle)
  - Passing score threshold
  - Number of attempts allowed
  - AI feedback enabled (toggle)

#### 5.2 Quiz Linking to Classroom
- **UI Component:** `QuizClassroomLinker.tsx`
  - Publish quiz → Select classrooms to link
  - Set per-classroom: Availability date, deadline, max attempts
  - API: `POST /api/classrooms/:classroomId/quizzes/:quizId/link`

#### 5.3 Quiz Scheduling
- **UI Component:** `QuizScheduler.tsx`
  - Set availability window (start/end date+time)
  - Set deadline for submission
  - Auto-lock quiz after deadline
  - Send reminder emails to students

**Estimated Effort:** 1 week

---

## 📅 Implementation Timeline

| Phase | Week | Feature | Status |
|-------|------|---------|--------|
| **2.1** | 1 | Database schema setup + Supabase migration | Planning |
| **2.2** | 1-2 | Student roster management (add/import) | Planning |
| **2.3** | 2-3 | Quiz import (CSV/Excel) | Planning |
| **2.4** | 3-5 | Real-time monitoring dashboard + WebSocket | Planning |
| **2.5** | 4-5 | Grade export & analytics | Planning |
| **2.6** | 5-6 | Quiz management & scheduling | Planning |
| **2.7** | 6 | Testing, documentation, deployment | Planning |

---

## 🗄️ Database Migration Strategy

### Phase 1 → Phase 2 Migration
1. **Add Supabase to project:**
   ```bash
   pnpm add @supabase/supabase-js
   ```

2. **Set up environment variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Create migration files:**
   - Migration 001: Create core tables (classrooms, students, etc.)
   - Migration 002: Add indexes for performance
   - Migration 003: Add RLS (Row Level Security) policies

4. **Backfill existing data:**
   - Convert existing file-based classrooms to database records
   - Map instructor IDs to auth.users
   - Preserve creation timestamps

---

## 🔒 Security Considerations

### Authentication & Authorization
- **Instructor access:**
  - Can only view their own classrooms
  - Can only see students in their classes
  - Cannot edit other instructors' quizzes

- **Student access:**
  - Can only access quizzes in their enrolled classrooms
  - Cannot see other students' answers
  - Cannot access instructor dashboard

- **RLS Policies (Supabase):**
  ```sql
  -- Instructors can only view their own classrooms
  CREATE POLICY "instructors_view_own_classrooms"
    ON classrooms FOR SELECT
    USING (auth.uid() = instructor_id);

  -- Students can only view classrooms they're enrolled in
  CREATE POLICY "students_view_enrolled_classrooms"
    ON classrooms FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM student_rosters
      WHERE student_rosters.classroom_id = classrooms.id
      AND student_rosters.student_id = auth.uid()
    ));
  ```

### Data Privacy
- Never expose student emails to other students
- Anonymize quiz answers in shared analytics
- Encrypt sensitive data (student IDs, scores)
- GDPR compliance: Allow data export/deletion

---

## 📊 Performance Optimization

### Database Indexes
```sql
CREATE INDEX idx_student_rosters_classroom ON student_rosters(classroom_id);
CREATE INDEX idx_quiz_submissions_student ON quiz_submissions(student_id);
CREATE INDEX idx_quiz_submissions_status ON quiz_submissions(status);
CREATE INDEX idx_quiz_answers_submission ON quiz_answers(submission_id);
```

### Caching Strategy
- **Redis cache:**
  - Cache class roster (TTL: 5 min)
  - Cache analytics aggregates (TTL: 1 hour)
  - Cache quiz metadata (TTL: 24 hours)

- **Client-side caching:**
  - Use React Query for API data
  - Stale-while-revalidate for roster updates

### Pagination
- Roster table: 50 students per page
- Submissions: 100 records per page
- Activity logs: 1000 records max

---

## 🧪 Testing Strategy

### Unit Tests
- CSV parsing logic
- Score calculation algorithms
- Date/time formatting
- Validation functions

### Integration Tests
- Student roster CRUD operations
- Quiz import workflow
- Score submission and grading
- Authorization checks

### E2E Tests
- Instructor creates classroom → adds students → imports quiz → monitors progress
- Student joins classroom → takes quiz → views results
- Export grades as CSV

### Performance Tests
- Load testing: 100 students taking quiz simultaneously
- Database query performance on 10K+ submissions
- WebSocket connection stability

---

## 💰 Cost Estimate (Phase 2)

| Item | Cost | Notes |
|------|------|-------|
| **Supabase** | $25-50/mo | Pro plan for 1-10M rows, 50K API calls/day |
| **WebSocket Hosting** | Free | Use Vercel's built-in WebSocket support |
| **Analytics** (optional) | Free | Use Supabase's built-in analytics |
| **CSV/Excel Libraries** | Free | Use PapaParse (CSV) + SheetJS (Excel) OSS |
| **Development Time** | ~200 hrs | 4-6 weeks @ 1 dev |
| **TOTAL (first month)** | ~$50-75 + dev | Scales with users |

---

## 🎯 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|-----------------|
| **Instructor Adoption** | 80%+ | Classrooms using roster > 50 students |
| **Bulk Import Success Rate** | 95%+ | CSV imports completing without errors |
| **Dashboard Load Time** | <2s | Real-time stats render in <2 seconds |
| **Quiz Grading Accuracy** | 98%+ | Spot-check AI-graded answers vs manual |
| **System Uptime** | 99.9% | Supabase + Vercel combined |
| **Student Engagement** | 90%+ | Completion rate for assigned quizzes |

---

## 🚀 Go-Live Checklist

### Pre-Launch
- [ ] Database schema finalized and tested
- [ ] API endpoints fully implemented
- [ ] Supabase RLS policies configured
- [ ] All UI components reviewed for UX
- [ ] Performance testing complete (load test passed)
- [ ] Security audit complete
- [ ] Documentation written
- [ ] Instructor onboarding guide created

### Launch Day
- [ ] Database migrated from file storage
- [ ] Environment variables configured in Vercel
- [ ] WebSocket connections tested
- [ ] CSV sample files uploaded
- [ ] Email invitations tested
- [ ] Rollback plan documented

### Post-Launch Monitoring
- [ ] Monitor API error rates
- [ ] Track WebSocket connection stability
- [ ] Collect instructor feedback
- [ ] Monitor database query performance
- [ ] Set up alerts for errors >1%

---

## 🔄 Next Steps

1. **Week of Aug 6:** 
   - [ ] Get approval on feature list
   - [ ] Set up Supabase project
   - [ ] Create database migration scripts

2. **Week of Aug 13:**
   - [ ] Start Feature 2.1 (Student Roster)
   - [ ] Begin database schema implementation

3. **Week of Aug 20:**
   - [ ] Feature 2.1 complete + testing
   - [ ] Start Feature 2.2 (Quiz Import)

---

## 📞 Questions for Stakeholders

1. **Authentication:** Should instructors use same login as existing auth, or separate instructor portal?
2. **Email:** Do you have email provider configured? (Needed for student invites)
3. **Roles:** Should there be a "teaching assistant" or "grader" role between instructor and student?
4. **Offline quizzes:** Should students be able to take quizzes entirely offline and sync results later?
5. **Integration:** Do you want to integrate with existing LMS (Canvas, Moodle, Blackboard)?

---

**Owner:** tkiran204@gmail.com  
**Status:** 🎯 Ready for Planning Discussions  
**Last Updated:** August 6, 2026
