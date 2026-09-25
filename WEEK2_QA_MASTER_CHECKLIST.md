# Week 2 QA Testing - Master Checklist & Dashboard
**Your Week 2 Control Center**

---

## 📋 Document Index

All Week 2 testing materials are organized as follows. Reference this index throughout the week.

```
WEEK2_QA_MASTER_CHECKLIST.md ............ THIS FILE - Master reference
├─ WEEK2_RECRUITMENT_PLAN.md ........... Recruitment strategy & status tracker
├─ WEEK2_TEST_SESSION_MATERIALS.md ..... Detailed test scenarios & observation sheets
├─ WEEK2_FEEDBACK_COLLECTION_TOOLS.md .. Surveys, forms, data collection templates
├─ WEEK2_SESSION_SYNTHESIS.md .......... Template for after each session
├─ WEEK2_TESTING_SCHEDULE.md ........... Calendar, logistics, contingencies
└─ WEEK2_ANALYSIS_FRAMEWORK.md ........ How to analyze & prioritize findings
```

---

## 🚀 Quick Start (This Week Aug 5-8)

**By End of Day Wednesday, Aug 7:**

- [ ] **Recruitment:** 5-6 participants confirmed
  - [ ] 3-4 teachers recruited (mix of tech comfort)
  - [ ] 2-3 students recruited (mix of engagement)
  - [ ] All sent recruitment emails (see `WEEK2_RECRUITMENT_PLAN.md`)
  - [ ] Calendar invites sent with Zoom links
  - [ ] Confirmation emails sent with test credentials

- [ ] **Session Prep:** All materials ready
  - [ ] Test accounts created (teacher + 2-3 student logins)
  - [ ] Staging environment verified working
  - [ ] CSV test files downloaded (valid + invalid)
  - [ ] Observation sheets printed (or digital ready)
  - [ ] Zoom meeting links generated for all 6 sessions
  - [ ] Recording software tested (Loom or Zoom)

