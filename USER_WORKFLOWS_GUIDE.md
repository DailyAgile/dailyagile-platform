# User Workflows — Complete Guide

**System:** DailyAgile Quiz Module  
**Phases:** 1 & 2 Complete | Phase 3 (Realtime ILT) Ready  
**Date:** January 15, 2026

---

## 👤 USER TYPE 1: STUDENT (Self-Paced Course)

### Workflow: "I want to take a self-paced quiz"

#### Step 1: Navigate to Quiz
```
Student → Opens DailyAgile platform
         → Navigates to course module
         → Clicks "Start Quiz"
         → Quiz scene loads
```

**What Happens Behind Scenes:**
- Scene renderer detects quiz type
- QuizViewWithGate wrapper mounts
- Checks sessionStorage for valid token
- If token exists (and <24hrs old) → Skip to Step 3
- If no token → Show email verification gate

---

#### Step 2: Email Verification (First Time Only)
```
EmailVerificationGate appears:
┌─────────────────────────────────────┐
│  Welcome                            │
│                                     │
│  [Email input field]                │
│  [Send Verification Link]           │
│                                     │
│  We'll send you a secure link...    │
└─────────────────────────────────────┘
```

**2a. Enter Email**
- Student enters: `alice@company.com`
- Clicks "Send Verification Link"

**API Call:**
```
POST /api/auth/send-verification
{
  "email": "alice@company.com",
  "stageId": "module-1-what-is-ai"
}
```

**Response:**
- ✅ Email sent successfully
- Gate shows: "Check Your Email"
- Student checks inbox

**Rate Limiting Protection:**
- Max 5 verification requests per email per hour
- If exceeded: "Too many attempts, try again later"

---

**2b. Verify Email (Check Inbox)**
```
┌─────────────────────────────────────┐
│  Check Your Email                   │
│  📧                                 │
│                                     │
│  We've sent a verification link to: │
│  alice@company.com                  │
│                                     │
│  ⏰ Link expires in 15 minutes       │
│  Click link to verify and start.    │
│                                     │
│  Didn't get email?                  │
│  [Try a different email]            │
└─────────────────────────────────────┘
```

**Student checks email → Clicks verification link**

**Link Format:**
```
https://dailyagile.com/verify?token=abc123...
```

**API Call:**
```
POST /api/auth/verify-email
{
  "token": "abc123...",
  "stageId": "module-1-what-is-ai"
}
```

