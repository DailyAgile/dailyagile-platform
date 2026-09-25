# DailyAgile Platform — MANDATORY Testing Checklist

**Effective Immediately — August 2026**  
**Status:** All code changes MUST pass these checks before commit

---

## 🚨 CRITICAL: Pre-Commit Requirements

Before EVERY git commit, the developer MUST run:

```bash
# 1. Lint & TypeScript (catches syntax errors)
npm run lint
npm run type-check

# 2. Unit Tests (catches logic errors)
npm run test:unit

# 3. E2E Tests (catches integration errors)
npm run test:e2e

# 4. Manual browser test (catches rendering errors)
# Navigate to http://localhost:3000/academy and verify:
#   - Page loads without errors
#   - Components render correctly
#   - No console errors
#   - Navigation works
```

**If ANY test fails → DO NOT COMMIT.**

---

## ✅ Phase 1: Academy Dashboard Checklist

### A. Code Quality (Automatic)
- [ ] `npm run lint` passes (no ESLint errors)
- [ ] `npm run type-check` passes (no TypeScript errors)
- [ ] No console.error, console.log in production code
- [ ] All imports are used (no dead code)

### B. Unit Tests (Automated)
Run: `npm run test:unit`

**Test Files Required:**
- `app/academy/__tests__/page.test.tsx`
  - [ ] Renders without auth gate
  - [ ] Shows "Log In" button when user is null
  - [ ] Shows username button when user is logged in
  - [ ] Header subtitle is context-aware (Learning Platform / Student Dashboard / Instructor Dashboard)
  - [ ] Welcome message shows correct greeting for logged-in vs. visitor
  - [ ] ILT card has "Public" badge
  - [ ] Self-Paced card has "Login Required" badge
  - [ ] Quiz card has "Login Required" badge
  - [ ] ILT link goes to `/academy/ilt` (public)
  - [ ] Self-Paced link goes to login if not authenticated
  - [ ] Quiz link goes to login if not authenticated

- `app/academy/ilt/__tests__/page.test.tsx`
  - [ ] Renders without auth gate
  - [ ] Displays all 4 sample courses
  - [ ] Each course shows name, description, instructor, price, duration
  - [ ] Each course shows next 2 cohorts with dates and seat counts
  - [ ] "Enroll Now" button is visible on each card
  - [ ] "Contact Sales" button is visible
  - [ ] Back button links to `/academy`

### C. E2E Tests (Automated)
Run: `npm run test:e2e`

**Test File:** `e2e/tests/academy-dashboard.spec.ts`

#### Test Scenario 1: Visitor (Not Logged In)
```typescript
test('Visitor can browse ILT courses without login', async () => {
  await page.goto('/academy');
  
  // Verify page loads
  expect(await page.locator('h1:has-text("DailyAgile Academy")').isVisible()).toBe(true);
  
  // Verify "Log In" button is visible
  expect(await page.locator('text=Log In / Sign Up').isVisible()).toBe(true);
  
  // Verify ILT card shows "Public" badge
  expect(await page.locator('text=Public').isVisible()).toBe(true);
  
  // Verify Self-Paced shows "Login Required" badge
  expect(await page.locator('text=Login Required').count()).toBeGreaterThanOrEqual(2);
  
  // Navigate to ILT courses
  await page.locator('text=ILT Cohorts').click();
  await page.waitForURL('/academy/ilt');
  
  // Verify courses display
  expect(await page.locator('text=Agile Fundamentals').isVisible()).toBe(true);
  expect(await page.locator('text=Scrum Master Essentials').isVisible()).toBe(true);
  expect(await page.locator('button:has-text("Enroll Now")').count()).toBeGreaterThanOrEqual(4);
  
  // Verify back button works
  await page.locator('text=Back to Academy').click();
  await page.waitForURL('/academy');
});
```

#### Test Scenario 2: Logged-In User (Instructor)
```typescript
test('Instructor sees personalized dashboard', async () => {
  // Login as instructor
  await loginAsInstructor(page);
  
  // Navigate to academy
  await page.goto('/academy');
  
  // Verify personalized greeting
  expect(await page.locator('text=/Welcome back/').isVisible()).toBe(true);
  
  // Verify header shows username
  expect(await page.locator('text=Instructor').isVisible()).toBe(true);
  
  // Verify header subtitle shows "Instructor Dashboard"
  expect(await page.locator('text=Instructor Dashboard').isVisible()).toBe(true);
  
  // Verify user menu appears on click
  await page.locator('button:has-text("instructor")').click();
  expect(await page.locator('text=Settings').isVisible()).toBe(true);
  expect(await page.locator('text=Log Out').isVisible()).toBe(true);
});
```

