# California Consumer Privacy Act (CCPA) Consumer Rights Notice

**Last Updated:** August 23, 2026  
**Effective Date:** August 23, 2026

---

## Overview

DailyAgile ("Company," "we," "us") is committed to complying with the **California Consumer Privacy Act (CCPA)**, which gives California residents specific rights regarding their personal information.

This notice explains those rights and how to exercise them.

---

## Your CCPA Rights as a California Consumer

### 1. **Right to Know (Access)**

**What it means:** You have the right to request that we disclose what personal information we have collected about you.

**What we will provide:**
- Categories of personal information we have collected
- Categories of sources we collected it from
- Our business purpose for collection
- Categories of third parties we share it with
- Specific pieces of personal information we have collected about you (in a portable format)

**Response time:** 45 calendar days

**How to exercise:** Email `support@dailyagile.com` with subject line "California Consumer Data Access Request"

**Endpoint:** `POST /api/ccpa/data-access`

---

### 2. **Right to Delete**

**What it means:** You have the right to request deletion of personal information we have collected about you.

**What happens:**
- We will delete your personal information within 45 days
- Some exceptions apply (see "Exceptions" section below)
- We will direct our service providers to delete your information

**Response time:** 45 calendar days

**How to exercise:** Email `support@dailyagile.com` with subject line "California Consumer Deletion Request"

**Endpoint:** `POST /api/ccpa/delete`

**Note:** Data deletion is permanent and cannot be undone.

---

### 3. **Right to Opt-Out of Sale or Sharing**

**What it means:** You have the right to opt out if we sell or share your personal information.

**Our current practice:** 
- **We do NOT sell your personal information** to third parties
- **We do NOT share your personal information** for cross-context behavioral advertising
- We do not engage in the sale or sharing of personal information as defined by CCPA

If this changes in the future, we will:
1. Update this notice
2. Provide an opt-out mechanism before any sale or sharing
3. Honor all opt-out requests within 30 days

---

### 4. **Right to Correct**

**What it means:** You have the right to request correction of inaccurate personal information we hold about you.

**How to exercise:**
1. Log into your DailyAgile account
2. Go to Settings → Profile
3. Update your information directly, OR
4. Email `support@dailyagile.com` requesting specific corrections

**Response time:** 45 calendar days

---

### 5. **Right to Limit Use & Disclosure**

**What it means:** You have the right to limit how we use your personal information.

**What you can limit:**
- Marketing and promotional emails
- Analytics and usage tracking
- Leaderboard visibility
- Third-party sharing (where applicable)

**How to exercise:**
1. Log into your DailyAgile account
2. Go to Settings → Privacy Preferences
3. Adjust settings, OR
4. Email `support@dailyagile.com` with specific limitations requested

---

### 6. **Right to Non-Discrimination**

**What it means:** We cannot discriminate against you for exercising your CCPA rights.

**We will NOT:**
- Deny you products or services
- Charge you different prices
- Provide you different quality of service
- Suggest that exercising your rights will result in adverse treatment
- Impose penalties, fees, or reduced service for exercising rights

**Exception:** We may offer financial incentives (like discounts) for data collection if:
- The incentive is reasonably related to the value of your data
- You provide explicit written consent
- You can withdraw consent anytime

---

## Exceptions to Deletion Rights

DailyAgile may retain and not delete personal information to the extent permitted by CCPA:

| Data Type | Retention Period | Legal Basis |
|-----------|------------------|-------------|
| Audit logs | 7 years | Legal compliance, fraud prevention |
| Quiz attempt records | 3 years | Educational regulatory requirement |
| Consent records | Permanently (anonymized) | CCPA accountability requirement |
| Payment records | Per payment processor terms | Fraud prevention, dispute resolution |
| Anonymized/aggregated data | Indefinite | No longer "personal information" per CCPA |

---

## Our Data Collection Practices

### Personal Information We Collect

**From You Directly:**
- Email address (required for signup)
- Name (optional)
- Avatar/profile image (optional)
- Quiz responses and answers
- Feedback and messages

**Automatically:**
- IP address
- Browser and device information
- Cookies and tracking pixels
- Login timestamps and activity patterns
- Quiz performance data

**From Third Parties:**
- Payment processor data (if applicable): Stripe
- Cloud hosting data: Vercel, Supabase
- Email service data: SendGrid

