# Quiz CSV Format Specification

**Format:** Multiple Choice Only (5 Options)  
**Status:** Ready for Implementation  
**Date:** January 15, 2026  

---

## 📋 CSV Column Requirements

### Required Columns (8 total)

| # | Column Name | Type | Required | Example | Notes |
|---|-------------|------|----------|---------|-------|
| 1 | `question_number` | Integer | ✅ Yes | 1, 2, 3 | Sequential, starts at 1 |
| 2 | `question` | String | ✅ Yes | "What is machine learning?" | Full question text (max 500 chars) |
| 3 | `timer_seconds` | Integer | ✅ Yes | 60, 120, 180 | Time per question (10-600 seconds) |
| 4 | `option_a` | String | ✅ Yes | "A chatbot" | First multiple choice option |
| 5 | `option_b` | String | ✅ Yes | "Learning from data" | Second multiple choice option |
| 6 | `option_c` | String | ✅ Yes | "Advanced mathematics" | Third multiple choice option |
| 7 | `option_d` | String | ✅ Yes | "Programming language" | Fourth multiple choice option |
| 8 | `option_e` | String | ✅ Yes | "All of the above" | Fifth multiple choice option |
| 9 | `correct_answer` | String | ✅ Yes | B | Single answer: A, B, C, D, or E |
| 10 | `explanation` | String | ✅ Yes | "ML is when algorithms learn from data..." | Shown after student submits (max 1000 chars) |
| 11 | `source_link` | String | ✅ Yes | https://example.com/ml-101 | Resource/reference URL (optional but recommended) |

---

## 📝 CSV Format (Exact Specification)

### Header Row
```csv
question_number,question,timer_seconds,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,source_link
```

### Data Rows
```csv
1,"What is machine learning?",60,"A chatbot","Algorithms that learn from data","Advanced mathematics","A programming language","None of the above",B,"Machine Learning is a subset of artificial intelligence where computer systems learn and improve from experience without being explicitly programmed. ML algorithms use statistical techniques to find patterns in data.",https://example.com/ml-101
2,"Which of these is an example of supervised learning?",90,"Email spam detection","Clustering customer data","Anomaly detection in networks","Recommendation systems","Image generation",A,"Supervised learning requires labeled training data where the correct answers are known. Email spam detection uses labeled examples of spam and non-spam emails.",https://example.com/supervised-learning
3,"What does 'neural network' refer to?",120,"A network of computers","A biological brain structure","A computational model inspired by biological brains","Internet connectivity","A type of database",C,"Neural networks are computational models inspired by the structure and function of biological neural networks. They consist of interconnected layers of artificial neurons.",https://example.com/neural-networks
4,"In deep learning, what do 'layers' represent?",75,"Time periods","Levels of data abstraction","Database tables","Server layers","Storage layers",B,"In deep learning, layers represent levels of data abstraction. Each layer processes information and passes it to the next layer, building increasingly complex representations.",https://example.com/deep-learning
5,"What is the purpose of the activation function in neural networks?",90,"To power the network","To introduce non-linearity","To store data","To connect to the internet","To manage memory",B,"Activation functions introduce non-linearity to neural networks, allowing them to learn complex patterns. Without them, multiple layers would be equivalent to a single layer.",https://example.com/activation-functions
```

---

## 📊 CSV Rules & Validation

### Validation Rules
```
✓ question_number: 
  - Must be sequential (1, 2, 3, ..., n)
  - No gaps or duplicates
  - Starts at 1

✓ question: 
  - Required, not empty
  - Max 500 characters
  - Can include punctuation, numbers, special chars
  - Trim whitespace

✓ timer_seconds: 
  - Must be integer
  - Range: 10 - 600 seconds (10 sec min, 10 min max)
  - Default: 60 seconds (if not specified)
  - Recommended: 60-120 seconds per question

✓ option_a, option_b, option_c, option_d, option_e:
  - All 5 required (no empty options)
  - Max 200 characters each
  - All must be different (no duplicates)
  - Should be concise and clear

✓ correct_answer: 
  - Must be single value: A, B, C, D, or E
  - Case-insensitive (a, A, b, B accepted)
  - No multiple answers (only one correct option)
  - Must match one of the options provided

✓ explanation: 
  - Required, not empty
  - Max 1000 characters
  - Should explain WHY the answer is correct
  - Should explain WHY other options are wrong (optional)

✓ source_link: 
  - Required (but can be empty string if no source)
  - Must be valid URL if provided (starts with http:// or https://)
  - Example: https://example.com/topic
  - If empty: just leave blank or use ""
```

