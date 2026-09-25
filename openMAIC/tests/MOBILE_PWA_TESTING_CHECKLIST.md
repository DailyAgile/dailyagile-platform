# Mobile PWA Testing Checklist

**Timeline:** Days 6-7  
**Devices:** iOS Safari (12, 14, 15), Android Chrome (latest 3 versions)  
**Focus:** PWA features, offline functionality, responsive design

---

## PWA Installation & Setup

### iOS Safari
- [ ] Open app in Safari
- [ ] Tap Share button
- [ ] Select "Add to Home Screen"
- [ ] App installs successfully
- [ ] App icon appears on home screen
- [ ] App can be launched from home screen
- [ ] No browser chrome when running as PWA
- [ ] Status bar style matches app theme

### Android Chrome
- [ ] Open app in Chrome
- [ ] Tap menu (⋮)
- [ ] Select "Install app" or "Add to Home screen"
- [ ] Installation dialog appears
- [ ] App installs successfully
- [ ] App launches in fullscreen mode
- [ ] App works without Chrome UI

---

## Offline Functionality

### Offline Quiz Access
- [ ] Quiz questions display offline
- [ ] Student can view cached quiz content
- [ ] Timer continues to work offline
- [ ] Answer selection works offline
- [ ] Offline indicator displayed ("Working offline")

### Offline Answer Submission
- [ ] Submit answer offline → queued message shown
- [ ] Answers stored in IndexedDB
- [ ] Connection returns → automatic sync
- [ ] "Synced" confirmation shown
- [ ] No duplicate submissions after sync
- [ ] Sync status visible to user

### Offline Dashboard
- [ ] Dashboard loads from cache
- [ ] Previous quiz scores visible
- [ ] Quiz list shows cached data
- [ ] Can navigate between offline views
- [ ] Refresh indicator shows when sync needed

---

## Responsive Design

### iPhone 12 (390 x 844)
- [ ] No horizontal scrolling
- [ ] Text readable (min 16px)
- [ ] Buttons easily tappable (44px min)
- [ ] Form inputs not zoomed on focus
- [ ] Navigation accessible
- [ ] Quiz timer visible
- [ ] Progress bar readable

### iPhone 14 (430 x 932)
- [ ] Layout adapts correctly
- [ ] Same checks as iPhone 12

### iPhone 15 (430 x 932 with notch)
- [ ] Content not hidden behind notch
- [ ] Notch safe area respected
- [ ] Status bar readable

### iPad (11-inch, landscape)
- [ ] Multi-column layout if available
- [ ] Touch targets appropriately sized
- [ ] Split-screen mode works
- [ ] Landscape orientation supported

### Android (Galaxy S23, 360 x 800)
- [ ] No horizontal scrolling
- [ ] Touch targets > 44x44px
- [ ] Navigation accessible
- [ ] Forms properly aligned

### Android (Tablet, landscape)
- [ ] Layout optimized for landscape
- [ ] Multi-column layout if applicable
- [ ] No wasted space

---

## Touch & Interaction

### Button Interactions
- [ ] All buttons > 44x44px
- [ ] Adequate spacing between buttons (8px min)
- [ ] Buttons don't require precision tap
- [ ] Visual feedback on tap (color change, ripple)
- [ ] No accidental double-tap issues

### Form Inputs
- [ ] Input fields > 44x44px
- [ ] Touch doesn't zoom to input (viewport-fit)
- [ ] Keyboard doesn't obscure submit button
- [ ] Form submits on keyboard "Return" key
- [ ] Error messages easily readable

### Quiz Navigation
- [ ] Next/Previous buttons easily tappable
- [ ] Timer visible and readable
- [ ] Question progress clear
- [ ] Scrolling smooth (no jank)
- [ ] Swiping gestures work if implemented

### Long Lists
- [ ] Scrolling is smooth
- [ ] No frame drops
- [ ] Virtual scrolling for 1000+ items
- [ ] Pagination works correctly

---

## Performance on Mobile

### Load Time
- [ ] Initial load < 3 seconds (slow 4G)
- [ ] Dashboard < 2 seconds
- [ ] Quiz page < 2 seconds
- [ ] Results < 2 seconds

### Runtime Performance
- [ ] Quiz interaction smooth (60fps)
- [ ] No lag when typing in forms
- [ ] Scrolling smooth
- [ ] Animations smooth
- [ ] CPU usage reasonable

