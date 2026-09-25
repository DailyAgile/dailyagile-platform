# DailyAgile Quiz MVP — Sprint Coordination Guide
## Days 1-15 Rapid Sprint (Coordination Agent Manual)

**Created:** Sprint Day 1  
**Owner:** Product Requirements & Coordination Agent  
**Status:** ACTIVE — All agents begin work immediately

---

## 📋 SPRINT KICKOFF

### Your Role
You are the **Product Requirements & Coordination Agent**. Your job is to:
1. ✅ Define MVP scope clearly (DONE — see SPRINT_MVP_SPECIFICATION.md)
2. ✅ Write production-ready video scripts (DONE — see REMOTION_VIDEO_SCRIPTS.md)
3. ✅ Set up sprint board (DONE — see SPRINT_BOARD.html)
4. ✅ Define acceptance criteria (DONE — see SPRINT_ACCEPTANCE_CRITERIA.md)
5. **ONGOING:** Maintain daily standups, resolve blockers, keep train on track

---

## 📊 WHAT'S BEEN CREATED FOR YOU

All foundational documents are ready. Share these with the 10 agents:

### Document 1: MVP Specification
**File:** `/Users/apgo21/dailyagile-platform/SPRINT_MVP_SPECIFICATION.md`  
**What it contains:**
- Executive summary (what, who, why, success metric)
- MVP scope (what's IN, what's OUT)
- Feature flags (all 9 flags defined)
- User flows (detailed diagrams)
- Database schema (minimal set)
- Acceptance criteria (per agent)
- Launch checklist
- Daily standup format

**Share with:** All 10 agents. This is the single source of truth.

### Document 2: Video Scripts
**File:** `/Users/apgo21/dailyagile-platform/REMOTION_VIDEO_SCRIPTS.md`  
**What it contains:**
- 3 × 60-second scripts (production-ready)
- Video 1: "How to Create a Quiz"
- Video 2: "How to Take a Quiz"
- Video 3: "How to Request an Extension"
- Visual storyboards (detailed shot-by-shot)
- YouTube metadata + playlist setup
- Approval gate for Video Agent

**Share with:** Video Agent. Start production immediately.

### Document 3: Sprint Board (Interactive)
**File:** `/Users/apgo21/dailyagile-platform/SPRINT_BOARD.html`  
**What it contains:**
- 10-agent Kanban board (visual)
- Progress bars per agent
- Task breakdown per agent
- Critical path dependencies
- Metrics summary (tasks completed, blockers)

**Use for:** Daily tracking. Update as agents report.

### Document 4: Acceptance Criteria
**File:** `/Users/apgo21/dailyagile-platform/SPRINT_ACCEPTANCE_CRITERIA.md`  
**What it contains:**
- Detailed success criteria for all 10 agents
- ~20 criteria per agent (very specific)
- Approval gates before sign-off

**Share with:** All agents. Use for sign-off verification.

---

## 🎯 CRITICAL PATH (MUST COMPLETE BY DAY 5)

### Day 1-2: Database Foundation
**Agent:** Database  
**Blocker Level:** CRITICAL (blocks all other work)

Tasks:
- [ ] Schema designed (all 6 MVP tables)
- [ ] Tables created in staging
- [ ] Indexes added
- [ ] Foreign keys enforced
- [ ] Tested in staging with rollback

**Why critical?** Backend can't write code until schema is confirmed.

**If blocked:** Ping Database Agent daily until confirmed.

---

### Day 2: Authentication Foundation
**Agent:** Backend  
**Blocker Level:** CRITICAL (blocks Frontend testing)

Tasks:
- [ ] Auth endpoints stubbed (POST /auth/request-magic-link, GET /auth/verify)
- [ ] Magic link token generation working
- [ ] Email sending working (Gmail MCP)
- [ ] Tested in staging

**Why critical?** Frontend needs auth endpoints to build login page.

**If blocked:** Ping Backend Agent by end of Day 2.

---

### Day 2-3: Quiz Endpoints Foundation
**Agent:** Backend  
**Blocker Level:** CRITICAL (blocks Frontend + Testing)

