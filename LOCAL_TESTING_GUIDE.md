# Local Testing Guide — CSV Quiz Module

**Last Updated:** August 10, 2026  
**Status:** Ready for Local Testing

---

## Quick Start (5 minutes)

### 1. Start the Dev Server

```bash
cd /Users/apgo21/dailyagile-platform/openMAIC
npm run dev
```

The server will start at `http://localhost:3000`

### 2. Test Instructor Flow

Open in browser: **http://localhost:3000/instructor/quiz/create**

You should see:
- Page title: "Create Quiz from CSV"
- Upload area with drag-and-drop
- "Download CSV Template" button

### 3. Test Student Flow

Open in browser: **http://localhost:3000/student/quiz/test-quiz-id**

(Note: Will fail with "quiz not found" — that's expected since we haven't created a real quiz yet)

---

## Step-by-Step Testing

### Phase 1: Instructor Workflow (10 minutes)

#### Step 1a: Upload CSV

1. Navigate to: **http://localhost:3000/instructor/quiz/create**
2. Click "Download CSV Template" button
3. Save the template file to your computer
4. Drag-and-drop the template onto the upload area
5. **Expected Result:** File loads, shows "quiz-template.csv" with a ✓ checkmark

#### Step 1b: Validation

After uploading, you should see:
- Page title: "CSV Validated Successfully"
- Quiz summary showing:
  - "5 Questions" (from template)
  - "50 Total Points"
  - "~8 Min Duration"
- "Proceed to Settings" button (enabled)

**If you see errors instead:**
- This is OK — the template might need minor formatting fixes
- Click "Upload Different File"
- Create your own CSV using the format below

#### Step 1c: Configure Quiz

Click "Proceed to Settings" button. You should see:
- Text input for "Quiz Title" (required)
- Textarea for "Quiz Description" (optional)
- Checkbox: "Show Answers After Submit" (checked by default)
- Dropdown: "Allow Retakes" (default: 3)
- Slider: "Passing Score" (default: 70%)
- "Create Quiz" button at bottom

#### Step 1d: Fill Out Settings

1. **Quiz Title:** Type "Module 1: AI Fundamentals"
2. **Description:** Type "Introduction to AI concepts and terminology"
3. **Show Answers:** Leave checked
4. **Retakes:** Keep at 3
5. **Passing Score:** Keep at 70%
6. Click **"Create Quiz"** button

#### Step 1e: Success Page

You should see:
- ✓ Success checkmark icon
- "Quiz Created Successfully! 🎉"
- Quiz ID (copy this for student testing)
- "5 questions • 50 points • ~8 min"
- Buttons: "Create Another Quiz" and "View Quiz"

---

### Phase 2: Student Workflow (10 minutes)

**Prerequisites:** You must have completed Phase 1 and have a quiz ID

#### Step 2a: Start Quiz

1. Copy the Quiz ID from the success page
2. Navigate to: **http://localhost:3000/student/quiz/[PASTE_QUIZ_ID_HERE]**
3. **Expected Result:** Page loads with quiz title and "Loading quiz..." spinner

#### Step 2b: Quiz Player Appears

You should see:
- Large title "Module 1: AI Fundamentals"
- Question counter: "Question 1 of 5"
- Timer countdown (e.g., "60s")
- Question text (e.g., "What is Artificial Intelligence?")
- 5 radio button options (A, B, C, D, E)
- "Submit Answer" button (disabled until you select an option)
- Progress bar at top
- 10×5 question grid navigator at bottom

#### Step 2c: Take Quiz (5 Questions)

For each question:
1. Read the question text
2. Click one of the 5 radio options (A-E)
3. Watch the timer count down
4. Click "Submit Answer"
5. **Expected Result:** 
   - Button text changes to "Next"
   - Question navigator shows green checkmark
   - Auto-advance to next question after 500ms

#### Step 2d: Last Question

On Question 5:
- After submitting the answer
- "Next" button changes to "View Results" (orange button)
- Click it

#### Step 2e: Results Page

You should see:
- Large score display (e.g., "45/50 = 90%")
- Pass/Fail badge ("Congratulations! 🎉" in green if ≥ 70%)
- 4 stat boxes:
  - "45 Points Earned"
  - "90% Percentage"
  - "5 Correct Answers"
  - "5 Total Questions"
- Action buttons: "Download Certificate" + "Retry Quiz" + "Back to Classroom"

#### Step 2f: Question Breakdown

Scroll down to see all 5 questions. Each question card shows:
- ✓ or ✗ icon (green or red)
- Question text
- Your answer
- Correct answer (if wrong)
- Points earned

Click any question to expand and see:
- All 5 options with highlighting
- Explanation text
- "Learn More" link (clickable, opens in new tab)
- Time taken

---

## Sample CSV File

### Create `test-quiz.csv`

Copy and paste this content into a new file called `test-quiz.csv`:

