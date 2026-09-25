# Quiz Creation from CSV — Feature Design & Workflow

**Feature Status:** 🔄 NOT YET IMPLEMENTED (Design phase)  
**Requested By:** Instructor workflow  
**Use Case:** Bulk import 50-100 questions into a single quiz  
**Priority:** High (enables self-service quiz authoring)  

---

## 📋 Desired Instructor Workflow

### Step 1: Navigate to Quiz Creator
```
Instructor → Opens classroom
           → Clicks "Create Quiz" button
           → Chooses: "Upload from CSV"
           → Redirects to:
              /instructor/[classroomId]/create-quiz/csv-upload
```

**Page Loads:**
```
┌─────────────────────────────────────────────────────┐
│ Create Quiz from CSV                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Step 1: Upload CSV File                            │
│ ┌──────────────────────────────────────────────┐   │
│ │ Drag & drop CSV here                         │   │
│ │ or                                           │   │
│ │ [Choose File]                                │   │
│ └──────────────────────────────────────────────┘   │
│                                                     │
│ Supported formats:                                  │
│ • Single-choice questions                          │
│ • Multiple-choice questions                        │
│ • Essay questions                                  │
│ • Short-answer questions                           │
│ • Code challenges                                  │
│ • Scenario/branching questions                     │
│                                                     │
│ Max file size: 10MB (supports 1000+ questions)     │
│                                                     │
│ Need a template?                                   │
│ [Download CSV Template] ← Pre-filled example       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Step 2: CSV Format (What Instructor Provides)

#### Option A: Simple CSV (Easiest)
```
question_number,question_text,question_type,points,option_a,option_b,option_c,option_d,correct_answer,explanation
1,What is machine learning?,single,10,A chatbot,A type of programming,Algorithms learning from data,Mathematics,C,ML is when algorithms learn patterns from data without explicit programming
2,Which are types of AI?,multiple,10,Supervised learning,Unsupervised learning,Reinforcement learning,All of above,A;B;C,"All three are main types of machine learning"
3,Write a function that returns hello world,code,15,,,,,python,"def hello(): return 'hello world'"
4,Explain neural networks in 2-3 sentences,essay,20,,,,,,"Key concepts: layers, weights, backpropagation",
5,What is your experience with AI?,short_answer,10,,,,,,

```

**CSV Columns Explained:**

| Column | Required | Type | Example | Notes |
|--------|----------|------|---------|-------|
| `question_number` | Yes | Integer | 1, 2, 3 | Sequential, starts at 1 |
| `question_text` | Yes | String | "What is AI?" | Full question text |
| `question_type` | Yes | Enum | single, multiple, essay, short_answer, code, scenario | Type of question |
| `points` | Yes | Integer | 10 | Points for this question |
| `option_a` | Conditional | String | "A chatbot" | For single/multiple only |
| `option_b` | Conditional | String | "Programming" | For single/multiple only |
| `option_c` | Conditional | String | "ML" | For single/multiple only |
| `option_d` | Conditional | String | "Data" | For single/multiple only |
| `option_e` | Optional | String | "Other" | If needed (max 5 options) |
| `correct_answer` | Conditional | String | "C" (single) or "A;B;C" (multiple) | Which options are correct |
| `code_language` | Conditional | String | python, javascript, java | For code challenges only |
| `starter_code` | Optional | String | "def hello():" | For code challenges |
| `rubric` | Optional | String | "Award points for: clarity, structure, best practices" | Grading guidance for AI |
| `explanation` | Optional | String | "ML is when..." | Shown after grading (optional) |
| `scenario_start_branch` | Conditional | String | "branch_1" | For scenario questions |

---

#### Option B: Advanced CSV (For Scenarios)
```
For scenario/branching questions, instructor can use nested structure:

