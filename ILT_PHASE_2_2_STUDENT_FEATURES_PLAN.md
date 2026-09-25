# Phase 2.2: Student-Facing Features & Learning Dashboard

**Created:** August 6, 2026  
**Status:** 📋 Planning Phase  
**Target Launch:** 8-12 weeks after Phase 2 MVP (post-launch of instructor features)

---

## 📋 Executive Summary

Phase 2 focused on instructor-centric features (roster management, monitoring, grading). Phase 2.2 shifts focus to the student experience, providing learning insights, progress tracking, and communication tools. This phase transforms OpenMAIC from an "instructor watching students" platform to a "complete learning platform" where students actively engage with their progress and instructors can communicate with classes.

**Student Review Feedback:**
- "System is instructor-centric. It solves instructor problems but treats students as passive subjects."
- "Missing: detailed feedback, practice mode, progress streaks, peer context, student data export."

**Teacher Review Feedback:**
- "Hold adoption until Phase 2.2 ships with student progress views and messaging."
- "Students can't see their progress. No announcements system means I'm back to email."

**Phase 2.2 Scope:**
- Student progress dashboard (view my grades, quiz history)
- Detailed quiz feedback (explanations, comparisons)
- Learning analytics (mastery trends, improvement tracking)
- Class announcements & messaging
- Quiz scheduling (availability windows, deadlines)
- Practice mode (untimed, instant feedback, no scoring)
- Gamification (streaks, badges, milestones)
- Student data export (GDPR data portability)

**Estimated Effort:** 8-12 weeks  
**Tech Stack:** React 19, TypeScript, Recharts, Next.js 15  
**Prerequisites:** Phase 2 must be in production

---

## 👨‍🎓 Student Perspective: What's Missing

### Current Experience (Phase 2)
Students:
- ✅ Can take quizzes with AI feedback
- ✅ See their score after submitting
- ❌ Can't see quiz history across time
- ❌ Can't understand *why* they got something wrong
- ❌ Can't compare performance to class average
- ❌ Receive messages via email only (no in-app notifications)
- ❌ Have no way to practice without counting toward grade
- ❌ Get no motivational feedback (progress tracking, streaks)

### Phase 2.2 Will Add
- ✅ Personal progress dashboard
- ✅ Detailed feedback with explanations
- ✅ Learning analytics (am I improving?)
- ✅ In-app announcements & messaging
- ✅ Practice mode (risk-free learning)
- ✅ Gamification (streaks, badges)
- ✅ Export my own data (GDPR)

---

## 🎯 Features (Prioritized)

### Tier 1: MVP Student Dashboard (Weeks 1-3)

#### 1.1 Student Progress Dashboard
**User Story:** As a student, I want to see all my quizzes, scores, and progress over time.

**Components:**
- StudentDashboard.tsx (main container)
- QuizHistoryCard.tsx (list of all quizzes taken)
- ProgressChart.tsx (score trend over time)
- StatsCard.tsx (avg score, completion rate, time spent)

**API Endpoints Needed:**
```
GET /students/me/dashboard
  ├─ enrolledClassrooms: []
  ├─ recentQuizzes: []
  ├─ stats: { avgScore, totalSubmissions, completionRate, avgTimePerQuiz }
  └─ trend: { dates: [...], scores: [...] }

GET /students/me/quizzes
  ├─ classroomId: string
  ├─ quizzes: [
  │   ├─ quizId, title, submittedAt, score, maxScore, percentage
  │   ├─ feedback: "Great job!", status: "graded"
  │   └─ timeSpent: 1200
  │ ]
  └─ pagination: { page, limit, total }
```

