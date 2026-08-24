/**
 * POST /api/quiz/submit
 * Submit quiz answers and get results
 *
 * ⚠️ CRITICAL: This endpoint now persists submission to Supabase
 * Data loss risk fixed: results no longer local-only
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCSRFValidation } from '@/lib/server/csrf-token';
import { createLogger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/server/supabase-client';

const log = createLogger('QuizSubmit');

interface QuizQuestion {
  id: string;
  correct_answer: string;
}

interface SubmitRequest {
  quizCode: string;
  answers: Record<number, string>;
  questions: QuizQuestion[];
  sceneId?: string;
  studentId?: string;
  maxScore?: number;
}

interface QuizSubmitResponse {
  success: boolean;
  data?: {
    correct: number;
    incorrect: number;
    score: number;
    total_points: number;
    percentage: string;
    passed: boolean;
    submissionId?: string; // Now included for tracking
  };
  error?: { message: string };
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // 🛡️ CSRF PROTECTION: Validate CSRF token
    const csrfValidation = await requireCSRFValidation(req);
    if (!csrfValidation.valid) {
      log.warn('CSRF validation failed for quiz submission');
      return NextResponse.json(
        { error: { message: csrfValidation.error || 'CSRF validation failed' } },
        { status: 403 }
      );
    }

    const body = (await req.json()) as SubmitRequest;
    const { answers, questions, sceneId, studentId, maxScore } = body;

    log.info(`Grading quiz with ${questions.length} questions`);

    let correct = 0;
    let totalPoints = maxScore || 0;

    // Grade each answer
    questions.forEach((question, index) => {
      const studentAnswer = answers[index];
      const isCorrect = studentAnswer === question.correct_answer;
      const points = maxScore ? Math.round(maxScore / questions.length) : 10;

      if (totalPoints === 0) {
        totalPoints = points * questions.length;
      }

      if (isCorrect) {
        correct += 1;
      }
    });

    if (totalPoints === 0) {
      totalPoints = questions.length * 10;
    }

    const incorrect = questions.length - correct;
    const score = correct * (totalPoints / questions.length);
    const percentage = ((score / totalPoints) * 100).toFixed(1);
    const passed = score >= totalPoints * 0.7;

    log.info(`Quiz graded: ${correct}/${questions.length} correct (${percentage}%)`);

    // 💾 CRITICAL: Persist submission to Supabase (if studentId provided)
    let submissionId: string | undefined;
    if (studentId && sceneId) {
      try {
        const supabase = getSupabaseClient();

        // Create submission record
        const { data: submission, error: submitError } = await supabase
          .from('quiz_submissions')
          .insert({
            student_id: studentId,
            scene_id: sceneId,
            quiz_id: sceneId, // Use scene_id as quiz_id if not provided
            score: Math.round(score * 100) / 100,
            max_score: totalPoints,
            submitted_at: new Date().toISOString(),
            status: 'graded',
          })
          .select('id')
          .single();

        if (submitError) {
          log.warn('Failed to create submission record:', submitError);
          // Continue anyway - quiz is graded locally, just missing Supabase persistence
        } else if (submission) {
          submissionId = submission.id;
          log.info(`Submission persisted to Supabase: ${submissionId}`);

          // Store individual answers
          const answerRows = Object.entries(answers).map(([questionIdx, answer]) => {
            const qIdx = parseInt(questionIdx);
            const question = questions[qIdx];
            return {
              submission_id: submissionId,
              question_id: question.id || `q${qIdx}`,
              question_text: null,
              user_answer: answer,
              correct_answer: question.correct_answer,
              is_correct: answer === question.correct_answer,
              points_earned: answer === question.correct_answer ? Math.round((totalPoints / questions.length) * 100) / 100 : 0,
              max_points: Math.round((totalPoints / questions.length) * 100) / 100,
            };
          });

          if (answerRows.length > 0) {
            const { error: answersError } = await supabase
              .from('quiz_answers')
              .insert(answerRows);

            if (answersError) {
              log.warn('Failed to store individual answers:', answersError);
              // Continue - submission is created even if answers insert fails
            }
          }
        }
      } catch (dbError) {
        log.error('Error persisting submission to Supabase:', dbError);
        // Continue - quiz is graded locally, just log the persistence error
      }
    }

    const response: QuizSubmitResponse = {
      success: true,
      data: {
        correct,
        incorrect,
        score: Math.round(score * 100) / 100,
        total_points: totalPoints,
        percentage,
        passed,
        submissionId, // Include for frontend tracking
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    log.error('Error submitting quiz:', error);
    return NextResponse.json(
      { error: { message: 'Failed to submit quiz' } },
      { status: 500 }
    );
  }
}
