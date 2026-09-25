# Admin Endpoints - Pagination API Documentation

## Overview

All admin endpoints support consistent pagination to prevent memory overload on large datasets. Endpoints return paginated data with metadata including total count, page number, and whether more pages exist.

**Date:** 2026-08-14  
**Status:** ✅ Complete & Tested

---

## Pagination Query Parameters

All admin endpoints accept the following query parameters:

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | number | 1 | ∞ | 1-based page number |
| `limit` | number | 50 | 200 | Items per page (DOS protection) |
| `sort` | string | created_at | - | Column to sort by (endpoint-specific) |
| `order` | string | asc | - | Sort order: `asc` or `desc` |
| `search` | string | - | - | Search query (endpoint-specific) |
| `status` | string | - | - | Filter by status (endpoint-specific) |
| `type` | string | - | - | Filter by type (endpoint-specific) |

**DOS Protection:**
- Default limit: 50 items
- Maximum limit: 200 items
- Requests with limit > 200 are automatically capped at 200

---

## Response Format

All paginated endpoints return the same response structure:

```json
{
  "success": true,
  "data": [
    { /* item data */ }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 10234,
    "totalPages": 205,
    "hasMore": true
  }
}
```

### Pagination Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `page` | number | Current page (1-based) |
| `limit` | number | Items per page |
| `total` | number | Total items across all pages |
| `totalPages` | number | Total number of pages |
| `hasMore` | boolean | True if more pages exist |

---

## Endpoints

### 1. GET /api/admin/students

List all students with pagination and filtering.

**Query Parameters:**
- `page`, `limit`, `sort`, `order` (standard)
- `search`: Search by email or name
- `status`: Filter by account status (active, inactive)

**Sort Options:** `created_at`, `email`, `last_active`

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "id": "student-1",
      "email": "jane@example.com",
      "name": "Jane Doe",
      "status": "active",
      "enrollments": 3,
      "total_spent": 297,
      "created_at": "2026-07-10T10:00:00Z",
      "last_active": "2026-08-14T15:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 10234,
    "totalPages": 205,
    "hasMore": true
  }
}
```

**Examples:**
```bash
# Get first 50 students
curl "https://api.dailyagile.com/api/admin/students"

# Get page 2 with 25 items per page
curl "https://api.dailyagile.com/api/admin/students?page=2&limit=25"

# Search for a student by email
curl "https://api.dailyagile.com/api/admin/students?search=jane@example.com"

# Sort by email in descending order
curl "https://api.dailyagile.com/api/admin/students?sort=email&order=desc"

# Filter by status and search
curl "https://api.dailyagile.com/api/admin/students?status=active&search=john&page=3&limit=100"
```

---

### 2. GET /api/admin/instructors

List all instructors with pagination and filtering.

**Query Parameters:**
- `page`, `limit`, `sort`, `order` (standard)
- `search`: Search by email or name
- `status`: Filter by instructor status

**Sort Options:** `created_at`, `email`, `rating`

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "id": "instructor-1",
      "email": "sarah@example.com",
      "name": "Sarah Johnson",
      "status": "active",
      "courses_teaching": 3,
      "active_cohorts": 2,
      "rating": 4.8,
      "created_at": "2026-06-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 125,
    "totalPages": 3,
    "hasMore": true
  }
}
```

**Examples:**
```bash
# Get instructors sorted by rating (descending)
curl "https://api.dailyagile.com/api/admin/instructors?sort=rating&order=desc"

# Get page 2 of 100 instructors per page
curl "https://api.dailyagile.com/api/admin/instructors?page=2&limit=100"

# Search for instructor by name
curl "https://api.dailyagile.com/api/admin/instructors?search=Sarah"
```

---

### 3. GET /api/admin/classrooms

List all classrooms (cohorts) with pagination and filtering.

**Query Parameters:**
- `page`, `limit`, `sort`, `order` (standard)
- `search`: Search by course name
- `status`: Filter by status (scheduled, active, completed)

**Sort Options:** `created_at`, `course_id`, `status`

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "id": "classroom-1",
      "course_id": "course-track-a-m1",
      "course_name": "Track A Module 1",
      "instructor_name": "Sarah Johnson",
      "students_count": 18,
      "status": "active",
      "start_date": "2026-09-01T00:00:00Z",
      "created_at": "2026-08-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 42,
    "totalPages": 1,
    "hasMore": false
  }
}
```

**Examples:**
```bash
# Get all active classrooms
curl "https://api.dailyagile.com/api/admin/classrooms?status=active"

# Search for classrooms by course name
curl "https://api.dailyagile.com/api/admin/classrooms?search=Track%20A"

# Get scheduled classrooms sorted by start date
curl "https://api.dailyagile.com/api/admin/classrooms?status=scheduled&sort=start_date&order=asc"
```

---

### 4. GET /api/admin/quizzes

List all quizzes with pagination and filtering.

**Query Parameters:**
- `page`, `limit`, `sort`, `order` (standard)
- `search`: Search by title or course ID
- `type`: Filter by type (self-paced, live)

**Sort Options:** `created_at`, `title`, `course_id`

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "id": "quiz-1",
      "title": "AI Fundamentals Quiz",
      "course_id": "course-track-a-m1",
      "type": "self-paced",
      "question_count": 15,
      "attempts_total": 287,
      "avg_score": 78,
      "created_at": "2026-08-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 156,
    "totalPages": 4,
    "hasMore": true
  }
}
```

