# Mobile & PWA Implementation Guide
## How to Integrate Offline Features into Your Quiz Pages

---

## QUICK START (5 Minutes)

### Option 1: Simplest - Use QuizPlayerWithOfflineSupport

Replace your current quiz player with the offline-aware version:

```jsx
// Before
import { QuizPlayer } from '@/components/quiz/QuizPlayer';

// After  
import { QuizPlayerWithOfflineSupport } from '@/components/quiz/QuizPlayerWithOfflineSupport';

export function MyQuizPage() {
  return (
    <QuizPlayerWithOfflineSupport
      questions={questions}
      quizId="quiz-123"
      studentId="student-456"
      sceneId="scene-789"
      sessionId="session-abc"
      onFinish={() => navigate('/results')}
    />
  );
}
```

**What you get:**
- ✅ Automatic offline detection
- ✅ Answers saved locally
- ✅ Auto-sync when online
- ✅ Offline indicator at top of page
- ✅ IndexedDB caching
- ✅ No additional setup needed

---

### Option 2: Mobile-First - Use QuizPlayerMobile

For mobile-optimized experience with gestures and haptics:

```jsx
import { QuizPlayerMobileEnhanced } from '@/components/quiz/QuizPlayerMobile';

export function MyMobileQuizPage() {
  return (
    <QuizPlayerMobileEnhanced
      questions={questions}
      sessionId={sessionId}
      onSubmitAnswer={handleSubmit}
      onFinishQuiz={handleFinish}
    />
  );
}
```

**What you get:**
- ✅ Swipe navigation (left/right)
- ✅ Haptic feedback on actions
- ✅ Safe area handling (notch)
- ✅ Orientation detection
- ✅ Pinch-zoom disabled
- ✅ Mobile gesture hints

---

### Option 3: Custom - Build Your Own

For maximum control, use individual utilities:

```jsx
import { useOfflineSync } from '@/lib/hooks/use-offline-sync';
import { OfflineIndicator } from '@/components/quiz/OfflineIndicator';
import { QuizPlayer } from '@/components/quiz/QuizPlayer';
import {
  saveAnswer,
  queueSubmission,
  cacheQuizData,
} from '@/lib/client/quiz-indexeddb';

export function CustomQuizPage() {
  const { syncStatus, sync } = useOfflineSync();

  useEffect(() => {
    // Cache quiz data on load
    cacheQuizData(quizId, questions);
  }, [quizId, questions]);

  const handleSubmitAnswer = async (questionId, answer, timeTaken) => {
    // Save locally
    await saveAnswer(quizId, questionId, sessionId, answer, timeTaken);
    
    // Try to sync if online
    if (syncStatus?.state !== 'offline') {
      await sync();
    }
  };

  const handleFinish = async () => {
    // Queue submission
    const answers = await getAllAnswers(sessionId);
    await queueSubmission(quizId, sessionId, studentId, sceneId, answers, questions);
    
    // Trigger sync
    await sync();
  };

  return (
    <>
      <OfflineIndicator position="top" compact={true} />
      <QuizPlayer {...props} onSubmitAnswer={handleSubmitAnswer} onFinishQuiz={handleFinish} />
    </>
  );
}
```

---

## DETAILED INTEGRATION GUIDE

### 1. Cache Quiz Data on Page Load

```jsx
import { cacheQuizData } from '@/lib/client/quiz-indexeddb';

useEffect(() => {
  const cacheQuiz = async () => {
    try {
      await cacheQuizData(quizId, questions);
      console.log('Quiz cached for offline use');
    } catch (error) {
      console.error('Failed to cache quiz:', error);
    }
  };

  cacheQuiz();
}, [quizId, questions]);
```

**Why**: Stores quiz questions in IndexedDB so they're available even if network drops mid-quiz.

---

### 2. Save Answers Locally

```jsx
import { saveAnswer, getAllAnswers } from '@/lib/client/quiz-indexeddb';

const handleSubmitAnswer = async (questionId, selectedAnswer, timeTaken) => {
  try {
    // Save to IndexedDB
    await saveAnswer(quizId, questionId, sessionId, selectedAnswer, timeTaken);
    
    // Send to server (if online)
    try {
      await fetch('/api/student/quiz/submit-answer', {
        method: 'POST',
        body: JSON.stringify({ questionId, selectedAnswer, timeTaken }),
      });
    } catch (networkError) {
      // Network error? That's okay, it's saved locally
      console.warn('Network unavailable, answer saved offline');
    }
  } catch (dbError) {
    console.error('Failed to save answer:', dbError);
  }
};
```

**Flow**:
1. User selects answer
2. Save immediately to IndexedDB (synchronous, fast)
3. Try to send to server (best effort)
4. If network fails, answer is already saved locally
5. Sync happens automatically when back online

---

