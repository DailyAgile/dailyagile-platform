/**
 * GET /api/student/quizzes/[quizId]/access
 *
 * Check if student has access to take a quiz.
 * Returns: { hasAccess, accessType, expiresAt, canRetry, maxRetries }
 */

import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { requireAuth } from '@/lib/student/auth-utils';
import { checkQuizAccess } from '@/lib/student/access-control';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import type { QuizAccessResponse } from '@/lib/student/types';

const log = createLogger('API:QuizAccess');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth) {
      return apiError('UNAUTHORIZED', 401, 'Not authenticated');
    }

    const { studentId } = auth;
    const { quizId } = await params;

    if (!quizId) {
      return apiError('MISSING_PARAM', 400, 'quizId is required');
    }

    // Check if quiz exists
    const supabase = getSupabaseClient();
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return apiError('QUIZ_NOT_FOUND', 404, 'Quiz not found');
    }

    // Check access
    const access = await checkQuizAccess(studentId, quizId, supabase);

    const response: QuizAccessResponse = {
      hasAccess: access.hasAccess,
      accessType: access.accessType,
      expiresAt: access.expiresAt,
      canRetry: access.canRetry,
      maxRetries: access.maxRetries,
    };

    return apiSuccess(response);
  } catch (error) {
    log.error('Quiz access check error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to check quiz access');
  }
}
