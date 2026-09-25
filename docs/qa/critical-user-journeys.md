# Critical User Journeys - Quiz System
**Date Created**: 2026-09-25  
**Product**: DailyAgile Quiz (Multiplayer, Live Sessions)  
**Status**: Test Plan (Ready for Execution)

---

## Overview

These are **permanent release gates**. Every release must PASS all CUJs with evidence.

CUJs span **complete workflows** from user perspective, testing:
- UI state transitions
- API responses
- Database persistence
- Cross-client consistency (multi-user)
- Failure recovery

---

## CUJ-001: Teacher Creates Quiz (Manual Entry)

**Personas**: Teacher/Instructor  
**Duration**: ~5 minutes  
**Complexity**: Medium

### Setup
- Teacher logged in at `/teach/quiz/management`
- Empty quiz, no prior data

### Steps

| Step | Action | Expected State | Verify |
|------|--------|-----------------|--------|
| 1 | Click "Create New Quiz" button | Modal/form appears with title field | Button clickable, form renders |
| 2 | Enter title "Test Quiz Live" | Title appears in input field | Input accepts text |
| 3 | Enter description "5-question quiz" | Description appears | Field accepts multi-line text |
| 4 | Click "Add Question" | Question 1 form appears | Form has question text, 5 answer options, correct answer selector |
| 5 | Enter Q1: "What is 2+2?" | Text appears in field | Input works |
| 6 | Enter options: "2", "3", "4", "5", "6" | All options appear | Can enter all 5 options |
| 7 | Select option C (4) as correct | Option C highlighted/marked | UI shows selection |
| 8 | Enter explanation: "Basic arithmetic" | Explanation appears | Field accepts text |
| 9 | Set points to 100 | Points field shows 100 | Accepts numeric input |
| 10 | Click "Add Question" again | Question 2 form appears | Can add multiple questions |
| 11 | Repeat steps 5-9 for Q2, Q3, Q4, Q5 | All 5 questions added | Form allows 5+ questions |
| 12 | Click "Save Draft" | Modal closes, quiz appears in list | Quiz saved to database |
| 13 | Refresh page (F5) | Quiz still visible in list | Persists after reload |
| 14 | Click quiz name to edit | All 5 questions appear with data intact | Data retrieved from database correctly |
| 15 | Modify Q1 answer from C to D | Change takes effect | Can edit questions |
| 16 | Click "Save" | Changes persisted | Update works |
| 17 | Refresh page | Modified answer still shows D | Edit persists |

### Database Verification

```sql
-- After step 12 (Save Draft)
SELECT id, title, description, created_by, created_at FROM quizzes 
WHERE title = 'Test Quiz Live' AND created_by = [teacher_id];

-- Should return 1 row
-- created_at should be current time
-- created_by should match logged-in teacher

SELECT COUNT(*) FROM quiz_questions 
WHERE quiz_id = [quiz_id];

-- Should return 5 questions

SELECT * FROM quiz_questions 
WHERE quiz_id = [quiz_id] AND question_number = 1;

-- Should show Q1 data exactly as entered
-- correct_answer_index should be 2 (C)
```

### API Verification (after step 12)

```
POST /api/instructor/quiz/create-manual
- Status: 201 or 200
- Body: { success: true, quiz_id, quiz_code }

GET /api/instructor/quiz/list-with-auth
- Status: 200
- Body includes newly created quiz
```

### Failure Paths to Test

- [ ] Save without title → should show error
- [ ] Save with 0 questions → should show error
- [ ] Add duplicate answer options → should allow or warn
- [ ] Enter very long question (2000+ chars) → should handle gracefully
- [ ] Network error during save → should retry or show error
- [ ] Try to save with invalid points (negative, non-numeric) → should reject
- [ ] Add question then immediately cancel → unsaved changes warning

### Pass Criteria

- ✅ All 5 questions created with correct data
- ✅ All data persists through page reload
- ✅ Edit works correctly
- ✅ Database contains exactly 1 quiz + 5 questions with correct values
- ✅ No duplicate entries created

---

