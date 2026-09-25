# DailyAgile Quiz MVP — Video Production Guide

**Status:** Project Setup Complete (Aug 12, 2026)  
**Agent:** Remotion Video Agent  
**Sprint:** 11-15 Day Rapid Sprint (Days 1-15)  
**Timeline:** Video rendering Days 4-7 (after scripts ready)

---

## PROJECT OVERVIEW

This guide covers the production of 3 professional tutorial videos for the DailyAgile Quiz MVP:

1. **"How to Create a Quiz"** (60 seconds, 1080p)
2. **"How to Take a Quiz"** (60 seconds, 1080p)
3. **"How to Request an Extension"** (60 seconds, 1080p)

All videos will be:
- Rendered to MP4 (H.264 codec, 1920x1080, 30fps)
- Uploaded to YouTube (unlisted)
- Embedded in help/documentation pages
- Auto-captioned by YouTube

---

## DIRECTORY STRUCTURE

```
videos/
├── remotion-project/              ← Main Remotion project
│   ├── package.json              ← Dependencies + build scripts
│   ├── remotion.config.ts        ← Remotion configuration
│   ├── tsconfig.json
│   ├── src/
│   │   ├── Root.tsx              ← Entry point (all 3 compositions)
│   │   ├── compositions/
│   │   │   ├── QuizCreateTutorial.tsx    ← Video 1
│   │   │   ├── QuizTakeTutorial.tsx      ← Video 2
│   │   │   └── QuizExtensionTutorial.tsx ← Video 3
│   │   └── lib/
│   │       ├── brandColors.ts    ← DailyAgile brand palette
│   │       └── animations.ts     ← Reusable animation utilities
│   └── dist/                      ← Rendered MP4 files (output)
│
├── scripts/                       ← Video production scripts
│   └── render-all.sh            ← Batch render all 3 videos
│
├── voiceovers/                    ← Audio files (TTS or ElevenLabs)
│   ├── quiz-create-voiceover.mp3
│   ├── quiz-take-voiceover.mp3
│   └── quiz-extend-voiceover.mp3
│
└── REMOTION_VIDEO_PRODUCTION_GUIDE.md ← This file
```

---

## SETUP INSTRUCTIONS

### 1. Install Dependencies

```bash
cd /Users/apgo21/dailyagile-platform/videos/remotion-project
npm install
```

This installs:
- `remotion` (video rendering framework)
- `react` & `react-dom` (component framework)
- `elevenlabs` (text-to-speech, optional)

### 2. Verify Setup

```bash
npm run start
```

This opens Remotion Studio at `http://localhost:3000` where you can:
- Preview all 3 video compositions
- Adjust timing and animations
- Test text/imagery in real-time
- Render individual videos

### 3. Configure Brand Assets

Brand colors are already set in `src/lib/brandColors.ts`:
- **Navy:** #1E3A5F (primary, headers)
- **Teal:** #0891B2 (accent, highlights)
- **Orange:** #EA580C (CTAs, emphasis)
- **Light:** #F0F7FA (card backgrounds)
- **Dark:** #1E293B (body text)
- **Gray:** #64748B (secondary text)

These are applied automatically in all 3 compositions.

---

## VIDEO SCRIPTS (Waiting)

The **Product Agent** is writing 3 scripts (60 words each). Once ready, they'll be placed here:

```
scripts/
├── quiz-create-script.txt
├── quiz-take-script.txt
└── quiz-extend-script.txt
```

### Expected Format

```
[Video Title]
Voiceover Script (60 words, ~25 seconds of narration):
"[Narration text here]"

Script Markers:
- 0:00-0:05 Introduction
- 0:05-0:35 Main content
- 0:35-0:55 Action/demo
- 0:55-1:00 Closing CTA
```

Once scripts arrive, they'll be **integrated into each composition** as text overlays synced with voiceover.

---

## PRODUCTION WORKFLOW

### Phase 1: Pre-Production (Days 1-3)
- [x] Set up Remotion project
- [x] Create 3 composition templates
- [x] Configure brand colors & animations
- [ ] Receive scripts from Product Agent

### Phase 2: Development (Days 4-5)
Once scripts are ready:
- [ ] Integrate narration scripts into each composition
- [ ] Adjust animation timing to match voiceover pacing
- [ ] Preview in Remotion Studio
- [ ] Fine-tune text readability (font size, contrast)
- [ ] Add background music (royalty-free)

### Phase 3: Audio Production (Day 5)
- [ ] Generate voiceover via ElevenLabs TTS or manual recording
- [ ] Trim/edit audio to exactly 60 seconds
- [ ] Sync audio with video animations
- [ ] Export as MP3 files

### Phase 4: Rendering (Day 6)
```bash
# Render all 3 videos
npm run render:all

# Output files:
# - dist/quiz-create.mp4 (~40MB)
# - dist/quiz-take.mp4 (~40MB)
# - dist/quiz-extend.mp4 (~40MB)
```

Target: Each video should be **under 50MB** for YouTube.

