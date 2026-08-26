# Quiz Navigation Page — Definition of Readiness (2026-08-26)

## 🎯 Goal

Create a unified quiz navigation page at `http://localhost:3000/#quizzes` that intelligently routes three different user types to appropriate quiz experiences:

1. **Instructor** — Manage created quizzes (create, edit, delete, share, analytics)
2. **Student (Purchased)** — Access quizzes they've purchased in courses
3. **Public User (Instructor Code + Public Quizzes)** — Take free quizzes with instructor code OR browse publicly available quizzes

---

## 📐 UX Navigation Structure (What Will Be Built)

### User Type Detection

The page must detect user type based on:
- Auth status (logged in vs. anonymous)
- User role (instructor vs. student)
- Purchase history (quizzes purchased or not)
- Instructor code (if provided)

### Three Primary Navigation Paths

#### **Path 1: Instructor Dashboard**
**When:** User is authenticated + role = "instructor"

**Visible Options:**
1. **Create New Quiz**
   - Manual entry (questions typed in)
   - CSV upload (bulk from spreadsheet)
   - AI generation (Claude generates questions)

2. **Manage Quizzes**
   - Grid/list of all quizzes they've created
   - Show: Quiz code (8-digit), title, question count, create date, enrolled count
   - Actions: Edit, Share, View Analytics, Delete
   - Filter: By date, by status, search by title

3. **Share & Collect**
   - Show all quiz codes they've created
   - Quick copy links (Practice, Mock Test, Game Mode)
   - Enrollment tracking (how many students took each)
   - Basic analytics (avg score, completion rate)

4. **Settings**
   - Change password
   - 2FA management
   - Export quiz data

---

#### **Path 2: Student (Purchased) Dashboard**
**When:** User is authenticated + role = "student" + has purchased quizzes

**Visible Options:**
1. **My Quizzes** (from purchased courses)
   - Grid of purchased quizzes
   - Show: Quiz title, course, progress (X of Y complete), current score
   - Action: "Resume Quiz" or "Take Quiz"
   - Status badge: Not Started, In Progress, Completed

2. **Progress Tracker**
   - Completion % per quiz
   - Score history (timeline of attempts)
   - Certifications earned (if applicable)
   - Download certificate button

3. **Bookmarked Questions**
   - Questions marked for review
   - Note-taking capability
   - Filter by quiz/topic

4. **Settings**
   - Change password
   - Learning preferences
   - Email notifications

---

#### **Path 3: Public User (Instructor Code / Public Quizzes)**
**When:** User is anonymous OR has instructor code OR wants public quizzes

**Visible Options:**
1. **Enter Instructor Code**
   - Input field for 8-digit code
   - After entry: Shows quizzes from that instructor
   - Option to save code (localStorage) for return visits
   - Clear/change code button

2. **Browse Public Quizzes**
   - Grid of all publicly available quizzes (no code needed)
   - Show: Quiz title, topic, question count, difficulty, creator
   - Filter: By topic, difficulty, question count
   - Search by title
   - Action: "Take Quiz" button

3. **Recent Quizzes**
   - Show quizzes recently taken (tracked in browser)
   - "Resume" button to continue where left off

4. **About This Quiz**
   - Quiz description
   - Topic/category
   - Estimated time
   - Number of questions

---

## 🎨 Visual Design (UX Standards)

### Layout
- **Desktop:** 
  - Sticky header with logo, navigation breadcrumb, profile menu
  - Main content area with 3-column grid or sidebar + main
  - Search/filter bars prominent

- **Mobile:**
  - Hamburger menu for nav
  - Full-width cards
  - Stacked layout
  - Search/filter in drawer