## CUJ-002: Teacher Creates Quiz (CSV Upload)

**Personas**: Teacher/Instructor  
**Duration**: ~3 minutes  
**Complexity**: Medium

### Setup
- Teacher at `/teach/quiz/management`
- CSV file prepared with 5 questions (format: Question|Option1|Option2|Option3|Option4|Option5|CorrectIndex|Explanation)

### Steps

| Step | Action | Expected State | Verify |
|------|--------|-----------------|--------|
| 1 | Click "Create from CSV" | File upload dialog opens | Dialog renders |
| 2 | Select CSV file | File path shown or file icon | File selected |
| 3 | Click "Upload" | File processes, questions appear in preview | Preview shows Q1-Q5 |
| 4 | Verify preview shows all questions correctly | All 5 questions visible with options | Data matches CSV |
| 5 | Click "Create Quiz" | Quiz created, dialog closes | Returns to list |
| 6 | New quiz appears in list | Quiz visible with title | Status shows "active" or similar |
| 7 | Click quiz to view | All 5 questions appear with correct answers | Correct answer indices match CSV |
| 8 | Refresh page | Quiz still visible with same data | Persists after reload |

### Database Verification

```sql
SELECT COUNT(*) FROM quizzes 
WHERE created_by = [teacher_id] AND created_at > NOW() - INTERVAL '5 minutes';

-- Should return >= 1 (at least the CSV quiz)

SELECT * FROM quiz_questions 
WHERE quiz_id = [csv_quiz_id] 
ORDER BY question_number;

-- Should show 5 questions in order
-- Verify correct_answer_index matches CSV
```

### Failure Paths to Test

- [ ] Upload invalid CSV (wrong columns) → should show error
- [ ] Upload empty CSV → should show error
- [ ] Upload CSV with 0 questions → should show error
- [ ] Upload CSV with duplicate rows → should handle
- [ ] Upload very large CSV (1000+ questions) → should handle or reject gracefully
- [ ] Cancel upload mid-process → should clean up
- [ ] Network error during upload → should retry or error

### Pass Criteria

- ✅ All 5 questions created from CSV
- ✅ Correct answer indices are correct
- ✅ Data persists through reload
- ✅ Database shows quiz created by teacher

---

## CUJ-003: Teacher Launches Live Quiz Session

**Personas**: Teacher/Instructor, 3+ Students  
**Duration**: ~15 minutes  
**Complexity**: High (Multi-user)

### Setup
- Teacher has quiz "Test Quiz Live" (5 questions, 100 pts each)
- 3 student accounts ready (student1, student2, student3)
- Two browser windows or tabs (teacher + student)

### Steps

