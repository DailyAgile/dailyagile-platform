# Days 4-7 Execution Plan — Video Rendering & YouTube Upload

**Status:** BUILD PHASE ACTIVATED ✅  
**Date:** August 12, 2026 (Day 1 → Starting Days 4-7)  
**Agent:** Remotion Video Agent  
**Target Completion:** August 18, 2026 (Day 7)

---

## PHASE STATUS

✅ **Phase 1: Setup** — COMPLETE
✅ **Phase 2: Scripts** — RECEIVED & INTEGRATED
⏳ **Phase 3: Audio Production** — IN PROGRESS
⏳ **Phase 4: Rendering** — READY TO START (Day 6)
⏳ **Phase 5: YouTube Upload** — READY TO START (Day 7)

---

## WHAT'S BEEN COMPLETED (Today)

### 1. Scripts Received & Saved
✅ `/scripts/quiz-create-script.txt` (62 words)
✅ `/scripts/quiz-take-script.txt` (61 words)
✅ `/scripts/quiz-extend-script.txt` (60 words)

### 2. Scripts Integrated into Compositions
✅ Updated `QuizCreateTutorial.tsx` with script details
✅ Updated `QuizTakeTutorial.tsx` with script details
✅ Updated `QuizExtensionTutorial.tsx` with script details

---

## DAYS 4-5: SCRIPT INTEGRATION & AUDIO PRODUCTION

### Step 1: Voiceover Generation (Day 4-5)

**Option A: ElevenLabs TTS (Recommended)**
```bash
# Set up ElevenLabs API
export ELEVENLABS_API_KEY="[your-api-key]"

# Generate voiceovers (using free tier)
# Each script is 60-62 words, should take 25-30 seconds to narrate

# Video 1: How to Create a Quiz (62 words, ~30 sec)
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Creating a quiz in DailyAgile is simple. Click Create Quiz from your dashboard. Add a title and description. Then add your questions one by one—choose between multiple choice, essay, or code challenges. Set the quiz difficulty and time limit. Review your questions and click Save. Your quiz is now ready to assign to students.",
    "model_id": "eleven_monolingual_v1",
    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
  }' \
  --output voiceovers/quiz-create-voiceover.mp3

# Video 2: How to Take a Quiz (61 words, ~30 sec)
# Video 3: How to Request an Extension (60 words, ~30 sec)
# [Repeat for videos 2 and 3]
```

**Option B: Google Cloud TTS (Free tier)**
- 500K characters/month free
- Higher quality, natural voice
- Requires Google Cloud account setup

**Option C: Piper (Open Source, Free)**
- No API key needed
- Runs locally
- Lower quality but sufficient for tutorials
- Install: `pip install piper-tts`
- Use: `piper --model en_US-amy-medium --output-file output.wav "Your text here"`

### Step 2: Audio Sync (Day 4-5)

Timeline for each video (1800 frames = 60 seconds):
- **0:00-0:03** (90 frames): Intro/title
- **0:03-0:30** (810 frames): Main narration
- **0:30-0:60** (900 frames): Action/demonstration + closing

Audio placement strategy:
1. Generate 25-30 second voiceover per video
2. Verify audio is exactly 60 seconds (pad with silence if needed)
3. Test audio + video sync in Remotion Studio
4. Verify: narration matches visual transitions

### Step 3: Remotion Studio Test (Day 4-5)

```bash
cd /Users/apgo21/dailyagile-platform/videos/remotion-project

# Install dependencies
npm install

# Start Remotion Studio (preview mode)
npm run start
# Opens http://localhost:3000

# In browser:
# 1. Select "QuizCreateTutorial" from left sidebar
# 2. Click "Play" to preview
# 3. Check: animations smooth, timing correct
# 4. Check: text readable at 1080p
# 5. Check: colors match brand guidelines
# 6. Repeat for other 2 compositions
```

**Acceptance Criteria for Testing:**
- ✅ All 3 compositions preview without errors
- ✅ Animations smooth (30fps)
- ✅ Text readable and centered
- ✅ Brand colors correct
- ✅ Duration ~60 seconds each
- ✅ No console errors

---

## DAY 6: VIDEO RENDERING

### Rendering Command

```bash
cd /Users/apgo21/dailyagile-platform/videos/remotion-project

# Render all 3 videos (takes ~2-3 hours total)
npm run render:all

# Alternatively, render individually:
npm run render:quiz-create  # ~45 min
npm run render:quiz-take    # ~45 min
npm run render:quiz-extend  # ~45 min
```

