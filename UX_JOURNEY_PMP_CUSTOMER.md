# UX Journey Analysis: PM Customer Buying PMP Boot Camp

**Persona:** Sarah Chen, Project Manager at TechCorp  
**Goal:** Find and purchase PMP boot camp course  
**Timeline:** First-time visitor, heard great things about DailyAgile

---

## 📍 IDEAL CUSTOMER JOURNEY (What SHOULD Happen)

### Stage 1: Discovery & Landing (First Impression)
**Sarah's mindset:** "I've heard DailyAgile is excellent for PMP prep. Let me check them out."

**Ideal Experience:**
- ✅ Lands on `/academy` 
- ✅ Immediately sees "PMP Boot Camp" course prominently featured (or easily searchable)
- ✅ Clear value prop: "Industry-leading PMP preparation | Live instructor-led sessions | Exam-ready guarantee"
- ✅ No login required to browse courses
- ✅ Navigation is obvious: "Browse ILT Courses" button visible
- ✅ Trustmarks visible: "4.9★ from 2,400 reviews" | "95% pass rate" | "30-day money back"

**Time to find PMP course:** < 30 seconds

---

### Stage 2: Course Discovery (/academy/ilt)
**Sarah's mindset:** "Let me see what PMP courses are available and compare options."

**Ideal Experience:**
- ✅ Course listing page loads fast (<2 sec)
- ✅ Can see **all available courses at a glance** OR search/filter by:
  - Certification type (PMP, CAPM, etc.)
  - Delivery mode (Live, Self-paced)
  - Price range
  - Instructor name
- ✅ PMP Boot Camp card shows:
  - Course name + description
  - Instructor (photo + credentials: "John Smith, PMP, 15+ years")
  - Price clearly visible: "£399"
  - Duration: "4 weeks"
  - Next 3 cohorts with:
    - Start dates
    - Available seats ("8 seats left" creates urgency)
    - Instructor name for that cohort
  - Student reviews snippet: "★★★★★ 'Life-changing course'"
  - CTA button: "Enroll Now"
  - Optional: "View full syllabus" link

**Time to compare courses:** 1-2 minutes

---

### Stage 3: Course Details Deep-Dive
**Sarah's mindset:** "This looks good, but I need to know exactly what I'm getting before I pay £399."

**Ideal Experience (Click "View full syllabus" or expand course card):**
- ✅ Full course page loads with:
  - **What You'll Learn:** 5 PMBOK knowledge areas, 10+ processes, exam strategies
  - **Syllabus:** Week-by-week breakdown
    - Week 1: PMBOK Intro + Initiation
    - Week 2: Planning group processes
    - Week 3: Execution & Monitoring
    - Week 4: Exam prep + mock exam
  - **Instructor Bio:** John Smith
    - PMP certified since 2009
    - Managed $50M+ projects
    - 500+ students trained
    - 94% first-attempt pass rate
  - **Cohort Details:** 
    - "Next cohort starts Sep 15, 2026"
    - "Live sessions: Tuesday & Thursday 6-8 PM GMT"
    - "Recordings available for 6 months"
    - "8 seats available"
  - **Price Breakdown:**
    - Course tuition: £399
    - Exam voucher included: +£350 value
    - Study materials PDF: included
    - 1-on-1 coaching session: included (£150 value)
    - Total value: £899 | Your price: £399
  - **Social Proof:**
    - "Recently 127 students enrolled"
    - "95% would recommend"
    - Student testimonials with photos/names
  - **FAQ Section:**
    - "Can I access recordings if I miss a session?"
    - "What if I fail the exam?"
    - "Is there a payment plan?" (→ Yes, 3×£150)
    - "Can I switch cohorts after enrollment?"

**Time to review details:** 3-5 minutes

---

### Stage 4: Decision & FOMO Moment
**Sarah's mindset:** "This looks perfect. I want to enroll but I'm slightly concerned about committing."

**Ideal Experience:**
- ✅ Dynamic social proof on page:
  - "🔴 LIVE: 2 people viewing this course right now"
  - "3 people enrolled in last 24 hours"
  - "Only 8 seats left for Sep 15 cohort"
- ✅ Trust builders visible:
  - "✓ 30-day money-back guarantee"
  - "✓ Includes £350 exam voucher"
  - "✓ Lifetime access to course materials"
  - "✓ Cohort guarantee (if <5 students, refund or reschedule)"
- ✅ Clear "Enroll Now" CTA button (teal, prominent)
- ✅ Optional: Live chat widget "Questions? Ask our advisors"

**Time to reach purchase decision:** 5-10 minutes total