| Step | Action | Expected State | Verify |
|------|--------|-----------------|--------|
| 1 | Teacher: Go to quiz in management page | Quiz shows "Launch" or "Start" button | Button visible and clickable |
| 2 | Teacher: Click "Launch Live Session" | Session starts, generates 8-digit code | Code displayed to teacher (e.g., "A1B2C3D4") |
| 3 | Teacher: Copy quiz code | Code copied to clipboard or displayed | Code accessible |
| 4 | Teacher: Screen shows "Waiting for participants" | Lobby screen appears, participant count = 0 | Ready for students |
| 5 | Student 1: Go to /student/quiz/join | Join form appears | Input field for 8-digit code |
| 6 | Student 1: Enter code "A1B2C3D4" | Code accepted, quiz loads | Next screen is name entry |
| 7 | Student 1: Enter name "Alice" | Name field accepts text | Ready to proceed |
| 8 | Student 1: Click "Ready to Start" or "Join" | Student enters lobby, waiting screen | Name "Alice" appears on teacher's screen |
| 9 | Teacher: See "Alice" joined (participant count = 1) | Participant list updates in real-time | Name shows in lobby |
| 10 | Student 2: Repeat steps 5-9 with name "Bob" | "Bob" appears in lobby | Participant count = 2 |
| 11 | Student 3: Repeat steps 5-9 with name "Charlie" | "Charlie" appears in lobby | Participant count = 3 |
| 12 | Teacher: Verify all 3 names visible | Lobby shows Alice, Bob, Charlie | All participants listed |
| 13 | Teacher: Click "Start Quiz" | Question 1 appears on all screens | Timer starts (60 seconds) |
| 14 | All students: See Q1 "What is 2+2?" with 5 colored cards | Cards are clickable | Colorful cards visible (Blue, Cyan, Orange, Pink, Purple) |
| 15 | Student 1 (Alice): Click card C (4) | Card C highlights, shows as selected | Selected state visible |
| 16 | Student 2 (Bob): Click card B (3) | Card B highlights | Selected state visible |
| 17 | Student 3 (Charlie): Does NOT click (no answer) | Charlie's screen has no selection | No answer state shown |
| 18 | Teacher: See response count updating | Count shows "3 responses received" or similar | Real-time update |
| 19 | Timer counts down to 0 | Submissions close, feedback appears | All students see results |
| 20 | Alice's card C turns GREEN with ✓ | Feedback immediate | Correct answer highlighted |
| 21 | Bob's card B turns RED with ✗ | Feedback immediate | Incorrect answer highlighted |
| 22 | Charlie's screen shows "No answer submitted" or skipped | UI shows Charlie didn't answer | Neutral state |
| 23 | Leaderboard updates: Alice 100pts, Bob 0pts, Charlie 0pts | Scores reflect answers | Scoring correct |
| 24 | Teacher: Click "Next Question" or auto-advance | Q2 appears on all screens | Question 2 loads |
| 25 | Repeat Q2-Q5 with different student behaviors | All questions answered | Full quiz flow |
| 26 | After Q5: Results page loads | Shows summary, detailed review, leaderboard tabs | Quiz complete |
| 27 | Alice: Click "Summary" tab | Shows her score (400-500), pass %, rank | Results accurate |
| 28 | Bob: Click "Leaderboard" tab | Shows all students ranked, medals 🥇🥈🥉 | Rankings correct |
| 29 | Teacher: Click "View Results" | Teacher dashboard shows all student results | Results accessible to teacher |

### Database Verification (Real-time)

```sql
-- After step 13 (Quiz started)
SELECT * FROM quiz_sessions 
WHERE quiz_id = [quiz_id] AND status = 'active';

-- Should show 1 active session
-- created_at should be current time

-- After step 8 (Alice joined)
SELECT COUNT(*) FROM session_participants 
WHERE session_id = [session_id] AND status = 'active';

-- Should return 3 (Alice, Bob, Charlie)

-- After step 19 (First question submitted)
SELECT * FROM quiz_responses 
WHERE session_id = [session_id] AND question_number = 1
ORDER BY user_id;

-- Should show 3 responses:
-- Alice: answer_index=2, is_correct=true, points=100
-- Bob: answer_index=1, is_correct=false, points=0
-- Charlie: answer_index=NULL, is_correct=false, points=0

-- Leaderboard calculation
SELECT user_id, name, SUM(points) as total_score 
FROM quiz_responses 
WHERE session_id = [session_id] 
GROUP BY user_id, name 
ORDER BY total_score DESC;

-- After Q5: Should show final scores
-- Alice: 500 (all correct)
-- Bob: varies by answers
-- Charlie: varies by answers
```

### API Verification (During Quiz)

```
POST /api/quizzes/start-session
- Status: 200
- Returns: session_id, code, timer_duration

GET /api/quizzes/[code]/participants
- Status: 200
- Body: [{ name, status, joined_at }]

POST /api/student/submit-answer
- Status: 200
- Body: { points, is_correct, explanation }

GET /api/quizzes/[code]/results
- Status: 200
- Body: { session_summary, leaderboard, participant_results }
```

### Cross-Client Verification

**During question (step 19-23):**
- Teacher's response count matches 3 responses
- Each student's card color matches (Alice C=green, Bob B=red)
- Leaderboard order on Alice's screen = Leaderboard order on teacher's screen
- No data race conditions (responses counted correctly, not duplicated)

### Failure Paths to Test