### 3. Queue and Submit Quiz

```jsx
import { queueSubmission, getAllAnswers } from '@/lib/client/quiz-indexeddb';
import { syncNow } from '@/lib/client/offline-sync';

const handleFinishQuiz = async () => {
  try {
    // Get all answers from local storage
    const answers = await getAllAnswers(sessionId);
    const answersMap = answers.reduce((acc, a) => {
      acc[a.questionId] = a.selectedAnswer;
      return acc;
    }, {});

    // Queue the entire submission
    await queueSubmission(
      quizId,
      sessionId,
      studentId,
      sceneId,
      answersMap,
      questions
    );

    // Trigger sync immediately
    await syncNow();

    // Navigate to results
    navigate('/results');
  } catch (error) {
    console.error('Failed to finish quiz:', error);
  }
};
```

**What happens**:
1. All answers queued locally
2. Sync triggered
3. If online: sends to server immediately
4. If offline: queued locally, syncs when online
5. Automatic retry with backoff on failure

---

### 4. Show Offline Status

```jsx
import { OfflineIndicator } from '@/components/quiz/OfflineIndicator';

export function QuizLayout({ children }) {
  return (
    <>
      {/* Automatically shows/hides based on network state */}
      <OfflineIndicator position="top" compact={true} />
      
      {children}
    </>
  );
}
```

**OfflineIndicator Props**:
- `position`: 'top' | 'bottom' (default: 'top')
- `compact`: true | false (default: false) - condensed vs full view
- `onSyncClick`: callback when user clicks sync button

**Shows When**:
- ✅ Offline
- ✅ Pending submissions waiting to sync
- ✅ Sync in progress
- ✅ Last sync time

---

### 5. Add Mobile Gestures

```jsx
import { QuizPlayerMobile } from '@/components/quiz/QuizPlayerMobile';

// Option A: Use the pre-made mobile component
<QuizPlayerMobile
  questions={questions}
  sessionId={sessionId}
  onSubmitAnswer={handleSubmit}
  onFinishQuiz={handleFinish}
  enableGestures={true}    // Swipe to navigate
  enableHaptics={true}      // Vibration feedback
/>

// Option B: Manual gesture setup
import { GestureDetector } from '@/lib/client/gestures';

useEffect(() => {
  if (!containerRef.current) return;

  const detector = new GestureDetector(containerRef.current, {
    minSwipeDistance: 50,
    onSwipeLeft: () => nextQuestion(),     // Swipe left = next
    onSwipeRight: () => previousQuestion(), // Swipe right = prev
  });

  return () => detector.destroy();
}, []);
```

**Gestures Supported**:
- ✅ Swipe left → Next question
- ✅ Swipe right → Previous question
- ✅ Swipe up → Show answer history
- ✅ Swipe down → Show timer info
- ✅ Long press → Show options

---

### 6. Add Haptic Feedback

```jsx
import { useHaptics, QuizHaptics } from '@/lib/client/haptics';

export function MyQuizComponent() {
  const haptics = useHaptics();

  const handleAnswerClick = () => {
    haptics.quiz.answerSelected();  // Light pulse
    // ... handle answer
  };

  const handleSubmit = async () => {
    haptics.quiz.answerSubmitted(); // Success pulse
    await submitAnswer();
  };

  const handleTimeWarning = () => {
    haptics.quiz.timerWarning(); // Warning pattern
  };

  // Check if device supports haptics
  if (!haptics.supported) {
    console.log('Haptics not supported on this device');
  }

  return (
    // ... components
  );
}
```

**Available Haptics**:
- `hapticSelection()` - Light tap (20ms)
- `hapticSuccess()` - Success feedback (40ms)
- `hapticError()` - Error feedback (100ms)
- `hapticWarning()` - Warning pattern
- `hapticDouble()` - Two taps
- `hapticHeavy()` - Strong feedback (150ms)
- `hapticPattern([50, 30, 50])` - Custom pattern

**Quiz-Specific**:
- `QuizHaptics.answerSelected()`
- `QuizHaptics.answerSubmitted()`
- `QuizHaptics.quizCompleted()`
- `QuizHaptics.timerWarning()`
- `QuizHaptics.timeUp()`
- `QuizHaptics.navigate()`
- `QuizHaptics.syncCompleted()`

---

### 7. Monitor Sync Status