question_number,question_text,question_type,points,scenario_branch_id,scenario_prompt,scenario_option_1,scenario_option_2,scenario_next_branch_1,scenario_next_branch_2,points_for_branch
1,You're a product manager...,scenario,20,branch_1,"A customer complains about your product. What do you do?","Immediately refund them","Schedule a call to understand their concerns","branch_1a","branch_1b",
1,You're a product manager...,scenario,20,branch_1a,"You gave a refund. Correct decision. +5 points","Next scenario","Back to start","branch_2","branch_1",5
1,You're a product manager...,scenario,20,branch_1b,"You had a call. Great decision. +10 points","Next scenario","Back to start","branch_2","branch_1",10
```

---

### Step 3: Upload & Validation

**Instructor Uploads CSV:**
```
[Choose File] → selects: "module-1-questions.csv" (50 questions)
             ↓
POST /api/instructor/[classroomId]/quiz/parse-csv
  ├─ Validate file format (CSV, not XLS)
  ├─ Check file size (<10MB)
  ├─ Parse CSV rows
  └─ Validate structure

Server validates:
✓ Required columns present
✓ question_number is sequential (1, 2, 3, ...)
✓ question_type is valid enum
✓ Points are positive integers
✓ For single/multiple: exactly 1+ options, correct_answer matches
✓ For code: language specified (python, javascript, etc)
✓ For essay/short_answer: no options required
✓ For scenario: branch structure valid
✓ No duplicate question numbers

Response:
{
  "success": true,
  "total_questions": 50,
  "parsed_questions": [...],
  "validation_errors": [],
  "warnings": [
    "Question 5: Missing 'option_e', using 4 options",
    "Question 12: Rubric very long (200 chars), truncating"
  ]
}
```

**If Validation Fails:**
```
UI shows:
┌─────────────────────────────────────┐
│ ⚠ Validation Errors Found           │
├─────────────────────────────────────┤
│                                     │
│ Row 5:                              │
│ × question_type 'multiple_choice'   │
│   should be 'multiple'              │
│                                     │
│ Row 12:                             │
│ × correct_answer 'D' but only       │
│   3 options (A, B, C) provided      │
│                                     │
│ Row 18:                             │
│ ! Missing 'rubric' (optional)       │
│   → Will use default grading        │
│                                     │
│ [Download Error Report] [Re-upload] │
│                                     │
└─────────────────────────────────────┘
```

---

### Step 4: Preview Quiz

**After Validation Passes:**
```
UI shows: "Preview Quiz (50 questions)"
```

**Preview Screen:**
```
┌──────────────────────────────────────────────────────┐
│ Quiz Preview: Module 1 - What AI Actually Is         │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Total Questions: 50                                  │
│ Total Points: 500                                    │
│ Estimated Duration: 45 minutes (10 min per 10 Q)    │
│                                                      │
│ Question Breakdown:                                  │
│ • Single-choice: 10 questions (100 pts)              │
│ • Multiple-choice: 15 questions (150 pts)            │
│ • Essay: 10 questions (150 pts)                      │
│ • Short-answer: 10 questions (100 pts)               │
│ • Code: 5 questions (50 pts)                         │
│ • Scenario: 0 questions (0 pts)                      │
│                                                      │
│ Sample Questions:                                    │
│ ┌────────────────────────────────────────────────┐   │
│ │ Q1. What is machine learning? [single, 10pt]  │   │
│ │ Options: A) Chatbot, B) Programming...        │   │
│ │ Correct: C) ML is algorithms...               │   │
│ │                                                │   │
│ │ Q2. Which are types of AI? [multiple, 10pt]   │   │
│ │ Options: A) SL, B) UL, C) RL, D) DL           │   │
│ │ Correct: A, B, C, D (all correct)             │   │
│ │                                                │   │
│ │ Q50. Write hello world in Python [code, 10pt] │   │
│ │ Language: Python                              │   │
│ │ Starter: def hello():                         │   │
│ │ [SCROLL for more...]                          │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ [Edit CSV] [Cancel] [Create Quiz]                   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Instructor can:**
- Scroll through all 50 questions
- Check formatting
- See which are auto-graded vs instructor-graded
- Edit CSV if needed (go back to Step 2)

---