- [ ] Student joins with invalid code → should reject
- [ ] Student joins twice (same code, same browser) → should handle (duplicate session or reject)
- [ ] Student joins then refreshes → should stay in quiz, not lose progress
- [ ] Student joins late (after Q2 starts) → should handle gracefully
- [ ] Teacher refreshes during question → quiz state preserved, timer continues
- [ ] Teacher changes question manually while timer running → should handle
- [ ] Student clicks answer AFTER timer expires → should reject or not count
- [ ] Network drops for 1 student mid-question → reconnection logic
- [ ] One student extremely slow to load (30+ sec) → doesn't hold up others
- [ ] Student submits same answer twice → count only once
- [ ] Very long participant name (100+ chars) → should truncate or wrap
- [ ] Emoji/unicode in names → should render correctly
- [ ] 50+ participants join → system handles scale
- [ ] Duplicate participant names → should allow or distinguish

### Pass Criteria

- ✅ All 3 students join and appear in real-time
- ✅ All 5 questions display correctly
- ✅ Scoring is correct (100 pts per correct answer)
- ✅ Leaderboard reflects actual scores
- ✅ Feedback (green/red) is immediate and accurate
- ✅ Timer counts down visibly
- ✅ All students see same questions at same time
- ✅ Teacher sees real-time response count
- ✅ Results persist and are retrievable
- ✅ Data in database matches UI

---

## CUJ-004: Student Refresh During Quiz

**Personas**: Student, Teacher (running session)  
**Duration**: ~10 minutes  
**Complexity**: High

### Setup
- Quiz in progress (Q2 of 5)
- 1 student (Alice) mid-quiz, 2 other students also active

### Steps