**UI Mock:**
```
┌─ My Learning Dashboard ──────────────────────────────┐
│                                                       │
│  📊 My Stats                                          │
│  ├─ Avg Score: 84%        │ Quizzes Taken: 5        │
│  ├─ Completion: 100%      │ Total Time: 4.5 hours   │
│  └─ Improvement: +8% ▲    │ Classes: 2              │
│                                                       │
│  📈 Score Trend (Last 30 days)                       │
│  ┌──────────────────────────────────────────────────┐│
│  │  100│         ╱╲                                 ││
│  │   80│   ╱────╱  ╲────╱                           ││
│  │   60│ ╱╱                                          ││
│  │   40└─────────────────────────────────────────── ││
│  └──────────────────────────────────────────────────┘│
│                                                       │
│  📋 Recent Quizzes                                    │
│  ┌──────────────┬────────┬──────┬─────────────────┐  │
│  │ Quiz         │ Class  │Score │ Status          │  │
│  ├──────────────┼────────┼──────┼─────────────────┤  │
│  │ AI Gov (5)   │ AI 101 │ 95%  │ ✅ Graded       │  │
│  │ Prompt Eng   │ AI 101 │ 88%  │ ✅ Graded       │  │
│  │ ML Basics (3)│ AI 201 │ 76%  │ ⏳ In progress  │  │
│  └──────────────┴────────┴──────┴─────────────────┘  │
│                                                       │
│  [View All Quizzes] [Download Report]                │
└─────────────────────────────────────────────────────┘
```

**Estimated Effort:** 3 weeks

---

#### 1.2 Quiz Feedback & Explanation
**User Story:** As a student, I want detailed feedback explaining why my answer was wrong.

**Current State:** "Correct!" or "Incorrect."  
**Phase 2.2:** Full feedback with explanation + correct answer + why

**Components:**
- QuizResultsDetail.tsx (full results page)
- AnswerFeedback.tsx (per-question feedback)
- ComparisonCard.tsx (your answer vs correct answer)
- ExplanationCard.tsx (why this is correct)

**API Enhancement:**
```
GET /students/me/quiz-results/:submissionId
  ├─ quizTitle, classroomName, submittedAt, score
  ├─ masterySummary: { correct: 4, incorrect: 1, partialCredit: 0 }
  └─ answers: [
      ├─ questionId, questionText
      ├─ yourAnswer: "A", correctAnswer: "B"
      ├─ isCorrect: false, pointsEarned: 0, maxPoints: 1
      ├─ feedback: "Incorrect. You chose A, but the correct answer is B."
      ├─ explanation: "The EU AI Act defines prohibited use cases as... Your answer missed the risk classification aspect."
      ├─ resources: [{ title: "EU AI Act Summary", url: "..." }]
      └─ classAvg: 0.78, studentPercentile: 0.45
    ]
```

**Feedback Types:**
1. **Multiple Choice:** Correct answer highlighted, explanation provided
2. **Short Answer:** AI grading feedback from Claude + user can see grader's thinking
3. **Peer Comparison:** "78% of your class got this right" (anonymized)

**UI Mock:**
```
┌─ Quiz Results: AI Governance Basics ──────────────────┐
│                                                         │
│ Your Score: 18/20 (90%) ✅ Excellent work!             │
│                                                         │
│ Question 2/5: What is the EU AI Act?  ❌ Incorrect    │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Your answer:                                      │ │
│ │ ⭕ A: A regulation on artificial intelligence    │ │
│ │ ✓ Your pick                                       │ │
│ │                                                   │ │
│ │ Correct answer:                                  │ │
│ │ ✅ B: A regulation on high-risk AI applications │ │
│ │                                                   │ │
│ │ Explanation:                                      │ │
│ │ While A is partially correct, the EU AI Act      │ │
│ │ specifically focuses on RISK-BASED regulation... │ │
│ │                                                   │ │
│ │ 📊 Class Performance:                             │ │
│ │ 78% of your class got this right                 │ │
│ │ You're in the bottom 25th percentile on this one │ │
│ │ [Learn More about this topic]                    │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ [← Previous] [Next →]                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Estimated Effort:** 2 weeks

---

### Tier 2: Learning Analytics & Communication (Weeks 4-7)

#### 2.1 Personal Learning Analytics
**User Story:** As a student, I want to see if I'm improving and where I'm struggling.

**Components:**
- MasteryChart.tsx (mastery by topic)
- StrengthsWeaknesses.tsx (what I'm good/bad at)
- ImprovementTrend.tsx (am I getting better?)
- RecommendedTopics.tsx (what to study next)

**API Endpoints:**
```
GET /students/me/learning-analytics
  ├─ masteryByTopic: {
  │   "AI Governance": 0.92,
  │   "Prompt Engineering": 0.78,
  │   "Model Selection": 0.65
  │ }
  ├─ strengthsAndWeaknesses: {
  │   strengths: ["Conceptual questions", "Multiple choice"],
  │   weaknesses: ["Short answer", "Synthesis questions"]
  │ }
  ├─ improvementTrend: {
  │   startDate: "2026-08-01",
  │   endDate: "2026-08-10",
  │   avgScore: 0.82,
  │   trend: "improving" | "stable" | "declining",
  │   change: "+5%"
  │ }
  └─ recommendations: [
      { topic: "Prompt Engineering", reason: "Your weakest area", priority: "high" }
    ]
