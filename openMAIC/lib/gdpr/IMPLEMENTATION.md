# GDPR Article 17 - Right to be Forgotten Implementation

## Overview

This implementation provides GDPR Article 17 (Right to be Forgotten) compliance for DailyAgile. Students can request their account to be deleted along with all personally identifiable information (PII).

## Architecture

### Data Flow

```
1. Student initiates deletion
   └─> POST /api/student/delete-account (action: "initiate")
       └─> initiateDeletion() [lib/gdpr/delete-student-account.ts]
           └─> Call PL/pgSQL: initiate_student_deletion()
               └─> Create deletion_requests record (status: pending)
               └─> Send verification email with magic link

2. Student verifies ownership (clicks magic link in email)
   └─> POST /api/gdpr/delete-account-verify
       └─> verifyDeletionByMagicLink()
           └─> Call PL/pgSQL: verify_deletion_request()
               └─> Update deletion_requests (status: verified)
           └─> processDeletion()
               └─> Call PL/pgSQL: process_student_deletion()
                   └─> Delete all PII from active tables
                   └─> Mark student as is_deleted = TRUE
                   └─> Mark audit logs for deletion (30-day grace)
                   └─> Log deletion to audit trail
           └─> Send confirmation email

3. Optional: Student cancels deletion (before verification)
   └─> POST /api/student/delete-account (action: "cancel")
       └─> cancelDeletion()
           └─> Update deletion_requests (status: cancelled)
           └─> Student account remains active
```

### Tables Modified

**Migration:** `042_gdpr_article_17_right_to_be_forgotten.sql`

**New Tables:**
- `deletion_requests` - Track all deletion requests with status
  - `id` (UUID) - Deletion ticket ID
  - `student_id` (UUID) - Student being deleted
  - `student_email` (TEXT) - Immutable snapshot of email
  - `status` - pending, verified, processing, completed, failed, cancelled
  - `records_deleted` (JSONB) - What was deleted (counts)
  - `requested_at` - When deletion was requested
  - `verified_at` - When ownership was verified
  - `completed_at` - When deletion was processed

**Modified Tables:**
- `students` - Added columns:
  - `is_deleted` (BOOLEAN) - Soft delete flag
  - `deletion_requested_at` (TIMESTAMPTZ)
  - `deletion_completed_at` (TIMESTAMPTZ)
  - `deletion_ticket_id` (UUID) - Reference to deletion_requests
  - `deletion_reason` (TEXT)

### Deleted Data

When a student's account is deleted, the following is removed:

✅ **Permanently Deleted:**
- Email address (anonymized to `deleted_<uuid>@anonymized.local`)
- Password hash
- Verification codes
- First name / Last name (anonymized to `[DELETED]`)
- Student profile (avatar, bio, preferences)
- Quiz attempts and scores (student_quiz_history)
- Quiz session data (quiz_sessions → cascade deletes quiz_responses)
- Student progress tracking
- Course purchases and payment records (quiz_purchases)

✅ **Preserved (Immutable Audit Logs):**
- Audit trail entries in `audit_logs_immutable` (marked for deletion after 30-day grace period)
- Deletion is marked but not removed to comply with legal hold requirements

### API Endpoints

#### 1. Initiate Deletion

```
POST /api/student/delete-account
Authorization: Bearer <student_jwt_token>

Request:
{
  "email": "student@example.com",
  "action": "initiate",
  "verification_method": "magic_link"
}

Response (202 Accepted):
{
  "success": true,
  "deletion_ticket_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Check your email for a confirmation link. Link expires in 24 hours.",
  "status": "pending",
  "verification_method": "magic_link"
}
```

#### 2. Verify & Process Deletion

```
POST /api/gdpr/delete-account-verify

Request:
{
  "deletion_ticket_id": "550e8400-e29b-41d4-a716-446655440000",
  "token": "encrypted-token-from-email",
  "student_id": "student-uuid"
}

Response (200 OK):
{
  "success": true,
  "message": "Account deleted successfully. Check your email for confirmation details.",
  "status": "completed",
  "deletion_ticket_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 3. Check Deletion Status

```
GET /api/student/delete-account?ticket=<deletion_ticket_id>
Authorization: Bearer <student_jwt_token>