Tasks:
- [ ] Quiz CRUD endpoints stubbed (POST /quiz/create, GET /quiz/:code, POST /quiz/:code/submit)
- [ ] Response structure defined (what each endpoint returns)
- [ ] Tested with curl or Postman

**Why critical?** Frontend can't build quiz-taking UI without knowing response shape.

**If blocked:** Ping Backend Agent by end of Day 3.

---

### Day 3-4: UI Foundation
**Agent:** Frontend  
**Blocker Level:** HIGH (blocks Testing)

Tasks:
- [ ] Login page built
- [ ] Dashboard page built
- [ ] Quiz-taking UI built (basic)
- [ ] Results page built
- [ ] All responsive on mobile

**Why critical?** Testing needs real UI to write E2E tests.

**If blocked:** Help Frontend unblock Backend dependency.

---

### Day 4-5: Testing Infrastructure
**Agent:** Testing  
**Blocker Level:** MEDIUM (nice-to-have, but important)

Tasks:
- [ ] Unit test suite set up (Jest configured)
- [ ] Integration tests written (full workflows)
- [ ] E2E tests written (Cypress)
- [ ] 1-2 tests running successfully

**Why critical?** Needed for deployment confidence.

**If blocked:** Help Testing unblock Backend/Frontend dependencies.

---

## 📅 PARALLEL TRACKS (NO DEPENDENCIES)

These can start Day 1 — don't wait for anything:

### Video Production (Days 1-5)
**Agent:** Video  
**No blockers:** Can start immediately

Tasks:
- [ ] Render 3 videos
- [ ] Upload to YouTube
- [ ] Embed in help pages

---

### Documentation (Days 1-5)
**Agent:** Documentation  
**No blockers:** Can start immediately (use mockups/designs)

Tasks:
- [ ] Write API documentation
- [ ] Write student guide
- [ ] Write instructor guide
- [ ] Create FAQ

---

### Security Audit (Days 1-7)
**Agent:** Security  
**Limited blockers:** Can review code as it's written

Tasks:
- [ ] Review auth logic
- [ ] Audit API endpoints for SQL injection
- [ ] Check CSRF protection
- [ ] Run OWASP scan

---

### DevOps Setup (Days 1-5)
**Agent:** DevOps  
**Limited blockers:** Can build CI/CD pipeline without all code ready

Tasks:
- [ ] GitHub Actions workflow created
- [ ] Feature flags table designed
- [ ] Environments configured (dev, staging, prod)
- [ ] Monitoring dashboards set up

---

## 📞 DAILY STANDUP PROCESS

### When: 9:00 AM Daily (Days 1-15)
### How: Async report (post in Slack or submit via form)
### Format: Use template below

---

## 📝 STANDUP TEMPLATE

**Copy this template. Each agent fills out daily and posts to #sprint-standups Slack channel:**

```
[AGENT NAME] — Sprint Day X

✅ COMPLETED YESTERDAY:
  - Task 1 (evidence: PR #123 merged)
  - Task 2 (evidence: database schema confirmed)
  - Task 3 (evidence: 5 endpoints tested)

🔄 IN PROGRESS TODAY:
  - Task 1 (X% done, on track / at risk)
  - Task 2 (X% done, on track / at risk)
  - Task 3 (X% done, on track / at risk)

🚫 BLOCKED BY:
  - Blocker 1 — [Agent X] needs to deliver Y by [date]
  - Blocker 2 — [dependency description]
  (If no blockers: "None — proceeding on schedule")

⚡ NOTES FOR COORD AGENT:
  - Concern 1: [specific issue requiring escalation]
  - Concern 2: [specific issue requiring escalation]
  (If no concerns: "All green")

📊 CONFIDENCE LEVEL:
  - On track for Day 13 launch? YES / NO / AT RISK
  - Current progress: X/Y tasks complete (X%)

--- EXAMPLE (Backend Agent, Day 3) ---

[BACKEND] — Sprint Day 3

✅ COMPLETED YESTERDAY:
  - Auth endpoints (POST /auth/request-magic-link, GET /auth/verify) built + tested
  - Magic link token generation working (15-min expiry, one-time use)
  - Email sending via Gmail MCP integrated

🔄 IN PROGRESS TODAY:
  - Quiz loading endpoint (GET /quiz/:code) — 60% done, on track
  - Quiz answer submission (POST /quiz/:code/answer) — 40% done, on track
  - Score calculation logic — 30% done, on track

🚫 BLOCKED BY:
  - None — Database schema confirmed yesterday, all good

⚡ NOTES FOR COORD AGENT:
  - Question: Should rate limiting be per-quiz or per-student? Need clarification
  - Concern: Quiz submission endpoint needs to handle offline responses (IndexedDB)

📊 CONFIDENCE LEVEL:
  - On track for Day 13 launch? YES
  - Current progress: 3/12 endpoints complete (25%)
```