```

**UI Mock:**
```
┌─ My Learning Analytics ──────────────────────────────┐
│                                                       │
│ 📊 Mastery by Topic                                   │
│ AI Governance      ▓▓▓▓▓▓▓▓▓░ 92%                    │
│ Prompt Engineering ▓▓▓▓▓▓▓░░░ 78%                    │
│ Model Selection    ▓▓▓▓▓▓░░░░ 65% ⚠️ Review this    │
│                                                       │
│ 📈 Your Progress                                      │
│ You've improved 5% in the last 2 weeks! 🎉           │
│ Keep practicing short-answer questions—that's        │
│ where you're strongest. Focus on synthesis Qs next.  │
│                                                       │
│ ✅ Strengths: Multiple choice, conceptual reasoning  │
│ ⚠️  Weaknesses: Long-form explanations, synthesis    │
│                                                       │
│ 💡 Recommended Next:                                 │
│ 1. "Advanced Prompt Engineering" (high priority)    │
│ 2. "Thinking Step-by-Step" (practice mode)          │
│                                                       │
└─────────────────────────────────────────────────────┘
```

**Estimated Effort:** 2 weeks

---

#### 2.2 Class Announcements & Messaging
**User Story:** As a student, I want to receive announcements and messages from my instructor in-app.

**Components:**
- AnnouncementsFeed.tsx (timeline of announcements)
- AnnouncementCard.tsx (individual announcement)
- DirectMessageInbox.tsx (messages from instructor)
- NotificationBell.tsx (unread count)

**API Endpoints:**
```
GET /classrooms/:classroomId/announcements
  ├─ id, title, content, author (instructor name)
  ├─ postedAt, updatedAt
  ├─ type: "announcement" | "assignment" | "reminder"
  └─ attachments: [...]

POST /classrooms/:classroomId/mark-as-read/:announcementId

GET /students/me/messages
  ├─ classroomId, classroomName
  ├─ instructorName, instructorAvatar
  ├─ message, sentAt
  └─ isRead

POST /classrooms/:classroomId/messages/read
```

**UI Mock:**
```
┌─ Announcements & Messages ──────────────────────────┐
│                                                      │
│ 🔔 Notifications  [Mark all as read]                │
│                                                      │
│ 📢 Announcement • Today, 2:45 PM                    │
│ ┌──────────────────────────────────────────────────┐│
│ │ Quiz 3: Prompt Engineering is now available!    ││
│ │ Dr. Chen just posted: "Quiz 3 is live until     ││
│ │ Thursday 11:59 PM. This covers everything from  ││
│ │ lessons 4-6. Good luck!"                         ││
│ │ [📎 Quiz Link] [View in App]                     ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ 💬 Message from Dr. Chen • Today, 10:30 AM         │
│ ┌──────────────────────────────────────────────────┐│
│ │ "Hi Sarah, great job on the last quiz! Your    ││
│ │ improvement on short-answer questions is clear.  ││
│ │ Keep it up!"                                      ││
│ │ [👍 Like] [Reply]                                ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ 📝 Assignment • Yesterday, 4:15 PM                  │
│ ┌──────────────────────────────────────────────────┐│
│ │ Reading: "Chapter 8: AI Ethics"                 ││
│ │ Due: Friday 11:59 PM                            ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Estimated Effort:** 2 weeks

---

### Tier 3: Quiz Scheduling & Practice Mode (Weeks 8-10)

#### 3.1 Quiz Availability & Scheduling
**User Story:** As a student, I want to see when quizzes are available and what the deadline is.

**UI Changes:**
- Quiz card shows: "Available until Friday 11:59 PM"
- Locked quiz shows: "Available starting Tuesday at 9:00 AM"
- Past deadline shows: "Deadline passed. Review your submission."

**API Enhancement:**
```
GET /students/me/available-quizzes/:classroomId
  ├─ available: [
  │   ├─ quizId, title, estimatedTime
  │   ├─ availableFrom, availableUntil
  │   ├─ maxAttempts, attemptsUsed
  │   ├─ description
  │   └─ difficulty: "easy" | "medium" | "hard"
  │ ]
  └─ upcoming: [...]
```