#### Test Scenario 3: Login Redirect for Gated Products
```typescript
test('Self-Paced redirects to login when not authenticated', async () => {
  await page.goto('/academy');
  
  // Click Self-Paced
  await page.locator('text=Self-Paced Courses').click();
  
  // Should redirect to login
  await page.waitForURL(/\/auth\/login/);
  expect(page.url()).toContain('redirect=/academy/self-paced');
});
```

### D. Manual Browser Test (Every Commit)
Run: `npm run dev` then navigate to `http://localhost:3000/academy`

**Checklist:**
- [ ] Page loads in <2 seconds
- [ ] No red errors in browser console
- [ ] No yellow warnings in browser console
- [ ] Header renders correctly (logo + subtitle)
- [ ] User button OR Login button shows (based on auth state)
- [ ] 3 product cards render with correct colors
  - [ ] ILT = Navy (#1E3A5F)
  - [ ] Self-Paced = Teal (#0891B2)
  - [ ] Quiz = Orange (#EA580C)
- [ ] Card icons are visible (👥 📚 🎯)
- [ ] Card badges render correctly
  - [ ] ILT: "Public"
  - [ ] Self-Paced: "Login Required"
  - [ ] Quiz: "Login Required"
- [ ] Hover effects work on cards (border color changes, shadow appears)
- [ ] Click on ILT card → navigates to `/academy/ilt`
- [ ] ILT page displays 4 sample courses
- [ ] Each course card shows:
  - [ ] Course name
  - [ ] Instructor name
  - [ ] Description
  - [ ] Price (£)
  - [ ] Duration
  - [ ] Next 2 cohorts with dates
  - [ ] "Enroll Now" button
- [ ] Back to Academy link works
- [ ] Quick Links section renders (Settings, Help, Website)
- [ ] Responsive design works on mobile (resize browser to 375px width)

---

## 🔍 JSX/Syntax Error Prevention

**New Rule:** Before committing ANY React component, run this check:

```bash
# Validate JSX syntax
npx tsc --noEmit --jsx react

# Count opening and closing tags
grep -o "<div" app/academy/page.tsx | wc -l  # Should match closing count
grep -o "</div>" app/academy/page.tsx | wc -l
```

**Common Mistakes to Catch:**
- [ ] All `<div>` have matching `</div>`
- [ ] All `<Link>` are properly closed
- [ ] All ternary operators `{user ? (...) : (...)}` are complete
- [ ] No orphaned `</div>` tags
- [ ] Proper nesting of conditionals
- [ ] No inline JSX after component closes

---

## 🚀 Pre-Push Verification

Before pushing to remote, run:

```bash
# 1. Run full test suite
npm run test

# 2. Build for production
npm run build

# 3. Visual check
npm run dev &  # Start dev server
sleep 3
# Open http://localhost:3000/academy in browser
# Verify page loads, no errors
# Ctrl+C to stop dev server

# 4. Check git status
git status
git diff --cached

# 5. Only push if ALL above pass
git push
```

---

## 📋 Commit Message Template

Every commit must include this info:

```
feat/fix: Brief description (under 50 chars)

Detailed explanation of what changed and why (2-3 sentences).

Testing:
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual browser test verified
- [ ] No console errors
- [ ] TypeScript passes

Fixes: (if applicable)
- Description of what was broken

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

---

## 🔧 Setup: Install Pre-Commit Hook

Add this to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
set -e

echo "🧪 Running pre-commit checks..."

# 1. Lint
npm run lint || { echo "❌ Lint failed"; exit 1; }

# 2. Type check
npm run type-check || { echo "❌ TypeScript failed"; exit 1; }

# 3. Unit tests
npm run test:unit || { echo "❌ Unit tests failed"; exit 1; }

echo "✅ All pre-commit checks passed!"
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## 📊 Quality Gates by Severity

| Level | Action | Impact |
|-------|--------|--------|
| 🔴 **Syntax Error** | Reject immediately | No commit, no push |
| 🔴 **Test Failure** | Reject immediately | No commit, no push |
| 🟡 **Type Warning** | Review, fix if possible | Can commit with explanation |
| 🟡 **Lint Warning** | Review, fix if possible | Can commit with explanation |
| 🟢 **Code Review** | Peer review before merge | Merge only after approval |

---

## ✅ Verification After This Commit

**This file was created to prevent future mistakes.**

Before your next code change:
1. Read this entire checklist
2. Commit this file
3. Use it for EVERY commit going forward
4. No exceptions

If a mistake slips through despite this checklist → update the checklist to catch it next time.

---

**Owner:** Quality & Testing  
**Status:** ACTIVE - All future commits must follow this  
**Last Updated:** 2026-08-19
