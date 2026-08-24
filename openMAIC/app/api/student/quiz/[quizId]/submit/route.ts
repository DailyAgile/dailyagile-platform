/**
 * POST /api/student/quiz/[quizId]/submit
 *
 * Submit quiz for grading. Grades all answers, awards badges, updates streaks.
 * Returns: { attemptId, quizId, score_percentage, passed, results, badges_earned, recommendations }
 * Input validated: Zod schema (prevents large payloads, XSS)
 *
 * Atomic: grade + badge award + streak update = single transaction
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { requireAuth } from '@/lib/student/auth-utils';
import { gradeSubmission, recordStatusChange } from '@/lib/student/grading';
import { quizSubmitSchema } from '@/lib/server/validation-schemas';
import { requireStudentConsent } from '@/lib/server/consent-verification';
import type { SubmitQuizResponse } from '@/lib/student/types';

const log = createLogger('API:SubmitQuiz');

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth) {
      return apiError('UNAUTHORIZED', 401, 'Not authenticated');
    }

    const { studentId } = auth;

    // 🔒 GDPR: Verify student has given privacy consent
    try {
      await requireStudentConsent(studentId, 'privacy');
    } catch (consentError: any) {
      if (consentError.code === 'CONSENT_REQUIRED') {
        log.warn(`Consent required for student ${studentId}`);
        return apiError(
          'CONSENT_REQUIRED',
          403,
          'You must accept our Privacy Policy to submit a quiz. Please review and accept our terms before proceeding.'
        );
      }
      throw consentError;
    }

    const { quizId } = await params;

    if (!quizId) {
      return apiError('MISSING_PARAM', 400, 'quizId is required');
    }

    const body = await req.json();

    // Validate request body with Zod (prevents large payloads, XSS)
    const validation = quizSubmitSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.flatten();
      log.warn('Quiz submission validation error:', errors.fieldErrors);
      return apiError(
        'VALIDATION_ERROR',
        400,
        'Invalid submission',
        JSON.stringify(errors.fieldErrors)
      );
    }

    const { attemptId, submittedAt } = validation.data;

    const supabase = getSupabaseClient();

    // Verify submission exists and is in progress
    const { data: submission, error: submissionError } = await supabase
      .from('quiz_submissions')
      .select('*')
      .eq('id', attemptId)
      .eq('student_id', studentId)
      .eq('quiz_id', quizId)
      .single();

    if (submissionError || !submission) {
      return apiError('NOT_FOUND', 404, 'Quiz attempt not found');
    }

    if (submission.status !== 'in_progress') {
      return apiError(
        'CONFLICT',
        409,
        'Quiz already submitted or graded'
      );
    }

    // Record submission time
    const now = new Date();
    const startedAt = new Date(submission.created_at);
    const timeSpentSeconds = Math.round(
      (now.getTime() - startedAt.getTime()) / 1000
    );

    // Update submission status to submitted
    const { error: updateError } = await supabase
      .from('quiz_submissions')
      .update({
        status: 'submitted',
        submitted_at: submittedAt || now.toISOString(),
        time_spent_seconds: timeSpentSeconds,
        updated_at: now.toISOString(),
      })
      .eq('id', attemptId);

    if (updateError) {
      log.error('Error updating submission:', updateError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to submit quiz');
    }

    // Record status change
    await recordStatusChange(
      attemptId,
      'in_progress',
      'submitted',
      'Student clicked submit',
      supabase
    );

    // Grade submission (atomic: grade + badges + streak)
    let gradingResult;
    try {
      gradingResult = await gradeSubmission(
        attemptId,
        studentId,
        quizId,
        supabase
      );
    } catch (gradingError) {
      log.error('Grading error:', gradingError);
      // Mark as graded but with error
      await supabase
        .from('quiz_submissions')
        .update({
          status: 'graded',
          percentage: 0,
          graded_at: now.toISOString(),
        })
        .eq('id', attemptId);

      return apiError(
        'INTERNAL_ERROR',
        500,
        'Failed to grade quiz. Please try again.'
      );
    }

    // Fetch detailed results
    const { data: answers } = await supabase
      .from('quiz_answers')
      .select('*')
      .eq('submission_id', attemptId);

    const results = (answers || []).map((a: any) => ({
      questionId: a.question_id,
      studentAnswer: a.student_answer,
      correctAnswer: a.correct_answer,
      isCorrect: a.is_correct,
      pointsEarned: a.points_earned || 0,
      maxPoints: a.max_points,
      feedback: a.feedback || '',
    }));

    const response: SubmitQuizResponse = {
      attemptId,
      quizId,
      score_percentage: gradingResult.scorePercentage,
      passed: gradingResult.passed,
      results,
      badges_earned: gradingResult.badgesAwarded,
      recommendations: gradingResult.recommendations.map((r: any) => ({
        quizId: r.quizId,
        title: 'Next Quiz', // Would fetch from database
        reason: r.reason,
        daysUntilRetry: r.daysUntilRetry,
      })),
    };

    log.info(
      `Student ${studentId} submitted quiz ${quizId}: ${gradingResult.scorePercentage}%`
    );

    return apiSuccess(response);
  } catch (error) {
    log.error('Submit quiz error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to submit quiz');
  }
}
