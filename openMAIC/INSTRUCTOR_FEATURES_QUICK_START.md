# Instructor Features Quick Start Guide

## Overview

Three new instructor/admin features shipping in this sprint:

1. **Quiz Management Dashboard** — Manage all your quizzes in one place
2. **Bulk Instructor Upload** — Add 100+ instructors in one CSV upload
3. **Extension Request Management** — Handle student extension/new-code requests

---

## FEATURE 1: Quiz Management Dashboard

### For Instructors

**Access**: `/teach/quiz/management`

**What You Can Do**:
- See all your quizzes with stats (assignments, completion rate)
- Publish/unpublish quizzes with one click
- Click "Details" to see detailed assignments and results

**Detailed View** (`/teach/quiz/management/[quizId]`):
- **Assignments Tab**: See every student assignment, expiry date, attempt count
- **Results Tab**: View completion stats, average score, pass rate per student

**API Endpoints**:
```
GET /api/instructor/quiz/list-with-auth
  → Get all your quizzes with stats

PATCH /api/instructor/quiz/[quizId]/publish
  → Publish/unpublish a quiz
  Body: { publish: true }

GET /api/instructor/quiz/[quizId]/assignments
  → Get all assignments for a quiz
  Query: ?status=active&limit=50&offset=0

GET /api/instructor/quiz/[quizId]/results
  → Get all student results for a quiz
```

---

## FEATURE 2: Bulk Instructor Upload

### For Admins

**Access**: `/admin/instructors/bulk-upload`

**What You Can Do**:
1. Download the CSV template
2. Fill in instructor data (email, first name, last name, phone, location, courses)
3. Upload the CSV file
4. Watch real-time progress
5. Review results (success/failed/skipped)
6. Download error details for failures

**CSV Format**:
```csv
email,first_name,last_name,cell_number,location,courses_they_teach
john@example.com,John,Doe,555-1234,New York,AI-101;AGILE-202
jane@example.com,Jane,Smith,555-5678,Los Angeles,AI-101
```

**Rules**:
- Required: email, first_name, last_name
- Optional: cell_number, location, courses_they_teach
- Courses are semicolon-separated (AI-101;AGILE-202)
- Email must be valid format
- Duplicate emails update existing records
- Max 5MB file size

**API Endpoints**:
```
POST /api/admin/instructors/bulk-upload
  → Upload CSV file
  Body: FormData with 'file' field

GET /api/admin/instructors/bulk-upload/[uploadId]
  → Check upload status while processing

GET /api/admin/instructors/bulk-upload/[uploadId]/results
  → Get detailed results per row
  Query: ?status=success&limit=50&offset=0
```

---

## FEATURE 3: Extension Request Management

### For Students

**When to Request Extension**:
- Your assignment expires but you need more time
- You've used all your attempts and need a new code

**How to Request**:
1. Click "Request Extension" on expired assignment
2. Choose: Extension (need more time) or New Code (new attempt)
3. Add optional reason
4. Submit

**What Happens Next**:
- Instructor gets notified
- You'll see "Pending..." status
- Instructor approves (new date) or denies (with reason)
- You get notification with result

### For Instructors

**Access**: `/teach/requests`

**What You Can Do**:
- View pending requests (awaiting your action)
- View approved requests (historical)
- View denied requests (historical)

**For Each Request**:
- See student name, email
- See quiz name
- Choose: Extension or New Code request
- If extension: set new expiry date
- If new code: confirm (generates 2-week new code)
- If deny: provide reason (student sees it)

**API Endpoints** (Student):
```
POST /api/quiz/assignments/[assignmentId]/request-extension
  → Request extension or new code
  Body: {
    requestType: 'extension' | 'new_code',
    reason?: 'Optional reason for request'
  }
```

**API Endpoints** (Instructor):
```
GET /api/instructor/requests
  → Get your pending requests
  Query: ?status=pending&status=approved&status=denied

PATCH /api/instructor/requests/[requestId]
  → Approve or deny request
  Body: {
    action: 'approve' | 'deny',
    newExpiryDate?: '2026-08-15' (required for extension approve),
    reason?: 'Reason for denial'
  }
```

---

## Authentication

All endpoints require JWT token in Authorization header:

```bash
Authorization: Bearer <jwt_token>
```

**Token Contains**:
- `id`: User UUID
- `email`: User email
- `role`: 'student' | 'instructor' | 'admin'
- `verified`: Boolean (email verified)

---

## Feature Flags (Optional)

If using feature flags, enable these on your organization:

