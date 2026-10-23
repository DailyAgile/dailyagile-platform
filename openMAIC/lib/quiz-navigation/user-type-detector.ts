/**
 * User Type Detection Utility
 * Detects whether user is instructor, student, or public
 * Used by quiz navigation page to route to correct dashboard
 */

import { Quiz, UserDetectionResult } from './types';
import { createLogger } from '@/lib/logger';

const log = createLogger('UserTypeDetector');

/**
 * Get instructor code from localStorage
 * Persists across page refreshes for returning users
 */
export function getInstructorCodeFromStorage(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('instructorCode') || null;
  } catch (error) {
    log.warn('Failed to read instructor code from storage:', error);
    return null;
  }
}

/**
 * Save instructor code to localStorage
 * Called when user enters a valid 8-digit code
 */
export function saveInstructorCodeToStorage(code: string): void {
  try {
    if (typeof window === 'undefined') return;
    if (/^\d{8}$/.test(code)) {
      localStorage.setItem('instructorCode', code);
      log.info(`Instructor code saved: ${code}`);
    } else {
      log.warn('Invalid code format, not saving to storage');
    }
  } catch (error) {
    log.warn('Failed to save instructor code to storage:', error);
  }
}

/**
 * Clear instructor code from localStorage
 * Called when user clicks "Clear" or "Change Code"
 */
export function clearInstructorCodeFromStorage(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('instructorCode');
    log.info('Instructor code cleared');
  } catch (error) {
    log.warn('Failed to clear instructor code from storage:', error);
  }
}

/**
 * Validate 8-digit instructor code format
 * Returns true if code is exactly 8 digits
 */
export function validateInstructorCode(code: string | null | undefined): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }
  return /^\d{8}$/.test(code);
}

/**
 * Detect user type based on:
 * 1. Authentication status
 * 2. User role (from Supabase or metadata)
 * 3. Purchase history (for students)
 * 4. Instructor code presence (for public users)
 *
 * Must be called from a client component or client-side code
 * Returns: 'instructor' | 'student' | 'public'
 */
export async function detectUserType(): Promise<UserDetectionResult> {
  try {
    // First check: Is user authenticated?
    const response = await fetch('/api/user/me');

    if (!response.ok || response.status === 401) {
      // User is not authenticated - public user (401 is expected and handled)
      log.info('User is not authenticated - defaulting to public');
      return {
        userType: 'public',
        user: null,
      };
    }

    const userData = await response.json();

    if (!userData || !userData.data) {
      log.warn('Invalid user data response');
      return {
        userType: 'public',
        user: null,
      };
    }

    const user = userData.data;

    // Second check: User role
    if (user.role === 'instructor' || user.role === 'admin') {
      log.info(`User is instructor: ${user.email}`);
      return {
        userType: 'instructor',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          firstName: user.firstName,
          lastName: user.lastName,
          isAuthenticated: true,
        },
      };
    }

    // Third check: Student with purchases
    if (user.role === 'student') {
      const hasPurchases =
        (user.purchasedQuizzes && user.purchasedQuizzes.length > 0) ||
        (user.purchasedCourses && user.purchasedCourses.length > 0);

      if (hasPurchases) {
        log.info(`User is student with purchases: ${user.email}`);
        return {
          userType: 'student',
          user: {
            id: user.id,
            email: user.email,
            role: 'student',
            name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            firstName: user.firstName,
            lastName: user.lastName,
            purchasedQuizzes: user.purchasedQuizzes || [],
            purchasedCourses: user.purchasedCourses || [],
            isAuthenticated: true,
          },
        };
      }

      // Student with no purchases - treat as public
      log.info(`User is student but has no purchases, treating as public: ${user.email}`);
      return {
        userType: 'public',
        user: null,
      };
    }

    // Fallback: Unknown role or type - default to public
    log.warn(`Unknown user role: ${user.role}, defaulting to public`);
    return {
      userType: 'public',
      user: null,
    };
  } catch (error) {
    log.error('Error detecting user type:', error);
    // On error, default to public to avoid blocking access
    return {
      userType: 'public',
      user: null,
      error: error instanceof Error ? error.message : 'Failed to detect user type',
    };
  }
}

/**
 * Get quizzes for instructor
 * Fetches all quizzes created by the authenticated instructor
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getInstructorQuizzes(): Promise<any[]> {
  try {
    const response = await fetch('/api/instructor/quiz/list');

    if (!response.ok) {
      throw new Error('Failed to fetch instructor quizzes');
    }

    const data = await response.json();
    return data.data?.quizzes || [];
  } catch (error) {
    log.error('Error fetching instructor quizzes:', error);
    return [];
  }
}

/**
 * Get quizzes for student
 * Fetches all quizzes from courses purchased by the authenticated student
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getStudentQuizzes(): Promise<any[]> {
  try {
    const response = await fetch('/api/student/quizzes');

    if (!response.ok) {
      throw new Error('Failed to fetch student quizzes');
    }

    const data = await response.json();
    return data.data?.quizzes || [];
  } catch (error) {
    log.error('Error fetching student quizzes:', error);
    return [];
  }
}

/**
 * Get public quizzes
 * Fetches all quizzes marked as public (no authentication required)
 */
export async function getPublicQuizzes(): Promise<Quiz[]> {
  try {
    const response = await fetch('/api/student/quizzes/public');

    if (!response.ok) {
      throw new Error('Failed to fetch public quizzes');
    }

    const data = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = data.quizzes || data.data?.quizzes || [];
    return rows.map((q) => ({
      id: q.id,
      code: q.quiz_code,
      title: q.title,
      description: q.description,
      questionCount: q.total_questions || 0,
      createdBy: q.created_by || 'DailyAgile',
      isPublished: true,
      status: 'published',
      createdAt: q.created_at || '',
      difficulty: q.difficulty_level || undefined,
    }));
  } catch (error) {
    log.error('Error fetching public quizzes:', error);
    return [];
  }
}

/**
 * Get quizzes by instructor code
 * Called when public user enters an 8-digit instructor code
 */
export async function getQuizzesByInstructorCode(code: string): Promise<{
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quizzes?: any[];
  instructorName?: string;
  error?: string;
}> {
  try {
    if (!validateInstructorCode(code)) {
      return {
        success: false,
        error: 'Invalid code format. Please enter an 8-digit code.',
      };
    }

    const response = await fetch(`/api/quizzes/by-code/${code}`);

    if (response.status === 404) {
      return {
        success: false,
        error: 'No quizzes found for this code. Please check and try again.',
      };
    }

    if (!response.ok) {
      throw new Error('Failed to fetch quizzes by code');
    }

    const data = await response.json();
    return {
      success: true,
      quizzes: data.data?.quizzes || [],
      instructorName: data.data?.instructorName,
    };
  } catch (error) {
    log.error('Error fetching quizzes by code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load quizzes',
    };
  }
}