```csv
question_number,question,timer_seconds,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,source_link
1,"What is Artificial Intelligence?",60,"Robots only","Computer systems that perform tasks requiring human intelligence","Science fiction only","A programming language","Future technology only",B,"AI refers to computer systems designed to perform tasks that typically require human intelligence, such as learning and reasoning.",https://en.wikipedia.org/wiki/Artificial_intelligence
2,"Which is a type of machine learning?",45,"Rule-based systems","Supervised learning where models learn from labeled data","Expert systems only","Template matching","Symbolic reasoning",B,"Supervised learning is a machine learning approach where models learn patterns from labeled training data pairs.",https://en.wikipedia.org/wiki/Supervised_learning
3,"What do neural networks use?",75,"Boolean algebra","Artificial neurons inspired by biological neural systems","Fuzzy logic only","Probability trees","State machines",B,"Neural networks are inspired by biological neurons and their interconnections, arranged in layers that process information.",https://en.wikipedia.org/wiki/Artificial_neural_network
4,"What is the purpose of data preprocessing?",50,"To make data look pretty","To clean and prepare data for model training","To reduce file size","To encrypt sensitive data","To backup data",B,"Data preprocessing involves cleaning, transforming, and preparing raw data so machine learning models can learn from it effectively.",https://en.wikipedia.org/wiki/Data_preprocessing
5,"Which algorithm is used for classification?",55,"Linear regression","Decision trees that categorize data into classes","K-means clustering","Principal component analysis","Dimensionality reduction",B,"Decision trees are commonly used for classification tasks as they can learn to partition data into different classes based on features.",https://en.wikipedia.org/wiki/Decision_tree
```

### Upload Steps

1. Save the CSV content above to a file named `test-quiz.csv`
2. Go to **http://localhost:3000/instructor/quiz/create**
3. Drag-and-drop `test-quiz.csv` onto the upload area
4. Proceed through validation and settings
5. Create the quiz

---

## Testing Checklist

### UI/UX Testing

#### Instructor Upload Page
- [ ] Page loads without errors
- [ ] Drag-and-drop area is visible and highlighted on hover
- [ ] "Choose File" button works
- [ ] "Download CSV Template" button works (downloads quiz-template.csv)
- [ ] File input accepts CSV files only
- [ ] Size validation works (try uploading >10MB file)
- [ ] After upload, shows file name with ✓ checkmark

#### Validation Page
- [ ] Valid CSV shows green success banner
- [ ] Total questions displayed correctly
- [ ] Total points calculated correctly
- [ ] Estimated duration shown (minutes)
- [ ] "Proceed to Settings" button enabled
- [ ] "Upload Different File" button works
- [ ] Invalid CSV shows red error banner with details
- [ ] Error messages show row number and column name

#### Settings Form
- [ ] Quiz title input is focused by default
- [ ] Title is marked as required
- [ ] Description textarea is optional
- [ ] Toggle for "Show Answers" works (checked by default)
- [ ] Retakes dropdown shows options (1, 2, 3, 4, 5, 10)
- [ ] Passing score slider works (0-100%, step 5)
- [ ] Slider shows real-time percentage update
- [ ] Quiz summary updates when you change settings
- [ ] "Create Quiz" button creates quiz

#### Quiz Player Page
- [ ] Page loads with quiz title
- [ ] Question number and timer display
- [ ] All 5 radio options appear
- [ ] Selected option highlighted in teal
- [ ] "Submit Answer" button disabled until selection
- [ ] Progress bar shows completion percentage
- [ ] Question navigator grid shows:
  - Current question (teal background)
  - Answered questions (green background)
  - Unanswered questions (light gray)
- [ ] Previous button disabled on first question
- [ ] Next button works (or View Results on last question)
- [ ] Timer counts down (1 second intervals)
- [ ] Timer color changes to red when ≤10 seconds

#### Results Page
- [ ] Final score displayed prominently
- [ ] Pass/Fail badge shown (green if ≥ passing score, amber if below)
- [ ] Score breakdown shows:
  - Points earned
  - Percentage
  - Correct count
  - Total questions
- [ ] All questions listed with:
  - Question number
  - Question text
  - Your answer
  - Correct answer (if wrong)
  - Points indicator
- [ ] Clicking question expands to show:
  - All 5 options (correct one highlighted)
  - Explanation text
  - "Learn More" link
  - Time taken
- [ ] "Download Certificate" button visible if passing
- [ ] "Retry Quiz" button visible if retakes remaining
- [ ] "Back to Classroom" button works

### Data Validation Testing

- [ ] Empty CSV rejected
- [ ] CSV missing columns rejected (shows which missing)
- [ ] Question numbers not sequential (1,2,4) rejected
- [ ] Timer values outside 10-600 range rejected
- [ ] Missing explanation rejected
- [ ] Invalid source_link (not a URL) rejected
- [ ] Duplicate options (same text twice) rejected
- [ ] Correct answer not A-E rejected

### Responsive Design Testing

