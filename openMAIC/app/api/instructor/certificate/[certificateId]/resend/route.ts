/**
 * POST /api/instructor/certificate/[certificateId]/resend
 * Resend a generated certificate to a student via email
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { sendEmail } from '@/lib/server/email-service';

const log = createLogger('ResendCertificateAPI');

interface ResendCertificateRequest {
  student_email?: string;
}

/**
 * Resend certificate email to student
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
): Promise<Response> {
  try {
    // Authenticate instructor
    const instructor = await requireInstructor(req);
    const { certificateId } = await params;

    if (!certificateId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'certificateId is required');
    }

    const body = (await req.json()) as ResendCertificateRequest;
    const supabase = getSupabaseClient();

    // Get certificate
    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .select('id, student_id, quiz_id, quiz_title, student_name, score, completion_date, certificate_id, certificate_url')
      .eq('id', certificateId)
      .single();

    if (certError || !certificate) {
      return apiError('NOT_FOUND', 404, 'Certificate not found');
    }

    // Verify instructor owns the quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, instructor_id, title')
      .eq('id', certificate.quiz_id)
      .single();

    if (quizError || !quiz) {
      return apiError('NOT_FOUND', 404, 'Quiz not found');
    }

    if (quiz.instructor_id !== instructor.id) {
      return apiError('FORBIDDEN', 403, 'You do not have permission to resend this certificate');
    }

    // Get student email
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, email, first_name, last_name')
      .eq('id', certificate.student_id)
      .single();

    if (studentError || !student) {
      return apiError('NOT_FOUND', 404, 'Student not found');
    }

    // Use provided email or student's email
    const recipientEmail = body.student_email || student.email;

    // Send certificate email
    try {
      const emailBody = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <!-- Header -->
              <div style="background-color: #1E3A5F; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Your Certificate</h1>
              </div>

              <!-- Content -->
              <div style="padding: 30px; background-color: #F0F7FA;">
                <p>Dear ${escapeHtml(certificate.student_name)},</p>

                <p>This is your certificate for completing:</p>

                <h2 style="color: #1E3A5F; border-bottom: 2px solid #0891B2; padding-bottom: 10px;">
                  ${escapeHtml(certificate.quiz_title)}
                </h2>

                <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Your Score:</strong> ${certificate.score}%</p>
                  <p><strong>Completion Date:</strong> ${new Date(certificate.completion_date).toLocaleDateString('en-US')}</p>
                  <p><strong>Certificate ID:</strong> ${escapeHtml(certificate.certificate_id)}</p>
                </div>

                <div style="background-color: #0891B2; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dailyagile.com'}/certificates/${certificate.certificate_id}" style="color: white; text-decoration: none;">
                    <strong>View Certificate</strong>
                  </a>
                </div>

                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

                <p style="font-size: 12px; color: #666;">
                  Share your achievement on LinkedIn and inspire your network!
                </p>
              </div>

              <!-- Footer -->
              <div style="background-color: #1E3A5F; color: white; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">© DailyAgile — Accelerate Business Agility</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await sendEmail({
        toEmail: recipientEmail,
        subject: `🎉 Certificate - ${certificate.quiz_title}`,
        htmlBody: emailBody,
      });

      // Update certificate email status
      const emailedAt = new Date().toISOString();
      await supabase
        .from('certificates')
        .update({
          emailed_at: emailedAt,
          email_error: null,
        })
        .eq('id', certificate.id);

      log.info(`Certificate resent to ${recipientEmail}`);

      return apiSuccess({
        success: true,
        data: {
          certificate_id: certificate.id,
          student_email: recipientEmail,
          emailed_at: emailedAt,
          message: 'Certificate resent successfully',
        },
      });
    } catch (emailError) {
      const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
      log.error(`Failed to resend certificate to ${recipientEmail}:`, emailError);

      // Log email error in database
      await supabase
        .from('certificates')
        .update({
          email_error: errorMessage,
        })
        .eq('id', certificate.id);

      return apiError('EMAIL_SEND_FAILED', 500, `Failed to send email: ${errorMessage}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('auth')) {
      const { status, message } = handleAuthError(error);
      return apiError('UNAUTHORIZED', status, message);
    }

    log.error('Error resending certificate:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to resend certificate');
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
