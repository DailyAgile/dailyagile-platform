/**
 * Database operations for quiz submission management
 * Handles: storing submissions, retrieving answers, calculating scores, tracking grading status
 */

import { createClient } from '@supabase/supabase-js';
import type {
  QuizSubmission,
  QuizAnswer,
  QuizSubmissionWithStudent,
  QuizSubmissionStatus,
  QuestionType,
} from '@/lib/ilt/types/models';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

// ============================================================================
// TYPES
// ============================================================================

export interface SubmitQuizRequest {
  scene_id: string;
  quiz_id: string;
  answers: Record<
    string,
    {
      user_answer: string | string[] | null;
      question_text?: string;
      question_type?: QuestionType;
    }
  >;
  max_score: number;
}

export interface SubmissionGradingStatus {
  submission_id: string;
  status: 'in_progress' | 'submitted' | 'graded';
  needs_ai_grade: boolean;
  questions_graded: number;
  total_questions: number;
  provisional_score: number | null;
  max_score: number;
}

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Submit a quiz with answers
 * Creates submission record and stores individual answers
 * Status starts as 'in_progress' until submitted
 *
 * @param classroomId - Classroom where quiz is being taken
 * @param studentId - Student taking the quiz
 * @param request - Quiz submission with answers
 * @param instructorId - For audit logging
 * @returns Created submission with answers
 */
export async function submitQuiz(
  classroomId: string,
  studentId: string,
  request: SubmitQuizRequest,
  instructorId?: string,
): Promise<{
  submission: QuizSubmission;
  answers: QuizAnswer[];
  grading_status: SubmissionGradingStatus;
}> {
  // 1. Verify student is enrolled in this classroom
  const { data: enrollment } = await supabase
    .from('student_rosters')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .single();

  if (!enrollment) {
    throw new Error('Student is not enrolled in this classroom');
  }

  // 2. Create submission record (status: 'submitted' when quiz is complete)
  const { data: submission, error: submissionError } = await supabase
    .from('quiz_submissions')
    .insert({
      classroom_id: classroomId,
      student_id: studentId,
      scene_id: request.scene_id,
      quiz_id: request.quiz_id,
      submitted_at: new Date().toISOString(),
      status: 'submitted',
      max_score: request.max_score,
      metadata: {
        submission_method: 'browser_submission',
      },
    })
    .select()
    .single();

  if (submissionError || !submission) {
    throw new Error(`Failed to create submission: ${submissionError?.message}`);
  }

  // 3. Store individual answers
  const answerRecords = Object.entries(request.answers).map(([questionId, answer]) => ({
    submission_id: submission.id,
    question_id: questionId,
    question_text: answer.question_text || null,
    user_answer: Array.isArray(answer.user_answer)
      ? JSON.stringify(answer.user_answer)
      : answer.user_answer,
    question_type: answer.question_type || 'short_answer',
    is_correct: null, // Will be set by grading
    points_earned: null,
    max_points: null,
    feedback: null,
    correct_answer: null,
  }));

  const { data: answers, error: answersError } = await supabase
    .from('quiz_answers')
    .insert(answerRecords)
    .select();

  if (answersError) {
    // Clean up submission if answers fail
    await supabase.from('quiz_submissions').delete().eq('id', submission.id);
    throw new Error(`Failed to store answers: ${answersError.message}`);
  }

  // 4. Log audit event
  await supabase
    .from('audit_logs')
    .insert({
      classroom_id: classroomId,
      actor_id: studentId,
      action: 'quiz_submitted',
      resource_type: 'quiz_submission',
      resource_id: submission.id,
      details: {
        scene_id: request.scene_id,
        quiz_id: request.quiz_id,
        answer_count: Object.keys(request.answers).length,
      },
    });

  // 5. Determine grading status
  const gradingStatus = await getSubmissionGradingStatus(submission.id);

  return {
    submission: submission as QuizSubmission,
    answers: (answers || []) as QuizAnswer[],
    grading_status: gradingStatus,
  };
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get a single submission by ID with all answers
 * Respects RLS: student sees own, instructor sees their class
 *
 * @param submissionId - ID of the submission to retrieve
 * @returns Submission with all answers
 */
export async function getSubmission(
  submissionId: string,
): Promise<{
  submission: QuizSubmission;
  answers: QuizAnswer[];
}> {
  // Fetch submission
  const { data: submission, error: submissionError } = await supabase
    .from('quiz_submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (submissionError || !submission) {
    throw new Error(`Submission not found: ${submissionError?.message}`);
  }

  // Fetch answers
  const { data: answers, error: answersError } = await supabase
    .from('quiz_answers')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true });

  if (answersError) {
    throw new Error(`Failed to fetch answers: ${answersError.message}`);
  }

  return {
    submission: submission as QuizSubmission,
    answers: (answers || []) as QuizAnswer[],
  };
}