**Estimated Effort:** 1 week

---

#### 3.2 Practice Mode
**User Story:** As a student, I want to practice quizzes with instant feedback without it counting toward my grade.

**Features:**
- Instant feedback after each question (no waiting for grading)
- Can retake same question unlimited times
- Doesn't count toward grade
- Can view "sample" quizzes created by instructor as practice

**Components:**
- PracticeModeToggle.tsx (switch between graded/practice)
- InstantFeedback.tsx (show correct answer immediately)
- PracticeStats.tsx (practice attempts tracking, not graded)

**UI Mock:**
```
┌─ Practice Mode: Prompt Engineering Quiz ──────────┐
│                                                    │
│ [Practice Mode] 🎓 (not graded)                   │
│ Time: No limit • Attempts: Unlimited             │
│                                                    │
│ Question 1/5: Best practice for prompts           │
│ ⭕ A) Be vague to let AI interpret               │
│ ⭕ B) Give context and examples                  │
│ ⭕ C) Use single words                           │
│ ⭕ D) Add emotional language                     │
│                                                    │
│ [Submit Answer]                                   │
│                                                    │
│ ✅ Correct! Great job!                           │
│                                                    │
│ Explanation: Prompt engineering benefits from    │
│ clarity and context...                            │
│                                                    │
│ [Try Again] [Next Question]                       │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Estimated Effort:** 2 weeks

---

### Tier 4: Gamification (Weeks 10-12)

#### 4.1 Learning Streaks & Badges
**User Story:** As a student, I want recognition for my consistent learning effort.

**Components:**
- StreakBadge.tsx (day count, fire emoji 🔥)
- BadgeCollection.tsx (badges earned)
- AchievementNotification.tsx (pop-up when earned)

**Badges:**
- 🔥 **Streak Master** — Take a quiz 7 days in a row
- 🎯 **Perfect Score** — Score 100% on any quiz
- 📚 **Bookworm** — Complete 5 quizzes in one class
- 🚀 **Rising Star** — Improve score by 20% over time
- 💯 **Mastery** — Achieve 90%+ on 3+ quizzes in same topic
- 🏃 **Speed Demon** — Complete quiz in <50% avg time

**API Endpoints:**
```
GET /students/me/streaks
  ├─ currentStreak: 7,
  ├─ longestStreak: 14,
  └─ lastQuizDate: "2026-08-05"

GET /students/me/badges
  ├─ earned: ["perfect-score", "streak-master"],
  ├─ progress: [
  │   ├─ badgeId: "bookworm",
  │   ├─ progress: 3,
  │   └─ requirement: 5
  │ ]
  └─ nextBadges: [...]
```

**UI Mock:**
```
┌─ My Achievements ──────────────────────────────────┐
│                                                    │
│ 🔥 Current Streak: 7 Days                         │
│ Keep it up! Your longest is 14 days.              │
│                                                    │
│ 🏆 Badges Earned                                   │
│ ┌──────────┬──────────┬──────────┬──────────┐     │
│ │🔥 Streak │🎯Perfect │📚Bookworm│🚀Rising  │     │
│ │Master    │ Score    │          │Star      │     │
│ │(Day 7)   │(Day 3)   │(Day 5)   │(Aug 3)   │     │
│ └──────────┴──────────┴──────────┴──────────┘     │
│                                                    │
│ 🎯 In Progress                                     │
│ 💯 Mastery Badge: 2/3 quizzes at 90%+            │
│    [████░░░░░░] 66% — Keep going!                │
│                                                    │
│ 🔓 Locked Badges                                   │
│ 🏃 Speed Demon: Complete quiz in <50% avg time   │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Estimated Effort:** 2 weeks

---

## 🔒 Privacy & Data Control (Phase 2.2)

### Student Data Export (GDPR Compliance)
**User Story:** As a student, I want to download all my personal data from OpenMAIC.

**Endpoint:**
```
GET /students/me/data-export?format=json|csv

Response:
{
  "personalInfo": { name, email, studentId, enrollmentDate },
  "classrooms": [...],
  "quizzes": [
    { quizTitle, classroomName, submittedAt, score, answers: [...] }
  ],
  "feedback": [...],
  "downloads": 1,
  "lastDownload": "2026-08-01T10:00:00Z"
}
```

