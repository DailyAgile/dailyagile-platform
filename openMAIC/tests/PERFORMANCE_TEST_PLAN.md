# Performance Testing Plan

**Sprint:** 11-15 days (Days 8-9)  
**Tools:** k6, Artillery, or custom Node.js load testing  
**Targets:** 200ms API response time, 100 concurrent users

---

## Load Testing Scenarios

### Scenario 1: Concurrent Quiz Submissions (Critical)
**Goal:** Verify system handles multiple students submitting simultaneously

```
Load: 100 concurrent students
Duration: 5 minutes
Endpoint: POST /api/student/quiz/submit-answer
Expected:
- Response time < 200ms (p95)
- 0% error rate
- Database handles concurrent writes correctly
```

### Scenario 2: Dashboard List Performance
**Goal:** Verify pagination/filtering doesn't degrade with scale

```
Load: 50 concurrent users
Duration: 10 minutes
Endpoint: GET /api/student/quizzes (pagination: 1000 quizzes)
Expected:
- Response time < 150ms (p95)
- Memory usage stable
- No N+1 queries
```

### Scenario 3: Instructor Results Export
**Goal:** Verify large CSV export doesn't timeout

```
Load: 10 concurrent exports
Data: 1000 quiz attempts
Duration: 5 minutes
Endpoint: GET /api/instructor/quiz/export-csv
Expected:
- Export completes < 30 seconds
- Memory usage < 500MB
- No connection timeouts
```

### Scenario 4: Authentication Peak
**Goal:** Handle login surge (e.g., class session start)

```
Load: 500 concurrent logins
Duration: 2 minutes
Endpoint: POST /api/auth/student/login
Expected:
- Response time < 300ms (p95)
- 0% auth failures
- No rate limiting errors (after threshold)
```

---

## Database Query Performance Tests

### N+1 Query Detection
```typescript
// Monitor query count during common operations:

// GOOD: Quiz results (1 query for quiz + 1 for attempts)
const results = await getQuizResults(quizId);
expect(queryCount).toBe(2);

// BAD: Instructor quiz list (1 per quiz to fetch instructor name)
const quizzes = await getInstructorQuizzes(instructorId);
expect(queryCount).toBeLessThan(quizzes.length + 2); // Should use JOIN
```

### Index Verification
```sql
-- Critical indexes to verify:
CREATE INDEX idx_quiz_sessions_student_id 
  ON quiz_sessions(student_id);

CREATE INDEX idx_quiz_sessions_status 
  ON quiz_sessions(status, created_at DESC);

CREATE INDEX idx_quiz_attempts_student_quiz 
  ON quiz_attempts(student_id, quiz_id);

CREATE INDEX idx_assignments_code 
  ON assignments(assignment_code);

CREATE INDEX idx_progress_student_module 
  ON progress(student_id, module_id);
```

---

## API Response Time Targets

| Endpoint | P50 | P95 | P99 |
|----------|-----|-----|-----|
| Login | 100ms | 200ms | 300ms |
| Quiz Start | 80ms | 150ms | 250ms |
| Submit Answer | 150ms | 250ms | 400ms |
| Get Results | 120ms | 200ms | 350ms |
| List Quizzes | 100ms | 180ms | 300ms |
| Export CSV | 5s | 15s | 30s |

---

## Memory & Resource Tests

### Long-Running Quiz Session
```
- Start quiz, keep session open for 30 minutes
- Monitor memory usage (should not grow indefinitely)
- Verify cleanup on timeout
- Check for connection leaks
```

### Large File Upload
```
- CSV upload: 10,000 rows
- Expected: < 50MB memory, < 30 second processing
- Verify temp file cleanup
```

---

## Metrics to Monitor

### System Metrics
- CPU usage: < 70% under load
- Memory: < 80% under load
- Disk I/O: stable, no saturation
- Connection pool: healthy, no exhaustion

### Application Metrics
- API error rate: < 0.1%
- p95 latency: < 200ms for primary flows
- Database connection pool: healthy
- Queue processing: zero backlog

### Database Metrics
- Query time distribution (p50/p95/p99)
- Connection count under load
- Transaction rollback rate
- Index usage verification

---

## Running Performance Tests

### Setup k6
```bash
# Install k6
brew install k6  # macOS
apt-get install k6  # Linux

# Run quiz submission load test
k6 run tests/performance/quiz-submission-load.js \
  --vus 100 \
  --duration 5m
```

### Custom Node.js Load Test
```bash
# Run custom load test
node tests/performance/load-test-runner.js \
  --endpoint /api/student/quiz/submit-answer \
  --concurrent 100 \
  --duration 300
```

### Monitor Database Performance
```bash
# Check query performance in Supabase
SELECT 
  query,
  mean_time,
  stddev_time,
  calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;
```

---

## Acceptance Criteria

✓ All endpoints achieve < 200ms p95 latency  
✓ System handles 100 concurrent quiz submissions  
✓ Zero authentication failures under load  
✓ CSV export < 30 seconds for 1000 records  
✓ Memory usage stable (no growth over 30 minutes)  
✓ Database indexes verified as effective  
✓ N+1 queries eliminated from critical paths  

---

## Known Performance Risks

1. **CSV Export Large Dataset** — May need streaming response
2. **Quiz Results Calculation** — May need caching layer
3. **Concurrent Assignment Lookups** — May need rate limiting
4. **Email Sending** — Should be asynchronous/queued

---

## Performance Test Schedule

- **Day 8:** Database index verification + simple load tests
- **Day 9:** Full scenario load tests + results analysis

---

*Last updated: 2026-08-12*
