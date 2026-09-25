# ILT Product Architecture: Category → Product → Event Model

**Strategic Design for Scalable, Admin-Friendly Learning Platform**

---

## 🎯 Product Hierarchy

```
CATEGORY (e.g., "Project Management")
├── PRODUCT (e.g., "PMP Boot Camp")
│   ├── EVENT (e.g., "Sep 15-Oct 6, 2026 Cohort")
│   │   └── Sessions (8 live sessions)
│   └── EVENT (e.g., "Oct 13-Nov 3, 2026 Cohort")
│       └── Sessions (8 live sessions)
├── PRODUCT (e.g., "CAPM Certification")
│   ├── EVENT (e.g., "Sep 22-Oct 13, 2026 Cohort")
│   └── EVENT (e.g., "Oct 20-Nov 10, 2026 Cohort")
└── PRODUCT (e.g., "Program Management")
    └── EVENT (e.g., "Oct 1-Nov 12, 2026 Cohort")

CATEGORY (e.g., "Agile & Leadership")
├── PRODUCT (e.g., "PMI-ACP Certification")
│   └── EVENT (e.g., "Sep 29-Oct 20, 2026 Cohort")
└── PRODUCT (e.g., "SAFe Agile Framework")
    └── EVENT (e.g., "Oct 6-Nov 10, 2026 Cohort")
```

---

## 🗄️ DATABASE SCHEMA (Complete)

### Table 1: `ilt_categories`
```sql
CREATE TABLE ilt_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  name TEXT NOT NULL UNIQUE,        -- "Project Management"
  slug TEXT UNIQUE NOT NULL,        -- "project-management"
  description TEXT,                 -- "Industry-leading PM certifications"
  icon TEXT,                        -- "📊" or icon URL
  color_hex TEXT,                   -- "#1E3A5F" (Navy)
  
  -- Metadata
  display_order INTEGER,            -- 1, 2, 3 for ordering on homepage
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 2: `ilt_products` (Courses)
```sql
CREATE TABLE ilt_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to category
  category_id UUID NOT NULL REFERENCES ilt_categories(id),
  
  -- Identity
  name TEXT NOT NULL,               -- "PMP Boot Camp"
  slug TEXT UNIQUE NOT NULL,        -- "pmp-boot-camp"
  short_description TEXT,           -- 1-2 sentences
  full_description TEXT,            -- Rich HTML or markdown
  
  -- Course Content (All 7 customer decision factors)
  learning_objectives JSONB,        -- Array of 8 objectives
  prerequisites JSONB,              -- {required: [...], optional: [...]}
  syllabus JSONB,                   -- {week1: {...}, week2: {...}, ...}
  included_items JSONB,             -- {live_sessions: 8, mock_exams: 3, ...}
  post_course_info JSONB,           -- {if_pass: {...}, if_fail: {...}, guarantees: {...}}
  faq JSONB,                        -- [{q: "...", a: "..."}]
  
  -- Instructor (Can be different per event)
  default_instructor_id UUID REFERENCES instructors(id),
  default_instructor_name TEXT,     -- Denormalized for faster queries
  default_instructor_credentials TEXT, -- "PMP, 15+ years"
  default_instructor_bio TEXT,
  
  -- Pricing & Commercial
  base_price_gbp NUMERIC NOT NULL,  -- 399.00
  base_price_usd NUMERIC,           -- 498.00
  discount_percent INTEGER DEFAULT 0, -- 50
  payment_plans JSONB,              -- [{installments: 3, amount: 150}]
  
  -- Metadata
  category TEXT,                    -- 'certification' | 'professional-dev'
  difficulty_level TEXT,            -- 'beginner' | 'intermediate' | 'advanced'
  duration_weeks INTEGER,           -- 4
  total_hours INTEGER,              -- 32
  language TEXT DEFAULT 'en',       -- 'en', 'es', 'fr', etc.
  tags JSONB DEFAULT '[]'::jsonb,   -- ["PMP", "PMBOK", "exam-prep"]
  
  -- Social Proof
  average_rating NUMERIC,           -- 4.9
  total_reviews INTEGER DEFAULT 0,
  pass_rate NUMERIC,                -- 95%
  students_completed INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  published_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 3: `ilt_events` (Cohorts/Instances)
