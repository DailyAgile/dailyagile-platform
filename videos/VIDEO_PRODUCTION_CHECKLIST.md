# DailyAgile Video Production Checklist

**Sprint:** 11-15 Day Quiz MVP  
**Agent:** Remotion Video Agent  
**Status:** In Progress  
**Created:** August 12, 2026  
**Target Completion:** August 18-19, 2026 (Days 6-7)

---

## PHASE 1: SETUP & INFRASTRUCTURE ✅ COMPLETE

### Project Initialization
- [x] Create `/videos/remotion-project/` directory structure
- [x] Create `package.json` with Remotion + React dependencies
- [x] Create `remotion.config.ts` with video specs (1920x1080, 30fps, 60sec)
- [x] Create `tsconfig.json` for TypeScript support
- [x] Create `.gitignore` rules (dist/, node_modules/, .DS_Store)

### Core Components
- [x] Create `src/Root.tsx` (entry point, all 3 compositions)
- [x] Create `src/lib/brandColors.ts` (DailyAgile color palette)
- [x] Create `src/lib/animations.ts` (reusable animation utilities)

### Composition Templates
- [x] Create `src/compositions/QuizCreateTutorial.tsx` (Video 1 template)
- [x] Create `src/compositions/QuizTakeTutorial.tsx` (Video 2 template)
- [x] Create `src/compositions/QuizExtensionTutorial.tsx` (Video 3 template)

### Configuration & Scripts
- [x] Create `remotion.config.ts` (video settings)
- [x] Create `render-all.sh` (batch render script)
- [x] Update `package.json` build scripts

### Documentation
- [x] Create `README.md` (quick start guide)
- [x] Create `REMOTION_VIDEO_PRODUCTION_GUIDE.md` (comprehensive guide)
- [x] Create `VIDEO_PRODUCTION_CHECKLIST.md` (this file)

### Status
**✅ COMPLETE** — All infrastructure ready. Next step: receive scripts from Product Agent.

---

## PHASE 2: SCRIPT INTEGRATION (WAITING)

### Scripts from Product Agent
- [ ] Receive `scripts/quiz-create-script.txt` (60 words)
- [ ] Receive `scripts/quiz-take-script.txt` (60 words)
- [ ] Receive `scripts/quiz-extend-script.txt` (60 words)
- [ ] Verify script timing matches 60-second video duration

### Script Format
Expected format for each script:
```
[Video Title]

Voiceover Script (60 words, ~25 seconds):
"[Narration text]"

Timing Markers:
- 0:00-0:05 Intro
- 0:05-0:35 Main content
- 0:35-0:55 Action/demo
- 0:55-1:00 Closing CTA
```

### Dependency Status
**STATUS: ⏳ WAITING ON PRODUCT AGENT**

Once scripts arrive, immediately proceed to Phase 3.

**Critical Path:**
- Scripts arrive → integrate into compositions → generate voiceover → render → YouTube upload → embed codes

**Timeline Impact:**
- If scripts delayed 1 day = final videos delayed 1 day
- Scripts must arrive by Day 5 to stay on schedule for Day 6-7 rendering

---

## PHASE 3: AUDIO & ANIMATION (DAYS 4-5)

### Once Scripts Received

#### Text Overlay Integration
- [ ] **Video 1:** Integrate quiz-create script text overlays
- [ ] **Video 2:** Integrate quiz-take script text overlays
- [ ] **Video 3:** Integrate quiz-extend script text overlays
- [ ] Verify text is centered, readable, high-contrast
- [ ] Ensure text overlays sync with 60-second timeline

#### Animation Timing
- [ ] Review frame-by-frame timing in Remotion Studio
- [ ] Adjust animation start/end frames to match narration pacing
- [ ] Test smooth transitions between sections
- [ ] Verify no jarring cuts or long silences
- [ ] Check mobile rendering (1280x720 minimum)

#### Voiceover Generation
Choose one method:

**Option A: ElevenLabs TTS (Recommended)**
- [ ] Set up ElevenLabs API key in `.env`
- [ ] Generate voiceover for Video 1 (quiz-create-script.txt)
- [ ] Generate voiceover for Video 2 (quiz-take-script.txt)
- [ ] Generate voiceover for Video 3 (quiz-extend-script.txt)
- [ ] Export each as MP3 (exactly 60 seconds)
- [ ] Verify audio quality (clear, no clipping, consistent volume)

**Option B: Manual Recording**
- [ ] Record voiceover for all 3 videos
- [ ] Trim to exactly 60 seconds each
- [ ] Normalize audio levels (all videos same volume)
- [ ] Remove background noise
- [ ] Export as MP3 files

**Option C: Text-to-Speech (Free)**
- [ ] Use Google TTS or Piper (free, open-source)
- [ ] Generate MP3 files for all 3 videos
- [ ] Note: Lower quality than ElevenLabs

