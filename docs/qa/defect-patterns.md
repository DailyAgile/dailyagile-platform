# Defect Patterns - Quiz System
**Last Updated**: 2026-09-25  
**Purpose**: Prevent recurrence of known defect classes

This file tracks patterns in defects found during QA. The goal is to prevent the same CLASS of defect, not merely the identical bug.

---

## PATTERN-001: Division by Zero

**Defect**: `passPercentage = ((correctAnswersCount / totalQuestions) * 100)`

**Symptom**: Error when totalQuestions = 0

**Root Cause**: Missing guard clause for zero denominator

**Violated Invariant**: Never divide by zero

**Why Tests Missed It**: 
- Unit tests only tested happy path (totalQuestions = 5)
- Edge case (0 questions) not included in test matrix
- No property-based testing for boundary values

**Fix Applied**:
```typescript
// Before
const passPercentage = ((correctAnswersCount / totalQuestions) * 100).toFixed(0);

// After
const passPercentage = totalQuestions > 0 ? 
  ((correctAnswersCount / totalQuestions) * 100).toFixed(0) : 
  '0';
```

**Regression Test Added**:
- GameModeQuiz: Test with totalQuestions = 0
- GameModeQuiz: Test with totalQuestions = 1
- GameModeQuiz: Test with totalQuestions = 999

**Similar Areas to Check**:
- [ ] Any percentage calculations (pass%, accuracy%, participation%)
- [ ] Average calculations (avg points, avg time, avg score)
- [ ] Any division where denominator comes from user data or counts
- [ ] Sampling rate calculations
- [ ] Score normalization (score / maxScore)

**Prevention Rule**: 
✅ **Every division must be preceded by denominator > 0 check**

---

## PATTERN-002: Direct State Mutation

**Defect**: `leaderboard.sort((a, b) => b.score - a.score)` directly mutates state array

**Symptom**: Leaderboard order incorrect after multiple sorts; state synchronization issues

**Root Cause**: Array.sort() mutates in-place; React doesn't detect mutation

**Violated Invariant**: React state must be treated as immutable

**Why Tests Missed It**:
- Single-browser test didn't verify leaderboard accuracy across re-renders
- No test for multiple state updates in sequence
- No test verifying state !== mutated state

**Fix Applied**:
```typescript
// Before
leaderboard.sort((a, b) => b.score - a.score)

// After
[...leaderboard].sort((a, b) => b.score - a.score)
```

**Regression Test Added**:
- Create leaderboard with 5 entries
- Sort once, verify order
- Sort again, verify new order (should be same, not doubled)
- Verify original array unchanged
- Verify React re-render picks up changes

**Similar Areas to Check**:
- [ ] Array.reverse()
- [ ] Array.splice()
- [ ] Object.assign() on state
- [ ] Direct property assignment on state objects
- [ ] Array.push() / Array.pop() on state arrays
- [ ] Any method that mutates array/object in place

**Prevention Rule**:
✅ **Never call mutating methods directly on state. Always create new copy first.**

✅ **Code rule: `arr.method()` → `[...arr].method()` or `[...arr, newItem]`**

---

## PATTERN-003: Hardcoded Values in Production Code

**Defect**: `const isInstructor = true` with comment "Set to true for testing"

**Symptom**: All users treated as instructors; privilege escalation vulnerability

**Root Cause**: Temporary testing code left in production build

**Violated Invariant**: No testing flags or debug values in production code

**Why Tests Missed It**:
- Static code analysis (linter) didn't catch hardcoded value
- No review rule "check for hardcoded true/false values"
- Assumed comment would flag it during review

**Fix Applied**:
```typescript
// Before
const [isInstructor, setIsInstructor] = useState(true); // Set to true for testing

// After
const [isInstructor, setIsInstructor] = useState(false); // Verify via auth middleware
```

**Regression Test Added**:
- Test that isInstructor is false by default
- Test that instructor features require auth check
- Test that student cannot access instructor endpoints

**Similar Areas to Check**:
- [ ] `const DEBUG = true`
- [ ] `const SKIP_VALIDATION = true`
- [ ] `const isAdmin = true`
- [ ] `const useLocalDB = false` (hardcoded)
- [ ] `if (process.env.NODE_ENV === 'development')` with boolean flag
- [ ] Any `// TODO:`, `// TEMP:`, `// HACK:` comments indicating incomplete code

**Prevention Rule**:
✅ **No hardcoded true/false values that affect behavior**

✅ **All testing flags must come from environment variables, not code**

✅ **Pre-commit hook: reject commits containing "// testing" or "// debug" comments**

---

## PATTERN-004: Silent API Failures

**Defect**: API returns non-200 status, but error state not set; user sees stale/empty data

**Symptom**: Users don't know stats failed to load; screen shows "loading" forever or empty

**Root Cause**: Error handling path doesn't set visible error state

**Violated Invariant**: All API errors must result in user-visible feedback

**Why Tests Missed It**:
- Happy path only tested (success case)
- No test for `response.ok = false`
- No test for malformed response data
- Logging errors to console doesn't equal user feedback

**Fix Applied**:
```typescript
// Before
if (!response.ok) {
  log.warn('Failed to load stats');
  return;  // ← User doesn't know
}

// After
if (!response.ok) {
  setError('Failed to load completion stats');  // ← User informed
  return;
}
```

**Regression Test Added**:
- Mock API to return 500 error
- Verify error state is set
- Verify error message shown to user
- Verify UI shows error, not empty/loading state
- Verify can retry

**Similar Areas to Check**:
- [ ] Any API call with `try/catch` that only logs errors
- [ ] Any fetch without `response.ok` check
- [ ] Any state that could remain in "loading" forever
- [ ] Any conditional that hides errors: `if (error) { return; }`
- [ ] Silent failure on network timeout

