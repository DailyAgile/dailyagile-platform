# Phase 2 ILT - User Testing & Feedback Plan

**Last Updated:** August 6, 2026  
**Test Period:** Aug 13-17, 2026 (Week 2 of development)  
**Goal:** Validate Tier 1 UX with real users before continuing development

---

## 👥 Test Participant Recruitment

### Teachers (Target: 3-5)
- Current OpenMAIC users (if available)
- Teaching 10-50 students in ILT format
- Willing to give 1 hour feedback
- Represent mix of tech-comfort levels

**Recruitment Channels:**
- Email existing beta testers
- Post in education Slack communities
- Referrals from known educators

**Incentives:**
- Free access to Phase 2 features during beta
- Chance to shape product roadmap
- Recognition in release notes

### Students (Target: 3-5)
- Current OpenMAIC quiz takers
- Represent typical student (10-30 years old)
- Willing to take test quiz + feedback
- Mix of engagement levels

**Recruitment:**
- Email existing student cohorts
- Campus recruiting (if applicable)
- Social media/discord communities

---

## 🎯 Testing Objectives

### Tier 1 Features to Validate

**Teacher - Roster Management:**
- ✅ Can they easily add a student?
- ✅ Is the form intuitive?
- ✅ Can they find/remove a student?
- ✅ Does the search work as expected?
- ✅ Is the UI responsive?

**Teacher - CSV Bulk Import:**
- ✅ Can they upload a CSV file?
- ✅ Does the preview help them understand what will be imported?
- ✅ Is error reporting clear?
- ✅ Would they use this feature regularly?

**Student - Quiz Taking (with persistence):**
- ✅ Can they start and complete a quiz?
- ✅ Do answers persist (if interrupted)?
- ✅ Can they retake without losing progress?
- ✅ Is feedback helpful?

**Overall Satisfaction:**
- ✅ Net Promoter Score (NPS): Would recommend to colleague?
- ✅ Feature request priorities
- ✅ What's missing?
- ✅ Pain points

---

## 📋 Test Scenarios

### Scenario 1: Add a Single Student (15 min)

**Teacher Flow:**
```
1. Log into staging.openmatic.app
2. Navigate to classroom settings
3. Click "Add Student"
4. Fill in:
   - Email: alice@example.com
   - Name: Alice Johnson
   - Student ID: STU-001
5. Click "Add Student"
6. Verify student appears in roster
```

**Observation Points:**
- Where did they look for "Add Student" button? (UX clarity)
- Did they understand what info was required?
- Was the success message clear?
- Any confusion about Student ID (optional)?

**Follow-up Questions:**
- "On a scale of 1-10, how easy was that?"
- "What would make this easier?"
- "Would you do this for 100 students? (leads to CSV import feedback)"

---

### Scenario 2: CSV Bulk Import (20 min)

**Teacher Flow:**
```
1. Prepare test CSV:
   Email,Name,Student ID
   bob@example.com,Bob Smith,STU-002
   carol@example.com,Carol Davis,STU-003

2. Navigate to "Bulk Import Students"
3. Drag-drop CSV file
4. Review preview
5. Click "Import"
6. Verify students added to roster
```

**Observation Points:**
- Did they find the bulk import feature?
- Was the drag-drop interface clear?
- Did the preview help them understand what would happen?
- Did they trust the "Import" button?

**Intentional Error Test:**
```
Email,Name,Student ID
invalid-email,Dave,STU-004

1. Try to import with invalid email
2. Observe error message clarity
3. Can they fix and retry?
```

**Follow-up Questions:**
- "How many students can you import before it becomes annoying?" (limits)
- "Would you prepare CSVs from your existing system?" (integration interest)
- "What would make bulk import even better?"

---

### Scenario 3: View & Filter Roster (10 min)

**Teacher Flow:**
```
1. View roster (after adding students)
2. Use search to find "Alice"
3. Use status filter to show "all" students
4. Try to remove a student
5. Confirm removal
```

**Observation Points:**
- Is the table readable (column widths, font size)?
- Does search feel responsive?
- Is the remove button obvious?
- Is the confirmation dialog reassuring?

