# Daily Standup Template — Sprint Day X

**Post this to #sprint-standups channel at 9:00 AM daily (Days 1-15)**

---

## Template (Copy & Fill)

```
[AGENT NAME] — Sprint Day X

✅ COMPLETED YESTERDAY:
  - Task 1 (evidence: PR #123 merged / screenshot / test passed)
  - Task 2 (evidence: ...)
  - Task 3 (evidence: ...)

🔄 IN PROGRESS TODAY:
  - Task 1 (X% done, status: ON TRACK / AT RISK)
  - Task 2 (X% done, status: ON TRACK / AT RISK)
  - Task 3 (X% done, status: ON TRACK / AT RISK)

🚫 BLOCKED BY:
  - Blocker 1: [Description] — waiting on [Agent X]
  - Blocker 2: [Description] — waiting on [Agent Y]
  (If none: "None — proceeding on schedule")

⚡ NOTES FOR COORD AGENT:
  - Concern 1: [Specific issue that needs escalation]
  - Concern 2: [Specific issue that needs escalation]
  (If none: "All clear")

📊 CONFIDENCE LEVEL:
  - On track for Day 13 launch? YES / NO / AT RISK
  - Current progress: X/Y tasks complete (X%)
```

---

## Examples by Agent

### Example 1: Database Agent (Day 2 Morning)

```
[DATABASE] — Sprint Day 2

✅ COMPLETED YESTERDAY:
  - Schema designed (6 MVP tables: quizzes, quiz_assignments, quiz_scores, etc.)
  - All tables created in staging environment
  - Foreign key constraints tested + working
  - Evidence: Staging DB schema verified via psql

🔄 IN PROGRESS TODAY:
  - Adding indexes (50% done, on track)
  - Testing index performance on 10K sample data (30% done, on track)
  - Migration rollback testing (20% done, on track)

🚫 BLOCKED BY:
  - None — proceeding on schedule

⚡ NOTES FOR COORD AGENT:
  - FYI: Using Supabase auto-migrations. No manual SQL needed on deploy.
  - Question: Should we add audit logs table now or later? (Not in MVP schema)

📊 CONFIDENCE LEVEL:
  - On track for Day 13 launch? YES
  - Current progress: 6/6 tables complete (100%)
```

---

### Example 2: Backend Agent (Day 4 Morning)

```
[BACKEND] — Sprint Day 4

✅ COMPLETED YESTERDAY:
  - Auth endpoints (POST /auth/request-magic-link, GET /auth/verify) ✅
  - Quiz load endpoint (GET /quiz/:code) ✅
  - Quiz answer submission (POST /quiz/:code/answer) ✅
  - Evidence: All 3 endpoints tested with Postman, tests green

🔄 IN PROGRESS TODAY:
  - Quiz submit endpoint (POST /quiz/:code/submit) — 80% done, on track
  - Results table endpoint (GET /quiz/:id/results) — 40% done, on track
  - Extension request endpoints — 20% done, on track

🚫 BLOCKED BY:
  - None — Database schema confirmed, all good

⚡ NOTES FOR COORD AGENT:
  - Heads up: Quiz submit endpoint needs to handle offline submissions (IndexedDB). Will need Frontend coordination on data format.
  - Question: Should we log every quiz answer submission or only final submit? (Performance consideration)

📊 CONFIDENCE LEVEL:
  - On track for Day 13 launch? YES
  - Current progress: 3/12 endpoints complete (25%)
```

---

### Example 3: Frontend Agent (Day 5, AT RISK)

```
[FRONTEND] — Sprint Day 5

✅ COMPLETED YESTERDAY:
  - Login page ✅
  - Dashboard page ✅
  - Quiz-taking UI (basic version) ✅
  - Evidence: All 3 pages responsive on 320px and 1920px

🔄 IN PROGRESS TODAY:
  - Quiz results page (60% done, ON TRACK)
  - Extension request modal (30% done, ON TRACK)
  - Mobile optimization for quiz timer (20% done, AT RISK)

🚫 BLOCKED BY:
  - None on critical path, but need Backend to finalize quiz response schema format by EOD

⚡ NOTES FOR COORD AGENT:
  - CONCERN: Quiz timer on mobile is rendering too small. May need UX review.
  - CONCERN: IndexedDB integration for offline responses — waiting on Backend spec + example data format
  - Question: Should "Request Extension" button visible even if not overdue? (UX decision needed)

📊 CONFIDENCE LEVEL:
  - On track for Day 13 launch? AT RISK (mobile timer is blocker)
  - Current progress: 3/12 pages complete (25%)
```

