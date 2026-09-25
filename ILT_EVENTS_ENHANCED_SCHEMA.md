# ILT Events - Enhanced Schema for Global Operations

**Requirements:**
- Event types: 2-full-days, 3-days, weekly sessions
- Time zone intelligence: Display in user's local timezone
- Global pricing: IP-based detection + regional admin pricing

---

## 🗄️ UPDATED DATABASE SCHEMA

### Table 1: `ilt_events` (Enhanced with Event Types & Timezone)

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
  
  -- ========== NEW: EVENT DURATION TYPE ==========
  event_type TEXT NOT NULL,         -- 'intensive-2days' | 'intensive-3days' | 'weekly'
  
  -- For 2-day intensive: Sep 15-16 (Sat-Sun)
  -- For 3-day intensive: Sep 15-17 (Thu-Fri-Sat)
  -- For weekly: Sep 15 - Oct 13 (Tuesday & Thursday)
  
  -- ========== SCHEDULE FOR EACH TYPE ==========
  
  -- For ALL event types:
  start_date DATE NOT NULL,         -- 2026-09-15 (first day)
  end_date DATE NOT NULL,           -- 2026-09-16 (last day)
  
  -- For intensive (2-day, 3-day):
  daily_session_hours NUMERIC,      -- 5.0 (hours per day)
  daily_start_time TIME,            -- 09:00 (9 AM)
  daily_end_time TIME,              -- 14:00 (2 PM, with breaks)
  break_schedule JSONB,             -- {
                                    --   "break1": {"start": "10:30", "end": "10:45"},
                                    --   "lunch": {"start": "12:00", "end": "13:00"},
                                    --   "break2": {"start": "13:45", "end": "14:00"}
                                    -- }
  
  -- For weekly sessions:
  session_day_1 TEXT,               -- "Tuesday"
  session_day_2 TEXT,               -- "Thursday" (can be NULL if only 1 day/week)
  session_time_start TIME,          -- 18:00
  session_time_end TIME,            -- 20:00
  session_count INTEGER,            -- 8 (total sessions over the course)
  
  -- ========== TIME ZONE INTELLIGENCE ==========
  event_timezone TEXT NOT NULL,     -- 'America/New_York' (IANA timezone)
  
  -- This affects:
  -- 1. How times are stored (always in this timezone)
  -- 2. When event is scheduled (relative to this timezone)
  -- 3. When emails are sent (relative to this timezone)
  
  -- ========== INSTRUCTOR ==========
  instructor_id UUID REFERENCES instructors(id),
  instructor_name TEXT,
  instructor_credentials TEXT,
  
  -- ========== CAPACITY ==========
  max_students INTEGER,             -- 12
  enrolled_count INTEGER DEFAULT 0, -- 9
  waitlist_count INTEGER DEFAULT 0,
  seats_available INTEGER GENERATED ALWAYS AS (max_students - enrolled_count) STORED,
  
  -- ========== BASE PRICING (default) ==========
  base_price_gbp NUMERIC,           -- £399 (fallback if no regional pricing)
  base_price_usd NUMERIC,           -- $499
  base_currency TEXT DEFAULT 'USD', -- Primary currency for admin
  
  -- ========== STATUS & ENROLLMENT ==========
  enrollment_status TEXT DEFAULT 'open', -- 'open' | 'full' | 'closed' | 'completed'
  enrollment_deadline DATE,         -- 3 days before start
  can_waitlist BOOLEAN DEFAULT true,
  
  -- ========== MEETING DETAILS ==========
  meeting_platform TEXT,            -- 'Zoom' | 'Teams' | 'Google Meet'
  meeting_link TEXT,                -- URL (populated after booking)
  meeting_password TEXT,            -- For Zoom/Teams
  recording_availability TEXT,      -- 'immediate' | 'after_completion' | 'lifetime'
  recording_access_months INTEGER DEFAULT 6,
  
  -- ========== EVENT-SPECIFIC INFO ==========
  notes TEXT,                       -- Special instructions
  location TEXT,                    -- If hybrid: "Zoom + London Office"
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### Table 2: `ilt_regional_pricing` (Global Pricing per Country)