```
quiz_management = true        # Quiz Management Dashboard
instructor_bulk_upload = true # CSV Bulk Upload
extension_requests = true     # Extension Request Management
```

---

## Error Handling

### Common Errors

**Quiz Management**:
- 401 Unauthorized → Not authenticated
- 403 Forbidden → Not quiz owner
- 404 Not Found → Quiz doesn't exist

**Bulk Upload**:
- 400 Bad Request → Invalid CSV format
- 400 File too large → CSV > 5MB
- 400 Missing headers → email, first_name, last_name required

**Extension Requests**:
- 401 Unauthorized → Not authenticated
- 403 Forbidden → Not assignment owner (student) or not assignment instructor (instructor)
- 404 Not Found → Request/assignment doesn't exist

---

## Example Usage

### Create Assignment and Check Results

```typescript
// 1. Instructor checks quiz assignments
const assignRes = await fetch('/api/instructor/quiz/[quizId]/assignments');
const { data } = await assignRes.json();
// data.assignments = [ { id, student: {...}, status, ... } ]

// 2. Student requests extension
const reqRes = await fetch('/api/quiz/assignments/[assignmentId]/request-extension', {
  method: 'POST',
  body: JSON.stringify({
    requestType: 'extension',
    reason: 'Emergency came up, need 2 more days'
  })
});
// Returns: { requestId, status: 'pending' }

// 3. Instructor views pending requests
const pendRes = await fetch('/api/instructor/requests?status=pending');
const { data: requests } = await pendRes.json();
// data.requests = [ { id, student: {...}, status: 'pending' } ]

// 4. Instructor approves request
const appRes = await fetch('/api/instructor/requests/[requestId]', {
  method: 'PATCH',
  body: JSON.stringify({
    action: 'approve',
    newExpiryDate: '2026-08-20'
  })
});
// Returns: { status: 'approved' }

// 5. Check results after completion
const resRes = await fetch('/api/instructor/quiz/[quizId]/results');
const { data: results } = await resRes.json();
// data.results = [ { student, score, percentage, status: 'completed' } ]
// data.stats = { average_score, pass_rate }
```

### Bulk Upload Workflow

```typescript
// 1. Create FormData with CSV
const formData = new FormData();
formData.append('file', csvFile);

// 2. Upload
const upRes = await fetch('/api/admin/instructors/bulk-upload', {
  method: 'POST',
  body: formData
});
const { data } = await upRes.json();
const uploadId = data.uploadId;

// 3. Poll status
const statusRes = await fetch(`/api/admin/instructors/bulk-upload/${uploadId}`);
const { data: status } = await statusRes.json();
// status = { status: 'processing', processedRowCount, successfulRowCount, ... }

// 4. Get results when complete
const resRes = await fetch(`/api/admin/instructors/bulk-upload/${uploadId}/results`);
const { data: results } = await resRes.json();
// data.rows = [ { email, status: 'success' | 'failed', errorMessage?, ... } ]
// data.summary = { successCount, failedCount, skippedCount }
```

---

## Troubleshooting

### Quiz Management Shows No Quizzes
- ✅ Verify you're logged in as instructor/admin
- ✅ Check you've created quizzes (check `/teach/quiz/new`)
- ✅ Verify JWT token is valid

### Bulk Upload Fails
- ✅ Check CSV format: email, first_name, last_name required
- ✅ Verify file < 5MB
- ✅ Check email addresses are valid
- ✅ Verify you're logged in as admin

### Extension Requests Not Showing
- ✅ Verify assignment is expired or out of attempts
- ✅ Check you're logged in as correct student/instructor
- ✅ Verify request was actually submitted

---

## Performance Tips

**Quiz Management**:
- Dashboard loads faster with <100 quizzes
- Detailed results load faster with <1000 attempts
- Use pagination (limit=50) for large result sets

**Bulk Upload**:
- Upload works best with <5000 rows (takes ~5 minutes)
- Batch processing is async — check status endpoint while processing
- Duplicate emails automatically update (no need to pre-check)

**Extension Requests**:
- Instructor dashboard loads instantly
- Filtering by status is fast (indexed)
- No performance concerns with 10,000+ requests

---

## Next Steps

1. **Test**: Try each feature in staging before production
2. **Train**: Brief instructors on quiz management dashboard
3. **Roll out**: Enable for one instructor group first
4. **Monitor**: Check error logs for first week
5. **Iterate**: Gather feedback for improvements

---

**Last Updated**: August 12, 2026  
**Version**: 1.0  
**Status**: Ready for Production ✅