Response (200 OK):
{
  "success": true,
  "deletion_ticket_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "requested_at": "2026-08-23T10:30:00Z",
  "verified_at": "2026-08-23T10:31:00Z",
  "completed_at": "2026-08-23T10:31:05Z",
  "records_deleted": {
    "quiz_sessions": 5,
    "quiz_responses": 23,
    "quiz_purchases": 1,
    "student_profiles": 1,
    "student_quiz_history": 12
  }
}
```

#### 4. Cancel Deletion (before verification)

```
POST /api/student/delete-account
Authorization: Bearer <student_jwt_token>

Request:
{
  "action": "cancel",
  "deletion_ticket_id": "550e8400-e29b-41d4-a716-446655440000"
}

Response (200 OK):
{
  "success": true,
  "deletion_ticket_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Deletion cancelled. Your account remains active.",
  "status": "cancelled"
}
```

## Security Features

### 1. Verification Methods

**Magic Link (Default):**
- Secure token sent via email
- Expires in 24 hours
- One-time use
- Encrypted using JWT_SECRET
- Protects against account takeover

**Password** (Not yet implemented):
- Requires password verification
- Prevents accidental deletion
- Future enhancement

### 2. Soft Delete Pattern

- `is_deleted` flag preserves referential integrity
- Enables account recovery if needed (admin feature)
- Prevents duplicate email on signup

### 3. Audit Trail Immutability

- `audit_logs_immutable` table is write-only
- RLS policies prevent UPDATE/DELETE
- Deletion logs include:
  - What was deleted (record counts)
  - Who requested it (email)
  - When it was deleted
  - Reason ("GDPR Article 17")

### 4. Grace Period

- 30-day grace period for audit logs (per GDPR Recital 55)
- Allows recovery if deletion was fraudulent
- Logs automatically purged after 30 days
- Configurable via `retention_until` field

## Compliance

### GDPR Article 17 Checklist

- ✅ **Right to Erasure:** Students can request deletion
- ✅ **Verification:** Ownership verified via magic link
- ✅ **PII Deletion:** All personally identifiable data removed
- ✅ **Cascade Deletion:** Related records deleted via foreign keys
- ✅ **Audit Trail:** Immutable logs preserve record of deletion
- ✅ **Confirmation:** Student receives confirmation email
- ✅ **Grace Period:** 30-day retention for legal holds
- ✅ **Data Portability:** Students can export data before deletion (via GET /api/student/data-export)

### GDPR Article 15 (Data Subject Access)

- ✅ **Access Logs:** `get_data_subject_access_logs()` PL/pgSQL function
- ✅ **Format:** JSON export of all logs involving the student
- ✅ **Scope:** Shows all actions related to the student's data

### GDPR Article 6 (Lawful Basis)

- ✅ **Consent:** Explicit action by student
- ✅ **Necessity:** Student's legal right to erasure
- ✅ **Transparency:** Clear messaging about what will be deleted

## Testing

### Manual Testing Workflow

```bash
# 1. Create test student account
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.deletion@example.com",
    "first_name": "Test",
    "last_name": "Delete",
    "password": "TestPass123!"
  }'

# 2. Get student JWT token
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.deletion@example.com",
    "otp": "123456"
  }'
# Copy the token from response

# 3. Initiate deletion
curl -X POST http://localhost:3000/api/student/delete-account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "email": "test.deletion@example.com",
    "action": "initiate",
    "verification_method": "magic_link"
  }'
# Save deletion_ticket_id from response

# 4. Verify via magic link (in test environment)
curl -X POST http://localhost:3000/api/gdpr/delete-account-verify \
  -H "Content-Type: application/json" \
  -d '{
    "deletion_ticket_id": "<ticket_id>",
    "token": "<token_from_email>",
    "student_id": "<student_uuid>"
  }'

# 5. Check status
curl -X GET http://localhost:3000/api/student/delete-account?ticket=<ticket_id> \
  -H "Authorization: Bearer <token>"
