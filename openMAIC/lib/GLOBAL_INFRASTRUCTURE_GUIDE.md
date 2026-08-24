# DailyAgile Global Infrastructure Guide
**Complete reference for i18n, timezone, compliance, and multi-currency systems**

Last Updated: August 15, 2026

---

## Overview

DailyAgile's student quiz platform supports a global audience with:
- **6 primary languages**: English, Spanish, French, Chinese (Simplified), German, Arabic (RTL)
- **11 total languages**: Plus Japanese, Korean, Russian, Portuguese
- **Multiple currencies**: USD, GBP, EUR, INR, AUD, JPY, CAD, SGD, HKD, AED
- **GDPR/CCPA/LGPD compliance**: Audit logging for all data events
- **Timezone-aware features**: Streaks, scheduling, and date calculations use local timezone

---

## Part 1: Internationalization (i18n)

### Setup
- Framework: **i18next** (with React integration)
- Translation files: `/lib/i18n/locales/*.json`
- Configuration: `/lib/i18n/config.ts`
- Formatting utilities: `/lib/i18n/format.ts`

### Supported Languages

| Code    | Name              | Native Name      | RTL  |
|---------|-------------------|------------------|------|
| en-US   | English           | English          | No   |
| es-ES   | Spanish           | Español          | No   |
| fr-FR   | French            | Français         | No   |
| zh-CN   | Chinese Simpl.    | 简体中文         | No   |
| de-DE   | German            | Deutsch          | No   |
| ar-SA   | Arabic            | العربية          | **Yes** |
| zh-TW   | Chinese Trad.     | 繁體中文         | No   |
| ja-JP   | Japanese          | 日本語           | No   |
| ru-RU   | Russian           | Русский          | No   |
| pt-BR   | Portuguese        | Português        | No   |
| ko-KR   | Korean            | 한국어           | No   |

### Usage in Components

#### In React Components
```typescript
import { useTranslation } from 'react-i18next';

export function QuizHeader() {
  const { t } = useTranslation();
  
  return (
    <h1>{t('quiz.start')}</h1>
    <p>{t('quiz.timeRemaining')}</p>
  );
}
```

#### In Server Components
```typescript
import i18n from '@/lib/i18n/config';

export async function getQuizTitle() {
  const t = i18n.t.bind(i18n);
  return t('quiz.start'); // "Start Quiz" or localized equivalent
}
```

### Adding New Translations

1. Add key to all locale files:
   ```json
   // locales/en-US.json
   {
     "quiz": {
       "newFeature": "New Feature"
     }
   }
   
   // locales/es-ES.json
   {
     "quiz": {
       "newFeature": "Nueva Característica"
     }
   }
   ```

2. Use in component:
   ```typescript
   const { t } = useTranslation();
   return <div>{t('quiz.newFeature')}</div>;
   ```

### Number & Date Formatting

```typescript
import {
  formatNumber,
  formatDate,
  formatCurrency,
  formatTime,
  formatRelative,
  formatDuration,
  formatPercent
} from '@/lib/i18n/format';

// Numbers (locale-aware grouping)
formatNumber(1234.56, 'en-US');  // "1,234.56"
formatNumber(1234.56, 'de-DE');  // "1.234,56"
formatNumber(1234.56, 'fr-FR');  // "1 234,56"

// Dates
formatDate(new Date(), 'en-US', 'long');
// "August 15, 2026"

formatDate(new Date(), 'de-DE', 'long');
// "15. August 2026"

// Times (12-hour US, 24-hour everywhere else)
formatTime(new Date(), 'en-US');  // "2:30 PM"
formatTime(new Date(), 'de-DE');  // "14:30"

// Currency
formatCurrency(49.99, 'USD', 'en-US');  // "$49.99"
formatCurrency(45.00, 'EUR', 'de-DE');  // "45,00 €"
formatCurrency(3990, 'INR', 'en-IN');   // "₹3,990"

// Percentages
formatPercent(0.85, 'en-US');  // "85%"
formatPercent(0.85, 'de-DE');  // "85 %"

// Relative time
formatRelative(new Date(Date.now() - 2*60*1000), 'en-US');
// "2 minutes ago"

// Duration
formatDuration(150000, 'en-US', 2);  // "2 minutes 30 seconds"
```