/**
 * Get all submissions for a student in a classroom
 * Supports filtering by status, scene, quiz
 *
 * @param classroomId - Classroom ID
 * @param studentId - Student ID
 * @param filters - Optional filters
 * @returns Array of submissions with student details
 */
export async function getStudentSubmissions(
  classroomId: string,
  studentId: string,
  filters?: {
    status?: QuizSubmissionStatus;
    scene_id?: string;
    quiz_id?: string;
    limit?: number;
    offset?: number;
  },
): Promise<QuizSubmissionWithStudent[]> {
  const { limit = 100, offset = 0, status, scene_id, quiz_id } = filters || {};

  let query = supabase
    .from('quiz_submissions')
    .select(
      `
      *,
      student:students(
        id,
        email,
        name,
        student_id,
        avatar_url,
        created_at,
        updated_at
      )
    `,
    )
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId);

  // Apply optional filters
  if (status) {
    query = query.eq('status', status);
  }
  if (scene_id) {
    query = query.eq('scene_id', scene_id);
  }
  if (quiz_id) {
    query = query.eq('quiz_id', quiz_id);
  }

  // Sort by most recent first
  query = query.order('submitted_at', { ascending: false, nullsFirst: false });

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch submissions: ${error.message}`);
  }

  return (data || []) as QuizSubmissionWithStudent[];
}

/**
 * Get all submissions in a classroom (for instructor view)
 *
 * @param classroomId - Classroom ID
 * @param filters - Optional filters (status, quiz_id, etc.)
 * @returns Array of submissions with student details
 */
export async function getClassroomSubmissions(
  classroomId: string,
  filters?: {
    status?: QuizSubmissionStatus;
    quiz_id?: string;
    scene_id?: string;
    limit?: number;
    offset?: number;
  },
): Promise<QuizSubmissionWithStudent[]> {
  const { limit = 500, offset = 0, status, quiz_id, scene_id } = filters || {};

  let query = supabase
    .from('quiz_submissions')
    .select(
      `
      *,
      student:students(
        id,
        email,
        name,
        student_id,
        avatar_url,
        created_at,
        updated_at
      )
    `,
    )
    .eq('classroom_id', classroomId);

  // Apply optional filters
  if (status) {
    query = query.eq('status', status);
  }
  if (quiz_id) {
    query = query.eq('quiz_id', quiz_id);
  }
  if (scene_id) {
    query = query.eq('scene_id', scene_id);
  }

  // Sort by most recent first
  query = query.order('submitted_at', { ascending: false, nullsFirst: false });

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch submissions: ${error.message}`);
  }

  return (data || []) as QuizSubmissionWithStudent[];
}

/**
 * Get grading status for a submission
 * Returns whether submission needs AI grading and current progress
 *
 * @param submissionId - Submission ID
 * @returns Grading status details
 */
