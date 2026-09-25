/**
 * POST /api/instructor/quiz/{quizId}/send-reminders
 * Send email reminders about incomplete quizzes to students
 *
 * REQUIRES: Instructor authentication
 *
 * Request body:
 * {
 *   message?: string,        // Optional custom message to include
 *   include_link?: boolean,  // Include quiz link (default: true)
 *   include_deadline?: boolean // Include deadline if set (default: true)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     message: "Reminders sent to X students",
 *     sent_count: number,
 *     failed_count: number,
 *     total_incomplete: number,
 *     email_logs: [{id, student_email, status}]
 *   }
 * }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { queueEmail } from '@/lib/email/email-queue-service';

const log = createLogger('SendQuizReminders');

interface SendRemindersRequest {
  message?: string;
  include_link?: boolean;
  include_deadline?: boolean;
}

interface QuizAssignment {
  id: string;
  student_id: string;
  expires_at: string;
  students: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
  quiz_attempts?: Array<{ status: string }>;
}

interface EmailLog {
  id: string;
  quiz_id: string;
  student_id: string;
  recipient_email: string;
  email_queue_id: string;
  status: string;
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
    const body: SendRemindersRequest = await req.json();
    const {
      message: customMessage = '',
      include_link = true,
      include_deadline = true,
    } = body;

    const supabase = getSupabaseClient();

    // 🔒 AUTHORIZATION: Verify quiz belongs to this instructor
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, instructor_id')
      .eq('id', quizId)
      .eq('instructor_id', authenticatedInstructor.id)
      .single();

    if (quizError || !quiz) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to send reminders for quiz ${quizId} they don't own`,
      );
      return apiError('FORBIDDEN', 403, 'You do not have permission to send reminders for this quiz');
    }

    // Get all incomplete quiz assignments for this quiz
    // Include only assignments where student has not completed an attempt
    const { data: assignments, error: assignmentsError } = await supabase
      .from('quiz_assignments')
      .select(
        `
        id,
        student_id,
        expires_at,
        students:student_id (
          id,
          email,
          first_name,
          last_name
        ),
        quiz_attempts!left (
          status,
          submitted_at
        )
      `,
      )
      .eq('quiz_id', quizId)
      .eq('is_active', true);

    if (assignmentsError) {
      log.error('Failed to fetch quiz assignments:', assignmentsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch student assignments');
    }

    if (!assignments || assignments.length === 0) {
      log.info(`No assignments found for quiz ${quizId}`);
      return apiSuccess({
        success: true,
        data: {
          message: 'No incomplete assignments found for this quiz',
          sent_count: 0,
          failed_count: 0,
          total_incomplete: 0,
          email_logs: [],
        },
      });
    }

    // Filter to get only incomplete assignments
    // (those without a completed quiz_attempt)
    const incompleteAssignments = (assignments as QuizAssignment[]).filter((assignment) => {
      const hasCompleted =
        assignment.quiz_attempts &&
        assignment.quiz_attempts.some((attempt) => attempt.status === 'completed');
      return !hasCompleted;
    });

    log.info(`Found ${incompleteAssignments.length} incomplete assignments for quiz ${quizId}`);

    if (incompleteAssignments.length === 0) {
      return apiSuccess({
        success: true,
        data: {
          message: 'All assigned students have completed this quiz',
          sent_count: 0,
          failed_count: 0,
          total_incomplete: 0,
          email_logs: [],
        },
      });
    }

    // Send reminders and track in email_logs
    const emailLogs: EmailLog[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const assignment of incompleteAssignments) {
      try {
        const studentEmail = assignment.students.email;
        const studentFirstName = assignment.students.first_name || 'Student';
        const deadline = assignment.expires_at;

        // Build quiz link
        const quizLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://dailyagile.com'}/quiz/${quizId}/take`;

        // Build email content
        const emailTemplate = buildReminderEmail({
          studentName: studentFirstName,
          quizTitle: quiz.title,
          quizLink: include_link ? quizLink : undefined,
          deadline: include_deadline ? deadline : undefined,
          customMessage,
        });

        // Queue email
        const queueId = await queueEmail(
          studentEmail,
          'enrollment-invite',
          {
            studentName: studentFirstName,
            quizTitle: quiz.title,
            quizLink: include_link ? quizLink : undefined,
            deadline: include_deadline ? deadline : undefined,
            customMessage,
          },
          emailTemplate.subject,
          emailTemplate.html,
          emailTemplate.text,
        );

        // Log the reminder in email_logs table
        const { data: logEntry, error: logError } = await supabase
          .from('email_logs')
          .insert({
            quiz_id: quizId,
            instructor_id: authenticatedInstructor.email,
            student_id: assignment.student_id,
            recipient_email: studentEmail,
            email_queue_id: queueId,
            email_type: 'enrollment-invite',
            subject: emailTemplate.subject,
            status: 'queued',
            include_quiz_link: include_link,
            include_deadline: include_deadline,
            deadline_at: include_deadline ? deadline : null,
          })
          .select();

        if (logError) {
          log.warn(`Failed to log email for student ${studentEmail}:`, logError);
          failedCount++;
        } else if (logEntry && logEntry.length > 0) {
          emailLogs.push(logEntry[0]);
          sentCount++;
        }
      } catch (error) {
        log.error(`Error sending reminder to student ${assignment.students.email}:`, error);
        failedCount++;
      }
    }

    log.info(
      `Sent ${sentCount} quiz reminders for quiz ${quizId} by instructor ${authenticatedInstructor.email}, ${failedCount} failed`,
    );

    return apiSuccess({
      success: true,
      data: {
        message: `Reminders sent to ${sentCount} students`,
        sent_count: sentCount,
        failed_count: failedCount,
        total_incomplete: incompleteAssignments.length,
        email_logs: emailLogs.map((log: any) => ({
          id: log.id,
          student_email: log.recipient_email,
          status: log.status,
        })),
      },
    });
  } catch (error) {
    log.error('Error sending quiz reminders:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to send reminders');
  }
}

/**
 * Build reminder email with DailyAgile branding
 */
