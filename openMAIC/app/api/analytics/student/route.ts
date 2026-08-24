/**
 * GET /api/analytics/student
 * Get authenticated student's analytics
 */

import { NextRequest } from 'next/server';
import { getStudentAnalytics } from '@/lib/analytics/analytics-service';
import { requireStudent, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentAnalyticsAPI');

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const student = await requireStudent(req);

    const analytics = await getStudentAnalytics(student.id);

    if (!analytics) {
      return apiSuccess({
        success: true,
        data: {
          totalQuizzesTaken: 0,
          completedQuizzes: 0,
          averageScore: 0,
          totalTimeSpent: 0,
          lastActivityDate: '',
        },
      });
    }

    return apiSuccess({
      success: true,
      data: analytics,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('auth')) {
      const { status, message } = handleAuthError(error);
      return apiError('UNAUTHORIZED', status, message);
    }
    log.error('Error getting student analytics:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to fetch analytics');
  }
}