### Error Messages on Validation Failure

```
Row 5, Column "timer_seconds": 
  ✗ Value "25" is less than minimum (10 seconds)
  → Use value between 10 and 600

Row 12, Column "option_b": 
  ✗ Value matches option_a (both "Chatbot")
  → All options must be unique

Row 18, Column "correct_answer": 
  ✗ Value "F" is invalid
  → Must be A, B, C, D, or E

Row 22, Column "source_link": 
  ✗ Value "example.com" is not valid URL
  → Must start with http:// or https://

Row 30, Column "question": 
  ✗ Value is empty
  → Question text is required

Row 35, Column "explanation": 
  ✗ Value exceeds 1000 characters (1247 chars)
  → Trim explanation to 1000 characters max
```

---

## 💾 CSV File Specifications

### File Format
```
Format: .csv (Comma-Separated Values)
Encoding: UTF-8
Line Endings: LF (Unix) or CRLF (Windows) both supported
Delimiter: Comma (,)
Quote Character: Double quotes (")
```

### How to Handle Special Characters

#### Commas in Text
```
If your question contains a comma, wrap in quotes:

WRONG:
1,"What is AI, ML, and DL?",60,...

CORRECT:
1,"What is AI, ML, and DL?",60,...
  (Already wrapped)
```

#### Quotes in Text
```
If your text contains quotes, escape with double quotes:

WRONG:
1,"What does 'AI' mean?",60,...

CORRECT:
1,"What does ""AI"" mean?",60,...
  (Quotes escaped as "")
```

#### Line Breaks in Text
```
If explanation spans multiple lines, keep within quotes:

CORRECT:
1,"What is ML?",60,"A","B","C","D","E",A,"Line 1 of explanation
Line 2 of explanation
Line 3 of explanation",https://example.com
```

### File Size Limits
```
Soft limit:  100 questions (file ~20-50 KB)
Hard limit:  1000 questions (file ~200-500 KB)
Max file:    10 MB
```

---

## 📥 Example CSV Files

### Example 1: Simple 5-Question Quiz

```csv
question_number,question,timer_seconds,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,source_link
1,"What is machine learning?",60,"A chatbot","Algorithms that learn from data","Advanced mathematics","A programming language","None of the above",B,"Machine Learning is a subset of AI where systems learn from data without explicit programming.",https://example.com/ml-intro
2,"Which is a supervised learning example?",75,"Email spam detection","Customer clustering","Anomaly detection","Image compression","Data normalization",A,"Supervised learning needs labeled data. Spam detection uses labeled spam/non-spam emails.",https://example.com/supervised-learning
3,"What does a neural network layer do?",90,"Connects to internet","Processes and abstracts data","Stores information","Compresses files","Manages memory",B,"Each layer in a neural network processes input and creates increasingly abstract representations.",https://example.com/neural-networks
4,"What is the activation function?",60,"Powers the network","Introduces non-linearity","Stores weights","Manages connections","Handles errors",B,"Activation functions add non-linearity, allowing networks to learn complex patterns.",https://example.com/activation
5,"Name a real-world AI application:",90,"Email spam filtering","Biological research","Cooking recipes","Gardening tips","All of the above",A,"Email spam filtering is a common practical application of machine learning classification.",https://example.com/ai-applications
```

### Example 2: Advanced 10-Question Quiz (Technical Track)

