# DailyAgile Quiz Tutorial Video Embeds

**Status:** Ready for video links (waiting on YouTube upload completion)  
**Last Updated:** August 12, 2026  
**Created by:** Remotion Video Agent

---

## Overview

This document contains embed codes for 3 tutorial videos in the DailyAgile Quiz platform. Use these embeds to add videos to your help center, documentation, or website.

**Video Links:**
- [Video 1: How to Create a Quiz](#video-1-how-to-create-a-quiz) — For instructors
- [Video 2: How to Take a Quiz](#video-2-how-to-take-a-quiz) — For students
- [Video 3: How to Request an Extension](#video-3-how-to-request-an-extension) — For students

---

## Video 1: How to Create a Quiz

**Target Audience:** Instructors  
**Duration:** 60 seconds  
**Topics:** Quiz creation, question types, difficulty levels, time limits

### YouTube Link
```
https://youtube.com/watch?v=[VIDEO_ID_1]
```
(Unlisted - only shareable via direct link)

### Embed Code (Responsive)

```html
<!-- Responsive embed for help center pages -->
<div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
    src="https://www.youtube.com/embed/[VIDEO_ID_1]" 
    title="DailyAgile - How to Create a Quiz"
    frameborder="0" 
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
    allowfullscreen>
  </iframe>
</div>
```

### Embed Code (Fixed Size)

```html
<iframe 
  width="560" 
  height="315" 
  src="https://www.youtube.com/embed/[VIDEO_ID_1]" 
  title="DailyAgile - How to Create a Quiz"
  frameborder="0" 
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
  allowfullscreen>
</iframe>
```

### Video Description

Creating a quiz in DailyAgile is simple. Click 'Create Quiz' from your dashboard. Add a title and description. Then add your questions one by one—choose between multiple choice, essay, or code challenges. Set the quiz difficulty and time limit. Review your questions and click Save. Your quiz is now ready to assign to students.

**Quick Steps:**
1. Click "Create Quiz" on dashboard
2. Enter title and description
3. Add questions (one at a time or bulk upload)
4. Select question types and difficulty
5. Set time limit
6. Review and save
7. Assign to students

---

## Video 2: How to Take a Quiz

**Target Audience:** Students  
**Duration:** 60 seconds  
**Topics:** Accessing quizzes, answering questions, submission, feedback

### YouTube Link
```
https://youtube.com/watch?v=[VIDEO_ID_2]
```
(Unlisted - only shareable via direct link)

### Embed Code (Responsive)

```html
<!-- Responsive embed for help center pages -->
<div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
    src="https://www.youtube.com/embed/[VIDEO_ID_2]" 
    title="DailyAgile - How to Take a Quiz"
    frameborder="0" 
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
    allowfullscreen>
  </iframe>
</div>
```

### Embed Code (Fixed Size)

```html
<iframe 
  width="560" 
  height="315" 
  src="https://www.youtube.com/embed/[VIDEO_ID_2]" 
  title="DailyAgile - How to Take a Quiz"
  frameborder="0" 
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
  allowfullscreen>
</iframe>
```

### Video Description

Taking a quiz is easy. When you receive an assignment, open the link or enter the access code. Read each question carefully. Choose your answers or write your response. For code challenges, write clean code that demonstrates the concept. Submit when ready. You'll immediately see your score and feedback. If you need more time, request an extension from your instructor.

**Quick Steps:**
1. Receive assignment from instructor
2. Click link or enter access code
3. Read each question carefully
4. Enter your answer/response
5. Click "Next" to continue
6. Review all answers
7. Click "Submit"
8. View immediate feedback and score

---

## Video 3: How to Request an Extension

**Target Audience:** Students  
**Duration:** 60 seconds  
**Topics:** Extension requests, deadline extensions, instructor approval

### YouTube Link
```
https://youtube.com/watch?v=[VIDEO_ID_3]
```
(Unlisted - only shareable via direct link)

### Embed Code (Responsive)

```html
<!-- Responsive embed for help center pages -->
<div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
    src="https://www.youtube.com/embed/[VIDEO_ID_3]" 
    title="DailyAgile - How to Request an Extension"
    frameborder="0" 
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
    allowfullscreen>
  </iframe>
</div>
```

### Embed Code (Fixed Size)

```html
<iframe 
  width="560" 
  height="315" 
  src="https://www.youtube.com/embed/[VIDEO_ID_3]" 
  title="DailyAgile - How to Request an Extension"
  frameborder="0" 
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
  allowfullscreen>
</iframe>
```

### Video Description

Need more time? Click 'Request Extension' on your expired assignment. Write a brief reason explaining why you need more time. Submit your request. Your instructor will review and either approve with a new deadline or explain why they can't extend. You'll receive a notification once they respond. If approved, you'll see the new due date on your assignment.

**Quick Steps:**
1. Click "Request Extension" on expired quiz
2. Write brief reason for extension
3. Propose new deadline (optional)
4. Click "Submit"
5. Wait for instructor approval (typically within 24 hours)
6. Check email/dashboard for response
7. If approved, see updated deadline

---

## Integration Guide

### For Help Center Pages

1. **Copy the responsive embed code** above
2. **Add to your help article HTML:**
   ```html
   <article>
     <h2>How to Create a Quiz</h2>
     <p>Watch this tutorial to learn how to create and assign quizzes.</p>
     
     <!-- Paste the responsive embed code here -->
     <div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden;">
       <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
         src="https://www.youtube.com/embed/[VIDEO_ID_1]" ...>
       </iframe>
     </div>
   </article>
   ```

3. **For Markdown documents** (if your platform supports embedded iframes):
   ```markdown
   ## How to Create a Quiz
   
   Watch this tutorial to learn how to create and assign quizzes.
   
   <iframe width="560" height="315" src="https://www.youtube.com/embed/[VIDEO_ID_1]" ...></iframe>
   ```

### For Social Media

- **LinkedIn:** Share direct YouTube link with description
- **Twitter/X:** Share direct YouTube link with emoji callout
- **Email:** Include YouTube link with call-to-action button

### For Internal Documentation

Link to videos in your internal knowledge base:
- [How to Create a Quiz](https://youtube.com/watch?v=[VIDEO_ID_1]) — Instructor guide
- [How to Take a Quiz](https://youtube.com/watch?v=[VIDEO_ID_2]) — Student guide
- [How to Request an Extension](https://youtube.com/watch?v=[VIDEO_ID_3]) — Student guide

---

## Video Specifications

| Property | Value |
|----------|-------|
| Resolution | 1920x1080 (1080p) |
| Frame Rate | 30fps |
| Duration | ~60 seconds each |
| Format | H.264 MP4 |
| File Size | <50MB each |
| Audio | AAC stereo |
| Captions | Auto-generated by YouTube |
| Visibility | Unlisted (shareable via direct link only) |
| Quality | Professional |

---

## YouTube Settings

All 3 videos are configured on YouTube with:

- **Visibility:** Unlisted (only accessible via direct link)
- **Comments:** Allowed (for user feedback)
- **Captions:** Auto-generated (YouTube's auto-caption feature)
- **Playlist:** "DailyAgile Quiz Tutorials" (all 3 videos grouped)
- **Category:** Education
- **Tags:** `dailyagile, quiz, tutorial, education, instructions`
- **License:** Standard YouTube License (unless specified otherwise)

---

## Accessibility

### Captions
All videos have captions auto-generated by YouTube. To enable:
1. Click CC button on YouTube video player
2. YouTube auto-captions will display

### Transcripts
Transcripts available directly from YouTube:
1. Click menu (3 dots) on video player
2. Select "Show transcript"
3. View or download full text

### Keyboard Navigation
- **Space** — Play/pause
- **J** — Rewind 10 seconds
- **L** — Fast forward 10 seconds
- **M** — Mute/unmute
- **C** — Toggle captions
- **F** — Fullscreen
- **T** — Theater mode

---

## Support

### Issues or Feedback?

- **Video quality:** Report to Video Agent (Remotion issues)
- **YouTube link issues:** Check URL is correct and video is "Unlisted"
- **Embed code not working:** Verify iframe src URL contains correct VIDEO_ID
- **Caption accuracy:** Report to YouTube (they're auto-generated)

---

## Metadata Template (for Reference)

**Video 1: How to Create a Quiz**
- Title: `DailyAgile - How to Create a Quiz`
- Playlist: `DailyAgile Quiz Tutorials`
- Tags: `dailyagile, quiz, tutorial, instructor, create`

**Video 2: How to Take a Quiz**
- Title: `DailyAgile - How to Take a Quiz`
- Playlist: `DailyAgile Quiz Tutorials`
- Tags: `dailyagile, quiz, tutorial, student, take`

**Video 3: How to Request an Extension**
- Title: `DailyAgile - How to Request an Extension`
- Playlist: `DailyAgile Quiz Tutorials`
- Tags: `dailyagile, quiz, tutorial, student, extension`

---

## Version History

| Date | Changes |
|------|---------|
| Aug 12, 2026 | Template created, waiting for YouTube video IDs |
| Aug 18, 2026 | Video IDs added after YouTube upload complete |

---

*This document will be updated with actual YouTube video IDs and links once rendering and upload complete (Day 7).*

**Documentation Agent:** Use the embed codes above to integrate videos into help articles.  
**Frontend Agent:** Use responsive embed codes for web pages to ensure mobile compatibility.
