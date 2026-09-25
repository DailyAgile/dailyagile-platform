# Week 2 User Testing - Session Materials
**Test Period:** Aug 13-17, 2026  
**Session Duration:** 60 minutes per participant  
**Components:** Scenarios, observation sheets, test data

---

## 📋 Test Session Structure (60 min total)

```
0-5 min    ⏱️ Welcome & Overview
           "Hi! Thanks for being here. Today we're testing new features..."

5-10 min   📖 Scenario intro + screen sharing setup
           Show login screen, explain what we'll test

10-45 min  🎯 Interactive testing (45 min for 4 scenarios)
           - Scenario 1: Add single student (15 min)
           - Scenario 2: CSV bulk import (20 min)  
           - Scenario 3: View & filter roster (10 min)
           [Student testing replaces above with quiz scenario]

45-55 min  📊 Feedback survey (10 min)
           NPS + quick Likert scale questions

55-60 min  🙏 Thank you & next steps
           Explain what happens with feedback, when they'll hear from us
```

---

## 🎯 Scenario 1: Add a Single Student (15 min)

### Teacher Task
**Goal:** Add a single student to a classroom roster.

**Setup:** Participant is logged in as a teacher with 0 students in roster.

**Steps to Complete:**
```
1. Navigate to classroom settings / roster management
2. Click "Add Student" button
3. Fill in form with:
   - Email: alice@example.com
   - Name: Alice Johnson
   - Student ID: STU-001 (optional)
4. Click "Add Student" button
5. Verify student appears in roster list
```

### Observation Sheet - Scenario 1

**What to Watch For:**
- [ ] **Discoverability:** Where did they look first for "Add Student"? (button visible?)
- [ ] **Form understanding:** Did they understand which fields were required?
- [ ] **Field labels:** Were labels clear (especially Student ID being optional)?
- [ ] **Form submission:** Did they hesitate before clicking "Add"?
- [ ] **Success feedback:** Did they understand the action succeeded?
- [ ] **Error handling:** If they made a mistake, was error message clear?

**Script for Facilitator:**
```
"You're logged in as a teacher. Your classroom currently has no students. 
Can you add a student named Alice Johnson with email alice@example.com 
and student ID STU-001? Think out loud as you go."

[Observe without helping. Only intervene if they're stuck >1 min]

Follow-up Questions (after completion or if stuck):
1. "On a scale of 1-10, how easy was that?"
2. "What made it easy/hard?"
3. "What would make this easier?"
4. "Would you do this for 50 students?" [Leads to bulk import]
5. "Anything confusing about the form?"
```

### Time Allocation
- User completes task: 8-10 min
- Facilitator Q&A: 5 min
- Total: 15 min

### Success Criteria
✅ User can find "Add Student" button  
✅ User understands form fields  
✅ User successfully adds student  
✅ Student appears in roster  
✅ User receives success feedback  

### Red Flag Indicators 🚨
- User looks for "Add" button for >30 sec (button not visible)
- User fills in form but unsure which fields are required
- Success/failure message is unclear
- User can't confirm student was added

---

## 🎯 Scenario 2: CSV Bulk Import (20 min)

### Teacher Task
**Goal:** Upload a CSV file with multiple students.

**Setup:** Test file is shared in chat or on participant's desktop.

**Steps to Complete:**
```
1. Navigate to "Bulk Import Students" (or similar)
2. Drag-drop or click to upload this CSV:
   
   Email,Name,Student ID
   bob@example.com,Bob Smith,STU-002
   carol@example.com,Carol Davis,STU-003
   dave@example.com,Dave Wilson,STU-004

3. Review preview of data
4. Click "Import Students"
5. Verify students appear in roster (3 new students, 4 total with Alice)
```

### Part 2: Error Handling
**After successful import, test error scenario:**

```
1. Try importing CSV with invalid email:
   
   Email,Name,Student ID
   not-an-email,Frank,STU-005

2. Observe how error is presented
3. Can they understand what went wrong?
4. Can they retry or export errors?
```

### Observation Sheet - Scenario 2