```csv
question_number,question,timer_seconds,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,source_link
1,"What is the primary difference between supervised and unsupervised learning?",120,"Supervised needs labels, unsupervised doesn't","Unsupervised is faster","Supervised uses more memory","Unsupervised requires more data","They are identical",A,"Supervised learning trains on labeled data with correct answers, while unsupervised finds patterns in unlabeled data.",https://example.com/ml-types
2,"In neural networks, what does backpropagation do?",90,"Moves data backwards","Adjusts weights to minimize loss","Compresses the network","Prevents overfitting","Increases accuracy",B,"Backpropagation calculates gradients and updates weights to reduce prediction errors during training.",https://example.com/backpropagation
3,"What is the role of a loss function?",75,"Measures prediction error","Speeds up training","Stores gradients","Defines network architecture","Handles missing data",A,"The loss function quantifies how wrong predictions are, guiding the network to improve.",https://example.com/loss-functions
4,"Which technique prevents overfitting?",100,"Dropout regularization","Increasing batch size","Removing features","Simplifying the model","All of the above",A,"Dropout randomly disables neurons during training to prevent the model from memorizing data.",https://example.com/overfitting
5,"What is a hyperparameter?",60,"A network connection","A setting controlled by the engineer","A weight in the network","Data from training","An error measurement",B,"Hyperparameters are training settings like learning rate and batch size that we manually choose.",https://example.com/hyperparameters
6,"What does normalization do to input data?",85,"Scales values to a standard range","Removes duplicate rows","Adds noise","Shuffles order","Increases dimensionality",A,"Normalization scales features to similar ranges, improving training speed and convergence.",https://example.com/normalization
7,"What is the vanishing gradient problem?",110,"Gradients become too large","Gradients become too small in deep networks","All gradients become zero","Weights increase infinitely","Loss stops decreasing",B,"In deep networks, gradients can become exponentially small, making training very slow.",https://example.com/vanishing-gradients
8,"What is batch size in training?",70,"Size of training data","Number of samples per gradient update","Number of epochs","Network layer size","Output dimension",B,"Batch size is how many samples are processed before weights are updated.",https://example.com/batch-size
9,"What does an optimizer do?",95,"Optimizes memory usage","Updates weights to minimize loss","Compresses the model","Organizes data","Generates predictions",B,"Optimizers like SGD and Adam adjust weights based on gradients to improve model performance.",https://example.com/optimizers
10,"What is transfer learning?",105,"Using pre-trained models on new tasks","Learning while transferring data","Moving models between devices","Combining multiple models","Sequential learning",A,"Transfer learning leverages knowledge from pre-trained models to solve new problems with less data.",https://example.com/transfer-learning
```

### Example 3: Business Track (Non-Technical)

```csv
question_number,question,timer_seconds,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,source_link
1,"What is artificial intelligence in simple terms?",60,"Robots that replace humans","Computer systems that can perform tasks like humans","Very complicated mathematics","Only for tech companies","Science fiction only",B,"AI systems can learn from data and make decisions, similar to human intelligence but without consciousness.",https://example.com/ai-basics
2,"Which is a business use of AI?",75,"Predicting customer behavior","Flying cars","Time travel","Replacing all jobs","Creating consciousness",A,"Businesses use AI to predict customer behavior, personalize recommendations, and automate decisions.",https://example.com/ai-business
3,"What does machine learning help businesses do?",90,"Hire fewer people","Make better decisions from data","Become invisible","Require less electricity","Eliminate competition",B,"Machine learning finds patterns in business data, improving decisions about pricing, inventory, and customers.",https://example.com/ml-business
4,"What is a chatbot?",60,"A robot that talks","An AI system that converses with users","A social media bot","A computer virus","A search engine",B,"A chatbot is software powered by AI that can have conversations to answer questions and help customers.",https://example.com/chatbots
5,"What does AI ethics mean?",100,"Making AI that's fair and transparent","Preventing AI from becoming sentient","Replacing human judgment entirely","Only for large companies","Slowing down AI development",A,"AI ethics ensures AI systems are fair, transparent, respect privacy, and don't cause harm.",https://example.com/ai-ethics
```

---

## 🔧 Implementation: Create Quiz from CSV

### Step 1: Download CSV Template

Instructor clicks: **[Download CSV Template]**

System provides file: `quiz-template.csv`

```csv
question_number,question,timer_seconds,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,source_link
1,"Your question here?",60,"Option A","Option B","Option C","Option D","Option E",A,"Explain why A is correct and why others are wrong.","https://your-source.com"
2,"Another question?",60,"Option A","Option B","Option C","Option D","Option E",B,"Explain answer B.","https://your-source.com"
```

### Step 2: Upload CSV

Instructor fills CSV with their 50 questions and uploads:

```
[Drag & drop CSV file here]
or
[Choose File]
```

### Step 3: Validation