---

### Stage 5: Checkout Flow (No Login Required Yet)
**Sarah's mindset:** "I'm ready to buy. Let me go through checkout quickly."

**Ideal Experience:**
- ✅ Click "Enroll Now" → Stripe checkout modal/page
- ✅ Checkout flow:
  1. **Review order:**
     - PMP Boot Camp (Sep 15 cohort)
     - Price: £399
     - Payment method options (Card, PayPal, Apple Pay)
  2. **Enter payment info** (Stripe handles security)
  3. **Enter email** for order confirmation
  4. **Confirm & Pay**
- ✅ Payment confirmation screen:
  - "✓ Payment successful!"
  - "Order #12345"
  - "Receipt emailed to sarah@techcorp.com"
  - "Next step: Create your DailyAgile account"
  - CTA: "Create Account Now" (blue button)

**Time to checkout:** 2-3 minutes

---

### Stage 6: Post-Purchase Onboarding
**Sarah's mindset:** "Payment done! Now let me get access to the course."

**Ideal Experience:**
- ✅ Redirected to account creation page with:
  - Email pre-filled: "sarah@techcorp.com"
  - Form fields:
    - Full name: "Sarah Chen"
    - Password (with strength indicator)
    - "I agree to terms & privacy policy"
  - CTA: "Create Account & Access Course"
- ✅ Account created → Auto-login
- ✅ Redirected to `/academy` dashboard showing:
  - Welcome: "Welcome, Sarah! 👋 Your PMP Boot Camp starts Sep 15."
  - "📚 My Courses" section showing:
    - PMP Boot Camp card
    - Status: "Starts Sep 15, 2026 | 8 days away"
    - Links:
      - "View course materials"
      - "Download syllabus"
      - "Join pre-cohort Facebook group"
      - "Attend live kickoff session (optional)"
- ✅ Email confirmation sent:
  - Order receipt
  - Account created
  - Link to access course
  - Pre-course prep checklist
  - "See you Sep 15!" message from instructor

**Time to full onboarding:** 2-3 minutes

---

## 🔴 CURRENT STATE ANALYSIS (What We Have Today)

### /academy Dashboard (Current)
```
✅ GOOD:
- Public (no login required)
- Shows 3 product cards (ILT, Self-Paced, Quiz)
- ILT card has "Public" badge
- Clean design

❌ GAPS:
- No mention of PMP course specifically
- No course search/browse on main dashboard
- No social proof (reviews, testimonials, pass rates)
- No trustmarks or guarantees visible
- No urgency/FOMO elements
- Dashboard doesn't guide visitor toward ILT courses
```

### /academy/ilt Page (Current)
```
✅ GOOD:
- Public page
- Displays 4 sample courses
- Shows instructor names
- Shows pricing
- Shows next cohorts

❌ GAPS:
- Only 4 courses (need 60+)
- Sample data, not real ILT courses
- No search/filter functionality
- No "PMP Boot Camp" specifically
- No course descriptions beyond 1 sentence
- No instructor photos/credentials
- No student reviews/testimonials
- No syllabus link
- No "View Details" page per course
- No social proof (live viewers, enrollment count)
- No trustmarks/guarantees
- "Enroll Now" button doesn't link to Stripe (placeholder)
- No payment plan options displayed
- No FAQ section
- No live chat support
- Cohort details minimal (just date + seats)
```

### Checkout Experience (Current)
```
❌ NOT BUILT YET
- No Stripe integration
- No post-purchase account creation flow
- No onboarding sequence
```

---

## 🎯 GAP ANALYSIS: What's Missing for Ideal Journey

| # | Gap | Impact | Severity | Phase |
|---|-----|--------|----------|-------|
| 1 | Only 4 sample courses (need 60+) | Can't find real PMP course | 🔴 CRITICAL | Phase 1 (data import) |
| 2 | No course details/syllabus page | Can't evaluate course thoroughly | 🔴 CRITICAL | Phase 1 |
| 3 | No instructor credentials display | Can't build trust in instructor | 🟡 HIGH | Phase 1 |
| 4 | No student reviews/testimonials | Can't see social proof | 🟡 HIGH | Phase 1 |
| 5 | No search/filter courses | Hard to find specific course | 🟡 HIGH | Phase 1 |
| 6 | No Stripe checkout integration | Can't actually purchase | 🔴 CRITICAL | Phase 2 (payment) |
| 7 | No post-purchase onboarding | Can't access course after purchase | 🔴 CRITICAL | Phase 2 |
| 8 | No urgency/FOMO elements | Lower conversion rate | 🟡 MEDIUM | Phase 2 (analytics) |
| 9 | No trustmarks/guarantees | Higher purchase anxiety | 🟡 MEDIUM | Phase 1 |
| 10 | No live chat support | No way to ask questions | 🟡 MEDIUM | Phase 3 |
| 11 | No FAQ section | Common questions unanswered | 🟡 MEDIUM | Phase 1 |
| 12 | No payment plan display | Barrier for price-sensitive buyers | 🟡 MEDIUM | Phase 2 |