**What to Watch For:**
- [ ] **Feature discovery:** Can they find bulk import feature?
- [ ] **File upload:** Do they understand how to upload (drag vs click)?
- [ ] **Preview clarity:** Does preview help them understand what will happen?
- [ ] **Trust in button:** Do they hesitate before clicking "Import"?
- [ ] **Error message clarity:** If error occurs, is it understandable?
- [ ] **Recovery:** Can they fix and retry, or export errors?
- [ ] **Volume confidence:** Do they feel comfortable importing 50+ students?

**Script for Facilitator:**
```
"Now let's try adding multiple students at once. Here's a CSV file with 
3 new students. Can you upload it and import them into the roster?"

[If they ask what CSV is, explain: "It's a spreadsheet file that can be 
imported into most systems"]

[Observe file upload process]

Follow-up Questions (after first import succeeds):
1. "How easy was that on a scale of 1-10?"
2. "What would make bulk import even better?"
3. "Would you prepare CSVs from your existing system?" 
4. "How many students can you import before it gets annoying?"

[Then show the error file]

"Now let's test what happens if there's a problem. Try importing this file 
that has an invalid email. What happens?"

5. "Is the error message clear about what went wrong?"
6. "What would you do next?" [Can they export errors? Retry?]
```

### Time Allocation
- Successful import: 8-10 min
- Error handling test: 5-7 min
- Facilitator Q&A: 3-5 min
- Total: 20 min

### Success Criteria
✅ User can find bulk import feature  
✅ User successfully uploads CSV  
✅ Preview accurately shows what will import  
✅ Import completes successfully  
✅ Students appear in roster  
✅ Error messages are clear when validation fails  
✅ User can understand and recover from errors  

### Red Flag Indicators 🚨
- Feature is hard to find (>1 min search)
- File upload process is confusing
- No preview shown before import
- Error message is cryptic ("Validation failed")
- User can't figure out what went wrong
- Users express fear about bulk import ("I don't trust the Import button")

---

## 🎯 Scenario 3: View & Filter Roster (10 min)

### Teacher Task
**Goal:** Search and manage the roster after adding students.

**Setup:** Roster now has 4 students (Alice, Bob, Carol, Dave).

**Steps to Complete:**
```
1. View the full roster (should show 4 students)
2. Use search to find "Alice" (should find 1 result)
3. Filter by status "Active" (should show 4 students)
4. Try to remove a student:
   - Click remove on Carol Davis
   - Confirm removal
5. Verify Carol no longer shows in active roster
```

### Observation Sheet - Scenario 3

**What to Watch For:**
- [ ] **Table readability:** Is the roster easy to scan (column widths, font)?
- [ ] **Search responsiveness:** Does search feel fast or sluggish?
- [ ] **Search accuracy:** Does search find the right student?
- [ ] **Filter clarity:** Are filter options obvious?
- [ ] **Remove UX:** Is the remove button obvious?
- [ ] **Confirmation dialog:** Does confirmation make them feel safe?
- [ ] **Data persistence:** Does removal immediately update display?

**Script for Facilitator:**
```
"You now have 4 students in your roster. Let's test finding and managing them. 
First, try to find Alice Johnson using the search feature. What do you see?"

[Observe search interaction]

"Now filter to show only active students. What do you see?"

[Observe filtering]

"Finally, let's say you need to remove Carol Davis from the roster. 
Can you do that?"

[Observe remove/confirm flow]

Follow-up Questions:
1. "How would you want students sorted by default?" (date, name, email)
2. "What information would you want to see in the roster?" 
   [Hidden fields: last activity, quiz count, status]
3. "Would you want to bulk-remove students?" [Future feature signal]
4. "Is anything confusing about the table layout?"
```

### Time Allocation
- Search: 2 min
- Filter: 2 min
- Remove: 2 min
- Facilitator Q&A: 4 min
- Total: 10 min

### Success Criteria
✅ Roster displays all students clearly  
✅ Search works and finds correct student  
✅ Filter works (shows only active)  
✅ Remove button is findable  
✅ Confirmation prevents accidental deletion  
✅ Removed student disappears from view  

### Red Flag Indicators 🚨
- Table is cluttered or hard to read
- Search is slow or doesn't find students
- Filter doesn't work or is hidden
- Remove button is hard to find
- User accidently removes wrong student (no confirmation)
- User can't tell if removal succeeded