### Expected Output

```
dist/
├── quiz-create.mp4    (~40MB, 1920x1080, 60 sec, H.264)
├── quiz-take.mp4      (~40MB, 1920x1080, 60 sec, H.264)
└── quiz-extend.mp4    (~40MB, 1920x1080, 60 sec, H.264)
```

### Post-Render Verification (Day 6, after rendering)

**File Size Check:**
```bash
ls -lh dist/*.mp4

# Expected output:
# -rw-r--r--  1 user  staff   38M  Aug 18 12:00 quiz-create.mp4
# -rw-r--r--  1 user  staff   39M  Aug 18 12:30 quiz-take.mp4
# -rw-r--r--  1 user  staff   41M  Aug 18 13:00 quiz-extend.mp4
```

**Quality Verification:**
- ✅ Each file < 50MB
- ✅ Playback: Opens in VLC/QuickTime
- ✅ No corruption or artifacts
- ✅ Audio synced properly
- ✅ Duration: exactly 60 seconds (±1 sec tolerance)
- ✅ Resolution: 1920x1080
- ✅ Frame rate: 30fps

**Test on Multiple Players:**
- ✅ VLC Media Player
- ✅ QuickTime
- ✅ Web browser (HTML5 video)
- ✅ Mobile device (iOS/Android)

---

## DAYS 6-7: YOUTUBE UPLOAD

### Pre-Upload Checklist

**Account Setup:**
- [ ] YouTube account active
- [ ] Channel customized (logo, banner)
- [ ] Account email verified
- [ ] Two-factor authentication (if applicable)

**Video Preparation:**
- [ ] 3 MP4 files ready (in dist/ folder)
- [ ] Video titles prepared
- [ ] Descriptions written
- [ ] Metadata ready

### Upload Process

**Video 1: "How to Create a Quiz"**

1. Go to YouTube Studio (`studio.youtube.com`)
2. Click "Create" → "Upload video"
3. Select: `dist/quiz-create.mp4`
4. **Title:** `DailyAgile - How to Create a Quiz`
5. **Description:**
   ```
   Learn how to create quizzes in the DailyAgile platform.

   Steps:
   1. Click 'Create Quiz' from your dashboard
   2. Add a title and description
   3. Add your questions one by one
   4. Choose question types (multiple choice, essay, code)
   5. Set difficulty and time limit
   6. Review and click Save
   7. Ready to assign to students

   Help Center: https://dailyagile.com/help
   Get Started: https://dailyagile.com

   #DailyAgile #Quiz #Tutorial #InstructorGuide
   ```
6. **Visibility:** Unlisted (only shareable via link)
7. **Comments:** Allow (for feedback)
8. **Captions:** Auto-generate (YouTube will auto-caption)
9. **Category:** Education
10. **Playlist:** Create "DailyAgile Quiz Tutorials" (add all 3 videos)
11. **Tags:** `dailyagile, quiz, tutorial, education, instructions`
12. Click "Publish"
13. Wait for processing (~5-10 minutes)
14. Copy video ID from URL (e.g., `https://youtube.com/watch?v=dQw4w9WgXcQ` → ID is `dQw4w9WgXcQ`)

**Video 2: "How to Take a Quiz"**
- Title: `DailyAgile - How to Take a Quiz`
- Description: (see template below)
- Repeat steps 1-14

**Video 3: "How to Request an Extension"**
- Title: `DailyAgile - How to Request an Extension`
- Description: (see template below)
- Repeat steps 1-14

### Description Templates

**Video 2: "How to Take a Quiz"**
```
Step-by-step guide for students taking quizzes in DailyAgile.

Steps:
1. Receive assignment code via email
2. Visit https://dailyagile.com/quiz/enter-code
3. Enter your 6-character access code
4. Read each question carefully
5. Choose your answers or write your response
6. For code challenges, write clean code
7. Submit when ready
8. View your score and feedback immediately

Need more time? Request an extension from your instructor.

Student Guide: https://dailyagile.com/help/student-guide

#DailyAgile #Quiz #StudentGuide #Tutorial
```

**Video 3: "How to Request an Extension"**
```
Learn how to request a quiz extension if you need more time.

Steps:
1. Click 'Request Extension' on expired assignment
2. Write a brief reason explaining your need
3. Propose a new deadline (optional)
4. Submit your request
5. Wait for instructor approval (within 24 hours)
6. You'll receive notification when they respond
7. If approved, see new due date on assignment

Help Center: https://dailyagile.com/help/extensions

#DailyAgile #Quiz #Extension #StudentSupport
```

