# YouTube Upload Guide — Day 7 Action Items

**Project:** DailyAgile Quiz MVP  
**Phase:** Video Upload & Publishing (Day 7)  
**Status:** Ready for YouTube upload (videos rendering)  
**Timeline:** Day 7 — ~1-2 hours for upload + embed code generation

---

## Pre-Upload Checklist

### Account & Access
- [ ] YouTube account active and logged in
- [ ] Channel customized (logo, banner if applicable)
- [ ] Account email verified
- [ ] Two-factor authentication configured (if required)

### Video Files
- [ ] `dist/quiz-create.mp4` exists and playable
- [ ] `dist/quiz-take.mp4` exists and playable
- [ ] `dist/quiz-extend.mp4` exists and playable
- [ ] All files <50MB each
- [ ] All files ~60 seconds duration

### Metadata Ready
- [ ] Video titles prepared
- [ ] Descriptions written
- [ ] Tags prepared
- [ ] Playlist name: "DailyAgile Quiz Tutorials"

---

## Upload Process (Video by Video)

### VIDEO 1: "How to Create a Quiz"

**Step 1: Go to YouTube Studio**
```
https://studio.youtube.com/
```

**Step 2: Upload Video**
1. Click "Create" button (top left)
2. Select "Upload video"
3. Choose file: `dist/quiz-create.mp4`
4. Wait for upload (2-5 minutes)

**Step 3: Add Title**
```
DailyAgile - How to Create a Quiz
```

**Step 4: Add Description**
```
Learn how to create quizzes in the DailyAgile platform.

Steps:
1. Click 'Create Quiz' from your dashboard
2. Add a title and description
3. Add your questions one by one
4. Choose question types (multiple choice, essay, code challenges)
5. Set difficulty level and time limit
6. Review your questions and click Save
7. Your quiz is now ready to assign to students

Quick Tips:
• Use clear, concise question wording
• Mix question types for engagement
• Set realistic time limits based on question count
• Review all answers before publishing

Help Center: https://dailyagile.com/help
Get Started: https://dailyagile.com

#DailyAgile #Quiz #Tutorial #InstructorGuide #OnlineAssessment
```

**Step 5: Configure Settings**
- **Visibility:** Unlisted (only shareable via direct link)
- **Comments:** Allow
- **Captions:** Enable auto-captions (YouTube feature)
- **Category:** Education
- **License:** Standard YouTube License
- **Playlist:** Create "DailyAgile Quiz Tutorials" (check "Add to playlist" → "Create new" → name it)

**Step 6: Add Tags**
```
dailyagile, quiz, tutorial, instructor, create, online-assessment, education
```

**Step 7: Publish**
1. Click "Publish" button
2. Wait for processing (~5-10 minutes)
3. Video will turn "Unlisted" status

**Step 8: Get Video ID**
1. Video published message will show
2. Click on video title or go to Video Details
3. Copy video ID from URL:
   ```
   https://youtube.com/watch?v=XXXXXXXXXX
   ```
   ← That's your VIDEO_ID_1

**Step 9: Copy Embed Code**
1. Click "Share" → "Embed"
2. Copy HTML iframe code
3. Save to notes

---

### VIDEO 2: "How to Take a Quiz"

**Step 1-2: Upload Video**
(Same as Video 1, but use `dist/quiz-take.mp4`)

**Step 3: Add Title**
```
DailyAgile - How to Take a Quiz
```

**Step 4: Add Description**
```
Step-by-step guide for students taking quizzes in DailyAgile.

Steps:
1. Receive an assignment code via email from your instructor
2. Visit https://dailyagile.com/quiz/enter-code
3. Enter your 6-character access code
4. Read each question carefully
5. Choose your answers or write your response
6. For code challenges, write clean code that demonstrates the concept
7. Click Submit when ready
8. View your score and feedback immediately

Bonus Features:
• Review all your answers before submitting
• See detailed feedback for each question
• Check your score breakdown by topic
• Request an extension if you need more time

Student Guide: https://dailyagile.com/help/student-guide

#DailyAgile #Quiz #StudentGuide #Tutorial #OnlineAssessment
```

**Step 5-9: Configure & Publish**
- Add to same playlist: "DailyAgile Quiz Tutorials"
- Visibility: Unlisted
- Tags: `dailyagile, quiz, tutorial, student, take, online-assessment`
- Get VIDEO_ID_2 from URL
- Copy embed code

---

### VIDEO 3: "How to Request an Extension"

**Step 1-2: Upload Video**
(Same as Video 1, but use `dist/quiz-extend.mp4`)

**Step 3: Add Title**
```
DailyAgile - How to Request an Extension
```

**Step 4: Add Description**
```
Learn how to request a quiz extension if you need more time.

Steps:
1. Click 'Request Extension' on your expired assignment
2. Write a brief reason explaining why you need more time
3. Propose a new deadline (optional field)
4. Click Submit
5. Wait for instructor approval (typically within 24 hours)
6. You'll receive email notification when instructor responds
7. If approved, you'll see the new due date on your assignment

Important Notes:
• Be specific about why you need the extension
• Check your email regularly for instructor response
• Extensions are not guaranteed - provide a good reason
• Plan ahead - don't wait until the last minute to request
• Instructors appreciate honest, reasonable requests

Extensions Policy:
Instructors review extension requests based on:
• Reasonableness of the request
• Your submission history
• Course policies on extensions

Help Center: https://dailyagile.com/help/extensions

#DailyAgile #Quiz #Extension #StudentSupport #Tutorial
```