- [ ] **Team Sync:** Everyone briefed
  - [ ] Shared Slack channel created (#testing)
  - [ ] Team knows their role (if facilitating)
  - [ ] Backup plan reviewed (if staging down, what do we do?)
  - [ ] Thursday team meeting scheduled for debrief

---

## 📅 Week-by-Week Breakdown

### THIS WEEK (Aug 5-9): Setup & Recruitment
**Owner:** You (QA/Testing Lead)

**Monday-Wednesday (Aug 5-7):**
```
RECRUITMENT (CRITICAL PATH)
──────────────────────────────────────────
□ Send recruitment emails to 8-10 candidates (all channels)
  │ └─ See email templates in WEEK2_RECRUITMENT_PLAN.md
□ Follow up with non-responders (Slack, DM, phone)
□ Confirm 5-6 participants by EOD Wednesday
□ Create recruitment status tracker (share with team)
□ Send calendar invites + Zoom links
□ Send test credentials + staging URL

SESSION PREP
──────────────────────────────────────────
□ Create test accounts:
  │ ├─ teacher@test.com (for teacher sessions)
  │ ├─ student@test.com (for student sessions)
  │ └─ Verify logins work on staging
□ Prepare test data:
  │ ├─ CSV file (valid): bob, carol, dave
  │ └─ CSV file (invalid): frank (bad email)
□ Download sample quiz questions (or create in staging)
□ Print/prepare observation sheets
□ Test Zoom/Loom recording (audio/video quality check)
□ Create Google Form for NPS survey
□ Set up shared folder for recordings & notes

TEAM COORDINATION
──────────────────────────────────────────
□ Create #testing Slack channel (for daily updates)
□ Share all materials with team (Google Drive link)
□ Schedule Thursday team debrief (30 min)
□ Brief any co-facilitators on their role
□ Identify backup facilitator (in case you're sick)
```

**Thursday-Friday (Aug 8-9):**
```
FINAL PRE-TESTING CHECKS
──────────────────────────────────────────
□ Confirm all participants still attending (reminder email)
□ Verify staging environment is stable
□ Test all 3-4 test scenarios manually:
  │ ├─ Can you add a student? ✅
  │ ├─ Can you import CSV? ✅
  │ ├─ Can you search roster? ✅
  │ └─ Can you take quiz? ✅
□ Check that all observation sheets are ready
□ Verify Zoom links are working
□ Create backup demo video (if staging might be down)
□ Stock coffee/water for yourself

STATUS CHECK
──────────────────────────────────────────
✅ Recruitment: 5-6 confirmed
✅ Sessions: All scheduled with Zoom links
✅ Materials: All ready to go
✅ Team: Briefed and prepared
✅ Contingency: Backup plan in place
```

---

### WEEK 2 (Aug 13-17): Testing & Data Collection
**Owner:** You (QA/Testing Lead) + any co-facilitators

**DAILY WORKFLOW:**

#### Monday, Aug 13
```
BEFORE FIRST SESSION (9:00 AM)
──────────────────────────────────────────
□ Verify staging is up and responsive
□ Confirm first 2 participants confirmed to attend
□ Start Zoom/Loom recording setup
□ Have observation sheets ready
□ Have test data files ready

SESSION T01 (10:00-11:00 AM)
──────────────────────────────────────────
□ Teacher #1 testing (Add + CSV import focus)
□ See: WEEK2_TEST_SESSION_MATERIALS.md for full scenario
□ Facilitator: Run 60-min session
□ Observer: Take notes on observation sheet
□ Record: Loom/Zoom recording started
□ Post-session: Fill out WEEK2_SESSION_SYNTHESIS.md (T01)

LUNCH (12:00-1:00 PM)
──────────────────────────────────────────
□ Review recordings from T01
□ Rest and reset

SESSION T02 (1:00-2:00 PM)
──────────────────────────────────────────
□ Teacher #2 testing (End-to-end focus)
□ Run session same as T01
□ Post-session: Fill out WEEK2_SESSION_SYNTHESIS.md (T02)

END OF DAY (2:00-3:00 PM)
──────────────────────────────────────────
□ Upload recordings to shared folder
□ Timestamp key moments in recordings
□ Post daily update to #testing Slack channel
  │ └─ Sessions completed: 2/6
  │    Bugs found: [list]
  │    Status: ON TRACK
```

#### Tuesday, Aug 14
```
DATA REVIEW (9:00-10:00 AM)
──────────────────────────────────────────
□ Review T01 & T02 synthesis docs
□ Check recordings for key quotes (capture exact wording)
□ Note any bugs that need escalation
□ Plan T03 focus based on T01/T02 feedback

SESSION T03 (10:00-11:00 AM)
──────────────────────────────────────────
□ Teacher #3 testing (Advanced user, edge cases)
□ Focus on what you learned from T01/T02
□ Post-session: Fill out WEEK2_SESSION_SYNTHESIS.md (T03)

BUFFER & LUNCH (11:00 AM-2:00 PM)

SESSION S01 (2:00-3:00 PM)
──────────────────────────────────────────
□ Student #1 testing (Quiz taking focus)
□ See: WEEK2_TEST_SESSION_MATERIALS.md - Scenario 4 (Student)
□ Test offline persistence scenario
□ Post-session: Fill out WEEK2_SESSION_SYNTHESIS.md (S01)

END OF DAY (3:00-4:00 PM)
──────────────────────────────────────────
□ Upload recordings
□ Post daily update to Slack
  │ Sessions completed: 4/6
  │ Synthesis docs: All 4 filled out
  │ Key themes emerging: [list]
```

#### Wednesday, Aug 15
```
MORNING SESSIONS (9:00 AM-12:00 PM)
──────────────────────────────────────────
□ SESSION S02 (9:00-10:00 AM): Student #2 (Moderate user)
  │ Post-session: Fill out WEEK2_SESSION_SYNTHESIS.md (S02)
□ SESSION S03 (10:00-11:00 AM): Student #3 or BACKUP (Optional)
  │ If not needed, skip and go to data work
  │ Post-session: Fill out WEEK2_SESSION_SYNTHESIS.md (S03)

DATA COMPILATION (11:00 AM-3:00 PM)
──────────────────────────────────────────
□ Create WEEK2_TESTING_RESULTS_SUMMARY.xlsx:
  │ ├─ Sheet 1: NPS scores for all 5-6 participants
  │ ├─ Sheet 2: Feature ratings (avg scores)
  │ ├─ Sheet 3: Bug log (all issues found)
  │ └─ Sheet 4: Common themes (3+ mentions = trends)
□ Calculate NPS score: (% Promoters - % Detractors)
□ Tally feature ratings (average Likert scores)
□ Create bug list sorted by severity
□ Identify themes with 3+ mentions

TEAM SYNC (3:00-4:00 PM)
──────────────────────────────────────────
□ Quick 30-min call with team to share early findings
□ "Here's what we're seeing so far..."
□ "Any quick questions before I go deep into analysis?"
```

#### Thursday, Aug 16
```
FULL DAY: ANALYSIS & RECOMMENDATIONS
──────────────────────────────────────────

MORNING: Deep Analysis (9:00 AM-12:00 PM)
├─ [ ] Flag analysis: Classify every finding as RED/YELLOW/GREEN
├─ [ ] Bug triage: Sort by severity + effort estimate
├─ [ ] Theme synthesis: 3+ mentions = prioritize for roadmap
├─ [ ] Create impact/effort matrix

AFTERNOON: Recommendations (1:00-3:00 PM)
├─ [ ] Draft WEEK2_TESTING_ANALYSIS.md
├─ [ ] Create top 5 ranked recommendations
├─ [ ] Write go/no-go assessment for wider beta
├─ [ ] Prepare supporting data (screenshots, quotes, metrics)

EVENING: Presentation Prep (3:00-5:00 PM)
├─ [ ] Create presentation slides (10-11 slides)
├─ [ ] Practice talking points
├─ [ ] Prep for team questions/discussion
```

#### Friday, Aug 17
```
MORNING: FINAL DELIVERABLES (9:00 AM-12:00 PM)
──────────────────────────────────────────
□ [ ] Finalize WEEK2_TESTING_ANALYSIS.md
□ [ ] Final proofread of all docs
□ [ ] Add quotes with participant attributions
□ [ ] Create bug prioritization chart
□ [ ] Add screenshot/video timestamps for key findings

MIDDAY: SEND THANK-YOU EMAILS (12:00-1:00 PM)
──────────────────────────────────────────
□ [ ] Send thank-you email to all 5-6 participants
      (See template in WEEK2_FEEDBACK_COLLECTION_TOOLS.md)
□ [ ] Include key findings they helped uncover
□ [ ] Remind about early access offer
□ [ ] Ask if they want to participate in Phase 2.2 testing

AFTERNOON: TEAM DEBRIEF & DECISIONS (2:00-3:00 PM)
──────────────────────────────────────────
□ [ ] Present findings to team (30 min presentation)
□ [ ] Discuss recommendations
□ [ ] Get go/no-go call on wider beta
□ [ ] Decide on fix prioritization
□ [ ] Assign owners for recommended fixes
□ [ ] Set timeline for next steps

FINAL WRAP-UP (3:00-4:00 PM)
──────────────────────────────────────────
□ [ ] Archive all materials to shared folder
□ [ ] Post final status to #testing Slack
□ [ ] Update team on outcomes of debrief
□ [ ] Celebrate! 🎉
```

---

## 📊 Daily Status Template

**Post this in #testing Slack each evening (EOD):**

```
📊 Testing Status - [Date]

✅ Sessions Completed: [X] of 6
├─ Teachers: [X] of 4 completed
└─ Students: [X] of 2-3 completed

📅 Tomorrow's Schedule (if applicable):
├─ [TIME] - [Participant ID] - [Role]
└─ [TIME] - [Participant ID] - [Role]

🐛 Bugs Found So Far: [X] total
├─ CRITICAL: [X]
├─ HIGH: [X]
└─ MEDIUM/LOW: [X]

💡 Key Findings So Far:
• [Top theme #1]
• [Top theme #2]
• [Top theme #3]

🟢 Status: ON TRACK / 🟡 SLIGHT DELAY / 🔴 ISSUE

📝 Next Actions:
- [Action]
- [Action]

📹 Recordings Posted: [Y/N] - [Link to folder]
```

---

## 🎯 Session Checklist Template

**Complete one for EACH session:**

```
SESSION CHECKLIST
══════════════════════════════════════════════════════════

Session ID: [T01 / T02 / S01, etc.]
Date/Time: [Aug 13, 10:00 AM]
Participant: [Name]
Role: [Teacher / Student]
Facilitator: [Your name]

PRE-SESSION (30 min before)
──────────────────────────────────────────
□ Confirm participant attending (Slack/email/text)
□ Verify staging environment up
□ Test Zoom link (log in, audio/video working)
□ Start screen recording (Loom or Zoom)
□ Have observation sheet ready
□ Have test data files ready
□ Have test credentials copied to clipboard

DURING SESSION
──────────────────────────────────────────
□ Welcome & brief participant (5 min)
□ Explain testing goals (be encouraging)
□ Run scenarios 1-4 (45 min)
□ Collect feedback via form or Q&A (10 min)
□ Thank participant profusely

IMMEDIATELY AFTER (Within 30 min)
──────────────────────────────────────────
□ Fill out WEEK2_SESSION_SYNTHESIS.md
  │ ├─ Scenario ratings (RED/YELLOW/GREEN)
  │ ├─ Key quotes (exact wording)
  │ ├─ Bugs found (repro steps)
  │ └─ Recommendations
□ Upload recording to shared folder
□ Timestamp key moments in recording
□ Post key findings to #testing Slack

SAME DAY (By EOD)
──────────────────────────────────────────
□ Send thank-you email to participant
□ Send survey link (if not collected yet)
□ File synthesis doc in master folder
```

---

## 📈 Key Metrics to Track

**Track these throughout Week 2 to stay on course:**

```
RECRUITMENT METRICS
──────────────────────────────────────────
□ Participants invited: [  ] / 10
□ Confirmed yes: [  ] / 6
□ Confirmed no: [  ]
□ Waiting reply: [  ]
□ No-show rate (target <10%): [  ]%

SESSION METRICS
──────────────────────────────────────────
□ Sessions completed: [  ] / 6
□ Average session duration: [  ] min (target: 60)
□ Facilitator prep time: [  ] min per session
□ Data entry time: [  ] min per session
□ Recordings: [  ] / 6 uploaded

FEEDBACK METRICS
──────────────────────────────────────────
□ NPS Score: [  ] / 10 (target: ≥30)
□ Survey completion rate: [  ]% (target: 100%)
□ Bugs found: [  ] total
  │ ├─ CRITICAL: [  ]
  │ ├─ HIGH: [  ]
  │ └─ MEDIUM/LOW: [  ]
□ Themes identified (3+ mentions): [  ] total
□ Feature requests: [  ] unique
```

---

## 🚨 Risk & Contingency Tracker

**If any of these happen, use these plans:**

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| No-show (participant forgets) | Medium | High | Confirm day before, send reminder text |
| Staging environment down | Low | Critical | Have backup demo video ready |
| Participant frustrated/upset | Low | Medium | Validate, offer break, move on |
| Major bug found | Medium | Medium | Note it, don't fix during session, continue testing |
| Low NPS score (<20) | Low | High | Analyze by role (teacher vs. student), discuss with team |
| Data loss (recording fails) | Low | Medium | Take detailed notes during session as backup |

---

## ✅ End-of-Week Deliverables

**Everything you need to deliver by Friday 4 PM:**

```
DOCUMENTS (Share with team via Google Drive)
──────────────────────────────────────────
✅ WEEK2_TESTING_RESULTS_SUMMARY.xlsx
   ├─ NPS scores + analysis
   ├─ Feature ratings
   ├─ Bug list
   └─ Common themes

✅ WEEK2_SESSION_SYNTHESIS.md (×6 copies, one per session)
   └─ Filled out for all 5-6 participants

✅ WEEK2_TESTING_ANALYSIS.md (Final recommendations)
   ├─ NPS result + interpretation
   ├─ Top 5 recommendations
   ├─ Go/no-go assessment
   └─ Priority roadmap

✅ PRESENTATION SLIDES (10-11 slides)
   ├─ Overview + NPS result
   ├─ Key findings
   ├─ Recommendations
   └─ Next steps & timeline

RECORDINGS & ASSETS
──────────────────────────────────────────
✅ All 5-6 session recordings
   ├─ Named: WEEK2_SESSION_[Date]_[ID]_[Role].mp4
   ├─ Timestamps marked for key moments
   └─ Uploaded to shared folder

✅ Observation sheets (all filled out)

✅ Survey responses (all collected)

COMMUNICATIONS
──────────────────────────────────────────
✅ Thank-you emails sent to all participants

✅ Daily status updates posted to Slack (Mon-Fri)

✅ Team debrief scheduled & presentation delivered
```

---

## 🏆 Success Criteria

**At EOD Friday, ask yourself:**

- ✅ Did we recruit 5-6 participants? (Target: YES)
- ✅ Did 90%+ show up? (Target: YES - 5 out of 6)
- ✅ Did we collect complete NPS data? (Target: YES)
- ✅ Did we find any RED FLAG bugs? (Target: 0-2 OK, 3+ is concerning)
- ✅ Is the NPS score ≥30? (Target: YES)
- ✅ Do we have clear recommendations? (Target: TOP 5 ready)
- ✅ Can we say "proceed to wider beta"? (Target: YES, with caveats)

---

## 📞 Key Contact Info

**People to loop in if issues arise:**

```
QA Testing Lead: [Your Name] 
├─ Email: [your email]
├─ Slack: @[your handle]
└─ Phone: [optional]

Staging Environment Owner: [Name]
├─ Slack: @[handle]
└─ If staging is down, ping them ASAP

Product Manager: [Name]
├─ Slack: @[handle]
└─ For go/no-go call on wider beta

Development Lead: [Name]
├─ Slack: @[handle]
└─ For bug prioritization & fix timeline

#testing Slack Channel
└─ Post daily updates here, team reads async
```

---

## 💪 You've Got This!

### Week 2 Testing Summary:
- **Duration:** 5 full days of testing & analysis
- **Participants:** 5-6 real users (teachers + students)
- **Deliverable:** Complete analysis + recommendations
- **Goal:** Validate Tier 1 UX before wider launch

### Your Super Power This Week:
You're the voice of the customer. Everything you uncover helps the team build something people actually want to use.

### Key Mindset:
- Stay curious, not judgmental
- Bugs are features (they tell us what to fix)
- Confused users are gold (their confusion is user research gold)
- Thank everyone sincerely (they're doing us a favor)

---

## 📋 Print This & Use It

**Print or bookmark these sections:**
1. **Daily Status Template** (post to Slack each day)
2. **Session Checklist Template** (before each session)
3. **Key Metrics** (track throughout week)
4. **End-of-Week Deliverables** (check off as you complete)

---

**Last Updated:** August 6, 2026  
**Owner:** You (QA/Testing Lead)  
**Status:** READY TO LAUNCH 🚀

**You've got all the templates, checklists, and frameworks you need. Go get those insights!**