### Step 5: Configure Quiz Settings

**Before Creating:**
```
┌──────────────────────────────────────────────────────┐
│ Configure Quiz Settings                              │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Quiz Title: [Module 1: What AI Actually Is]         │
│                                                      │
│ Description: [Optional text about this quiz]        │
│                                                      │
│ Course Track:                                        │
│ ○ Track A (Business Professionals)                   │
│ ○ Track B - Engineer                                 │
│ ○ Track B - DevOps                                   │
│                                                      │
│ Grading:                                             │
│ □ Show answers after submission                      │
│ □ Show AI feedback immediately                       │
│ □ Allow retakes (max [3] retakes)                    │
│ □ Require 70% to pass                                │
│                                                      │
│ Display:                                             │
│ ○ One question at a time                             │
│ ○ All questions at once                              │
│ ○ Sections (group questions)                         │
│                                                      │
│ Time Limit (optional):                               │
│ [ ] Enable time limit: [60] minutes                  │
│                                                      │
│ Code Grading:                                        │
│ Max concurrent code reviews: [5]                     │
│ Daily token budget: [100000]                         │
│                                                      │
│ [Create Quiz] [Cancel]                              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

### Step 6: Create Quiz

**Instructor Clicks "Create Quiz":**
```
POST /api/instructor/[classroomId]/quiz/create-from-csv
{
  "title": "Module 1: What AI Actually Is",
  "description": "...",
  "track_id": "track-a",
  "questions": [...parsed questions...],
  "settings": {
    "show_answers_after_submit": true,
    "show_ai_feedback": true,
    "allow_retakes": true,
    "max_retakes": 3,
    "passing_score": 70,
    "time_limit_minutes": 60
  }
}
```

**Server Process:**
```
1. Verify instructor authorization (owns classroom)
2. Create quiz_scene row in database
3. For each question, create quiz_question row
   ├─ Store question text, type, options, correct answer
   ├─ Store points, rubric, code_language (if applicable)
   ├─ Store scenario branches (if applicable)
   └─ Order by question_number
4. Create quiz_scene.content JSON with all questions
5. Calculate total points (sum of all question points)
6. Return quiz_scene_id

Response:
{
  "success": true,
  "quiz_id": "quiz-module-1",
  "total_questions": 50,
  "total_points": 500,
  "created_at": "2026-01-15T16:00:00Z",
  "next_step": "Publish or preview in classroom"
}
```

**UI Confirmation:**
```
┌──────────────────────────────────────────────────────┐
│ ✓ Quiz Created Successfully!                         │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Quiz: Module 1 - What AI Actually Is                │
│ Questions: 50                                        │
│ Total Points: 500                                    │
│ Track: Track A (Business)                            │
│                                                      │
│ Status: Ready to use                                 │
│                                                      │
│ [View Quiz] [Publish to Classroom] [Download CSV]   │
│                                                      │
│ Students can now take this quiz!                     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

### Step 7: Publish to Classroom

**Option A: Immediate Publish**
```
Instructor clicks [Publish to Classroom]
  ↓
Selects which students: ○ All ○ Specific roster
  ↓
Sets available date: [Jan 16, 2026]
  ↓
Sets due date: [Jan 23, 2026]
  ↓
POST /api/instructor/[classroomId]/quiz/[quizId]/publish
  ↓
Quiz appears in student's module list
  ↓
Students see: "Module 1 Quiz (50 questions, 500 points)"
              "Due: Jan 23 | 10 days remaining"
```

**Option B: Draft for Later**
```
Instructor clicks [Save as Draft]
  ↓
Quiz not published yet
  ↓
Instructor can edit/review later
  ↓
Later: Clicks [Publish] from quiz management page
```

---

### Step 8: Student Takes Quiz

**Same workflow as before:**
```
Student navigates to quiz
  ↓
Email verification gate (if first time)
  ↓
Starts quiz
  ├─ See Q1-50 (one at a time or all at once per settings)
  ├─ Answer questions
  └─ Submit when done
  ↓
Automatic grading
  ├─ Auto-grade: Single/multiple (instant)
  ├─ AI-grade: Essay/code/short-answer (parallel, via queue)
  └─ Sync to Supabase
  ↓
See results (50 questions, ~500 points possible)
```

