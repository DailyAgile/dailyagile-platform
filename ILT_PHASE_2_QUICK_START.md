# Phase 2 ILT - Quick Start Guide

**Last Updated:** August 6, 2026

---

## 🎯 Feature Prioritization Matrix

### Tier 1: MVP Core (Weeks 1-2)
**Must-have for instructor adoption** | Effort: ~60 hours | Timeline: 2 weeks

| Feature | User Story | Acceptance Criteria | Effort |
|---------|-----------|-------------------|--------|
| **Student Roster - Add** | As instructor, I can add students one by one | Can add email, name, ID; send invites; validation errors clear | 8h |
| **Student Roster - Bulk Import** | As instructor, I can bulk import 100+ students via CSV | CSV parsing, error handling, duplicate detection, invite sending | 12h |
| **View Roster** | As instructor, I can see all my enrolled students | Table view, filters (active/dropped), search, pagination (50/page) | 8h |
| **Quiz Grading API (existing)** | AI auto-grades short-answer questions | ✅ Already built in Phase 1 | - |
| **Basic Submission Storage** | Quiz answers persisted to database | Store submission with answers, score, status | 10h |
| **Student Report - View** | As instructor, I can see one student's score on all quizzes | Summary stats, quiz history, score trends | 12h |
| **Export Gradebook (CSV)** | As instructor, I can export all grades as CSV | Simple CSV format (Name, Email, Quiz1, Quiz2, Avg) | 10h |

**Tier 1 Total:** ~60 hours (1-1.5 weeks for 1 dev)

---

### Tier 2: Enhanced Monitoring (Weeks 2-4)
**Nice-to-have, major UX improvement** | Effort: ~80 hours | Timeline: 2-3 weeks

| Feature | User Story | Acceptance Criteria | Effort |
|---------|-----------|-------------------|--------|
| **Live Progress Dashboard** | As instructor, I can see which students are stuck during quiz | Real-time table: Name, Status, Q#, Score; 🟢🟠✓ indicators | 30h |
| **WebSocket Connection** | Real-time progress updates to instructor | Connection stable >99.5%, messages every 2s, error recovery | 20h |
| **Lock/Pause Quiz** | As instructor, I can pause quiz for all students | Lock immediately, show message to students, persist state | 15h |
| **Question Difficulty Analytics** | As instructor, I can see which questions are hard | % correct per question, difficulty heat map | 15h |

**Tier 2 Total:** ~80 hours (2-3 weeks for 1 dev)

---

### Tier 3: Advanced Features (Weeks 4-6)
**Nice-to-have, lower priority** | Effort: ~60 hours | Timeline: 2 weeks

| Feature | User Story | Acceptance Criteria | Effort |
|---------|-----------|-------------------|--------|
| **Quiz Import from CSV** | As instructor, I can import pre-made quizzes from CSV | Parse CSV, validate questions, create quiz in system | 20h |
| **Analytics Dashboard** | As instructor, I can see class performance trends | Score distribution, avg time, mastery trends, pass rate | 20h |
| **Student Performance Report (PDF)** | As instructor, I can export detailed report per student | Strengths, weaknesses, recommendations, all submissions | 15h |
| **Quiz Scheduling** | As instructor, I can set availability windows for quizzes | Start/end datetime, auto-lock after deadline, reminders | 15h |

**Tier 3 Total:** ~60 hours (2 weeks for 1 dev)

---

## 📊 Effort vs Impact Analysis

```
HIGH IMPACT, LOW EFFORT (Do First):
├─ Student Roster (Add/Bulk) ................ 20h / High adoption driver
├─ View Roster ............................. 8h / Essential feature
└─ Export Gradebook ........................ 10h / Very useful

MEDIUM IMPACT, MEDIUM EFFORT (Do Second):
├─ Live Progress Dashboard ................. 30h / Differentiator
├─ Student Report .......................... 12h / Required for ILT
└─ Lock/Pause Quiz ......................... 15h / Teacher control

NICE TO HAVE (Do Last):
├─ Quiz Import CSV ......................... 20h / Convenience feature
├─ Analytics Dashboard ..................... 20h / Analytical view
└─ Quiz Scheduling ......................... 15h / Automation
```

---

## 🚀 Recommended Launch Plan

### Week 1: Database + Tier 1 MVP (Core Roster)
```
Mon-Tue: Database schema design + Supabase setup
  ├─ Create tables: classrooms, students, student_rosters
  ├─ Set up RLS policies
  └─ Verify migrations

Wed-Thu: Student Roster API + UI
  ├─ POST /api/classrooms/:id/students (add single)
  ├─ POST /api/classrooms/:id/students/bulk-import (CSV)
  ├─ GET /api/classrooms/:id/students (list)
  └─ UI: StudentRosterForm + StudentRosterTable

Fri: Testing + Polish
  ├─ Unit tests for CSV parsing
  ├─ E2E test: Add student → receive invite
  └─ Error handling review
```