---

## 🔗 BLOCKER RESOLUTION WORKFLOW

### Step 1: Agent reports blocker in standup
Example: "Frontend blocked — waiting on Backend to confirm response schema"

### Step 2: Coord Agent investigates (same day)
- Reach out to blocking agent (Backend)
- Ask: "Can you provide response schema by [time]?"
- If timeline uncertain: escalate to Product Owner

### Step 3: Blocker resolved or escalated
- Resolved: Post in #sprint-standups that blocker cleared
- Escalated: Product Owner makes trade-off decision (scope, timeline, or extra resources)

### Step 4: Coord Agent tracks resolution
- Log in BLOCKER_LOG.md (see next section)
- Update Sprint Board

---

## 🚨 BLOCKER LOG

**File:** `/Users/apgo21/dailyagile-platform/BLOCKER_LOG.md`  
**Purpose:** Track all blockers + resolutions (for retrospective)

**Format:**
```
## Blocker #1: Frontend waiting on Backend response schema
- Reported: Sprint Day 2, 9:15 AM
- By: Frontend Agent
- Blocking: Login page development
- Resolution: Backend provided schema at 3 PM same day
- Time to resolve: 5.75 hours
- Escalation needed? No

## Blocker #2: Database indexes causing slow queries
- Reported: Sprint Day 5, 10 AM
- By: Testing Agent (during load test)
- Blocking: Load testing (can't validate performance)
- Resolution: Database Agent added composite indexes, resolved by Day 5 EOD
- Time to resolve: 8 hours
- Escalation needed? Yes — Product Owner decided to add index optimization to critical path
```

---

## 🎯 SUCCESS METRICS (Track Daily)

Post daily in #sprint-standups:

```
📊 SPRINT METRICS — Sprint Day X

Overall Progress: X/Y tasks complete (X%)
Agents On Track: X/10
Active Blockers: X
Days Remaining: Y

Task Completion By Agent:
  🔐 Security: X% (X/Y tasks)
  🗄️ Database: X% (X/Y tasks)
  🚀 DevOps: X% (X/Y tasks)
  🔧 Backend: X% (X/Y tasks)
  🎨 Frontend: X% (X/Y tasks)
  🚩 Flags: X% (X/Y tasks)
  📹 Video: X% (X/Y tasks)
  🧪 Testing: X% (X/Y tasks)
  📚 Docs: X% (X/Y tasks)
  ✅ QA/Launch: X% (X/Y tasks)

Critical Path Status:
  ✅ Day 1-2: Database schema → COMPLETE / IN PROGRESS / NOT STARTED
  ✅ Day 2: Auth endpoints → COMPLETE / IN PROGRESS / NOT STARTED
  ✅ Day 2-3: Quiz endpoints → COMPLETE / IN PROGRESS / NOT STARTED
  ✅ Day 3-4: Frontend UI → COMPLETE / IN PROGRESS / NOT STARTED
  ✅ Day 4-5: Testing → COMPLETE / IN PROGRESS / NOT STARTED

Launch Readiness: ON TRACK / AT RISK / CRITICAL
```

---

## 📋 DAILY COORD AGENT CHECKLIST (Do this every morning)

**9:00 AM - Read standups:**
- [ ] Read all 10 standup reports from #sprint-standups
- [ ] Identify blockers (any "🚫 BLOCKED BY" sections)
- [ ] Check "AT RISK" flags (any agent saying "at risk"?)

**9:30 AM - Investigate blockers:**
- [ ] For each blocker: reach out to blocking agent
  - "Can you deliver [X] by [time]?"
  - Confirm or escalate
