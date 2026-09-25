# Week 2 Testing Schedule & Logistics
**Test Window:** Aug 13-17, 2026 (Monday-Friday)  
**Target:** 5-6 sessions scheduled, 90%+ attendance

---

## 📅 Master Calendar (Template)

**Update this spreadsheet as participants confirm:**

```
Session ID | Date | Time | Participant | Role | Email | Status | Session Link | Notes
-----------|------|------|-------------|------|-------|--------|------------|--------
T01 | Aug 13 | 10:00-11:00 AM | [Name] | Teacher | [email] | ☐ Confirmed | [Zoom Link] | 
T02 | Aug 13 | 1:00-2:00 PM | [Name] | Teacher | [email] | ☐ Confirmed | [Zoom Link] | 
T03 | Aug 14 | 10:00-11:00 AM | [Name] | Teacher | [email] | ☐ Confirmed | [Zoom Link] | 
S01 | Aug 14 | 2:00-3:00 PM | [Name] | Student | [email] | ☐ Confirmed | [Zoom Link] | 
T04 | Aug 15 | 9:00-10:00 AM | [Name] | Teacher | [email] | ☐ Pending | [Zoom Link] | Waiting on reply
S02 | Aug 15 | 11:00 AM-12:00 PM | [Name] | Student | [email] | ☐ Pending | [Zoom Link] | Tentative
S03 | Aug 16 | 10:00-11:00 AM | [Name] | Student | [email] | ☐ Pending | [Zoom Link] | May need alternate time
```

---

## 📋 Suggested Schedule (Aug 13-17)

### Monday, Aug 13
```
10:00-11:00 AM | T01 (Teacher - Beginner)
               | Focus: Add Student, CSV Import basics
               | Facilitator: [Name]

12:00-1:00 PM  | LUNCH / Setup buffer
               | Reset staging env, prepare next session

1:00-2:00 PM   | T02 (Teacher - Intermediate)
               | Focus: Full end-to-end workflow
               | Facilitator: [Name]

2:00-3:00 PM   | DATA ENTRY & NOTES
               | Synthesis #1 & #2
```

### Tuesday, Aug 14
```
9:00-10:00 AM  | Data Review & Planning
               | Review recordings from Mon, prepare Tue sessions

10:00-11:00 AM | T03 (Teacher - Advanced/Power User)
               | Focus: CSV edge cases, roster management depth
               | Facilitator: [Name]

11:00 AM-12:00 | BREAK & RESET

12:00-1:00 PM  | LUNCH

1:00-2:00 PM   | BUFFER (Reschedule if needed, or compress schedule)

2:00-3:00 PM   | S01 (Student - Active)
               | Focus: Quiz taking, feedback effectiveness
               | Facilitator: [Name]

3:00-4:00 PM   | DATA ENTRY & SYNTHESIS
               | Complete synthesis #3 & #4
```

### Wednesday, Aug 15
```
9:00-10:00 AM  | S02 (Student - Moderate)
               | Focus: Persistence, retake scenarios
               | Facilitator: [Name]

10:00-11:00 AM | S03 (Student - Occasional) - OPTIONAL/BACKUP
               | Focus: Low-engagement student experience
               | Facilitator: [Name]

11:00 AM-1:00  | LUNCH & TEAM DEBRIEF
               | Quick sync with team on major findings so far

1:00-3:00 PM   | DATA COMPILATION
               | Enter all responses into summary sheet
               | Calculate NPS
               | Identify common themes
```

### Thursday, Aug 16
```
9:00 AM-12:00  | SYNTHESIS & ANALYSIS
               | Consolidate all findings
               | Identify Red/Yellow/Green flags
               | Prioritize recommendations
               | Create final analysis doc

1:00-3:00 PM   | FINAL ANALYSIS & RECOMMENDATIONS
               | Draft recommendations for team
               | Prepare presentation slides
               | Create bug triage list

3:00-4:00 PM   | REVIEW & REFINEMENT
               | Team review of findings
               | Get stakeholder feedback on priorities
```

### Friday, Aug 17
```
9:00-10:00 AM  | FINAL REPORT COMPLETION
               | Address any team feedback from Thu
               | Finalize all charts/tables

10:00 AM-12:00 | PRESENTATION PREP
               | Create deck for team debrief
               | Practice summary talking points

2:00-3:00 PM   | TEAM DEBRIEF & DECISIONS
               | Present findings to full team
               | Discuss recommendations
               | Decide on priorities for fixes
               | Plan next dev sprint based on feedback
```

---

## 🔗 Session Links & Access

