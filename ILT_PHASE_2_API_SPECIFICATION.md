# Phase 2 ILT API Specification

**Version:** 1.0  
**Last Updated:** August 6, 2026

---

## Base URL
```
https://your-domain.com/api
```

## Authentication
All endpoints require:
```
Authorization: Bearer {JWT_TOKEN}
```

---

## 1. CLASSROOM MANAGEMENT ENDPOINTS

### 1.1 Get Classroom Details
```
GET /classrooms/:classroomId
```

**Response (200):**
```json
{
  "id": "uuid",
  "stageId": "stage123",
  "title": "AI Governance Fundamentals",
  "description": "Learn AI governance frameworks",
  "instructorId": "user-uuid",
  "accessCode": "AIGOV2026",
  "isActive": true,
  "studentCount": 45,
  "quizzes": [
    {
      "id": "quiz-1",
      "title": "5-Layer Framework",
      "sceneId": "scene-1",
      "submissionCount": 43,
      "averageScore": 78.5
    }
  ],
  "settings": {
    "allowStudentRetakes": true,
    "maxRetakes": 3,
    "showAnswersAfterSubmit": true
  },
  "createdAt": "2026-08-01T10:00:00Z",
  "updatedAt": "2026-08-05T14:30:00Z"
}
```

---

## 2. STUDENT ROSTER MANAGEMENT ENDPOINTS

### 2.1 Add Single Student
```
POST /classrooms/:classroomId/students
```

**Request:**
```json
{
  "email": "alice@example.com",
  "name": "Alice Johnson",
  "studentId": "STU-001"
}
```

**Response (201):**
```json
{
  "id": "student-uuid",
  "email": "alice@example.com",
  "name": "Alice Johnson",
  "studentId": "STU-001",
  "enrollmentDate": "2026-08-06T10:15:00Z",
  "status": "active",
  "invitationSent": true
}
```

**Errors:**
- `400 INVALID_EMAIL` - Email format invalid
- `409 DUPLICATE_STUDENT` - Student already enrolled in this classroom
- `409 DUPLICATE_EMAIL` - Email already registered in system

---

### 2.2 Bulk Import Students (CSV)
```
POST /classrooms/:classroomId/students/bulk-import
Content-Type: multipart/form-data
```

**Request:**
```
Form data:
- file: <CSV file>
- sendInvitations: true (optional)
```

**CSV Format:**
```
Email,Name,Student ID
alice@example.com,Alice Johnson,STU-001
bob@example.com,Bob Smith,STU-002
carol@example.com,Carol Davis,STU-003
```

**Response (200):**
```json
{
  "imported": 45,
  "failed": 2,
  "duplicates": 1,
  "details": {
    "errors": [
      {
        "row": 5,
        "email": "invalid-email@",
        "error": "Invalid email format"
      },
      {
        "row": 8,
        "email": "bob@example.com",
        "error": "Student already enrolled"
      }
    ],
    "duplicates": [
      {
        "row": 12,
        "email": "alice@example.com",
        "message": "Duplicate in this import"
      }
    ]
  },
  "invitationsSent": 45,
  "timestamp": "2026-08-06T11:00:00Z"
}
```

**Errors:**
- `400 INVALID_CSV` - File not valid CSV
- `413 FILE_TOO_LARGE` - File exceeds 10MB
- `422 PARSE_ERROR` - CSV parsing failed

---

### 2.3 Get Student Roster
```
GET /classrooms/:classroomId/students
```

**Query Parameters:**
```
?status=active|dropped|all (default: active)
&sort=name|enrollmentDate|status (default: name)
&order=asc|desc (default: asc)
&page=1
&limit=50
&search=alice (optional, searches name/email)
```

