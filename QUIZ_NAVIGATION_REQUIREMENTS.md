# Quiz Navigation Feature — Complete Requirements (2026-08-26)

**Status:** PM Draft Ready for Design/Engineering Handoff
**Route:** `/quizzes` (not `/#quizzes`) — SEO-optimized, search-crawlable
**Timeline:** 4.5 hours parallel execution
**Owner:** Product Management
**Version:** 1.0

---

## 📋 PART 1: USER STORIES & ACCEPTANCE CRITERIA

### INSTRUCTOR USER STORIES (8 stories)

#### Story 1: Create Quiz Manually
**As an** instructor,
**I want** to create a quiz by typing questions directly into the form,
**so that** I can quickly build assessment without leaving the platform.

**Acceptance Criteria:**
- [ ] "Create New Quiz" button visible on instructor dashboard
- [ ] Clicking opens modal with 3 options: Manual Entry, CSV Upload, AI Generation
- [ ] Manual entry option opens form with fields: Quiz Title, Description, Question Count
- [ ] Form supports adding questions one at a time (4 multiple choice options + 1 correct answer per question)
- [ ] Form shows progress (e.g., "Question 1 of 5")
- [ ] Save button creates quiz and assigns random 8-digit code
- [ ] User sees share confirmation with generated code visible
- [ ] Quiz appears immediately in "Manage Quizzes" grid with "Draft" badge

#### Story 2: Create Quiz via CSV Upload
**As an** instructor,
**I want** to upload a spreadsheet with multiple quiz questions in bulk,
**so that** I can quickly build large assessments without manual data entry.

**Acceptance Criteria:**
- [ ] CSV upload option available in create modal
- [ ] Accepts CSV format: Title, Description, Question, Option1, Option2, Option3, Option4, CorrectAnswer
- [ ] Validates CSV structure (shows errors for missing columns or malformed rows)
- [ ] Partial upload works (valid rows import, invalid rows show error list)
- [ ] After upload, shows "X questions loaded successfully, Y errors found"
- [ ] Clicking "Create Quiz" finalizes and assigns 8-digit code
- [ ] User can download CSV template directly from upload page

#### Story 3: Create Quiz with AI Generation
**As an** instructor,
**I want** to describe quiz topic/subject and have Claude generate questions automatically,
**so that** I can save time on content creation while maintaining quality.

**Acceptance Criteria:**
- [ ] AI generation option available in create modal
- [ ] Form asks: Topic, Difficulty Level (Beginner/Intermediate/Advanced), Number of Questions
- [ ] "Generate" button calls Claude API to create questions
- [ ] Loading state shows progress ("Generating questions...")
- [ ] AI generates questions in CSV-compatible format with 4 options + 1 correct answer each
- [ ] Questions appear in editable text area (user can review + modify before saving)
- [ ] User can accept generated questions or regenerate
- [ ] Quiz saves with AI-generated content, 8-digit code assigned

#### Story 4: Manage Quizzes (View & Filter)
**As an** instructor,
**I want** to see all quizzes I've created in a searchable, filterable list,
**so that** I can find and manage quizzes easily even when I have many.

**Acceptance Criteria:**
- [ ] Instructor dashboard shows "Manage Quizzes" section with grid/list of all instructor's quizzes
- [ ] Each card displays: Quiz Title, Code (8-digit), Question Count, Create Date, Status (Draft/Published)
- [ ] Search bar filters by quiz title (real-time, case-insensitive)
- [ ] Filter dropdown by status (All, Draft, Published)
- [ ] Filter dropdown by date (This Week, This Month, All Time)
- [ ] Sorting options: Date Created (newest first), Title (A-Z), Enrollment (most popular)
- [ ] Shows total quiz count ("You have 12 quizzes")
- [ ] Empty state with "Create your first quiz" CTA when no quizzes exist

#### Story 5: Edit Quiz
**As an** instructor,
**I want** to edit quiz questions, title, and description after creation,
**so that** I can fix errors and improve assessments based on student feedback.

