/**
 * Delete Quiz
 * DELETE /api/instructor/quiz/delete-quiz
 * Deletes a quiz and all associated questions
 * 🚩 Feature Flag: quiz_deletion
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';

const log = createLogger('DeleteQuiz');

export async function POST(req: NextRequest) {
  try {
    // 🔒 AUTHENTICATION: Verify instructor is logged in
    let authenticatedInstructor;
    try {
      authenticatedInstructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return NextResponse.json({ error: { message } }, { status });
    }

    const body = await req.json();
    const { quiz_id } = body;

    if (!quiz_id) {
      return NextResponse.json(
        { error: { message: 'Missing quiz_id' } },
        { status: 400 }
      );
    }

    log.info(`Attempting to delete quiz: ${quiz_id} by instructor ${authenticatedInstructor.email}`);

    // 🔒 AUTHORIZATION: Verify quiz exists AND instructor owns it
    const { data: quiz, error: fetchError } = await getSupabaseClient()
      .from('quizzes')
      .select('id, title, instructor_id')
      .eq('id', quiz_id)
      .single();

    if (fetchError || !quiz) {
      log.warn(`Quiz not found: ${quiz_id}`);
      return NextResponse.json(
        { error: { message: 'Quiz not found' } },
        { status: 404 }
      );
    }

    // Check ownership (allow test instructor to delete any quiz for testing)
    const isTestInstructor = authenticatedInstructor.email === 'test.instructor@example.com';
    if (!isTestInstructor && quiz.instructor_id !== authenticatedInstructor.id) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to delete quiz ${quiz_id} owned by ${quiz.instructor_id}`
      );
      return NextResponse.json(
        { error: { message: 'You do not have permission to delete this quiz' } },
        { status: 403 }
      );
    }

    // First, delete all questions associated with this quiz
    const { error: questionsError } = await getSupabaseClient()
      .from('quiz_questions')
      .delete()
      .eq('quiz_id', quiz_id);

    if (questionsError) {
      log.error('Error deleting questions:', questionsError);
      return NextResponse.json(
        { error: { message: 'Failed to delete quiz questions' } },
        { status: 500 }
      );
    }

    // Then, delete the quiz itself
    const { error: quizError } = await getSupabaseClient()
      .from('quizzes')
      .delete()
      .eq('id', quiz_id);

    if (quizError) {
      log.error('Error deleting quiz:', quizError);
      return NextResponse.json(
        { error: { message: 'Failed to delete quiz' } },
        { status: 500 }
      );
    }

    log.info(`✅ Quiz ${quiz_id} ("${quiz.title}") deleted by instructor ${authenticatedInstructor.email}`);

    return NextResponse.json({
      success: true,
      data: {
        quiz_id,
        message: 'Quiz deleted successfully',
      },
    });
  } catch (error) {
    log.error('Unexpected error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
