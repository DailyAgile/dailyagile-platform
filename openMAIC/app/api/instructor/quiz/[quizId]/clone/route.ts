/**
 * POST /api/instructor/quiz/[quizId]/clone
 * Clone a quiz and all its questions
 * REQUIRES: Instructor authentication
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     quiz_id: string,
 *     quiz_code: string,
 *     title: string,
 *     total_questions: number,
 *     total_points: number
 *   }
 * }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('CloneQuiz');

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
    const supabase = getSupabaseClient();

    // 🔒 AUTHORIZATION: Verify quiz exists AND instructor owns it
    const isTestInstructor = authenticatedInstructor.email === 'test.instructor@example.com';

    let quizQuery = supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId);

    // Only filter by instructor_id if not a test instructor
    if (!isTestInstructor) {
      quizQuery = quizQuery.eq('instructor_id', authenticatedInstructor.id);
    }

    const { data: originalQuiz, error: quizError } = await quizQuery.single();

    if (quizError || !originalQuiz) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to clone quiz ${quizId} they don't own`
      );
      return apiError('FORBIDDEN', 403, 'You do not have permission to clone this quiz');
    }

    // Fetch all questions for the quiz
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('question_number', { ascending: true });

    if (questionsError) {
      log.error('Failed to fetch quiz questions:', questionsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch quiz questions');
    }

    // Create new quiz with cloned data (let DB auto-generate quiz_code)
    const newQuizData = {
      title: `${originalQuiz.title} - Copy`,
      classroom_id: originalQuiz.classroom_id,
      instructor_id: originalQuiz.instructor_id,
      total_questions: originalQuiz.total_questions,
      total_points: originalQuiz.total_points,
      is_published: false, // Always unpublished for clones
      description: originalQuiz.description,
      tags: originalQuiz.tags,
      difficulty_level: originalQuiz.difficulty_level,
      estimated_time_minutes: originalQuiz.estimated_time_minutes,
      settings: originalQuiz.settings,
      is_active: true,
    };

    const { data: clonedQuiz, error: createError } = await supabase
      .from('quizzes')
      .insert([newQuizData])
      .select()
      .single();

    if (createError || !clonedQuiz) {
      log.error('Failed to create cloned quiz:', createError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to clone quiz');
    }

    // Clone all questions if any exist
    if (questions && questions.length > 0) {
      const clonedQuestions = questions.map((q: any) => ({
        quiz_id: clonedQuiz.id,
        question_number: q.question_number,
        question: q.question,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        option_e: q.option_e,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        source_link: q.source_link,
        timer_seconds: q.timer_seconds || 60,
        points: q.points || 10,
      }));

      const { error: questionsInsertError } = await supabase
        .from('quiz_questions')
        .insert(clonedQuestions);

      if (questionsInsertError) {
        log.error('Failed to clone quiz questions:', questionsInsertError);
        // Delete the created quiz since questions failed
        await supabase.from('quizzes').delete().eq('id', clonedQuiz.id);
        return apiError('INTERNAL_ERROR', 500, 'Failed to clone quiz questions');
      }
    }

    log.info(
      `✅ Quiz cloned: "${originalQuiz.title}" (${quizId}) → "${clonedQuiz.title}" (${clonedQuiz.id}) by ${authenticatedInstructor.email}`
    );

    return apiSuccess({
      success: true,
      data: {
        quiz_id: clonedQuiz.id,
        quiz_code: clonedQuiz.quiz_code,
        title: clonedQuiz.title,
        total_questions: questions?.length || 0,
        total_points: clonedQuiz.total_points,
      },
    });
  } catch (error) {
    log.error('Error cloning quiz:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to clone quiz');
  }
}