### Week 2: Submissions + Gradebook
```
Mon-Tue: Quiz Submission Storage
  ├─ Create tables: quiz_submissions, quiz_answers
  ├─ POST /api/classrooms/:id/quiz-submissions (store answers)
  ├─ GET /api/classrooms/:id/quiz-submissions/:id (view)
  └─ Backfill: Migrate localStorage submissions to database

Wed-Thu: Gradebook Export + Student Report
  ├─ GET /api/classrooms/:id/gradebook (CSV export)
  ├─ GET /api/classrooms/:id/students/:id/report (view)
  ├─ UI: ReportCard, StudentProgressSummary
  └─ Calculate stats: avg score, completion rate, trends

Fri: Testing + Deployment
  ├─ Test exports on real data
  ├─ Performance test on 10K submissions
  └─ Deploy Tier 1 to production
```

### Weeks 3-4: Real-time Monitoring (Tier 2)
```
Parallel development:
- WebSocket + Progress API (30h)
- Dashboard UI + Live Stats (20h)
- Lock/Pause functionality (15h)
- Testing + stability (15h)

End result: Instructors can monitor quiz in real-time
```

### Weeks 5-6: Polish + Tier 3 Optional Features
```
If time permits:
- Quiz import CSV (20h)
- Analytics dashboard (20h)
- Otherwise: Bug fixes, performance optimization, docs
```

---

## 🛠️ Technology Setup Checklist

### Pre-Implementation
- [ ] Supabase project created
- [ ] Database credentials in `.env.local`
- [ ] TypeScript/Zod schemas for tables
- [ ] API error handling library set up
- [ ] CSV parsing library (PapaParse) installed
- [ ] React Query set up for data fetching

### Dependencies to Add
```bash
pnpm add @supabase/supabase-js
pnpm add zod @hookform/resolvers
pnpm add papaparse
pnpm add recharts # for analytics
pnpm add date-fns
pnpm add -D @types/papaparse
```

### Database Migrations
```bash
cd openMAIC
pnpm supabase migration new create_ilt_tables
# Copy migration SQL from ILT_PHASE_2_IMPLEMENTATION_PLAN.md
pnpm supabase db push
```

### Environment Variables
```bash
# Add to .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📋 Component Structure

### New Directories to Create
```
openMAIC/
├─ app/api/
│  ├─ classrooms/[id]/
│  │  ├─ students/
│  │  │  ├─ route.ts (GET/POST/DELETE)
│  │  │  └─ bulk-import/route.ts (POST)
│  │  ├─ quiz-submissions/route.ts
│  │  ├─ instructor-session/route.ts
│  │  ├─ analytics/route.ts
│  │  └─ gradebook/route.ts
│  └─ quizzes/
│     └─ import/route.ts
├─ components/ilt/ (NEW)
│  ├─ roster/
│  │  ├─ StudentRosterForm.tsx
│  │  ├─ StudentRosterImport.tsx
│  │  ├─ StudentRosterTable.tsx
│  │  └─ index.ts
│  ├─ submissions/
│  │  ├─ StudentReportCard.tsx
│  │  ├─ GradebookTable.tsx
│  │  └─ index.ts
│  ├─ monitoring/
│  │  ├─ InstructorDashboard.tsx
│  │  ├─ QuizLiveStats.tsx
│  │  ├─ StudentProgressTable.tsx
│  │  └─ index.ts
│  └─ analytics/
│     ├─ ClassroomAnalytics.tsx
│     ├─ ScoreDistribution.tsx
│     └─ index.ts
├─ lib/ilt/ (NEW)
│  ├─ db/
│  │  ├─ classrooms.ts
│  │  ├─ students.ts
│  │  ├─ submissions.ts
│  │  └─ instructor-sessions.ts
│  ├─ api/
│  │  ├─ roster.ts
│  │  ├─ submissions.ts
│  │  ├─ analytics.ts
│  │  └─ websocket.ts
│  ├─ csv/
│  │  ├─ parser.ts
│  │  ├─ validator.ts
│  │  └─ exporter.ts
│  └─ types/
│     └─ ilt.ts
└─ tests/ilt/ (NEW)
   ├─ roster.test.ts
   ├─ submissions.test.ts
   └─ csv-import.test.ts