- [ ] Update BLOCKER_LOG.md

**10:00 AM - Update metrics:**
- [ ] Calculate overall sprint progress (% complete)
- [ ] Update Sprint Board (move task cards, update progress bars)
- [ ] Post daily metrics to #sprint-standups

**10:30 AM - Escalate if needed:**
- [ ] If any blocker unsolved: escalate to Product Owner
  - Provide: blocker description, impact, proposed solution
  - Request: decision (extend deadline, reduce scope, add resources?)

**11:00 AM - Standup report:**
- [ ] Post brief coordination update:
  ```
  🤝 COORDINATION REPORT — Day X
  
  ✅ Blockers Resolved: X (details in BLOCKER_LOG.md)
  🚫 Active Blockers: X (escalated to Product Owner if critical)
  📊 Overall Progress: X% on track
  
  Next focus: [what needs to happen next 24h]
  ```

---

## 🚀 LAUNCH SEQUENCE (Day 13-14)

### Day 13 Morning: Go/No-Go Meeting

**Participants:** All 10 agents + Product Owner  
**Duration:** 1 hour  
**Agenda:**
1. Each agent reports: "DONE" or "X blockers remain"
2. Review launch checklist (see SPRINT_MVP_SPECIFICATION.md, Section 7)
3. Decide: GO or NO-GO
4. If GO: proceed to Day 13 afternoon launch
5. If NO-GO: identify blockers, set new launch date

**Coord Agent's role:** Facilitate meeting, document decision

---

### Day 13 Afternoon: Launch

**If GO approved:**
1. ✅ Announce via email (existing students)
2. ✅ Announce via in-app banner (dashboard)
3. ✅ Announce via Slack #announcements
4. ✅ Announce via LinkedIn (organic post)
5. ✅ Enable monitoring dashboards (Sentry, Vercel, Supabase)
6. ✅ Put backend team on standby (1 hour)

**Coord Agent's role:** Ensure all announcements posted, monitoring active

---

### Day 14-20: Post-Launch Monitoring

**Daily metrics posted to #sprint-standups:**
- Error rate (target: <0.1%)
- Response times (target: P95 <200ms)
- Quiz creation count (target: ≥3 by Day 1)
- Student submissions (target: ≥50 by Day 1)
- User feedback summary

**Coord Agent's role:** Track metrics, flag issues, coordinate fixes

---

## 📞 ESCALATION CONTACTS

**Product Owner:** tkiran204@gmail.com  
**On-call (if critical bug at launch):**
- Backend lead: [TBD from Backend Agent]
- DevOps lead: [TBD from DevOps Agent]
- Frontend lead: [TBD from Frontend Agent]

**When to escalate:**
- Any blocker unsolved after 4 hours
- Any agent says "AT RISK" (two standup cycles in a row)
- Any agent abandoning sprint
- Any scope creep requests (new features during sprint)

---

## 📌 KEY DECISIONS FOR COORD AGENT