```sql
CREATE TABLE ilt_regional_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to event (or product for default pricing)
  event_id UUID REFERENCES ilt_events(id),
  product_id UUID REFERENCES ilt_products(id),
  
  -- Country/Region
  country_code TEXT NOT NULL,       -- 'US', 'GB', 'IN', 'AU', 'CA', etc.
  country_name TEXT,                -- 'United States', 'India', etc.
  region_name TEXT,                 -- Optional: 'North America', 'APAC', 'EMEA'
  
  -- Pricing in local currency
  price_amount NUMERIC NOT NULL,    -- 1000.00 (for USD), 799.99 (for INR)
  currency_code TEXT NOT NULL,      -- 'USD', 'INR', 'GBP', 'AUD', 'CAD'
  currency_symbol TEXT,             -- '$', '₹', '£', etc.
  
  -- Optional: Payment plan prices for this region
  payment_plans JSONB,              -- [
                                    --   {"installments": 3, "amount": 333.33},
                                    --   {"installments": 6, "amount": 166.67}
                                    -- ]
  
  -- Admin notes on why this pricing
  reasoning TEXT,                   -- "India pricing reflects lower purchasing power"
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,             -- NULL = indefinite
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: One pricing per event+country or product+country
  UNIQUE(event_id, country_code),
  UNIQUE(product_id, country_code)
);

-- Example data:
-- Event: PMP Boot Camp Sep 15
-- US pricing: $1000 USD
-- India pricing: ₹16,999 INR (not automatic conversion)
-- UK pricing: £799 GBP
-- Australia pricing: $1,499 AUD
```

---

### Table 3: `ilt_event_sessions` (Enhanced for Different Event Types)

```sql
CREATE TABLE ilt_event_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to event
  event_id UUID NOT NULL REFERENCES ilt_events(id),
  
  -- Session Details
  session_number INTEGER,           -- 1, 2, 3, ... (1-8 for weekly, 1-2 for intensive)
  title TEXT,                       -- "Week 1: PMBOK Introduction" OR "Day 1: Fundamentals"
  
  -- Scheduled Date & Time
  scheduled_date DATE,              -- 2026-09-15 (or 2026-09-16 for day 2)
  scheduled_time_start TIME,        -- 09:00 (or 18:00 for evening weekly)
  scheduled_time_end TIME,          -- 14:00 (or 20:00 for evening weekly)
  timezone TEXT,                    -- Inherited from event, but can override
  
  -- Content
  topics TEXT ARRAY,
  description TEXT,
  learning_objectives TEXT ARRAY,
  practice_questions_count INTEGER,
  
  -- Recording
  recording_link TEXT,
  recording_uploaded_at TIMESTAMP WITH TIME ZONE,
  
  -- Attendance
  attendees_count INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### Table 4: `ilt_geo_ip_cache` (Cache IP → Country Mapping)

```sql
CREATE TABLE ilt_geo_ip_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- IP Address & Geolocation
  ip_address INET NOT NULL UNIQUE, -- '203.0.113.45' (actual IP)
  country_code TEXT NOT NULL,      -- 'IN'
  country_name TEXT,               -- 'India'
  city TEXT,                       -- 'Mumbai' (optional)
  timezone TEXT,                   -- 'Asia/Kolkata'
  
  -- Cache Management
  last_lookup_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  lookup_provider TEXT,            -- 'maxmind' | 'geoip2' | 'ipstack'
  is_vpn BOOLEAN,                  -- true if detected as VPN
  is_proxy BOOLEAN,                -- true if detected as proxy
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🎯 EVENT TYPES & DISPLAY LOGIC

