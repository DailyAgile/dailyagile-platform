# Getting Started as an Instructor

Welcome to DailyAgile! This guide shows you how to create quizzes and manage your classroom.

## Table of Contents

1. [Logging In](#logging-in)
2. [Understanding Your Dashboard](#understanding-your-dashboard)
3. [Creating a Quiz - Manual Entry](#creating-a-quiz---manual-entry)
4. [Creating a Quiz - CSV Import](#creating-a-quiz---csv-import)
5. [Sharing a Quiz](#sharing-a-quiz)
6. [Grading Submissions](#grading-submissions)
7. [Viewing Class Results](#viewing-class-results)

---

## Logging In

1. Go to the DailyAgile homepage
2. Click **Instructor Login**
3. Enter your email and password
4. You'll land on your instructor dashboard

**First time?** Contact support to set up your instructor account.

---

## Understanding Your Dashboard

Your dashboard has these sections:

### My Quizzes

Lists all quizzes you've created:
- **Quiz Title**: Name of the quiz
- **Code**: Unique code to share with students (e.g., `QA1B2`)
- **Questions**: Number of questions
- **Created**: When you created it
- **Actions**: Edit, delete, view results, duplicate

### My Classrooms

Shows all your classroom sections:
- **Classroom Name**: Title (e.g., "Physics 101 - Section A")
- **Students**: Number enrolled
- **Quizzes**: Quizzes assigned to this classroom
- **Actions**: Manage students, view results

### Pending Extensions

Requests from students for deadline extensions:
- **Student**: Their email
- **Quiz**: Which quiz
- **Current Due**: Original deadline
- **Requested Due**: Their requested deadline
- **Actions**: Approve, deny

### Recent Submissions

Latest quiz completions from your students:
- **Student**: Who took it
- **Quiz**: Which quiz
- **Score**: Their points and percentage
- **Time**: When they completed it

---

## Creating a Quiz - Manual Entry

### Step 1: Start New Quiz

1. Click **Create Quiz** button
2. Select **Enter Manually** (or **Import from CSV**)
3. Enter **Quiz Title** (e.g., "Chapter 3 Quiz - Photosynthesis")

### Step 2: Add Questions

For each question:

1. **Question Number**: Auto-numbered (1, 2, 3...)
2. **Question Text**: The actual question
   ```
   Example: "What is the primary product of photosynthesis?"
   ```

3. **Options**: Five answer choices (A through E)
   ```
   A) Glucose
   B) Oxygen
   C) Chlorophyll
   D) Sunlight
   E) All of the above
   ```

4. **Correct Answer**: Select A, B, C, D, or E
   ```
   Correct: B (Oxygen)
   ```

5. **Explanation**: Why this answer is correct
   ```
   "Oxygen is released as a byproduct when plants convert light 
   energy into chemical energy through photosynthesis."
   ```

6. **Source Link** (optional): Where did this question come from?
   ```
   https://www.biology-online.org/photosynthesis
   ```

7. **Timer** (optional): Seconds per question (default: 60)
   ```
   60 seconds per question
   ```

### Step 3: Save Quiz

1. Click **Save Quiz**
2. Your quiz code is generated automatically
3. Quiz is ready to share!

---

## Creating a Quiz - CSV Import

Fastest way to add 10+ questions at once.

### Step 1: Prepare Your CSV File

Create a file with this format:

**Template:**
```csv
Question Number,Question,Option A,Option B,Option C,Option D,Option E,Correct Answer,Explanation,Source Link,Timer Seconds
1,What is 2+2?,1,4,2,3,5,B,2+2 equals 4,https://example.com,60
2,Capital of France?,London,Paris,Rome,Berlin,Madrid,B,Paris is the capital of France,https://example.com,60
```

**Important:**
- Save as `.csv` (Excel: Save As → CSV (UTF-8))
- Headers must match exactly (case-sensitive)
- Correct Answer must be: A, B, C, D, or E
- Timer Seconds must be a number (e.g., 60, 120)
- All rows must have all 11 columns

**Example complete row:**
```
3,"What does DNA stand for?","Deoxyribonucleic Acid","Dynamic Nuclear Acid","Distributed Network Analysis","Data Nucleotide Assembly","Digital Nucleic Acid",A,"DNA = Deoxyribonucleic Acid - the molecule carrying genetic instructions",https://biology.org,90
```

### Step 2: Upload CSV

1. Click **Create Quiz**
2. Select **Import from CSV**
3. Click **Choose File** and select your `.csv`
4. Click **Validate**
5. If errors show: Fix CSV and try again
6. If valid: Click **Import**

### Step 3: Review & Adjust

After import:
1. Review all questions
2. Correct any OCR errors or typos
3. Adjust timers if needed
4. Click **Save Quiz**

---

## Sharing a Quiz

### Get the Quiz Code

1. Find your quiz in **My Quizzes**
2. Copy the code (e.g., `QA1B2`)
3. Send to students

### Share Methods

1. **Email**: Send code directly
   ```
   Take this week's quiz:
   Code: QA1B2
   Due: Friday 5pm
   Link: https://dailyagile.com/student/quiz/QA1B2
   ```

2. **Classroom Page**: If using classrooms, quiz auto-appears

3. **Learning Management System**: Paste the link in your LMS (Canvas, Blackboard, etc.)

4. **Announcement**: Post in your course announcements

### Adding to Classroom

1. Go to your **Classroom**
2. Click **Add Quiz**
3. Select a quiz you've created
4. Set **Due Date** (optional)
5. Click **Assign**
6. Students see it in their classroom

---

## Viewing Submissions

### See Who Took It

1. Find quiz in **My Quizzes**
2. Click **View Results**
3. You'll see:
   - **Student Email**: Who took it
   - **Score**: Points and percentage
   - **Time Taken**: How long they spent
   - **Submitted**: When they completed it

### View Individual Answers

1. Click on a student's submission
2. You'll see their complete answers:
   - Their answer
   - Correct answer
   - Points earned
   - Explanation

### Review Patterns

Look for:
- Questions everyone got wrong → might be unclear
- Questions everyone got right → too easy
- Outlier scores → consider if student has special circumstances

---

## Grading Submissions

Most quizzes are auto-graded, but you can add feedback:

### Add Feedback to Submission

1. Click on student's submission
2. Scroll to **Instructor Feedback**
3. Enter your comments
   ```
   "Great work! You showed strong understanding of this concept.
   For question 5, consider reviewing the definition of photosynthesis."
   ```
4. Click **Save Feedback**
5. Student sees this when viewing results

### Manual Grading (If Needed)

For essay questions or special circumstances:

1. Click **Edit Score**
2. Enter corrected points
3. Add comment explaining the change
4. Click **Save**

---

## Viewing Class Results

### See All Submissions for a Quiz

1. Click **View Results** on any quiz
2. You'll see a table with all students
3. Columns show:
   - **Student Email**
   - **Score** (points)
   - **Percentage** (%age)
   - **Pass/Fail** (checkmark/X)
   - **Submitted** (date/time)

### Class Statistics

At the top you'll see:
- **Total Attempts**: How many students took it
- **Average Score**: Class average
- **Pass Rate**: % of students who passed
- **Difficulty Rating**: How hard the quiz was (based on performance)

### Export Results

1. Click **Download CSV**
2. You get a spreadsheet with all results
3. Use for your records or import elsewhere

---

## Managing Your Classroom

### Add Students Manually

1. Go to your **Classroom**
2. Click **Add Student**
3. Enter student email
4. Click **Add**
5. Student is now enrolled

### Bulk Upload Students via CSV

For 10+ students:

1. Go to your **Classroom**
2. Click **Bulk Upload**
3. Prepare CSV file:
   ```csv
   Email,First Name,Last Name
   john@example.com,John,Doe
   jane@example.com,Jane,Smith
   ```
4. Upload file
5. Students are added to classroom

### Assign Quiz to Classroom

1. Go to **Classroom**
2. Click **Assign Quiz**
3. Select a quiz
4. Set **Due Date** (optional)
5. Click **Assign**
6. All students see it in their classroom

### Remove Student

1. Go to **Classroom**
2. Find student in list
3. Click **Remove**
4. Student no longer sees your quizzes

---

## Troubleshooting

### "CSV Upload Failed"

**Causes:**
- Incorrect headers (spelling/capitalization)
- Missing columns (need all 11)
- Duplicate quiz codes
- Answers not A-E

**Solution:**
- Check template above
- Validate in Excel before uploading
- See errors message for specific issue

### Can't Assign Quiz

**Possible reasons:**
- You're not in the classroom owner/instructor role
- Quiz already assigned (no duplicates)
- Classroom has been deleted

**Solution:**
- Verify you're the classroom instructor
- Contact support if unsure

### Student Can't Access Quiz

**Possible reasons:**
- Student not enrolled in classroom (if classroom quiz)
- Quiz code is wrong
- Quiz has been deleted
- Browser cache issues

**Solution:**
- Verify student is enrolled
- Have them clear browser cache (Ctrl+Shift+Delete)
- Re-share the correct code

### Missing Submissions

**Possible reasons:**
- Student hasn't started yet (showing as pending)
- Student is in different classroom
- Student has different email than what you have

**Solution:**
- Check submission list (even pending ones)
- Verify student email is correct
- Ask student to confirm they took the quiz

---

## Best Practices

### Setting Timers

- **Calculation questions**: 2-3 minutes each
- **Reading comprehension**: 3-5 minutes each
- **Multiple choice**: 1-2 minutes each
- **Build in buffer**: Add extra 5-10 minutes for technical issues

### Writing Good Questions

- **Be clear**: Avoid ambiguous wording
- **Test options**: Each option should seem plausible
- **Randomize answers**: Don't have pattern (AAA or BBB)
- **Explain wrong answers**: Help students learn from mistakes
- **Source difficult questions**: Let students know where to review

### Giving Feedback

- **Be constructive**: Focus on improvement
- **Reference materials**: "See Chapter 3.2 for definition of..."
- **Offer help**: "Come to office hours if you want to review this"
- **Be timely**: Give feedback within 24-48 hours

### Extension Requests

- **Review case by case**: Some students may need accommodations
- **Respond quickly**: Students need to know deadlines
- **Document reasons**: For your records
- **Be consistent**: Similar circumstances get similar extensions

---

## Frequently Asked Questions

**Q: Can I edit a quiz after students start taking it?**
A: No - editing is locked once submissions arrive. Create a new version if you need to change things.

**Q: Can students retake a quiz?**
A: Yes, if you allow it. Currently, each student can retake unlimited times (check settings).

**Q: How long are results stored?**
A: Permanently - results are never deleted.

**Q: Can I see when students accessed the quiz (but didn't submit)?**
A: Not currently - we only track submissions.

**Q: Can I curve grades?**
A: Not automatically - you can manually adjust scores using the feedback feature.

**Q: Are quizzes randomly shuffled for each student?**
A: Currently no - all students see questions in the same order.

**Q: Can students work together on a quiz?**
A: That's your choice - but the platform records individual submissions.

---

## Need Help?

- **Email**: instructor-support@dailyagile.com
- **Response time**: 24 hours (business days)
- **Include**: Your classroom, quiz code, and describe your issue

---

*Last updated: 2026-08-12*
*Version: 1.0*
