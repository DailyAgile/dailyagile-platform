# Progress Bar Preview — Visual Guide

**Component:** `QuizUploadProgress.tsx`  
**Shows:** Real-time upload progress with time estimates

---

## 📊 Upload 50-Question Quiz — Visual Mockup

### Stage 1: Starting Upload (5%)

```
⬆️ Uploading Quiz...                          5%
                                     3 of 50 questions

[█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]  (0-5%)

┌────────────────────────────────────────────┐
│    Elapsed Time   Estimated Total   Time   │
│      1s                   20s      Remaining
│      ↓                     ↓            19s
│   ┌─────────┐         ┌─────────┐   ┌────┐│
│   │  1s     │         │  20s    │   │19s ││
│   └─────────┘         └─────────┘   └────┘│
│                                            │
│ ⏳ Uploading 50 questions to the server...  │
│    Questions: 3/50 • Speed: 0.3 q/s       │
└────────────────────────────────────────────┘
```

---

### Stage 2: Mid-Upload (50%)

```
⬆️ Uploading Quiz...                         50%
                                    25 of 50 questions

[████████████████████░░░░░░░░░░░░░░░░░░░░░░░]  (50%)

┌────────────────────────────────────────────┐
│    Elapsed Time   Estimated Total   Time   │
│      10s                  20s      Remaining
│       ↓                     ↓            10s
│   ┌─────────┐         ┌─────────┐   ┌────┐│
│   │  10s    │         │  20s    │   │10s ││
│   └─────────┘         └─────────┘   └────┘│
│                                            │
│ ⏳ Uploading 50 questions to the server...  │
│    Questions: 25/50 • Speed: 2.5 q/s      │
└────────────────────────────────────────────┘
```

---

### Stage 3: Nearing Completion (90%)

```
⬆️ Uploading Quiz...                         90%
                                    45 of 50 questions

[██████████████████████████████████░░░░░░░░░░]  (90%)

┌────────────────────────────────────────────┐
│    Elapsed Time   Estimated Total   Time   │
│      18s                  20s      Remaining
│       ↓                     ↓             2s
│   ┌─────────┐         ┌─────────┐   ┌────┐│
│   │  18s    │         │  20s    │   │2s  ││
│   └─────────┘         └─────────┘   └────┘│
│                                            │
│ ⏳ Uploading 50 questions to the server...  │
│    Questions: 45/50 • Speed: 2.5 q/s      │
└────────────────────────────────────────────┘
```

---

### Stage 4: Complete! (100%)

```
✅ Upload Complete                          100%
                                    50 of 50 questions

[██████████████████████████████████████████████]  (100% - Green)

┌────────────────────────────────────────────┐
│    Elapsed Time   Estimated Total   Time   │
│      20s                  20s      Saved
│       ↓                     ↓          0s
│   ┌─────────┐         ┌─────────┐   ┌────┐│
│   │  20s    │         │  20s    │   │0s  ││
│   └─────────┘         └─────────┘   └────┘│
│                                            │
│ ✅ All 50 questions uploaded successfully  │
│    Ready to configure quiz settings. Click│
│    "Next" to continue.                    │
└────────────────────────────────────────────┘
```

---

## 🎨 Design Details

### Colors (DailyAgile Branding)

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| Header | Navy | #1E3A5F | Titles, labels |
| Progress Bar (Loading) | Teal | #0891B2 | Upload in progress |
| Progress Bar (Complete) | Green | #22C55E | Upload finished |
| Background | Light | #F0F7FA | Card background |
| Text | Dark | #1E293B | Body text |
| Secondary | Gray | #64748B | Metadata |

---

## 📱 Responsive Behavior

### Desktop (1920x1080)
```
Full width component with 3-column stats
Time boxes: side-by-side
Progress bar: Full width
Status message: Clear and readable
```

### Tablet (768x1024)
```
Full width component with 3-column stats
Time boxes: still side-by-side but slightly smaller
Progress bar: Full width
Status message: Wrapped text if needed
```

### Mobile (480x800)
```
Full width component with 3-column stats
Time boxes: stacked or compressed
Progress bar: Full width
Status message: Readable with word wrap
```

---

## ⏱️ Time Estimate Examples

### Small Quiz (10 questions)

```
Time needed: ~2-4 seconds

0s:    0% (0/10)
1s:    50% (5/10) — Estimated total: 2s
2s:    100% (10/10) — Complete! ✅
```

### Medium Quiz (50 questions)

```
Time needed: ~8-12 seconds

0s:    0% (0/50)
5s:    50% (25/50) — Estimated total: 10s
10s:   100% (50/50) — Complete! ✅
```

### Large Quiz (100 questions)

```
Time needed: ~15-25 seconds

0s:    0% (0/100)
10s:   50% (50/100) — Estimated total: 20s
20s:   100% (100/100) — Complete! ✅
```