### Type 1: Intensive 2-Day Workshop
```
event_type: 'intensive-2days'
start_date: 2026-09-15
end_date: 2026-09-16
daily_session_hours: 5.0
daily_start_time: 09:00
daily_end_time: 14:00
event_timezone: 'America/New_York'

Display to user:
┌─────────────────────────────────┐
│ 🎯 PMP Boot Camp - 2-Day Intensive
│
│ 📅 Sep 15-16, 2026 (Sat-Sun)
│ ⏰ 9:00 AM - 2:00 PM EDT (Your timezone: IST)
│    Would be: 6:30 PM - 11:30 PM (+ 9.5 hrs offset)
│ 📍 Online via Zoom
│ 💰 $1000 USD (or ₹16,999 INR based on IP)
│
│ Total: 10 hours over 2 days
│ Intensive pace: 5 hours/day with breaks
└─────────────────────────────────┘
```

### Type 2: Intensive 3-Day Workshop
```
event_type: 'intensive-3days'
start_date: 2026-09-15
end_date: 2026-09-17
daily_session_hours: 5.0
daily_start_time: 09:00
daily_end_time: 14:00
event_timezone: 'Europe/London'

Display to user:
┌─────────────────────────────────┐
│ 🎯 Advanced PM - 3-Day Intensive
│
│ 📅 Sep 15-17, 2026 (Mon-Wed)
│ ⏰ 9:00 AM - 2:00 PM BST (Your timezone: IST)
│    Would be: 1:30 PM - 6:30 PM (+ 5.5 hrs offset)
│ 📍 Online via Teams
│ 💰 £699 GBP (or $899 USD based on IP)
│
│ Total: 15 hours over 3 days
│ Intensive pace: 5 hours/day with breaks
└─────────────────────────────────┘
```

### Type 3: Weekly Sessions
```
event_type: 'weekly'
start_date: 2026-09-15
end_date: 2026-11-03
session_day_1: 'Tuesday'
session_day_2: 'Thursday'
session_time_start: 18:00
session_time_end: 20:00
session_count: 8
event_timezone: 'America/Los_Angeles'

Display to user:
┌─────────────────────────────────┐
│ 🎯 PMP Boot Camp - Weekly
│
│ 📅 Sep 15 - Nov 3, 2026 (8 weeks)
│ ⏰ Tuesdays & Thursdays
│    6:00 PM - 8:00 PM PST (Your timezone: IST)
│    Would be: 6:30 AM - 8:30 AM (+ 12.5 hrs next day)
│ 📍 Online via Zoom
│ 💰 $1000 USD (or ₹16,999 INR based on IP)
│
│ Total: 32 hours over 8 weeks
│ Schedule: 2 sessions/week, 2 hours each
└─────────────────────────────────┘
```

---

## 🌍 GLOBAL PRICING LOGIC

### Flow: User Visits Course → Detect Country → Show Regional Price

```
User visits: /academy/ilt/pmp-boot-camp/events/pmp-sep-15

Step 1: Get user's IP address
  → "203.0.113.45"

Step 2: Lookup country from IP (with caching)
  → Check ilt_geo_ip_cache first
  → If not cached, call MaxMind/GeoIP2 API
  → Cache result for future lookups
  → Result: "India" (country_code: "IN")

Step 3: Get regional pricing for this event in this country
  → Query: ilt_regional_pricing WHERE event_id = X AND country_code = "IN"
  → Result: ₹16,999 INR (for this specific event)

Step 4: Display price in user's currency
  ✓ Price shown: "₹16,999 INR"
  ✓ Not converted from USD
  ✓ Admin-set pricing specific to India market
  ✓ Show equivalent in other currency (optional): "~$200 USD"

Step 5: On checkout, use regional pricing
  → Stripe receives ₹16,999 INR charge
  → Student sees local currency
  → Admin sees unified dashboard with revenue in base currency
```

---

## 📊 ADMIN REGIONAL PRICING SETUP

### Admin Interface: Set Prices by Country

