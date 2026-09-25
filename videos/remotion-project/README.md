# DailyAgile Remotion Video Project

Professional tutorial videos for the DailyAgile Quiz MVP platform.

## Quick Start

```bash
# Install dependencies
npm install

# Start Remotion Studio (preview & edit)
npm run start
# Opens http://localhost:3000

# Render all 3 videos
npm run render:all

# Render individual videos
npm run render:quiz-create
npm run render:quiz-take
npm run render:quiz-extend
```

## Videos

| Video | File | Duration | Purpose |
|-------|------|----------|---------|
| How to Create a Quiz | `QuizCreateTutorial.tsx` | 60 sec | Instructor tutorial |
| How to Take a Quiz | `QuizTakeTutorial.tsx` | 60 sec | Student tutorial |
| How to Request an Extension | `QuizExtensionTutorial.tsx` | 60 sec | Student tutorial |

## Project Structure

```
src/
├── Root.tsx                     ← Entry point (all compositions)
├── compositions/
│   ├── QuizCreateTutorial.tsx   ← Video 1
│   ├── QuizTakeTutorial.tsx     ← Video 2
│   └── QuizExtensionTutorial.tsx ← Video 3
└── lib/
    ├── brandColors.ts          ← DailyAgile brand colors
    └── animations.ts           ← Reusable animation utilities
```

## Configuration

All videos are configured in `remotion.config.ts`:
- Duration: 60 seconds (1800 frames at 30fps)
- Resolution: 1920x1080 (1080p)
- Codec: H.264 MP4
- Frame rate: 30fps

## Brand Colors

All videos use DailyAgile brand colors (from `src/lib/brandColors.ts`):

```typescript
navy:   #1E3A5F  // Primary, headers
teal:   #0891B2  // Accent, highlights
orange: #EA580C  // CTAs, emphasis
light:  #F0F7FA  // Card backgrounds
dark:   #1E293B  // Body text
gray:   #64748B  // Secondary text
white:  #FFFFFF  // Page backgrounds
```

## Animations

Common animations are in `src/lib/animations.ts`:
- `fadeIn()` — Fade element in (30 frames)
- `fadeOut()` — Fade element out (30 frames)
- `slideInLeft()` — Slide from left (40 frames)
- `slideInRight()` — Slide from right (40 frames)
- `scaleUp()` — Scale up animation (30 frames)
- `pulse()` — Bounce effect (20 frames)

Example usage:
```tsx
<h1 style={{ opacity: fadeIn(frame, 0, 30) }}>
  Title
</h1>
```

## Rendering

### Via CLI (Batch Rendering)

```bash
# Render all videos
npm run render:all

# Render one video
npx remotion render src/Root.tsx QuizCreateTutorial dist/quiz-create.mp4
```

### Via UI (Interactive)

```bash
# Start Remotion Studio
npm run start

# In browser:
# 1. Select composition from sidebar
# 2. Preview and adjust timing
# 3. Click "Render" → choose MP4
# 4. Wait for completion
```

## Rendering Quality Settings

**Current (High Quality):**
```
CRF: 18 (best quality, ~40MB per 60-sec video)
Codec: H.264
Format: MP4
```

**Options:**
- CRF 15-18: High quality (slower, 50-60MB)
- CRF 20-23: Medium quality (faster, 20-30MB)
- CRF 28+: Low quality (fastest, <10MB)

## Script Integration (Next Phase)

Once the Product Agent provides scripts, they'll be added as:

```
scripts/
├── quiz-create-script.txt       ← 60-word voiceover script
├── quiz-take-script.txt
└── quiz-extend-script.txt
```

Scripts will be integrated as:
1. Text overlays in compositions (synchronized to 60-sec timeline)
2. Voiceover audio (ElevenLabs TTS or manual recording)
3. Background music (royalty-free, ~20-30 seconds)

## Troubleshooting

### Remotion Studio won't start
```bash
rm -rf node_modules package-lock.json
npm install
npm run start
```

### Render is too slow
- Use a lower CRF value (e.g., 23 instead of 18)
- Temporarily reduce resolution for testing
- Close other applications

### Text not readable
- Minimum font size: 28px for body text
- Use high contrast colors (dark on light or vice versa)
- Add text shadow for readability on complex backgrounds

### File size too large (>50MB)
- Reduce CRF value in render command
- Trim unnecessary frames
- Ensure H.264 codec is used

## Output Files

Rendered videos are saved to `dist/`:
- `quiz-create.mp4` (~40MB, 60 sec)
- `quiz-take.mp4` (~40MB, 60 sec)
- `quiz-extend.mp4` (~40MB, 60 sec)

## YouTube Upload

**Steps:**
1. Upload MP4 file to YouTube
2. Set visibility to "Unlisted"
3. Add title: "DailyAgile - How to [Action]"
4. Add description (see template in main guide)
5. Enable auto-captions (YouTube feature)
6. Copy embed code for help center

**Embed Example:**
```html
<iframe width="560" height="315" 
  src="https://www.youtube.com/embed/VIDEO_ID" 
  frameborder="0" allowfullscreen></iframe>
```

## Documentation

See `REMOTION_VIDEO_PRODUCTION_GUIDE.md` for:
- Complete production workflow
- Video composition breakdown
- YouTube upload instructions
- Troubleshooting guide
- Dependencies & timelines

## Dependencies

- `remotion` — Video rendering framework
- `react` & `react-dom` — Component library
- `elevenlabs` — Text-to-speech (optional)

See `package.json` for full list.

## Timeline

- **Days 1-3:** Setup & composition templates ✅
- **Days 4-5:** Script integration & voiceover
- **Day 6:** Rendering & YouTube upload
- **Day 7:** Embedding in help center

## Contact

**Remotion Video Agent**  
**Sprint:** 11-15 Day Quiz MVP  
**Last Updated:** August 12, 2026

---

*This project is part of the DailyAgile Quiz MVP sprint. For full sprint details, see SPRINT_MVP_SPECIFICATION.md in the project root.*
