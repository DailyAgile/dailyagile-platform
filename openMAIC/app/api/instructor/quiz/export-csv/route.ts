/**
 * Export Quiz Results to CSV
 * POST /api/instructor/quiz/export-csv
 *
 * Exports student results as CSV file with full details including:
 * - Student info (name, email)
 * - Quiz info (title, code)
 * - Score and percentage
 * - Pass/Fail status (70%+ = PASS)
 * - Time to complete
 * - Per-question answer details
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError } from '@/lib/server/api-response';

const log = createLogger('ExportCSV');

interface ExportRequest {
  filter_mode: 'by-email' | 'by-quiz';
  email?: string;
  quiz_id?: string;
}

const PASS_THRESHOLD = 70;

/**
 * Escape CSV field value (handle quotes, commas, newlines)
 */
function escapeCSV(value: string | null | undefined): string {
  if (!value) return '';
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape inner quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format time in minutes:seconds
 */
function formatTime(seconds: number | null | undefined): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format date as YYYY-MM-DD HH:MM AM/PM
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Generate filename with timestamp
 */
function generateFilename(filterMode: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[T:.-]/g, '').slice(0, 14);
  return `quiz-results-${filterMode}-${timestamp}.csv`;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = (await req.json()) as ExportRequest;
    const { filter_mode, email, quiz_id } = body;

    if (!filter_mode || (filter_mode === 'by-email' && !email) || (filter_mode === 'by-quiz' && !quiz_id)) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Invalid export parameters');
    }

    const supabase = getSupabaseClient();

    // Fetch sessions with full quiz details
    let sessionsQuery = supabase
      .from('quiz_sessions')
      .select(`
        id,
        quiz_id,
        student_id,
        student_email,
        score,
        percentage,
        started_at,
        submitted_at,
        created_at,
        quizzes:quiz_id (
          id,
          title,
          quiz_code,
          total_points
        )
      `);

    if (filter_mode === 'by-email') {
      sessionsQuery = sessionsQuery.eq('student_email', email);
    } else {
      sessionsQuery = sessionsQuery.eq('quiz_id', quiz_id);
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery.order('created_at', { ascending: false });

    if (sessionsError) {
      log.error('Failed to fetch sessions for export:', sessionsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to export results');
    }

    if (!sessions || sessions.length === 0) {
      // Return empty CSV with headers
      const csvContent = 'Student Name,Email,Quiz Title,Quiz Code,Score,Total Points,Percentage,Pass/Fail,Date Taken,Time to Complete,Correct Answers,Answer Details\n';
      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': `attachment; filename="${generateFilename(filter_mode)}"`,
        },
      });
    }

    // Build CSV rows with detailed information
    const csvRows = [
      'Student Name,Email,Quiz Title,Quiz Code,Score,Total Points,Percentage,Pass/Fail,Date Taken,Time to Complete,Correct Answers,Answer Details',
    ];

    for (const session of sessions) {
      try {
        // Fetch student name if available
        let studentName = 'Student';
        if (session.student_id) {
          const { data: student } = await supabase
            .from('students')
            .select('name')
            .eq('id', session.student_id)
            .single();
          if (student?.name) {
            studentName = student.name;
          }
        }

        // Fetch quiz questions and student responses for this session
        const { data: responses, error: responsesError } = await supabase
          .from('quiz_responses')
          .select(`
            id,
            selected_answer,
            is_correct,
            time_taken_seconds,
            question_id,
            quiz_questions:question_id (
              id,
              question_number,
              option_a,
              option_b,
              option_c,
              option_d,
              option_e,
              correct_answer
            )
          `)
          .eq('session_id', session.id)
          .order('quiz_questions.question_number', { ascending: true });

        if (responsesError) {
          log.warn(`Failed to fetch responses for session ${session.id}:`, responsesError);
        }

        // Calculate metrics
        const studentEmail = session.student_email || 'unknown@example.com';
        const quizTitle = session.quizzes?.title || 'Unknown Quiz';
        const quizCode = session.quizzes?.quiz_code || '';
        const score = session.score || 0;
        const totalPoints = session.quizzes?.total_points || 0;
        const percentage = session.percentage || 0;
        const passFail = percentage >= PASS_THRESHOLD ? 'PASS' : 'FAIL';
        const dateTaken = formatDate(session.created_at);

        // Calculate time to complete
        let timeToComplete = '—';
        if (session.started_at && session.submitted_at) {
          const startTime = new Date(session.started_at).getTime();
          const submitTime = new Date(session.submitted_at).getTime();
          const durationMs = submitTime - startTime;
          if (durationMs >= 0) {
            timeToComplete = formatTime(Math.floor(durationMs / 1000));
          }
        }

        // Build answer details
        let correctAnswerCount = 0;
        const answerDetails: string[] = [];

        if (responses && responses.length > 0) {
          for (const response of responses) {
            if (response.is_correct) {
              correctAnswerCount++;
            }

            const qNum = response.quiz_questions?.question_number || '?';
            const selected = response.selected_answer || '—';
            const correct = response.quiz_questions?.correct_answer || '?';
            const status = response.is_correct ? 'Correct' : 'Incorrect';

            // Get the selected option text
            let selectedText = selected;
            if (selected !== '—' && response.quiz_questions) {
              const optionKey = `option_${selected.toLowerCase()}`;
              selectedText = (response.quiz_questions as any)[optionKey] || selected;
            }

            answerDetails.push(`Q${qNum}: ${selected} "${selectedText}" (${status})`);
          }
        }

        // Build CSV row
        const row = [
          escapeCSV(studentName),
          escapeCSV(studentEmail),
          escapeCSV(quizTitle),
          escapeCSV(quizCode),
          score.toString(),
          totalPoints.toString(),
          percentage.toString(),
          escapeCSV(passFail),
          escapeCSV(dateTaken),
          escapeCSV(timeToComplete),
          correctAnswerCount.toString(),
          escapeCSV(answerDetails.join(' | ')),
        ].join(',');

        csvRows.push(row);
      } catch (sessionError) {
        log.warn(`Error processing session ${session.id}:`, sessionError);
        // Still add the row with basic info even if detailed info fails
        const row = [
          escapeCSV('Student'),
          escapeCSV(session.student_email || 'unknown@example.com'),
          escapeCSV(session.quizzes?.title || 'Unknown Quiz'),
          escapeCSV(session.quizzes?.quiz_code || ''),
          (session.score || 0).toString(),
          (session.quizzes?.total_points || 0).toString(),
          (session.percentage || 0).toString(),
          escapeCSV(session.percentage >= PASS_THRESHOLD ? 'PASS' : 'FAIL'),
          escapeCSV(formatDate(session.created_at)),
          escapeCSV('—'),
          '0',
          '',
        ].join(',');
        csvRows.push(row);
      }
    }

    const csvContent = csvRows.join('\n');

    log.info(`Exported ${sessions.length} results to CSV`);

    // Return CSV file
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="${generateFilename(filter_mode)}"`,
      },
    });
  } catch (error) {
    log.error('Export CSV error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to export results');
  }
}
