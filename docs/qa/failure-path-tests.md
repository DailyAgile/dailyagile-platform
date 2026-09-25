# Failure Path Testing - Quiz System
**Date**: 2026-09-25  
**Status**: Comprehensive Failure Path Documentation

---

## Overview

This document specifies failure paths that MUST be tested before production release.

Failure paths test:
- Invalid input handling
- Error recovery
- Edge cases
- Boundary conditions
- Network failures
- Concurrent user conflicts
- Data consistency under failure

---

## FP-001: Invalid Quiz Code

**Category**: Input Validation  
**Severity**: HIGH (Security/UX)

### Test Case

| Step | Action | Expected | Verify |
|------|--------|----------|--------|
| 1 | Go to `/student/quiz/join` | Join form appears | Form renders |
| 2 | Enter code "INVALID" (6 chars, not 8) | Input accepted | Field allows entry |
| 3 | Click "Join" or "Continue" | Error shown | Validation message appears |
| 4 | Error message states: "Invalid code format. Use 8-digit code" | Clear error | User knows what's wrong |
| 5 | Enter code "00000000" (valid format, doesn't exist) | Input accepted | Format validation passes |
| 6 | Click "Join" | Error: "Quiz not found" | Specific error message |
| 7 | Try SQL injection: "' OR '1'='1" | Rejected or sanitized | Security verified |
| 8 | Try XSS: "<script>alert('XSS')</script>" | Rejected or escaped | Security verified |

### Database Verification

```sql
-- Verify no spurious records created
SELECT COUNT(*) FROM quiz_sessions 
WHERE quiz_code = 'INVALID';
-- Should return 0

SELECT COUNT(*) FROM quiz_sessions 
WHERE quiz_code = '00000000';
-- Should return 0

-- Verify no session_participants created
SELECT COUNT(*) FROM session_participants 
WHERE session_id IS NULL;
-- Should return 0 (no orphaned participants)
```

### Pass Criteria

- ✅ Invalid code rejected
- ✅ Error message clear
- ✅ No database pollution
- ✅ No security bypasses
- ✅ User can retry

---

## FP-002: Student Joins After Quiz Started

**Category**: Concurrent User Behavior  
**Severity**: MEDIUM

### Scenario

- Quiz launched, Q1 already in progress (timer at 45 seconds)
- Student tries to join mid-quiz

### Test Case

| Step | Action | Expected | Verify |
|------|--------|----------|--------|
| 1 | Teacher launches quiz | Q1 timer running | Question active |
| 2 | Students A & B answer and move to Q2 | Students on Q2 | Progress made |
| 3 | Student C tries to join with code | Code accepted | Join allowed |
| 4 | Student C redirected to current question (Q2) | Shows Q2, not Q1 | Synced with quiz state |
| 5 | Student C can answer Q2 | Answer submission works | Can participate |
| 6 | Student C's score reflects only Q2-Q5 (missed Q1) | Score = 0-400 (not 0-500) | Correct calculation |
| 7 | Leaderboard shows Student C ranked by their score | Visible in standings | Fair ranking |

### Database Verification

```sql
-- Verify late joiner record
SELECT * FROM session_participants 
WHERE user_id = [student_c_id] 
AND session_id = [session_id];

-- joined_at should be AFTER quiz started
-- Questions answered: Q2-Q5 (4 questions, not 5)

SELECT COUNT(*) FROM quiz_responses 
WHERE user_id = [student_c_id] 
AND session_id = [session_id];

-- Should return 4 (Q2-Q5), not 5
```

### Pass Criteria

- ✅ Late joiner can join
- ✅ Late joiner sees current question
- ✅ Late joiner can answer
- ✅ Scoring excludes missed questions
- ✅ Leaderboard fair

---

## FP-003: Student Refreshes Mid-Question

**Category**: Session Recovery  
**Severity**: HIGH

### Scenario

- Quiz in progress, Q3 of 5
- Student refreshes page (F5) mid-question (timer at 30 seconds)

### Test Case

| Step | Action | Expected | Verify |
|------|--------|----------|--------|
| 1 | Student on Q3, timer = 30 seconds | Question displayed | State known |
| 2 | Student presses F5 (refresh) | Page reloads | Refresh executed |
| 3 | After reload: Student sees Q3 again | Same question loaded | State restored |
| 4 | Timer still running, ~25-28 seconds left | Timer resumes | Not reset to 60 |
| 5 | Student's previous answer (if any) NOT pre-filled | Cards unselected | Fresh state |
| 6 | Student can click card and submit | Answer submission works | Can answer again |
| 7 | Only ONE submission counted | Response count = 1 | No duplicates |
| 8 | Score reflects only one answer | Points = 0 or 100 | Correct |

### Database Verification

```sql
-- Verify exactly one response recorded
SELECT COUNT(*) FROM quiz_responses 
WHERE user_id = [student_id] 
AND session_id = [session_id] 
AND question_number = 3;

-- Should return 1 (not 2)

-- If student answered twice: second answer should replace or be rejected
-- Database should show only the final answer
```

### Pass Criteria

- ✅ State restored after refresh
- ✅ Timer continues (not reset)
- ✅ No duplicate submissions
- ✅ Scoring correct
- ✅ User can complete quiz normally

---

## FP-004: Student Submits Answer AFTER Timer Expires

**Category**: Input Validation  
**Severity**: HIGH

### Scenario

- Q2 timer reaches 0 seconds
- Student clicks card AFTER submissions should be closed

### Test Case

| Step | Action | Expected | Verify |
|------|--------|----------|--------|
| 1 | Timer shows 5 seconds | Countdown visible | About to expire |
| 2 | Timer counts down: 4, 3, 2, 1, 0 | Submission closes | Timer expires |
| 3 | Cards become unclickable or disabled | No selection possible | Prevented |
| 4 | Student tries to click card | Click ignored or rejected | No submission |
| 5 | Feedback message shows: "Time expired" or moves to next | Clear state | User knows |
| 6 | Question auto-advances to Q3 | Next question shown | Proceeds normally |
| 7 | Database shows NO response for Q2 from this student | No submission recorded | Validation worked |
| 8 | Student's score does not include points for Q2 | Score accurate | Calculated correctly |

### Database Verification

```sql
-- Verify no response after timer expired
SELECT * FROM quiz_responses 
WHERE user_id = [student_id] 
AND session_id = [session_id] 
AND question_number = 2;

-- Should return 0 rows (no submission)
```

### Pass Criteria

- ✅ Submit button disabled or cards unclickable after time
- ✅ Late submission rejected
- ✅ No database entry for expired submission
- ✅ Score excludes expired question
- ✅ Quiz proceeds to next question

---

## FP-005: Student Submits Same Answer Twice

**Category**: Idempotency  
**Severity**: MEDIUM

### Scenario

- Q1 on screen, student clicks card C
- Student clicks card C again before next question

### Test Case

| Step | Action | Expected | Verify |
|------|--------|----------|--------|
| 1 | Student clicks card C (correct answer) | Card highlights, shows selected | First selection |
| 2 | Before timer expires, student clicks card C again | No change or ignored | Idempotent |
| 3 | Feedback shows after timer | Green card with ✓ (once) | Single feedback |
| 4 | Score = 100 points (not 200) | Correct | Not double-counted |
| 5 | Leaderboard reflects 100, not 200 | Score accurate | Accurate ranking |
| 6 | Database shows one response, not two | SELECT COUNT = 1 | No duplication |

### Database Verification

```sql
-- Verify single response
SELECT COUNT(*) FROM quiz_responses 
WHERE user_id = [student_id] 
AND session_id = [session_id] 
AND question_number = 1;

-- Should return exactly 1
-- Points should be 100, not 200
```

### Pass Criteria

- ✅ Second submission ignored or replaces first
- ✅ Only one database entry
- ✅ Score counted once
- ✅ No double-scoring

---

## FP-006: Network Failure During Answer Submission

**Category**: Network Resilience  
**Severity**: CRITICAL

### Scenario

- Student clicks answer
- Network request fails (simulated via browser dev tools)
- Student's answer lost or not processed

### Test Case (Browser Dev Tools > Network > Offline)

| Step | Action | Expected | Verify |
|------|--------|----------|--------|
| 1 | Student on Q2, connection active | Normal state | Baseline |
| 2 | Disable network (Chrome: DevTools > Network > Offline) | No internet | Offline state |
| 3 | Student clicks card and tries to submit | Request fails | Network error |
| 4 | Error message appears: "Connection lost. Please try again." | Clear error | User aware |
| 5 | Re-enable network (toggle back online) | Connection restored | Back online |
| 6 | Student clicks "Retry" or tries again | Submission succeeds | Reconnection works |
| 7 | Answer recorded | Database updated | Success |
| 8 | Score updates | Leaderboard refreshed | Reflected |

### Database Verification

```sql
-- Verify response eventually recorded after reconnection
SELECT * FROM quiz_responses 
WHERE user_id = [student_id] 
AND session_id = [session_id] 
AND question_number = 2;

-- Should return 1 row (once, not duplicated on retry)
```

### Pass Criteria

- ✅ Network error caught and shown
- ✅ User can retry
- ✅ No duplicate entries on retry
- ✅ Answer recorded exactly once
- ✅ Quiz continues normally

---

## FP-007: Concurrent Duplicate Participant Names

**Category**: Data Integrity  
**Severity**: MEDIUM

### Scenario

- 3 students, 2 with same name "Alice"

### Test Case

| Step | Action | Expected | Verify |
|------|--------|----------|--------|
| 1 | Student 1 joins, enters name "Alice" | Name accepted | First Alice joined |
| 2 | Student 2 joins, enters name "Alice" | Name accepted or warned | Second Alice allowed |
| 3 | Leaderboard shows both "Alice" or distinguishes them | Visible/identifiable | Clear distinction |
| 4 | Both Alice's answers recorded | Database has both | Separate entries |
| 5 | Scoring correct for each | Scores accurate | Not confused |
| 6 | Teacher/other students see both Alices | Leaderboard shows clearly | No ambiguity |

### Database Verification

```sql
-- Verify both records exist
SELECT * FROM session_participants 
WHERE session_id = [session_id] 
AND name = 'Alice';

-- Should return 2 rows with different user_ids
-- Scores tracked separately
```

### Pass Criteria

- ✅ Duplicate names allowed or clearly distinguished
- ✅ Both records in database
- ✅ Scores tracked separately
- ✅ No confusion in leaderboard

---

## FP-008: Very Long Participant Name

**Category**: Input Validation  
**Severity**: LOW

### Scenario

- Student enters 200+ character name

### Test Case

| Step | Action | Expected | Verify |
|------|--------|----------|--------|
| 1 | Student enters name: "A" × 200 chars | Input accepted or truncated | Handled gracefully |
| 2 | Quiz proceeds | Long name doesn't break UI | No crash |
| 3 | Leaderboard displays name | Truncated or wrapped, readable | Visible |
| 4 | Database stores full or truncated name | No crash or data loss | Handled |
| 5 | No database error | Query succeeds | Valid |

### Pass Criteria

- ✅ No crash or exception
- ✅ Input truncated or limited
- ✅ UI doesn't break
- ✅ Database stores safely

---

## FP-009: Unicode & Emoji in Participant Name

**Category**: Internationalization  
**Severity**: LOW

### Scenario

- Student enters emoji or Unicode name: "🎯 Quiz Master 🔥"

### Test Case

| Step | Action | Expected | Verify |
|------|--------|----------|--------|
| 1 | Student enters name with emoji: "🎯 Quiz Master 🔥" | Input accepted | Allowed |
| 2 | Quiz proceeds | No encoding errors | Handled |
| 3 | Leaderboard displays emoji correctly | Renders properly | Visible |
| 4 | Database stores correctly | No corruption | Valid |
| 5 | Teacher sees emoji in results | Displays correctly | Readable |

### Pass Criteria

- ✅ Emoji/Unicode accepted
- ✅ Displays correctly in UI
- ✅ Stored correctly in database
- ✅ No encoding errors

---

## FP-010: Teacher Refreshes During Active Quiz

**Category**: Session Recovery  
**Severity**: CRITICAL

### Scenario

- Teacher is hosting live Q2 (timer running, students answering)
- Teacher refreshes browser (F5)

### Test Case

| Step | Action | Expected | Verify |
|------|--------|----------|--------|
| 1 | Teacher on Q2, students answering, timer = 30 sec | Quiz active | State known |
| 2 | Teacher presses F5 (refresh) | Page reloads | Refresh executed |
| 3 | After reload: Same quiz session restored | Q2 shows, timer ~25-28 sec | State preserved |
| 4 | Participant list shows all 3 students | Students still joined | No disconnection |
| 5 | Response count shows correct number received so far | Accurate count | Data preserved |
| 6 | Teacher can click "Next Question" to advance | Functionality works | Can continue |
| 7 | Quiz completes normally | No interruption | Continues smoothly |

### Database Verification

```sql
-- Verify session still active and responses preserved
SELECT * FROM quiz_sessions 
WHERE id = [session_id];

-- Status should be 'active' or 'in_progress'
-- started_at present, ended_at NULL

SELECT COUNT(*) FROM session_participants 
WHERE session_id = [session_id];

-- Should still show 3 participants
```

### Pass Criteria

- ✅ Quiz session state restored
- ✅ Participant list unchanged
- ✅ Responses preserved
- ✅ Can continue normally
- ✅ No data loss

---

## FP-011: Teacher Deletes Quiz While Students Are Taking It

**Category**: Data Integrity / UX  
**Severity**: CRITICAL

### Scenario

- Quiz active, students on Q3
- Teacher (or admin) deletes the quiz from management page

### Test Case

| Step | Action | Expected | Verify |
|------|--------|----------|--------|
| 1 | Students taking Q3, teacher views management page | Quiz visible | Normal state |
| 2 | Teacher clicks "Delete" on quiz | Confirmation dialog | Safety prompt |
| 3 | Teacher confirms deletion | Quiz deleted from list | Deletion executed |
| 4 | Student tries to answer Q4 | Request fails or handled | Error or graceful |
| 5 | Student sees error: "Quiz no longer available" or similar | Clear message | User aware |
| 6 | Student redirected to home or quiz list | Graceful recovery | No broken state |
| 7 | Results already submitted (Q1-Q3) preserved | Data not lost | Saved responses |

### Database Verification

```sql
-- Verify quiz deleted but responses preserved
SELECT * FROM quizzes 
WHERE id = [quiz_id];
-- Should return NULL (deleted)

SELECT COUNT(*) FROM quiz_responses 
WHERE session_id = [session_id];
-- Should still return submitted responses (not deleted)
```

### Pass Criteria

- ✅ Deletion allowed
- ✅ Active students notified
- ✅ Already-submitted responses preserved
- ✅ Graceful error handling
- ✅ No cascade deletion of responses

---

## FP-012: Multiple Participants Joining Simultaneously

**Category**: Concurrency  
**Severity**: MEDIUM

### Scenario

- 20 students try to join with same code at exact same time

### Test Case

| Step | Action | Expected | Verify |
|------|--------|----------|--------|
| 1 | Initiate 20 browser instances | 20 tabs ready | Setup |
| 2 | All enter code "12345678" | Code accepted × 20 | Input |
| 3 | All click "Join" within same second | Concurrent requests | Race condition test |
| 4 | All successfully join | 20 responses: success | No failures |
| 5 | Participant count = 20 | Accurate count | Real-time update |
| 6 | All see quiz question | All synchronized | Same state |
| 7 | Database shows 20 session_participants | All recorded | Complete |
| 8 | No duplicate joins | Distinct entries | Unique |

### Database Verification

```sql
-- Verify all 20 joined
SELECT COUNT(*) FROM session_participants 
WHERE session_id = [session_id];
-- Should return 20

-- Verify no duplicates
SELECT user_id, COUNT(*) 
FROM session_participants 
WHERE session_id = [session_id]
GROUP BY user_id
HAVING COUNT(*) > 1;
-- Should return 0 rows (no dupes)
```

### Pass Criteria

- ✅ All 20 join successfully
- ✅ Participant count accurate
- ✅ No duplicate entries
- ✅ No race conditions
- ✅ System handles scale

---

## Summary: Failure Path Status

| FP | Name | Status | Action Required |
|----|------|--------|-----------------|
| FP-001 | Invalid Code | ⚠️ UNTESTED | Test with invalid inputs |
| FP-002 | Late Joiner | ⚠️ UNTESTED | Test mid-quiz join |
| FP-003 | Refresh Mid-Q | ⚠️ UNTESTED | Test F5 during question |
| FP-004 | Late Submission | ⚠️ UNTESTED | Test after timer |
| FP-005 | Duplicate Submit | ⚠️ UNTESTED | Test double-click |
| FP-006 | Network Failure | ⚠️ UNTESTED | Test offline scenario |
| FP-007 | Duplicate Names | ⚠️ UNTESTED | Test same name × 2 |
| FP-008 | Long Name | ⚠️ UNTESTED | Test 200+ char name |
| FP-009 | Unicode/Emoji | ⚠️ UNTESTED | Test emoji names |
| FP-010 | Teacher Refresh | ⚠️ UNTESTED | Test F5 as host |
| FP-011 | Quiz Deleted | ⚠️ UNTESTED | Test delete during quiz |
| FP-012 | Concurrent Joins | ⚠️ UNTESTED | Test 20 simultaneous |

---

## Release Gate

Before declaring **PRODUCTION READY**, all 12 failure paths must be tested and documented with evidence.

- [ ] FP-001 tested and PASSED/BLOCKED
- [ ] FP-002 tested and PASSED/BLOCKED
- [ ] FP-003 tested and PASSED/BLOCKED
- [ ] FP-004 tested and PASSED/BLOCKED
- [ ] FP-005 tested and PASSED/BLOCKED
- [ ] FP-006 tested and PASSED/BLOCKED
- [ ] FP-007 tested and PASSED/BLOCKED
- [ ] FP-008 tested and PASSED/BLOCKED
- [ ] FP-009 tested and PASSED/BLOCKED
- [ ] FP-010 tested and PASSED/BLOCKED
- [ ] FP-011 tested and PASSED/BLOCKED
- [ ] FP-012 tested and PASSED/BLOCKED

**Status**: ⚠️ NOT YET TESTED