**Response (200):**
```json
{
  "students": [
    {
      "id": "student-uuid-1",
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "studentId": "STU-001",
      "enrollmentDate": "2026-08-01T10:00:00Z",
      "status": "active",
      "quizzesTaken": 3,
      "averageScore": 85.5,
      "completionRate": 0.95,
      "lastActive": "2026-08-05T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

---

### 2.4 Update Student
```
PATCH /classrooms/:classroomId/students/:studentId
```

**Request:**
```json
{
  "name": "Alice J.",
  "studentId": "STU-001-NEW",
  "status": "dropped"
}
```

**Response (200):**
```json
{
  "id": "student-uuid",
  "name": "Alice J.",
  "email": "alice@example.com",
  "studentId": "STU-001-NEW",
  "status": "dropped",
  "updatedAt": "2026-08-06T15:00:00Z"
}
```

---

### 2.5 Remove Student from Roster
```
DELETE /classrooms/:classroomId/students/:studentId
```

**Response (204):** No content

**Errors:**
- `404 STUDENT_NOT_FOUND` - Student not in this classroom

---

## 3. QUIZ IMPORT/EXPORT ENDPOINTS

### 3.1 Import Quiz from CSV
```
POST /quizzes/import
Content-Type: multipart/form-data
```

**Request:**
```
Form data:
- file: <CSV file>
- classroomId: uuid
- title: "AI Governance Quiz"
```

**CSV Format:**
```
Question Type,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Points,Analysis
single,"What is AI?","Artificial Intelligence","Advanced Internet","Applied Informatics","None of above","A",1,"AI = simulated intelligence in machines"
multiple,"Which are LLM uses?","Chat","Image Gen","Code Completion","All above","A,C,D",2,"LLMs power multiple applications"
short_answer,"Explain supervised learning","[AUTO GRADED]","","","",5,"Students should mention labeled training data"
```

**Response (201):**
```json
{
  "quizId": "quiz-uuid",
  "questionsCreated": 15,
  "validation": {
    "warnings": [
      {
        "row": 3,
        "field": "Analysis",
        "warning": "Missing analysis/guidance for short answer"
      }
    ],
    "errors": []
  },
  "preview": {
    "questions": [
      {
        "id": "q1",
        "type": "single",
        "text": "What is AI?",
        "options": ["A", "B", "C", "D"],
        "points": 1
      }
    ]
  }
}
```

**Errors:**
- `400 INVALID_CSV` - File format invalid
- `400 MISSING_REQUIRED_FIELD` - Required column missing (Question Type, Question Text, etc.)
- `413 FILE_TOO_LARGE` - File exceeds 10MB
- `422 QUESTION_ERROR` - Specific question data invalid (row X)

---

### 3.2 Export Quiz as CSV
```
GET /classrooms/:classroomId/quizzes/:quizId/export
```

**Query Parameters:**
```
?format=csv|xlsx (default: csv)
```

**Response (200):**
File download (Content-Type: text/csv)

---

### 3.3 Export Grades as CSV (Gradebook)
```
GET /classrooms/:classroomId/gradebook
```

**Query Parameters:**
```
?format=csv|xlsx
&quizIds=quiz1,quiz2 (optional, all if not specified)
&includeAnswers=true|false (default: false)
```

**Response (200):**
File download

**CSV Format:**
```
Student Name,Email,Student ID,Quiz 1,Quiz 2,Quiz 3,Average Score
Alice Johnson,alice@example.com,STU-001,95,88,92,91.67
Bob Smith,bob@example.com,STU-002,78,81,85,81.33
```

---

## 4. QUIZ SUBMISSION & GRADING ENDPOINTS

### 4.1 Submit Quiz Answers
```
POST /classrooms/:classroomId/quiz-submissions
```

**Request:**
```json
{
  "sceneId": "scene-123",
  "quizId": "quiz-456",
  "studentId": "student-uuid",
  "answers": {
    "q1": "A",
    "q2": ["A", "C"],
    "q3": "Supervised learning uses labeled training data to teach models patterns"
  }
}
```

**Response (201):**
```json
{
  "submissionId": "submission-uuid",
  "studentId": "student-uuid",
  "quizId": "quiz-456",
  "submittedAt": "2026-08-06T14:00:00Z",
  "status": "submitted",
  "grading": {
    "status": "in_progress",
    "questionsGraded": 2,
    "totalQuestions": 3,
    "provisionalScore": 2,
    "maxScore": 3
  }
}
```

---

### 4.2 Get Submission Details
```
GET /classrooms/:classroomId/quiz-submissions/:submissionId
```

**Response (200):**
```json
{
  "id": "submission-uuid",
  "studentId": "student-uuid",
  "studentName": "Alice Johnson",
  "quizId": "quiz-456",
  "quizTitle": "AI Governance",
  "submittedAt": "2026-08-06T14:00:00Z",
  "completedAt": "2026-08-06T14:45:00Z",
  "timeSpent": 2700,
  "score": 18,
  "maxScore": 20,
  "percentage": 90,
  "status": "graded",
  "answers": [
    {
      "questionId": "q1",
      "questionText": "What is AI?",
      "questionType": "single",
      "userAnswer": "A",
      "correctAnswer": "A",
      "isCorrect": true,
      "pointsEarned": 1,
      "maxPoints": 1,
      "feedback": "Correct!"
    },
    {
      "questionId": "q2",
      "questionText": "Which are LLM uses?",
      "questionType": "multiple",
      "userAnswer": ["A", "C"],
      "correctAnswer": ["A", "C", "D"],
      "isCorrect": false,
      "pointsEarned": 0,
      "maxPoints": 2,
      "feedback": "Missing option D - Code Completion"
    },
    {
      "questionId": "q3",
      "questionText": "Explain supervised learning",
      "questionType": "short_answer",
      "userAnswer": "Supervised learning uses labeled training data...",
      "isCorrect": true,
      "pointsEarned": 10,
      "maxPoints": 10,
      "feedback": "Excellent explanation covering labeled data, model training, and validation."
    }
  ]
}
```

---

### 4.3 Get Student's Quiz Submissions
```
GET /classrooms/:classroomId/students/:studentId/submissions
```

**Query Parameters:**
```
?quizId=optional
&status=submitted|graded (default: all)
&sort=submittedAt (default: submittedAt)
&order=desc
```

**Response (200):**
```json
{
  "submissions": [
    {
      "submissionId": "sub-1",
      "quizId": "quiz-1",
      "quizTitle": "AI Governance",
      "submittedAt": "2026-08-05T14:00:00Z",
      "score": 18,
      "maxScore": 20,
      "percentage": 90,
      "status": "graded"
    },
    {
      "submissionId": "sub-2",
      "quizId": "quiz-2",
      "quizTitle": "Prompt Engineering",
      "submittedAt": "2026-08-04T10:30:00Z",
      "score": 15,
      "maxScore": 20,
      "percentage": 75,
      "status": "graded"
    }
  ],
  "stats": {
    "totalSubmissions": 3,
    "averageScore": 85.5,
    "completionRate": 0.95
  }
}
```

---

## 5. REAL-TIME PROGRESS MONITORING ENDPOINTS

### 5.1 Start Instructor Session
```
POST /classrooms/:classroomId/instructor-session
```

**Request:**
```json
{
  "quizId": "quiz-123",
  "sessionType": "live"
}
```

**Response (201):**
```json
{
  "sessionId": "session-uuid",
  "classroomId": "classroom-uuid",
  "quizId": "quiz-123",
  "sessionStart": "2026-08-06T14:00:00Z",
  "websocketUrl": "wss://your-domain.com/ws/instructor-session/session-uuid",
  "sessionToken": "token-for-websocket"
}
```

---

### 5.2 Get Live Progress
```
GET /classrooms/:classroomId/instructor-session/:sessionId/progress
```

**Response (200):**
```json
{
  "sessionId": "session-uuid",
  "activeStudents": 12,
  "totalStudents": 15,
  "quizStarted": 14,
  "quizCompleted": 4,
  "averageScore": 78.5,
  "currentQuestion": 3,
  "timeRemaining": 900,
  "studentProgress": [
    {
      "studentId": "student-1",
      "name": "Alice Johnson",
      "status": "active",
      "currentQuestion": 4,
      "questionsAnswered": 4,
      "provisionalScore": 4,
      "lastActivity": "2026-08-06T14:05:00Z"
    },
    {
      "studentId": "student-2",
      "name": "Bob Smith",
      "status": "stuck",
      "currentQuestion": 2,
      "questionsAnswered": 2,
      "provisionalScore": 1,
      "lastActivity": "2026-08-06T14:02:00Z",
      "stuckSince": 300
    },
    {
      "studentId": "student-3",
      "name": "Carol Davis",
      "status": "completed",
      "questionsAnswered": 5,
      "finalScore": 5,
      "completedAt": "2026-08-06T14:03:00Z"
    }
  ]
}
```

---

### 5.3 Lock Quiz (Instructor Control)
```
POST /classrooms/:classroomId/quiz/:quizId/lock
```

**Request:**
```json
{
  "lockType": "pause|end",
  "message": "Quiz has been paused. Wait for further instructions."
}
```

**Response (200):**
```json
{
  "quizId": "quiz-123",
  "locked": true,
  "lockType": "pause",
  "message": "Quiz has been paused...",
  "lockedAt": "2026-08-06T14:10:00Z"
}
```

**WebSocket broadcast to all students:**
```json
{
  "type": "quiz_locked",
  "lockType": "pause",
  "message": "Quiz has been paused..."
}
```

---

### 5.4 Unlock Quiz
```
POST /classrooms/:classroomId/quiz/:quizId/unlock
```

**Response (200):**
```json
{
  "quizId": "quiz-123",
  "locked": false,
  "unlockedAt": "2026-08-06T14:15:00Z"
}
```

---

## 6. ANALYTICS & REPORTING ENDPOINTS

### 6.1 Get Classroom Analytics
```
GET /classrooms/:classroomId/analytics
```

**Query Parameters:**
```
?startDate=2026-08-01&endDate=2026-08-31
&quizIds=quiz1,quiz2 (optional)
&aggregation=daily|weekly|all (default: all)
```

**Response (200):**
```json
{
  "classroomId": "classroom-uuid",
  "period": {
    "startDate": "2026-08-01",
    "endDate": "2026-08-31"
  },
  "summary": {
    "totalSubmissions": 150,
    "uniqueStudents": 45,
    "averageScore": 82.3,
    "scoreMedian": 84,
    "standardDeviation": 12.5,
    "passRate": 0.88
  },
  "scoreDistribution": {
    "0-25": 2,
    "26-50": 5,
    "51-75": 18,
    "76-100": 125
  },
  "quizMetrics": [
    {
      "quizId": "quiz-1",
      "title": "AI Governance",
      "submissions": 45,
      "averageScore": 85.5,
      "averageTimeSpent": 1200,
      "completionRate": 0.95
    }
  ],
  "questionDifficulty": [
    {
      "questionId": "q1",
      "questionText": "What is AI?",
      "correctPercentage": 0.98,
      "averageTimeSpent": 30,
      "difficulty": "easy"
    },
    {
      "questionId": "q5",
      "questionText": "Explain EU AI Act impacts...",
      "correctPercentage": 0.52,
      "averageTimeSpent": 180,
      "difficulty": "hard"
    }
  ],
  "studentMastery": [
    {
      "studentName": "Alice",
      "submissionCount": 3,
      "averageScore": 91.67,
      "trend": "improving"
    }
  ]
}
```

---

### 6.2 Get Student Report
```
GET /classrooms/:classroomId/students/:studentId/report
```

**Response (200):**
```json
{
  "studentId": "student-uuid",
  "studentName": "Alice Johnson",
  "email": "alice@example.com",
  "enrollmentDate": "2026-08-01T10:00:00Z",
  "status": "active",
  "reportGeneratedAt": "2026-08-06T15:00:00Z",
  "summary": {
    "quizzesTaken": 3,
    "quizzesCompleted": 3,
    "completionRate": 1.0,
    "averageScore": 91.67,
    "highestScore": 95,
    "lowestScore": 88,
    "totalTimeSpent": 7200,
    "lastActivityAt": "2026-08-05T14:30:00Z"
  },
  "quizzes": [
    {
      "quizId": "quiz-1",
      "title": "AI Governance",
      "submittedAt": "2026-08-05T14:00:00Z",
      "completedAt": "2026-08-05T14:45:00Z",
      "score": 18,
      "maxScore": 20,
      "percentage": 90,
      "timeSpent": 2700,
      "questionAnalysis": [
        {
          "questionId": "q1",
          "questionText": "What is AI?",
          "userAnswer": "A",
          "isCorrect": true,
          "pointsEarned": 1,
          "timeSpent": 30
        }
      ]
    }
  ],
  "strengths": ["Multiple choice", "Conceptual questions"],
  "improvements": ["Long-form answers", "Time management"],
  "recommendations": [
    "Practice explaining concepts in your own words",
    "Review EU AI Act regulations"
  ]
}
```

---

### 6.3 Export Student Report as PDF
```
GET /classrooms/:classroomId/students/:studentId/report/pdf
```

**Response (200):**
File download (Content-Type: application/pdf)

---

## 7. WEBSOCKET EVENTS (Real-time)

### Connection
```
wss://your-domain.com/ws/instructor-session/:sessionToken
```

### Messages from Server (to Instructor)

#### Quiz Started
```json
{
  "type": "quiz_started",
  "studentId": "student-1",
  "studentName": "Alice Johnson",
  "timestamp": "2026-08-06T14:00:01Z"
}
```

#### Question Answered
```json
{
  "type": "question_answered",
  "studentId": "student-1",
  "studentName": "Alice Johnson",
  "questionId": "q2",
  "questionNumber": 2,
  "isCorrect": true,
  "timeSpent": 45,
  "timestamp": "2026-08-06T14:01:30Z"
}
```

#### Quiz Submitted
```json
{
  "type": "quiz_submitted",
  "studentId": "student-1",
  "studentName": "Alice Johnson",
  "score": 18,
  "maxScore": 20,
  "percentage": 90,
  "timeSpent": 2700,
  "timestamp": "2026-08-06T14:02:00Z"
}
```

#### Progress Update (every 5 seconds)
```json
{
  "type": "progress_update",
  "timestamp": "2026-08-06T14:05:00Z",
  "activeCount": 10,
  "completedCount": 2,
  "averageScore": 78.5
}
```

#### Student Status Change
```json
{
  "type": "student_status_changed",
  "studentId": "student-2",
  "studentName": "Bob Smith",
  "status": "stuck",
  "lastActivityAt": "2026-08-06T14:02:00Z",
  "stuckSince": 300,
  "timestamp": "2026-08-06T14:08:00Z"
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific field that caused error",
      "value": "the value that was invalid"
    }
  }
}
```

### Common Error Codes
- `400 INVALID_REQUEST` - Malformed request
- `400 INVALID_EMAIL` - Email format invalid
- `400 MISSING_REQUIRED_FIELD` - Required field missing
- `401 UNAUTHORIZED` - Invalid/missing authentication
- `403 FORBIDDEN` - User lacks permission
- `404 NOT_FOUND` - Resource not found
- `409 CONFLICT` - Resource already exists
- `413 FILE_TOO_LARGE` - File exceeds size limit
- `422 VALIDATION_ERROR` - Data validation failed
- `429 RATE_LIMITED` - Too many requests
- `500 INTERNAL_ERROR` - Server error

---

## Rate Limiting

- **Standard endpoints:** 1000 requests/hour per user
- **Bulk import:** 10 requests/hour per classroom
- **WebSocket:** No rate limit (connection-based)

---

## Pagination

For list endpoints (rosters, submissions, etc.):
- Default `limit`: 50
- Maximum `limit`: 500
- Default `page`: 1

Query: `?page=2&limit=100`

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 100,
    "total": 1000,
    "totalPages": 10
  }
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-08-06 | Initial specification |