---

## 🎯 Scenario 4: Take Quiz & Review Feedback (STUDENT - 15 min)

### Student Task
**Goal:** Complete a quiz and review feedback on answers.

**Setup:** Student is logged in. Quiz is available in their classroom.

**Steps to Complete:**
```
1. Navigate to "My Classes" or "Available Quizzes"
2. Join/access the test classroom
3. Start the "Phase 2 Test Quiz"
4. Answer 5 questions (mix of multiple choice + short answer):
   Q1: MC (physics) - correct answer is B
   Q2: MC (chemistry) - correct answer is C
   Q3: Short answer (math) - must include "16"
   Q4: MC (history) - correct answer is A
   Q5: Short answer (science) - must explain "photosynthesis"
5. Submit quiz
6. Review feedback on each answer
7. Check final score
```

### Part 2: Persistence Test
**After reviewing feedback, test offline persistence:**

```
1. Close the browser tab mid-session (if multi-question quiz, close on Q3)
2. Tell participant: "Oops, your browser crashed. Can you navigate back?"
3. Reopen browser and navigate back to quiz
4. "Do your answers appear to be saved?"
5. Can they resume where they left off?
```

### Observation Sheet - Scenario 4 (Student)

**What to Watch For:**
- [ ] **Quiz discovery:** Can they find and start the quiz?
- [ ] **Question clarity:** Do they understand what each question asks?
- [ ] **Question type UX:** MC easy to select? Short answer field obvious?
- [ ] **Progress indication:** Do they know how many questions remain?
- [ ] **Submit confidence:** Do they hesitate before submitting?
- [ ] **Feedback helpfulness:** Does feedback explain why they were wrong?
- [ ] **Score clarity:** Is their final score obvious and clear?
- [ ] **Offline behavior:** Do answers persist if browser closes?
- [ ] **Resume capability:** Can they pick up where they left off?

**Script for Facilitator:**
```
"You're a student in a class. There's a quiz available. Can you find it, 
start it, and complete all the questions? Think out loud about what you 
notice as you go."

[Let them work through quiz at their own pace. Only help if stuck >1 min]

[After they submit and review, ask:]

Follow-up Questions:
1. "How clear was each question?"
2. "Did the feedback help you understand your mistakes?"
3. "What could make the quiz experience better?"
4. "Would you want to retake without penalty?"
5. "Would you want to see your progress over time?"
   (track which quizzes you've taken, your improvement)

[Then test offline]

"One more thing — let me simulate your browser crashing while you're 
taking a quiz. I'm going to close this tab. Then I'll open it back up. 
Can you navigate back to the quiz and tell me if your answers are still there?"

[Close tab, wait 3 sec, reopen]

6. "Did your answers come back?"
7. "How would that affect your confidence taking quizzes?"
```

### Time Allocation
- Quiz completion: 8-10 min
- Feedback review: 2-3 min
- Offline test: 1-2 min
- Facilitator Q&A: 3-4 min
- Total: 15 min

### Success Criteria
✅ Student can find and start quiz  
✅ Quiz interface is clear and intuitive  
✅ Questions are easy to understand  
✅ Answer submission works  
✅ Feedback is helpful and explains mistakes  
✅ Final score is clearly shown  
✅ Answers persist even if browser/session interrupted  
✅ Student can resume quiz after interruption  