---

## 🛠️ Implementation Required

### Backend APIs to Build

#### 1. CSV Parsing & Validation
```
POST /api/instructor/[classroomId]/quiz/parse-csv
  ├─ Validate CSV structure
  ├─ Parse rows
  ├─ Validate question data
  └─ Return parsed questions + errors
```

**Validation Rules:**
- Required columns: question_number, question_text, question_type, points
- Conditional columns:
  - For single/multiple: option_a, option_b, ..., correct_answer
  - For code: code_language, rubric (optional)
  - For essay/short_answer: rubric (optional)
  - For scenario: scenario_* columns
- Points must be positive
- question_type must be valid enum
- Correct answer must match options provided

---

#### 2. Quiz Creation from Parsed Data
```
POST /api/instructor/[classroomId]/quiz/create-from-csv
  ├─ Create quiz_scene row
  ├─ Create quiz_question rows (50-100 rows per quiz)
  ├─ Store in JSON format (OpenMAIC DSL)
  ├─ Calculate total points
  └─ Return quiz_id + metadata
```

**Database Schema Update Needed:**
```sql
CREATE TABLE quiz_scenes (
  id UUID PRIMARY KEY,
  classroom_id UUID REFERENCES classrooms(id),
  instructor_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  total_questions INTEGER,
  total_points INTEGER,
  settings JSONB,  -- show_answers, allow_retakes, etc
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY,
  quiz_scene_id UUID REFERENCES quiz_scenes(id),
  question_number INTEGER,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20),  -- single, multiple, essay, code, scenario, short_answer
  points INTEGER,
  options JSONB,  -- [{label: "A", text: "Chatbot"}, ...]
  correct_answer TEXT,  -- "C" or "A;B;C"
  code_language VARCHAR(20),
  starter_code TEXT,
  rubric TEXT,
  scenario_branches JSONB,
  explanation TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

#### 3. Quiz Management
```
GET /api/instructor/[classroomId]/quiz  -- List all quizzes
GET /api/instructor/[classroomId]/quiz/[quizId]  -- Get quiz details
PATCH /api/instructor/[classroomId]/quiz/[quizId]  -- Edit quiz
POST /api/instructor/[classroomId]/quiz/[quizId]/publish  -- Publish quiz
DELETE /api/instructor/[classroomId]/quiz/[quizId]  -- Delete quiz
GET /api/instructor/[classroomId]/quiz/[quizId]/download-csv  -- Export back to CSV
```

---

### Frontend Components to Build

#### 1. CSV Upload Component
```
components/instructor/quiz/CSVUploadForm.tsx
├─ File input (drag-and-drop)
├─ File validation
├─ Show parsing progress
├─ Display validation errors/warnings
└─ Template download link
```

#### 2. Quiz Preview Component
```
components/instructor/quiz/QuizPreview.tsx
├─ Show all questions
├─ Breakdown by type (single, multiple, essay, etc)
├─ Show sample questions
├─ Statistics (total points, estimated duration)
└─ Scroll through preview
```

#### 3. Quiz Settings Component
```
components/instructor/quiz/QuizSettingsForm.tsx
├─ Title, description
├─ Track selection
├─ Grading options (show answers, AI feedback, retakes)
├─ Display options (one-at-a-time vs all)
├─ Time limit
├─ Code grading settings
└─ Save/publish options
```

#### 4. Quiz Management Page
```
pages/instructor/[classroomId]/quiz/index.tsx
├─ List all quizzes
├─ Show status (draft, published, archived)
├─ Show: created date, question count, students who took it
├─ Quick actions (edit, publish, delete, download CSV)
└─ Create new quiz button
```

---

### CSV Template (What to Download)

Instructor can download this template:

```csv
question_number,question_text,question_type,points,option_a,option_b,option_c,option_d,correct_answer,code_language,starter_code,rubric,explanation
1,What is machine learning?,single,10,A chatbot,A type of programming,Algorithms learning from data,Advanced mathematics,C,,,"Award points for: mentions 'learning from data', 'algorithms', 'without explicit programming'","Machine Learning (ML) is a subset of AI where algorithms learn patterns and make decisions from data without being explicitly programmed for every scenario."
2,Which are types of machine learning?,multiple,10,Supervised Learning,Unsupervised Learning,Reinforcement Learning,Transfer Learning,A;B;C,,,"List all correct types. Partial credit for partial answer.","The three main types of ML are: Supervised (labeled data), Unsupervised (unlabeled data), and Reinforcement (reward-based)."
3,Explain neural networks in 2-3 sentences,essay,15,,,,,,,,"Rubric: 1) Mentions layers/nodes, 2) Explains forward pass/weights, 3) Mentions training/backpropagation. Award 5 pts per criterion.","Neural networks are computational models inspired by biological brains. They consist of interconnected layers of nodes (neurons) that process inputs, applying weights and activation functions. During training, backpropagation adjusts weights to minimize prediction errors."
4,Write a Python function that returns 'hello world',code,10,,,,,,python,"def hello():\n    pass",Rubric: 1) Correct function signature, 2) Returns 'hello world' string, 3) Code is clean and readable,"def hello():
    return 'hello world'"
