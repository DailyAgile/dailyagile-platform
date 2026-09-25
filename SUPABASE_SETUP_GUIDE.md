# Supabase Setup Guide — CSV Quiz Feature

**Status:** Required for testing the CSV quiz module  
**Time to Setup:** ~10 minutes  
**Difficulty:** Easy

---

## Why Supabase?

The CSV quiz system stores:
- ✅ Quiz definitions (title, description, settings)
- ✅ Questions (text, options, correct answer, explanation)
- ✅ Student sessions (quiz attempts, scores)
- ✅ Student responses (answers, timing, correctness)

Without a database, quizzes can't be persisted.

---

## Quick Start: 3 Options

### Option 1: Use Supabase Cloud (Recommended - Free Tier)
**Time:** ~5 minutes  
**Cost:** Free tier available

### Option 2: Local Supabase (Self-Hosted)
**Time:** ~10 minutes  
**Cost:** Free  
**Requires:** Docker

### Option 3: Skip Testing (View Code Only)
**Time:** 0 minutes  
**Cost:** Free  
**Limitation:** Can't actually test the feature

---

## ✅ Option 1: Supabase Cloud (Recommended)

### Step 1: Create a Free Supabase Account

1. Go to: **https://supabase.com**
2. Click **"Start your project"**
3. Sign up with GitHub or email
4. Create a new project:
   - **Name:** `dailyagile-dev`
   - **Password:** Save this! (you'll need it)
   - **Region:** US East (or closest to you)
5. Wait 1-2 minutes for project to initialize

### Step 2: Get Your Credentials

Once your project is created:

1. Go to **Project Settings** (bottom left)
2. Click **API** tab
3. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

**⚠️ Security:** Keep the `service_role secret` private! Never commit to GitHub.

### Step 3: Update `.env.local`

Edit `/Users/apgo21/dailyagile-platform/openMAIC/.env.local`:

```bash
# --- Supabase (Student progress tracking) -----------------------------------
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
```

**Example (DO NOT USE — for illustration only):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdef123456.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Create Database Tables

Go to your Supabase project dashboard:

1. Click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Paste this SQL:

```sql
-- Create classrooms table
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{"selfPaced": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id),
  instructor_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  total_questions INTEGER,
  total_points INTEGER,
  settings JSONB DEFAULT '{"show_answers_after_submit": true, "allow_retakes": 3, "passing_score": 70}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quiz_questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question TEXT NOT NULL,
  timer_seconds INTEGER DEFAULT 60,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  option_e TEXT,
  correct_answer CHAR(1) CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E')),
  explanation TEXT,
  source_link TEXT,
  points INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quiz_sessions table
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id),
  student_id TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'in_progress',
  score INTEGER,
  percentage NUMERIC,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quiz_responses table
CREATE TABLE IF NOT EXISTS quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id),
  selected_answer CHAR(1) CHECK (selected_answer IS NULL OR selected_answer IN ('A', 'B', 'C', 'D', 'E')),
  is_correct BOOLEAN,
  time_taken_seconds INTEGER,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_classrooms_instructor ON classrooms(instructor_id);
CREATE INDEX idx_quizzes_classroom ON quizzes(classroom_id);
CREATE INDEX idx_quizzes_instructor ON quizzes(instructor_id);
CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_sessions_quiz ON quiz_sessions(quiz_id);
CREATE INDEX idx_quiz_sessions_student ON quiz_sessions(student_id);
CREATE INDEX idx_quiz_responses_session ON quiz_responses(session_id);
CREATE INDEX idx_quiz_responses_question ON quiz_responses(question_id);

-- Optional: Create students table for ILT features
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

4. Click **Run** (or press `Ctrl+Enter`)
5. ✅ All tables created!

### Step 5: Restart Dev Server

```bash
# Kill the old server
pkill -f "next dev"

# Start new server
cd /Users/apgo21/dailyagile-platform/openMAIC
npm run dev
```

---

## ✅ Option 2: Local Supabase (Docker)

### Prerequisites
- Docker installed (`docker --version`)
- Docker running

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Initialize Local Supabase

```bash
cd /Users/apgo21/dailyagile-platform/openMAIC
supabase init
```

### Step 3: Start Local Supabase

```bash
supabase start
```

This outputs:
```
API URL: http://localhost:54321
Anon Key: eyJ...
Service Role Key: eyJ...
```

### Step 4: Update `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Step 5: Create Tables

Run the SQL from Option 1 in the Supabase Studio UI (accessible at `http://localhost:54321`)

---

## ✅ Option 3: Skip Testing

If you just want to see the code without testing:

1. **Review the components:**
   - `openMAIC/components/instructor/quiz/*.tsx`
   - `openMAIC/components/student/quiz/*.tsx`

2. **Review the API:**
   - `openMAIC/app/api/instructor/quiz/*.ts`
   - `openMAIC/app/api/student/quiz/*.ts`

3. **Review the CSV parser:**
   - `openMAIC/lib/quiz/csv-parser.ts`

---

## 🧪 Verify Setup

Once configured, run this test:

```bash
curl -X POST http://localhost:3000/api/instructor/quiz/validate-csv \
  -H "Content-Type: application/json" \
  -d '{"csv_content": "question_number,question,timer_seconds,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,source_link\n1,\"Test?\",60,\"A\",\"B\",\"C\",\"D\",\"E\",B,\"Yes\",\"https://example.com\""}'
```

**Expected Response:**
```json
{
  "success": true,
  "valid": true,
  "total_questions": 1,
  "errors": [],
  "warnings": []
}
```

If you get `supabaseUrl is required`, your credentials aren't set in `.env.local`.

---

## 🐛 Troubleshooting

### "supabaseUrl is required"
- ✅ Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`
- ✅ Restart dev server after updating `.env.local`
- ✅ No typos in variable names

### "Cannot connect to Supabase"
- ✅ Check your internet connection (cloud option)
- ✅ Check Docker is running (local option)
- ✅ Check credentials are correct in `.env.local`

### "Table does not exist"
- ✅ Run the SQL from Step 4 (Option 1) to create tables
- ✅ Verify SQL ran without errors

### "Permission denied"
- ✅ Check `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
- ✅ In Supabase, go to **Auth** → **Policies** → Enable RLS (if needed)

---

## 📚 Next Steps

After setup:

1. ✅ Restart dev server: `npm run dev`
2. ✅ Open: `http://localhost:3000/instructor/quiz/create`
3. ✅ Upload `sample-quiz.csv`
4. ✅ Create a quiz
5. ✅ Test student quiz-taking

---

## 🔒 Security Notes

- **Never commit** `.env.local` to Git (it's in `.gitignore`)
- **Rotate keys** regularly (Supabase dashboard)
- **Use row-level security (RLS)** in production (not needed for testing)
- **Service role key** is for server-only (never expose in frontend)

---

## 💡 Pro Tips

- **Supabase free tier:** 500MB storage, generous rate limits
- **Local Supabase:** Perfect for offline development
- **Reset data:** Delete all rows from tables via Supabase UI
- **Backup data:** Supabase auto-backs up to 7 days

---

## Need Help?

- Supabase docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.io
- This project's docs: `CSV_QUIZ_README.md`

---

**Choose an option and you'll be testing in <15 minutes! 🚀**
