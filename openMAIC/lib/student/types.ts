/**
 * TypeScript Types for Student Dashboard API
 */

// ============================================================================
// Dashboard Endpoint Types
// ============================================================================

export interface DashboardQuiz {
  quizId: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'intermediate' | 'hard';
  duration_minutes: number;
  pass_rate: number;
  student_best_score: number | null;
  industry: string;
  access_type: 'free_trial' | 'purchased' | 'organization';
}

export interface DashboardResponse {
  myQuizzes: DashboardQuiz[];
  progress: {
    totalQuizzes: number;
    completed: number;
    completionPercentage: number;
  };
  badges: Array<{
    id: string;
    name: string;
    icon: string;
    earnedAt: string;
  }>;
  currentStreak: number;
  totalPoints: number;
  nextRecommendation: {
    quizId: string;
    title: string;
    reason: 'spaced_repetition' | 'weak_area';
    daysUntilRetry: number;
  } | null;
}

// ============================================================================
// Quiz Discovery Types
// ============================================================================

export interface QuizListResponse {
  quizzes: Array<{
    quiz_id: string;
    title: string;
    description: string;
    difficulty: string;
    duration_minutes: number;
    pass_rate: number;
    student_best_score: number | null;
    industry: string;
    access_type: string;
  }>;
  total: number;
  pages: number;
}

// ============================================================================
// Quiz Access Types
// ============================================================================

export interface QuizAccessResponse {
  hasAccess: boolean;
  accessType: 'free_trial' | 'purchased' | 'organization' | null;
  expiresAt: string | null;
  canRetry: boolean;
  maxRetries: number | null;
}

// ============================================================================
// Quiz Attempt Types
// ============================================================================

export interface StartAttemptRequest {
  // Empty body, auth required
}

export interface StartAttemptResponse {
  attemptId: string;
  quizId: string;
  startedAt: string;
}

// ============================================================================
// Answer Submission Types
// ============================================================================

export interface SubmitAnswerRequest {
  attemptId: string;
  questionId: string;
  studentAnswer: string;
}

export interface SubmitAnswerResponse {
  questionId: string;
  saved: boolean;
}

// ============================================================================
// Quiz Submission Types
// ============================================================================

export interface SubmitQuizRequest {
  attemptId: string;
  submittedAt: string;
}

export interface SubmitQuizResponse {
  attemptId: string;
  quizId: string;
  score_percentage: number;
  passed: boolean;
  results: Array<{
    questionId: string;
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    pointsEarned: number;
    maxPoints: number;
    feedback: string;
  }>;
  badges_earned: string[];
  recommendations: Array<{
    quizId: string;
    title: string;
    reason: string;
    daysUntilRetry: number;
  }>;
}

// ============================================================================
// Quiz Results Types
// ============================================================================

export interface QuizResultsResponse {
  attemptId: string;
  quizId: string;
  score: number;
  passed: boolean;
  timeSpent: number;
  answers: Array<{
    questionId: string;
    questionText: string;
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    pointsEarned: number;
    maxPoints: number;
    difficulty: string;
    feedback: string;
  }>;
  detailedFeedback: Array<{
    questionId: string;
    explanation: string;
    relatedTopics: string[];
  }>;
}

// ============================================================================
// Recommendations Types
// ============================================================================

export interface RecommendationsResponse {
  recommendations: Array<{
    quizId: string;
    quizTitle: string;
    reason: 'spaced_repetition' | 'weak_area';
    nextRetryDate: string;
    daysUntilRetry: number;
  }>;
}

// ============================================================================
// Profile Types
// ============================================================================

export interface ProfileUpdateRequest {
  timezone?: string;
  preferred_language?: string;
  preferred_currency?: string;
  accessibility_settings?: {
    read_aloud?: boolean;
    font_size?: 'small' | 'medium' | 'large';
    high_contrast?: boolean;
    reduced_motion?: boolean;
    extra_time_pct?: number;
  };
}

export interface ProfileUpdateResponse {
  updated: boolean;
  profile: {
    id: string;
    email: string;
    timezone: string;
    preferred_language: string;
    preferred_currency: string;
    accessibility_settings: any;
  };
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface AnalyticsResponse {
  totalQuizzesTaken: number;
  avgScore: number;
  bestScore: number;
  worstScore: number;
  improvementTrend: number; // % improvement
  streakDaysActive: number;
  totalBadges: number;
  pointsThisMonth: number;
  pointsLastMonth: number;
}

// ============================================================================
// Leaderboard Types
// ============================================================================

export interface LeaderboardResponse {
  leaderboard: Array<{
    rank: number;
    studentName: string;
    score: number;
    badges: number;
    region?: string;
  }>;
  yourRank: number;
}

// ============================================================================
// Data Export Types
// ============================================================================

export interface DataExportRequest {
  format: 'json' | 'csv';
}

export interface DataExportResponse {
  downloadUrl: string;
  expiresAt: string;
  format: 'json' | 'csv';
  sizeBytes?: number;
}

// ============================================================================
// Error Response Types
// ============================================================================

export interface ApiError {
  success: false;
  errorCode: string;
  error: string;
  details?: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}