**Follow-up Questions:**
- "How would you want to see students sorted?" (default sort preference)
- "Any info missing from the roster?" (future features)
- "Would you want to bulk-remove students?"

---

### Scenario 4: Take a Quiz (Student - 15 min)

**Student Flow:**
```
1. Log in to staging.openmatic.app
2. Join classroom with quiz
3. Start quiz
4. Answer questions (mix of MC and short-answer)
5. Submit quiz
6. Review feedback
```

**Observation Points:**
- Is the quiz interface clear?
- Can they understand each question type?
- Does feedback help them learn?
- Is the submit button obvious?
- Do they feel informed of their score?

**Intentional Interruption (offline test):**
```
1. Student takes quiz
2. Close browser tab mid-quiz
3. Reopen and navigate back
4. "Do your answers appear to be saved?"
```

**Follow-up Questions:**
- "Did the feedback on wrong answers help you understand?"
- "What could make this quiz experience better?"
- "Would you want to retake without penalty?"

---

## 📊 Feedback Collection

### Quantitative: NPS Survey

**Questions:**
1. On a scale of 0-10: "How likely are you to recommend this to a colleague?"
   - 9-10 = Promoters (enthusiasts)
   - 7-8 = Passives (satisfied but not raving)
   - 0-6 = Detractors (dissatisfied)

2. Per feature, rate 1-5:
   - Ease of use: [1] [2] [3] [4] [5]
   - Usefulness: [1] [2] [3] [4] [5]
   - Appearance: [1] [2] [3] [4] [5]

3. "What's the main thing you'd change?"
   (Open text)

4. "What feature is most important for your workflow?"
   - [ ] Bulk import
   - [ ] Search/filter
   - [ ] View grades
   - [ ] Real-time monitoring (coming next)
   - [ ] Other: ______

---

### Qualitative: Interview Template

**For Teachers:**
```
1. "Tell me about your typical classroom workflow?"
   (Understand their current process)

2. "What's your biggest pain point with student management?"
   (Unmet need)

3. "How did adding students feel?"
   (Feedback on UX)

4. "Would you use bulk import? When?"
   (Feature adoption forecast)

5. "What's missing?"
   (Feature requests)

6. "Anything confusing or broken?"
   (Bug identification)

7. "What would make you happy?"
   (Dream feature)
```

**For Students:**
```
1. "How do you usually study for quizzes?"
   (Context)

2. "What was your first impression of this quiz?"
   (Initial UX feel)

3. "Did the feedback help you understand your mistakes?"
   (Learning effectiveness)

4. "What would make this quiz experience better?"
   (Improvements)

5. "Would you want to see your progress over time?"
   (Interest in Phase 2.2)
```

---

## 🎬 Testing Session Setup

### Environment
- **URL:** https://staging.openmatic.app
- **Test Account Credentials:** 
  - Teacher: teacher@test.com / password123
  - Student: student@test.com / password123

### Recording (Optional)
- Ask for consent to record screen + audio
- Use Loom or Zoom for easy sharing
- Share recording link with team after session

### Timing
- Schedule 1 hour per participant
- 15 min intro + scenario walkthrough
- 45 min interactive testing + feedback

### Tools Needed
- Laptop with Chrome/Firefox
- Quiet space (for calls)
- Google Form or Typeform for survey

---

## 📅 Testing Schedule (Week of Aug 13)

```
Monday:
├─ 10am: Teacher #1 (Add/Bulk import focus)
├─ 12pm: Teacher #2 (Roster view focus)
└─ 2pm: Student #1 (Quiz taking)

Tuesday:
├─ 10am: Teacher #3 (End-to-end flow)
├─ 1pm: Student #2 (Feedback effectiveness)
└─ 3pm: Teacher #4 (Follow-up interview)

Wednesday:
├─ 10am: Student #3 (Offline persistence)
└─ 1pm: Data compilation + analysis

Thursday:
└─ All day: Synthesis & recommendation doc

Friday:
└─ 10am: Team debrief + prioritization
```

---

## 🔍 Analysis Framework

### What We're Looking For