### Color Scheme (DailyAgile Brand)
- Primary: Navy (#1E3A5F) — headers, navigation
- Accent: Teal (#0891B2) — links, highlights, CTAs
- Alert: Orange (#EA580C) — important actions, "New"
- Success: Green (#16a34a) — completed, passed
- Neutral: Gray (#64748B) — secondary text, disabled
- Light: (#F0F7FA) — backgrounds, card hover

### Typography
- Headers: Cambria Bold
- Body: Calibri or system sans-serif
- Code/data: Monospace

### Components
- **Card layout** for quiz items (title, metadata, action buttons)
- **Badges** for status (Not Started, In Progress, Completed, Published, Draft)
- **Progress bars** for completion tracking
- **Modal** for instructor code entry
- **Breadcrumbs** for navigation context
- **Sticky header** for top navigation
- **Responsive grid** (3 columns desktop, 2 tablet, 1 mobile)

---

## 🔄 Navigation Flows (Step-by-Step)

### Flow 1: Instructor Creates Quiz
```
#quizzes (landing) 
→ Detect: role=instructor 
→ Show instructor dashboard 
→ Click "Create New Quiz" 
→ Choose: Manual/CSV/AI 
→ Create quiz 
→ Get 8-digit code 
→ Show share options
→ Return to dashboard
```

### Flow 2: Student Takes Purchased Quiz
```
Login as student
→ #quizzes (landing) 
→ Detect: role=student, purchased quizzes exist 
→ Show "My Quizzes" 
→ Click quiz 
→ Choose mode: Practice/Mock/Game 
→ Take quiz 
→ Submit 
→ See results 
→ Download certificate (if passed)
→ Return to progress tracker
```

### Flow 3: Public User with Instructor Code
```
Anonymous or no login required
→ #quizzes (landing) 
→ Show "Enter Instructor Code" 
→ Type 8-digit code 
→ Load quizzes from that instructor 
→ Click "Take Quiz" 
→ Choose mode 
→ Take quiz 
→ See results 
→ Option to save code for later
```

### Flow 4: Public User Browsing Public Quizzes
```
No login, no code
→ #quizzes (landing) 
→ Show "Browse Public Quizzes" 
→ See filtered grid 
→ Click quiz 
→ See preview (description, length) 
→ Click "Take Quiz" 
→ Take quiz 
→ See results 
→ Prompt to create account (optional)
```

---

## 📋 Definition of Readiness — Success Criteria

### ✅ Functional Requirements

- [ ] **User Type Detection**
  - Correctly identifies user type (instructor/student/public)
  - Loads appropriate dashboard for each type
  - Handles logged-out users

- [ ] **Instructor Dashboard**
  - Create quiz (manual/CSV/AI) → working
  - List all created quizzes → displays with metadata
  - Edit quiz → opens edit page
  - Delete quiz → removes with confirmation
  - Share quiz → shows 3 mode links (Practice/Mock/Game)
  - Analytics → shows enrollment + avg score

- [ ] **Student Dashboard**
  - "My Quizzes" shows all purchased quizzes
  - Progress tracking shows % complete + score
  - "Resume Quiz" continues from last attempt
  - "Take Quiz" starts new attempt
  - Certificate download works (if applicable)

- [ ] **Public Dashboard**
  - Instructor code input field works
  - Code validation (8 digits numeric)
  - Shows instructor's quizzes after code entry
  - Browse public quizzes grid displays all public quizzes
  - Filters work (topic, difficulty, etc.)
  - Search by title works
  - "Take Quiz" button navigates to quiz player

- [ ] **Navigation**
  - All CTAs navigate to correct page
  - Breadcrumbs show current location
  - Back buttons work
  - Logo links to home
  - No 404 errors on any navigation

### ✅ UX/Design Requirements

- [ ] **Responsive Design**
  - Desktop: 3-column layout, optimized for 1920px+
  - Tablet: 2-column, optimized for 768-1024px
  - Mobile: 1-column, optimized for <768px
  - No horizontal scrolling on any device

- [ ] **Mobile-First**
  - Font sizes readable on <480px
  - Buttons/CTAs tappable (min 44x44px)
  - Cards stack vertically
  - Hamburger menu functional on <768px

- [ ] **Visual Hierarchy**
  - Primary action buttons orange (#EA580C)
  - Secondary action buttons teal (#0891B2)
  - Disabled buttons clearly grayed out
  - Status badges color-coded (green=done, yellow=in progress, gray=not started)

- [ ] **Branding**
  - DailyAgile colors applied consistently
  - Logo visible in header
  - Fonts: Cambria (headers), Calibri (body)
  - Spacing & padding consistent with design system

### ✅ Code Quality Requirements

- [ ] **No ESLint Errors**
  - Run: `npm run lint`
  - Result: 0 errors, 0 warnings

- [ ] **TypeScript Strict**
  - All components fully typed (no `any`)
  - Interfaces defined for data structures
  - Compile: `npx tsc --noEmit` passes

- [ ] **No Dead Code**
  - All imports used
  - No unused variables
  - No commented-out code blocks

- [ ] **Accessibility Basics**
  - Links have descriptive text (not "click here")
  - Buttons have visible focus states
  - Forms labeled properly
  - Color not sole indicator (use text + color)
  - Alt text on images

### ✅ Testing Requirements

- [ ] **Dev Server Verification**
  - Start: `npm run dev`
  - Navigate to: `http://localhost:3000/#quizzes`
  - Page loads (200 OK)
  - No console errors or warnings

- [ ] **User Type Detection Test**
  - Test as instructor → see instructor dashboard
  - Test as student (with purchases) → see student dashboard
  - Test as public user → see public dashboard
  - Test instructor code input → loads correct quizzes

- [ ] **Navigation Flow Test**
  - Create quiz flow: end-to-end working
  - Take quiz flow: end-to-end working
  - All CTAs click and navigate correctly
  - Breadcrumbs accurate

- [ ] **Mobile Testing**
  - Test on <480px (mobile portrait)
  - Test on <768px (tablet)
  - No horizontal scrolling
  - Hamburger menu opens/closes
  - Text readable

- [ ] **Browser Testing**
  - Chrome (latest)
  - Firefox (latest)
  - Safari (latest)
  - Mobile Safari (iOS)
  - Chrome Mobile (Android)

- [ ] **Performance**
  - Page load time < 2 seconds
  - No layout shift after load
  - Images optimized (no >500KB images)

### ✅ Documentation Requirements

- [ ] **Code Comments**
  - No multi-paragraph comments
  - Only "why" comments (not "what")
  - Explain non-obvious logic

- [ ] **Commit Message**
  - Describes changes clearly
  - References any bugs fixed
  - Includes testing proof (screenshots/URLs tested)

- [ ] **Inline Proof in Commit**
  - "Tested: /quizzes landing page, instructor dashboard, student dashboard, public quiz browser"
  - "Tested: instructor code entry + quiz load"
  - "Tested: mobile <480px, tablet <768px, desktop"
  - "Console: zero errors"

---

## ✅ Definition of Done (This Specific Feature)

Complete when:

1. ✅ All 4 functional categories above verified working
2. ✅ Responsive design tested on 3 breakpoints (mobile, tablet, desktop)
3. ✅ ESLint: 0 errors, TypeScript: full compile pass
4. ✅ Dev server running, no console errors, all links tested
5. ✅ User type detection working (instructor/student/public)
6. ✅ All navigation flows completed end-to-end
7. ✅ Mobile tappable zones, fonts readable
8. ✅ DailyAgile branding applied (colors, fonts, spacing)
9. ✅ Commit message includes test proof
10. ✅ Code reviewed (no dead code, proper imports, clean logic)

---

## 📊 Acceptance Test Checklist (For User Verification)

- [ ] As instructor: Can I create a quiz and share it? → Link shows 8-digit code + 3 modes
- [ ] As instructor: Can I see all my quizzes with analytics? → Dashboard shows enrollment + score
- [ ] As student: Can I take a quiz I purchased? → "My Quizzes" shows course quizzes
- [ ] As student: Can I track progress? → Progress bar shows % complete
- [ ] As public user: Can I enter an instructor code? → Shows that instructor's quizzes
- [ ] As public user: Can I browse public quizzes without code? → Browse grid shows all public quizzes
- [ ] On mobile: Can I tap all buttons and read all text? → No scrolling issues, readable fonts
- [ ] On desktop: Is design clean and brand-compliant? → Colors/fonts match spec

---

## 🎯 What "Readiness" Means

This feature is **ready** when:
- ✅ Code is clean (ESLint/TS pass)
- ✅ All 3 user types see correct dashboards
- ✅ All navigation flows work end-to-end
- ✅ Mobile + desktop both look polished
- ✅ No console errors on any flow
- ✅ Commit includes test proof

This feature is **not ready** if:
- ❌ ESLint/TS has warnings
- ❌ Any link returns 404
- ❌ Mobile has horizontal scrolling
- ❌ User type detection fails
- ❌ Console shows errors
- ❌ Only "curled" (not actually tested in browser)

---

## 🤖 Parallel Agent Execution Model

### Work Breakdown Structure (WBS)

Three agents work **in parallel**:

```
┌─────────────────────────────────────────────────────────────┐
│  QUIZ NAVIGATION FEATURE                                    │
│  Timeline: 4.5 hours (parallel execution)                   │
└─────────────────────────────────────────────────────────────┘
       ↙                    ↓                      ↖
  ┌────────────┐      ┌────────────┐      ┌────────────┐
  │  PRODUCT   │      │   DESIGN   │      │ ENGINEERING│
  │  (PM)      │      │  (UX/UI)   │      │   (DEV)    │
  └────────────┘      └────────────┘      └────────────┘
   1.5 hours          1.5 hours           2 hours
```

---

## 📋 PRODUCT STREAM (PM Agent)

**Responsibility:** User stories, acceptance criteria, requirements clarity

### Tasks
1. **User Story Definition** (30 min)
   - [ ] Write user stories for instructor dashboard (5+ stories)
   - [ ] Write user stories for student dashboard (5+ stories)
   - [ ] Write user stories for public dashboard (5+ stories)
   - [ ] Format: "As a [role], I want [action], so that [outcome]"
   - [ ] Include acceptance criteria for each story (specific, testable)

2. **User Type Detection Logic** (20 min)
   - [ ] Define detection rules: How to identify instructor vs student vs public
   - [ ] Document auth checks needed (JWT, auth guard, role check)
   - [ ] Define fallback behavior (if user type unclear, default to public)
   - [ ] Document edge cases (logged out, expired token, role mismatch)

3. **Navigation Flows** (20 min)
   - [ ] Flowchart: Instructor quiz creation path (start to share)
   - [ ] Flowchart: Student quiz taking path (start to results)
   - [ ] Flowchart: Public user instructor code entry (input to quiz list)
   - [ ] Document error scenarios for each flow
   - [ ] Define behavior on back button, page refresh, timeout

4. **Requirements Document** (20 min)
   - [ ] Consolidate all user stories + flows
   - [ ] Define MVP scope vs Phase 2 features
   - [ ] List assumptions and constraints
   - [ ] Create: `QUIZ_NAVIGATION_REQUIREMENTS.md`

### Product DOD Checklist
- [ ] User stories written in proper format (As a... I want... So that...)
- [ ] Acceptance criteria specific and testable (not vague)
- [ ] All 3 user paths documented with flowcharts
- [ ] Edge cases identified (404, timeout, auth failure, invalid code)
- [ ] Requirements document completed and shared
- [ ] No ambiguity in scope or features
- [ ] PM has final approval before engineering starts

### Product Deliverables
- `QUIZ_NAVIGATION_REQUIREMENTS.md` — User stories + acceptance criteria
- Flowcharts (3 main paths) — Image or ASCII format
- Edge case matrix — What happens in error scenarios
- Feature scope document — MVP vs deferred features

---

## 🎨 DESIGN STREAM (Design Agent)

**Responsibility:** UX layout, wireframes, visual design, mobile responsiveness

### Tasks
1. **Wireframes & Layout** (30 min)
   - [ ] Desktop wireframe: Instructor dashboard (3-column: sidebar nav + main content)
   - [ ] Desktop wireframe: Student dashboard (2-column: left nav + quizzes grid)
   - [ ] Desktop wireframe: Public dashboard (instructor code modal + quiz grid)
   - [ ] Mobile wireframe: All 3 dashboards at <480px (hamburger menu)
   - [ ] Tablet wireframe: All 3 dashboards at <768px
   - [ ] Include all sections: header, nav, main content, footer

2. **Visual Design System** (30 min)
   - [ ] Color palette: Navy #1E3A5F, Teal #0891B2, Orange #EA580C, Light #F0F7FA
   - [ ] Typography: Cambria (headers: 24px, 20px, 18px), Calibri (body: 16px, 14px, 12px)
   - [ ] Component library:
     - Quiz Card (title, metadata, status badge, action buttons)
     - Button states (default, hover, active, disabled, loading)
     - Form elements (input, label, error message, validation icon)
     - Modal (instructor code entry, confirm dialog)
     - Progress bar (quiz completion %)
     - Breadcrumb navigation
     - Status badges (Not Started, In Progress, Completed, Published, Draft)
   - [ ] Spacing grid: 8px baseline (margins, padding in 8px increments)
   - [ ] Responsive breakpoints: 480px (mobile), 768px (tablet), 1920px (desktop)

3. **Component Specifications** (20 min)
   - [ ] Quiz Card: dimensions, padding, shadows, hover effects
   - [ ] Status Badge: colors per status, icon positioning, size
   - [ ] Button: primary (orange), secondary (teal), danger (red), sizes (sm/md/lg)
   - [ ] Button states: default, hover, active, disabled, loading (with spinner)
   - [ ] Form validation: error message color (#dc2626), icon, helper text positioning
   - [ ] Mobile tap zones: all interactive elements ≥ 44x44px
   - [ ] Hamburger menu: 24px icon, drawer width (80% viewport width), swipe animation

4. **Design Document** (10 min)
   - [ ] Figma/Miro link or markdown design spec
   - [ ] All wireframes embedded (9 wireframes minimum)
   - [ ] All component specs documented
   - [ ] Color contrast verified (WCAG AA: 4.5:1 for text, 3:1 for UI)
   - [ ] Font sizes readable on mobile (min 16px for body text)
   - [ ] Accessibility notes (focus states, color + text indicators)

### Design DOD Checklist
- [ ] All 3 dashboards wireframed (desktop, tablet, mobile = 9 minimum)
- [ ] Visual design system complete (all colors, fonts, spacing documented)
- [ ] All components specified with states (button, card, form, modal, badge)
- [ ] Mobile-first responsive design verified at all breakpoints
- [ ] WCAG AA contrast ratio verified on all text (4.5:1 minimum)
- [ ] Font sizes readable on mobile (<480px)
- [ ] Tap zones ≥ 44x44px on mobile
- [ ] Design document shared with engineering (clear, no ambiguity)
- [ ] Design has final say on visual treatment

### Design Deliverables
- Wireframes: 9 (3 dashboards × 3 breakpoints)
- `QUIZ_NAVIGATION_DESIGN_SYSTEM.md` — Colors, fonts, spacing, responsive grid
- Component specifications: buttons, cards, forms, modals, badges
- Accessibility checklist: contrast, focus states, color indicators
- Design hand-off package (Figma link or high-res PNG exports)

---

## 💻 ENGINEERING STREAM (Dev Agent)

**Responsibility:** Code architecture, component implementation, routing, testing, DOD verification

### Tasks
1. **Architecture & Setup** (20 min)
   - [ ] Decide: Is #quizzes a route (`/quizzes`) or a section on home page with scroll anchor?
   - [ ] Plan component hierarchy: Page → Dashboard selector → InstructorDashboard | StudentDashboard | PublicDashboard → QuizCard
   - [ ] Design user type detection: Where to check auth? (middleware vs component?)
   - [ ] Plan state management: How to track selected instructor code? (localStorage or URL?)
   - [ ] List API calls needed: Get user profile? Get quizzes? Get analytics?
   - [ ] Plan error handling: What if API fails? What if user type unclear?

2. **Component Implementation** (70 min)
   - [ ] Create: `app/quizzes/page.tsx` (main quiz navigation page)
   - [ ] Create: `components/quiz-navigation/InstructorDashboard.tsx`
   - [ ] Create: `components/quiz-navigation/StudentDashboard.tsx`
   - [ ] Create: `components/quiz-navigation/PublicDashboard.tsx`
   - [ ] Create: `components/quiz-navigation/QuizCard.tsx` (reusable)
   - [ ] Create: `components/quiz-navigation/InstructorCodeModal.tsx`
   - [ ] Create: `lib/quiz-navigation/types.ts` (TypeScript interfaces)
   - [ ] Create: `lib/quiz-navigation/user-type-detector.ts` (auth logic)
   - [ ] Implement: All navigation links + CTAs (Create, Edit, Delete, Share, Resume, Take)
   - [ ] Implement: Instructor code validation (8 digits, numeric only)
   - [ ] Implement: localStorage persistence for instructor code (if needed)

3. **Styling & Responsiveness** (30 min)
   - [ ] Apply DailyAgile colors (exact hex values from design spec)
   - [ ] Responsive CSS: Desktop (1920px), Tablet (768px), Mobile (<480px)
   - [ ] Flexbox/grid layouts (no hardcoded widths)
   - [ ] No horizontal scrolling on any breakpoint
   - [ ] Hamburger menu for mobile <768px (toggle state)
   - [ ] Touch-friendly tap zones: all buttons/links ≥ 44x44px
   - [ ] Proper spacing per design grid (8px baseline)
   - [ ] Media queries: @media (max-width: 768px) and @media (max-width: 480px)

4. **Testing & Verification** (40 min)
   - [ ] Start dev server: `npm run dev`
   - [ ] Load page: `http://localhost:3000/#quizzes` or `http://localhost:3000/quizzes`
   - [ ] Test instructor mode: See instructor dashboard, create/edit/delete buttons
   - [ ] Test student mode: See student dashboard, progress bars, "My Quizzes"
   - [ ] Test public mode: See instructor code input, public quiz grid
   - [ ] Test instructor code: Enter valid code (8 digits) → loads quizzes
   - [ ] Test invalid code: Enter invalid code → error message
   - [ ] Test navigation: Click all CTAs → correct pages load (no 404)
   - [ ] Test mobile <480px: No horizontal scroll, hamburger menu works, fonts readable
   - [ ] Test mobile <768px: Responsive grid, tap zones large
   - [ ] Test desktop: 3-column grid loads, colors correct, spacing aligned
   - [ ] ESLint: `npm run lint -- app/quizzes components/quiz-navigation lib/quiz-navigation` → 0 errors
   - [ ] TypeScript: `npx tsc --noEmit` → full compile pass
   - [ ] Console: Open F12, refresh page → zero errors/warnings
   - [ ] Test multiple dashboards: Log out, log in as different user types, verify correct dashboard

### Engineering DOD Checklist
- [ ] All components created and properly exported
- [ ] User type detection working (instructor/student/public correct)
- [ ] All navigation flows functional (no 404 errors anywhere)
- [ ] Responsive CSS on all breakpoints (480px, 768px, 1920px verified)
- [ ] ESLint: 0 errors, 0 warnings
- [ ] TypeScript: strict mode, no `any` types, all interfaces defined
- [ ] Browser console: 0 errors, 0 warnings
- [ ] All styling applied per design spec (colors, fonts, spacing match)
- [ ] Code reviewed: no dead code, all imports used, clean logic
- [ ] Commit includes test proof (which flows tested, screenshots)

### Engineering Deliverables
- `app/quizzes/page.tsx` — Main quiz navigation page (or section with #quizzes anchor)
- `components/quiz-navigation/` folder:
  - `InstructorDashboard.tsx`
  - `StudentDashboard.tsx`
  - `PublicDashboard.tsx`
  - `QuizCard.tsx`
  - `InstructorCodeModal.tsx`
- `lib/quiz-navigation/` folder:
  - `types.ts` (TypeScript interfaces for Quiz, Dashboard, User)
  - `user-type-detector.ts` (auth logic, role detection)
  - `constants.ts` (quiz code validation rules, API endpoints)

---

## 🔗 Integration Points & Handoffs

### Handoff 1: Product → Design (at 30 min)
**What Product gives Design:**
- User stories (clear, detailed, testable)
- Navigation flows (3 main user paths)
- Feature scope (MVP vs Phase 2)
- Constraints (auth, data availability)

**What Design uses from Product:**
- Specific user actions to design for
- Edge cases to account for in UI
- Scope limits (don't design Phase 2 features)

---

### Handoff 2: Design → Engineering (at 1 hour)
**What Design gives Engineering:**
- Wireframes (9 total: 3 dashboards × 3 breakpoints)
- Color palette (exact hex values)
- Typography spec (font, sizes, weights)
- Component specifications (all states: default/hover/active/disabled)
- Responsive breakpoints (480px, 768px, 1920px)
- Accessibility notes (contrast, focus states)

**What Engineering uses from Design:**
- Exact component layouts (QuizCard dimensions, spacing)
- Color values (to put in CSS)
- Responsive grid breakpoints
- Component states (button hover, form error, etc.)

---

### Handoff 3: Engineering → Product/Design (at 4 hours)
**What Engineering gives Product/Design:**
- Live site URL: `http://localhost:3000/quizzes`
- Screenshots of all 3 dashboards
- Test results (what flows verified)
- Console logs (error-free verification)
- Responsive testing proof (mobile/tablet/desktop screenshots)

**What Product/Design verify:**
- Does it match spec?
- Do flows work as intended?
- Does design match wireframes?
- Are all 3 user types working?

---

## ⏱️ Parallel Timeline Visualization

```
Timeline:    0h      0:30h     1h        2h        3h        4h       4:30h
             |-------|---------|---------|---------|---------|---------|
             
Product:     [Story 1] [Story 2] [Story 3] [Story 4] [Doc Review]
             ======================================= (1.5h total)
             
Design:                    [Wireframes] [Visual System] [Component Spec]
                           ================================================ (1.5h total)
             
Engineering:                              [Architecture] [Component Build]
                                         ===================================
                                         [Testing & Verification] (2h total)
             
Integration:                                                    [Final Sign-off]
                                                                ============ (0.5h)
```

**Key Overlaps:**
- Product finishes at 1h, Design starts at 0:30h (10 min overlap for questions)
- Design finishes at 2h, Engineering starts at 1h (1h overlap for questions)
- All three finish by 4h, spend 0:30h on final integration

---

## 📊 DOD Score Optimization (Engineering + Product + Design)

| Criterion | Engineering | Product | Design | Combined Weight |
|-----------|-------------|---------|--------|-----------------|
| Requirements clarity | - | ✅ 100% | - | 20% |
| Design spec complete | - | - | ✅ 100% | 20% |
| Code quality (ESLint/TS) | ✅ 100% | - | - | 20% |
| Testing coverage | ✅ 100% | ✅ 80% | ✅ 80% | 20% |
| Accessibility | ✅ 100% | - | ✅ 100% | 10% |
| Performance | ✅ 100% | - | - | 10% |
| **Total DOD Score** | **97%** | **85%** | **87%** | **100%** |

**How to maximize score:**
- Product: Clear user stories (avoid ambiguity that slows engineering)
- Design: Detailed specs (avoid "do what feels right" engineering guesses)
- Engineering: Complete testing (verify all flows, all edge cases)
- All: Parallel execution (saves time, reduces rework from unclear requirements)

---

## ⏱️ Timeline Comparison

### Sequential (Old Approach)
```
Product (1.5h) → Design (1.5h) → Engineering (2h) → Testing (1h) = 6 hours
```

### Parallel (New Approach)
```
Product (1.5h)
   ↓ (at 0:30h)
Design (1.5h)
   ↓ (at 1h)
Engineering (2h)
   ↓ (all finish by 4h)
Integration (0.5h)
= 4.5 hours total (25% faster, same quality)
```

**Time Savings: 1.5 hours**
**Quality Maintained: DOD 100% across all three streams**

---

## 📝 Timeline & Effort (Parallel Model)

**Parallel Execution: 4.5 hours total**
- Product (PM): 1.5 hours
- Design (UX/UI): 1.5 hours
- Engineering (Dev): 2 hours
- Integration: 0.5 hours

**vs Sequential Model: 6-8 hours**

**Time Saved: 1.5-3.5 hours (33-40% faster)**
**Quality Maintained: DOD 100%**

---

## 🔗 Related Files

- Home page: `/app/page.tsx` (has #quizzes link)
- Instructor quiz management: `/app/teach/quiz/management/page.tsx`
- Student quiz player: `/app/student/quiz/[quizId]/[mode]/page.tsx`
- Public quiz player: `/app/learn/quizzes/[quizCode]/practice/page.tsx`

---

**Status:** 🔴 NOT STARTED — Awaiting user approval of this DOR

**Next Step:** User reviews this DOR and approves/adjusts before build begins.
