/**
 * GET /api/instructor/quiz/{quizId}/export-results
 * Export all quiz results as CSV file
 *
 * REQUIRES: Instructor authentication
 *
 * Query params:
 * None (exports all results)
 *
 * Response:
 * CSV file download with format:
 * quiz_title,student_email,score,percentage,passed,completed_at
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError } from '@/lib/server/api-response';

const log = createLogger('ExportQuizResults');

interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  status: string;
  score: number | null;
  percentage: number | null;
  attempted_at: string;
  submitted_at: string;
  quiz_assignments?: {
    students?: {
      id: string;
      email: string;
    };
  };
}

interface ExportRow {
  quiz_title: string;
  student_email: string;
  score: number | null;
  percentage: number | null;
  passed: boolean;
  completed_at: string;
}

export async function GET(
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

    // 🔒 AUTHORIZATION: Verify quiz belongs to this instructor
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, total_points, instructor_id, passing_score_percentage')
      .eq('id', quizId)
      .eq('instructor_id', authenticatedInstructor.id)
      .single();

    if (quizError || !quiz) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to export results for quiz ${quizId} they don't own`,
      );
      return apiError('FORBIDDEN', 403, 'You do not have permission to export results for this quiz');
    }

    // Get all quiz attempts with student info
    // Note: querying all results without pagination
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select(
        `
        id,
        quiz_id,
        student_id,
        status,
        score,
        percentage,
        attempted_at,
        submitted_at,
        quiz_assignments (
          students (
            id,
            email
          )
        )
      `,
      )
      .eq('quiz_id', quizId)
      .eq('status', 'completed')
      .order('submitted_at', { ascending: false });

    if (attemptsError) {
      log.error('Failed to fetch quiz attempts:', attemptsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to export results');
    }

    // Get passing score threshold
    const passingScore = quiz.passing_score_percentage || 70;

    // Transform attempts to CSV rows
    const rows: ExportRow[] = (attempts || [])
      .map((attempt: QuizAttempt) => {
        const email = attempt.quiz_assignments?.students?.email || 'unknown@example.com';
        const passed = (attempt.percentage || 0) >= passingScore;

        return {
          quiz_title: quiz.title,
          student_email: email,
          score: attempt.score,
          percentage: attempt.percentage,
          passed,
          completed_at: formatDate(attempt.submitted_at || attempt.attempted_at),
        };
      });

    // Generate CSV content
    const csvContent = generateCSV(rows);

    // Generate filename
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const sanitizedTitle = quiz.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const filename = `${sanitizedTitle}-results-${today}.csv`;

    log.info(
      `Exported ${rows.length} quiz results for quiz ${quizId} by instructor ${authenticatedInstructor.email}`,
    );

    // Return CSV file as download
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    log.error('Error exporting quiz results:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to export results');
  }
}

/**
 * Convert array of rows to CSV format
 * Properly escapes fields and handles special characters
 */
function generateCSV(rows: ExportRow[]): string {
  // CSV headers
  const headers = ['quiz_title', 'student_email', 'score', 'percentage', 'passed', 'completed_at'];

  // Generate header row
  let csv = headers.map(escapeCSVField).join(',') + '\n';

  // Generate data rows
  for (const row of rows) {
    const fields = [
      row.quiz_title,
      row.student_email,
      row.score !== null ? String(row.score) : '',
      row.percentage !== null ? String(row.percentage) : '',
      String(row.passed),
      row.completed_at,
    ];

    csv += fields.map(escapeCSVField).join(',') + '\n';
  }

  return csv;
}

/**
 * Escape a single CSV field
 * Quotes fields that contain special characters
 */
function escapeCSVField(field: string | null | undefined): string {
  if (field === null || field === undefined) {
    return '';
  }

  const str = String(field);

  // If field contains comma, quote, newline, or carriage return, quote it
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Escape quotes by doubling them
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Format timestamp to readable date format
 */
function formatDate(timestamp: string): string {
  if (!timestamp) {
    return '';
  }

  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