**Red Flags (Urgent fixes):**
- UI element invisible to users ("Where's the Add button?")
- Feature doesn't work (form submit fails, search broken)
- Error messages confusing (user doesn't know what went wrong)
- Security concern (user could access other teachers' data)

**Yellow Flags (Should fix, lower priority):**
- User needs to click multiple times for one action
- Text is unclear but user eventually understands
- Missing helpful context (e.g., "Student ID is optional")
- Accessibility issue (too small font, low contrast)

**Green (Working well):**
- User completes scenario without confusion
- Positive feedback ("That was easy!")
- No safety concerns
- Adaptive to different skill levels

---

## 📄 Feedback Synthesis

### After Each Session
1. Rate each scenario: 🔴 Broken | 🟡 Needs work | 🟢 Good | 🟢🟢 Excellent
2. List 3 key quotes
3. Note 1 bug found (if any)
4. Recommend 1 improvement

### End of Week
1. Tally NPS scores
2. Identify common pain points (3+ mentions = trend)
3. List bugs found
4. Prioritize improvements by impact

### Outcome Document
```
# User Testing Results - Week of Aug 13

## NPS Score: 42 (Excellent for MVP)
- Promoters: 2
- Passives: 2
- Detractors: 1

## Key Findings
✅ Add student form is intuitive
⚠️ CSV import error messages need clarification
❌ Search doesn't work if email has +address

## Top 5 Improvement Requests
1. Show "Student added!" confirmation toast
2. Add "Edit student" capability
3. Export roster as CSV
4. Bulk remove students
5. Student status indicators (red/yellow/green)

## Bugs Found
- BUG #1: Search fails for emails with "+"
- BUG #2: Pagination button disabled state unclear

## Recommendations
- Fix 2 critical bugs before wider beta
- Implement toast notifications (easy win)
- Defer bulk remove to Phase 2.2 (lower priority)
```

---

## 🚀 Post-Testing Actions

### High Priority (Implement Before Wider Beta)
- [ ] Fix critical bugs found
- [ ] Clarify error messages
- [ ] Test with accessibility tool (WAVE, axe)

### Medium Priority (Nice-to-Have for Phase 1)
- [ ] Add success toasts
- [ ] Improve table column widths
- [ ] Add helpful tooltips

### Low Priority (Phase 2.2+)
- [ ] Bulk remove students
- [ ] Edit student info
- [ ] Export roster as CSV

---

## 👥 Participant Feedback Template

**Share after each session (via Slack to team):**
```
🎯 Session: Teacher #1 - Roster Add/Bulk Import

😊 What went well:
- Teacher immediately found "Add Student" button
- CSV preview was helpful
- Success message was clear

😕 What needs work:
- Confusing which fields are optional
- Error messages could be more specific
- Search felt slow (might be perception vs reality)

🐛 Bug found:
- Student ID validation too strict (rejected hyphens)

⭐ Best quote:
"I'd definitely use this to manage 50+ students. Way better than spreadsheets!"

🔢 NPS: 9/10

📋 Actions for team:
1. Fix student ID validation regex
2. Consider field hints (e.g., "Student ID (optional)")
3. Add latency monitoring to search
```

---

## 📞 Participant Thank You

After session, send:

```
Subject: Thank you for testing OpenMAIC Phase 2!

Hi [Name],

Thank you so much for taking the time to test our new student management features today. Your feedback was incredibly valuable and will directly impact what we build next.

Key takeaways from your session:
- [Point 1 they mentioned]
- [Point 2 they mentioned]

We're planning to [action based on their feedback].

As a token of our appreciation, you'll get early access to the next phase of features when we launch them. Stay tuned!

Best,
The OpenMAIC Team
```

---

## 📊 Success Criteria

**Testing is successful if:**
- ✅ No critical bugs blocking Tier 1 features
- ✅ NPS ≥ 30 (good for MVP)
- ✅ All 3-5 participants can complete scenarios
- ✅ Feature requests align with Phase 2.2 roadmap
- ✅ No security concerns identified
- ✅ Accessibility issues identified and logged

**If any criteria fail:**
- Document findings
- Prioritize fixes
- Consider delaying wider beta

---

**Testing Lead:** Product Manager  
**Researcher:** UX Team  
**Debrief:** August 18, 10am (team meeting)

Ready to recruit participants? Start reaching out this week!