### Red Flag Indicators 🚨
- Quiz is hard to find or confusing to start
- Question wording is confusing
- No clear progress indicator (don't know how many questions left)
- Submit button unclear or in wrong location
- Feedback is generic ("Wrong answer") not helpful
- Offline: answers are lost (not persisted)
- Offline: can't resume quiz (have to start over)

---

## 📄 Test Data Files

### File 1: Valid CSV for Bulk Import

**Filename:** `test-students-valid.csv`
```csv
Email,Name,Student ID
bob@example.com,Bob Smith,STU-002
carol@example.com,Carol Davis,STU-003
dave@example.com,Dave Wilson,STU-004
```

**Instructions:** Share this file in the chat before Scenario 2. Participant drags/drops it into the upload field.

---

### File 2: Invalid CSV for Error Testing

**Filename:** `test-students-invalid.csv`
```csv
Email,Name,Student ID
not-an-email,Frank Johnson,STU-005
```

**Expected Behavior:** Import should fail with message like:
```
❌ Error: Row 1 - "not-an-email" is not a valid email address
Please fix and try again, or export this error for review.
```

**Instructions:** After successful first import, share this file and explain: "This one has a problem. See if you can figure out what went wrong."

---

### File 3: Sample Quiz Questions

**Quiz Name:** "Phase 2 Test Quiz"

**Question 1 (Multiple Choice)**
```
What is the SI unit of force?
A) Kilogram
B) Newton ✓ (correct)
C) Joule
D) Watt

Feedback on correct: "Great! Newton is named after Sir Isaac Newton."
Feedback on incorrect: "Not quite. The Newton is the unit of force, measuring kg⋅m/s²"
```

**Question 2 (Multiple Choice)**
```
Which element has the atomic number 6?
A) Nitrogen
B) Oxygen
C) Carbon ✓ (correct)
D) Silicon

Feedback on correct: "Correct! Carbon is the basis of all organic life."
Feedback on incorrect: "That's not right. Carbon (C) has 6 protons."
```

**Question 3 (Short Answer)**
```
What is 2 × 8?
Answer must contain: "16"

Feedback on correct: "Perfect! 2 × 8 = 16"
Feedback on incorrect: "Not quite. 2 × 8 equals a two-digit number starting with 1."
```

**Question 4 (Multiple Choice)**
```
In what year did the American Revolution begin?
A) 1776 ✓ (correct)
B) 1789
C) 1812
D) 1861

Feedback on correct: "Exactly! 1776 is the year declared in the Declaration of Independence."
Feedback on incorrect: "Not quite. The American Revolution began in 1776 with the Declaration of Independence."
```

**Question 5 (Short Answer)**
```
Explain briefly what photosynthesis is.
Answer must contain: "light" OR "energy" OR "glucose" OR "CO2"

Feedback on correct: "Great! You understand photosynthesis converts light energy into chemical energy."
Feedback on incorrect: "Close! Photosynthesis involves light, CO2, and water to create glucose and oxygen."
```

---

## 🔑 Test Account Credentials

### Teacher Account (for facilitator + teacher participants)
```
Email:    teacher@test.com
Password: TestPass123!
Role:     Teacher
Classroom: "OpenMAIC Phase 2 Test" (pre-created)
Students: 0 (will add during testing)
```

### Student Account #1 (for student participants)
```
Email:    student1@test.com
Password: TestPass123!
Role:     Student
Classroom: "OpenMAIC Phase 2 Test" (auto-joined)
```

### Student Account #2 (backup)
```
Email:    student2@test.com
Password: TestPass123!
Role:     Student
Classroom: "OpenMAIC Phase 2 Test" (auto-joined)
```

### Staging Environment
```
URL:      https://staging.openmatic.app
Login:    Use credentials above
Browser:  Chrome/Firefox preferred (test in at least 2)
```

---

## 🎙️ Session Recording Setup

### Loom Recording (Recommended)
```
1. Start Loom recording before participant joins
2. Select "Webcam + Screen" option
3. Test sound levels (can hear participant clearly)
4. Record entire 60-min session
5. Export as MP4, upload to shared folder
6. Timestamp key moments: bugs, quotes, confusion
```

### Zoom Recording (Alternative)
```
1. Start Zoom meeting 5 min early
2. Enable cloud recording (Settings → Recording)
3. Mute original audio, record participant only (Settings)
4. Participant shares screen
5. Download recording after meeting
6. Trim intro/outro
7. Upload to shared folder
```

### What to Name Recording
```
Format: WEEK2_SESSION_[Date]_[ParticipantID]_[Role].mp4
Example: WEEK2_SESSION_Aug13_T01_Teacher.mp4
         WEEK2_SESSION_Aug13_S01_Student.mp4
```

---

## ✅ Session Facilitator Checklist

**Before Session (30 min prior):**
- [ ] Test Zoom/Google Meet connection
- [ ] Confirm staging environment is up (visit https://staging.openmatic.app)
- [ ] Have test data files ready (CSV files downloaded)
- [ ] Have observation sheet printed/visible
- [ ] Start recording (Loom or Zoom)
- [ ] Greet participant, confirm mic/camera work

**During Session:**
- [ ] Stay quiet and let user explore (don't guide unless stuck >1 min)
- [ ] Take notes on observation sheet
- [ ] Note any red flags/bugs with timestamps
- [ ] Record key quotes (capture exact wording)

**After Session (within 1 hour):**
- [ ] Stop recording, save file
- [ ] Fill out Session Synthesis Template (see separate doc)
- [ ] Post key findings to team Slack
- [ ] Send thank-you email to participant

---

## 🎬 Session Flow (Facilitator Script)

### Opening (5 min)
```
"Hi [Name]! Thanks so much for taking the time to test with us today. 
We really appreciate it.

Here's what we're doing: Today we're testing new features we've built for 
teachers to manage student rosters and for students to take quizzes. We want 
your honest feedback — you're helping us catch bugs and find the features 
that matter most.

A few things:
1. There are no wrong answers. We're testing the product, not you.
2. If something confuses you, that's super valuable feedback.
3. I'll be taking notes and maybe asking questions as we go.
4. I'm recording this so our team can review later. Is that okay with you?
5. If at any point you want to take a break, just let me know.

Today you'll see 3-4 scenarios. Each one is fairly short. Ready to get started?"

[Wait for confirmation]

"Great! Let me bring up the staging environment. Can you see my screen?"
```

### During Scenario
```
"Your task is to [SCENARIO DESCRIPTION]. Think out loud as you go — 
tell me what you're trying to do and what you see. I'll mostly just listen."

[Be silent. Take notes. Only help if stuck >90 sec]

If participant gets stuck:
"Let me ask — what are you looking for right now?"
[Wait for answer, let them keep trying]

If truly stuck (>2 min):
"I can give you a hint: [small hint]. Does that help?"
```

### Between Scenarios
```
"Great! Let's move to the next scenario. Quick questions about that one:
1. On a scale of 1-10, how easy was that?
2. What made it easy/hard?
3. Anything confusing?" 

[Take 2-3 min for Q&A, then move on]
```

### Closing (5 min)
```
"Excellent! Thank you so much. You gave us really valuable feedback.

Here's what happens next:
1. I'll share your feedback with our team
2. We'll compile all the feedback from everyone
3. We'll prioritize what to fix before the wider launch
4. You'll get a thank-you email with a summary of what we heard

You'll see the new features launch next month, and you'll get early access 
plus recognition in the release notes if you opt in.

Any final questions for me?"

[Answer questions]

"Thanks again! You were awesome!"
```

---

## 📊 Session Synthesis Template

(See separate document: `WEEK2_SESSION_SYNTHESIS.md`)

Each facilitator fills out one synthesis template per session immediately after completion. This captures:
- Scenario ratings (Red/Yellow/Green flags)
- Key quotes
- Bugs found
- NPS score
- Improvement recommendations

---

## 🚨 What to Do If...

### Staging Environment is Down
- Have a backup: Screen recording demo of features (recorded earlier)
- Play demo, then ask: "If this was working, how would you approach [scenario]?"
- Still collect feedback on design, but note it's hypothetical

### Participant Finds a Major Bug
- **Stay calm.** Bugs are great finds!
- Note it immediately: bug description, steps to reproduce, screenshot/timestamp
- Don't try to fix it during session
- Move on: "Interesting! That's super helpful to know. Let's see if [scenario] works..."

### Participant is Blocked (Can't Move Forward)
- Check: Is it a real bug or user confusion?
- Give ONE small hint, then observe
- If still blocked after hint, note it as a UX issue: "Feature was not discoverable"

### Participant Completes Scenario Very Fast (<30% of time)
- Great! They found it intuitive
- Ask probing questions: "That was fast — tell me what you were thinking?"
- Look for signs they might have missed something important

### Participant Gets Frustrated
- **Validation:** "I can see this is frustrating. That's exactly why we're testing."
- **Offer break:** "Do you want to take a 2-min break?"
- **Move on:** "Let's try the next scenario — this one might be smoother"

---

**Facilitator Notes:** Your role is observer, not teacher. Silence is okay. Confusion is data. 

Ready to run sessions? Reference this doc + observation sheets during each session.
