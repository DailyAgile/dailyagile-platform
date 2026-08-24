/**
 * TypeScript Types for Phase 2 ILT Feature
 * Core data models and database schemas
 */

// ============================================================================
// CORE MODELS
// ============================================================================

export interface Classroom {
  id: string;
  stage_id: string;
  title: string;
  description: string | null;
  instructor_id: string;
  access_code: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ClassroomWithStats extends Classroom {
  student_count: number;
  quiz_count: number;
  average_score?: number;
}

export interface Student {
  id: string;
  email: string;
  name: string;
  student_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type StudentRole = 'student' | 'teaching_assistant';
export type EnrollmentStatus = 'active' | 'dropped' | 'unenrolled';

export interface StudentRoster {
  id: string;
  classroom_id: string;
  student_id: string;
  role: StudentRole;
  enrollment_date: string;
  status: EnrollmentStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface StudentRosterWithDetails extends StudentRoster {
  student: Student;
  quiz_count?: number;
  average_score?: number;
  last_active?: string;
}

export type QuizSubmissionStatus = 'in_progress' | 'submitted' | 'graded';

export interface QuizSubmission {
  id: string;
  classroom_id: string;
  student_id: string;
  scene_id: string;
  quiz_id: string;
  submitted_at: string | null;
  completed_at: string | null;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  status: QuizSubmissionStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface QuizSubmissionWithStudent extends QuizSubmission {
  student: Student;
}

export type QuestionType = 'single' | 'multiple' | 'short_answer';

export interface QuizAnswer {
  id: string;
  submission_id: string;
  question_id: string;
  question_text: string | null;
  user_answer: string | null;
  correct_answer: string | null;
  is_correct: boolean | null;
  points_earned: number | null;
  max_points: number | null;
  feedback: string | null;
  question_type: QuestionType;
  ai_score?: number | null;
  ai_feedback?: string | null;
  instructor_score?: number | null;
  instructor_feedback?: string | null;
  graded_by?: string | null;
  reviewed_at?: string | null;
  is_instructor_graded?: boolean;
  created_at: string;
}

export interface InstructorSession {
  id: string;
  classroom_id: string;
  instructor_id: string;
  session_start: string;
  session_end: string | null;
  session_type: 'live' | 'async';
  quiz_being_monitored: string | null;
  student_visibility: boolean;
  is_quiz_locked: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  classroom_id: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface AddStudentRequest {
  email: string;
  name: string;
  student_id?: string;
}

export interface AddStudentResponse {
  student: Student;
  roster: StudentRoster;
  invitation_sent: boolean;
}

export interface BulkImportStudentsRequest {
  file: File;
  send_invitations?: boolean;
}

export interface BulkImportResult {
  imported: number;
  failed: number;
  duplicates: number;
  errors: Array<{
    row: number;
    email?: string;
    error: string;
  }>;
  invitations_sent: number;
  timestamp: string;
}

export interface RosterListQuery {
  status?: EnrollmentStatus | 'all';
  sort?: 'name' | 'enrollment_date' | 'status';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string;
}

export interface RosterListResponse {
  students: StudentRosterWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface QuizSubmissionRequest {
  scene_id: string;
  quiz_id: string;
  answers: Record<string, string | string[]>;
}

export interface QuizSubmissionResponse {
  submission_id: string;
  student_id: string;
  status: QuizSubmissionStatus;
  grading: {
    status: 'in_progress' | 'complete';
    questions_graded: number;
    total_questions: number;
    provisional_score: number;
    max_score: number;
  };
}

export interface GradebookExportResponse {
  filename: string;
  content_type: 'text/csv' | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  data: string | Buffer;
}

export interface StudentReportResponse {
  student_id: string;
  student_name: string;
  email: string;
  enrollment_date: string;
  status: EnrollmentStatus;
  summary: {
    quizzes_taken: number;
    quizzes_completed: number;
    completion_rate: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    total_time_spent: number;
    last_activity: string | null;
  };
  quizzes: Array<{
    quiz_id: string;
    title: string;
    submitted_at: string | null;
    completed_at: string | null;
    score: number | null;
    max_score: number | null;
    percentage: number | null;
    time_spent: number | null;
  }>;
  strengths: string[];
  improvements: string[];
}

export interface LiveProgressResponse {
  session_id: string;
  active_students: number;
  total_students: number;
  quiz_started: number;
  quiz_completed: number;
  average_score: number | null;
  current_question: number | null;
  time_remaining: number | null;
  student_progress: Array<{
    student_id: string;
    name: string;
    status: 'active' | 'stuck' | 'completed' | 'paused' | 'idle';
    current_question: number;
    questions_answered: number;
    provisional_score: number;
    last_activity: string;
    stuck_since?: number;
  }>;
}

// ============================================================================
// UI COMPONENT PROPS
// ============================================================================

export interface StudentRosterTableProps {
  classroom_id: string;
  students: StudentRosterWithDetails[];
  is_loading: boolean;
  on_remove?: (student_id: string) => void;
  on_resend_invite?: (student_id: string) => void;
}

export interface QuizResultsProps {
  submission: QuizSubmission;
  answers: QuizAnswer[];
  class_average?: number;
}

export interface GradebookTableProps {
  classroom_id: string;
  students: StudentRosterWithDetails[];
  quizzes: Array<{ id: string; title: string }>;
}

export interface LiveDashboardProps {
  session_id: string;
  classroom_id: string;
  quiz_id: string;
  instructor_id: string;
}

// ============================================================================
// PAGINATION
// ============================================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface APIError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface ValidationError extends APIError {
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: {
      field: string;
      value: unknown;
      reason: string;
    };
  };
}