### RTL Support (Arabic)

```typescript
import { useIsRTL, useDirAttribute } from '@/lib/i18n/hooks';

export function Layout() {
  const isRTL = useIsRTL();
  const dir = useDirAttribute();
  
  return (
    <html dir={dir} lang="ar-SA">
      <body className={isRTL ? 'text-right' : 'text-left'}>
        {/* RTL styles automatically applied */}
      </body>
    </html>
  );
}
```

### Locale Switching

```typescript
import { useChangeLocale, useSupportedLocales } from '@/lib/i18n/hooks';

export function LanguageSelector() {
  const changeLocale = useChangeLocale();
  const locales = useSupportedLocales();
  
  return (
    <select onChange={(e) => changeLocale(e.target.value as Locale)}>
      {locales.map(locale => (
        <option key={locale.code} value={locale.code}>
          {locale.label}
        </option>
      ))}
    </select>
  );
}
```

---

## Part 2: Timezone Management

### CRITICAL: Streak Logic

**ALL date comparisons for streaks MUST use timezone-aware functions, NOT UTC:**

❌ **WRONG:**
```typescript
const today = new Date();
const sameDay = today.getDate() === lastQuizDate.getDate(); // WRONG - uses UTC
```

✅ **CORRECT:**
```typescript
import { isSameDayInTimezone } from '@/lib/student/timezone';

const sameDay = isSameDayInTimezone(
  new Date(),
  lastQuizDate,
  student.timezone
);
```

### Timezone Utilities

Location: `/lib/student/timezone.ts`

```typescript
import {
  getDateInTimezone,
  getUserLocalMidnight,
  isSameDayInTimezone,
  formatDateInTimezone,
  formatTimeInTimezone,
  addDaysInTimezone,
  hoursUntilUserMidnight,
  getTimezoneOffset,
  isValidTimezone,
  getCommonTimezones,
  type TimezoneInfo
} from '@/lib/student/timezone';

// Get user's current time in their timezone
const userNow = getDateInTimezone(new Date(), 'America/New_York');

// Get user's midnight in their timezone
const midnight = getUserLocalMidnight('America/Los_Angeles');

// Check if dates are same day in user's TZ
const sameDayForStreak = isSameDayInTimezone(
  new Date(),
  student.last_quiz_at,
  student.timezone  // CRITICAL: Must use student's timezone
);

// Format dates/times in user's timezone
const formatted = formatDateInTimezone(
  new Date(),
  'Asia/Tokyo',
  'en-US'  // locale for text formatting
);

// Calculate next review date (3 days from today in user's TZ)
const nextReview = addDaysInTimezone('Europe/London', 3);

// Get hours until midnight (for scheduling reset jobs)
const hoursLeft = hoursUntilUserMidnight('America/Chicago');

// Validate user's timezone before saving to database
if (isValidTimezone(userTimezone)) {
  await saveStudentTimezone(userTimezone);
}

// Get list of common timezones for dropdown
const tzList = getCommonTimezones();
// Returns: [
//   { iana: 'America/New_York', label: 'Eastern Time (EST/EDT)', offset: '-05:00' },
//   { iana: 'America/Chicago', label: 'Central Time (CST/CDT)', offset: '-06:00' },
//   ...
// ]
```

### Timezone in Student Profile

Store in Supabase:
```sql
ALTER TABLE students ADD COLUMN timezone TEXT DEFAULT 'UTC';
-- Example values: 'America/New_York', 'Europe/London', 'Asia/Tokyo'
```

