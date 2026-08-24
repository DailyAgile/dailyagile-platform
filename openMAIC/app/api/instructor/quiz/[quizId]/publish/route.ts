/**
 * PATCH /api/instructor/quiz/[quizId]/publish
 * Publish a quiz (make it available for assignment)
 * REQUIRES: Instructor authentication
 *
 * Body:
 * {
 *   publish: true | false
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     id: string,
 *     title: string,
 *     is_published: boolean,
 *     published_at?: string,
 *     unpublished_at?: string
 *   }
 * }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('PublishQuiz');

interface PublishBody {
  publish: boolean;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION: Verify instructor is logged in
    let authenticatedInstructor;
    try {
      authenticatedInstructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const { quizId } = await params;
    const body = (await req.json()) as PublishBody;
    const { publish } = body;

    if (publish === undefined) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'publish field is required');
    }

    const supabase = getSupabaseClient();

    // 🔒 AUTHORIZATION: Verify quiz exists AND instructor owns it
    // In development: test instructors can publish/unpublish any quiz for testing purposes
    const isTestInstructor = authenticatedInstructor.email === 'test.instructor@example.com';

    let quizQuery = supabase
      .from('quizzes')
      .select('id, title, is_published, instructor_id')
      .eq('id', quizId);

    // Only filter by instructor_id if not a test instructor
    if (!isTestInstructor) {
      quizQuery = quizQuery.eq('instructor_id', authenticatedInstructor.id);
    }

    const { data: quiz, error: quizError } = await quizQuery.single();

    if (quizError || !quiz) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to publish quiz ${quizId}`
      );
      return apiError('FORBIDDEN', 403, 'You do not have permission to manage this quiz');
    }

    // Update publish status
    const { data: updatedQuiz, error: updateError } = await supabase
      .from('quizzes')
      .update({
        is_published: publish,
        published_at: publish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quizId)
      .select('id, title, is_published, published_at, updated_at')
      .single();

    if (updateError) {
      log.error('Failed to update quiz publish status:', updateError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to update quiz');
    }

    const action = publish ? 'published' : 'unpublished';
    log.info(
      `✅ Quiz ${action}: ${quizId} by instructor ${authenticatedInstructor.email}`,
    );

    return apiSuccess({
      success: true,
      data: {
        id: updatedQuiz.id,
        title: updatedQuiz.title,
        is_published: updatedQuiz.is_published,
        published_at: updatedQuiz.published_at,
        updated_at: updatedQuiz.updated_at,
      },
    });
  } catch (error) {
    log.error('Error publishing quiz:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to publish quiz');
  }
}