```sql
CREATE TABLE ilt_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to product
  product_id UUID NOT NULL REFERENCES ilt_products(id),
  category_id UUID NOT NULL REFERENCES ilt_categories(id),
  
  -- Identity
  title TEXT,                       -- "PMP Boot Camp - Sep 15 Cohort"
  slug TEXT UNIQUE NOT NULL,        -- "pmp-boot-camp-sep-15"
  event_number INTEGER,             -- 1, 2, 3 (Cohort #1, #2, #3)
  
  -- Schedule
  start_date DATE NOT NULL,         -- 2026-09-15
  end_date DATE NOT NULL,           -- 2026-10-06
  session_day_1 TEXT,               -- "Tuesday"
  session_day_2 TEXT,               -- "Thursday"
  session_time_start TIME,          -- 18:00
  session_time_end TIME,            -- 20:00
  session_count INTEGER,            -- 8
  timezone TEXT DEFAULT 'UTC',      -- 'Europe/London'
  
  -- Instructor (Override default if different)
  instructor_id UUID REFERENCES instructors(id),
  instructor_name TEXT,
  instructor_credentials TEXT,
  
  -- Capacity
  max_students INTEGER,             -- 12
  enrolled_count INTEGER DEFAULT 0, -- 9
  waitlist_count INTEGER DEFAULT 0, -- 0
  seats_available INTEGER GENERATED ALWAYS AS (max_students - enrolled_count) STORED,
  
  -- Pricing (Can override product price)
  event_price_gbp NUMERIC,          -- NULL = use product price
  event_discount_percent INTEGER,
  
  -- Status & Enrollment
  enrollment_status TEXT DEFAULT 'open', -- 'open' | 'full' | 'closed' | 'completed'
  enrollment_deadline DATE,         -- 3 days before start
  can_waitlist BOOLEAN DEFAULT true,
  
  -- Links & Resources
  meeting_platform TEXT,            -- 'Zoom' | 'Teams' | 'Google Meet'
  meeting_link TEXT,                -- URL (populated after booking)
  recording_availability TEXT,      -- 'immediate' | 'after_completion' | 'lifetime'
  recording_access_months INTEGER DEFAULT 6,
  
  -- Event-specific Notes
  notes TEXT,                       -- Special instructions, custom info
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 4: `ilt_event_sessions` (Individual Sessions)
```sql
CREATE TABLE ilt_event_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to event
  event_id UUID NOT NULL REFERENCES ilt_events(id),
  
  -- Session Details
  session_number INTEGER,           -- 1, 2, 3, ... 8
  title TEXT,                       -- "Week 1: PMBOK Introduction"
  scheduled_date DATE,              -- 2026-09-15
  scheduled_time_start TIME,        -- 18:00
  scheduled_time_end TIME,          -- 20:00
  
  -- Content
  topics TEXT ARRAY,                -- ["PMBOK Overview", "10 Knowledge Areas"]
  description TEXT,
  learning_objectives TEXT ARRAY,
  practice_questions_count INTEGER, -- 40
  
  -- Recording
  recording_link TEXT,              -- URL after session
  recording_uploaded_at TIMESTAMP WITH TIME ZONE,
  
  -- Attendance
  attendees_count INTEGER,
  attendees_list UUID ARRAY REFERENCES ilt_event_enrollments(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 5: `ilt_event_enrollments` (Student Enrollments)
```sql
CREATE TABLE ilt_event_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to event
  event_id UUID NOT NULL REFERENCES ilt_events(id),
  product_id UUID NOT NULL REFERENCES ilt_products(id),
  
  -- Student
  student_id UUID REFERENCES students(id),
  student_email TEXT NOT NULL,
  student_name TEXT,
  
  -- Enrollment
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  enrollment_status TEXT DEFAULT 'enrolled', -- 'enrolled' | 'completed' | 'dropped' | 'waitlist'
  
  -- Progress & Results
  sessions_attended INTEGER DEFAULT 0,
  completion_date DATE,
  exam_passed BOOLEAN,
  exam_score INTEGER,
  course_completion_percent INTEGER DEFAULT 0,
  
  -- Certificate
  certificate_id UUID,
  certificate_issued_at TIMESTAMP WITH TIME ZONE,
  
  -- Custom Fields (for admin tracking)
  notes TEXT,                       -- Admin notes
  payment_status TEXT,              -- 'paid' | 'pending' | 'refunded'
  payment_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🎨 NAVIGATION STRUCTURE (User Experience)

### Customer Journey
```
HomePage
└── /academy (Public)
    └── /academy/ilt (Public ILT Hub)
        ├── Category Filter: "Project Management", "Agile & Leadership", etc.
        ├── Product Cards Grid: "PMP Boot Camp", "CAPM", "Program Management"
        └── /academy/ilt/[productSlug] (Course Detail Page)
            ├── Schedule Section → "View All Events"
            └── /academy/ilt/[productSlug]/events (All Events for This Product)
                └── /academy/ilt/[productSlug]/events/[eventSlug] (Event Detail)
                    └── [Enroll Button] → /checkout
```

### Admin Journey
```
/admin/ilt-management
├── Dashboard: Quick stats (total courses, active events, enrollments)
├── Categories Management
│   ├── List all categories
│   ├── Create new category
│   ├── Edit category
│   └── Delete category
├── Products Management (Courses)
│   ├── List all courses
│   ├── Create course (manual form)
│   ├── Bulk upload courses (CSV)
│   │   └── Template: name, category, description, instructor, price, duration, etc.
│   ├── Edit course
│   ├── Duplicate course (clone + modify)
│   └── Delete course
├── Events Management (Cohorts)
│   ├── Calendar view of all upcoming events
│   ├── Create event (linked to product)
│   ├── Bulk create events (CSV)
│   │   └── Template: product_name, start_date, end_date, instructor, max_students
│   ├── Edit event
│   ├── Auto-generate recurring events (e.g., "Every 2 weeks, same day/time")
│   └── Cancel/archive event
├── Enrollment Management
│   ├── View all enrollments by event
│   ├── Bulk export enrollments (CSV)
│   ├── Send bulk emails to cohort
│   ├── Mark as completed/dropped
│   └── Issue certificates
└── Analytics & Reporting
    ├── Course performance (pass rate, avg score, reviews)
    ├── Event fill rate (seats vs enrolled)
    ├── Student retention (completion rate)
    ├── Revenue by product/category
    └── Export reports (PDF, CSV, Excel)
```

---

## 📥 ADMIN DATA UPLOAD FORMATS

### Option 1: Bulk Upload Categories (CSV)
```csv
name,slug,description,icon,color_hex,display_order
Project Management,project-management,Industry-leading PM certifications,📊,#1E3A5F,1
Agile & Leadership,agile-leadership,Agile frameworks and team leadership,🚀,#0891B2,2
Data & Analytics,data-analytics,Data science and business analytics,📈,#EA580C,3
```

### Option 2: Bulk Upload Courses (CSV)
```csv
category,name,slug,short_description,instructor,base_price_gbp,difficulty_level,duration_weeks,total_hours
Project Management,PMP Boot Camp,pmp-boot-camp,4-week intensive PMP prep,John Smith,399,intermediate,4,32
Project Management,CAPM Certification,capm-cert,Foundation PM certification,Sarah Chen,299,beginner,3,24
Project Management,Program Management,program-mgmt,Program & portfolio management,Michael Kumar,449,advanced,5,40
Agile & Leadership,PMI-ACP Agile,pmi-acp,Agile certification course,Lisa Wong,349,intermediate,4,28
```

### Option 3: Bulk Upload Events/Cohorts (CSV)
```csv
product_slug,event_number,start_date,end_date,instructor_name,max_students,session_day_1,session_day_2,session_time_start,session_time_end
pmp-boot-camp,1,2026-09-15,2026-10-06,John Smith,12,Tuesday,Thursday,18:00,20:00
pmp-boot-camp,2,2026-10-13,2026-11-03,Sarah Patterson,12,Monday,Wednesday,19:00,21:00
pmp-boot-camp,3,2026-11-10,2026-12-01,Michael Chen,12,Tuesday,Thursday,18:00,20:00
capm-cert,1,2026-09-22,2026-10-13,Sarah Chen,10,Monday,Thursday,18:30,20:00
capm-cert,2,2026-10-20,2026-11-10,Sarah Chen,10,Monday,Thursday,18:30,20:00
```

### Option 4: Auto-Generate Recurring Events
```json
{
  "product_slug": "pmp-boot-camp",
  "recurrence_rule": "FREQ=MONTHLY;INTERVAL=1;BYDAY=2TU,2TH",
  "first_event_start": "2026-09-15",
  "duration_weeks": 4,
  "instructor_id": "uuid-of-john-smith",
  "max_students": 12,
  "session_time_start": "18:00",
  "session_time_end": "20:00",
  "generate_count": 12,
  "timezone": "Europe/London"
}
```

This generates 12 events automatically, each 4 weeks apart, every month on Tuesday & Thursday.

---

## 🎯 KEY FEATURES FOR ADMIN AUTOMATION

### 1. **Smart Defaults**
- Instructor defaults from product
- Pricing defaults from product
- Session schedule defaults from product
- Timezone defaults to user's timezone

### 2. **Bulk Operations**
- Bulk create events from template
- Bulk send emails to event
- Bulk issue certificates
- Bulk export enrollments

### 3. **Auto-Generation**
- Auto-generate sessions from event duration & schedule
- Auto-calculate seats remaining
- Auto-generate enrollment URLs/codes
- Auto-create cohort channels (Slack/Teams)

### 4. **Validation & Safety**
- Prevent date overlaps for same course
- Validate instructor availability
- Check max_students > 0
- Warn if enrollment deadline passed
- Prevent duplicate events

### 5. **Notifications & Automation**
- Auto-send welcome email when event created
- Auto-send reminder emails to students (1 week, 1 day, 1 hour before event)
- Auto-send recording link after session
- Auto-issue certificate when exam passed
- Auto-mark completed when end_date passes

---

## 🔗 NAVIGATION EXAMPLES

### Example 1: Browse PMP Course
```
1. User visits /academy/ilt (Public)
2. Sees categories: "Project Management", "Agile & Leadership", etc.
3. Clicks "Project Management" → Filter shows PMP, CAPM, Program Management
4. Clicks "PMP Boot Camp" → Goes to /academy/ilt/pmp-boot-camp
5. Sees course details + 3 upcoming events (Sep, Oct, Nov cohorts)
6. Clicks "Enroll in Sep 15 Cohort" → Stripe checkout → Success → Account creation
7. Now logged in, sees /academy → "My Courses" → "PMP Boot Camp - Sep 15"
```

### Example 2: Admin Creates New Course & Events
```
1. Admin goes to /admin/ilt-management
2. Clicks "Bulk Upload Courses"
3. Downloads CSV template
4. Fills in 5 new courses (PMP, CAPM, Program Mgmt, PMI-ACP, SAFe)
5. Uploads CSV → System validates & imports
6. Admin then goes to "Events Management"
7. Clicks "Auto-Generate Events"
8. Selects "PMP Boot Camp" → Sets "Monthly, every 2 weeks" → Sets 12 iterations
9. System auto-creates 12 events with dates & times
10. Admin reviews → Confirms → Done in 5 minutes (vs 2 hours manual)
```

---

## 📊 DATA FLOW DIAGRAM

```
Admin Dashboard
    ↓
[Upload CSV: Categories, Products, Events]
    ↓
Database: categories → products → events → sessions → enrollments
    ↓
Frontend: Homepage → /academy/ilt → Category → Product → Events
    ↓
Student: Browse → View → Enroll → Pay → Access → Complete
    ↓
Admin Reports: Enrollment, Pass Rate, Revenue, Satisfaction
```

---

## ✨ SCALABILITY BENEFITS

| Scenario | Before (Manual) | After (Automated) |
|----------|-----------------|-------------------|
| Add 10 new courses | 2 hours | 10 minutes (CSV upload) |
| Create monthly cohorts for 5 courses | 1 hour | 5 minutes (auto-generate) |
| Send cohort reminder emails | 30 minutes | 1 click (auto-scheduled) |
| Export enrollment reports | 20 minutes | 1 click (export button) |
| Issue certificates to 50 students | 2 hours | 1 click (bulk issue) |
| **Total time saved per month** | **~20+ hours** | **~2 hours** |

---

## 🚀 IMPLEMENTATION PHASES

### Phase 1 (NOW): Core Structure
- [ ] Create all 5 database tables
- [ ] Create admin upload forms (manual + CSV)
- [ ] Design course detail page with events
- [ ] Wire up basic enrollment (Stripe in Phase 2)

### Phase 2 (Sep): Admin Automation
- [ ] Bulk CSV import
- [ ] Auto-generate recurring events
- [ ] Auto-send emails to cohorts
- [ ] Bulk certificate issuance

### Phase 3 (Oct): Advanced Features
- [ ] Calendar view of events
- [ ] Cohort Slack/Teams channel auto-creation
- [ ] Analytics & reporting dashboard
- [ ] Student performance tracking

### Phase 4 (Nov): Polish
- [ ] Mobile app for instructors
- [ ] Real-time attendance tracking
- [ ] AI-powered course recommendations
- [ ] Integration with calendar (Google, Outlook)

---

## ✅ SUMMARY: Why This Architecture Works

✅ **Scalable**: Add 100+ courses without code changes  
✅ **Admin-Friendly**: CSV uploads, auto-generation, no manual labor  
✅ **Flexible**: Different pricing, instructors, schedules per event  
✅ **User-Friendly**: Clear navigation Category → Product → Event  
✅ **Profit-Friendly**: Easy to see revenue by category/product  
✅ **Future-Proof**: Can add features (waitlists, recordings, certificates)  
✅ **Analytics-Ready**: Built-in tracking for pass rates, completion, revenue

---

**Does this architecture make sense? Any changes or additions you'd like?**