| Step | Action | Expected State | Verify |
|------|--------|-----------------|--------|
| 1 | Alice: On Question 2, has not yet answered | Q2 visible, timer running (e.g., 45 sec left) | Question displayed |
| 2 | Alice: Press F5 to refresh page | Page reloads | Browser refresh |
| 3 | After reload: Alice sees Question 2 again | Same Q2, timer continues countdown | Quiz state restored |
| 4 | Alice: Answer is NOT pre-selected (she hadn't answered yet) | Cards appear unselected | Correct initial state |
| 5 | Alice: Clicks card C | Card highlights | Answer selection works |
| 6 | Alice: Submits before timer expires | Feedback appears (green/red) | Answer accepted |
| 7 | Score updates on Alice's screen | Leaderboard shows her new score | Score reflects answer |
| 8 | Teacher still sees 3 participants | Participant list unchanged | Refresh doesn't disconnect |
| 9 | Teacher's response count for Q2 = 3 | All students' responses counted | No data loss |
| 10 | Continue to Q3 | Alice can answer Q3 normally | Quiz continues smoothly |

### Database Verification

```sql
-- After step 2 (refresh)
SELECT * FROM quiz_responses 
WHERE session_id = [session_id] AND user_id = [alice_id];

-- Before refresh: 1 response (Q1)
-- After refresh: still 1 response (Q1)
-- Q2 not yet in database

-- After step 6 (Q2 submitted)
SELECT COUNT(*) FROM quiz_responses 
WHERE session_id = [session_id] AND user_id = [alice_id];

-- Should return 2 (Q1 and Q2)
-- Exactly 2, not duplicated
```

### Pass Criteria

- ✅ Quiz state restored after refresh
- ✅ No duplicate submissions
- ✅ Student can continue normally
- ✅ Scores accurate
- ✅ Teacher sees complete data

---

## CUJ-005: Scoring & Leaderboard Accuracy

**Personas**: 3 Students  
**Duration**: ~15 minutes  
**Complexity**: High

### Setup
- Complete 5-question quiz with known correct answers
- 3 students with different answer patterns

### Steps & Expected Scoring

**Quiz Setup:**
- Q1: Answer=C, Points=100
- Q2: Answer=B, Points=100
- Q3: Answer=A, Points=100
- Q4: Answer=D, Points=100
- Q5: Answer=B, Points=100
- **Total Possible: 500 points**

**Student Answers:**

| Student | Q1 | Q2 | Q3 | Q4 | Q5 | Expected Score | Expected % |
|---------|-----|-----|-----|-----|-----|-----------------|------------|
| Alice | C✓ | B✓ | A✓ | D✓ | B✓ | 500 | 100% |
| Bob | C✓ | C✗ | A✓ | D✓ | A✗ | 300 | 60% |
| Charlie | D✗ | B✓ | C✗ | D✓ | B✓ | 300 | 60% |

### Steps

| Step | Action | Verify |
|------|--------|--------|
| 1 | Alice answers: C, B, A, D, B | 5 questions answered |
| 2 | Bob answers: C, C, A, D, A | 5 questions answered |
| 3 | Charlie answers: D, B, C, D, B | 5 questions answered |
| 4 | Quiz ends, results page loads | All 3 students see results |
| 5 | Alice's Summary: 500 points | Exact match expected |
| 6 | Alice's Summary: 5/5 correct | Exact match |
| 7 | Alice's Summary: 100% pass rate | Calculation correct |
| 8 | Bob's Summary: 300 points | Exact match expected |
| 9 | Bob's Summary: 3/5 correct | Exact match |
| 10 | Bob's Summary: 60% pass rate | Calculation correct |
| 11 | Charlie's Summary: 300 points | Exact match expected |
| 12 | Charlie's Summary: 3/5 correct | Exact match |
| 13 | Charlie's Summary: 60% pass rate | Calculation correct |
| 14 | Leaderboard shows: Alice 1st (500), Bob 2nd (300), Charlie 3rd (300) | Ranking correct |
| 15 | Alice has 🥇 medal | Top rank marked |
| 16 | Bob has 🥈 medal (or tied with Charlie) | 2nd place marked |
| 17 | Detailed Review: Each question shows correct answer | Explanations visible |
| 18 | Detailed Review: Bob's Q2 shows "You chose C, correct was B" | Feedback accurate |
| 19 | Teacher views results | All scores match student view |
| 20 | Refresh results page | Scores unchanged | Persistence verified |

### Database Verification

```sql
-- Verify responses recorded correctly
SELECT user_id, question_number, answer_index, is_correct, points 
FROM quiz_responses 
WHERE session_id = [session_id]
ORDER BY user_id, question_number;

-- Alice: 5 rows, all is_correct=true, all points=100
-- Bob: Q1=100, Q2=0, Q3=100, Q4=100, Q5=0
-- Charlie: Q1=0, Q2=100, Q3=0, Q4=100, Q5=100

-- Verify totals calculated
SELECT user_id, name, SUM(points) as total_score, COUNT(*) as questions_answered
FROM quiz_responses 
WHERE session_id = [session_id]
GROUP BY user_id, name;

-- Alice: total_score=500, questions_answered=5
-- Bob: total_score=300, questions_answered=5
-- Charlie: total_score=300, questions_answered=5

-- Verify leaderboard ranking
SELECT user_id, name, total_score, 
       ROW_NUMBER() OVER (ORDER BY total_score DESC) as rank
FROM (
  SELECT user_id, name, SUM(points) as total_score
  FROM quiz_responses 
  WHERE session_id = [session_id]
  GROUP BY user_id, name
);

-- Alice: rank=1
-- Bob: rank=2
-- Charlie: rank=3
```

### Pass Criteria

- ✅ All 15 submissions recorded (5 per student)
- ✅ All scoring calculations correct
- ✅ Pass percentages calculated correctly
- ✅ Leaderboard ranking accurate
- ✅ No duplicate submissions
- ✅ Database matches UI exactly
- ✅ Persists through reload

---

## CUJ-006: Results Persistence & Retrieval

**Personas**: Teacher, Student  
**Duration**: ~10 minutes  
**Complexity**: Medium

### Setup
- Quiz session completed (all results saved)
- Teacher and students have results visible

### Steps

| Step | Action | Verify |
|------|--------|--------|
| 1 | Teacher navigates away from results page | Results saved in database |
| 2 | Teacher goes to `/teach/quiz/[quizId]/results` | Previous session results load | Old results visible |
| 3 | Results show all 3 students and scores | Data intact | Matches previous view |
| 4 | Teacher logs out | Session ends |
| 5 | Teacher logs back in | Auth successful |
| 6 | Teacher navigates to results again | Results still present | Persisted across session |
| 7 | Student navigates away from results | Data saved |
| 8 | Student visits homepage | Navigated away |
| 9 | Student goes to `/student/quiz/results/[sessionId]` | Results load | Student can re-access own results |
| 10 | Student sees own results and rank | Matches previous view | Data persisted |
| 11 | Student's leaderboard shows all participants | All names and scores visible | Complete data available |

### Database Verification

```sql
-- Verify session exists and is marked complete
SELECT * FROM quiz_sessions 
WHERE id = [session_id];

-- Status should be 'completed' or 'finished'
-- ended_at should have timestamp

-- Verify all responses present
SELECT COUNT(*) FROM quiz_responses 
WHERE session_id = [session_id];

-- Should return 15 (5 questions × 3 students)

-- Verify leaderboard data queryable
SELECT user_id, name, SUM(points) as score
FROM quiz_responses 
WHERE session_id = [session_id]
GROUP BY user_id, name
ORDER BY score DESC;

-- Should return consistent results on every query
```

### Pass Criteria

- ✅ Results persist across page navigations
- ✅ Results persist across session logout/login
- ✅ No data loss or corruption
- ✅ Multiple users can access same results (if authorized)
- ✅ Data matches original submission

---

## CUJ-007: Teacher Edits Quiz After Creating It

**Personas**: Teacher  
**Duration**: ~10 minutes  
**Complexity**: Medium

### Setup
- Quiz "Test Quiz Live" exists (5 questions)
- No active sessions

### Steps

| Step | Action | Verify |
|------|--------|--------|
| 1 | Teacher: Go to quiz management | Quiz visible in list |
| 2 | Teacher: Click "Edit" on quiz | Quiz form opens with all data | Title, description, 5 questions shown |
| 3 | Teacher: Modify Q1 answer from C to D | Change visible in form | Editable |
| 4 | Teacher: Delete Q5 | Q5 removed from form | Deletion works |
| 5 | Teacher: Add new Q5 (different question) | New Q5 added | Can add after delete |
| 6 | Teacher: Click "Save" | Changes persisted | Quiz saved |
| 7 | Teacher: Refresh page | Modified quiz appears | Edit persists |
| 8 | Teacher: Opens quiz again | Q1 shows answer D, Q5 is new question | All changes present |

### Database Verification

```sql
-- After step 6
SELECT * FROM quiz_questions 
WHERE quiz_id = [quiz_id]
ORDER BY question_number;

-- Should show:
-- Q1: correct_answer_index=3 (D, not 2/C)
-- Q2-Q4: unchanged
-- Q5: new question data
-- Count: 5 questions (not 4)
```

### Pass Criteria

- ✅ Can modify existing questions
- ✅ Can delete questions
- ✅ Can add new questions
- ✅ All changes persist
- ✅ No ghost data or corruption

---

## Test Status Template

For each CUJ, after execution:

```markdown
## CUJ-001 Status

**Date Tested**: YYYY-MM-DD
**Tester**: [Name]
**Browser**: Chrome 131 / Desktop
**Result**: PASS / FAIL / BLOCKED

### Evidence
- [x] Step 1-5: Verified
- [x] Step 6-10: Verified
- [x] Database checks: Passed
- [x] API checks: Passed

### Issues Found
1. [Issue description] - BLOCKER / HIGH / MEDIUM / LOW

### Notes
[Any additional observations]
```

---

## Release Gate Checklist

Before declaring **PRODUCTION READY**:

- [ ] CUJ-001: PASS
- [ ] CUJ-002: PASS
- [ ] CUJ-003: PASS
- [ ] CUJ-004: PASS
- [ ] CUJ-005: PASS
- [ ] CUJ-006: PASS
- [ ] CUJ-007: PASS
- [ ] All failure paths tested
- [ ] No critical defects
- [ ] All blockers resolved

---

**This document is the release gate. Every CUJ must be tested and documented before launch.**
