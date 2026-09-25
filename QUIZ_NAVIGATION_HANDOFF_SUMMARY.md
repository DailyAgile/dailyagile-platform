# Quiz Navigation Feature — Handoff Summary (2026-08-26)

**Complete Requirements Document:** `/Users/apgo21/dailyagile-platform/QUIZ_NAVIGATION_REQUIREMENTS.md`

**Status:** Product Complete ✅ — Ready for parallel Design & Engineering execution
**Timeline:** 4.5 hours total (1.5h Product + 1.5h Design + 2h Engineering + 0.5h Integration)
**Route:** `/quizzes` (SEO-crawlable, not `/#quizzes`)
**Feature Scope:** MVP only (Phase 2 deferred features clearly marked)

---

## 📋 WHAT PRODUCT DELIVERED

### User Stories (22 Total)
- **8 Instructor Stories:** Create (manual/CSV/AI), Manage (view/filter), Edit, Delete, Share (3 modes), Analytics
- **7 Student Stories:** View purchased quizzes, Resume, Take new, Progress tracking, Bookmarks, Certificates, Settings
- **7 Public User Stories:** Enter code, Browse public quizzes, Preview, Take (practice/mock/game), Filter/search, Results with explanations, Code persistence (localStorage)

**Format:** All stories follow "As a [role], I want [action], so that [outcome]" with specific, testable acceptance criteria (no vague language).

### User Type Detection Logic
**Decision Tree:** Authenticate → Check role → Check purchases → Default to public
- **Instructor:** JWT valid + role="instructor" → Show instructor dashboard
- **Student:** JWT valid + role="student" + has purchases → Show student dashboard
- **Public:** No auth OR auth with no purchases OR explicit code → Show public dashboard

**Edge Cases Documented:** Expired JWT, dual role (instructor + student), missing profile, deleted quiz, access revoked, network failure

### Navigation Flows (4 Main Paths + Error Handling)
1. **Instructor Quiz Creation:** Create → Modal (choose method) → Questions → Code assigned → Share confirmation
2. **Student Quiz Taking:** Login → My Quizzes → Select quiz → Mode choice → Take → Results → Dashboard update
3. **Public Code Entry:** No login → Instructor code input → Validation → Load instructor's quizzes → Optional save code → Take quiz
4. **Public Browse:** No login → Browse public quiz grid → Search/filter → Preview → Take → Results

**Error Paths:** Auth failure, network error, invalid code, deleted quiz, access denied, timeout

### Feature Scope (MVP Locked)
**INCLUDED (v1.0):**
- User type detection
- All 3 dashboards (instructor, student, public)
- Quiz creation (manual entry only — CSV/AI deferred to Phase 2)
- Quiz management (view, edit, delete)
- Share links for 3 modes (Practice, Mock, Game)
- Student progress tracking
- Public quiz browsing + code entry
- Responsive design (mobile, tablet, desktop)
- localStorage persistence for instructor code
- Basic analytics (enrollment, avg score)

**DEFERRED (Phase 2):**
- AI quiz generation (requires Claude API integration)
- CSV bulk upload (manual entry sufficient for MVP)
- Advanced analytics (question-level insights, heatmaps)
- Quiz scheduling (release on specific date)
- Class roster management
- Video questions
- Leaderboard persistence
- Dark mode

### SEO Criteria
- ✅ Route `/quizzes` (search-crawlable, not hash-based)
- ✅ Feature scope complete (not deferred) — maximizes keyword coverage
- ✅ Analytics enabled (quiz views, clicks, conversions — supports user testimonials)
- ✅ Code persistence in localStorage (repeat traffic from instructors)
- ✅ High-intent CTAs: "Take Quiz Now", "Create Quiz", "Browse Free Quizzes"
- ✅ Mobile-first responsive design (Core Web Vitals ranking factor)

---

## 🎨 FOR DESIGN TEAM

### Wireframes Needed (9 Minimum)
**Desktop (1920px):**
1. Instructor Dashboard (3-column: sidebar + main + right panel)
2. Student Dashboard (2-column: left nav + quizzes grid)
3. Public Dashboard (instructor code input + quiz grid)

**Tablet (768px):**
4. Instructor Dashboard (responsive, hamburger menu)
5. Student Dashboard (responsive grid)
6. Public Dashboard (responsive)

