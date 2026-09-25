# Testing the Test Instructor Cookie Setup

**Status:** Ready for testing  
**Date:** 2026-08-14

---

## Quick Manual Test (5 minutes)

### Step 1: Start dev server
```bash
cd /Users/apgo21/dailyagile-platform/openMAIC
npm run dev
```

Wait for "✓ ready started server on 0.0.0.0:3000"

---

### Step 2: Open login page in browser
```
http://localhost:3000/auth/login
```

You should see:
- DailyAgile header with "📚" logo
- Student login form
- **At bottom: "👨‍🏫 Test Instructor" button** (development only)

If you don't see the button:
- Check browser console: `F12` → Console tab
- You should NOT see errors about `setTestInstructorSession`
- Confirm URL shows `localhost:3000`, not a production domain

---

### Step 3: Click "Test Instructor" button

**Expected behavior:**
1. Button text changes to "Setting up..." (shows loading state)
2. Button is disabled
3. After 1-2 seconds, page redirects to `/teach/dashboard`

**If redirect doesn't happen:**
- Check browser console (F12)
- Look for errors like:
  - `Failed to set test instructor session`
  - `fetch failed`
  - `cors error`
- Try manual method below instead

---

### Step 4: Verify you're logged in
You should now be at:
```
http://localhost:3000/teach/dashboard
```

Look for:
- Quiz management interface
- List of quizzes (or "No quizzes yet")
- "Create Quiz" button
- "Details", "Share", "Clone", "Delete" buttons on each quiz

If you're still on login page:
- Cookie wasn't set correctly
- Try refresh (Cmd+R or Ctrl+R)
- Or try manual method below

---

### Step 5: Test Quiz Details page

**Find any quiz** (or create one first):
1. Click the **"Details"** button on a quiz card
2. Should navigate to quiz details page (URL: `/teach/quiz/management/[quizId]`)

**Now test the Assignments tab:**
3. Click the **"Assignments"** tab
4. **Expected:** Tab content loads, shows assignments or "No assignments" message
5. **NOT expected:** Red error, "401 Unauthorized", "Failed to load" message

**Now test the Results tab:**
6. Click the **"Results"** tab  
7. **Expected:** Tab content loads, shows results or empty message
8. **NOT expected:** Red error message

**Check browser console** (F12 → Console tab):
- Should NOT see 401 or 403 errors
- Should see successful API responses (200 status)

---

### Step 6: Test Share Modal

1. Go back to quiz list: `/teach/quiz/management`
2. Click **"Share"** button on any quiz
3. Modal should appear with 3 URLs
4. **Try triple-click on a URL** to select it
5. Press **Ctrl+C** (or **Cmd+C** on Mac) to copy
6. Paste somewhere to verify it copied

**Expected:**
- ✅ URL is selected (highlighted)
- ✅ URL is copied (no "Failed to copy" error)
- ✅ Pasted text is a valid quiz URL

---

### Step 7: Test Clone Button

1. Stay on quiz list: `/teach/quiz/management`
2. Click **"Clone"** button on any quiz
3. Should see loading state
4. After 2-3 seconds: green success message "cloned successfully"
5. New cloned quiz should appear in list

**Expected:**
- ✅ No database constraint error
- ✅ No "Failed to clone" error
- ✅ New quiz is created with unique code
- ✅ Clone can be cloned again (no uniqueness issue)

---

## Manual Test Method (if button doesn't work)

If the "Test Instructor" button doesn't appear or doesn't work:

### Open browser console:
1. Press **F12** to open DevTools
2. Click **Console** tab
3. Paste this command:
```javascript
await fetch('/api/auth/test-instructor', { method: 'POST' })
  .then(r => r.json())
  .then(d => console.log('✅ Success:', d))
  .catch(e => console.error('❌ Error:', e));
```
4. Press **Enter**

**Expected output:**
```
✅ Success: {
  success: true,
  message: "Test instructor session created",
  instructor: { id: "test-instructor-001", email: "test.instructor@example.com" }
}
```

**If you see error:**
- Check server logs for `/api/auth/test-instructor` route
- Verify file exists: `app/api/auth/test-instructor/route.ts`
- Check NODE_ENV is not production

---

### Then redirect manually:
```javascript
window.location.href = '/teach/dashboard';
```

---

## Automated Testing (Optional)

If you want to run automated tests for regressions:

```bash
# Run all regression tests
npm run test:regression

# Or just test bug fixes:
npm run test -- tests/regression/bug-regressions.spec.ts
```

Tests will verify:
- ✅ Share modal works without copy errors
- ✅ Quiz Details loads without 401 errors
- ✅ Clone button works without constraint errors
- ✅ Leaderboard API requires authentication

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Test Instructor" button doesn't appear | Not in dev environment | Check URL is `localhost:3000` |
| Button appears but clicking does nothing | API route not found | Check file exists: `app/api/auth/test-instructor/route.ts` |
| "Failed to set test instructor session" error | Server error | Check server logs, restart `npm run dev` |
| Redirect to dashboard but no quizzes shown | Cookie set but no quizzes in DB | Create a test quiz first via API or admin panel |
| Quiz Details shows "401 Unauthorized" | Cookie not being sent with requests | Check fetch call includes `credentials: 'include'` |
| Share modal copy fails | Clipboard permission issue | This is expected — use triple-click instead |
| Clone fails with "duplicate key" error | Database constraint (older fix not applied) | Code should auto-generate quiz codes now |

---

## Success Checklist

✅ = Everything working  
❌ = Something broken (note the error for debugging)

- [ ] Test Instructor button appears on login page
- [ ] Clicking button redirects to dashboard
- [ ] Quiz list loads on dashboard
- [ ] Quiz Details page loads without 401 error
- [ ] Assignments tab loads without error
- [ ] Results tab loads without error
- [ ] Share modal opens
- [ ] Triple-click selects URL in share modal
- [ ] Clone button creates new quiz
- [ ] Cloned quiz has unique code
- [ ] No database constraint errors in any operation
- [ ] Browser console has no auth-related errors

**All checks pass?** → Ready to proceed to Option 1 (real instructor login)

**Some checks failed?** → Document the error and I'll debug

---

## Next Steps

After successful testing:
1. Option 1 is ready to activate: uncomment instructor-login code
2. Add instructor table to database schema
3. Add password hashing (bcrypt)
4. Add JWT signing (jose)
5. Update login page to use real auth instead of test cookie

For now, test instructor cookie is **production-ready for development** and will remain as a fallback.