### Memory
- [ ] App doesn't crash on long quizzes (30+ min)
- [ ] Memory doesn't leak during session
- [ ] Switching back and forth doesn't crash

---

## Orientation & Rotation

### Portrait to Landscape
- [ ] Layout adapts smoothly
- [ ] No content loss
- [ ] Timer continues correctly
- [ ] No flickering
- [ ] Quiz state preserved

### Landscape to Portrait
- [ ] Layout adapts smoothly
- [ ] Same checks as above

### Lock Orientation
- [ ] Option to lock orientation (if needed)
- [ ] Works across iOS/Android

---

## Network Conditions

### WiFi
- [ ] All features work normally
- [ ] Loading indicators appear

### 4G LTE
- [ ] App loads in < 5 seconds
- [ ] No timeout errors
- [ ] Images load progressively

### Slow 3G (simulated)
- [ ] App still usable
- [ ] Graceful loading indicators
- [ ] No unexplained hangs

### 2G (edge case)
- [ ] Doesn't crash
- [ ] Appropriate timeout messages
- [ ] Retry functionality works

### Network Change (WiFi → LTE)
- [ ] Seamless transition
- [ ] No connection errors
- [ ] Ongoing requests continue

---

## Safari-Specific Issues (iOS)

### Known iOS Quirks
- [ ] Input autofill works
- [ ] Camera/file upload works in forms
- [ ] Date picker displays correctly
- [ ] Keyboard doesn't hide form
- [ ] Shake-to-undo doesn't interfere
- [ ] Text selection works correctly

### iOS Permissions
- [ ] Camera access request (if needed)
- [ ] Location request (if needed)
- [ ] Notification request works

---

## Chrome-Specific Issues (Android)

### Android Quirks
- [ ] Back button behavior is correct
- [ ] Long-press context menu doesn't interfere
- [ ] Hardware keyboard works
- [ ] Share dialog works

---

## Accessibility on Mobile

### Keyboard Navigation
- [ ] All interactive elements reachable via keyboard
- [ ] Tab order logical
- [ ] No keyboard traps
- [ ] Focus visible

### Screen Reader (iOS VoiceOver)
- [ ] VoiceOver reads content correctly
- [ ] Button labels clear
- [ ] Form labels associated
- [ ] Images have alt text
- [ ] Quiz questions readable

### Screen Reader (Android TalkBack)
- [ ] Same checks as VoiceOver
- [ ] Gesture navigation works

### Text Scaling
- [ ] Text readable at 200% zoom
- [ ] Layout doesn't break
- [ ] No horizontal scrolling at 200%

---

## Battery & Data Usage

### Battery
- [ ] App doesn't excessively drain battery
- [ ] Background processes stopped when minimized
- [ ] No continuous polling when not in focus

### Data Usage
- [ ] Offline quiz doesn't use data
- [ ] Images compressed appropriately
- [ ] API requests minimal
- [ ] Service worker caching works

---

## iOS-Specific PWA Issues

### Limitations to Document
- [ ] Geolocation may be limited
- [ ] Notification badges may not work
- [ ] Push notifications not supported
- [ ] Share target not fully supported
- [ ] Background sync limited
- [ ] Storage limited (< 50MB reliable)

### Workarounds Implemented
- [ ] Document iOS limitations in app
- [ ] Provide web version link if needed
- [ ] Test available features thoroughly

---

## Bug Report Template

```
Title: [iOS Safari] Quiz timer fails on iPhone 12

Device: iPhone 12, iOS 16.5
Browser: Safari
Steps:
1. Open app
2. Start quiz with 10 minute timer
3. Minimize app for 2 minutes
4. Return to app

Expected: Timer continues from ~8 minutes remaining
Actual: Timer resets to 10 minutes

Screenshot/Video: [attached]
```

---

## Test Results Summary

**Test Date:** ___________  
**Tester:** ___________

| Device | iOS/Android | Pass | Issues |
|--------|-----------|------|--------|
| iPhone 12 | iOS 16 | ☐ | |
| iPhone 14 | iOS 17 | ☐ | |
| iPhone 15 | iOS 17 | ☐ | |
| Samsung S23 | Android 13 | ☐ | |
| Samsung S24 | Android 14 | ☐ | |
| iPad Air | iOS 17 | ☐ | |

---

**Sign Off:**
- QA Lead: ___________
- Date: ___________
- Go/No-Go: ☐ GO ☐ NO-GO

---

*Last updated: 2026-08-12*