```

---

## 🧪 Testing Checklist

### Unit Tests (Week 2)
- [ ] CSV parser handles various formats
- [ ] Validation catches missing emails
- [ ] Score calculation is correct
- [ ] Pagination works (page 1-10)
- [ ] Date formatting is consistent

### Integration Tests (Week 3)
- [ ] Add student → stored in DB → invite sent
- [ ] Import CSV → all records created → no duplicates
- [ ] Submit quiz → answer persisted → score calculated
- [ ] Export gradebook → file format correct → all students included
- [ ] Get student report → correct aggregations

### E2E Tests (Week 4)
- [ ] Instructor flow: Create classroom → Import roster → Monitor quiz → Export grades
- [ ] Student flow: Enroll → Take quiz → View score → See feedback
- [ ] WebSocket: Connected → Receive live updates → Disconnect cleanly

### Performance Tests (Week 5)
- [ ] Load test: 100 students submitting simultaneously
- [ ] Database: Query 10K submissions in <1s
- [ ] CSV import: Parse 1000-student file in <5s
- [ ] WebSocket: 100 connections, message throughput >1000/sec

---

## 📊 Success Criteria

### Tier 1 (Must Have)
- ✅ Can add/import 100+ students in <5 min
- ✅ Can view roster with filters/search
- ✅ Can export grades as CSV
- ✅ Can see individual student report
- ✅ System stores quiz submissions correctly

### Tier 2 (Should Have)
- ✅ Live dashboard shows real-time progress
- ✅ WebSocket delivers updates with <2s latency
- ✅ Can lock/pause quiz for all students
- ✅ Can see which questions students struggle on

### Tier 3 (Nice to Have)
- ✅ Can import quizzes from CSV
- ✅ Can see class-wide analytics
- ✅ Can export detailed student reports as PDF

---

## 🚨 Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **Database performance degradation** | Medium | High | Add indexes early, load test 10K rows |
| **WebSocket connection drops** | Medium | Medium | Implement reconnection logic with exponential backoff |
| **CSV import data corruption** | Low | High | Thorough validation + dry-run preview before import |
| **Student data privacy breach** | Low | Critical | Enable RLS policies from day 1, no logging of PII |
| **Merge conflict between Tier 1 & 2** | Medium | Medium | Define clear file boundaries (components/ilt vs lib/ilt) |

---

## 🎓 Team Onboarding

### For New Developer
1. Read ILT_PHASE_2_IMPLEMENTATION_PLAN.md (overview)
2. Review ILT_PHASE_2_API_SPECIFICATION.md (endpoints)
3. Read this file (quick start)
4. Set up database locally
5. Start with one feature from Tier 1
6. Pair program on first WebSocket feature

### Code Review Checklist
- [ ] Types defined in `/lib/ilt/types/ilt.ts`
- [ ] Error messages use standard format
- [ ] API responses include pagination metadata
- [ ] Timestamps use ISO-8601 format
- [ ] File size validation on CSV uploads
- [ ] Rate limiting headers present
- [ ] Tests included (>80% coverage)

---

## 📞 Questions to Resolve Before Starting

1. **Database:** Should we use Supabase or managed PostgreSQL?
   - Recommendation: Supabase (easiest, includes auth + RLS)

2. **Email:** Do you have SMTP/email provider configured?
   - Recommendation: Supabase Auth emails or SendGrid for invites

3. **Real-time:** Can Vercel handle WebSocket?
   - Recommendation: Yes, Vercel supports WebSocket via serverless functions

4. **Offline:** Should students sync quiz results when coming online?
   - Recommendation: Not needed for Tier 1; Phase 3 enhancement

5. **LMS Integration:** Should this integrate with Canvas/Blackboard?
   - Recommendation: Phase 3 feature; start standalone

---

## 📈 Success Metrics to Track

After Phase 2 launch, measure:

| Metric | Target | Tool |
|--------|--------|------|
| **Time to Import Class** | <5 min for 100 students | User testing |
| **API Response Time** | <500ms p99 | Vercel Analytics |
| **WebSocket Stability** | >99.5% uptime | Monitoring |
| **Instructor Satisfaction** | NPS >40 | In-app survey |
| **Quiz Submission Rate** | >90% of enrolled students | Database query |
| **Feature Usage** | >70% use export feature | Event tracking |

---

## 🎬 Getting Started Today

1. **Right now:**
   ```bash
   # Create Supabase project
   # Add credentials to .env.local
   # Review database schema in ILT_PHASE_2_IMPLEMENTATION_PLAN.md
   ```

2. **Tomorrow:**
   ```bash
   # Set up database migrations
   pnpm supabase migration new create_ilt_tables
   pnpm supabase db push
   ```

3. **This week:**
   ```bash
   # Start Feature 1: Student Roster (Add)
   # Implement POST /api/classrooms/:id/students
   # Build StudentRosterForm component
   ```

---

**Owner:** tkiran204@gmail.com  
**Last Updated:** August 6, 2026  
**Next Review:** Before starting Week 1 implementation