---

## 🔄 State Transitions

```
[IDLE]
  ↓
[UPLOADING] ← Progress bar visible, animating
  ├─ 0-9% complete
  ├─ 10-49% complete
  ├─ 50-89% complete
  ├─ 90-99% complete
  ↓
[COMPLETE] ← Progress bar turns green, auto-advances
  ↓
[SETTINGS] ← User configures quiz title/description/etc
```

---

## 💾 Data Displayed

### Real-Time Metrics

| Metric | Example | Updates |
|--------|---------|---------|
| Percentage | 50% | Every 200ms |
| Questions Loaded | 25/50 | Every 200ms |
| Elapsed Time | 10s | Every 1s |
| Estimated Total | 20s | Every 200ms (recalculated) |
| Time Remaining | 10s | Every 1s |
| Speed | 2.5 q/s | Every 200ms |

### How Speed is Calculated

```
Speed (q/s) = Questions Loaded / Elapsed Time

Example:
- At 5s: 12 questions loaded → Speed = 12/5 = 2.4 q/s
- At 10s: 25 questions loaded → Speed = 25/10 = 2.5 q/s
- At 15s: 40 questions loaded → Speed = 40/15 = 2.67 q/s
```

### How Estimated Total is Calculated

```
Estimated Total (s) = Elapsed Time / (Questions Loaded / Total)

Example:
- At 5s with 12/50 loaded: 5 / (12/50) = 5 / 0.24 = 20.8s
- At 10s with 25/50 loaded: 10 / (25/50) = 10 / 0.5 = 20s
- At 15s with 40/50 loaded: 15 / (40/50) = 15 / 0.8 = 18.75s
```

---

## 🎯 User Experience Flow

```
1. User clicks "Create Quiz"
   ↓
2. Progress bar slides in smoothly
   ↓
3. Animated spinner while uploading
   ↓
4. Real-time percentages update every 200ms
   ↓
5. Status message updates in real-time
   ↓
6. When complete (100%), progress bar turns green
   ↓
7. Auto-advances to next step after 500ms
   ↓
8. User continues with quiz configuration
```

---

## ✨ Animation Details

| Animation | Duration | Effect |
|-----------|----------|--------|
| Progress bar fill | 300ms | Smooth linear fill |
| Color change (green) | 300ms | Smooth transition |
| Spinner rotation | 1s | Continuous rotation |
| Auto-advance | 500ms | Wait before next step |
| Text updates | Instant | No animation, crisp updates |

---

## 🔧 Technical Implementation

### Component Props
```typescript
interface QuizUploadProgressProps {
  totalQuestions: number;      // e.g., 50
  isVisible: boolean;           // Show/hide component
  onComplete?: () => void;      // Called when 100% complete
}
```

### State Updates
```typescript
// Updates every 200ms
- questionsLoaded: number
- elapsedTime: number (seconds)
- estimatedTotalTime: number (seconds)
```

### Performance
- Component unmounts when `isVisible={false}`
- Intervals cleared on unmount
- No unnecessary re-renders
- Smooth 60fps animations

---

## 🎓 Educational Value

The progress bar teaches users:
- ✅ How long uploads take
- ✅ Real-time speed metrics
- ✅ Time management (estimated vs. remaining)
- ✅ Upload is happening (visual feedback)
- ✅ Professional UX (like cloud storage)

---

## 📸 Screenshot Mockup

When a 50-question CSV uploads:

```
────────────────────────────────────────────────────────
  DailyAgile Quiz Creator — Step 4: Creating Quiz
────────────────────────────────────────────────────────

    ⬆️ UPLOADING QUIZ                        75%
                                  37 of 50 QUESTIONS

    ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░

┌───────────────────────────────────────────────────┐
│  ELAPSED TIME         TOTAL TIME      REMAINING  │
│      12s                  16s               4s   │
│   ┌───────────┐      ┌───────────┐    ┌──────┐  │
│   │    12s    │      │    16s    │    │  4s  │  │
│   └───────────┘      └───────────┘    └──────┘  │
│                                                  │
│ ⏳ Uploading 50 questions to the server...      │
│    Questions: 37/50 • Speed: 3.1 q/s            │
└───────────────────────────────────────────────────┘

   [← Back]                          [Next (disabled) →]
────────────────────────────────────────────────────────
```

---

## ✅ Testing the Progress Bar

When you test locally, you'll see:

1. **Upload starts** → Progress bar appears with 0%
2. **Every 200ms** → Numbers update smoothly
3. **At 100%** → Progress bar turns green
4. **After complete** → Auto-advances to quiz settings

Try uploading `sample-quiz.csv` (10 questions) to see it happen in seconds!

---

**Once Supabase is configured, you'll see this in action! 🚀**