```jsx
import { useOfflineSync } from '@/lib/hooks/use-offline-sync';

export function SyncStatusMonitor() {
  const { syncStatus, isInitialized, sync } = useOfflineSync();

  if (!isInitialized || !syncStatus) return null;

  return (
    <div>
      <p>State: {syncStatus.state}</p>
      <p>Pending: {syncStatus.pendingCount}</p>
      <p>Synced: {syncStatus.totalSynced}</p>
      
      {syncStatus.state === 'offline' && (
        <p>🔴 Offline - answers saved locally</p>
      )}

      {syncStatus.state === 'syncing' && (
        <p>🔄 Syncing {syncStatus.pendingCount} answer(s)...</p>
      )}

      {syncStatus.state === 'error' && (
        <p>⚠️ Error: {syncStatus.lastError}</p>
      )}

      {syncStatus.lastSyncTime && (
        <p>Last sync: {new Date(syncStatus.lastSyncTime).toLocaleTimeString()}</p>
      )}

      <button onClick={sync} disabled={syncStatus.state === 'syncing'}>
        Sync Now
      </button>
    </div>
  );
}
```

**syncStatus Object**:
- `state`: 'idle' | 'syncing' | 'success' | 'error' | 'offline'
- `pendingCount`: Number of submissions waiting to sync
- `totalSynced`: Lifetime count of synced submissions
- `lastError`: Last error message if any
- `lastSyncTime`: ISO timestamp of last successful sync

---

### 8. Track Performance

```jsx
import {
  initializePerformanceMonitoring,
  measureComponentRender,
  sendMetric,
} from '@/lib/client/performance';

// On app initialization
useEffect(() => {
  initializePerformanceMonitoring();
}, []);

// Measure specific component
useEffect(() => {
  const duration = measureComponentRender('QuizList', () => {
    // Component render logic
  });
  console.log(`QuizList rendered in ${duration}ms`);
}, []);

// Send custom metric
const handleQuizStart = () => {
  sendMetric('QuizStart', Date.now());
};

// Check performance budgets
import { checkPerformanceBudgets } from '@/lib/client/performance';

const { passed, violations } = checkPerformanceBudgets({
  LCP: 2000,
  FID: 80,
  CLS: 0.05,
});

if (!passed) {
  console.warn('Performance issues:', violations);
}
```

---

## OFFLINE FLOW WALKTHROUGH

### Complete Scenario: Student Takes Quiz Offline

**Scenario**: 
- Student loads quiz on 4G
- Gets on subway (no signal)
- Answers all questions
- Gets signal back
- Answers sync automatically

**Step-by-Step**:

1. **Load Quiz (Online)**
   ```
   Quiz loaded from server
   ↓
   cacheQuizData() stores in IndexedDB
   ↓
   Service Worker caches questions
   ↓
   "Quiz ready for offline use"
   ```

2. **Network Drops**
   ```
   Online detector notices no signal
   ↓
   OfflineIndicator shows: "🔴 Offline"
   ↓
   All submission attempts queued locally
   ```

3. **Answer Questions (Offline)**
   ```
   User selects answer
   ↓
   saveAnswer() → IndexedDB (instant)
   ↓
   Try to submit to server (fails silently)
   ↓
   User continues, answers are safe locally
   ```

4. **Finish Quiz (Offline)**
   ```
   User submits quiz
   ↓
   getAllAnswers() → collects all answers
   ↓
   queueSubmission() → creates submission record
   ↓
   syncNow() tries to submit (queued because offline)
   ```

5. **Network Restored**
   ```
   Online detector notices signal restored
   ↓
   Service Worker triggers background sync
   ↓
   getSyncManager() starts syncing submissions
   ↓
   POST /api/quiz-submissions with all answers
   ↓
   On success: mark as synced, clear local copy
   ↓
   OfflineIndicator shows: "✅ All synced"
   ```

**User Experience**:
- Seamless quiz taking
- No data loss
- Clear status indicators
- Automatic sync (no manual intervention)
- Can retry if sync fails

---

## TESTING CHECKLIST

### Manual Testing

- [ ] Load quiz
- [ ] Go offline (DevTools > Network > Offline)
- [ ] Answer questions
- [ ] Verify answers saved (DevTools > Application > IndexedDB)
- [ ] Go online
- [ ] Verify auto-sync happens
- [ ] Check server received all answers

### Device Testing

- [ ] iPhone (test in Simulator)
- [ ] Android (test in Emulator)
- [ ] Test portrait + landscape
- [ ] Test with 4G throttling
- [ ] Test with 3G throttling
- [ ] Test flight mode

### Edge Cases

- [ ] Quiz data expired (>24h) - should re-cache
- [ ] Max retries exceeded - show error
- [ ] Submission quota exceeded - graceful error
- [ ] IndexedDB quota exceeded - cleanup old data
- [ ] Service Worker update available - show prompt

---

## TROUBLESHOOTING

### Service Worker Not Registering

```
Error: Failed to register service worker
```

**Check**:
1. `/public/sw.js` exists
2. App served over HTTPS (or localhost)
3. Check browser console for errors
4. Try: `navigator.serviceWorker.unregister()` + reload

### IndexedDB Not Working

```
Error: Failed to initialize quiz database
```

