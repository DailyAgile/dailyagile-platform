# DailyAgile Phase 2 Local Testing Plan

**Duration:** 3-4 days (8-12 hours total testing)  
**Environment:** Local development server (http://localhost:3002)  
**Prerequisites:** Complete INFRASTRUCTURE_SETUP_GUIDE.md first  
**Goal:** Verify all features work before staging deployment

---

## 📋 Phase 2 Testing Scope

Phase 2 covers the 3 major areas NOT fully tested in Phase 1:

| Area | Status | Duration |
|------|--------|----------|
| **Quiz Module** | Core feature, untested | 4-5 hours |
| **Localization** | 11 languages, untested | 2-3 hours |
| **Instructor Features** | Full workflow, untested | 2-3 hours |
| **Performance & Mobile** | Load testing, device testing | 1-2 hours |
| **TOTAL** | Comprehensive testing | **9-13 hours** |

---

## 🎯 Day 1: Quiz Module Testing (4-5 hours)

### Test 1: Quiz Creation (Manual Entry)
**Duration:** 1 hour  
**What to test:** Instructor creates quiz with different question types

**Steps:**
1. Login as instructor: `instructor@dailyagile.com` / `Instructor123!`
2. Navigate to: `/teach/quiz/create`
3. Create quiz with 5 questions:
   - **Q1: Multiple Choice** — "What is 2+2?" with options A:4, B:5, C:6
   - **Q2: Short Answer** — "What is the capital of France?" (exact match: Paris)
   - **Q3: Essay** — "Explain your learning style" (open-ended)
   - **Q4: Code Snippet** — "Write a Python function to add two numbers"
   - **Q5: Scenario** — "A customer is unhappy. What do you do?" (multiple choice)
4. Set: Pass threshold = 70%, Time limit = 30 minutes
5. Save quiz
6. Verify quiz appears in instructor dashboard

**Expected Results:**
- ✅ Quiz saves successfully
- ✅ All 5 questions save with correct types
- ✅ Quiz visible in dashboard
- ✅ No errors in browser console

**Report Issues:**
```
Issue Type: [Bug | Design | Performance]
Description: [what happened]
Steps to Reproduce: [how to repeat]
Expected: [what should happen]
Actual: [what actually happened]
Screenshot: [if applicable]
```

---

### Test 2: Quiz Creation (CSV Upload)
**Duration:** 45 minutes  
**What to test:** Bulk import questions from CSV

**Steps:**
1. Download CSV template from `/teach/quiz/create?method=csv`
2. Fill with 3 questions:
   ```csv
   question_text,question_type,option_a,option_b,correct_answer,points
   "What is AI?","multiple_choice","Artificial Intelligence","Advanced Interface","Artificial Intelligence",10
   "Capital of Japan?","short_answer","Tokyo","Tokyo","Tokyo",10
   "Describe machine learning","essay","","","any answer","10
   ```
3. Upload CSV
4. Verify import: Should show "Imported 3 questions successfully"
5. Check each question imported correctly

**Expected Results:**
- ✅ CSV parses without errors
- ✅ All 3 questions import correctly
- ✅ Question types preserved
- ✅ Points values saved

**Report Issues:** Same format as Test 1

---

### Test 3: Quiz Creation (AI Generation)
**Duration:** 30 minutes  
**What to test:** Claude generates quiz questions

**Steps:**
1. Navigate to: `/teach/quiz/create?method=ai`
2. Enter topic: "Python Basics for Beginners"
3. Click "Generate Questions"
4. Wait for Claude to generate 5 questions
5. Review generated questions (should be relevant to topic)
6. Edit one question to verify editing works
7. Save quiz

**Expected Results:**
- ✅ Questions generate in < 30 seconds
- ✅ Questions are relevant to topic
- ✅ All 5 questions present
- ✅ Questions are well-formatted
- ✅ Can edit before saving

**Report Issues:** Same format

---

### Test 4: Student Takes Quiz (Full Flow)
**Duration:** 1 hour  
**What to test:** Student submits answers and receives grades

**Prerequisites:**
1. Create student account: `student1@test.com` / `Student123!`
2. Assign created quiz to this student

**Steps:**
1. Login as student
2. View available quizzes
3. Click quiz: "Start Quiz"
4. Answer all questions:
   - Q1 (MC): Select "A" (correct)
   - Q2 (Short): Type "Paris"
   - Q3 (Essay): Type "I prefer visual learning"
   - Q4 (Code): Paste working function
   - Q5 (Scenario): Select appropriate response
5. Click "Submit Quiz"
6. Review results page

**Expected Results:**
- ✅ Timer displays (if set)
- ✅ Progress bar shows question count
- ✅ Can navigate between questions
- ✅ All answers save when moving between Q's
- ✅ Results show immediately after submission
- ✅ Score calculated correctly (multiple choice 100%, essay/code manual review)
- ✅ Feedback displayed for each question

**Report Issues:** Same format

---

### Test 5: Instructor Grades Responses
**Duration:** 30 minutes  
**What to test:** Grading workflow (auto-grade + manual grading)

**Steps:**
1. Login as instructor
2. Navigate to: Gradebook for created quiz
3. View student's submission
4. For multiple choice: Verify auto-graded (10/10 points)
5. For essay: Enter grade manually (8/10, feedback: "Great explanation")
6. For code: Enter grade (9/10, feedback: "Elegant solution")
7. Submit grades
8. Login as student, verify grades appear

**Expected Results:**
- ✅ Multiple choice auto-grades instantly
- ✅ Can manually grade essay/code
- ✅ Can add feedback per question
- ✅ Grades save and sync to student view
- ✅ Gradebook totals calculated correctly

**Report Issues:** Same format

---

## 🌍 Day 2: Localization Testing (2-3 hours)

### Test 6: German Localization
**Duration:** 45 minutes  
**What to test:** Quiz displays correctly in German with proper formatting

**Steps:**
1. Change platform language to German (de-DE)
2. Verify all quiz UI translates:
   - Quiz title, description, questions translate
   - Button labels: "Start", "Submit", "Next" → German equivalents
3. Take a quiz and verify:
   - **Number formatting:** Score should show "85,5 %" (not "85.5%")
   - Decimal separator is comma
   - Space before percent sign
4. Check date/time format (should be DD.MM.YYYY HH:MM)

**Expected Results:**
- ✅ All text translates to German
- ✅ Number formatting follows German rules (85,5 %)
- ✅ No English text spillover
- ✅ Date format is correct

**Report Issues:** Same format

---

### Test 7: Arabic Localization (RTL)
**Duration:** 45 minutes  
**What to test:** Quiz supports right-to-left layout

**Steps:**
1. Change language to Arabic (ar-SA)
2. Verify RTL layout:
   - Text flows right-to-left
   - Buttons are right-aligned
   - Navigation menu is mirrored
3. Take a quiz:
   - Questions display in Arabic, right-to-left
   - Multiple choice options flow RTL
   - Submitted feedback displays correctly

**Expected Results:**
- ✅ Layout mirrors for RTL (right-aligned)
- ✅ Text flows right-to-left
- ✅ Buttons and controls are RTL-positioned
- ✅ No layout breaks
- ✅ Arabic numerals render correctly

**Report Issues:** Same format

---

### Test 8: Chinese Localization
**Duration:** 45 minutes  
**What to test:** Chinese characters display correctly

**Steps:**
1. Change language to Chinese (zh-CN)
2. Verify Chinese text displays:
   - Quiz title, questions in Chinese
   - Character rendering clear (not garbled)
   - Font supports Chinese (checking for tofu boxes 🟩)
3. Take quiz and check formatting:
   - Numbers display correctly
   - No text overflow (Chinese characters can be wider)

**Expected Results:**
- ✅ All Chinese characters render clearly
- ✅ No garbled text
- ✅ No font substitution issues
- ✅ Line breaks work correctly

**Report Issues:** Same format

---

## 👨‍🏫 Day 3: Instructor Features Testing (2-3 hours)

### Test 9: Instructor Dashboard
**Duration:** 30 minutes  
**What to test:** Dashboard shows correct metrics

**Steps:**
1. Login as instructor
2. View dashboard: Should show:
   - Total quizzes created (should be 3+)
   - Total students enrolled
   - Average quiz score
   - Recent activity
3. Click on a quiz to view analytics:
   - Question difficulty (% correct for each)
   - Student average score
   - Time spent per question
   - Score distribution (A, B, C, etc.)

**Expected Results:**
- ✅ Metrics display correctly
- ✅ Numbers match expectations (can verify manually)
- ✅ Analytics chart renders
- ✅ No errors in console

**Report Issues:** Same format

---

### Test 10: Student Management
**Duration:** 30 minutes  
**What to test:** Add/remove students from quizzes

**Steps:**
1. From instructor dashboard, go to "Manage Students"
2. Search for student1@test.com
3. Assign to a quiz
4. Verify student can see quiz
5. Remove student from quiz
6. Verify student can no longer see quiz

**Expected Results:**
- ✅ Can search students
- ✅ Can assign to quiz instantly
- ✅ Student sees quiz after assignment
- ✅ Can remove student
- ✅ Quiz disappears from student view after removal

**Report Issues:** Same format

---

### Test 11: Quiz Analytics Report
**Duration:** 30 minutes  
**What to test:** Export and view detailed analytics

**Steps:**
1. Select a quiz with multiple student submissions
2. Generate analytics report (click "Export Report")
3. Download CSV with:
   - Student names, emails
   - Individual scores
   - Question-by-question results
   - Time per question
4. Open CSV in Excel/Google Sheets
5. Verify all data is present and correct

**Expected Results:**
- ✅ Report generates without error
- ✅ All students listed
- ✅ Question-level breakdown included
- ✅ CSV opens and formats correctly
- ✅ No PII exposed inappropriately

**Report Issues:** Same format

---

## 📱 Day 4: Performance & Mobile Testing (1-2 hours)

### Test 12: Mobile Responsiveness
**Duration:** 1 hour  
**What to test:** Quiz works on mobile devices

**Steps:**
1. **Using Browser DevTools (fastest):**
   - Open DevTools (F12)
   - Toggle Device Toolbar (Ctrl+Shift+M)
   - Test screen sizes: 375px (mobile), 768px (tablet), 1024px (desktop)

2. **On Real Device (if available):**
   - Open http://[YOUR_LOCAL_IP]:3002 on iPhone/Android
   - Take a quiz from start to finish

3. **Test these interactions:**
   - Can click buttons (44px+ min size)
   - Can type in text inputs
   - Scroll works smoothly
   - No horizontal scrolling
   - Layout adapts to screen

**Expected Results:**
- ✅ No horizontal scroll on mobile
- ✅ Touch targets are 44px+ (finger-friendly)
- ✅ Quiz flows naturally on mobile
- ✅ Buttons and inputs responsive to touch
- ✅ No layout breaks at 375px width

**Report Issues:** Same format, include screen size tested

---

### Test 13: Performance Metrics
**Duration:** 30 minutes  
**What to test:** Page load times and responsiveness

**Steps:**
1. **Quiz List Page Load:**
   ```bash
   time curl -s http://localhost:3002/teach/quiz | wc -l
   # Should load in < 2 seconds
   ```

2. **Quiz Player Load:**
   - Open Devtools → Network tab
   - Navigate to quiz player
   - Check Total Load Time (should be < 3 seconds)
   - Check Largest Contentful Paint (should be < 2.5 seconds)

3. **Quiz Submission Latency:**
   - Submit answer (click Next)
   - Should respond in < 500ms

**Expected Results:**
- ✅ Quiz list loads in < 2s
- ✅ Quiz player loads in < 3s
- ✅ Answer submission responds in < 500ms
- ✅ No memory leaks (run for 10+ min)

**Report Issues:** Include actual timings

---

## ✅ Test Results Summary Template

Create a file: `TEST_RESULTS_PHASE_2.md`

```markdown
# Phase 2 Test Results — [DATE]

## Summary
- Tests Run: 13/13
- Passed: X/13
- Failed: Y/13
- Skipped: Z/13

## By Day

### Day 1: Quiz Module
- Test 1 (Manual Quiz Creation): ✅ PASS / ❌ FAIL
- Test 2 (CSV Upload): ✅ PASS / ❌ FAIL
- Test 3 (AI Generation): ✅ PASS / ❌ FAIL
- Test 4 (Student Quiz): ✅ PASS / ❌ FAIL
- Test 5 (Grading): ✅ PASS / ❌ FAIL

### Day 2: Localization
- Test 6 (German): ✅ PASS / ❌ FAIL
- Test 7 (Arabic RTL): ✅ PASS / ❌ FAIL
- Test 8 (Chinese): ✅ PASS / ❌ FAIL

### Day 3: Instructor
- Test 9 (Dashboard): ✅ PASS / ❌ FAIL
- Test 10 (Student Mgmt): ✅ PASS / ❌ FAIL
- Test 11 (Analytics): ✅ PASS / ❌ FAIL

### Day 4: Performance
- Test 12 (Mobile): ✅ PASS / ❌ FAIL
- Test 13 (Performance): ✅ PASS / ❌ FAIL

## Issues Found
[Use the issue template from each test]

## Recommendations
[Summary of fixes needed before staging]
```

---

## 🚀 When to Move to Staging

**GO TO STAGING if:**
- ✅ 12/13 tests passing
- ✅ All critical issues fixed
- ✅ No regressions found

**PAUSE and FIX if:**
- ❌ < 10/13 tests passing
- ❌ Critical bugs found (login broken, data loss, security issues)
- ❌ Multiple high-priority failures

---

## 📊 Exit Criteria

Before proceeding to staging, ensure:

| Criteria | Status |
|----------|--------|
| All 13 tests completed | ✅ or ❌ |
| 12+ tests passing | ✅ or ❌ |
| No critical bugs | ✅ or ❌ |
| Performance meets targets | ✅ or ❌ |
| Mobile responsive | ✅ or ❌ |
| All languages working | ✅ or ❌ |

---

## 💡 Pro Tips for Testing

1. **Save test data:** Keep screenshots/recordings of successful tests
2. **Use incognito mode:** Clears cookies, tests fresh session
3. **Test different roles:** Login as student AND instructor for each feature
4. **Check browser console:** Look for warnings/errors (F12 → Console)
5. **Test in multiple browsers:** Chrome, Firefox, Safari if possible
6. **Document everything:** Each bug needs: steps, screenshot, expected vs actual

---

## Next Step After Phase 2

Once Phase 2 passes, proceed to:
**STAGING_DEPLOYMENT_CHECKLIST.md** for deployment to staging environment.