These are decisions you make (don't wait for Product Owner unless stated):

1. **Task priority:** If agent asks "which task first?", use "Critical Path" order (Database → Backend → Frontend)
2. **Blocker escalation:** If blocker unsolved after 4 hours, escalate to Product Owner
3. **Scope clarification:** If agent confused about spec, clarify (don't rewrite spec)
4. **Merge approval:** If agent asks "can I merge?", answer: "Once all tests pass + code reviewed"

**These require Product Owner approval:**
- Reducing scope (cutting features)
- Extending launch date
- Adding new features
- Reducing quality bar (coverage, accessibility, etc.)

---

## 📂 DOCUMENT STRUCTURE

```
dailyagile-platform/
├── SPRINT_MVP_SPECIFICATION.md        ← MVP scope (share with all agents)
├── REMOTION_VIDEO_SCRIPTS.md          ← 3 video scripts (share with Video Agent)
├── SPRINT_BOARD.html                  ← Interactive board (for tracking)
├── SPRINT_ACCEPTANCE_CRITERIA.md      ← Success criteria (share with all agents)
├── SPRINT_COORDINATION_GUIDE.md       ← This file (Coord Agent manual)
├── BLOCKER_LOG.md                     ← Blockers + resolutions (create and maintain)
└── DAILY_STANDUPS/                    ← Daily standup reports (folder)
    ├── sprint-day-1.md
    ├── sprint-day-2.md
    └── ...
```

---

## ✉️ MESSAGES TO SEND TO AGENTS

### Message 1: Kickoff (Send immediately)

```
Subject: 🚀 Quiz MVP Sprint Kickoff — Days 1-15

Hi [All 10 Agents],

Welcome to the DailyAgile Quiz MVP sprint! We're launching an interactive quiz system in 11-15 days.

📋 DOCUMENTS READY FOR YOU:
1. SPRINT_MVP_SPECIFICATION.md — Read this first. It defines scope, workflows, feature flags, and launch checklist.
2. SPRINT_ACCEPTANCE_CRITERIA.md — Your success criteria. Bookmark this.
3. SPRINT_BOARD.html — Real-time progress tracker (I'll update daily).
4. REMOTION_VIDEO_SCRIPTS.md — If you're on Video Agent, start rendering.

🎯 CRITICAL PATH (must complete first):
- Database Agent: Schema + tables (Days 1-2) 🔐 BLOCKS ALL OTHERS
- Backend Agent: Auth endpoints (Day 2) 🔐 BLOCKS Frontend
- Backend Agent: Quiz endpoints (Days 2-3) 🔐 BLOCKS Testing
- Frontend Agent: All UI (Days 3-4) 🔐 BLOCKS Testing
- Testing Agent: Full test suite (Days 4-5+)

📊 DAILY STANDUP:
- Time: 9:00 AM
- Format: Post to #sprint-standups using template (I'll send separately)
- Report: Completed, in-progress, blockers, confidence level
- Frequency: Every day, Days 1-15

🚨 IF BLOCKED:
- Post immediately in #sprint-standups
- I'll investigate within 1 hour
- If unresolved after 4 hours, I escalate to Product Owner

Launch is Day 13-14. Let's ship! 🚀

Questions? Ask in [sprint-channel] and I'll clarify immediately.

— Coordination Agent
```

### Message 2: Daily (Send at 10:30 AM)

```
Subject: ☀️ Daily Standup Reminder — Sprint Day X

Morning team! Quick reminder:

📋 Please post your standup by 9:30 AM using this format:
✅ Completed yesterday
🔄 In progress today
🚫 Blocked by
⚡ Notes for Coord Agent

Example: [Backend Agent example]

I'll post daily metrics + blocker resolution by 11 AM.

— Coordination Agent
```

---

## 🎉 SUCCESS CELEBRATION (Day 14 evening)

Once launch is live and metrics look good:

```
🎉 QUIZ MVP LIVE! 🎉

Launched: [date]
Status: All systems nominal
Agents on standby: YES
Monitoring active: YES

Team: Great work! Let's give this feature 1 week of monitoring, then gather learnings for post-launch retrospective.

Celebrate! You shipped. 🚀

— Coordination Agent
```

---

## 📝 FINAL NOTES

1. **You're the keeper of truth:** MVP Specification is the single source of truth. If agents ask "can we change scope?", answer "No scope changes mid-sprint. Log it for post-launch backlog."

2. **Communication is key:** If agents feel unheard or confused, the sprint derails. Be responsive and clear.

3. **Unblock fast:** If a blocker sits for >4 hours, escalate. Fast escalation = fast resolution.

4. **Track everything:** Document all blockers, decisions, and resolutions. This becomes the retrospective.

5. **Celebrate launches:** Once live, acknowledge the team's work.

---

**Coordination Agent Role Summary:**
- Define scope ✅ (DONE — read SPRINT_MVP_SPECIFICATION.md)
- Coordinate agents 🔄 (ONGOING — daily standups)
- Unblock teams 🚨 (ONGOING — fast blocker resolution)
- Track progress 📊 (ONGOING — update Sprint Board daily)
- Launch successfully 🚀 (Days 13-14)

**You've got this. Let's ship.** ⚡

---

*Created: Sprint Day 1*  
*Status: ACTIVE*  
*Next: Read all agent standups at 9:00 AM daily*