**Mobile (<480px):**
7. Instructor Dashboard (1-column, hamburger menu, stacked cards)
8. Student Dashboard (1-column, full-width cards)
9. Public Dashboard (1-column, prominent code input)

### Component Specifications
- **Quiz Card:** Title, metadata (question count, date), status badge, action buttons
- **Status Badges:** Not Started (gray), In Progress (yellow), Completed (green), Draft (orange), Published (teal)
- **Buttons:** Primary (orange #EA580C), Secondary (teal #0891B2), Danger (red), Sizes (sm/md/lg)
- **Form Elements:** Input fields, labels, error messages (red #dc2626), validation icons
- **Modal:** Instructor code entry, confirm dialog (delete, share)
- **Progress Bar:** Quiz completion percentage
- **Breadcrumb Navigation:** Current location context
- **Hamburger Menu:** Mobile nav, 24px icon, 80% viewport width drawer

### Brand Specifications (Use Exactly)
**Colors:**
- Navy: #1E3A5F (headers, dark backgrounds)
- Teal: #0891B2 (links, highlights, secondary buttons)
- Orange: #EA580C (primary CTAs, "New" badges, warnings)
- Green: #16a34a (success, completed)
- Light: #F0F7FA (card backgrounds, alternating rows)
- Gray: #64748B (secondary text, disabled elements)
- White: #FFFFFF (page background)

**Typography:**
- Headers: Cambria Bold (24px, 20px, 18px)
- Body: Calibri (16px, 14px, 12px)
- Code/data: Monospace

**Responsive Breakpoints:**
- Mobile: <480px (single column, hamburger menu)
- Tablet: 768px (2 columns)
- Desktop: 1920px (3 columns, full width)

**Accessibility Requirements:**
- Contrast ratio: WCAG AA minimum (4.5:1 text, 3:1 UI)
- Font sizes readable on mobile (<480px): minimum 16px body text
- Tap zones: All interactive elements ≥ 44×44px on mobile
- Focus states: Visible keyboard focus (outline or highlight)
- Color + text indicators (not color alone for status)
- Alt text on all images
- Form labels properly associated with inputs

**Design Deliverables:**
- 9 wireframes (Figma or high-res PNG exports)
- `QUIZ_NAVIGATION_DESIGN_SYSTEM.md` (colors, fonts, spacing, responsive grid)
- Component specifications document (all component states)
- Accessibility checklist (contrast, focus, color indicators)
- Responsive testing proof (screenshots at 3 breakpoints)

---

## 💻 FOR ENGINEERING TEAM

### User Type Detection Logic (Implementation)

**File:** `lib/quiz-navigation/user-type-detector.ts`

```typescript
// Check JWT auth
const auth = await getAuthUser(); // Returns { id, role } or null

if (!auth?.id) {
  return "public"; // No auth = public user
}

// Check user profile for role
const user = await getUserProfile(auth.id);

if (user.role === "instructor") {
  return "instructor"; // Instructor takes priority
}

if (user.role === "student") {
  const hasPurchases = await checkStudentPurchases(auth.id);
  if (hasPurchases) {
    return "student"; // Has course purchases
  }
  return "public"; // Student but no purchases
}

return "public"; // Fallback for unknown role
```

### API Contracts Needed

**GET `/api/user`**
```json
Response: { id, email, role, instructor_id?, student_id? }
```

**GET `/api/quizzes/instructor`**
```json
Query: { sort, filter, search }
Response: [{ id, title, code, questions_count, created_at, status, enrolled_count }]
```

**GET `/api/quizzes/student`**
```json
Response: [{ id, title, course, progress, score, status }]
```

**GET `/api/quizzes/public`**
```json
Query: { topic, difficulty, search, page, limit }
Response: [{ id, title, questions_count, instructor_name, difficulty, topics }]
```

**POST `/api/quizzes/validate-code`**
```json
Body: { code }
Response: { valid, instructor_id, quizzes }
```

**GET `/api/quizzes/:code/public`**
```json
Response: { instructor_name, quizzes: [{ id, title, public }] }
```

### Component Architecture

```
app/quizzes/page.tsx (main page)
  ├─ useEffect: Detect user type
  ├─ Render: InstructorDashboard | StudentDashboard | PublicDashboard
  
components/quiz-navigation/
  ├─ InstructorDashboard.tsx (Create, Manage, Analytics)
  ├─ StudentDashboard.tsx (My Quizzes, Progress, Bookmarks, Settings)
  ├─ PublicDashboard.tsx (Code input, Browse Public)
  ├─ QuizCard.tsx (Reusable card component)
  ├─ InstructorCodeModal.tsx (Code entry + validation)
  ├─ QuizGrid.tsx (Grid layout + pagination)
  └─ SearchFilterBar.tsx (Search + filter controls)

lib/quiz-navigation/
  ├─ types.ts (TypeScript interfaces)
  ├─ user-type-detector.ts (Auth logic)
  ├─ constants.ts (Validation rules, API endpoints)
  └─ utils.ts (Code formatting, storage helpers)
```

### localStorage Schema

```javascript
// Instructor code (if user saved it)
localStorage.instructorCode = "12AB34CD";

// Recent quizzes (for quick access)
localStorage.recentQuizzes = JSON.stringify([
  { quizId: 1, title: "Biology 101", lastAttempt: "2026-08-26" },
  { quizId: 2, title: "Chemistry 201", lastAttempt: "2026-08-25" }
]);

// User preferences (if storing in browser)
localStorage.quizPreferences = JSON.stringify({
  defaultMode: "practice", // practice | mock | game
  enableNotifications: true,
  darkMode: false
});
```

### Error Handling Rules

| Error | HTTP Code | User Message | Action |
|-------|-----------|--------------|--------|
| Auth expired | 401 | "Your session has expired. Please log in again." | Redirect to /login |
| Quiz not found | 404 | "This quiz is no longer available." | Show "Back" button |
| Permission denied | 403 | "You don't have access to this quiz." | Redirect to dashboard |
| Code not found | 400 | "Code not found. Please check and try again." | Allow retry |
| Network error | 5xx | "Connection failed. Please try again." | Retry button |
| Database error | 500 | "Something went wrong. Please try again later." | Retry button |

### Validation Rules

**Instructor Code:**
- Exactly 8 characters
- Numeric only (0-9)
- Case-insensitive when entered (e.g., "12AB34CD" or "12ab34cd" both work)
- Real-time validation feedback

**Quiz Title:**
- Required, max 100 characters
- Trim whitespace

**Quiz Description:**
- Optional, max 500 characters

### Performance Targets

- Page load: < 2 seconds (including API calls)
- Search/filter: Debounced, < 300ms latency
- Code validation: < 200ms response
- Quiz creation submit: Feedback within 500ms
- Image optimization: WebP, lazy loading
- No render-blocking resources

### Testing Checklist

- [ ] Load `/quizzes` as authenticated instructor → See instructor dashboard
- [ ] Load `/quizzes` as authenticated student (with purchases) → See student dashboard
- [ ] Load `/quizzes` as public user (no auth) → See public dashboard
- [ ] Enter valid instructor code → Load that instructor's quizzes
- [ ] Enter invalid code → Show error message
- [ ] Save instructor code → Verify localStorage
- [ ] Revisit page with saved code → Code pre-loads
- [ ] Search by quiz title → Filter results real-time
- [ ] Click Create Quiz → Modal opens with 3 options
- [ ] Manually create quiz → Quiz appears in dashboard with draft badge
- [ ] Click Share → Modal shows 8-digit code + 3 shareable links
- [ ] Click Edit quiz → Form pre-populated, changes save
- [ ] Click Delete quiz → Confirmation modal, quiz disappears
- [ ] Test on mobile <480px → No horizontal scroll, hamburger menu works
- [ ] Test on tablet 768px → Responsive grid, readable text
- [ ] Test on desktop 1920px → Full 3-column layout
- [ ] ESLint: `npm run lint` → 0 errors
- [ ] TypeScript: `npx tsc --noEmit` → Full compile pass
- [ ] Browser console: F12 → 0 errors, 0 warnings

### SEO/GEO Implementation

- [ ] Meta tags: `<title>`, `<meta name="description">`, `<link rel="canonical">`
- [ ] Open Graph: `<meta property="og:title">`, `<meta property="og:description">`, `<meta property="og:image">`
- [ ] Structured data: Breadcrumb schema (JSON-LD), Organization schema
- [ ] robots.txt: Allow `/quizzes` path
- [ ] Sitemap: Include `/quizzes` entry
- [ ] Mobile responsiveness: Pass Google Mobile-Friendly Test
- [ ] Page load speed: Target < 2 seconds (Core Web Vitals)
- [ ] No render-blocking resources: CSS/JS async or deferred

### Deliverables (Code)

**Files to Create:**
- `app/quizzes/page.tsx` — Main quiz navigation page
- `app/quizzes/layout.tsx` — Layout with header/footer
- `components/quiz-navigation/InstructorDashboard.tsx`
- `components/quiz-navigation/StudentDashboard.tsx`
- `components/quiz-navigation/PublicDashboard.tsx`
- `components/quiz-navigation/QuizCard.tsx`
- `components/quiz-navigation/InstructorCodeModal.tsx`
- `components/quiz-navigation/QuizGrid.tsx`
- `components/quiz-navigation/SearchFilterBar.tsx`
- `lib/quiz-navigation/types.ts`
- `lib/quiz-navigation/user-type-detector.ts`
- `lib/quiz-navigation/constants.ts`
- `lib/quiz-navigation/utils.ts`

**Files to Update:**
- `next.config.js` — SEO meta tags for `/quizzes` route
- Supabase schema: Verify `users.role`, `quizzes.instructor_id`, `progress.student_id` tables exist

### Definition of Done (Engineering)

- [ ] All components created and exported
- [ ] User type detection working (instructor/student/public routed correctly)
- [ ] All navigation flows functional (no 404 errors)
- [ ] Responsive CSS on all breakpoints (480px, 768px, 1920px tested)
- [ ] ESLint: 0 errors, 0 warnings
- [ ] TypeScript: Strict mode, no `any` types, all interfaces defined
- [ ] Browser console: 0 errors, 0 warnings
- [ ] DailyAgile branding applied (colors, fonts, spacing match spec exactly)
- [ ] Code reviewed: No dead code, all imports used, clean logic
- [ ] Commit message includes test proof (which flows tested, screenshots)

---

## 🔗 INTEGRATION POINTS

### Handoff Timeline

**0:00–1:30** — Product finalizes user stories (COMPLETE ✅)
↓
**0:30–2:00** — Design creates wireframes + component specs (parallel with Product)
↓
**1:00–3:00** — Engineering builds components + routing (parallel with Design)
↓
**3:00–4:00** — Engineering testing + responsive verification
↓
**4:00–4:30** — Final sign-off: Design verifies UI, Engineering verifies DOD

**Total: 4.5 hours** (vs. 6-8 hours sequential)

### Definition of Done (Feature-Level)

✅ Complete when:
- All 22 user stories accepted by PM
- 9 wireframes completed by Design
- All components implemented by Engineering
- User type detection working correctly
- All 4 navigation flows functional end-to-end
- Responsive design verified at 3 breakpoints
- ESLint/TypeScript/console all clean
- DailyAgile branding perfectly applied
- Commit includes test proof

✅ NO AMBIGUITY on:
- Who can do what (role-based capabilities clearly defined)
- When we show which dashboard (detection logic explicit)
- What happens if X fails (error paths documented)
- Is feature complete (MVP scope locked, Phase 2 deferred)

---

## 📊 QUICK REFERENCE

| Role | Primary Actions | Dashboard | Access |
|------|-----------------|-----------|--------|
| **Instructor** | Create, edit, delete, share, analyze | Instructor | Auth + role="instructor" |
| **Student** | Take, resume, track, bookmark | Student | Auth + role="student" + purchases |
| **Public** | Browse public, enter code, take | Public | No auth OR no purchases |

| Feature | Included (v1.0) | Deferred (Phase 2) |
|---------|-----------------|-------------------|
| Create quiz (manual) | ✅ | - |
| Create quiz (CSV) | - | 📋 |
| Create quiz (AI) | - | 🤖 |
| Manage quizzes | ✅ | - |
| Share quiz (3 modes) | ✅ | - |
| Basic analytics | ✅ | - |
| Advanced analytics | - | 📊 |
| Student progress tracking | ✅ | - |
| Certificates | ✅ | - |
| Bookmarks | ✅ | - |
| Public quiz browsing | ✅ | - |
| Instructor code entry | ✅ | - |
| localStorage persistence | ✅ | - |
| Quiz scheduling | - | 📅 |
| Class roster management | - | 👥 |

---

**Product Approval:** ✅ Complete
**Design Start:** 0:30h (parallel)
**Engineering Start:** 1:00h (parallel)
**Integration Deadline:** 4:30h (all teams)

**Questions?** Contact Product Manager for requirements clarification.

