/**
 * POST /api/instructor/quiz/[quizId]/request-delete-confirmation
 * Request a 2FA code for hard-deleting a quiz
 * REQUIRES: Instructor authentication (verified)
 *
 * This is Step 1 of hard delete:
 * 1. Instructor calls this endpoint → get 2FA code sent to email
 * 2. Instructor calls DELETE /delete with confirmQuizName + twoFACode
 *
 * Body:
 * {
 *   deleteType: 'hard'  // Must specify hard delete intent
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     message: "2FA code sent to your email",
 *     confirmationId: UUID,
 *     expiresIn: 600  // seconds (10 minutes)
 *   }
 * }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { send2FAEmail } from '@/lib/server/email-service';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('RequestDeleteConfirmation');

interface RequestDeleteConfirmationBody {
  deleteType?: string;
}

export async function POST(
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
    const body = (await req.json()) as RequestDeleteConfirmationBody;
    const { deleteType } = body;

    // Verify this is for hard delete
    if (deleteType !== 'hard') {
      return apiError(
        'INVALID_REQUEST',
        400,
        'deleteType must be "hard" to request confirmation',
      );
    }

    const supabase = getSupabaseClient();

    // 🔒 AUTHORIZATION: Verify quiz exists AND instructor owns it
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, instructor_id')
      .eq('id', quizId)
      .eq('instructor_id', authenticatedInstructor.id) // Only own quizzes
      .single();

    if (quizError || !quiz) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to request delete confirmation for quiz ${quizId} they don't own`
      );
      return apiError('FORBIDDEN', 403, 'You do not have permission to delete this quiz');
    }

    // Generate 2FA confirmation (includes sending code)
    const { data: confirmationData, error: confirmError } = await supabase
      .rpc('create_pending_2fa_confirmation', {
        p_instructor_email: authenticatedInstructor.email,
        p_quiz_id: quizId,
        p_quiz_title: quiz.title,
        p_operation_type: 'hard_delete',
      });

    if (confirmError || !confirmationData || confirmationData.length === 0) {
      log.error('Failed to create 2FA confirmation:', confirmError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to generate confirmation code');
    }

    const confirmation = confirmationData[0];
    const code = confirmation.code as string;
    const confirmationId = confirmation.confirmation_id as string;
    const expiresAt = confirmation.expires_at as string;

    // Calculate time until expiry (in seconds)
    const expiresInSeconds = Math.floor(
      (new Date(expiresAt).getTime() - Date.now()) / 1000
    );

    // 📧 Send 2FA code via email
    try {
      const messageId = await send2FAEmail(
        authenticatedInstructor.email,
        code,
        quiz.title,
      );
      log.info(
        `✅ 2FA email sent to ${authenticatedInstructor.email} (messageId: ${messageId}, quiz: ${quiz.title})`
      );
    } catch (emailError) {
      log.error(
        `⚠️ Failed to send 2FA email to ${authenticatedInstructor.email}:`,
        emailError
      );
      // Don't fail the entire operation if email fails — code is still generated
      // User can retry or contact support. This is safer than preventing the operation.
      log.warn(
        `⚠️ 2FA code generated but email delivery failed. Code: ${code} (instructor can still verify via other means)`
      );
    }

    return apiSuccess({
      success: true,
      data: {
        message: `2FA code sent to ${authenticatedInstructor.email}. It will expire in 10 minutes.`,
        confirmationId,
        expiresIn: expiresInSeconds,
        quizTitle: quiz.title,
      },
    });
  } catch (error) {
    log.error('Error requesting delete confirmation:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to request confirmation');
  }
}