export async function getSubmissionGradingStatus(
  submissionId: string,
): Promise<SubmissionGradingStatus> {
  // Fetch submission
  const { data: submission, error: submissionError } = await supabase
    .from('quiz_submissions')
    .select('id, status, score, max_score')
    .eq('id', submissionId)
    .single();

  if (submissionError || !submission) {
    throw new Error(`Submission not found: ${submissionError?.message}`);
  }

  // Fetch answers to check grading status
  const { data: answers, error: answersError } = await supabase
    .from('quiz_answers')
    .select('id, is_correct, points_earned, max_points')
    .eq('submission_id', submissionId);

  if (answersError) {
    throw new Error(`Failed to fetch answers: ${answersError.message}`);
  }

  const answerList = (answers || []) as Array<{
    id: string;
    is_correct: boolean | null;
    points_earned: number | null;
    max_points: number | null;
  }>;

  // Calculate grading progress
  const questionsGraded = answerList.filter((a) => a.is_correct !== null).length;
  const totalQuestions = answerList.length;
  const needsAiGrade =
    submission.status === 'submitted' && questionsGraded < totalQuestions;

  // Calculate provisional score (sum of graded points)
  let provisionalScore = 0;
  for (const answer of answerList) {
    if (answer.points_earned !== null) {
      provisionalScore += answer.points_earned;
    }
  }

  return {
    submission_id: submissionId,
    status: submission.status,
    needs_ai_grade: needsAiGrade,
    questions_graded: questionsGraded,
    total_questions: totalQuestions,
    provisional_score: questionsGraded > 0 ? provisionalScore : null,
    max_score: submission.max_score || 0,
  };
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Update submission status
 * Transitions: in_progress → submitted → graded
 *
 * @param submissionId - Submission ID
 * @param status - New status
 * @param updates - Additional fields to update
 * @returns Updated submission
 */
export async function updateSubmissionStatus(
  submissionId: string,
  status: QuizSubmissionStatus,
  updates?: Partial<{
    score: number;
    max_score: number;
    completed_at: string;
  }>,
): Promise<QuizSubmission> {
  const updateData: Record<string, any> = { status };

  if (updates?.score !== undefined) {
    updateData.score = updates.score;
  }
  if (updates?.max_score !== undefined) {
    updateData.max_score = updates.max_score;
  }
  if (updates?.completed_at) {
    updateData.completed_at = updates.completed_at;
  }

  const { data, error } = await supabase
    .from('quiz_submissions')
    .update(updateData)
    .eq('id', submissionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update submission status: ${error.message}`);
  }

  // Log audit event for status change
  if (data) {
    const submission = data as QuizSubmission;
    await supabase.from('audit_logs').insert({
      classroom_id: submission.classroom_id,
      actor_id: submission.student_id,
      action: 'submission_status_changed',
      resource_type: 'quiz_submission',
      resource_id: submissionId,
      details: { new_status: status },
    });
  }

  return data as QuizSubmission;
}

/**
 * Update individual answer with grading result
 * Called by grading service (AI or manual)
 *
 * @param answerId - Answer ID
 * @param grading - Grading result
 * @returns Updated answer
 */
export async function updateAnswerGrade(
  answerId: string,
  grading: {
    is_correct: boolean;
    points_earned: number;
    max_points: number;
    correct_answer?: string;
    feedback?: string;
  },
): Promise<QuizAnswer> {
  const { data, error } = await supabase
    .from('quiz_answers')
    .update({
      is_correct: grading.is_correct,
      points_earned: grading.points_earned,
      max_points: grading.max_points,
      correct_answer: grading.correct_answer || null,
      feedback: grading.feedback || null,
    })
    .eq('id', answerId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update answer grade: ${error.message}`);
  }

  return data as QuizAnswer;
}

/**
 * Update multiple answers in bulk (from grading service)
 *
 * @param submissionId - Submission being graded
 * @param grades - Array of answer grades
 * @returns Updated answers
 */
export async function updateAnswerGradesBulk(
  submissionId: string,
  grades: Array<{
    question_id: string;
    is_correct: boolean;
    points_earned: number;
    max_points: number;
    correct_answer?: string;
    feedback?: string;
  }>,
): Promise<QuizAnswer[]> {
  const updates: QuizAnswer[] = [];

  // Get all answers for this submission
  const { data: answers, error: fetchError } = await supabase
    .from('quiz_answers')
    .select('id, question_id')
    .eq('submission_id', submissionId);

  if (fetchError) {
    throw new Error(`Failed to fetch answers: ${fetchError.message}`);
  }

  // Build update map
  const gradeMap = new Map(grades.map((g) => [g.question_id, g]));

  // Update each answer
  for (const answer of answers || []) {
    const grade = gradeMap.get(answer.question_id);
    if (grade) {
      const updated = await updateAnswerGrade(answer.id, grade);
      updates.push(updated);
    }
  }

  // Calculate total score and update submission
  const totalPoints = grades.reduce((sum, g) => sum + g.points_earned, 0);
  const maxPoints = grades.reduce((sum, g) => sum + g.max_points, 0);

  await updateSubmissionStatus(submissionId, 'graded', {
    score: totalPoints,
    max_score: maxPoints,
    completed_at: new Date().toISOString(),
  });

  // Log audit event
  const { data: submission } = await supabase
    .from('quiz_submissions')
    .select('classroom_id, student_id')
    .eq('id', submissionId)
    .single();

  if (submission) {
    await supabase.from('audit_logs').insert({
      classroom_id: submission.classroom_id,
      actor_id: submission.student_id,
      action: 'submission_graded',
      resource_type: 'quiz_submission',
      resource_id: submissionId,
      details: {
        total_points: totalPoints,
        max_points: maxPoints,
        questions_graded: updates.length,
      },
    });
  }

  return updates;
}

// ============================================================================
// SCORING & ANALYTICS
// ============================================================================

/**
 * Calculate percentage score for a submission
 * Uses generated column from database but provides calculation logic
 *
 * @param score - Points earned
 * @param maxScore - Total possible points
 * @returns Percentage (0-100)
 */