### Phase 5: Upload to YouTube (Day 6-7)
1. Create YouTube account (or use existing)
2. Upload each MP4 with metadata:
   - **Title:** "DailyAgile - How to [Action]"
   - **Description:** Includes link to quiz platform
   - **Visibility:** Unlisted (shareable via link, not in search)
   - **Captions:** Auto-generate (YouTube)

3. Get embed links:
   ```html
   <iframe width="560" height="315" src="https://www.youtube.com/embed/VIDEO_ID" frameborder="0" allowfullscreen></iframe>
   ```

### Phase 6: Integration (Day 7)
- [ ] Create `/docs/video-embeds.md` with all embed codes
- [ ] Frontend Agent embeds in help center pages
- [ ] Test playback on staging environment

---

## VIDEO COMPOSITION BREAKDOWN

### Video 1: "How to Create a Quiz" (60 sec)
**Location:** `src/compositions/QuizCreateTutorial.tsx`

**Visual Sequence:**
1. **Intro (0:00-0:03)** — Navy background, animated title
2. **Dashboard (0:03-0:15)** — Show instructor dashboard, highlight "Create Quiz" button
3. **Form (0:15-0:30)** — Form fields fill with sample data (title, time limit)
4. **Success (0:30-0:42)** — Checkmark animation, "Quiz Created!" with assignment code
5. **Closing (0:42-1:00)** — Text overlay: "Ready to assign to students"

**Brand Elements:**
- Navy background (primary)
- Teal "Create Quiz" button (accent)
- Orange "Save" button (CTA)
- Large, readable text (32px+ for body)

---

### Video 2: "How to Take a Quiz" (60 sec)
**Location:** `src/compositions/QuizTakeTutorial.tsx`

**Visual Sequence:**
1. **Intro (0:00-0:03)** — Teal background, animated title
2. **Email (0:03-0:15)** — Show email notification with assignment code
3. **Enter Code (0:15-0:30)** — Student enters code → quiz loads
4. **Question (0:30-0:45)** — Show quiz UI with question, options, timer
5. **Results (0:45-1:00)** — Score display (85%), certificate badge animation

**Brand Elements:**
- Teal background (accent)
- Navy header text (primary)
- Orange timer (emphasis)
- Large score display (64px)

---

### Video 3: "How to Request an Extension" (60 sec)
**Location:** `src/compositions/QuizExtensionTutorial.tsx`

**Visual Sequence:**
1. **Intro (0:00-0:03)** — Orange background, animated title
2. **Expired (0:03-0:15)** — Show "Time's Up" error message
3. **Button (0:15-0:30)** — Highlight "Request Extension" button
4. **Form (0:30-0:45)** — Form fields: reason, new deadline
5. **Confirmation (0:45-1:00)** — Checkmark, "Request Sent!" message