```
Event: PMP Boot Camp - Sep 15, 2026
Base Currency: USD ($1000)

Regional Pricing Override:
┌──────────────────────────────────┐
│ Country        Price    Currency  │
├──────────────────────────────────┤
│ 🇺🇸 USA       $1,000   USD       │
│ 🇮🇳 India     ₹16,999  INR       │
│ 🇬🇧 UK        £799     GBP       │
│ 🇦🇺 Australia $1,499   AUD       │
│ 🇨🇦 Canada    $1,299   CAD       │
│ 🇪🇺 EU        €899     EUR       │
│ 🇯🇵 Japan     ¥109,900 JPY       │
│ 🇧🇷 Brazil    R$4,999  BRL       │
└──────────────────────────────────┘

[+ Add Country]

For each country:
- Currency code (auto-populated)
- Currency symbol (auto-populated)
- Admin sets price based on market dynamics
- Reasoning field (why this price)
- Effective dates (optional)
```

### CSV Template: Bulk Upload Regional Pricing

```csv
event_slug,country_code,country_name,currency_code,price_amount,payment_plan_3x,reasoning
pmp-boot-camp-sep-15,US,United States,USD,1000.00,333.33,Standard US market pricing
pmp-boot-camp-sep-15,IN,India,INR,16999.00,5666.33,India purchasing power parity
pmp-boot-camp-sep-15,GB,United Kingdom,GBP,799.00,266.33,UK market pricing
pmp-boot-camp-sep-15,AU,Australia,AUD,1499.00,499.67,Australian market pricing
pmp-boot-camp-sep-15,CA,Canada,CAD,1299.00,433.00,Canadian market pricing
pmp-boot-camp-sep-15,DE,Germany,EUR,899.00,299.67,EU market pricing
pmp-boot-camp-sep-15,JP,Japan,JPY,109900.00,36633.33,Japan market pricing
pmp-boot-camp-sep-15,BR,Brazil,BRL,4999.00,1666.33,Brazil market pricing
```

---

## 🔧 IMPLEMENTATION: Timezone Display Logic

### Backend: Store in Event Timezone

```javascript
// When event created:
{
  event_timezone: "America/New_York",  // UTC-5 (EDT)
  session_time_start: "18:00",         // 6 PM in New York time
  session_time_end: "20:00"            // 8 PM in New York time
}

// When converting to user's timezone (e.g., India IST):
// New York: 6 PM EDT (UTC-4)
// India: 3:30 AM IST (UTC+5:30) next day
// Offset: +9.5 hours
```

### Frontend: Display in User's Timezone

```jsx
// Component receives:
const event = {
  event_timezone: "America/New_York",
  session_time_start: "18:00",
  user_timezone: "Asia/Kolkata"  // Detected from IP
};

// Display logic:
const userTime = convertToUserTimezone(
  event.session_time_start,
  event.event_timezone,
  user_timezone
);

// Shows:
"6:00 PM - 8:00 PM EDT (Your timezone: IST)
 3:30 AM - 5:30 AM IST (Next day)"
```

---

## 📋 UPDATED CSV UPLOAD FORMAT: Events with Event Types

```csv
product_slug,event_number,event_type,start_date,end_date,daily_hours,start_time,end_time,session_day_1,session_day_2,session_count,timezone,instructor_name,max_students
pmp-boot-camp,1,intensive-2days,2026-09-15,2026-09-16,5.0,09:00,14:00,,,,America/New_York,John Smith,12
pmp-boot-camp,2,intensive-3days,2026-10-15,2026-10-17,5.0,09:00,14:00,,,,Europe/London,Sarah Chen,12
pmp-boot-camp,3,weekly,2026-11-10,2027-01-05,,,18:00,Tuesday,Thursday,8,America/Los_Angeles,Michael Kumar,12
capm-cert,1,intensive-2days,2026-09-22,2026-09-23,5.0,10:00,15:00,,,,Asia/Singapore,Lisa Wong,10
capm-cert,2,weekly,2026-10-20,2026-12-15,,,19:30,Monday,Wednesday,8,Europe/Paris,Anne Dupont,15
```

