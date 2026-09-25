# Integration Tasks — Phase 1/2/3 Wiring

**Status:** Ready to build  
**Timeline:** 3-4 hours to completion  
**Owner:** Engineering team  

---

## 🎯 PHASE 1: Quiz Flow Integration (2 hours)

### Task 1.1: Wire Code Grading Queue into /api/quiz-grade
**Priority:** HIGH | **Owner:** Backend  
**Status:** 🔄 IN PROGRESS

**What:** Extend existing `/api/quiz-grade/route.ts` to enqueue code challenges to `CodeGradingQueue` instead of inline grading.

**Changes:**
1. Import `getCodeGradingQueue` from `lib/quiz/code-grading-queue.ts`
2. In the main grade handler, check if `questionType === 'code'`
3. If code: enqueue a job with `{ studentId, questionId, code, codeLanguage, rubric, trackId }`
4. Respond immediately with `{ status: 'queued', jobId, estimatedWaitSeconds }` (don't wait for async LLM)
5. Store job ID in localStorage/session so student can poll for result
6. Add polling endpoint: `GET /api/quiz-grade/[jobId]` to check job status + retrieve score

**Files to modify:**
- `openMAIC/app/api/quiz-grade/route.ts` (add job enqueue logic)
- `openMAIC/lib/quiz/grading.ts` (add isCodeChallenge helper if needed)

**Tests:**
- Submit code → should return queued status + jobId within 100ms
- Poll job → should return in-progress → complete with score

---

### Task 1.2: Wire Email Verification Gate into Quiz Flow
**Priority:** HIGH | **Owner:** Frontend  
**Status:** 🔄 IN PROGRESS

**What:** Make EmailVerificationGate the entry point for quiz start, blocking quiz launch until student is verified.

**Changes:**
1. Update quiz-view.tsx or create wrapper: check if student has valid session token (from cookie/localStorage)
2. If not verified: mount `EmailVerificationGate` in place of quiz
3. On `onVerified(token, studentId)`: store token, set student context, unmount gate, render quiz
4. Pass `sessionToken` + `studentId` to all subsequent API calls (grading, submission persistence)

**Files to modify:**
- `openMAIC/components/scene-renderers/quiz-view.tsx` (add gate wrapper)
- `openMAIC/app/classroom/[id]/page.tsx` (mount quiz-view with gate)
- `openMAIC/lib/quiz/persistence.ts` (pass auth token to submission API)

**Tests:**
- Unverified student → see email gate
- Enter email → get OTP
- Enter OTP → gate closes, quiz appears
- Quiz submission includes studentId in request

---

### Task 1.3: Store Quiz Submissions to Supabase (Self-Paced)
**Priority:** HIGH | **Owner:** Backend  
**Status:** 🔄 IN PROGRESS

**What:** After existing localStorage write, POST to `/api/quiz-submissions` to persist to Supabase with student + classroom context.

**Changes:**
1. Create `openMAIC/app/api/quiz-submissions/route.ts`:
   - POST handler: `{ sceneId, questions, answers, sessionToken, studentId }`
   - Decode session token → verify student
   - Lazy-provision self-paced classroom via `ensureSelfPacedClassroom(stageId)`
   - Lazy-provision student enrollment via `ensureSelfPacedEnrollment(classroomId, studentId)`
   - Call existing `submitQuiz(classroomId, studentId, questions, answers)`
   - Return submission ID
2. Update `quiz-view.tsx` submit handler: fire-and-forget POST after localStorage (no blocking)
3. Add retry logic in `lib/quiz/sync-queue.ts` if POST fails

**Files to modify/create:**
- `openMAIC/app/api/quiz-submissions/route.ts` (NEW)
- `openMAIC/lib/quiz/sync-queue.ts` (NEW — simple retry buffer)
- `openMAIC/components/scene-renderers/quiz-view.tsx` (call sync after submit)

**Tests:**
- Self-paced student submits quiz → Supabase `quiz_submissions` row created
- Row has correct `classroom_id` (lazy-provisioned)
- Row has correct `student_id`
- All answers in `quiz_answers` table

---

## 🎯 PHASE 2: Instructor Features (1.5 hours)

### Task 2.1: Wire Grading Override Modal into Gradebook
**Priority:** HIGH | **Owner:** Frontend  
**Status:** 🔄 IN PROGRESS

**What:** Mount `GradeOverrideModal` in the gradebook so instructors can override AI grades.

**Changes:**
1. Create/update `components/ilt/gradebook/GradebookTable.tsx`:
   - Render list of quiz submissions for the classroom
   - For each submission answer with AI score, add "Override" button
   - On click: mount `GradeOverrideModal` (modal state)
   - On modal close with override: PATCH to `/api/classrooms/[id]/quiz-submissions/[id]/grade`
   - Refresh table row after successful override
2. Handle error states: show toast on failed override

**Files to modify/create:**
- `openMAIC/components/ilt/gradebook/GradebookTable.tsx` (NEW or extend existing)
- `openMAIC/app/instructor/[classroomId]/gradebook/page.tsx` (NEW — route that mounts table)

**Tests:**
- Instructor opens gradebook → sees list of students + submissions
- Click "Override" on an essay answer → modal opens
- Enter instructor score + feedback → click "Save"
- PATCH request succeeds, score updates in table
- RLS policy verified: instructor can only override their own classroom

---

### Task 2.2: Add Student Notification on Grade Override (Stubbed)
**Priority:** MEDIUM | **Owner:** Backend  
**Status:** 🔄 IN PROGRESS

**What:** After grade override, send student email + in-app notification.

**Changes:**
1. In `/api/classrooms/[id]/quiz-submissions/[id]/grade/route.ts`: uncomment/implement `notifyStudentOfGradeOverride()`
2. Send email via Supabase: `POST /api/email/send-grade-notification` with student email + score + feedback
3. Optional: create notification row in Supabase for in-app inbox

**Files to modify:**
- `openMAIC/app/api/classrooms/[classroomId]/quiz-submissions/[submissionId]/grade/route.ts` (add email call)
- `openMAIC/app/api/email/send-grade-notification/route.ts` (NEW — use Supabase email MCP if available)

**Tests:**
- Override a grade → student receives email with updated score + feedback

---

## 🎯 PHASE 3: Live ILT Sessions (1 hour)

### Task 3.1: Wire Realtime Status Indicator into Quiz View
**Priority:** MEDIUM | **Owner:** Frontend  
**Status:** 🔄 IN PROGRESS

**What:** Show connection status badge during live quiz ("Connected" / "Reconnecting..." / "Offline").

**Changes:**
1. Create `components/ilt/live/RealtimeStatusIndicator.tsx`:
   - Subscribe to `LiveQuizRealtimeManager.connectionStatus$`
   - Show badge: green (connected), yellow (reconnecting), red (offline)
   - Auto-hide when connected for >2s
2. Mount in quiz-view during live ILT session
3. If offline: buffer quiz answers locally until reconnect

**Files to modify/create:**
- `openMAIC/components/ilt/live/RealtimeStatusIndicator.tsx` (NEW)
- `openMAIC/components/scene-renderers/quiz-view.tsx` (mount indicator if live session)

**Tests:**
- Disable network → see "Offline" badge + buffered answers
- Re-enable network → see "Reconnecting..." → "Connected"
- Buffered answers flush to server automatically

---

### Task 3.2: Create Live Quiz Routes
**Priority:** MEDIUM | **Owner:** Backend  
**Status:** 🔄 IN PROGRESS

**What:** Wire up the already-built live session APIs so instructors can start/manage sessions.

**Changes:**
1. Verify existing routes (should be in `app/api/classrooms/[classroomId]/`):
   - `live-sessions/route.ts` — POST to start, GET current session
   - `live-sessions/[sessionId]/advance/route.ts` — instructor advances question
   - `live-sessions/[sessionId]/responses/route.ts` — student submits answer
2. Test instructor can start session → students see session ID
3. Test question advance propagates via Realtime

**Files to verify/modify:**
- `openMAIC/app/api/classrooms/[classroomId]/live-sessions/route.ts`
- `openMAIC/app/api/classrooms/[classroomId]/live-sessions/[sessionId]/advance/route.ts`

**Tests:**
- POST start session → returns session ID + quiz scene
- GET current → returns active session
- POST advance → leaderboard updates via Realtime

---

## 📋 SUPPORTING TASKS (Lower Priority)

### Task 4.1: Mobile UX — Replit Embed for Code Editor
**Priority:** LOW | **Owner:** Frontend  
**Status:** 🔄 IN PROGRESS

**What:** On mobile, code-challenge question routes to external Replit editor instead of textarea.

**Changes:**
1. In `CodeChallengeQuestion.tsx`: detect mobile via `window.innerWidth < 768`
2. If mobile: render Replit embed with starter code pre-loaded
3. Add "Submit from Replit" button linking back to quiz with code param

**Files to modify:**
- `openMAIC/components/scene-renderers/quiz-view.tsx` (code question renderer)

**Tests:**
- Mobile phone: code question → see Replit embed
- Desktop: code question → see textarea

---

### Task 4.2: Privacy Disclosure Modal
**Priority:** LOW | **Owner:** Frontend  
**Status:** 🔄 IN PROGRESS

**What:** Show privacy notice before live ILT quiz starts (leaderboard may be visible to peers).

**Changes:**
1. Create modal: "This is a live session. Your score and name may be visible to other students in the leaderboard."
2. Show before live session starts (or on first live quiz per student)
3. "I Understand" button to dismiss

**Files to create:**
- `openMAIC/components/ilt/live/PrivacyDisclosureModal.tsx` (NEW)

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] 1.1: Code queue integration complete + tested
- [ ] 1.2: Email gate wired + tested
- [ ] 1.3: Supabase submissions working + tested
- [ ] 2.1: Gradebook table + override modal working
- [ ] 2.2: Student notification email working
- [ ] 3.1: Realtime indicator showing connection status
- [ ] 3.2: Live session routes verified
- [ ] 4.1: Mobile Replit embed working (optional for v1)
- [ ] 4.2: Privacy modal showing (optional for v1)
- [ ] **Migration validation runbook executed (Phase 1-4)**
- [ ] **E2E test suite passing on staging**
- [ ] **Production deployment sign-off**

---

## 🚀 NEXT STEPS

**Parallel work (start all at once):**
1. Backend team: Tasks 1.1, 1.3, 2.1, 2.2
2. Frontend team: Tasks 1.2, 3.1, 4.1, 4.2
3. DevOps/QA: Task 3.2 verification + migration validation runbook

**Est. time to completion:** 3-4 hours  
**Blockers:** None — all dependencies implemented in Phase 2 remediation

---

**Last Updated:** 2026-01-15  
**Assigned To:** Engineering Team  
**Ready to Start:** YES ✅
