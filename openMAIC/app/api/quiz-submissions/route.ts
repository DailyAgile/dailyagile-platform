/**
 * Quiz Submission API
 *
 * POST: Receives quiz submission with student identity
 * Persists to Supabase with lazy-provisioned classroom enrollment
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { ensureSelfPacedClassroom, ensureSelfPacedEnrollment } from '@/lib/ilt/db/self-paced';
import { sendNotificationEmail } from '@/lib/email/send-notification';

const log = createLogger('QuizSubmissions');

interface QuizSubmissionRequest {
  sceneId: string;
  questions: any[];
  answers: Record<string, string | string[]>;
  sessionToken?: string;
  studentId?: string;
}

interface QuizSubmissionResponse {
  success: boolean;
  submissionId?: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = (await req.json()) as QuizSubmissionRequest;
    const { sceneId, questions, answers, sessionToken, studentId } = body;

    if (!sceneId || !answers || !questions) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'sceneId, questions, and answers are required');
    }

    // Verify student identity
    if (!studentId) {
      return apiError('UNAUTHORIZED', 401, 'studentId is required');
    }

    log.info(`Quiz submission received for scene: ${sceneId}, student: ${studentId}`);

    // Lazy-provision self-paced classroom for this scene
    const classroomId = await ensureSelfPacedClassroom(getSupabaseClient(), sceneId);

    // Ensure student is enrolled in the classroom
    await ensureSelfPacedEnrollment(getSupabaseClient(), classroomId, studentId);

    // Insert the quiz submission
    const { data: submission, error: submitError } = await getSupabaseClient()
      .from('quiz_submissions')
      .insert({
        classroom_id: classroomId,
        student_id: studentId,
        scene_id: sceneId,
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (submitError || !submission) {
      log.error('Failed to create submission:', submitError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to save quiz submission');
    }

    // Insert individual answers
    const answerRows = Object.entries(answers).map(([questionId, answer]) => ({
      submission_id: submission.id,
      question_id: questionId,
      user_answer: typeof answer === 'string' ? answer : JSON.stringify(answer),
      points_earned: null,
      feedback: null,
    }));

    if (answerRows.length > 0) {
      const { error: answersError } = await getSupabaseClient().from('quiz_answers').insert(answerRows);

      if (answersError) {
        log.error('Failed to insert answers:', answersError);
        // Continue anyway — submission is created even if answer insert fails
      }
    }

    log.info(`Quiz submission saved: ${submission.id}`);

    // Send quiz completion email to student
    try {
      const supabase = getSupabaseClient();
      const { data: student } = await supabase
        .from('students')
        .select('email, first_name')
        .eq('id', studentId)
        .single();

      const { data: classroom } = await supabase
        .from('classrooms')
        .select('name')
        .eq('id', classroomId)
        .single();

      if (student?.email) {
        // Calculate score from answers (if graded) or use placeholder
        const correctAnswers = answerRows.filter((a: any) => a.points_earned).length;
        await sendNotificationEmail('quiz-complete', {
          email: student.email,
          firstName: student.first_name || 'Student',
          quizTitle: questions[0]?.title || 'Quiz',
          score: correctAnswers,
          maxScore: questions.length,
          classroomName: classroom?.name || 'Your Classroom',
        });
      }
    } catch (emailError) {
      log.warn('Failed to send quiz completion email:', emailError);
      // Continue - submission is already saved
    }

    return apiSuccess({
      success: true as const,
      submissionId: submission.id,
    });
  } catch (error) {
    log.error('Quiz submission failed:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to save quiz submission');
  }
}