**Check**:
1. Private/incognito mode disables IndexedDB
2. Browser allows at least 50MB quota
3. Not in WebWorker context
4. Check browser console for quota errors

### Offline Sync Not Happening

```
Submitted answers not syncing
```

**Check**:
1. Is network actually detected as offline? 
   - Open DevTools Network tab
   - Should show "offline" status
2. Are answers saved locally?
   - Open DevTools Application > IndexedDB
   - Check `submissions` table
3. Check sync logs:
   ```javascript
   import { getSyncHistory } from '@/lib/client/offline-sync';
   console.log(getSyncHistory());
   ```

### Performance Issues

```
Quiz player slow to load
```

**Check**:
1. Bundle size: `npm run build` and check `.next/static/`
2. Network throttling: DevTools > Network > add throttling
3. Memory leaks: DevTools > Memory > take heap snapshots
4. Long tasks: DevTools > Performance > record and check
5. Render performance: DevTools > React Profiler

---

## API REFERENCE

### IndexedDB Utilities
Location: `/lib/client/quiz-indexeddb.ts`

```typescript
// Quiz Data
cacheQuizData(quizId, questions): Promise<QuizData>
getQuizData(quizId): Promise<QuizData | null>

// Answers
saveAnswer(quizId, questionId, sessionId, answer, timeTaken): Promise<StoredAnswer>
getAnswer(sessionId, questionId): Promise<StoredAnswer | null>
getAllAnswers(sessionId): Promise<StoredAnswer[]>
markAnswerSynced(answerId): Promise<void>

// Submissions
queueSubmission(...): Promise<SubmissionQueue>
getPendingSubmissions(): Promise<SubmissionQueue[]>
updateSubmissionStatus(submissionId, synced, error): Promise<void>

// Sessions
createSession(...): Promise<QuizSession>
updateSessionProgress(sessionId, answeredCount): Promise<void>
completeSession(sessionId): Promise<void>

// Maintenance
cleanupExpiredData(): Promise<void>
getStorageUsage(): Promise<{usage, quota, percentage}>
requestPersistentStorage(): Promise<boolean>
```

### Offline Sync
Location: `/lib/client/offline-sync.ts`

```typescript
getSyncManager(): SyncManager
initializeSyncManager(): SyncManager

// Sync control
syncNow(): Promise<void>
retryFailedSubmissions(): Promise<void>
getSyncStatus(): SyncStatus

// Monitoring
subscribeSyncStatus(listener): () => void  // Unsubscribe function
isOffline(): boolean
getSyncHistory(): {totalSynced, lastSyncTime, lastError}
```

### Performance Monitoring
Location: `/lib/client/performance.ts`

```typescript
initializePerformanceMonitoring(): void
monitorCoreWebVitals(): void
getPerformanceMetrics(): PerformanceMetrics
sendMetric(name, value): void
measureComponentRender(name, callback): number
markPerformance(name): () => number
checkPerformanceBudgets(metrics): {passed, violations}
```

### Gestures
Location: `/lib/client/gestures.ts`

```typescript
new GestureDetector(element, config): GestureDetector
disablePinchZoom(element): () => void
new DoubleTapDetector(element, onDoubleTap): DoubleTapDetector
```

### Haptics
Location: `/lib/client/haptics.ts`

```typescript
supportsHaptics(): boolean
hapticPulse(duration): boolean
hapticPattern(pattern): boolean
hapticSuccess/Error/Warning(): boolean or void
useHaptics(): {supported, pulse, success, error, quiz}
```

---

## PERFORMANCE TARGETS

### Core Web Vitals (Lighthouse)
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

### Bundle Size
- Main chunk: < 150KB
- Quiz player chunk: < 50KB
- Total JS: < 300KB gzipped

### Mobile Performance
- Time to interactive (4G): < 3s
- Time to interactive (3G): < 8s
- First contentful paint: < 1.8s

### Offline Performance
- Save answer to IndexedDB: < 50ms
- Queue submission: < 100ms
- Sync 100 submissions: < 5s

---

## NEXT STEPS

1. **Immediate (Today)**
   - [ ] Choose integration option (QuizPlayerWithOfflineSupport recommended)
   - [ ] Add to quiz page
   - [ ] Test basic offline flow

2. **Short Term (This Week)**
   - [ ] Add app icons to `/public/icons/`
   - [ ] Test on real mobile devices
   - [ ] Measure performance baseline
   - [ ] Train customer support on offline feature

3. **Medium Term (This Sprint)**
   - [ ] Code splitting implementation
   - [ ] Image optimization
   - [ ] Performance optimization
   - [ ] Comprehensive mobile testing

4. **Long Term (Future)**
   - [ ] Push notification support
   - [ ] Quiz sharing via Web Share API
   - [ ] Offline study mode with pre-loaded content
   - [ ] Video caching for lessons