### Streak Reset Logic

```typescript
// In quiz submission endpoint:
import { isSameDayInTimezone, addDaysInTimezone } from '@/lib/student/timezone';

async function updateStreak(studentId: string) {
  const student = await getStudent(studentId);
  
  // Check if quiz was taken today (in student's timezone)
  const tookQuizToday = isSameDayInTimezone(
    new Date(),
    student.last_quiz_at,
    student.timezone
  );
  
  if (tookQuizToday) {
    // Already took quiz today, don't update streak
    return;
  }
  
  // Check if quiz was taken yesterday (in student's timezone)
  const yesterday = addDaysInTimezone(student.timezone, -1);
  const tookQuizYesterday = isSameDayInTimezone(
    yesterday,
    student.last_quiz_at,
    student.timezone
  );
  
  if (tookQuizYesterday) {
    // Continued the streak
    student.current_streak += 1;
  } else {
    // Streak broken, reset to 1
    student.current_streak = 1;
  }
  
  student.last_quiz_at = new Date();
  await updateStudent(student);
}
```

---

## Part 3: Multi-Currency & Pricing

### Supported Currencies

Location: `/lib/student/currency.ts`

```
USD - US Dollar ($)
GBP - British Pound (£)
EUR - Euro (€)
INR - Indian Rupee (₹)
AUD - Australian Dollar (A$)
JPY - Japanese Yen (¥)
CAD - Canadian Dollar (C$)
SGD - Singapore Dollar (S$)
HKD - Hong Kong Dollar (HK$)
AED - UAE Dirham (د.إ)
```

### Regional Pricing

```typescript
import {
  formatPrice,
  getRegionalPrice,
  getTierPrice,
  convertCurrency,
  getCurrencyInfo,
  getSupportedCurrencies,
  getSupportedRegions,
  detectRegionFromLocale,
  formatCurrencyPair,
  type Currency,
  type RegionalPrice
} from '@/lib/student/currency';

// Get regional pricing for a country
const gbPricing = getRegionalPrice('GB');
// Returns: { currency: 'GBP', amount: 39.99, region: 'GB', displayFormat: '£39.99' }

const inPricing = getRegionalPrice('IN');
// Returns: { currency: 'INR', amount: 3990, region: 'IN', displayFormat: '₹3,990' }

// Format price for display
formatPrice(49.99, 'USD');      // "$49.99"
formatPrice(45.00, 'EUR');      // "45,00 €"
formatPrice(5500, 'JPY');       // "¥5,500"
formatPrice(3990, 'INR');       // "₹3,990"

// Get tier pricing (free, standard, professional, enterprise)
const tierPrice = getTierPrice('professional', 'IN');
// Returns: { currency: 'INR', amount: 3990, displayFormat: '₹3,990', tier: 'professional' }

const freePrice = getTierPrice('free', 'US');
// Returns: { currency: 'USD', amount: 0, displayFormat: 'Free', tier: 'free' }

// Currency conversion
convertCurrency(100, 'USD', 'EUR');  // ~92.5 EUR

// Get currency info
getCurrencyInfo('JPY');  // { code: 'JPY', decimalPlaces: 0, ... }

// Detect region from browser locale
detectRegionFromLocale('en-GB');   // 'GB'
detectRegionFromLocale('de-DE');   // 'DE'

// Display multiple prices
formatCurrencyPair(49.99, 'USD', 39.99, 'GBP');
// "$49.99 / £39.99"
```

### Regional Pricing Table