**Backend Process:**
1. Verify token with Supabase Auth
2. Find/create student record (email: alice@company.com)
3. Mark as verified (verified_at timestamp)
4. Generate opaque session token (24-hour TTL)
5. Lazy-provision self-paced classroom (if doesn't exist)
6. Auto-enroll student in classroom
7. Return: `{ session_token: "xyz...", student_id: "student-123" }`

**Response:**
```
┌─────────────────────────────────────┐
│  Verified! ✓                        │
│                                     │
│  Loading quiz...                    │
└─────────────────────────────────────┘
```

**Client-Side Storage:**
```javascript
// sessionStorage (survives page refresh, cleared on close)
sessionStorage.setItem('quiz_session_token', 'xyz...')
sessionStorage.setItem('quiz_student_id', 'student-123')
sessionStorage.setItem('quiz_token_timestamp', Date.now())
```

---

#### Step 3: Take Quiz
```
QuizView appears with questions:
┌─────────────────────────────────────┐
│  Module 1: What AI Actually Is      │
│  Question 1 of 5                    │
│                                     │
│  Q: Which of these is an AI?        │
│  ○ A chatbot                        │
│  ○ A calculator                     │
│  ○ Both                             │
│                                     │
│  [← Back] [Next →]                  │
└─────────────────────────────────────┘
```

**Question Types Supported:**
- ✅ Single choice (multiple choice, one answer)
- ✅ Multiple choice (select all that apply)
- ✅ Short answer (AI graded)
- ✅ Essay (AI + instructor graded)
- ✅ Code challenge (AI reviewed)
- ✅ Scenario (branching decision tree)

**Student Interaction:**
1. Reads question
2. Selects/writes answer
3. Answer saved to draft cache (localStorage)
4. Navigates between questions
5. Changes answers as needed
6. Clicks "Submit Quiz" when ready

**Behind Scenes (Draft Caching):**
```
As student types/selects:
  → Debounced save to localStorage (key: quizDraft:quiz-1)
  → No network calls yet
  → Auto-recovery if page closes
```

---

#### Step 4: Submit Quiz
```
Student clicks "Submit Quiz"
↓
setPhase('grading')
clearAnswersCache()
writeSubmittedAnswers(sceneId, answers)
  → Saves answers to localStorage: quizAnswers:quiz-1
  → Can't change answers now
↓
Grading process begins (see Step 5)
```

---

#### Step 5: Grading (Automatic)
```
Phase: Grading
┌─────────────────────────────────────┐
│  ⏳ Grading your answers...         │
│                                     │
│  [Progress animation]               │
│                                     │
│  This usually takes 10-30 seconds   │
└─────────────────────────────────────┘
```

**What Happens:**

**5a. Grade Choice Questions (Instant)**
```javascript
const choiceResults = gradeChoiceQuestions(questions, answers)
// Returns: [
//   { questionId: 'q1', earned: 1, total: 1, isCorrect: true },
//   { questionId: 'q2', earned: 0, total: 1, isCorrect: false }
// ]
```

**5b. Grade AI Questions (Parallel)**
```
For each essay/short-answer/code/scenario:
  → gradeShortAnswerQuestion(question, answer)
    → POST /api/quiz-grade
       {
         "question": "What is machine learning?",
         "userAnswer": "It's when computers learn from data...",
         "points": 10,
         "commentPrompt": "Award points for: definition, examples, real-world application",
         "questionType": "essay",
         "rubric": "Rubric: ..."
       }
    
    ← Response: { score: 8, comment: "Good answer, missing real-world example" }

For code challenges:
  → /api/quiz-grade with questionType: 'code'
    → Routes to CodeGradingQueue
    → Max 5 concurrent requests
    → If queue full: use 50% fallback score
    → Response: { score: 7, comment: "Logic is correct, could optimize performance" }
```

**5c. Merge Results**
```javascript
const allResults = [...choiceResults, ...aiResults]
// Ordered by original question sequence
```

**5d. Sync to Backend (Fire-and-Forget)**
```javascript
if (sessionToken && studentId) {
  const syncQueue = getQuizSyncQueue()
  syncQueue.enqueueSubmission({
    sceneId: 'quiz-1',
    questions: [...],
    answers: {...},
    sessionToken,
    studentId
  })
}
```

**Behind Scenes (Supabase Sync):**
```
POST /api/quiz-submissions
{
  "sceneId": "quiz-1",
  "studentId": "student-123",
  "sessionToken": "xyz...",
  "questions": [...],
  "answers": {...}
}

Server-side:
1. Verify student identity via token
2. Lazy-create self-paced classroom (if needed)
3. Ensure student enrolled in classroom
4. Insert quiz_submission row
5. Insert quiz_answer rows (one per question)
6. Return submission ID

Database state:
  quiz_submissions {
    id: "sub-abc123",
    classroom_id: "self-paced-quiz-1",
    student_id: "student-123",
    submitted_at: "2026-01-15T14:30:00Z",
    score: null (calculated later)
  }
  
  quiz_answers {
    id: "ans-1",
    submission_id: "sub-abc123",
    question_id: "q1",
    question_type: "single",
    user_answer: "A chatbot",
    ai_score: 1,
    points: 1,
    effective_score: 1,
    ai_feedback: "Correct!",
    is_instructor_graded: false
  }
```

**Retry Logic:**
- If sync fails: Queue retries up to 3 times
- Backoff: 1s → 2s → 4s
- If still fails: Retry next time browser connects
- Student can close browser; sync happens on next visit

---

#### Step 6: View Results
```
Phase: Reviewing
┌─────────────────────────────────────┐
│  Quiz Complete! ✓                   │
│                                     │
│  Your Score: 42/50 (84%)            │
│                                     │
│  ✓ Question 1: Correct              │
│  ✓ Question 2: Correct              │
│  ⚠ Question 3: 8/10 (rubric note)   │
│  ✗ Question 4: Incorrect            │
│  ✓ Question 5: Correct              │
│                                     │
│  [Retry Quiz] [Next Lesson]         │
└─────────────────────────────────────┘
```

**What Student Sees:**
- Overall score (percentage)
- Per-question breakdown:
  - AI feedback for essays/code
  - Correct/incorrect for choice
  - Individual scoring for code/scenario
- If instructor overrode grade: Shows updated score + instructor feedback
- Options to retry or move to next lesson

**Offline Scenario:**
- If sync didn't complete: Quiz shows "syncing..." badge
- Results visible locally (cached in localStorage)
- When connection restored: Syncs to Supabase
- Badge disappears

---

#### Step 7: Receive Instructor Feedback (Optional, Later)

**If Instructor Overrides Grade:**

```
Email arrives in alice@company.com inbox:

┌────────────────────────────────────┐
│ 📝 Your Quiz Grade Has Been Updated│
├────────────────────────────────────┤
│                                    │
│ Hi Alice,                          │
│                                    │
│ Your instructor has reviewed your  │
│ quiz submission and provided       │
│ feedback on your grade.            │
│                                    │
│ INSTRUCTOR FEEDBACK:               │
│                                    │
│ Great conceptual understanding!    │
│ I'm raising your essay score from  │
│ 8/10 to 9/10 because your         │
│ real-world example was insightful. │
│                                    │
│ [View Your Grade]                  │
│                                    │
└────────────────────────────────────┘
```

**Student Clicks "View Your Grade":**
- Navigates to gradebook/feedback page (Phase 3 feature)
- Can see instructor's specific feedback
- New score reflected in all reports

---

### Student Workflow Summary

```
┌─────────────────────────────────────────────────────────────┐
│ STUDENT SELF-PACED QUIZ WORKFLOW                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. Navigate to quiz                                         │
│    ↓                                                         │
│ 2. Email verification gate                                  │
│    ├─ Enter email                                           │
│    ├─ Receive OTP                                           │
│    └─ Verify → Get session token (24-hour TTL)              │
│    ↓                                                         │
│ 3. Take quiz                                                │
│    ├─ Answer questions (6 types supported)                  │
│    └─ Answers draft-cached locally                          │
│    ↓                                                         │
│ 4. Submit quiz                                              │
│    ├─ Can't change answers                                  │
│    └─ Grade choice questions locally                        │
│    ↓                                                         │
│ 5. Automatic grading                                        │
│    ├─ AI grades essays/code/short-answer (parallel)         │
│    ├─ Code goes through queue (max 5 concurrent)            │
│    ├─ Sync results to Supabase (fire-and-forget)            │
│    └─ Retry if network fails                                │
│    ↓                                                         │
│ 6. View results                                             │
│    ├─ See overall score                                     │
│    ├─ See AI feedback per question                          │
│    └─ Option to retry                                       │
│    ↓                                                         │
│ 7. (Optional) Receive instructor feedback email             │
│    └─ If instructor overrides grade                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 👨‍🏫 USER TYPE 2: INSTRUCTOR (Review & Grade)

### Workflow: "I need to review student quiz submissions"

#### Step 1: Navigate to Gradebook
```
Instructor → Logs in (via existing ILT auth)
           → Opens classroom
           → Clicks "Gradebook" tab
           → Navigates to:
              /instructor/[classroomId]/gradebook
```

**Page Loads:**
```
┌─────────────────────────────────────────────────────────┐
│ Gradebook                                               │
│ Review student quiz submissions and override AI grades  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [Loading submissions...]                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Behind Scenes:**
```
GET /api/classrooms/[classroomId]/quiz-submissions
  ↓
Server:
1. Verify instructor authorization (owns this classroom)
2. Fetch all submissions for classroom
3. JOIN with student info
4. JOIN with quiz_answers (all answers per submission)
5. Return ordered by submitted_at DESC

Response:
{
  "submissions": [
    {
      "id": "sub-abc123",
      "student_id": "alice-123",
      "scene_id": "quiz-1",
      "submitted_at": "2026-01-15T14:30:00Z",
      "score": 84,
      "answers": [
        {
          "id": "ans-1",
          "question_id": "q1",
          "question_type": "single",
          "user_answer": "A chatbot",
          "ai_score": 1,
          "points": 1,
          "ai_feedback": "Correct!",
          "is_instructor_graded": false
        },
        {
          "id": "ans-3",
          "question_id": "q3",
          "question_type": "essay",
          "user_answer": "Machine learning is...",
          "ai_score": 8,
          "points": 10,
          "ai_feedback": "Good answer...",
          "is_instructor_graded": false
        }
      ]
    }
  ],
  "count": 12
}
```

---

#### Step 2: View Submissions Table
```
Submissions load:
┌──────────────────────────────────────────────────────────┐
│                                                           │
│ Student: alice@company.com                    Score: 84% │
│ Submitted: Jan 15, 2:30 PM                               │
│                                                           │
│ Q1 [single]    ✓ 1/1      ← Auto-graded correct         │
│ Q2 [multiple]  ✓ 2/2      ← Auto-graded correct         │
│ Q3 [essay]     AI: 8/10   ← AI-graded, not override      │
│                AI Feedback: "Good answer..."              │
│                [Override Grade]  ← Click to override     │
│ Q4 [code]      AI: 7/10   ← Code reviewed by AI          │
│                AI Feedback: "Logic correct..."            │
│                [Override Grade]  ← Click to override     │
│ Q5 [short-ans] AI: 9/10   ← Short answer graded          │
│                [Override Grade]  ← Click to override     │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Student: bob@company.com                      Score: 72% │
│ Submitted: Jan 15, 3:15 PM                               │
│ ...                                                       │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Key Information Displayed:**
- ✅ Green badge for correct auto-graded answers
- 📝 Score display for AI-graded answers
- 💬 AI feedback snippet
- 🔘 "Override Grade" button for non-auto-graded questions

---

#### Step 3: Click "Override Grade"
```
Instructor sees answer with AI grade of 8/10 for essay.
Wants to give 9/10 with specific feedback.

Clicks [Override Grade]
  ↓
GradeOverrideModal opens:
```

```
┌─────────────────────────────────────────────────┐
│ Grade Override                           [✕]    │
├─────────────────────────────────────────────────┤
│                                                 │
│ Question: "What is machine learning?"          │
│                                                 │
│ Student Answer:                                 │
│ "Machine learning is a subset of AI where      │
│  algorithms learn from data without explicit   │
│  programming. Examples include recommendations │
│  and spam filters."                            │
│                                                 │
│ ─────────────────────────────────────────────  │
│ AI Grade: 8/10                                  │
│ AI Feedback: "Good conceptual understanding.   │
│  Missing discussion of supervised vs           │
│  unsupervised learning."                       │
│                                                 │
│ ─────────────────────────────────────────────  │
│                                                 │
│ Override Mode:                                  │
│ ◉ Accept AI grade                               │
│ ○ Override with instructor score                │
│                                                 │
│ (If "Override" selected, show:)                │
│                                                 │
│ Instructor Score: [9] / 10                      │
│                                                 │
│ Your Feedback:                                  │
│ [Excellent explanation! I'm upgrading from 8   │
│  to 9 because your real-world examples were    │
│  particularly insightful.]                     │
│                                                 │
│ Reason for Change:                              │
│ ▼ [rubric_clarification]                        │
│   - grading_error                               │
│   - rubric_clarification                        │
│   - regrade_student_appeal                      │
│   - other                                       │
│                                                 │
│ ─────────────────────────────────────────────  │
│                  [Cancel]  [Save Override]     │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Instructor Actions:**
1. Selects "Override with instructor score"
2. Enters score: `9`
3. Types feedback: "Excellent explanation! I'm upgrading from 8 to 9 because your real-world examples were particularly insightful."
4. Selects reason: "rubric_clarification" (why the change)
5. Clicks "Save Override"

---

#### Step 4: Save Override
```
Instructor clicks "Save Override"
  ↓
Toast shows: "Saving grade override..."
  ↓
PATCH /api/classrooms/[classroomId]/quiz-submissions/[subId]/grade
{
  "questionId": "q3",
  "instructorScore": 9,
  "instructorFeedback": "Excellent explanation!...",
  "reason": "rubric_clarification"
}
```

**Server-Side Process:**
```
1. Verify instructor authorization (owns classroom)
2. Verify submission belongs to classroom
3. Get current answer record
4. Update quiz_answers:
   - instructor_score: 9
   - instructor_feedback: "Excellent explanation!..."
   - graded_by: instructor_id
   - reviewed_at: now()
   - is_instructor_graded: true
   - grading_status: 'instructor_overridden'

5. Recalculate submission total score:
   - New effective_score for Q3: 9 (instructor score wins)
   - Recalculate submission total: 84% → 86%

6. Trigger: audit_grade_override()
   - Log in audit table with before/after
   - Timestamp, instructor ID, reason

7. NEW: Send student notification email
   - GET student.email
   - Call /api/email/send-grade-notification
   - Send HTML email with updated score + feedback

8. Return: {
     "question_id": "q3",
     "before_score": 8,
     "after_score": 9,
     "graded_by": instructor_id,
     "reviewed_at": "2026-01-15T15:45:00Z"
   }
```

---

#### Step 5: Confirmation & Auto-Refresh
```
Response received
  ↓
Toast changes to: "Grade override saved successfully ✓"
  ↓
Gradebook auto-refreshes:
  ├─ Re-fetches submissions
  └─ Updates row:
       Q3 [essay]  Instructor: 9/10 ✓
                   "Excellent explanation!..."
                   [Undo Override?]  ← New option
```

**Submission Row Updated:**
```
BEFORE:
Q3 [essay]     AI: 8/10
               AI Feedback: "Good answer..."
               [Override Grade]

AFTER:
Q3 [essay]     ✓ Instructor: 9/10
               Instructor Feedback: "Excellent explanation!..."
               "Reason: rubric_clarification"
               [Revert Override]  ← Optional
```

---

#### Step 6: Student Receives Email (Async)
```
While instructor is still grading, Alice receives:

FROM: noreply@dailyagile.com
TO: alice@company.com
SUBJECT: 📝 Your Quiz Grade Has Been Updated

BODY (HTML):
┌────────────────────────────────────┐
│ Your Quiz Grade Has Been Updated   │
├────────────────────────────────────┤
│                                    │
│ Hi Alice,                          │
│                                    │
│ Your instructor has reviewed your  │
│ quiz submission and provided       │
│ feedback on your grade.            │
│                                    │
│ INSTRUCTOR FEEDBACK:               │
│                                    │
│ Excellent explanation! I'm         │
│ upgrading from 8 to 9 because      │
│ your real-world examples were      │
│ particularly insightful.           │
│                                    │
│ Updated: Jan 15, 3:45 PM           │
│                                    │
│ [View Your Grade]                  │
│                                    │
│ © 2026 DailyAgile                 │
│ Accelerate Business Agility        │
│                                    │
└────────────────────────────────────┘

Email fallback logic:
- If RESEND_API_KEY exists → Send via Resend
- Otherwise → Log to console (development)
- If email fails → Continue anyway (grade already saved)
```

---

### Instructor Workflow Summary

```
┌─────────────────────────────────────────────────────────────┐
│ INSTRUCTOR GRADING WORKFLOW                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. Navigate to gradebook                                    │
│    /instructor/[classroomId]/gradebook                      │
│    ↓                                                         │
│ 2. Fetch submissions (with answers & AI grades)             │
│    GET /api/classrooms/.../quiz-submissions                 │
│    ↓                                                         │
│ 3. View submissions table                                   │
│    ├─ See all students                                      │
│    ├─ See each question (auto-graded, AI-graded, etc)       │
│    ├─ See AI feedback                                       │
│    └─ See override button for non-auto questions            │
│    ↓                                                         │
│ 4. Click "Override Grade" (for essay/code/etc)              │
│    ├─ Modal opens with student answer                       │
│    ├─ Shows AI grade + feedback                             │
│    └─ Instructor enters: score, feedback, reason            │
│    ↓                                                         │
│ 5. Save override                                            │
│    PATCH /api/classrooms/.../grade                          │
│    ├─ Update quiz_answers                                   │
│    ├─ Recalculate submission score                          │
│    ├─ Log audit trail                                       │
│    └─ Send student email notification                       │
│    ↓                                                         │
│ 6. Confirmation                                             │
│    ├─ Toast: "Saved successfully"                           │
│    ├─ Gradebook auto-refreshes                              │
│    └─ Updated score shows "Instructor: 9/10"                │
│    ↓                                                         │
│ 7. Student receives email (async)                           │
│    ├─ If RESEND_API_KEY: Via Resend                         │
│    ├─ Otherwise: Console log (dev)                          │
│    └─ Includes: new score, feedback, timestamp              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 USER TYPE 3: INSTRUCTOR (Live ILT Session)

### Workflow: "I want to run a live quiz during class"

**Status:** Phase 3 — Ready for testing  
**Note:** Full implementation ready, sample flow below

#### Step 1: Start Live Session
```
Instructor navigates to classroom
Clicks "Start Live Quiz"

POST /api/classrooms/[id]/live-sessions
{
  "quiz_scene_id": "quiz-1",
  "status": "pending"
}

Response:
{
  "session_id": "session-abc123",
  "quiz_scene_id": "quiz-1",
  "current_question_id": "q1",
  "is_question_locked": true,
  "status": "pending"
}
```

---

#### Step 2: Students Join
```
Instructor displays session code: ABC123

Students navigate to: /live-quiz/ABC123

Supabase Realtime subscribes students to:
  channel('live_sessions:session-abc123')
  .on('postgres_changes', { event: '*' }, update => {...})
```

---

#### Step 3: Instructor Controls Flow
```
Instructor UI:
┌────────────────────────────────────────┐
│ Live Quiz Control                      │
├────────────────────────────────────────┤
│                                        │
│ Q1. What is AI?  [LIVE]                │
│ Status: 5 students answered            │
│                                        │
│ Leaderboard:                           │
│ 1. Alice - 20 pts                      │
│ 2. Bob - 15 pts                        │
│ 3. Charlie - 10 pts                    │
│                                        │
│ [Show Leaderboard] [Unlock Answer]     │
│ [Advance to Q2]                        │
│                                        │
└────────────────────────────────────────┘

Instructor clicks [Advance to Q2]
  ↓
PATCH /api/classrooms/.../live-sessions/[id]/advance
{
  "question_id": "q2",
  "is_question_locked": true
}
  ↓
Supabase broadcasts change via Realtime:
  all subscribed clients receive update
  ↓
Students see:
  "Question advanced to Q2"
  "Current leaderboard locked (instructor reviewing)"
```

---

#### Step 4: Realtime Updates
```
Student submits answer to Q1:
  ↓
POST /api/classrooms/.../live-sessions/[id]/responses
{
  "question_id": "q1",
  "answer": "A chatbot"
}
  ↓
Supabase updates live_quiz_responses table
  ↓
Realtime broadcasts to leaderboard subscribers:
  {
    "event": "response_submitted",
    "student_id": "alice-123",
    "question_id": "q1",
    "is_correct": true,
    "score": 20,
    "updated_at": "2026-01-15T15:50:00Z"
  }
  ↓
Instructor's leaderboard updates in real-time:
  1. Alice - 20 pts (was 0) ← New!
  2. Bob - 15 pts
  3. Charlie - 10 pts
```

**Connection Status Indicator:**
```
┌──────────────────────────────────────┐
│ ✓ Connected                          │
│ 5 students | 4 answered | 1 pending  │
└──────────────────────────────────────┘

If network drop:
┌──────────────────────────────────────┐
│ ⟳ Reconnecting...                    │
│ Buffering responses locally          │
└──────────────────────────────────────┘

When reconnected:
┌──────────────────────────────────────┐
│ ✓ Connected                          │
│ Synced buffered responses            │
└──────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagram

```
SELF-PACED QUIZ FLOW:
┌────────────┐
│  Student  │
└─────┬──────┘
      │
      ├─→ [1] Email verification gate
      │       └→ POST /api/auth/send-verification
      │       └→ POST /api/auth/verify-email
      │       └→ Session token stored (24-hr)
      │
      ├─→ [2] Start quiz (session restored from token)
      │       └→ QuizView loads with sessionToken
      │
      ├─→ [3] Answer questions
      │       └→ Draft cache to localStorage (debounced)
      │
      ├─→ [4] Submit quiz
      │       └→ writeSubmittedAnswers() to localStorage
      │       └→ Start grading phase
      │
      ├─→ [5] Automatic grading
      │       ├─ Grade choice questions (local, instant)
      │       ├─ Grade essays/code/short-answer (AI, parallel)
      │       │   └─ Code → CodeGradingQueue (max 5 concurrent)
      │       └─ Sync to Supabase (fire-and-forget)
      │           └─ POST /api/quiz-submissions
      │           └→ Auto-enroll in classroom
      │           └→ Inserts quiz_submissions + quiz_answers
      │
      └─→ [6] View results
              └→ Show score + feedback
              └→ Option to retry or move to next lesson

INSTRUCTOR GRADING FLOW:
┌───────────┐
│ Instructor│
└─────┬─────┘
      │
      ├─→ [1] Navigate to gradebook
      │       └→ /instructor/[classroomId]/gradebook
      │
      ├─→ [2] Fetch submissions
      │       └→ GET /api/classrooms/.../quiz-submissions
      │       └→ Returns all submissions + answers + AI grades
      │
      ├─→ [3] View submissions table
      │       └→ See each student's answers
      │       └→ See AI grades + feedback
      │
      ├─→ [4] Click override button
      │       └→ GradeOverrideModal opens
      │       └→ Shows student answer + AI grade
      │
      ├─→ [5] Enter override
      │       ├─ Score: 9/10
      │       ├─ Feedback: "Excellent work..."
      │       └─ Reason: "rubric_clarification"
      │
      ├─→ [6] Save override
      │       └→ PATCH /api/classrooms/.../grade
      │       ├─ Update quiz_answers (instructor_score, feedback, etc)
      │       ├─ Recalculate submission total score
      │       ├─ Log audit trail (who, when, before/after)
      │       └─ Send student email notification
      │
      └─→ [7] Confirmation
              ├─ Toast: "Saved successfully"
              ├─ Gradebook auto-refreshes
              └─ Shows updated score

STUDENT RECEIVES EMAIL:
┌────────────┐
│ Email sent │ ← Triggered by grade override (async)
│ (async)    │
└─────┬──────┘
      │
      ├─→ Try Resend API (if RESEND_API_KEY set)
      │   ├─ Success: Email delivered
      │   └─ Fail: Fall through to console
      │
      └─→ Fallback: Console log (development)
          └─ Email content logged for testing
```

---

## 📱 Mobile Experience

### Student on Mobile
```
Same workflow as desktop, but:
✅ Email gate: Responsive (full-width on small screens)
✅ Quiz: Touch-friendly buttons
⚠️  Code challenge: 
    - If detected as mobile
    → Route to Replit embed (external editor)
    - Return answer via link-back to app
✅ Results: Scrollable, readable on small screens
```

### Instructor on Mobile
```
Gradebook table:
✅ Responsive grid (horizontal scroll on small screens)
✅ "Override" button: Touch-friendly size (48px min)
✅ Modal: Full-screen on mobile, centered on desktop
✅ Toast notifications: Visible in mobile view
```

---

## ⚠️ Error Scenarios

### Student: Network Error During Submit
```
Student submits quiz (good connection)
  ↓
Grading phase starts
  ↓
Network drops mid-grading
  ↓
Student sees:
┌──────────────────────────┐
│ ⏳ Grading your answers...│
│                          │
│ ⚠ Network error          │
│ Retrying...              │
└──────────────────────────┘

Backend: Auto-retry sync queue
  - Retry 1: 1s delay
  - Retry 2: 2s delay
  - Retry 3: 4s delay
  - Queued up to 10 submissions

If still fails:
  - Results cached in localStorage
  - Syncs when connection restored
  - Student can close/reopen browser
```

### Student: Code Grading Fails
```
Student submits code answer
  ↓
CodeGradingQueue processes
  ↓
LLM API unavailable (rate limit hit)
  ↓
Queue: Retry 1 → Retry 2 → Retry 3
  ↓
All retries exhausted
  ↓
Fallback: Give 50% partial credit
  Student sees: "7/10 - Grading service busy, default score given"
  ↓
Later that day:
  Admin retries manually or student can retake quiz
```

### Instructor: Classroom Access Denied
```
Instructor navigates to:
  /instructor/[classroomId]/gradebook

But user is not instructor of that classroom
  ↓
API returns 403 Forbidden
  ↓
UI shows:
┌──────────────────────────┐
│ Error loading gradebook  │
│                          │
│ You do not have          │
│ permission to access     │
│ this classroom.          │
│                          │
│ [Go Back]                │
└──────────────────────────┘
```

---

## 🎯 Key Takeaways

### For Students
1. **Email verification** happens once (24-hour session token)
2. **Draft cache** auto-saves answers (survives page close)
3. **Grading is parallel** (essay + code grades happen at same time)
4. **Results sync in background** (fire-and-forget, retries auto-handled)
5. **Offline works** (messages buffered, syncs on reconnect)

### For Instructors
1. **Gradebook shows everything** (AI grades + instructor feedback)
2. **Override is easy** (modal, no complicated forms)
3. **Student gets notified** (email sent automatically)
4. **Audit trail created** (who, when, why grade changed)
5. **Auto-refresh** (no manual refresh needed)

### For Admins
1. **RLS policies enforce access** (students see own data only)
2. **Async email service** (doesn't block grade save)
3. **Queue manages load** (max 5 concurrent code reviews)
4. **Graceful degradation** (fallback scores if LLM fails)
5. **Comprehensive logging** (every operation recorded)