---

## ✅ COMPLETE FLOW: Indian Customer Buying PMP Course

```
1. Indian customer (203.0.113.45) visits:
   /academy/ilt/pmp-boot-camp/events/pmp-sep-15

2. System detects IP location:
   → Country: India
   → Timezone: Asia/Kolkata

3. System fetches regional pricing:
   → Query: SELECT price FROM ilt_regional_pricing 
     WHERE event_id = X AND country_code = "IN"
   → Result: ₹16,999 INR

4. System converts event times to user's timezone:
   → Event time: 6 PM EDT (New York)
   → User time: 3:30 AM IST (next day)

5. Page displays:
   ┌──────────────────────────────────┐
   │ 🎯 PMP Boot Camp - Sep 15 Cohort
   │
   │ 📅 Sep 15-Oct 6, 2026
   │ ⏰ 6:00 PM - 8:00 PM EDT
   │    (Your timezone: 3:30 AM - 5:30 AM IST, next day)
   │
   │ 💰 ₹16,999 INR
   │    (~$200 USD equivalent)
   │
   │ [Enroll Now]
   └──────────────────────────────────┘

6. On checkout:
   → Currency: INR
   → Amount: 16,999
   → Payment processor: Stripe (INR supported)
   → Receipt: ₹16,999

7. Admin dashboard shows:
   → Revenue: $1,000 USD (PMP-Sep) + ₹16,999 INR (same event)
   → Unified dashboard: Converts to base currency for reporting
   → 1 enrollment at $1,000 USD
   → 1 enrollment at ~$200 USD equivalent
```

---

## 🎯 KEY DATABASE FIELDS SUMMARY

### ilt_events (Enhanced)
- `event_type`: 'intensive-2days' | 'intensive-3days' | 'weekly'
- `daily_session_hours`: 5.0 (for intensive events)
- `daily_start_time`: 09:00
- `daily_end_time`: 14:00
- `session_time_start`: 18:00 (for weekly)
- `session_time_end`: 20:00 (for weekly)
- `event_timezone`: 'America/New_York' (IANA timezone)
- `break_schedule`: JSONB with break times

### ilt_regional_pricing (NEW)
- `event_id`: Links to event
- `country_code`: 'US', 'IN', 'GB', etc.
- `price_amount`: 1000.00, 16999.00, etc.
- `currency_code`: 'USD', 'INR', 'GBP', etc.
- `payment_plans`: JSONB with installment options
- `reasoning`: Admin notes on pricing strategy

### ilt_geo_ip_cache (NEW)
- `ip_address`: '203.0.113.45'
- `country_code`: 'IN'
- `timezone`: 'Asia/Kolkata'
- `lookup_provider`: 'maxmind' | 'geoip2'

---

## 🚀 IMPLEMENTATION CHECKLIST

- [ ] Add event_type to ilt_events (enum validation)
- [ ] Add timezone fields to ilt_events
- [ ] Create ilt_regional_pricing table
- [ ] Create ilt_geo_ip_cache table (with TTL: 7 days)
- [ ] Implement IP geolocation lookup (MaxMind/GeoIP2)
- [ ] Create timezone conversion utility
- [ ] Update course detail page to show regional pricing
- [ ] Update course detail page to show converted times
- [ ] Create admin interface for regional pricing
- [ ] Create CSV import for regional pricing
- [ ] Create CSV import for events with event types
- [ ] Add cache invalidation for IP lookups (7-day TTL)
- [ ] Add timezone display logic (with user offset)
- [ ] Add Stripe integration with regional currency
- [ ] Test with VPNs (is_vpn flag)
- [ ] Analytics: Revenue by country/currency

**Does this enhanced schema cover everything you need?**
