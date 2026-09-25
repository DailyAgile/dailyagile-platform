/**
 * Quiz Navigation Types
 * TypeScript interfaces for the quiz navigation page
 */

export type UserType = 'instructor' | 'student' | 'public';

export interface Quiz {
  id: string;
  code: string; // 8-digit quiz code
  title: string;
  description?: string;
  questionCount: number;
  createdBy: string;
  isPublished: boolean;
  status: 'published' | 'draft';
  createdAt: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedTime?: number; // in minutes
  analytics?: {
    enrollmentCount: number;
    avgScore: number;
    completionRate: number;
  };
  courseId?: string; // for student dashboards
  courseName?: string; // for student dashboards
}

export interface User {
  id: string;
  email: string;
  role: 'instructor' | 'student' | 'admin';
  name?: string;
  firstName?: string;
  lastName?: string;
  purchasedQuizzes?: string[]; // Quiz IDs
  purchasedCourses?: string[]; // Course IDs
  isAuthenticated: boolean;
}

export interface StudentProgress {
  quizId: string;
  completionPercent: number;
  currentScore?: number;
  bestScore?: number;
  lastAttemptDate?: string;
  status: 'not-started' | 'in-progress' | 'completed';
}

export interface InstructorCodeState {
  code: string | null;
  isValid: boolean;
  instructorName?: string;
  quizzes?: Quiz[];
}

export interface UserDetectionResult {
  userType: UserType;
  user: User | null;
  error?: string;
}