---

## 📊 Current vs. Ideal: Time Breakdown

| Stage | Ideal Time | Current Reality | Gap |
|-------|-----------|-----------------|-----|
| **1. Discovery** | <30 sec | ~2 min (can't find course) | ❌ -90 sec |
| **2. Course Listing** | 1-2 min | ~30 sec (works) | ✅ OK |
| **3. Course Details** | 3-5 min | N/A (page doesn't exist) | ❌ MISSING |
| **4. Decision** | 5-10 min | N/A (no details to decide from) | ❌ MISSING |
| **5. Checkout** | 2-3 min | N/A (not built) | ❌ MISSING |
| **6. Onboarding** | 2-3 min | N/A (not built) | ❌ MISSING |
| **TOTAL** | **~13-23 min** | **~2 min (incomplete)** | **Missing 80% of journey** |

---

## 🎨 Recommended Implementation Sequence

### ✅ Phase 1 (THIS SPRINT - Academy MVP)
**Goal:** Get to "Browse & Learn" stage (stages 1-3)

Must-have:
1. Import 60+ real ILT courses from database
2. Create course details page template (`/academy/ilt/[courseId]/page.tsx`)
3. Add instructor credentials display
4. Add syllabus section
5. Add search/filter by course type
6. Add trustmarks section (e.g., "£399 | 4 weeks | PMP certification")
7. Add FAQ accordion component
8. Improve course card with more details

Must-NOT-have (Phase 2+):
- Stripe checkout
- Post-purchase onboarding
- Student reviews (need real data)
- Live chat
- Payment plans

### ✅ Phase 2 (NEXT SPRINT - Full Purchase)
**Goal:** Enable actual purchase (stages 5-6)

1. Wire Stripe checkout
2. Post-purchase account creation flow
3. Auto-enroll in course
4. Send confirmation email
5. Redirect to My Courses dashboard

### ✅ Phase 3 (LATER - Polish & Trust)
**Goal:** Build trust & reduce friction

1. Student reviews system (after courses complete)
2. Instructor bio pages
3. FOMO elements (live viewers, enrollment count)
4. Payment plans (3×installment options)
5. Live chat support widget
6. Guarantee badge
7. Pre-cohort community setup

---

## 🚨 Current Blocker for "Sarah's Journey"

**Right now, Sarah CANNOT:**
1. ❌ Find "PMP Boot Camp" course (only 4 sample courses)
2. ❌ View full course details/syllabus
3. ❌ See instructor credentials
4. ❌ Purchase the course (Stripe not integrated)
5. ❌ Create account post-purchase
6. ❌ Access course materials

**Sarah WILL:**
- Land on `/academy` ✅
- Click "ILT Cohorts" ✅
- See 4 sample courses ✅
- Be disappointed there's no PMP course ❌
- **Leave and search for alternative training provider** ❌

---

## ✅ What Needs to Happen in Phase 1 to Unblock Sarah

1. **Replace sample data with real 60+ ILT courses** from Supabase
   - Must include: "PMP Boot Camp"
   - Must include all course metadata: name, description, instructor, price, schedule
   
2. **Create individual course detail page** (`/academy/ilt/[courseId]`)
   - Show full syllabus
   - Show instructor bio + credentials
   - Show all cohorts with detailed schedule
   - Add trustmarks + guarantees
   - Add FAQ section
   
3. **Add search/filter** to course listing
   - Filter by: certification type, price, start date, instructor
   - Search by: course name, keyword
   
4. **Wire "Enroll Now" button** to Stripe checkout (Phase 2)
   - Currently just logs to console
   - Needs to redirect to Stripe payment
   
5. **Handle post-purchase flow** (Phase 2)
   - After payment → account creation
   - Auto-enroll in course
   - Redirect to course access

---

## 🎯 Question for You

**Based on this UX journey analysis:**

Should we prioritize in Phase 1:
- **Option A:** Get real 60+ courses + course detail page + search (so Sarah can find PMP course)
- **Option B:** Keep current /academy/ilt as-is and focus on Stripe integration first
- **Option C:** Both simultaneously (courses + search + Stripe)

What's your priority?