#### Background Music (Optional)
- [ ] Source royalty-free background music (Epidemic Sound, Artlist, etc.)
- [ ] Choose upbeat, professional tracks (~20-30 seconds each)
- [ ] Fade in at 0:00, fade out at 0:55
- [ ] Ensure volume doesn't overwhelm voiceover
- [ ] Verify copyright/licensing allows commercial use

#### Audio Sync
- [ ] Sync voiceover MP3 with composition animations
- [ ] Test in Remotion Studio (preview mode)
- [ ] Verify timing: narration matches visual changes
- [ ] Check audio levels: voiceover 80%, music 20%
- [ ] Export final audio track as stereo AAC

**Deadline:** End of Day 5

---

## PHASE 4: RENDERING (DAY 6)

### Pre-Render Checklist

Visual Quality:
- [ ] All text readable at 1080p (test on mobile)
- [ ] Colors match DailyAgile brand (verify hex codes)
- [ ] Animations smooth (30fps, no stuttering)
- [ ] No jarring transitions between sections
- [ ] Logo/branding visible in key sections

Audio:
- [ ] Voiceover clear and audible
- [ ] Audio matches video pacing
- [ ] Total duration: exactly 60 seconds
- [ ] No clipping or distortion
- [ ] Volume levels consistent across videos

### Render Videos

```bash
cd /Users/apgo21/dailyagile-platform/videos/remotion-project

# Install dependencies (if not already done)
npm install

# Render all 3 videos
npm run render:all
```

Alternatively, render individually:
```bash
npm run render:quiz-create
npm run render:quiz-take
npm run render:quiz-extend
```

Or via UI:
```bash
npm run start
# Visit http://localhost:3000
# Select composition → Render
```

### Render Settings
- [x] Codec: H.264
- [x] Format: MP4
- [x] Resolution: 1920x1080
- [x] Frame rate: 30fps
- [x] CRF: 18 (high quality, ~40MB per 60-sec video)
- [x] Audio: AAC, stereo, 128kbps

### Post-Render Validation
- [ ] **Video 1:** `dist/quiz-create.mp4` exists and plays
- [ ] **Video 2:** `dist/quiz-take.mp4` exists and plays
- [ ] **Video 3:** `dist/quiz-extend.mp4` exists and plays
- [ ] Each file < 50MB (YouTube upload limit: 256GB, but <50MB is practical)
- [ ] Each video duration = 60 seconds (±1 second)
- [ ] Video plays on desktop (Chrome, Safari, Firefox)
- [ ] Video plays on mobile (iOS Safari, Chrome Mobile)
- [ ] No audio sync issues
- [ ] No visual artifacts or glitches

### Backup
- [ ] Copy `dist/` folder to external backup
- [ ] Store git history (all source in repo)

**Deadline:** End of Day 6

---

## PHASE 5: YOUTUBE UPLOAD (DAY 6-7)

### YouTube Account Setup
- [ ] YouTube account created or verified (use existing if available)
- [ ] Account linked to DailyAgile email (tkiran204@gmail.com or support@dailyagile.com)
- [ ] Channel customized (logo, banner, description)

### Upload Videos

**Video 1: How to Create a Quiz**
- [ ] Upload MP4 file: `dist/quiz-create.mp4`
- [ ] Title: `DailyAgile - How to Create a Quiz`
- [ ] Description: (see template below)
- [ ] Visibility: **Unlisted** (not public, shareable via link)
- [ ] Captions: Enable auto-captions (YouTube feature)
- [ ] Thumbnail: Use auto-generated (or custom)
- [ ] Category: Education
- [ ] Tags: `dailyagile, quiz, tutorial, education`
- [ ] Wait for upload & processing to complete (~5-10 min)
- [ ] Get video ID from URL (e.g., `dQw4w9WgXcQ`)
- [ ] Save URL & embed code

**Video 2: How to Take a Quiz**
- [ ] Upload MP4 file: `dist/quiz-take.mp4`
- [ ] Title: `DailyAgile - How to Take a Quiz`
- [ ] Description: (see template below)
- [ ] Visibility: **Unlisted**
- [ ] Captions: Enable auto-captions
- [ ] Follow same process as Video 1

**Video 3: How to Request an Extension**
- [ ] Upload MP4 file: `dist/quiz-extend.mp4`
- [ ] Title: `DailyAgile - How to Request an Extension`
- [ ] Description: (see template below)
- [ ] Visibility: **Unlisted**
- [ ] Captions: Enable auto-captions
- [ ] Follow same process as Video 1

### Description Templates

**Video 1:**
```
Learn how to create quizzes in the DailyAgile platform.

Steps:
1. Click "Create Quiz" on the instructor dashboard
2. Fill in quiz details (title, time limit, course)
3. Add questions (one at a time or bulk upload JSON)
4. Publish the quiz
5. Assign to students and send invites

Watch more tutorials: https://dailyagile.com/help
Get started: https://dailyagile.com

#DailyAgile #Quiz #Tutorial #InstructorGuide #OnlineAssessment
```