5,What is your experience with AI before this course?,short_answer,5,,,,,,,,"Accept diverse answers. Award points for: honesty, specific examples, or learning goals.","This is to gauge prior knowledge. Accept any answer that shows reflection."
```

---

## 📊 CSV Limits & Performance

### Maximum Quiz Size
```
Soft limit:  100 questions per quiz
Hard limit:  1000 questions per quiz
             (File size: <10MB)

Time to parse:
- 50 questions:   <1 second
- 100 questions:  <2 seconds
- 1000 questions: <10 seconds
```

### CSV File Size
```
Average question:  200 bytes (with options)
50 questions:      ~10 KB
100 questions:     ~20 KB
1000 questions:    ~200 KB
Max file size:     10 MB

Realistic limit: ~50,000 questions
                 (never needed in practice)
```

---

## 🎯 User Experience Map

```
INSTRUCTOR QUIZ CREATION WORKFLOW:

1. Navigate to Quiz Creator
   /instructor/[classroomId]/quiz/new
   ↓
2. Choose method:
   ○ Manual authoring (question by question)
   ○ Upload CSV ← NEW
   ○ Use template ← Future
   ↓
3. Upload CSV file
   [Drag & drop CSV]
   ↓
4. System validates CSV
   ├─ Check structure
   ├─ Check data types
   ├─ Show errors/warnings
   └─ Display summary (50 Q, 500 pts)
   ↓
5. Preview quiz
   [Scroll through all 50 questions]
   ↓
6. Configure settings
   [Title, track, grading options, time limit]
   ↓
7. Create quiz
   [Save to database]
   ↓
8. Publish to classroom
   [Choose students, set dates]
   ↓
9. Students can now take it!
   [Quiz appears in their module list]