**Examples:**
```bash
# Get all self-paced quizzes
curl "https://api.dailyagile.com/api/admin/quizzes?type=self-paced"

# Search for quizzes by title
curl "https://api.dailyagile.com/api/admin/quizzes?search=AI%20Fundamentals"

# Get live quizzes sorted by attempts
curl "https://api.dailyagile.com/api/admin/quizzes?type=live&sort=attempts_total&order=desc"
```

---

### 5. GET /api/admin/reports

List all generated reports with pagination and filtering.

**Query Parameters:**
- `page`, `limit`, `sort`, `order` (standard)
- `search`: Search by report name
- `type`: Filter by type (revenue, engagement, attendance, performance)
- `status`: Filter by status (pending, completed, failed)

**Sort Options:** `created_at`, `type`, `status`

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "id": "report-1",
      "name": "July Revenue Report",
      "type": "revenue",
      "status": "completed",
      "generated_by": "admin@example.com",
      "date_range": "2026-07-01 to 2026-07-31",
      "file_url": "https://storage.example.com/reports/july-2026.pdf",
      "created_at": "2026-08-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 87,
    "totalPages": 2,
    "hasMore": true
  }
}
```

**Examples:**
```bash
# Get revenue reports
curl "https://api.dailyagile.com/api/admin/reports?type=revenue"

# Get completed reports
curl "https://api.dailyagile.com/api/admin/reports?status=completed"

# Search for report by name
curl "https://api.dailyagile.com/api/admin/reports?search=July%20Revenue"

# Get engagement reports sorted by date (newest first)
curl "https://api.dailyagile.com/api/admin/reports?type=engagement&sort=created_at&order=desc"
```

---

## Error Handling

All endpoints return appropriate HTTP status codes:

| Status | Meaning | Response |
|--------|---------|----------|
| 200 | Success | Paginated data with pagination metadata |
| 400 | Bad Request | Invalid parameters (e.g., limit < 1) |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | User lacks admin permissions |
| 500 | Server Error | Internal database error |

**Error Response Format:**
```json
{
  "success": false,
  "errorCode": "UNAUTHORIZED",
  "error": "Admin authentication required"
}
```

---

## Authentication

All admin endpoints require admin authentication. Include your auth token in the request headers:

```bash
curl -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  "https://api.dailyagile.com/api/admin/students"
```

---

## Pagination Examples by Use Case

### Use Case 1: Show first 50 items in admin dashboard

```bash
curl "https://api.dailyagile.com/api/admin/students"
```

### Use Case 2: Implement pagination button (Next/Prev)

```javascript
// Frontend code
const page = 2;
const limit = 25;
const response = await fetch(
  `https://api.dailyagile.com/api/admin/students?page=${page}&limit=${limit}`
);
const { data, pagination } = await response.json();

// Show "Next" button only if hasMore is true
if (pagination.hasMore) {
  showNextButton();
}
```

### Use Case 3: Sorting and searching

```bash
# Get students by email (ascending)
curl "https://api.dailyagile.com/api/admin/students?sort=email&order=asc&limit=200"

# Get instructors with highest ratings
curl "https://api.dailyagile.com/api/admin/instructors?sort=rating&order=desc&limit=50"
```

### Use Case 4: Large dataset export

```bash
# Export all data by paginating with max limit
# Page 1
curl "https://api.dailyagile.com/api/admin/students?page=1&limit=200"
# Page 2
curl "https://api.dailyagile.com/api/admin/students?page=2&limit=200"
# ... continue until hasMore = false
```

### Use Case 5: Search and filter

```bash
# Find active students in London region
curl "https://api.dailyagile.com/api/admin/students?status=active&search=london"

# Find failing quizzes
curl "https://api.dailyagile.com/api/admin/quizzes?search=diagnostic&type=self-paced"

# Get failed reports for retry
curl "https://api.dailyagile.com/api/admin/reports?status=failed&sort=created_at&order=desc"
```

---

## Performance Considerations

1. **Default Limit:** 50 items balances performance and data freshness
2. **Maximum Limit:** 200 items prevents DOS and excessive database load
3. **Offset Queries:** For large offsets (page 1000+), consider using keyset pagination for production
4. **Sorting:** Sorting on indexed columns (created_at, email) is fast; custom columns may slow pagination
5. **Search:** Full-text search on large text fields may require database optimization

---

## Implementation Checklist

- [x] Pagination helper utilities (`lib/server/pagination.ts`)
- [x] All 5 admin endpoints with pagination support
- [x] Query parameter validation and DOS protection
- [x] Error handling and logging
- [x] Comprehensive test suite (43 test cases)
- [x] API documentation
- [x] Example curl commands
- [x] Response format validation

---

## Testing

Run tests with:
```bash
npm test -- admin-pagination.test.ts
```

**Test Coverage:**
- Parameter parsing (default, valid, invalid, edge cases)
- Offset calculation for all page numbers
- Pagination metadata (totalPages, hasMore)
- Response format validation
- Sorting and filtering
- DOS prevention (limit capping)

**Test Results:** ✅ 43/43 tests passing

---

## Next Steps

1. ✅ Commit changes to git
2. Deploy to staging for integration testing
3. Add pagination UI to admin dashboard
4. Monitor API usage and adjust limits if needed
5. Consider keyset pagination for datasets > 100K items

---

*Admin Pagination API — v1.0 — 2026-08-14*
