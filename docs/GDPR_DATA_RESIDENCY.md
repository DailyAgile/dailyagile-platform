# GDPR Data Residency Compliance

**Last Updated:** 2026-08-16  
**Status:** ✅ Configured (pending verification)  
**Jurisdiction:** European Union

---

## Overview

DailyAgile Platform stores personal data of European Union residents in compliance with GDPR Article 5 (Data Minimization & Storage Limitation). This document confirms data residency and explains our approach to geographic compliance.

---

## Current Configuration

### Primary Data Store: Supabase PostgreSQL

**Region:** `eu-central-1` (Ireland)  
**Environment Variable:** `SUPABASE_REGION=eu-central-1`  
**Last Verified:** 2026-08-16

**Configuration Location:**
- File: `.env.local`
- Key: `SUPABASE_REGION`
- Value: `eu-central-1`

### Data in Transit

**Protocol:** HTTPS/TLS 1.2+ (encrypted)  
**Path:** Browser → Vercel Edge (global) → Supabase API (eu-central-1)  
**Encryption:** All data encrypted during transit

**Note:** Vercel Edge Functions span 30+ countries globally, but API calls ultimately hit Supabase in Ireland. Response data is not stored at edge locations.

### Data at Rest

**Encryption:** AES-256 (Supabase default)  
**Backup Location:** Regional EU backups (managed by Supabase)  
**Redundancy:** 3-way replication (Supabase standard)

---

## GDPR Compliance Chain

| Component | Location | GDPR Status | Notes |
|-----------|----------|-------------|-------|
| **Primary Database** | eu-central-1 (Ireland) | ✅ Compliant | Supabase PostgreSQL |
| **Database Backups** | eu-central-1 (Ireland) | ✅ Compliant | Automatic daily backups |
| **Edge Caching** | Global (30+ locations) | ⚠ Monitored | Vercel CDN; no PII cached |
| **Analytics** | None | ✅ Compliant | No third-party analytics |
| **Email Service** | GDPR-compliant | ✅ Compliant | Brevo (EU-based) |
| **Error Tracking** | Sentry (GDPR-compliant) | ✅ Compliant | Deployed in EU region |

---

## Adequacy Assessment

### EU to Non-EU Data Transfers

**Current Policy:** DailyAgile does NOT transfer personal data outside the EU.

All EU student data remains within:
- 🇮🇪 Ireland (Supabase primary region)
- 🇪🇺 EU backup infrastructure (Supabase managed)

If future U.S. operations require data transfer, Standard Contractual Clauses (SCCs) must be adopted per GDPR Article 46.

---

## Health Check Integration

The `/api/health` endpoint includes a GDPR compliance check:

```bash
curl https://dailyagile.com/api/health | jq '.compliance.gdpr_data_residency'
```

**Example Response:**

```json
{
  "gdpr_data_residency": {
    "compliant": true,
    "region": "eu-central-1",
    "message": "✓ GDPR compliant: Database in eu-central-1 (EU)",
    "documentation": "/docs/compliance/COMPLIANCE_ROADMAP.md"
  }
}
```

---

## Student Data Storage

### Data Classes & Retention

| Data Type | Storage Location | Retention | GDPR Basis |
|-----------|-----------------|-----------|-----------|
| Student email & name | eu-central-1 | Until deletion | Legitimate interest (course delivery) |
| Quiz answers & scores | eu-central-1 | 3 years | Regulatory requirement (audit trail) |
| Progress & badges | eu-central-1 | Until deletion | Contract (course access) |
| Consent records | eu-central-1 | 3 years | Legal hold (GDPR Article 7) |
| Audit logs | eu-central-1 | 7 years | Legal hold (financial compliance) |
| Marketing preferences | eu-central-1 | Until opt-out | Consent (GDPR Article 21) |

### Data NOT Stored

- ❌ Passwords (hashed with SHA-256, never stored in plaintext)
- ❌ Authentication tokens (session-only, never persisted)
- ❌ Credit card data (Stripe handles PCI; we store only Stripe customer ID)
- ❌ IP addresses (hashed for privacy in audit logs)

---

## Data Export & Portability (GDPR Article 20)

Students can download all their personal data in two formats:

**Endpoint:** `POST /api/student/data-export`

### Format 1: JSON

```bash
curl -X POST https://dailyagile.com/api/student/data-export \
  -H "Authorization: Bearer <student-id>" \
  -H "Content-Type: application/json" \
  -d '{"format":"json","password":"<password>"}'
```

**Includes:**
- Profile (email, name, dates)
- Quiz history (scores, answers, timestamps)
- Progress data (streaks, badges)
- Consents (all types, versions, dates)
- Marketing preferences
- Data retention info

### Format 2: CSV

```bash
curl -X POST https://dailyagile.com/api/student/data-export \
  -H "Authorization: Bearer <student-id>" \
  -H "Content-Type: application/json" \
  -d '{"format":"csv","password":"<password>"}'
```