---

### Example 4: Testing Agent (Day 6, BLOCKED)

```
[TESTING] — Sprint Day 6

✅ COMPLETED YESTERDAY:
  - Jest test framework set up
  - Unit tests for auth logic (12 tests, all passing)
  - Unit tests for score calculation (8 tests, all passing)
  - Evidence: npm test shows 45% coverage (auth + quiz utils)

🔄 IN PROGRESS TODAY:
  - Integration tests (create quiz → assign → take → submit) — 50% done, ON TRACK
  - E2E tests (Cypress) — 10% done, BLOCKED
  - Load testing setup (k6 script) — 20% done, BLOCKED

🚫 BLOCKED BY:
  - CRITICAL: Frontend pages not yet deployed to staging. Can't run E2E tests without real UI to interact with.
  - CRITICAL: All Backend endpoints not yet ready. Can't test full workflow end-to-end.
  - Waiting on: Frontend (pages) + Backend (all 12 endpoints) = critical path items

⚡ NOTES FOR COORD AGENT:
  - Escalate: Frontend + Backend need to prioritize getting staging-deployable versions ready by EOD today
  - Concern: If Frontend/Backend take until Day 8, we'll be crunched for testing time. May need to extend timeline or reduce coverage target.

📊 CONFIDENCE LEVEL:
  - On track for Day 13 launch? NO — currently blocked on critical path
  - Current progress: 2/12 test suites complete (17%)
```

---

### Example 5: Video Agent (Day 5, ON TRACK)

```
[VIDEO] — Sprint Day 5

✅ COMPLETED YESTERDAY:
  - Remotion composition for "How to Create Quiz" (60 sec, fully animated)
  - Remotion composition for "How to Take Quiz" (60 sec, fully animated)
  - Evidence: Both videos rendered to MP4 successfully, timing exact (60.0 sec, 60.1 sec)

🔄 IN PROGRESS TODAY:
  - Voiceover recording for both videos (in progress, 50% done)
  - Background music mixing (30% done)
  - Upload to YouTube (20% done)

🚫 BLOCKED BY:
  - None — all parallel work

⚡ NOTES FOR COORD AGENT:
  - On track. Should have all 3 videos published by EOD Day 6.

📊 CONFIDENCE LEVEL:
  - On track for Day 13 launch? YES
  - Current progress: 2/3 videos complete (67%)
```

---

## Tips for Good Standups

✅ **DO:**
- Be specific (dates, numbers, PR links)
- Update progress honestly (don't fake 100% done when you're 60%)
- Flag blockers immediately (don't hide them)
- Provide evidence (PR link, screenshot, test results)
- Keep it brief (<5 min to read)

❌ **DON'T:**
- Ramble (stick to format)
- Hide problems ("it's fine" when it's not)
- Miss daily standup (commit to 9:00 AM reporting)
- Report someone else's work (only your own)
- Wait until end of day to report critical blockers (report immediately in Slack)

---

## Quick Reference: Status Color Codes

- 🟢 **ON TRACK** — Proceeding per plan, no blockers
- 🟡 **AT RISK** — May slip, but no blockers yet (watch closely)
- 🔴 **BLOCKED** — Can't proceed, waiting on another agent

---

## Standup Frequency Reminder

| Day | Standup Cycle |
|-----|----------------|
| Day 1 | 9:00 AM (optional, first standup) |
| Day 2-14 | 9:00 AM daily |
| Day 15 | Final standup + retrospective |

---

*Template created: Sprint Day 1*  
*Format: Copy template above + fill with your data + post to #sprint-standups*  
*Questions? Ask Coordination Agent in Slack*