**Step 5-9: Configure & Publish**
- Add to same playlist: "DailyAgile Quiz Tutorials"
- Visibility: Unlisted
- Tags: `dailyagile, quiz, tutorial, student, extension, support`
- Get VIDEO_ID_3 from URL
- Copy embed code

---

## After Upload: Verify & Document

### Verification Checklist
- [ ] Video 1 plays on YouTube (click thumbnail)
- [ ] Video 2 plays on YouTube
- [ ] Video 3 plays on YouTube
- [ ] All 3 videos in "DailyAgile Quiz Tutorials" playlist
- [ ] Visibility shows "Unlisted" for all 3
- [ ] Titles are correct
- [ ] Descriptions complete
- [ ] Auto-captions enabled (CC button works)

### Document Video IDs
```
Video 1 ID: [PASTE_VIDEO_ID_1_HERE]
Video 2 ID: [PASTE_VIDEO_ID_2_HERE]
Video 3 ID: [PASTE_VIDEO_ID_3_HERE]
```

### Document Embed Codes
**Video 1 Embed Code:**
```html
[PASTE_EMBED_CODE_1_HERE]
```

**Video 2 Embed Code:**
```html
[PASTE_EMBED_CODE_2_HERE]
```

**Video 3 Embed Code:**
```html
[PASTE_EMBED_CODE_3_HERE]
```

---

## Update Documentation

### Update `/docs/VIDEO_EMBEDS.md`
1. Replace all `[VIDEO_ID_1]`, `[VIDEO_ID_2]`, `[VIDEO_ID_3]` with actual IDs
2. Replace all placeholder embed codes with actual codes from YouTube
3. Update status: "✅ COMPLETE - Videos uploaded and ready for embedding"

### Test Embed Codes
1. Copy responsive embed code from VIDEO_EMBEDS.md
2. Paste into test HTML page
3. Verify video displays and plays
4. Check on mobile (responsive sizing)
5. Test on tablet

---

## Notify Teams

### Notify Frontend Agent
**Message:**
```
✅ Videos uploaded and ready for embedding

YouTube Links:
- How to Create a Quiz: https://youtube.com/watch?v=[VIDEO_ID_1]
- How to Take a Quiz: https://youtube.com/watch?v=[VIDEO_ID_2]
- How to Request an Extension: https://youtube.com/watch?v=[VIDEO_ID_3]

Embed codes available in: /docs/VIDEO_EMBEDS.md

Use the responsive embed codes for mobile-friendly pages.
All videos are unlisted and auto-captioned.
```

### Notify Documentation Agent
**Message:**
```
✅ Tutorial videos published

You can now link to these videos in your help articles:
- https://youtube.com/watch?v=[VIDEO_ID_1]
- https://youtube.com/watch?v=[VIDEO_ID_2]
- https://youtube.com/watch?v=[VIDEO_ID_3]

All 3 videos are unlisted and in the "DailyAgile Quiz Tutorials" playlist.
YouTube has auto-generated captions for accessibility.
```

---

## Troubleshooting

### Issue: "Video not uploading"
**Solution:**
1. Check file size (should be <50MB)
2. Check file format (must be .mp4)
3. Check internet connection
4. Try uploading to different browser or device

### Issue: "Can't find embed code"
**Solution:**
1. Video must finish processing (5-10 min)
2. Go to video page → Click "Share" → Click "Embed"
3. Copy HTML that appears

### Issue: "Video plays but audio out of sync"
**Solution:**
1. Re-check rendering quality
2. If audio/video significantly out of sync, may need to re-render
3. YouTube auto-sync sometimes helps (wait 24 hours for processing)

### Issue: "Captions not showing"
**Solution:**
1. Click "CC" button on video player
2. YouTube auto-captions may take a few hours to generate
3. If not showing after 24 hours, manually upload captions file

### Issue: "Can't find YouTube playlist"
**Solution:**
1. Go to YouTube Studio home
2. Left sidebar → "Playlists"
3. Should see "DailyAgile Quiz Tutorials"
4. Click to see all 3 videos

---

## Timeline

| Task | Time | Status |
|------|------|--------|
| Upload Video 1 | 10-15 min | ⏳ TBD |
| Upload Video 2 | 10-15 min | ⏳ TBD |
| Upload Video 3 | 10-15 min | ⏳ TBD |
| Get embed codes | 5-10 min | ⏳ TBD |
| Update documentation | 5 min | ⏳ TBD |
| Test embeds | 10 min | ⏳ TBD |
| Notify teams | 5 min | ⏳ TBD |
| **TOTAL** | **50-75 min** | ⏳ **TBD** |

**Expected Completion:** Day 7, mid-morning (before noon if starting early)

---

## Final Checklist (Before Handoff)

- [ ] All 3 videos uploaded to YouTube (unlisted)
- [ ] All 3 videos in "DailyAgile Quiz Tutorials" playlist
- [ ] Video titles correct ("DailyAgile - How to [Action]")
- [ ] Descriptions complete and accurate
- [ ] Auto-captions enabled on all 3
- [ ] Tags applied to all 3
- [ ] `/docs/VIDEO_EMBEDS.md` updated with video IDs and embed codes
- [ ] Embed codes tested and working
- [ ] Frontend Agent notified
- [ ] Documentation Agent notified
- [ ] Ready for embedding in help center pages

---

## Sign-Off

**Remotion Video Agent**  
**Status:** Ready for YouTube upload (videos rendering)  
**Expected Completion:** August 18, 2026 (Day 7)  

*This guide is your complete roadmap for Day 7 YouTube upload. Follow step-by-step, get video IDs, and provide embed codes to Frontend & Docs agents.*

---

**Created:** August 12, 2026  
**Updated:** August 12, 2026 (Rendering in progress)