Each step: ~1-2 minutes
Total time: ~10-15 minutes for 50-question quiz
```

---

## 💡 Future Enhancements

### Phase 1: Basic CSV (MVP)
- ✅ Single/multiple choice
- ✅ Essay/short answer
- ✅ Code challenges
- ✅ Basic validation
- ✅ CSV upload/download

### Phase 2: Advanced Features
- ⏳ Scenario/branching questions from CSV
- ⏳ Import from Quizlet/Google Forms
- ⏳ Question bank (reuse questions across quizzes)
- ⏳ Random question selection (randomize 50 from 100)

### Phase 3: Intelligence
- ⏳ AI-generated questions from uploaded text
- ⏳ Auto-generate rubrics from question text
- ⏳ Difficulty estimation (easy/medium/hard)
- ⏳ Similarity detection (prevent duplicate questions)

---

## 📝 CSV Example (50 Questions)

Here's what a real 50-question CSV might look like:

```csv
question_number,question_text,question_type,points,option_a,option_b,option_c,option_d,correct_answer,rubric
1,What is AI?,single,10,A chatbot,Algorithms learning from data,Advanced math,None of above,B,
2,Name 2 types of AI,multiple,10,Narrow AI,General AI,Super AI,Weak AI,A;B,Correct if mentions 2 of: Narrow, General, Super
3,Explain how machine learning works (3-4 sentences),essay,15,,,,,,"Must include: 1) Data input, 2) Learning process, 3) Output/prediction"
4,Write Python code to reverse a string,code,20,,,,,,python,"Award: correct output (10), clean code (5), efficient (5)"
5,What surprised you about AI this week?,short_answer,5,,,,,,"Accept any thoughtful reflection, award full points"
...
50,Create a scenario: You have AI tool that can read emails. How do you use it ethically?,essay,15,,,,,,Rubric: Privacy (5), Transparency (5), Bias (5)
```

---

## 🔐 Security & Permissions

### Authorization
```
Only instructor who created classroom can:
✓ Upload CSV files
✓ Create quizzes
✓ Publish quizzes
✓ Edit quizzes

Students cannot:
✗ Upload CSV
✗ Create quizzes
✗ See other students' quizzes
✗ Access instructor tools
```

### Data Validation
```
✓ No SQL injection (parameterized queries)
✓ No XSS (sanitize question text before rendering)
✓ No file size abuse (max 10MB)
✓ No question limit abuse (max 1000 questions)
✓ Validate all inputs server-side (not just client)
```

---

## ✅ Checklist: Before Production

- [ ] CSV parsing logic tested with 50+ real questions
- [ ] Validation catches all error types (missing options, invalid type, etc)
- [ ] Preview renders correctly for 100 questions
- [ ] Quiz creation API creates correct database rows
- [ ] Students can take 50-question quiz without errors
- [ ] Grading works for 50 questions (doesn't timeout)
- [ ] Code grading queue handles multiple submissions
- [ ] Email notifications work (instructor + student)
- [ ] Permissions: only instructor can create quizzes
- [ ] Performance: <2 sec to parse CSV, <1 sec to create quiz
- [ ] UI: Responsive on mobile (drill-down for questions)
- [ ] Undo/delete: Can delete quiz if not yet taken

---

## 🚀 Implementation Timeline

### If Building Today
```
Design review:              30 min
Backend APIs:              3-4 hours
  ├─ CSV parsing
  ├─ Validation
  ├─ Quiz creation
  └─ Database schema
Frontend components:       2-3 hours
  ├─ File upload
  ├─ Preview
  ├─ Settings form
  └─ Management page
Testing:                   2-3 hours
  ├─ Happy path (50 Q)
  ├─ Error cases
  ├─ Edge cases (1000 Q)
  └─ E2E (upload → create → student takes)
──────────────────────────
Total:                     8-10 hours
                           (1 full day for 1-2 engineers)
```

**Realistic Timeline:**
- Design + planning: 1 hour
- Development: 1 full day (8 hours)
- Testing: 2-3 hours
- Refinement: 1-2 hours
- **Total: 1.5 days** (to production)

---

## 📞 Questions for Clarification

Before building, confirm with instructor:

1. **Max questions:** 50, 100, or 1000+ per quiz?
   - Current proposal: 100 soft limit, 1000 hard limit

2. **CSV complexity:** Just single/multiple/essay/code, or also scenarios?
   - Current proposal: All 6 types

3. **Import frequency:** One-time bulk import or regularly?
   - Impacts: need "update existing quiz" feature?

4. **Grading rubric:** Generic or question-specific?
   - Current: question-specific (per-row in CSV)

5. **Retake policy:** Reset score or keep highest?
   - Current: Configurable (per quiz)

6. **Export:** Need to export quiz back to CSV?
   - Current: Yes (for backup/reuse)