System validates:
```
POST /api/instructor/[classroomId]/quiz/validate-csv

Checks:
✓ File is CSV format
✓ All required columns present
✓ All rows have 11 columns
✓ question_number sequential (1-50)
✓ timer_seconds between 10-600
✓ All 5 options provided (no empty)
✓ correct_answer is A/B/C/D/E
✓ All options are different
✓ explanation not empty
✓ source_link valid URL (if provided)

Response:
{
  "valid": true,
  "total_questions": 50,
  "errors": [],
  "warnings": []
}
```

### Step 4: Preview

Shows all 50 questions:

```
Question 1 of 50: "What is machine learning?"
Timer: 60 seconds
A) A chatbot
B) Algorithms that learn from data ← CORRECT
C) Advanced mathematics
D) A programming language
E) None of the above

Explanation: "Machine Learning is..."
Source: https://example.com/ml-intro

[← Previous] [Next →]
```

### Step 5: Create Quiz

```
POST /api/instructor/[classroomId]/quiz/create

{
  "title": "Module 1: AI Fundamentals",
  "description": "Introduction to AI concepts",
  "total_questions": 50,
  "questions": [
    {
      "question_number": 1,
      "question": "What is machine learning?",
      "timer_seconds": 60,
      "options": [
        {"label": "A", "text": "A chatbot"},
        {"label": "B", "text": "Algorithms that learn from data"},
        {"label": "C", "text": "Advanced mathematics"},
        {"label": "D", "text": "A programming language"},
        {"label": "E", "text": "None of the above"}
      ],
      "correct_answer": "B",
      "explanation": "Machine Learning is...",
      "source_link": "https://example.com/ml-intro"
    },
    ...
  ]
}
```

### Step 6: Student Takes Quiz

```
Student sees:
┌────────────────────────────────────────┐
│ Question 1 of 50                       │
│ Timer: 60 sec [████████░░░░░░░░░░░░]   │
├────────────────────────────────────────┤
│                                        │
│ What is machine learning?              │
│                                        │
│ ○ A chatbot                            │
│ ○ Algorithms that learn from data      │
│ ○ Advanced mathematics                 │
│ ○ A programming language               │
│ ○ None of the above                    │
│                                        │
│                [Submit Answer]         │
│                                        │
└────────────────────────────────────────┘

After submitting, timer runs out or student moves to Q2:

Question 2 of 50...
```

### Step 7: View Results

```
Your Score: 45/50 (90%)

Question 1: ✓ CORRECT
Your answer: B) Algorithms that learn from data
Correct answer: B) Algorithms that learn from data
Explanation: "Machine Learning is..."
Learn more: https://example.com/ml-intro
Time taken: 45 seconds

Question 2: ✗ INCORRECT
Your answer: A) Email spam filtering
Correct answer: C) Neural networks
Explanation: "Neural networks are..."
Learn more: https://example.com/neural-networks
Time taken: 62 seconds (over time limit)

[Retry Quiz] [View Certificate] [Next Module]
```

---

## 🗄️ Database Schema

```sql
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id),
  question_number INTEGER,
  question TEXT NOT NULL,
  timer_seconds INTEGER DEFAULT 60,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  option_e TEXT NOT NULL,
  correct_answer VARCHAR(1),  -- A, B, C, D, or E
  explanation TEXT,
  source_link TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY,
  submission_id UUID REFERENCES quiz_submissions(id),
  question_id UUID REFERENCES quiz_questions(id),
  selected_answer VARCHAR(1),  -- A, B, C, D, or E
  is_correct BOOLEAN,
  time_taken_seconds INTEGER,
  submitted_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📊 Statistics for 50-Question Quiz

```
Average question:     50-200 characters
Average timer:        60-120 seconds
Average explanation:  200-500 characters
Average CSV file:     30-50 KB

Total time estimate:  60 minutes (50 questions × 60-120 sec average)

Per-question metrics:
  - Parse time:       <1ms
  - Display time:     <100ms
  - Grade time:       <10ms (auto-grade, single answer)
  - Results load:     <500ms (fetch all 50 answers)