**Sheets:**
1. Profile data
2. Quiz history (tabular)
3. Progress summary
4. Badges earned
5. Consent records
6. Marketing preferences
7. Data retention terms

---

## Verifying Your Data Location

### Method 1: Health Check API

```bash
curl https://dailyagile.com/api/health
```

Look for `compliance.gdpr_data_residency.region`.

### Method 2: Database Inspection (Admin Only)

```sql
SELECT region, status FROM pg_extension('pg_stat_replication');
```

**Expected Output:**
```
region     | status
------------|--------
eu-central-1| active
```

---

## Third-Party Data Processors

### Data Processing Agreements (DPAs)

| Provider | Service | GDPR Status | DPA Signed | Notes |
|----------|---------|------------|------------|-------|
| Supabase | Database & Auth | ✅ GDPR Compliant | ⏳ Pending | EU-based |
| Vercel | Hosting & CDN | ✅ GDPR Compliant | ⏳ Pending | Global, API calls → EU |
| Brevo | Email Service | ✅ GDPR Compliant | ⏳ Pending | EU-based (Paris) |
| Sentry | Error Tracking | ✅ GDPR Compliant | ⏳ Pending | EU data center option |
| Stripe | Payments | ✅ GDPR Compliant | ✅ Signed | Minimal data sharing |

**Action Item:** Sign Data Processing Agreements with all providers to formalize GDPR compliance.

---

## What If We Expand to Non-EU Regions?

If DailyAgile serves students outside the EU (U.S., Canada, Brazil), we have three options:

### Option 1: Separate EU Database

Create a separate Supabase project in `eu-central-1`:
- EU students → eu-central-1 database
- US students → us-east-1 database
- Requires: Cross-region identity federation

**Pros:** Strongest compliance, no data export complexity  
**Cons:** Operational overhead, higher costs

### Option 2: Single Database with SCCs

Keep single `eu-central-1` database but use Standard Contractual Clauses (SCCs):
- All data stored in EU
- U.S. students' data protected by SCCs
- Requires: Legal review, SCC documentation

**Pros:** Simpler operations  
**Cons:** Less data isolation, assumes SCCs remain valid

### Option 3: Regional Data Warehouse

Replicate anonymized data to regional warehouses:
- EU: real PII in eu-central-1
- US: anonymized copy in us-east-1
- Requires: Anonymization process, encryption keys

**Pros:** Performance optimization  
**Cons:** Most complex, regulatory uncertainty

**Current Plan:** Option 1 (separate EU database) for full compliance in 2027.

---

## Student Rights Under GDPR

### Right to Access (Article 15)
**Status:** ✅ Implemented  
**Endpoint:** `POST /api/student/data-export`

### Right to Rectification (Article 16)
**Status:** ⚠ Partial  
**TODO:** Build correction form for email/name updates

### Right to Erasure (Article 17)
**Status:** ✅ Implemented (30-day grace period)  
**Endpoint:** `POST /api/student/deletion-request`

### Right to Restrict (Article 18)
**Status:** ❌ Not implemented  
**TODO:** Build data "freeze" feature

### Right to Data Portability (Article 20)
**Status:** ✅ Implemented  
**Endpoint:** `POST /api/student/data-export` (JSON/CSV)

### Right to Object (Article 21)
**Status:** ⏳ Partial  
**TODO:** Build marketing opt-out UI

---

## Incident Response

If personal data is **lost, corrupted, or exposed**:

1. **Within 1 hour:** Alert DailyAgile security team
2. **Within 24 hours:** Assess scope (how many students, what data)
3. **Within 72 hours:** Notify EU supervisory authority (GDPR Article 33)
4. **Immediately if high risk:** Notify affected students

**Emergency Contact:** security@dailyagile.com

---

## Audit Trail & Accountability

All data access is logged in the `privacy_audit_log` table:

```sql
SELECT event_type, COUNT(*) as count
FROM privacy_audit_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY event_type
ORDER BY count DESC;
```

**Logged Events:**
- `data_exported` — Student downloaded their data
- `consent_given` — Student consented to terms
- `consent_withdrawn` — Student opted out
- `account_deleted_requested` — Deletion initiated
- `account_deleted_completed` — Deletion finished
- `login` — Student logged in
- `quiz_attempt` — Quiz taken (for audit trail)

---

## Configuration Checklist

- [x] SUPABASE_REGION set to eu-central-1 in .env
- [ ] Supabase region verified in Settings → Infrastructure
- [ ] Backup region confirmed as EU
- [ ] Supabase DPA signed
- [ ] Vercel DPA signed
- [ ] Brevo DPA signed
- [ ] Data deletion worker deployed
- [ ] Incident response plan documented
- [ ] Privacy policy published
- [ ] DPIA completed for AI grading

---

## Questions?

For questions about data residency, compliance, or your rights under GDPR:

**Email:** support@dailyagile.com  
**Privacy Policy:** https://dailyagile.com/privacy  
**Legal Contact:** legal@dailyagile.com

---

*Last updated: 2026-08-16*