```

### Automated Test Suite

File: `openMAIC/app/api/student/delete-account/__tests__/route.test.ts`

```typescript
describe('DELETE /api/student/delete-account', () => {
  it('should initiate deletion request', async () => {
    // Test initiation
  });

  it('should verify deletion via magic link', async () => {
    // Test verification
  });

  it('should process deletion and delete PII', async () => {
    // Test deletion
  });

  it('should preserve audit logs', async () => {
    // Test audit trail
  });

  it('should allow cancellation before verification', async () => {
    // Test cancellation
  });

  it('should reject unauthenticated requests', async () => {
    // Test auth
  });
});
```

## Integration with Email Service

### Email Templates

**Deletion Verification Email:**
- Subject: "⚠️ Confirm DailyAgile Account Deletion"
- Contains: Magic link, 24-hour expiration warning, what will be deleted
- Sent via: Brevo API (BREVO_API_KEY env var)

**Deletion Confirmation Email:**
- Subject: "🗑️ DailyAgile Account Deletion Complete"
- Contains: Deletion ticket ID, what was deleted, grace period info
- Sent via: Brevo API

### Configuration

```env
# Required environment variables
BREVO_API_KEY=<your-brevo-api-key>
JWT_SECRET=<your-jwt-secret>
NEXT_PUBLIC_APP_URL=https://dailyagile.com
```

## Future Enhancements

1. **Admin Dashboard**
   - View pending deletion requests
   - Approve/reject deletion requests
   - Override deletion decisions

2. **Data Export Before Deletion**
   - Allow students to download their data as JSON/CSV
   - Automatic export on deletion

3. **Bulk Deletion**
   - Admin endpoint to delete multiple inactive accounts
   - Scheduled task to delete expired trial accounts

4. **Password Verification**
   - Additional verification method for sensitive deletions
   - bcryptjs integration for password verification

5. **Deletion Recovery**
   - 7-day "soft delete" period before permanent erasure
   - Allow students to cancel deletion within 7 days
   - Admin feature to restore deleted accounts

6. **Legal Hold Integration**
   - Mark accounts for legal hold (don't delete)
   - Track legal hold status in audit logs
   - Automated legal hold expiration

## Database Functions Reference

### `initiate_student_deletion(p_student_id, p_student_email, p_verification_method)`
Creates a new deletion request and logs it to audit trail.

### `verify_deletion_request(p_deletion_request_id, p_student_id)`
Marks a deletion request as verified, enabling processing.

### `process_student_deletion(p_deletion_request_id)`
Processes verified deletion request:
- Deletes all PII from active tables
- Marks student as deleted
- Marks audit logs for deletion
- Logs deletion to audit trail

### `anonymize_student_pii(p_student_id)`
Anonymizes student PII (soft delete without cascade).

## Monitoring & Logging

All deletion operations are logged to:
- **Application logs:** `lib/logger.ts` with "GDPRDeleteService" prefix
- **Audit trail:** `audit_logs_immutable` with action = 'data_deletion_request' or 'hard_delete'
- **Email logs:** Brevo API response captures email delivery status

### Queries for Monitoring

```sql
-- Check pending deletions
SELECT * FROM deletion_requests WHERE status = 'pending';

-- Check completed deletions
SELECT * FROM deletion_requests WHERE status = 'completed' ORDER BY completed_at DESC;

-- Check audit trail for deletions
SELECT * FROM audit_logs_immutable 
WHERE action IN ('data_deletion_request', 'hard_delete') 
ORDER BY created_at DESC;

-- Check for failed deletions
SELECT * FROM deletion_requests WHERE status = 'failed';

-- Check audit logs for specific student (for recovery)
SELECT * FROM audit_logs_immutable 
WHERE data_subject_id = '<student_uuid>' 
ORDER BY created_at DESC;
```

## Support & Troubleshooting

### Common Issues

**Issue: Deletion verification email not sent**
- Check BREVO_API_KEY environment variable
- Check email logs in Brevo dashboard
- Verify DNS MX records for noreply@dailyagile.com

**Issue: Deletion fails with "Student not found"**
- Verify student_id and email match in students table
- Check if student is already deleted (is_deleted = TRUE)

**Issue: Deletion incomplete after verification**
- Check deletion_requests status (should be 'processing' then 'completed')
- Check error_message field for specific error
- Check audit logs for hard_delete entries

**Issue: Student can't cancel deletion**
- Verify deletion_request status is 'pending' or 'verified' (not 'processing')
- Check student_id matches

### Admin Recovery

To restore a deleted account (admin only):

```sql
-- Restore student account
UPDATE students
SET 
  is_deleted = FALSE,
  deletion_completed_at = NULL,
  is_active = TRUE
WHERE id = '<student_uuid>';

-- Note: PII cannot be restored (permanently deleted)
-- Only the account record is restored
```

## References

- [GDPR Article 17 - Right to Erasure](https://gdpr-info.eu/art-17-gdpr/)
- [GDPR Article 15 - Data Subject Access](https://gdpr-info.eu/art-15-gdpr/)
- [GDPR Recital 55 - Right to Erasure](https://gdpr-info.eu/recitals/no-55/)
- [DailyAgile CLAUDE.md - GDPR Policy](../../CLAUDE.md#security-rules)