Pricing is stored in Supabase:
```sql
CREATE TABLE pricing_regional (
  id UUID PRIMARY KEY,
  region VARCHAR(10),           -- Country code: US, GB, DE, IN, etc.
  currency VARCHAR(3),          -- Currency code: USD, GBP, EUR, INR, etc.
  tier VARCHAR(20),             -- free, standard, professional, enterprise
  amount NUMERIC(10,2),         -- Price in local currency
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example data
INSERT INTO pricing_regional VALUES
  ('US', 'USD', 'professional', 49.99),
  ('GB', 'GBP', 'professional', 39.99),
  ('DE', 'EUR', 'professional', 45.00),
  ('IN', 'INR', 'professional', 3990),
  ('JP', 'JPY', 'professional', 5500),
  ('AE', 'AED', 'professional', 184);
```

---

## Part 4: GDPR/CCPA Compliance & Audit Logging

### Compliance Logging

Location: `/lib/student/compliance.ts`

```typescript
import {
  logComplianceEvent,
  recordConsent,
  generateGdprDataExport,
  handleGdprDeletionRequest,
  handleCcpaOptOut,
  getConsent,
  extractIpAddress,
  calculateRetentionDate,
  type ComplianceEventType,
  type ComplianceLogEntry,
  type ConsentType
} from '@/lib/student/compliance';

// Log any compliance event
await logComplianceEvent(
  studentId,
  'quiz_attempt',
  {
    quiz_id: '123',
    score: 85,
    time_spent: 300
  },
  request  // HTTP request object
);

// Record consent (marketing, analytics, etc.)
await recordConsent(
  studentId,
  'marketing',
  true,  // true = consented
  2,     // policy version
  request
);

// Check consent status
const hasMarketingConsent = await getConsent(studentId, 'marketing');

// Handle GDPR data export request (Article 15)
const export = await generateGdprDataExport(studentId);
// Returns: { student, quiz_attempts, badges, points, streaks, audit_logs }

// Handle GDPR deletion request (Article 17)
await handleGdprDeletionRequest(
  studentId,
  request,
  'User requested deletion'
);

// Handle CCPA opt-out (California)
await handleCcpaOptOut(
  studentId,
  'sale',  // 'sale' or 'targeted_ads'
  request
);
```

### Compliance Events Logged

| Event Type              | When Logged              | Retention |
|-------------------------|--------------------------|-----------|
| `account_created`       | On signup                | 3 years   |
| `login`                 | On each login            | 1 year    |
| `logout`                | On logout                | 1 year    |
| `quiz_attempt`          | After quiz submission    | 7 years   |
| `badge_awarded`         | When badge earned        | 7 years   |
| `progress_updated`      | After progress change    | 7 years   |
| `consent_given`         | When user consents       | 3 years   |
| `consent_changed`       | When consent changes     | 3 years   |
| `data_export_requested` | On GDPR Article 15       | 7 years   |
| `data_deletion_requested`| On GDPR Article 17       | 7 years   |
| `email_sent`            | After email delivery     | 1 year    |
| `email_bounced`         | On bounce                | 1 year    |

### Audit Logs Table

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB NOT NULL,
  ip_address VARCHAR(50) NOT NULL,  -- Hashed for privacy
  user_agent TEXT,
  country_code VARCHAR(2),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  retention_until TIMESTAMPTZ,
  PRIMARY KEY(id)
);

CREATE INDEX idx_audit_logs_student_id ON audit_logs(student_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_logged_at ON audit_logs(logged_at);
```

### Consent Records Table

```sql
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  consent_type VARCHAR(50) NOT NULL,
  value BOOLEAN DEFAULT FALSE,
  given_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  PRIMARY KEY(id),
  UNIQUE(student_id, consent_type)
);
```

### In API Endpoints

```typescript
// In your quiz submission endpoint
export async function POST(req: Request) {
  const studentId = getStudentId(req);
  const { quizId, answers, score } = await req.json();
  
  // Log the quiz attempt for audit trail
  await logComplianceEvent(
    studentId,
    'quiz_attempt',
    {
      quiz_id: quizId,
      score: score,
      time_spent: calculateTimeSpent(answers),
      ip_address: extractIpAddress(req)
    },
    req
  );
  
  // Save quiz result
  await saveQuizAttempt(studentId, quizId, score);
  
  return json({ success: true });
}
```

---

## Part 5: Integration Examples

### Student Dashboard Component

```typescript
'use client';