**UI:**
```
┌─ Privacy & Data Control ───────────────────────────┐
│                                                    │
│ 📥 Download My Data                               │
│ Download all your personal data in one file.      │
│ Format: [JSON ▼] [Download]                       │
│                                                    │
│ 📋 Your Data Includes:                            │
│ ✓ Profile information                            │
│ ✓ Quiz submissions and answers                   │
│ ✓ Grades and feedback                            │
│ ✓ Activity logs                                  │
│                                                    │
│ ⚠️ Data Deletion                                  │
│ WARNING: Deleting your account is permanent.     │
│ All your quiz data will be permanently removed   │
│ from our servers.                                │
│                                                    │
│ [I understand. Delete my account] [Cancel]       │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Estimated Effort:** 1 week

---

## 📊 Teaching Features That Support Phase 2.2

### Instructor Enhancements
While Phase 2.2 focuses on students, instructors need complementary features:

- **Announcement API:** POST /classrooms/:id/announcements
- **Messaging API:** POST /classrooms/:id/messages (to individual or all)
- **Quiz Scheduling:** PUT /classrooms/:id/quizzes/:id/schedule
  - Set availability windows, deadlines, max attempts
- **Practice Quiz Template:** Create unlimited practice quizzes from existing questions
- **Student Analytics Enhanced:** See which students are at risk (low scores, low engagement)
- **Assignment Tracking:** Link quizzes to assignments with due dates

---

## 📅 Phase 2.2 Timeline

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1-3 | Tier 1: Dashboard + Feedback | Student can see all their grades + detailed feedback |
| 4-5 | Tier 2a: Analytics | Student sees mastery by topic + improvement trends |
| 6-7 | Tier 2b: Messaging | In-app announcements + instructor messages |
| 8-9 | Tier 3: Scheduling + Practice | Quiz availability windows + practice mode |
| 10-12 | Tier 4: Gamification | Streaks, badges, achievements |
| 12+ | Data Control + Polish | Export data, GDPR compliance, UX refinement |

**Total: 12 weeks (3 months)**

---

## 💡 Why Phase 2.2 is Critical

### Student Adoption Blocker
Currently: Students take quizzes, see score, but can't:
- Track progress over time
- Understand why they got something wrong
- See if they're improving
- Know when quizzes are available
- Get teacher announcements in-app

Result: Students treat OpenMAIC as a quiz-taking tool, not a learning platform.

### Teacher Adoption Blocker
Teachers want to:
- Give quick feedback ("You did great!")
- Announce quiz deadlines in-app
- Understand which students need help
- Have students see their own analytics (reduces support emails)

Result: Without Phase 2.2, teachers rely on email + spreadsheets for communication.

### Competitive Differentiation
- Canvas: Heavy but complete
- Blackboard: Outdated UX
- OpenMAIC Phase 2: Real-time monitoring (unique!)
- OpenMAIC Phase 2.2: + Student learning dashboard (complete platform)

---

## 🎯 Success Metrics (Phase 2.2)

| Metric | Target | How to Measure |
|--------|--------|-----------------|
| **Student DAU** | >70% | Daily active students in classroom |
| **Quiz History Viewed** | >60% | Students viewing past submissions |
| **Practice Mode Usage** | >40% | Students using practice quizzes |
| **Announcement Open Rate** | >80% | In-app vs email |
| **Time Spent Learning** | +50% | Compare Phase 2 vs Phase 2.2 |
| **Student NPS** | >50 | Survey: "Likely to recommend" |
| **Support Email Reduction** | -30% | "When is quiz due?" emails |

---

## 📞 Next Steps

### Before Phase 2 Launch (Aug 6-16)
- ☐ Review Phase 2.2 plan with students (1:1 interview)
- ☐ Prioritize features based on feedback
- ☐ Design database schema additions (if any)

### During Phase 2 (Aug 17 - Sep 15)
- ☐ Collect student feedback on Phase 2 MVP
- ☐ Start Phase 2.2 mockups + user testing
- ☐ Finalize feature roadmap

### Post-Phase 2 Launch (Sep 16+)
- ☐ Begin Phase 2.2 development
- ☐ Release Tier 1 (dashboard) first
- ☐ Roll out Tier 2+ based on student demand

---

**Owner:** tkiran204@gmail.com  
**Prepared by:** Claude Code  
**Date:** August 6, 2026  
**Status:** Ready for student feedback and prioritization