### Create Zoom Meeting Template
```
Meeting: OpenMAIC Phase 2 Testing - [Participant ID]
Time: [Date & Time]
Duration: 60 min
Waiting Room: ENABLED (approve each participant manually)
Recording: ENABLED (cloud recording)
Co-hosts: [Facilitator email]

Participant Links to Share: 
https://zoom.us/j/[meeting-id]?pwd=[password]

Team Recording Link (after session):
[Auto-uploaded to Zoom cloud, share link in Slack]
```

### Test Environment Access
```
Staging URL: https://staging.openmatic.app
Status Page: [If available, share uptime monitor]

Test Accounts:
- Teacher: teacher@test.com / TestPass123!
- Student: student@test.com / TestPass123!

If staging is down:
- Have backup: demo video (recorded in advance)
- Reschedule session to next available time
- Notify all scheduled participants
```

---

## 📧 Participant Communication Timeline

### **Friday, Aug 8 (Before Testing Starts)**

**Subject:** You're Confirmed! OpenMAIC Testing Session - [DATE] at [TIME]

```
Hi [Participant Name],

Great! You're confirmed for our testing session! 🎉

📅 Session Details:
- Date: [Date]
- Time: [Time] - [Time + 1 hour]
- Format: Zoom video call
- Duration: 60 minutes

🔗 Zoom Link: [Insert link]

🔐 Test Credentials:
├─ Email: [temp-test-email@staging.openmatic.app]
├─ Password: [PASSWORD]
└─ URL: https://staging.openmatic.app

📋 What to Expect:
1. (5 min) Brief intro & goals
2. (45 min) Test 3-4 features with your feedback
3. (10 min) Quick survey

💡 Tips:
- Have a quiet space
- You'll be screen sharing, so close other windows
- Don't worry about bugs — that's what we're testing!
- Think out loud as you explore

Questions? Reply to this email!

See you [DATE] at [TIME]!
[Your Name]
QA Testing Lead
```

---

### **Day Before Session (Reminder Email)**

**Subject:** Tomorrow's OpenMAIC Testing - Quick Reminders 👋

```
Hi [Participant Name],

Excited to chat with you tomorrow about OpenMAIC Phase 2!

🎯 Quick reminders:
- Time: [TIME] tomorrow
- Zoom link: [LINK] (same as before)
- Credentials: [SAME CREDENTIALS]
- Please join 2 minutes early to test your camera/mic

Questions or need to reschedule? Let me know ASAP.

Thanks for helping us make this better!
[Your Name]
```

---

### **Day of Session (30 min before)**

**Slack Message (if you have their Slack):**
```
@[Participant]: See you in 30 min for the OpenMAIC testing session! 
Zoom link: [LINK]
Looking forward to your feedback! 🚀
```

---

### **After Session Completion (Within 1 hour)**

**Subject:** Thank You for Testing OpenMAIC! 🙏

```
Hi [Participant Name],

Thank you SO much for taking the time to test with us today! 
Your feedback was incredibly valuable.

🎯 Quick recap of what we heard:
- [Key point #1]
- [Key point #2]
- [Question they asked]

We're going to incorporate your feedback and launch these features 
to the wider community next month. You'll get early access as a thank you!

📊 One more quick thing: Could you fill out this 5-minute feedback survey?
[LINK TO SURVEY]

It helps us prioritize what matters most.

Thanks again! 🙌
[Your Name]
QA Testing Lead
OpenMAIC
```

---

### **End of Week (Friday EOD - Summary for All Participants)**

**Subject:** OpenMAIC Phase 2 Testing Results - Thank You! 🎉

```
Hi [All Participants],

Thank you to everyone who tested OpenMAIC Phase 2 this week! 
Your feedback was amazing.

📊 QUICK RESULTS:
- 5 sessions completed
- NPS score: [XX] (Excellent for an MVP!)
- Key feedback: [Top 1-2 themes]
- Next steps: [What we're doing with this feedback]

🎁 As promised:
- Early access to Phase 2 features [WHEN]
- Recognition in release notes [if opted in]
- Chance to shape the roadmap

We'll reach out next week with more details. Stay tuned for the launch!

Thank you for being part of making OpenMAIC better! 🚀
[Your Name]
QA Testing Lead
OpenMAIC
```

---

## 🎬 Recording & Data Management

### Where Recordings Live
```
Google Drive Folder: 
/OpenMAIC/Phase2-Testing/Recordings/Week2/

Naming convention:
WEEK2_SESSION_[DATE]_[ID]_[ROLE].mp4
Example: WEEK2_SESSION_Aug13_T01_Teacher.mp4

Backup location (if Google Drive fails):
Zoom Cloud Recording: account.zoom.us/recordings/
Auto-retained for 30 days
```