```

---

## ✅ CSV Quality Checklist

Before uploading, verify:

- [ ] Exactly 11 columns (question_number through source_link)
- [ ] No empty cells in required columns
- [ ] question_number: 1, 2, 3, ... 50 (no gaps)
- [ ] timer_seconds: All between 10-600 (reasonable values)
- [ ] All 5 options (A-E) provided and unique
- [ ] correct_answer: A, B, C, D, or E (single answer only)
- [ ] explanation: Clear, concise, explains the answer
- [ ] source_link: Valid URL starting with https://
- [ ] No special characters without proper escaping
- [ ] File saved as .csv (not .xls or .xlsx)
- [ ] File encoding: UTF-8
- [ ] Test with 5 questions first before uploading 50

---

## 🎯 Best Practices

### Question Writing
```
✓ Keep questions clear and concise
✓ Avoid ambiguity (only one right answer)
✓ Make wrong answers plausible (not obviously wrong)
✓ Use consistent terminology throughout quiz
✓ Avoid trick questions (focus on knowledge, not gotchas)
```

### Timer Settings
```
✓ 60 seconds:  Simple recall questions
✓ 90 seconds:  Comprehension questions
✓ 120 seconds: Complex analysis questions
✗ <30 seconds: Too rushed
✗ >180 seconds: Allows overthinking
```

### Explanations
```
✓ Explain WHY the correct answer is right
✓ Optionally explain why others are wrong
✓ Provide learning context
✓ Reference source material
✓ 200-500 characters is ideal

Format:
"[Why correct answer is right]. [Context/example]. 
Learn more: [source link]"
```

### Source Links
```
✓ Wikipedia article on topic
✓ Course material or lesson
✓ Official documentation
✓ Research paper or article
✓ Your own training materials

Format:
https://example.com/topic
https://en.wikipedia.org/wiki/Machine_learning
https://docs.python.org/3/library/
```

---

## 🚀 Implementation Roadmap

### Backend APIs

```
1. POST /api/instructor/[classroomId]/quiz/validate-csv
   - Parse CSV
   - Validate all rules
   - Return errors/warnings

2. POST /api/instructor/[classroomId]/quiz/create-from-csv
   - Create quiz record
   - Insert 50 questions
   - Return quiz_id

3. GET /api/instructor/[classroomId]/quiz/[quizId]
   - Fetch quiz with all 50 questions
   - Used for preview/editing

4. PUT /api/instructor/[classroomId]/quiz/[quizId]
   - Update quiz settings
   - Update question details

5. GET /api/student/quiz/[quizId]/start
   - Fetch quiz questions
   - Initialize submission
   - Set timer

6. POST /api/student/quiz/[submissionId]/submit-answer
   - Store answer choice (A/B/C/D/E)
   - Record time taken
   - Auto-grade (compare to correct_answer)

7. GET /api/student/quiz/[submissionId]/results
   - Fetch all answers with explanations
   - Show source links
```

### Frontend Components

```
1. CSVUploadForm.tsx
   - Drag & drop file input
   - File validation
   - Progress indication

2. CSVPreview.tsx
   - Display all 50 questions
   - Show question count, total timer
   - Allow edit/re-upload

3. QuizTaker.tsx
   - Display current question
   - Show timer countdown
   - Radio buttons for A/B/C/D/E
   - Submit button

4. QuizResults.tsx
   - Show score (45/50)
   - Show each question with:
     - Student answer
     - Correct answer
     - Explanation
     - Source link
   - Retry button
```

---

## 📥 Download Your Template

**File:** `quiz-template.csv`

Ready to use. Just fill in your 50 questions!

```csv
question_number,question,timer_seconds,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,source_link
1,"Your question here?",60,"Option A","Option B","Option C","Option D","Option E",A,"Explain why A is correct.","https://your-source.com"
...
```

---

## 🎓 Example: You vs System

### You Prepare CSV (30 minutes)
- Write 50 questions
- Add explanations
- Add source links
- Save as CSV

### System Does The Rest (Automatic)
```
Upload CSV
  ↓
Validate (2 seconds)
  ↓
Preview (instant)
  ↓
Create Quiz (1 second)
  ↓
Publish (instant)
  ↓
Students take quiz (automatic grading, instant results)
  ↓
See scores in gradebook
```

**Total time: 30 minutes to create, publish, and have students take 50-question quiz**

---

## 🔐 Security

```
✓ CSV parsing: No SQL injection (parameterized queries)
✓ URL validation: Prevent malicious links
✓ File upload: Max 10MB, only CSV format
✓ Questions stored safely: Sanitized before display
✓ Permissions: Only instructor who owns classroom can upload
```