import { useTranslation } from 'react-i18next';
import { formatNumber, formatDate, formatPercent } from '@/lib/i18n/format';
import { formatDateInTimezone, addDaysInTimezone } from '@/lib/student/timezone';
import { formatPrice } from '@/lib/student/currency';

export function StudentDashboard({ student }) {
  const { t } = useTranslation();
  const locale = useLocale();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      
      {/* Streak (timezone-aware) */}
      <div>
        <h2>{t('streaks.dayStreak')}</h2>
        <p>{formatNumber(student.current_streak, locale)} {t('streaks.days')}</p>
      </div>
      
      {/* Score display */}
      <div>
        <h3>{t('dashboard.averageScore')}</h3>
        <p>{formatPercent(student.average_score / 100, locale)}</p>
      </div>
      
      {/* Next review (in student's timezone) */}
      <div>
        <h3>{t('dashboard.nextReview')}</h3>
        <p>
          {formatDateInTimezone(
            addDaysInTimezone(student.timezone, 3),
            student.timezone,
            locale
          )}
        </p>
      </div>
      
      {/* Price display (regional currency) */}
      <div>
        <h3>Premium Course</h3>
        <p>{formatPrice(student.tier_price, student.preferred_currency)}</p>
      </div>
      
      {/* Last activity (relative time) */}
      <div>
        <p>{t('streaks.lastActivityToday')}: {formatRelative(new Date(), locale)}</p>
      </div>
    </div>
  );
}
```

### Quiz Submission Handler

```typescript
// app/api/student/quiz/submit/route.ts

import { logComplianceEvent } from '@/lib/student/compliance';
import { isSameDayInTimezone, addDaysInTimezone } from '@/lib/student/timezone';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { studentId, quizId, answers, score, timeSpent } = await req.json();
  
  // Log compliance event
  await logComplianceEvent(
    studentId,
    'quiz_attempt',
    { quiz_id: quizId, score, time_spent: timeSpent },
    req
  );
  
  const supabase = createClient();
  const student = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();
  
  // Update streak (timezone-aware!)
  const tookQuizToday = isSameDayInTimezone(
    new Date(),
    student.data.last_quiz_at,
    student.data.timezone  // ← CRITICAL: Use student's timezone
  );
  
  if (!tookQuizToday) {
    const yesterday = addDaysInTimezone(student.data.timezone, -1);
    const tookQuizYesterday = isSameDayInTimezone(
      yesterday,
      student.data.last_quiz_at,
      student.data.timezone
    );
    
    student.data.current_streak = tookQuizYesterday
      ? student.data.current_streak + 1
      : 1;
  }
  
  student.data.last_quiz_at = new Date();
  
  // Save updated student
  await supabase.from('students').update(student.data).eq('id', studentId);
  
  return json({ success: true, streak: student.data.current_streak });
}
```

### GDPR Export Endpoint

```typescript
// app/api/student/data/export/route.ts

import { generateGdprDataExport, logComplianceEvent } from '@/lib/student/compliance';

export async function GET(req: Request) {
  const studentId = getStudentId(req);
  
  // Log the export request
  await logComplianceEvent(
    studentId,
    'data_export_requested',
    { export_reason: 'GDPR Article 15 request' },
    req
  );
  
  // Generate export
  const exportData = await generateGdprDataExport(studentId);
  
  return json(exportData);
}
```

### Settings Page with Locale/Timezone

```typescript
'use client';

import { useState } from 'react';
import { useChangeLocale } from '@/lib/i18n/hooks';
import { getCommonTimezones } from '@/lib/student/timezone';
import { getSupportedRegions } from '@/lib/student/currency';