### Share Recordings with Team
```
After each session:
1. Download from Zoom or Loom
2. Upload to Google Drive (shared folder)
3. Post link in #testing Slack channel
4. Add timestamp markers for key moments:
   - [00:15] User finds X button
   - [02:30] BUG: Search doesn't work
   - [05:00] KEY QUOTE: "..."
```

---

## ⚠️ Contingency Plans

### If Participant No-Shows

**Timing:** Within 30 min of session start time

**Action:**
```
1. Try calling/texting participant (if you have number)
2. Send urgent Slack/email: "Hi, we're waiting in Zoom!"
3. Wait 10 min max, then move on
4. Reschedule for next available time slot
5. Keep backup participant on standby

Follow-up email:
"Hi [Name], We missed you at [TIME] today. 
No worries — these things happen! 
Are you available [ALT TIME]?"
```

### If Staging Environment is Down

**Action Plan:**
```
OPTION 1 (Preferred): Reschedule
- Notify all participants immediately
- Offer alternate times same week
- Apologize for inconvenience

OPTION 2 (If no time to reschedule): Demo Video
- Have backup demo video prepared in advance
- "I'm showing you a recording of the features"
- Walk through scenarios with recording
- Still collect feedback on design/UX
- Ask: "If this was working, would you..."

OPTION 3: Partial Testing
- Test features that don't require persistence (e.g., roster add)
- Skip features that need backend (e.g., quiz submission)
- Come back next week for full session
```

### If Participant Gets Frustrated

**Action:**
```
1. Validate: "I can see this is frustrating"
2. Reframe: "That's exactly why we're testing before launch"
3. Offer break: "Want to take 2 minutes?"
4. Move on: "Let's try the next scenario — it might be smoother"
5. Document: Note frustration point in synthesis
```

### If Participant Finds Critical Bug

**Action:**
```
1. DON'T try to fix it during session
2. Note immediately: description + steps + timestamp
3. Reassure them: "This is super helpful! That's why we test"
4. Continue testing: "Let's see if other features work..."
5. Escalate: Flag to dev team immediately after session
```

---

## ✅ Pre-Testing Checklist (Monday AM Aug 13)

**By 9:00 AM Monday:**
- [ ] All 5-6 participants confirmed (email confirmations received)
- [ ] Zoom links created for all sessions
- [ ] Test credentials working (teacher + student logins tested)
- [ ] Staging environment up and responsive
- [ ] CSV test files downloaded to desktop
- [ ] Observation sheets printed (or digital version ready)
- [ ] Recording settings tested (Zoom/Loom working)
- [ ] Facilitator available and caffeinated ☕

**Backup/Contingency:**
- [ ] Backup participant contact info available (in case no-show)
- [ ] Demo video recorded (in case staging down)
- [ ] All materials uploaded to shared folder
- [ ] Team Slack channel ready for live updates

---

## 📊 Daily Status Updates (Share in Slack #testing)

**Each day, post at end of business:**

```
📊 Testing Status - [Date]

Sessions Completed: [X] of 6
├─ Teachers: [X] of 4
└─ Students: [X] of 2

Tomorrow's Schedule:
├─ [TIME] - [Participant ID] - [Role]
└─ [TIME] - [Participant ID] - [Role]

Key Findings So Far:
• [Top theme #1]
• [Top theme #2]
• [Bug found? Yes/No]

Status: 🟢 ON TRACK / 🟡 SLIGHT DELAY / 🔴 ISSUE

Next Actions:
- [Action item]
- [Action item]
```

---

## 🏁 End-of-Week Handoff (Friday EOD)

**By 4:00 PM Friday, deliver to team:**

1. ✅ **All session synthesis docs** (6 templates filled out)
2. ✅ **NPS score + trend analysis** (see analysis framework doc)
3. ✅ **Bug list with severity** (prioritized by impact)
4. ✅ **Recommendation doc** (what to fix, effort estimate)
5. ✅ **Presentation slides** (for team debrief)
6. ✅ **Recording links** (all 5-6 sessions, timestamps marked)

**Final Checklist:**
- [ ] All data compiled into summary sheet
- [ ] NPS calculated
- [ ] Common themes identified (3+ mentions)
- [ ] Bugs triaged and prioritized
- [ ] Recommendations ranked by impact/effort
- [ ] Team presentation scheduled
- [ ] Thank-you emails sent to all participants

---

**Schedule Owner:** [Your Name]  
**Last Updated:** Aug 5, 2026  
**Updated Daily:** Check this doc each morning + EOD

**Status:** 🟢 READY TO LAUNCH