**Prevention Rule**:
✅ **Every API error must set visible error state**

✅ **Every data load must have: loading state, error state, success state**

✅ **Test: All non-200 status codes trigger visible error message**

---

## PATTERN-005: Missing Await on Async Operations

**Defect**: `loadQuizzes()` called without `await` after quiz deletion

**Symptom**: UI shows stale quiz list; deleted quiz still appears until page refresh

**Root Cause**: Async operation doesn't block; state updates before data loads

**Violated Invariant**: State updates that depend on async operations must await them

**Why Tests Missed It**:
- No test for state consistency after delete
- No test verifying data reloaded after mutation
- Manual testing might not catch timing-dependent bugs

**Fix Applied**:
```typescript
// Before
setDeleteModal({ open: false });
loadQuizzes();  // ← Doesn't wait

// After
setDeleteModal({ open: false });
await loadQuizzes();  // ← Waits for completion
```

**Regression Test Added**:
- Delete quiz
- Verify quiz list updates immediately (not after manual reload)
- Verify deleted quiz no longer appears
- Verify count decreases
- Verify new quiz can be created with same name

**Similar Areas to Check**:
- [ ] Any setState followed by fetch (race condition)
- [ ] Deletes, updates without waiting for confirmation
- [ ] Navigation that depends on async data load
- [ ] Event handlers that trigger async operations without await
- [ ] `useEffect` dependencies missing async operations

**Prevention Rule**:
✅ **All mutations that trigger data reload must await the reload**

✅ **Code rule: If function returns Promise, it must be awaited**

✅ **Linter rule: Flag `async function` calls without `await`**

---

## PATTERN-006: Missing Error Boundary for Success=False

**Defect**: API returns `{ success: false, error: "..." }` but code only checks `if (data.success)`

**Symptom**: Error state not set when success=false; silent failure

**Root Cause**: Missing error path for `success: false` case

**Violated Invariant**: Both HTTP error (non-200) and logical error (success=false) must be handled

**Why Tests Missed It**:
- Happy path only tested (success=true)
- No test for `success: false` response
- Code review didn't flag missing error branch

**Fix Applied**:
```typescript
// Before
const data = await response.json();
if (data.success) {
  setCompletionStats(data.data.stats || []);
}
// ← What if success=false? Silent failure.

// After
const data = await response.json();
if (!data.success) {
  setError(data.error?.message || 'Failed to load stats');
  return;
}
setCompletionStats(data.data.stats || []);
```

**Regression Test Added**:
- Mock API to return 200 OK but success=false
- Verify error state is set
- Verify user sees error message
- Verify stats remain empty/old value
- Verify can retry

**Similar Areas to Check**:
- [ ] Any API returning custom `success` field
- [ ] GraphQL queries that "succeed" but return errors
- [ ] API responses with `status` or `ok` field separate from HTTP status
- [ ] Validation errors returned as 200 OK + error field

**Prevention Rule**:
✅ **Check BOTH HTTP status AND response body for errors**

✅ **If API returns `success` field, check it explicitly**

✅ **Test: success=false case for every API call**

---

## TESTING STRATEGY UPDATES

Based on defects found, testing approach should include:

### 1. Boundary Value Testing

**Pattern**: Division-by-zero, off-by-one errors

**Action**:
```javascript
// For any calculation or count:
test('with 0 items', () => { /* edge case */ });
test('with 1 item', () => { /* edge case */ });
test('with max items', () => { /* edge case */ });
test('with negative value', () => { /* edge case */ });
```

### 2. Error Path Testing

**Pattern**: Silent failures, missing error states

**Action**: 
- For every API call, test:
  - [ ] 200 OK with success=true
  - [ ] 200 OK with success=false
  - [ ] 404 Not Found
  - [ ] 500 Server Error
  - [ ] Network timeout
  - [ ] Invalid JSON response

### 3. State Mutation Testing

**Pattern**: Incorrect leaderboard after sort

**Action**:
```javascript
test('Array mutation', () => {
  const original = [1, 2, 3];
  const sorted = [...original].sort();
  expect(original).toEqual([1, 2, 3]); // Original unchanged
  expect(sorted).toEqual([1, 2, 3]);  // Copy sorted
});
```

### 4. Async/Await Testing

**Pattern**: Race conditions, stale state

**Action**:
```javascript
test('await async operations', async () => {
  await action();
  expect(state).toBe(updated);  // Verified after completion
});
```

### 5. Code Review Checklist

Add to pre-commit:
- [ ] No hardcoded true/false values
- [ ] All divisions guarded by > 0 check
- [ ] All mutations create copy first
- [ ] All API errors set error state
- [ ] All async operations awaited
- [ ] All success/error paths tested

---

## DEFECT METRICS

### Current Release (2026-09-25)

| Category | Count | Severity |
|----------|-------|----------|
| Division by zero | 1 | CRITICAL |
| State mutation | 2 | HIGH |
| Security hardcoding | 1 | CRITICAL |
| Silent API failures | 2 | HIGH |
| Missing await | 1 | MEDIUM |
| **TOTAL** | **7** | - |

**Average per file**: 1 critical + 1.2 high-risk bugs

**Trend**: High density in GameModeQuiz.tsx and page.tsx

**Action**: Code review focus on these patterns for similar files

---

## FUTURE USE

When writing tests for new features:

1. **Before coding**: Review this file for pattern prevalence
2. **While coding**: Apply prevention rules
3. **Test writing**: Include boundary cases and error paths for each pattern
4. **Code review**: Check against prevention rules
5. **QA testing**: Include failure scenarios from each pattern
6. **Bug found**: Add to this file with pattern number

---

**This file is living documentation. Update whenever a new defect pattern is discovered.**