export function SettingsPage({ student }) {
  const changeLocale = useChangeLocale();
  const [timezone, setTimezone] = useState(student.timezone);
  const [currency, setCurrency] = useState(student.preferred_currency);
  
  const timezones = getCommonTimezones();
  const regions = getSupportedRegions();
  
  return (
    <div>
      <h2>Settings</h2>
      
      <div>
        <label>Language</label>
        <select onChange={(e) => changeLocale(e.target.value as Locale)}>
          {/* Options populated by useChangeLocale */}
        </select>
      </div>
      
      <div>
        <label>Timezone (for streaks and scheduling)</label>
        <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
          {timezones.map(tz => (
            <option key={tz.iana} value={tz.iana}>
              {tz.label} ({tz.offset})
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label>Currency</label>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {Object.entries(regions).map(([code, region]) => (
            <option key={code} value={region.currency}>
              {region.name} ({region.currency})
            </option>
          ))}
        </select>
      </div>
      
      <button onClick={() => saveSettings({ timezone, currency })}>
        Save
      </button>
    </div>
  );
}
```

---

## Database Schema (Supabase)

```sql
-- Students table (core profile)
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  
  -- Localization
  locale VARCHAR(10) DEFAULT 'en-US',
  timezone VARCHAR(50) DEFAULT 'UTC',
  preferred_currency VARCHAR(3) DEFAULT 'USD',
  
  -- Gamification (timezone-dependent)
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  last_quiz_at TIMESTAMPTZ,
  total_points INTEGER DEFAULT 0,
  
  -- Payments
  stripe_customer_id TEXT,
  tier VARCHAR(20) DEFAULT 'free',
  tier_price NUMERIC(10,2),
  
  -- Dates
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz attempts (for audit trail)
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  quiz_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  time_spent_seconds INTEGER,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs (compliance)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  country_code VARCHAR(2),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  retention_until TIMESTAMPTZ
);

-- Consent records (GDPR/CCPA)
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  consent_type VARCHAR(50) NOT NULL,
  value BOOLEAN DEFAULT FALSE,
  given_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  UNIQUE(student_id, consent_type)
);

-- Regional pricing
CREATE TABLE pricing_regional (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region VARCHAR(10) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  tier VARCHAR(20) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEXES...
```

---

## Deployment Checklist

- ✅ Translation files for 6 primary languages (en, es, fr, zh-CN, de, ar)
- ✅ RTL support configured for Arabic
- ✅ Middleware handling locale detection and routing
- ✅ Timezone utilities tested for streak logic
- ✅ Regional pricing configured in database
- ✅ Compliance logging enabled for all events
- ✅ Consent records table in Supabase
- ✅ Audit logs table with proper retention dates
- ✅ GDPR/CCPA endpoints implemented
- ✅ Student profile includes timezone and currency
- ✅ All dates use timezone-aware calculations (NO UTC shortcuts)

---

## Troubleshooting

### Streak Resets at Wrong Time
- **Cause**: Using `getDate()` instead of `isSameDayInTimezone()`
- **Fix**: Always use `isSameDayInTimezone()` for streak logic

### Wrong Prices Showing
- **Cause**: Not detecting user's region correctly
- **Fix**: Use `detectRegionFromLocale()` or IP geolocation

### Arabic Text Rendering Wrong
- **Cause**: Missing `dir="rtl"` on HTML element
- **Fix**: Use `useDirAttribute()` hook in root layout

### Compliance Events Not Logging
- **Cause**: Missing `logComplianceEvent()` calls in endpoints
- **Fix**: Add logging to all endpoints that modify student data

---

## Support & Resources

- **i18n Docs**: https://www.i18next.com/overview/getting-started
- **Intl API**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
- **GDPR Compliance**: https://gdpr-info.eu/
- **CCPA**: https://oag.ca.gov/privacy/ccpa
- **Timezone Database**: https://www.iana.org/time-zones