---

## EMBED CODE GENERATION (Day 7)

After uploading, each video will have a YouTube URL:
```
https://youtube.com/watch?v=VIDEO_ID
```

Get embed code:
1. On YouTube video page, click "Share" → "Embed"
2. Copy HTML code
3. Save to documentation

**Example embed code:**
```html
<iframe 
  width="560" 
  height="315" 
  src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
  frameborder="0" 
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
  allowfullscreen>
</iframe>
```

---

## CREATE EMBED DOCUMENTATION (Day 7)

Create `/docs/VIDEO_EMBEDS.md`:

```markdown
# DailyAgile Quiz Tutorial Video Embeds

Use these embed codes to add tutorial videos to your help center pages.

## Video 1: How to Create a Quiz

YouTube: [Link]
Embed Code:
\`\`\`html
<iframe ...>
\`\`\`

## Video 2: How to Take a Quiz

YouTube: [Link]
Embed Code:
\`\`\`html
<iframe ...>
\`\`\`

## Video 3: How to Request an Extension

YouTube: [Link]
Embed Code:
\`\`\`html
<iframe ...>
\`\`\`
```

---

## TIMELINE SUMMARY

| Phase | Timeline | Status | Owner |
|-------|----------|--------|-------|
| Setup | Days 1-3 | ✅ COMPLETE | Video Agent |
| Script Integration | Days 4-5 | ✅ IN PROGRESS | Video Agent |
| Audio Production | Days 4-5 | ⏳ NEXT | Video Agent |
| Remotion Test | Days 4-5 | ⏳ NEXT | Video Agent |
| Rendering | Day 6 | ⏳ NEXT | Video Agent |
| YouTube Upload | Days 6-7 | ⏳ NEXT | Video Agent |
| Embed Codes | Day 7 | ⏳ NEXT | Video Agent |

---

## DELIVERABLES CHECKLIST

**By End of Day 7:**

- [ ] 3 MP4 video files rendered (quiz-create.mp4, quiz-take.mp4, quiz-extend.mp4)
- [ ] All files < 50MB each
- [ ] All files duration 60 seconds (±1 sec)
- [ ] 3 videos uploaded to YouTube (unlisted)
- [ ] YouTube auto-captions generated
- [ ] 3 shareable embed codes created
- [ ] `/docs/VIDEO_EMBEDS.md` created with all embed codes
- [ ] Video links sent to Frontend Agent
- [ ] Documentation Agent notified

**Quality Metrics:**
- ✅ Professional appearance (brand colors, animations smooth)
- ✅ Audio clear and synced
- ✅ Text readable at 1080p
- ✅ No playback errors
- ✅ YouTube captions accurate (>95%)

---

## BLOCKERS & CONTINGENCIES

| Risk | Mitigation | Backup Plan |
|------|-----------|-----------|
| Rendering takes too long | Start rendering early morning | Use faster machine or cloud rendering |
| Audio quality poor | Test early, use ElevenLabs | Use pre-recorded voiceover |
| YouTube upload slow | Upload overnight | Use Vimeo as backup |
| API key issues | Test credentials now | Manual upload to YouTube |

---

## DAILY STANDUP FORMAT (Days 4-7)

**9:00 AM Daily Report:**

```
[REMOTION VIDEO AGENT]
✅ Completed yesterday:
  - [Specific deliverable]

🔄 In progress today:
  - [Current task, % complete]
  - [Expected completion time]

🚫 Blocked by:
  - [If any]

⚡ Notes:
  - Rendering progress
  - File sizes
  - Any quality issues
```

---

## SUCCESS CRITERIA (End of Day 7)

**All of these must be true:**

✅ 3 MP4 videos rendered successfully  
✅ All files < 50MB each  
✅ All files exactly ~60 seconds  
✅ YouTube upload successful (unlisted)  
✅ Auto-captions generated by YouTube  
✅ Embed codes extracted and documented  
✅ No critical quality issues  
✅ Ready for Frontend embedding  

**If all ✅, then PHASE COMPLETE and ready for handoff to Frontend Agent.**

---

## SIGN-OFF

**Agent:** Remotion Video Agent  
**Status:** Days 4-7 execution plan ready  
**Estimated Completion:** August 18, 2026 (Day 7)  
**No blockers identified**

---

*This plan is the roadmap for Days 4-7. Update daily as work progresses.*