export function calculatePercentage(score: number | null, maxScore: number | null): number | null {
  if (score === null || maxScore === null || maxScore === 0) {
    return null;
  }
  return Math.round((score / maxScore) * 100 * 100) / 100; // 2 decimal places
}

/**
 * Get average score for a classroom
 * Filters only graded submissions
 *
 * @param classroomId - Classroom ID
 * @param quizId - Optional quiz filter
 * @returns Average percentage score
 */
export async function getClassroomAverageScore(
  classroomId: string,
  quizId?: string,
): Promise<number | null> {
  let query = supabase
    .from('quiz_submissions')
    .select('percentage')
    .eq('classroom_id', classroomId)
    .eq('status', 'graded')
    .not('percentage', 'is', null);

  if (quizId) {
    query = query.eq('quiz_id', quizId);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return null;
  }

  const scores = (data as Array<{ percentage: number | null }>)
    .map((s) => s.percentage || 0)
    .filter((s) => s !== null);

  return scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b) / scores.length) * 100) / 100 : null;
}

/**
 * Get submission statistics for a student
 *
 * @param classroomId - Classroom ID
 * @param studentId - Student ID
 * @returns Statistics object
 */
export async function getStudentQuizStats(classroomId: string, studentId: string) {
  const { data, error } = await supabase
    .from('quiz_submissions')
    .select('status, percentage, score, max_score, submitted_at')
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId);

  if (error) {
    throw new Error(`Failed to fetch stats: ${error.message}`);
  }

  const submissions = (data || []) as Array<{
    status: QuizSubmissionStatus;
    percentage: number | null;
    score: number | null;
    max_score: number | null;
    submitted_at: string | null;
  }>;

  const graded = submissions.filter((s) => s.status === 'graded');
  const percentages = graded.map((s) => s.percentage || 0).filter((p) => p !== null);

  return {
    total_submissions: submissions.length,
    graded_submissions: graded.length,
    pending_submissions: submissions.filter((s) => s.status !== 'graded').length,
    average_percentage: percentages.length > 0
      ? Math.round((percentages.reduce((a, b) => a + b) / percentages.length) * 100) / 100
      : null,
    highest_score: graded.length > 0
      ? Math.max(...percentages)
      : null,
    lowest_score: graded.length > 0
      ? Math.min(...percentages)
      : null,
    completion_rate: submissions.length > 0
      ? Math.round((graded.length / submissions.length) * 100 * 100) / 100
      : 0,
  };
}

// ============================================================================
// UTILITY OPERATIONS
// ============================================================================

/**
 * Check if student can retake a quiz
 * Returns true if they can take another attempt
 *
 * @param classroomId - Classroom ID
 * @param studentId - Student ID
 * @param quizId - Quiz ID
 * @param maxRetakes - Max allowed retakes (0 = unlimited)
 * @returns Whether student can retake
 */
export async function canStudentRetakeQuiz(
  classroomId: string,
  studentId: string,
  quizId: string,
  maxRetakes: number = 0,
): Promise<boolean> {
  const { data, error, count } = await supabase
    .from('quiz_submissions')
    .select('id', { count: 'exact' })
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
    .eq('quiz_id', quizId);

  if (error) {
    throw new Error(`Failed to check retakes: ${error.message}`);
  }

  if (maxRetakes === 0) {
    return true; // Unlimited retakes
  }

  return (count || 0) < maxRetakes;
}

/**
 * Delete a submission and all associated answers
 * Soft delete via status for audit trail
 *
 * @param submissionId - Submission ID
 * @param studentId - Student ID (for authorization)
 * @returns Deletion confirmation
 */
export async function deleteSubmission(
  submissionId: string,
  studentId?: string,
): Promise<void> {
  // Verify ownership if studentId provided
  if (studentId) {
    const { data: submission } = await supabase
      .from('quiz_submissions')
      .select('student_id')
      .eq('id', submissionId)
      .single();

    if (!submission || submission.student_id !== studentId) {
      throw new Error('Unauthorized to delete this submission');
    }
  }

  // Hard delete (only for admin/cleanup purposes)
  const { error: answersError } = await supabase
    .from('quiz_answers')
    .delete()
    .eq('submission_id', submissionId);

  if (answersError) {
    throw new Error(`Failed to delete answers: ${answersError.message}`);
  }

  const { error: submissionError } = await supabase
    .from('quiz_submissions')
    .delete()
    .eq('id', submissionId);

  if (submissionError) {
    throw new Error(`Failed to delete submission: ${submissionError.message}`);
  }
}