**Video 2:**
```
Step-by-step guide for students taking quizzes in DailyAgile.

Steps:
1. Receive assignment code via email from your instructor
2. Visit https://dailyagile.com/quiz/enter-code
3. Enter your 6-character assignment code
4. Answer quiz questions (one per page)
5. Review your answers before final submission
6. Submit and view your score instantly

Learn more: https://dailyagile.com/help/student-guide

#DailyAgile #Quiz #StudentGuide #OnlineAssessment #Tutorial
```

**Video 3:**
```
Learn how to request a quiz extension if you need more time.

Steps:
1. If a quiz has expired, click "Request Extension"
2. Explain why you need more time (text field)
3. Propose a new deadline
4. Submit your request
5. Wait for instructor approval (within 24 hours)

Your instructor will respond via email and in-app notification.

Help Center: https://dailyagile.com/help/extensions

#DailyAgile #Quiz #Extension #StudentSupport #Tutorial
```

### Video Quality Verification (on YouTube)
- [ ] Video 1 plays without errors
- [ ] Video 2 plays without errors
- [ ] Video 3 plays without errors
- [ ] Auto-captions are accurate (verify first 30 seconds)
- [ ] Thumbnail looks professional
- [ ] Video visible only via direct URL (unlisted confirmed)
- [ ] Comments disabled or enabled (configure as needed)

**Deadline:** End of Day 7

---

## PHASE 6: INTEGRATION & DELIVERY (DAY 7)

### Generate Embed Codes

For each video, get embed code from YouTube:
```html
<!-- Video 1: How to Create a Quiz -->
<iframe width="560" height="315" 
  src="https://www.youtube.com/embed/VIDEO_ID_1" 
  frameborder="0" 
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
  allowfullscreen></iframe>

<!-- Video 2: How to Take a Quiz -->
<iframe width="560" height="315" 
  src="https://www.youtube.com/embed/VIDEO_ID_2" 
  frameborder="0" 
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
  allowfullscreen></iframe>

<!-- Video 3: How to Request an Extension -->
<iframe width="560" height="315" 
  src="https://www.youtube.com/embed/VIDEO_ID_3" 
  frameborder="0" 
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
  allowfullscreen></iframe>
```

### Create Video Embed Documentation
- [ ] Create `docs/VIDEO_EMBEDS.md` (or `/videos/EMBED_CODES.md`)
- [ ] Add all 3 embed codes
- [ ] Add YouTube URLs
- [ ] Add video metadata (duration, resolution, captions)
- [ ] Include instructions for frontend embedding

### Commit to Git
```bash
cd /Users/apgo21/dailyagile-platform
git add videos/
git commit -m "Add Remotion video project with 3 tutorial compositions"
git push origin main
```

### Notify Frontend Agent
- [ ] Send message to Frontend Agent: "Video embed codes ready"
- [ ] Provide YouTube URLs & embed codes
- [ ] Point to `docs/VIDEO_EMBEDS.md`

### Notify Documentation Agent
- [ ] Send message to Documentation Agent: "Video links ready"
- [ ] Provide YouTube URLs (for linking in help docs)

---

## FINAL ACCEPTANCE CRITERIA

### Deliverables Complete ✅
- [x] Remotion project set up & ready for scripts
- [ ] 3 video compositions with placeholder scripts
- [ ] 3 MP4 files rendered (quiz-create, quiz-take, quiz-extend)
- [ ] All files < 50MB each
- [ ] 3 YouTube unlisted links
- [ ] Embed codes for all 3 videos
- [ ] Documentation (README, production guide, embed codes)
- [ ] Source code in git (ready for future updates)

### Quality Standards
- [ ] Text readable at 1080p
- [ ] Brand colors correct (navy, teal, orange)
- [ ] Animations smooth (30fps, no stuttering)
- [ ] Audio clear & synchronized with video
- [ ] Duration exactly 60 seconds each
- [ ] YouTube auto-captions generated
- [ ] Embed codes tested & working

### Timeline Adherence
- [x] Phase 1 (Setup): Complete by Day 3 ✅
- [ ] Phase 2 (Scripts): Complete by Day 5
- [ ] Phase 3 (Audio/Animation): Complete by Day 5
- [ ] Phase 4 (Rendering): Complete by Day 6
- [ ] Phase 5 (YouTube): Complete by Day 7
- [ ] Phase 6 (Integration): Complete by Day 7

---

## SUCCESS METRICS

**Completion:**
- 3 MP4 videos rendered & uploaded to YouTube
- 100% of planned content delivered
- Zero critical bugs in videos
- All embed codes working

**Quality:**
- Video quality rated "Professional" by Product Owner
- Zero playback errors across browsers
- Auto-captions accurate (>95%)
- Audio properly synced to animations

**Timeline:**
- All phases completed by Day 7 (on schedule)
- No blockers from dependencies
- Ready for help center embedding

---

## SIGN-OFF

**Remotion Video Agent**  
**Status:** Phase 1 ✅ Complete | Phases 2-6 ⏳ In Progress  
**Last Updated:** August 12, 2026  
**Next Update:** Upon receipt of scripts from Product Agent

---

*This checklist is a living document. Update as work progresses.*