**Acceptance Criteria:**
- [ ] Edit button visible on each quiz card
- [ ] Clicking opens edit page with all quiz details pre-populated
- [ ] Instructor can modify: Title, Description, individual questions, answer options, correct answers
- [ ] Can add new questions or delete existing ones
- [ ] Save button updates quiz
- [ ] User sees confirmation: "Quiz updated successfully"
- [ ] Updated quiz immediately reflects in dashboard grid
- [ ] Quiz code remains unchanged (students don't lose access)

#### Story 6: Delete Quiz
**As an** instructor,
**I want** to delete quizzes I no longer need,
**so that** my quiz collection stays organized and current.

**Acceptance Criteria:**
- [ ] Delete button visible on each quiz card (with warning icon)
- [ ] Clicking shows confirmation modal: "Are you sure? This action cannot be undone."
- [ ] Modal shows: Quiz title, number of students who took it, date created
- [ ] Confirmation modal has two buttons: "Cancel" (teal), "Delete" (red/orange)
- [ ] Clicking "Delete" removes quiz immediately
- [ ] Success message: "Quiz deleted"
- [ ] Quiz disappears from dashboard
- [ ] If students previously enrolled, show warning: "X students have attempted this quiz"

#### Story 7: Share Quiz & View Share Options
**As an** instructor,
**I want** to get shareable links for my quiz in 3 different modes (Practice, Mock Test, Game),
**so that** I can share assessment options with students based on their needs.

**Acceptance Criteria:**
- [ ] Share button visible on each quiz card
- [ ] Clicking opens modal titled "Share Quiz"
- [ ] Modal displays 8-digit quiz code prominently
- [ ] Modal shows 3 shareable links:
  - Practice Mode: `http://localhost:3000/learn/quizzes/[CODE]/practice`
  - Mock Test Mode: `http://localhost:3000/learn/quizzes/[CODE]/mock`
  - Game Mode: `http://localhost:3000/learn/quizzes/[CODE]/game`
- [ ] Each link has triple-click select (no clipboard copy button)
- [ ] Clear instruction: "Triple-click to select, then Ctrl+C to copy"
- [ ] QR code displays for each link (optional print-friendly view)
- [ ] Modal stays open until instructor closes it
- [ ] Links are permanent and immediately active

#### Story 8: View Quiz Analytics
**As an** instructor,
**I want** to see analytics on student quiz performance (enrollment, avg score, pass rate),
**so that** I can assess content effectiveness and identify areas for improvement.

**Acceptance Criteria:**
- [ ] Analytics button visible on each quiz card
- [ ] Clicking opens analytics page with:
  - Quiz title and code
  - Total students who attempted
  - Average score (%)
  - Pass rate (% of students passing)
  - Completion rate (% who submitted)
  - Timeline graph: attempts over past 30 days
- [ ] Top performing question (highest pass rate)
- [ ] Most challenging question (lowest pass rate)
- [ ] Mode breakdown (how many attempted Practice vs Mock vs Game)
- [ ] Export button to download CSV of all attempts
- [ ] Back button returns to dashboard

---

### STUDENT USER STORIES (7 stories)

#### Story 1: View My Purchased Quizzes
**As a** student,
**I want** to see all quizzes available in courses I've purchased,
**so that** I can easily find and take assessments.

**Acceptance Criteria:**
- [ ] After login, student dashboard shows "My Quizzes" section
- [ ] Grid displays all quizzes from courses student has purchased access to
- [ ] Each card shows: Quiz Title, Course Name, Question Count, Status Badge
- [ ] Status badge indicates: Not Started (gray), In Progress (yellow), Completed (green)
- [ ] Progress bar shows completion (e.g., "2 of 5 attempts completed")
- [ ] Search bar filters quizzes by title
- [ ] Filter by status (All, Not Started, In Progress, Completed)
- [ ] Sort options: Date Added, Title, Progress
- [ ] Empty state: "You haven't purchased any courses yet" with course catalog link

#### Story 2: Resume Quiz
**As a** student,
**I want** to resume a quiz I started but didn't finish,
**so that** I don't lose progress and can complete at my own pace.

**Acceptance Criteria:**
- [ ] Quiz card for in-progress quiz shows "Resume Quiz" button (prominent, teal color)
- [ ] Clicking navigates to quiz player with previous answers pre-populated
- [ ] Quiz player shows: Current question number (e.g., "Question 3 of 10")
- [ ] Previous answers show as selected (visually highlighted)
- [ ] Timer continues from where it left off (if timed quiz)
- [ ] Student can modify previous answers
- [ ] Submit button saves progress and returns to dashboard

#### Story 3: Take New Quiz
**As a** student,
**I want** to start a fresh quiz attempt without carrying over previous answers,
**so that** I can track improvement and try different strategies.

**Acceptance Criteria:**
- [ ] Quiz card shows "Take Quiz" button for not-started quizzes
- [ ] Clicking navigates to quiz mode selection: Practice / Mock Test / Game
- [ ] After selecting mode, new quiz instance starts with blank answers
- [ ] Previous attempts are not visible or selectable during this attempt
- [ ] Student completes quiz and submits
- [ ] Results show score and comparison to previous best score (if applicable)

#### Story 4: Track Progress & Score History
**As a** student,
**I want** to see my completion percentage and previous scores for each quiz,
**so that** I can track my learning progress over time.

**Acceptance Criteria:**
- [ ] Student dashboard includes "Progress Tracker" section (separate from quiz grid)
- [ ] Shows per-quiz breakdown:
  - Quiz Title
  - Completion % (e.g., "60% — 3 of 5 attempts completed")
  - Progress bar
  - Best score achieved
  - Latest score
  - Date of latest attempt
- [ ] Clicking a quiz expands to show score history timeline:
  - Attempt 1: 65% on 2026-08-20
  - Attempt 2: 72% on 2026-08-22
  - Attempt 3: 78% on 2026-08-26
- [ ] Trend indicator (↑ improving, → stable, ↓ declining)
- [ ] "Reset Progress" button (requires confirmation) clears attempt history

#### Story 5: Bookmark Questions for Review
**As a** student,
**I want** to mark specific quiz questions for later review,
**so that** I can focus on difficult topics and study more effectively.

**Acceptance Criteria:**
- [ ] During quiz, each question displays star icon (☆ outline = not bookmarked, ★ filled = bookmarked)
- [ ] Clicking star toggles bookmark
- [ ] Bookmarks persist even after quiz is submitted
- [ ] Dashboard includes "Bookmarked Questions" section
- [ ] Shows all bookmarked questions with:
  - Quiz title
  - Question text
  - Student's previous answer
  - Correct answer
  - Explanation (if available)
- [ ] Filter bookmarks by quiz
- [ ] Search bookmarks by question text
- [ ] "Clear Bookmark" button removes from list

#### Story 6: View Certificate
**As a** student,
**I want** to download and view my course completion certificate,
**so that** I can share my achievement with employers or peers.

**Acceptance Criteria:**
- [ ] Student dashboard shows "Certificates" section
- [ ] List displays certificates earned (only for fully completed courses)
- [ ] Each certificate card shows:
  - Course name
  - Completion date
  - "Download PDF" button
  - "Share" button (LinkedIn, email, social media)
- [ ] Clicking "Download PDF" generates PDF with:
  - DailyAgile logo and branding
  - Student name
  - Course name
  - Completion date
  - Unique certificate ID
  - Instructor signature (digital)
- [ ] "Share" button opens social share dialog with pre-filled text

#### Story 7: Manage Learning Preferences
**As a** student,
**I want** to configure my learning settings (quiz mode default, notifications, reminders),
**so that** I can optimize my learning experience.

**Acceptance Criteria:**
- [ ] Settings section accessible from dashboard menu or profile dropdown
- [ ] Settings include:
  - Preferred quiz mode (Practice / Mock / Game) — sets as default when taking quiz
  - Enable/disable quiz completion notifications
  - Enable/disable weekly progress email digest
  - Quiz timer preference (show timer, hide timer, sound alert when time low)
  - Dark mode toggle
- [ ] Each setting saves immediately with "Saved" confirmation
- [ ] Settings persist across sessions and devices

---

### PUBLIC USER STORIES (7 stories)

#### Story 1: Enter Instructor Code
**As a** public user (with no login),
**I want** to enter an instructor's 8-digit code to access their quizzes,
**so that** I can take instructor-shared assessments without creating an account.

**Acceptance Criteria:**
- [ ] Public dashboard displays prominent "Enter Instructor Code" section
- [ ] Shows large input field with placeholder: "8-digit code"
- [ ] Code validation: Must be exactly 8 digits, numeric only
- [ ] Clicking "Submit" or pressing Enter validates code
- [ ] If valid: Shows instructor's quizzes grid
- [ ] If invalid: Shows error message "Code not found. Please check and try again."
- [ ] Option to save code in browser for return visits: "Save code for next time?"
- [ ] Clear/change code button appears after code is entered
- [ ] Code input remains visible at top of page after loading quizzes

#### Story 2: Browse Public Quizzes (No Code Required)
**As a** public user,
**I want** to browse all publicly available quizzes without entering an instructor code,
**so that** I can discover free assessments and learning content.

**Acceptance Criteria:**
- [ ] Public dashboard displays "Browse Public Quizzes" section
- [ ] Grid shows all quizzes marked as "public" from all instructors
- [ ] Each card displays:
  - Quiz title
  - Instructor name
  - Topic/category
  - Question count
  - Difficulty level
  - Star rating (if available)
- [ ] Search bar filters by quiz title (real-time)
- [ ] Filter dropdowns for:
  - Topic (Biology, Chemistry, History, etc.)
  - Difficulty (Beginner, Intermediate, Advanced)
  - Question count (1-5, 6-10, 10+)
- [ ] Sort options: Most Popular, Newest, Highest Rated, Question Count
- [ ] Empty state: "No quizzes match your filters" with reset option

#### Story 3: View Quiz Preview Before Taking
**As a** public user,
**I want** to see quiz details (description, length, topics) before committing to take it,
**so that** I can choose appropriate assessments and manage my time.

**Acceptance Criteria:**
- [ ] Clicking quiz card opens preview modal with:
  - Quiz title
  - Description/summary
  - Instructor name and link to their profile
  - Number of questions
  - Estimated time (e.g., "15 minutes")
  - Difficulty level
  - Topics covered (tags)
  - Average rating and number of reviews (if available)
  - "Take Quiz" button (primary, orange)
  - "Back" button to return to browse
- [ ] Modal displays no quiz questions (preview only)
- [ ] Preview is fast (< 200ms load time)

#### Story 4: Take Quiz in Practice Mode (Public)
**As a** public user,
**I want** to take a quiz without time pressure in practice mode,
**so that** I can learn and check answers as I go.

**Acceptance Criteria:**
- [ ] "Take Quiz" clicks navigate to quiz player in Practice Mode
- [ ] Practice mode features:
  - No timer/countdown
  - "Show Answer" button visible after attempting each question
  - Feedback on correctness immediately shown (✓ Correct or ✗ Incorrect)
  - Explanation text displays for each question
  - "Next Question" button advances
  - Progress bar shows current question number
- [ ] User can review previous questions
- [ ] Submit button at end captures final score
- [ ] Results page shows:
  - Score and percentage
  - Questions attempted
  - Correct/incorrect breakdown
  - Option to retake quiz or return to quiz list

#### Story 5: Filter & Search Public Quizzes
**As a** public user,
**I want** to filter quizzes by topic, difficulty, and search by keyword,
**so that** I can quickly find relevant assessments for my learning goals.

**Acceptance Criteria:**
- [ ] Search bar available on public quiz browse page
- [ ] Search queries include: Quiz title, description, topic/tags
- [ ] Typing shows live results (debounced, < 300ms latency)
- [ ] Filter sidebar includes:
  - Topic dropdown (multi-select: Biology, Chemistry, History, Language, Math, Science, Technology)
  - Difficulty radio buttons (Beginner, Intermediate, Advanced)
  - Question count slider (1-100+)
  - Newest first / Most popular / Highest rated sort
- [ ] Selected filters show as tags (removable with X)
- [ ] "Clear Filters" button resets all
- [ ] Filter results update instantly
- [ ] Results show "X results found" counter

#### Story 6: View Results & Explanations
**As a** public user,
**I want** to see detailed results after taking a quiz, including explanations for missed questions,
**so that** I can learn from mistakes and improve.

**Acceptance Criteria:**
- [ ] After quiz submission, results page displays:
  - Overall score (percentage and points)
  - Pass/fail status (e.g., "Passed: 75% (15/20)")
  - Questions breakdown: Correct (green), Incorrect (red), Skipped (gray)
- [ ] Expandable results section shows each question:
  - Question text
  - Student's answer (highlighted if incorrect)
  - Correct answer
  - Explanation text (1-2 sentences)
  - Mark for review button
- [ ] Comparison to other attempts (if available): "Your best: 85%, This attempt: 75%"
- [ ] Options: "Retake Quiz", "Browse More Quizzes", "Share Score" (optional)

#### Story 7: Save Code for Return Visits (Browser Persistence)
**As a** public user,
**I want** to save an instructor code so I don't have to re-enter it on my next visit,
**so that** I can quickly access instructor-shared quizzes without friction.

**Acceptance Criteria:**
- [ ] After entering valid 8-digit code, prompt asks: "Save this code for next time?"
- [ ] "Yes" button stores code in browser localStorage
- [ ] On next visit to `/quizzes`, if localStorage contains saved code:
  - Show saved code in header with "Edit Code" option
  - Display that instructor's quizzes automatically (no re-entry needed)
  - Show "Change Code" link to clear and enter different code
- [ ] "Clear Code" button removes from localStorage
- [ ] Code persists for 30 days (or until user clears browser data)
- [ ] Does not require any account creation

---

## 🔍 PART 2: USER TYPE DETECTION LOGIC

### Detection Rules (Decision Tree)

```
START: User arrives at /quizzes
│
├─ Is user authenticated? (Check JWT token in localStorage/cookies)
│  │
│  ├─ YES → Check user role
│  │  │
│  │  ├─ role = "instructor" → SHOW INSTRUCTOR DASHBOARD
│  │  │
│  │  └─ role = "student" → Check purchase history
│  │     │
│  │     ├─ Has purchased quizzes/courses → SHOW STUDENT DASHBOARD
│  │     │
│  │     └─ No purchases → SHOW PUBLIC DASHBOARD (invite to purchase)
│  │
│  └─ NO → Check instructor code in localStorage
│     │
│     ├─ Valid code exists → SHOW PUBLIC DASHBOARD (with code pre-filled)
│     │
│     └─ No code → SHOW PUBLIC DASHBOARD (empty code input)
```

### Detailed Detection Implementation

#### 1. Instructor Detection
**Check: User is authenticated + role === "instructor"**

```
Conditions:
- JWT token exists and is valid (not expired)
- User record in database has role = "instructor"
- User is NOT a student (instructor ≠ student in this system)

Action:
- Load all quizzes owned by this instructor (query: WHERE instructor_id = user.id)
- Show InstructorDashboard component
- Display: Create Quiz, Manage Quizzes, Analytics, Settings

Edge Cases:
- Expired JWT: Redirect to login, default to public dashboard
- Instructor with 0 quizzes: Show empty state with "Create Your First Quiz" CTA
- Permission error (403): Show error "You don't have permission to access instructor features"
```

#### 2. Student Detection
**Check: User is authenticated + role === "student" + has purchased quizzes**

```
Conditions:
- JWT token exists and is valid
- User record in database has role = "student"
- User has at least one course purchase OR quiz access granted

Actions to Verify Student Access:
- Query Supabase progress table: WHERE student_id = user.id AND status = "enrolled"
- Query orders table: WHERE customer_id = user.id AND status = "completed"
- Query quiz_access table: WHERE student_id = user.id (if direct quiz grant)

Action:
- Load all quizzes from courses where student_id has enrollment
- Show StudentDashboard component
- Display: My Quizzes, Progress Tracker, Bookmarked Questions, Settings

Edge Cases:
- Student with 0 purchases: Show empty state "You haven't purchased any courses yet" + "Browse Courses" link
- Student with purchases but no quizzes in courses: Show "No quizzes available in your courses yet"
- Access revoked (e.g., license expired): Show error "Your access to this course has expired"
- Multiple courses with same quiz: Show quiz only once, merged progress
```

#### 3. Public User Detection (Fallback)
**Check: No auth OR no purchases OR explicitly entered instructor code**

```
Conditions:
- User is NOT authenticated, OR
- User is authenticated but has no purchases, OR
- User has explicit instructor code in localStorage/URL params

Actions:
- If code in localStorage: Pre-fill instructor code input, load that instructor's quizzes
- If code in URL params (?code=XXXXXXXX): Validate and load quizzes
- Otherwise: Show empty code input + browse public quizzes section

Action:
- Show PublicDashboard component
- Display: Enter Instructor Code input, Browse Public Quizzes grid
- Allow code entry, public quiz browsing, quiz taking (no login required)

Edge Cases:
- Invalid code entered: Show error "Code not found" + retry input
- Code is valid but instructor deleted all quizzes: Show "This instructor has no available quizzes"
- Public quizzes disabled by instructor: Show only public quizzes (system-wide, not instructor-specific)
- Browser data cleared: Stored code disappears, show empty input
```

### Edge Cases & Error Handling

| Scenario | Detection Result | Action |
|----------|------------------|--------|
| JWT expired, but student logged in | No auth + check localStorage | Redirect to login, default to public |
| User role = "admin" | Not instructor, not student | Show error (admin route not applicable) |
| Instructor viewing another instructor's code | Authenticated as instructor | Show error: "Use your own code to view dashboard" |
| Student trying to access admin features | Authenticated as student | Show error 403: "Students don't have access" |
| Network failure loading user profile | Auth check fails | Fallback to public dashboard, show "Connection error, try again" |
| User is instructor + student (dual role) | Check role order: instructor > student | Show instructor dashboard (instructor access takes priority) |
| Quiz archived/deleted, but student has access | Load from database | Show archived indicator: "This quiz is no longer available" |
| Public quiz visibility toggled off | Query public flag in database | Remove from browse grid, show: "This quiz is no longer public" |

### Implementation Location

**File:** `/openMAIC/lib/quiz-navigation/user-type-detector.ts`

```typescript
async function detectUserType(): Promise<"instructor" | "student" | "public"> {
  const auth = await getAuthUser(); // JWT check
  
  if (!auth?.id) {
    return "public"; // No auth = public user
  }
  
  const user = await getUserProfile(auth.id);
  
  if (user.role === "instructor") {
    return "instructor";
  }
  
  if (user.role === "student") {
    const hasPurchases = await checkStudentPurchases(auth.id);
    if (hasPurchases) {
      return "student";
    }
    return "public"; // Student but no purchases
  }
  
  return "public"; // Fallback
}
```

---

## 🔄 PART 3: NAVIGATION FLOWS

### FLOW 1: Instructor Quiz Creation Path

```
START: Instructor lands at /quizzes
  ↓
[Detect: role="instructor"] → Show Instructor Dashboard
  ↓
Instructor clicks "Create New Quiz"
  ↓
Open modal: Choose Creation Method
  ├─ Manual Entry
  ├─ CSV Upload
  └─ AI Generation
  ↓
[IF Manual Entry]
  ↓
  Form: Quiz Title → Description → Add Questions (4 options + correct answer)
  ↓
  Show progress: "Question 2 of 5"
  ↓
  Save button
  ↓
  ✓ Quiz created, 8-digit code assigned (e.g., 12AB34CD)
  ↓
[IF CSV Upload]
  ↓
  Upload CSV file
  ↓
  Validate: Check columns, data format
  ↓
  Load valid rows, show errors for invalid
  ↓
  Save button
  ↓
  ✓ Quiz created with imported questions
  ↓
[IF AI Generation]
  ↓
  Form: Topic → Difficulty → Number of Questions
  ↓
  Click "Generate"
  ↓
  Claude API generates questions (show loading state)
  ↓
  Show generated questions in editable text area
  ↓
  Instructor can modify or regenerate
  ↓
  Save button
  ↓
  ✓ Quiz created with AI content
  ↓
Confirmation page shows:
  ├─ Quiz title
  ├─ 8-digit code (large, teal highlight)
  ├─ Share button with 3 mode links
  └─ "Return to Dashboard" link
  ↓
Click "Return to Dashboard"
  ↓
Quiz appears in dashboard grid with "Draft" badge
  ↓
END

ERROR PATHS:
├─ Auth expired → Redirect to login
├─ CSV invalid format → Show specific errors, allow retry
├─ AI API error → Show error message, "Try Again" button
└─ Network error → Show "Connection failed", retry option
```

### FLOW 2: Student Quiz Taking Path

```
START: Student lands at /quizzes after login
  ↓
[Detect: role="student" + has purchases] → Show Student Dashboard
  ↓
Dashboard displays:
  ├─ My Quizzes (grid of course quizzes)
  ├─ Progress Tracker
  ├─ Bookmarked Questions
  └─ Settings
  ↓
Student clicks quiz card
  ↓
[IF Quiz already started (In Progress)]
  ↓
  Quiz card shows "Resume Quiz" button
  ↓
  Click "Resume Quiz"
  ↓
  Navigate to quiz player with previous answers pre-populated
  ↓
  Student continues from Question N (where they left off)
  ↓
[IF Quiz not started (Not Started)]
  ↓
  Quiz card shows "Take Quiz" button
  ↓
  Click "Take Quiz"
  ↓
  Mode selection modal:
    ├─ Practice Mode (no timer, show answers)
    ├─ Mock Test (timer, no answers until submission)
    └─ Game Mode (timer, live leaderboard)
  ↓
  Select mode
  ↓
  Quiz player starts with blank answers, first question visible
  ↓
Student takes quiz:
  ├─ Answer each question (multiple choice, drag-and-drop, etc.)
  ├─ Optional: Mark question for bookmark (star icon)
  ├─ Optional: Skip question or save and come back
  ├─ Progress bar shows current question
  └─ Timer visible (if applicable)
  ↓
Click "Submit Quiz" or complete all questions
  ↓
Quiz submission processed
  ↓
✓ Results page displays:
  ├─ Score and percentage
  ├─ Questions breakdown (correct, incorrect, skipped)
  ├─ Detailed review (each question + explanation)
  ├─ Comparison to previous best score
  └─ Buttons: "Review Answers", "Retake Quiz", "Return to Dashboard"
  ↓
Click "Return to Dashboard"
  ↓
Quiz card now shows "Completed" badge with score
  ↓
Progress Tracker updates with latest score + attempt history
  ↓
END

ERROR PATHS:
├─ Network error mid-quiz → Auto-save progress, show "Connection lost, reconnecting..."
├─ Auth expires during quiz → Save answers, prompt to re-login
├─ Quiz deleted by instructor → Show "This quiz is no longer available"
├─ Access revoked (license expired) → Show "Your access to this quiz has expired"
└─ Timeout (30+ min inactive) → Warn student, option to resume or start over
```

### FLOW 3: Public User Instructor Code Entry Path

```
START: Public user (no login) visits /quizzes
  ↓
[Detect: no auth] → Show Public Dashboard
  ↓
Public Dashboard displays:
  ├─ Instructor Code input (prominent)
  ├─ Browse Public Quizzes section
  └─ Sign Up / Login link
  ↓
[Path A: Enter Instructor Code]
  ↓
  User types 8-digit code (e.g., 12AB34CD)
  ↓
  Validation: Must be exactly 8 digits, numeric only
  ├─ Invalid format → Show inline error: "Code must be 8 digits"
  ├─ Valid format, but not found → Show error: "Code not found. Check and try again."
  └─ Valid code found → Proceed
  ↓
  ✓ Code validated against database
  ↓
  Load instructor's quizzes via API (GET /api/quizzes?instructor_code=12AB34CD)
  ↓
  Display instructor's public quizzes in grid
  ↓
  Prompt: "Save this code for next time?"
    ├─ "Yes" → Store in localStorage
    └─ "No" → Skip
  ↓
  User can now:
    ├─ Click quiz to preview
    ├─ Take quiz (no account needed)
    ├─ Bookmark questions
    └─ View results + explanations
  ↓
  [After taking quiz or revisiting]
  ↓
  If code in localStorage:
    ├─ Show saved code in header: "Instructor Code: 12AB34CD [Change]"
    └─ Instructor's quizzes auto-load
  ↓
[Path B: Browse Public Quizzes (No Code)]
  ↓
  User ignores code input and scrolls to "Browse Public Quizzes"
  ↓
  Grid shows all public quizzes (from all instructors)
  ↓
  User can search, filter by topic/difficulty
  ↓
  Click quiz preview
  ↓
  See quiz description, question count, etc.
  ↓
  Click "Take Quiz"
  ↓
  Mode selection (Practice/Mock/Game)
  ↓
  Take quiz and view results
  ↓
Optional: Prompt to create account after 2nd quiz attempt:
  "Create a free account to save your progress and track performance"
  ├─ "Create Account" → Redirect to signup
  └─ "Continue as Guest" → Allow offline progress (not saved)
  ↓
END

ERROR PATHS:
├─ Invalid code entered → Show error, allow retry
├─ Code valid but instructor has no quizzes → Show "No quizzes available"
├─ Public quizzes unavailable → Show empty grid, promote code entry
├─ Network error → Show "Connection failed", retry button
├─ Browser localStorage disabled → Show message, allow manual code re-entry each visit
└─ Browser data cleared → Stored code disappears, user must re-enter
```

### FLOW 4: Public User Browse Public Quizzes Path

```
START: Public user at /quizzes (no code entered)
  ↓
Browse Public Quizzes section visible
  ↓
Grid displays all public quizzes (paginated, 12 per page)
  ↓
User can:
  ├─ Search by title (real-time filter)
  ├─ Filter by topic (Biology, Chemistry, etc.)
  ├─ Filter by difficulty (Beginner/Intermediate/Advanced)
  ├─ Filter by question count
  └─ Sort (Most Popular, Newest, Highest Rated)
  ↓
User clicks quiz card
  ↓
Preview modal opens:
  ├─ Quiz title & description
  ├─ Question count & estimated time
  ├─ Difficulty level
  ├─ Topics/tags
  ├─ Instructor name
  └─ "Take Quiz" button
  ↓
Click "Take Quiz"
  ↓
Mode selection:
  ├─ Practice Mode (recommended for public users)
  ├─ Mock Test Mode
  └─ Game Mode
  ↓
Quiz player loads
  ↓
User completes quiz
  ↓
Results page:
  ├─ Score & percentage
  ├─ Question breakdown
  ├─ Explanations for each question
  ├─ "Retake Quiz" button
  ├─ "Browse More Quizzes" button
  └─ Optional: "Sign Up to Save Progress" prompt
  ↓
Click "Browse More Quizzes"
  ↓
Return to quiz grid
  ↓
END

ERROR PATHS:
├─ No public quizzes available → Show empty state with link to enter code
├─ Quiz made private after user bookmarked → Remove from browse, show message
├─ Network error loading quizzes → Show error, retry button
└─ Quiz player crash → Save progress, prompt to retry
```

---

## 🎯 PART 4: REQUIREMENTS SUMMARY

### MVP Scope (Included in v1.0)

**MUST HAVE:**
- [ ] User type detection (instructor/student/public)
- [ ] Instructor dashboard with Create, Manage, Share, Analytics
- [ ] Student dashboard with My Quizzes, Progress, Bookmarks
- [ ] Public dashboard with Code entry and Browse Public Quizzes
- [ ] Quiz code validation (8 digits, numeric only)
- [ ] Share links for 3 modes (Practice, Mock, Game)
- [ ] Responsive design (desktop, tablet, mobile)
- [ ] localStorage persistence for instructor code
- [ ] Navigation flows end-to-end (no 404 errors)
- [ ] DailyAgile branding (colors, fonts, spacing)

**SHOULD HAVE:**
- [ ] Quiz search and filtering
- [ ] Quiz creation via CSV upload
- [ ] Basic analytics (enrollment, avg score)
- [ ] Certificate download
- [ ] Dark mode toggle (in settings)
- [ ] Mobile hamburger menu

**NICE TO HAVE (Phase 2):**
- [ ] AI quiz generation (requires Claude API integration)
- [ ] Advanced analytics (question-level insights, heatmaps)
- [ ] Quiz scheduling (release on specific date)
- [ ] Class roster management (instructors add students by email)
- [ ] Quiz branching logic (questions based on previous answers)
- [ ] Video question support (video + multiple choice)
- [ ] Leaderboard persistence (track students across attempts)

### Phase 2 Deferred (Do NOT include in v1.0)
- AI quiz generation endpoint
- Advanced instructor analytics dashboard
- Quiz scheduling calendar
- Class roster upload
- Adaptive quiz paths
- Video question embedding
- Leaderboard ranking system

---

## 🔐 SEO/GEO OPTIMIZATION CRITERIA

### Route & Crawlability
- ✅ Route is `/quizzes` (not `/#quizzes`) — crawlable by search engines
- ✅ Page is server-rendered (not client-only JavaScript) — headless browser can index
- ✅ Meta tags: title, description, canonical URL set per page variant
- ✅ Open Graph tags for social sharing
- ✅ robots.txt allows `/quizzes` (verified in config)
- ✅ Sitemap includes `/quizzes` entry

### Content Completeness
- ✅ Feature scope complete for MVP (not deferred) — maximizes keyword opportunities
- ✅ All 3 user journeys fully functional — supports diverse entry points
- ✅ Search keywords supported: "Take Quiz", "Create Quiz", "Free Quiz", "AI Quiz Generation"
- ✅ Instructor code discovery: Public code entry supports branded quiz sharing
- ✅ Public quiz browsing: All publicly available quizzes crawlable and indexed

### User Engagement & Signals
- ✅ Analytics tracking enabled: quiz views, clicks, conversions (for user testimonials + case studies)
- ✅ Engagement metrics: time-on-page, quiz completion rate, share rate (supports ranking factors)
- ✅ High-intent CTAs: "Take Quiz Now", "Create Quiz", "Browse Free Quizzes" (conversion-focused)
- ✅ Low bounce rate design: Clear value prop, immediate action path, mobile-optimized

### Code Persistence & Repeat Traffic
- ✅ Instructor code stored in localStorage (supports repeat visitors)
- ✅ URL persistence: `/quizzes?code=XXXXXXXX` allows shareable instructor links
- ✅ Recent quizzes tracked in browser (supports return traffic patterns)
- ✅ Student progress persists across sessions (increases session length, reduces churn)

### Technical SEO
- ✅ Responsive design: mobile-first, Core Web Vitals optimized
- ✅ Page load time < 2 seconds (Core Web Vitals ranking factor)
- ✅ No render-blocking resources (CSS/JS async or deferred)
- ✅ Images optimized: WebP, lazy loading, descriptive alt text
- ✅ Breadcrumb schema (JSON-LD) for rich SERP snippets
- ✅ Organization schema: DailyAgile branding visible to Google Knowledge Graph
- ✅ H1-H3 hierarchy: page title → sections → subsections
- ✅ Internal linking: quiz cards → quiz player (distributes page authority)

### Geographic Targeting (If Applicable)
- ✅ Regional quiz variants supported (future: language, local content)
- ✅ hreflang tags for multi-regional content (future)
- ✅ Geolocation-aware CTAs (future)

---

## 📋 PART 5: HANDOFF SUMMARY

### What Design Needs from Product

**User Stories** (15+ complete stories with acceptance criteria)
- 8 Instructor stories covering: create, manage, edit, delete, share, analytics
- 7 Student stories covering: browse, resume, take, progress, bookmarks, certificates, settings
- 7 Public user stories covering: code entry, public browse, preview, take, filter, results, persistence

**Feature Scope**
- MVP features clearly marked (include in v1.0)
- Phase 2 deferred features clearly marked (exclude from v1.0)
- No ambiguity on what's building vs. what's delayed

**User Flows**
- 4 main navigation paths documented (instructor create, student take, public code entry, public browse)
- Error scenarios identified for each flow
- Edge cases documented (network failure, auth expiry, deleted quiz, etc.)

**Constraints & Assumptions**
- Route: `/quizzes` (not `/#quizzes`)
- Auth method: JWT tokens in localStorage
- Database: Supabase (user, quiz, progress tables)
- Brand colors: Navy #1E3A5F, Teal #0891B2, Orange #EA580C
- Mobile breakpoints: <480px (mobile), 768px (tablet), 1920px (desktop)

---

### What Engineering Needs from Product

**User Type Detection Rules**
- Exact conditions: Check JWT → Check role → Check purchases → Fallback to public
- Edge cases: Expired JWT, dual role (instructor + student), missing user profile
- Fallback behavior: Default to public if unclear

**API Contracts**
- GET `/api/user` — Get authenticated user profile (role, instructor_id, student_id)
- GET `/api/quizzes/instructor` — List instructor's quizzes
- GET `/api/quizzes/student` — List student's purchased quizzes
- GET `/api/quizzes/public` — List all public quizzes (paginated)
- POST `/api/quizzes/validate-code` — Validate instructor code
- GET `/api/quizzes/:code/public` — Get quizzes for instructor code

**State Management**
- Instructor code: Store in localStorage under key `instructorCode`
- Current user type: Compute on page load, cache in React Context
- Quiz mode selection: Store in URL params (?mode=practice)

**localStorage Schema**
```javascript
localStorage.instructorCode = "12AB34CD"; // 8-digit string
localStorage.recentQuizzes = JSON.stringify([
  { quizId: 1, quizTitle: "Biology 101", lastAttempt: "2026-08-26" }
]); // For recent quiz tracking
```

**Error Handling**
- 404: Quiz not found → Show message, link to browse
- 403: Permission denied → Show message, redirect to appropriate dashboard
- Network error: Retry with exponential backoff
- Auth expired: Redirect to login, show "Your session has expired"

**Performance Requirements**
- Page load: < 2 seconds (including API calls)
- Search/filter: Debounced, < 300ms latency
- Quiz creation: Submit feedback within 500ms
- Code validation: < 200ms response

---

### What Design & Engineering Both Need from Product

**Definition of Done (Feature-Level)**
- ✅ All 15+ user stories accepted (PM final approval)
- ✅ 3 user navigation flows verified working
- ✅ All edge cases tested and handled
- ✅ SEO route `/quizzes` confirmed (not `/#quizzes`)
- ✅ Mobile breakpoints specified (480px, 768px, 1920px)
- ✅ DailyAgile brand palette provided (exact hex values)
- ✅ All 3 dashboards scoped (instructor, student, public — no partial implementations)

**No Ambiguity on:**
- Who can do what? (Instructor creates/edits/shares/analytics, Student takes/progresses/bookmarks, Public browses/takes)
- When do we show which dashboard? (Detection rules are clear)
- What happens if X fails? (Error paths documented)
- Is feature complete? (MVP scope locked, Phase 2 deferred)

---

## 📊 Success Criteria (PM Approval)

**This document is complete when:**
- [ ] 15+ user stories written in standard format (As a... I want... So that...)
- [ ] Acceptance criteria specific, testable, not vague (no "looks good", "user is happy")
- [ ] User type detection logic clear (decision tree, edge cases, fallbacks)
- [ ] 4 navigation flows documented (text + error paths)
- [ ] MVP scope locked (clear inclusion/deferral list)
- [ ] SEO criteria addressed (route, crawlability, content completeness, analytics)
- [ ] Handoff summary complete (what Design needs, what Engineering needs, what both need)
- [ ] Zero ambiguity on feature scope or implementation
- [ ] Product team can defend all decisions to Design/Engineering

---

**Document Version:** 1.0
**Last Updated:** 2026-08-26
**Status:** Ready for Design & Engineering Handoff
**Next Step:** Design creates wireframes (parallel execution starts)