function buildReminderEmail({
  studentName,
  quizTitle,
  quizLink,
  deadline,
  customMessage,
}: {
  studentName: string;
  quizTitle: string;
  quizLink?: string;
  deadline?: string;
  customMessage?: string;
}): { subject: string; html: string; text: string } {
  const deadlineText = deadline
    ? new Date(deadline).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const subject = `Reminder: Complete "${quizTitle}" - DailyAgile`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Calibri, sans-serif; color: #1E293B; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1E3A5F; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; font-family: Cambria, serif; }
          .content { background-color: #F0F7FA; padding: 20px; }
          .cta-button { display: inline-block; background-color: #0891B2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .deadline { background-color: #FEE2E2; padding: 12px; border-left: 4px solid #EA580C; margin: 15px 0; }
          .footer { font-size: 12px; color: #64748B; text-align: center; padding-top: 20px; border-top: 1px solid #E2E8F0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Quiz Reminder</h1>
          </div>
          <div class="content">
            <p>Hi ${studentName},</p>

            <p>This is a reminder to complete the quiz <strong>"${quizTitle}"</strong> on DailyAgile.</p>

            ${customMessage ? `<p style="font-style: italic; background-color: white; padding: 12px; border-radius: 4px;">${customMessage}</p>` : ''}

            ${
              quizLink
                ? `<a href="${quizLink}" class="cta-button">Take Quiz Now</a>`
                : ''
            }

            ${
              deadlineText
                ? `
              <div class="deadline">
                <strong>📅 Deadline:</strong> ${deadlineText}
                <br/>
                Please complete this quiz before the deadline to avoid missing it.
              </div>
            `
                : ''
            }

            <p>If you have any questions, please reach out to your instructor.</p>

            <p>Best regards,<br/>The DailyAgile Team</p>
          </div>
          <div class="footer">
            <p>DailyAgile - Accelerate Business Agility</p>
            <p><a href="https://dailyagile.com" style="color: #0891B2; text-decoration: none;">Visit DailyAgile</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hi ${studentName},

This is a reminder to complete the quiz "${quizTitle}" on DailyAgile.

${customMessage ? `Message from your instructor:\n${customMessage}\n` : ''}

${quizLink ? `Take Quiz Now:\n${quizLink}\n` : ''}

${deadlineText ? `Deadline: ${deadlineText}\n\nPlease complete this quiz before the deadline to avoid missing it.\n` : ''}

If you have any questions, please reach out to your instructor.

Best regards,
The DailyAgile Team

---
DailyAgile - Accelerate Business Agility
https://dailyagile.com
  `;

  return { subject, html, text };
}