### Business Purposes for Collection

We collect personal information for:
- Providing quiz and learning platform services
- Authenticating users and securing accounts
- Delivering personalized learning experiences
- Tracking progress and awarding badges
- Improving platform features
- Ensuring security and preventing fraud
- Complying with legal requirements
- Analyzing usage and performance

### Third Parties We Share With

**Service Providers** (under Data Processing Agreements):
- Supabase (database and authentication)
- Vercel (web hosting and CDN)
- SendGrid (email delivery)
- Anthropic Claude (AI quiz generation)
- Stripe (payment processing, if applicable)

**Important:** We do NOT sell or share your information with other third parties.

---

## How to Exercise Your Rights

### Method 1: Online Endpoints

**Data Access Request:**
```
POST /api/ccpa/data-access
Content-Type: application/json

{
  "email": "your-email@example.com",
  "format": "json" or "pdf"
}
```

**Deletion Request:**
```
POST /api/ccpa/delete
Content-Type: application/json

{
  "email": "your-email@example.com",
  "reason": "optional reason"
}
```

### Method 2: Email

Send an email to: **support@dailyagile.com**

Subject line must include:
- "California Consumer Data Access Request" (for right to know), OR
- "California Consumer Deletion Request" (for right to delete), OR
- "California Consumer Correction Request" (for right to correct)

Include in your email:
- Your full name
- Email address associated with your account
- Which right you're exercising
- Any supporting information

### Method 3: In-App Request

1. Log into your DailyAgile account
2. Go to Settings → Privacy & Data Rights
3. Click "Submit a CCPA Request"
4. Select your request type and provide details

---

## Our Response Obligations

**Response Time:** We will respond to your request within **45 calendar days**.

**Extensions:** If your request is complex, we may extend our response time by up to 90 days total (45 + 45).

**Verification:** We will verify your identity before responding to:
- Data access requests
- Deletion requests
- Correction requests

**Format:** We will provide data in a portable, commonly used format (JSON or CSV).

---

## Authorized Agents

If you are submitting a request through an authorized agent:

1. You must authorize the agent in writing
2. Provide a signed power of attorney
3. The agent must submit the request

We will verify your identity even when an agent submits on your behalf.

---

## Contact Information

**For Privacy Inquiries or to Exercise Your Rights:**

- **Email:** support@dailyagile.com
- **Data Protection Officer:** tkiran204@gmail.com
- **Mailing Address:** DailyAgile, [Address TBD]
- **Response Time:** We acknowledge receipt within 2 business days

**For Complaints:**

If you believe DailyAgile has violated your CCPA rights, you may:
1. Contact us to resolve the issue
2. File a complaint with the **California Attorney General**
   - Website: oag.ca.gov
   - Email: privacy@oag.ca.gov
   - Phone: (800) 952-5225

---

## Data Security

We protect your personal information with:
- HTTPS encryption (data in transit)
- Password hashing with salt (never plain text)
- Encrypted storage at rest
- Access controls and authentication
- Regular security audits
- Incident response procedures

---

## Changes to This Notice

We may update this notice as our practices change or as required by law. We will notify California residents of material changes via email or by posting a notice on our website.

**Last Updated:** August 23, 2026  
**Next Review:** August 23, 2027

---

## Glossary

| Term | Definition |
|------|------------|
| **Personal Information** | Information that identifies, relates to, or could be linked with a particular consumer or household |
| **Sale** | Selling, renting, releasing, disclosing, or making available personal information in exchange for monetary consideration |
| **Sharing** | Sharing personal information for cross-context behavioral advertising |
| **Consumer** | A natural person who is a California resident |
| **Business** | For-profit entity organized/doing business in California that collects/uses consumer personal information |
| **Service Provider** | Entity processing personal information on behalf of business under contract |

---

## Additional Resources

- [Full CCPA Text](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CIV&division=3.&title=1.81.5.&part=4.&chapter=&article=&section=1798.100)
- [California Attorney General CCPA Guidance](https://oag.ca.gov/privacy/ccpa)
- [Our Privacy Policy](/legal/privacy-policy)

---

**DailyAgile is committed to respecting your privacy and protecting your rights as a California consumer.**

For questions, email: **support@dailyagile.com**