Test on these viewport sizes (use browser DevTools):
- [ ] Desktop (1920x1080) — full width, all elements visible
- [ ] Tablet (768x1024) — 2-column grid becomes 1-column
- [ ] Mobile (480x800) — all elements stack vertically
- [ ] Very wide (2560x1440) — max-width constraint applied
- [ ] Very narrow (375x667) — text doesn't overflow

### Error Handling

- [ ] Try uploading invalid CSV — shows helpful error message
- [ ] Try creating quiz without title — shows "Required" error
- [ ] Try setting passing score > 100 — shows validation error
- [ ] Network timeout — shows retry button (if applicable)
- [ ] Missing quiz ID — shows "Error Starting Quiz"

---

## Debugging Tips

### Check Console Errors

Open browser DevTools (F12) and check Console tab:
- Red errors indicate problems
- Yellow warnings are OK
- Look for `QuizPlayer`, `CSVUploadForm`, etc. in error messages

### Check Network Requests

Open browser DevTools → Network tab:
- Click "Upload" and watch for API calls
- `POST /api/instructor/quiz/validate-csv` should return 200
- `POST /api/instructor/quiz/create-from-csv` should return 200 with quiz_id
- `POST /api/student/quiz/start` should return session_id
- `GET /api/student/quiz/questions` should return questions array

### Check Browser Storage

Open DevTools → Application tab:
- Check localStorage for any quiz-related data
- Check sessionStorage
- Check cookies (if auth is used)

### Terminal Logs

Watch the terminal where you ran `npm run dev`:
- Look for API request logs
- Look for any TypeScript errors
- Check for Supabase connection errors

---

## Common Issues & Fixes

### Issue: "File size exceeds 10MB limit"
**Fix:** The sample CSV is tiny (~2KB), so this won't happen. If it does, your CSV has extra data.

### Issue: "Please select a .csv file"
**Fix:** Ensure the file has `.csv` extension. Some downloads might add `.txt` or `.xlsx`.

### Issue: Validation page shows red errors
**Fix:** Download the CSV template and use it as a base. Common issues:
- Missing columns (need exactly 11)
- Question numbers not sequential
- Timer outside 10-600 range
- Source link not a valid URL

### Issue: "Failed to create quiz" error
**Fix:** Check browser console (F12) for details. Most likely:
- CSV has validation errors (go back and retry)
- Database connection issue (check Supabase status)
- Missing `classroom_id` in code

### Issue: Student page shows "Quiz session not found"
**Fix:** Make sure you:
- Created a quiz successfully (got quiz_id)
- Copied the correct quiz_id
- Used the exact URL format: `/student/quiz/[quiz_id]`

### Issue: Timer doesn't count down
**Fix:** Refresh the page (F5). Might be a JavaScript timing issue.

### Issue: Components not loading (blank page)
**Fix:** Check that Next.js dev server is running (should see `ready - started server on` in terminal)

---

## Performance Expectations

### Load Times
- Instructor upload page: **< 1 second**
- CSV validation: **< 2 seconds** (5 questions)
- Quiz settings form: **< 1 second**
- Quiz creation: **< 3 seconds** (inserts 5 questions)
- Quiz player: **< 2 seconds** (fetch questions)
- Results page: **< 2 seconds** (calculate score)

### Quiz Taking
- Page interaction: Should be instant (no lag)
- Timer: Should decrement every 1 second (smooth)
- Answer submission: Should be < 500ms
- Next question: Should auto-advance after 500ms

If any of these are slow, check:
1. Browser console for errors
2. Network tab (check API response times)
3. System resources (CPU/memory usage)

---

## Success Criteria

✅ You'll know it's working when:

1. **Instructor Flow:**
   - Upload CSV → See "CSV Validated Successfully"
   - Configure settings → Click "Create Quiz"
   - See "Quiz Created Successfully! 🎉" with quiz ID

2. **Student Flow:**
   - Navigate to student page with quiz ID
   - See quiz player with all 5 questions
   - Submit answers → See results page
   - Score calculates correctly (e.g., 4/5 = 80%)

3. **Visual Design:**
   - Navy blue headers (#1E3A5F)
   - Teal accent buttons (#0891B2)
   - Light backgrounds (#F0F7FA)
   - All text readable and properly spaced

4. **Responsive:**
   - Resize browser window
   - All elements reflow properly
   - No horizontal scrolling on mobile

---

## Next Steps

After successful local testing:

1. **Test with Real Data**
   - Create 10-question CSV
   - Test with longer text
   - Test with special characters

2. **Test Edge Cases**
   - Very long question text (100+ chars)
   - Very long option text
   - Very short timer (10 seconds)
   - Very long timer (600 seconds)

3. **Performance Test**
   - Try 50-question CSV
   - Measure load time
   - Check browser memory usage

4. **Bug Report**
   - Document any errors with steps to reproduce
   - Include browser/OS version
   - Include screenshot if applicable

---

## Support

If something doesn't work:
1. Check console (F12) for error messages
2. Check this guide for the issue
3. Try refreshing the page
4. Check that `npm run dev` is still running
5. Review the component code (comments explain logic)

---

**Happy Testing! 🚀**