**Brand Elements:**
- Orange background (CTA/emphasis)
- Navy text (primary)
- Teal "Submit" button (accent)
- Red alert box (#FEE2E2) for expired state

---

## ANIMATION GUIDELINES

All animations are defined in `src/lib/animations.ts`:

| Animation | Purpose | Duration |
|-----------|---------|----------|
| `fadeIn` | Fade element in | 30 frames (~1 sec) |
| `fadeOut` | Fade element out | 30 frames (~1 sec) |
| `slideInLeft` | Slide in from left | 40 frames (~1.3 sec) |
| `slideInRight` | Slide in from right | 40 frames (~1.3 sec) |
| `scaleUp` | Grow element | 30 frames (~1 sec) |
| `pulse` | Bounce/attention effect | 20 frames (~0.7 sec) |

**Usage in Compositions:**
```tsx
<h1 style={{ opacity: fadeIn(frame, 0, 30) }}>
  How to Create a Quiz
</h1>
```

Keep animations **smooth and subtle** — don't distract from content.

---

## RENDERING OPTIONS

### Option 1: Render via CLI (Fastest)

```bash
# Render single video
npm run render:quiz-create

# Render all 3
npm run render:all

# Render with custom settings
npx remotion render src/Root.tsx QuizCreateTutorial \
  --output-format=mp4 \
  --codec=h264 \
  --crf=18 \
  dist/quiz-create.mp4
```

### Option 2: Render via UI (Interactive)

1. Run `npm run start`
2. In Remotion Studio:
   - Select composition from left sidebar
   - Click "Render" button
   - Choose format: MP4
   - Wait for render to complete

### Render Settings

**Recommended for YouTube:**
- **Codec:** H.264 (mp4-compatible)
- **CRF:** 18 (high quality, ~40MB per 60-sec video)
- **Resolution:** 1920x1080 (1080p)
- **FPS:** 30 (standard for web)
- **Audio:** AAC 128kbps

---

## QUALITY CHECKLIST (Before Upload)

Before uploading to YouTube, verify:

### Visual Quality
- [ ] Text is readable at 1080p (test on mobile too)
- [ ] Colors match DailyAgile brand (use eyedropper to verify hex codes)
- [ ] Animations are smooth (30fps, no stuttering)
- [ ] No jarring transitions between sections
- [ ] Logo/branding visible in all key sections

### Audio
- [ ] Voiceover is clear and audible (above background music if present)
- [ ] Audio matches video pacing (no long silences)
- [ ] Total duration is exactly 60 seconds
- [ ] No clipping or distortion
- [ ] Volume levels consistent across all 3 videos

### Technical
- [ ] File size under 50MB each
- [ ] Codec: H.264, MP4 container
- [ ] Resolution: 1920x1080
- [ ] Frame rate: 30fps
- [ ] Audio: AAC, stereo

### Content
- [ ] All text is accurate (no typos)
- [ ] Call-to-action is clear at the end
- [ ] Flows naturally (intro → content → closing)
- [ ] No copyrighted music/images
- [ ] Captions will be auto-generated by YouTube

---

## YOUTUBE UPLOAD TEMPLATE

**Video 1: How to Create a Quiz**
```
Title: DailyAgile - How to Create a Quiz
Description:
Learn how to create quizzes in the DailyAgile platform.

1. Click "Create Quiz"
2. Fill in quiz details (title, time limit)
3. Add questions
4. Publish & assign to students

Watch the full tutorial or visit our help center:
https://dailyagile.com/help/quiz-creation

#DailyAgile #Quiz #Tutorial #OnlineAssessment

Visibility: Unlisted
```

**Video 2: How to Take a Quiz**
```
Title: DailyAgile - How to Take a Quiz
Description:
Step-by-step guide for students taking quizzes in DailyAgile.

1. Receive assignment code via email
2. Visit dailyagile.com/quiz/enter-code
3. Enter your code
4. Answer questions & submit
5. View your score instantly

Learn more: https://dailyagile.com/help/student-guide

#DailyAgile #Quiz #StudentGuide #OnlineAssessment

Visibility: Unlisted
```

**Video 3: How to Request an Extension**
```
Title: DailyAgile - How to Request an Extension
Description:
Need more time? Learn how to request a quiz extension.

1. If a quiz has expired, click "Request Extension"
2. Explain why you need more time
3. Propose a new deadline
4. Submit your request
5. Wait for instructor approval (within 24 hours)

Help Center: https://dailyagile.com/help/extensions

#DailyAgile #Quiz #Extension #StudentSupport

Visibility: Unlisted
```

---

## TROUBLESHOOTING

### Issue: Remotion Studio won't start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run start
```

### Issue: Video renders too slowly
- Lower CRF value (18 → 20+) sacrifices quality for speed
- Reduce resolution temporarily for testing (1920x1080 → 1280x720)
- Close other applications

### Issue: Text not readable
- Increase font size (minimum 28px for body text)
- Add text shadow or background for contrast
- Ensure color contrast ratio ≥ 4.5:1 (WCAG AA)

### Issue: Audio out of sync
- Re-generate audio file to ensure exact 60-second duration
- Adjust composition timeline if audio is shorter/longer
- Test sync in Remotion Studio before rendering

### Issue: File size > 50MB
- Reduce CRF value (higher number = smaller file, lower quality)
- Trim any unnecessary frames
- Use H.264 codec (not ProRes or other formats)

---

## DEPENDENCY: PRODUCT AGENT SCRIPTS

**Status:** ⏳ Awaiting scripts

Once the Product Agent completes:
- 3 scripts (60 words each)
- Detailed voiceover instructions
- Animation timing notes

Then Remotion Agent can:
1. Integrate scripts as text overlays
2. Generate voiceovers (ElevenLabs or TTS)
3. Sync audio with animations
4. Render final videos
5. Upload to YouTube

**Estimated completion:** Days 5-7 of sprint

---

## DELIVERABLES (Day 7)

### Video Files
- `dist/quiz-create.mp4` (1920x1080, ~60 sec, <50MB)
- `dist/quiz-take.mp4` (1920x1080, ~60 sec, <50MB)
- `dist/quiz-extend.mp4` (1920x1080, ~60 sec, <50MB)

### YouTube Links
- https://youtube.com/embed/VIDEO_ID_1 (How to Create)
- https://youtube.com/embed/VIDEO_ID_2 (How to Take)
- https://youtube.com/embed/VIDEO_ID_3 (How to Request)

### Documentation
- `docs/video-embeds.md` (embed codes for all 3 videos)
- `remotion-project/src/` (full source code for future updates)

### Voiceover Files (Backup)
- `voiceovers/quiz-create-voiceover.mp3`
- `voiceovers/quiz-take-voiceover.mp3`
- `voiceovers/quiz-extend-voiceover.mp3`

---

## NEXT STEPS

1. ✅ **Completed:** Remotion project setup
2. ✅ **Completed:** 3 composition templates
3. ⏳ **Waiting:** Scripts from Product Agent
4. **Next:** Integrate scripts → generate voiceovers → render videos
5. **Final:** Upload to YouTube → generate embed codes

**Timeline:** Days 4-7 of sprint (starts after scripts ready)

---

*DailyAgile Video Production Guide — Sprint MVP*  
*Created by: Remotion Video Agent*  
*Last Updated: August 12, 2026*
