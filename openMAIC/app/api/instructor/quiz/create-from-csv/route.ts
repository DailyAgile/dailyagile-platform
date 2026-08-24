/**
 * Create Quiz from CSV
 * POST /api/instructor/quiz/create-from-csv
 *
 * Creates a new quiz with all questions from validated CSV data
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { parseQuizCSV, type ParsedQuestion } from '@/lib/quiz/csv-parser';
import { verifyAndExtractUserId } from '@/lib/server/jwt-utils';

const log = createLogger('CreateQuizCSV');

interface CreateQuizRequest {
  classroom_id: string;
  title: string;
  description?: string;
  csv_content: string;
  settings?: {
    show_answers_after_submit?: boolean;
    allow_retakes?: number;
    passing_score?: number;
  };
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = (await req.json()) as CreateQuizRequest;
    const { classroom_id, title, description, csv_content, settings } = body;

    // Validate required fields
    if (!classroom_id || !title || !csv_content) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'classroom_id, title, and csv_content are required');
    }

    // Parse CSV
    const parseResult = parseQuizCSV(csv_content);
    if (!parseResult.success || parseResult.total_questions === 0) {
      return apiError(
        'INVALID_REQUEST',
        400,
        `CSV validation failed: ${parseResult.errors.length} errors found`,
      );
    }

    const questions = parseResult.questions;

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );

    // Get current user (instructor)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return apiError('UNAUTHORIZED', 401, 'Authorization header required');
    }

    // Extract user ID from JWT token
    const instructorId = verifyAndExtractUserId(authHeader);
    if (!instructorId) {
      return apiError('UNAUTHORIZED', 401, 'Invalid authorization token - could not extract user ID');
    }

    // Verify instructor owns this classroom
    let classroom = null;
    const { data: existingClassroom, error: classroomError } = await getSupabaseClient()
      .from('classrooms')
      .select('id, instructor_id')
      .eq('id', classroom_id)
      .single();

    if (classroomError) {
      log.error('Classroom query error:', classroomError);
      return apiError('CLASSROOM_NOT_FOUND', 404, `Classroom "${classroom_id}" not found. Please create the classroom first.`);
    } else {
      classroom = existingClassroom;
    }

    if (!classroom) {
      return apiError('CLASSROOM_NOT_FOUND', 404, 'Classroom not found');
    }

    if (classroom.instructor_id !== instructorId) {
      return apiError(
        'FORBIDDEN',
        403,
        'You do not have permission to create quizzes for this classroom',
      );
    }

    // Calculate totals
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 10), 0);

    // Generate short quiz code (e.g., Q001, Q002)
    const { data: lastQuiz } = await getSupabaseClient()
      .from('quizzes')
      .select('quiz_code')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let quizNumber = 1;
    if (lastQuiz?.quiz_code) {
      const match = lastQuiz.quiz_code.match(/Q(\d+)/);
      if (match) {
        quizNumber = parseInt(match[1]) + 1;
      }
    }
    const quizCode = `Q${String(quizNumber).padStart(3, '0')}`;

    // Create quiz
    const { data: quiz, error: quizError } = await getSupabaseClient()
      .from('quizzes')
      .insert({
        classroom_id,
        instructor_id: instructorId,
        title,
        description: description || '',
        total_questions: questions.length,
        total_points: totalPoints,
        quiz_code: quizCode,
        settings: settings || {
          show_answers_after_submit: true,
          allow_retakes: 3,
          passing_score: 70,
        },
      })
      .select('id')
      .single();

    if (quizError || !quiz) {
      log.error('Failed to create quiz:', quizError);
      return apiError('QUIZ_CREATION_FAILED', 500, 'Failed to create quiz');
    }

    const quizId = quiz.id;

    // Insert questions
    const questionRows = questions.map((q) => ({
      quiz_id: quizId,
      question_number: q.question_number,
      question: q.question,
      timer_seconds: q.timer_seconds,
      option_a: q.options.a,
      option_b: q.options.b,
      option_c: q.options.c,
      option_d: q.options.d,
      option_e: q.options.e,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      source_link: q.source_link,
      points: q.points || 10,
    }));

    const { error: questionsError } = await getSupabaseClient()
      .from('quiz_questions')
      .insert(questionRows);

    if (questionsError) {
      log.error('Failed to insert questions:', questionsError);
      const errorMsg = questionsError?.message || 'Unknown database error';
      const details = questionsError?.details || '';
      // Rollback quiz creation
      await getSupabaseClient().from('quizzes').delete().eq('id', quizId);
      return apiError('QUESTIONS_INSERTION_FAILED', 500, `Failed to insert quiz questions: ${errorMsg} ${details}`);
    }

    log.info(`Quiz created: ${quizId} (${quizCode}) with ${questions.length} questions`);

    return apiSuccess({
      success: true,
      quiz_id: quizId,
      quiz_code: quizCode,
      total_questions: questions.length,
      total_points: totalPoints,
      estimated_duration_minutes: Math.round(
        questions.reduce((sum, q) => sum + q.timer_seconds, 0) / 60,
      ),
    });
  } catch (error) {
    log.error('Quiz creation failed:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to create quiz from CSV');
  }
}
