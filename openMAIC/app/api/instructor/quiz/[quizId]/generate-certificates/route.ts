/**
 * POST /api/instructor/quiz/[quizId]/generate-certificates
 * Generate PDF certificates for students who passed the quiz and email them
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { generateCertificatePDF } from '@/lib/certificates/pdf-generator';
import { sendEmail } from '@/lib/server/email-service';
import fs from 'fs';
import path from 'path';
import os from 'os';

const log = createLogger('GenerateCertificatesAPI');

interface GenerateCertificatesRequest {
  send_email?: boolean;
  passing_score_threshold?: number;
}

interface CertificateGenerationResult {
  id: string;
  student_id: string;
  student_email: string;
  student_name: string;
  score: number;
  generated_at: string;
  emailed_at?: string;
  email_error?: string;
  certificate_url?: string;
}

/**
 * Generate certificates for passing students
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
): Promise<Response> {
  try {
    // Authenticate instructor
    const instructor = await requireInstructor(req);
    const { quizId } = await params;

    if (!quizId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'quizId is required');
    }

    const body = (await req.json()) as GenerateCertificatesRequest;
    const sendEmail_ = body.send_email !== false; // Default to true
    const passingThreshold = body.passing_score_threshold || 70;

    const supabase = getSupabaseClient();

    // Verify instructor owns this quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, instructor_id, passing_score')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return apiError('NOT_FOUND', 404, 'Quiz not found');
    }

    if (quiz.instructor_id !== instructor.id) {
      return apiError('FORBIDDEN', 403, 'You do not have permission to generate certificates for this quiz');
    }

    // Get all passing attempts for this quiz
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('id, student_id, score, percentage, completed_at')
      .eq('quiz_id', quizId)
      .gte('percentage', passingThreshold)
      .order('completed_at', { ascending: false });

    if (attemptsError) {
      log.error('Error fetching quiz attempts:', attemptsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch quiz attempts');
    }

    if (!attempts || attempts.length === 0) {
      return apiSuccess({
        success: true,
        data: {
          generated_count: 0,
          emailed_count: 0,
          failed_count: 0,
          certificates: [],
          message: 'No passing attempts found',
        },
      });
    }

    // Get student data for all passing attempts
    const studentIds = [...new Set(attempts.map((a: { student_id: string }) => a.student_id))];
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, email, first_name, last_name')
      .in('id', studentIds);

    if (studentsError) {
      log.error('Error fetching students:', studentsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch student data');
    }

    const studentMap = new Map<string, { id: string; email: string; first_name?: string; last_name?: string }>(
      students?.map((s: { id: string; email: string; first_name?: string; last_name?: string }) => [s.id, s]) || []
    );

    // Generate certificates
    const results: CertificateGenerationResult[] = [];
    const tempDir = os.tmpdir();

    for (const attempt of attempts) {
      const student = studentMap.get(attempt.student_id);
      if (!student) {
        log.warn(`Student not found for attempt: ${attempt.id}`);
        continue;
      }

      try {
        // Generate certificate ID
        const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const completionDate = new Date(attempt.completed_at).toISOString().split('T')[0];
        const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email;

        // Generate PDF
        const pdfStream = await generateCertificatePDF({
          studentName,
          quizTitle: quiz.title,
          score: attempt.percentage || 0,
          maxScore: 100,
          completionDate,
          certificateId,
        });

        // Save PDF to temporary location
        const pdfFileName = `${certificateId}.pdf`;
        const pdfPath = path.join(tempDir, pdfFileName);
        const writeStream = fs.createWriteStream(pdfPath);

        // Convert stream to promise
        const pdfGenerated = new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = [];
          pdfStream.on('data', (chunk) => {
            chunks.push(chunk);
            writeStream.write(chunk);
          });
          pdfStream.on('end', () => {
            writeStream.end();
            resolve(Buffer.concat(chunks));
          });
          pdfStream.on('error', reject);
          writeStream.on('error', reject);
        });

        const pdfBuffer = await pdfGenerated;

        // Store certificate in database
        const { data: cert, error: certError } = await supabase
          .from('certificates')
          .insert({
            student_id: attempt.student_id,
            quiz_id: quizId,
            certificate_id: certificateId,
            score: attempt.percentage || 0,
            student_name: studentName,
            quiz_title: quiz.title,
            completion_date: completionDate,
            certificate_url: `/certificates/${certificateId}.pdf`,
            generated_at: new Date().toISOString(),
            pdf_generated: true,
          })
          .select()
          .single();

        if (certError) {
          log.error(`Failed to store certificate for ${student.email}:`, certError);
          results.push({
            id: certificateId,
            student_id: attempt.student_id,
            student_email: student.email,
            student_name: studentName,
            score: attempt.percentage || 0,
            generated_at: new Date().toISOString(),
            email_error: 'Failed to store in database',
          });
          continue;
        }

        // Send email if requested
        let emailedAt: string | undefined;
        let emailError: string | undefined;

        if (sendEmail_) {
          try {
            const emailBody = `
              <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <!-- Header -->
                    <div style="background-color: #1E3A5F; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                      <h1 style="margin: 0; font-size: 24px;">Congratulations!</h1>
                    </div>

                    <!-- Content -->
                    <div style="padding: 30px; background-color: #F0F7FA;">
                      <p>Dear ${escapeHtml(studentName)},</p>

                      <p>We're pleased to inform you that you have successfully completed the quiz:</p>

                      <h2 style="color: #1E3A5F; border-bottom: 2px solid #0891B2; padding-bottom: 10px;">
                        ${escapeHtml(quiz.title)}
                      </h2>

                      <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Your Score:</strong> ${attempt.percentage || 0}%</p>
                        <p><strong>Completion Date:</strong> ${new Date(attempt.completed_at).toLocaleDateString('en-US')}</p>
                      </div>

                      <p>Your certificate is attached. You can also view it at any time by logging into your account.</p>

                      <div style="background-color: #0891B2; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dailyagile.com'}/certificates/${certificateId}" style="color: white; text-decoration: none;">
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
              toEmail: student.email,
              subject: `🎉 Certificate - ${quiz.title}`,
              htmlBody: emailBody,
            });

            emailedAt = new Date().toISOString();
            log.info(`Certificate emailed to ${student.email}`);
          } catch (emailErr) {
            emailError = emailErr instanceof Error ? emailErr.message : 'Unknown error';
            log.warn(`Failed to email certificate to ${student.email}:`, emailErr);
          }
        }

        // Update certificate with email status
        if (emailedAt) {
          await supabase
            .from('certificates')
            .update({ emailed_at: emailedAt })
            .eq('id', cert.id);
        } else if (emailError) {
          await supabase
            .from('certificates')
            .update({ email_error: emailError })
            .eq('id', cert.id);
        }

        results.push({
          id: cert.id,
          student_id: attempt.student_id,
          student_email: student.email,
          student_name: studentName,
          score: attempt.percentage || 0,
          generated_at: cert.generated_at,
          emailed_at: emailedAt,
          email_error: emailError,
          certificate_url: cert.certificate_url,
        });

        // Clean up temp file
        try {
          fs.unlinkSync(pdfPath);
        } catch (e) {
          log.warn(`Failed to clean up temp file: ${pdfPath}`, e);
        }
      } catch (error) {
        log.error(`Error generating certificate for student ${attempt.student_id}:`, error);
        results.push({
          id: '',
          student_id: attempt.student_id,
          student_email: studentMap.get(attempt.student_id)?.email || 'unknown',
          student_name: studentMap.get(attempt.student_id)?.first_name || 'Unknown',
          score: attempt.percentage || 0,
          generated_at: new Date().toISOString(),
          email_error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successResults = results.filter((r) => !r.email_error && r.id);
    const emailedResults = successResults.filter((r) => r.emailed_at);

    return apiSuccess({
      success: true,
      data: {
        generated_count: successResults.length,
        emailed_count: emailedResults.length,
        failed_count: results.length - successResults.length,
        certificates: results,
        message: `${successResults.length} certificates generated, ${emailedResults.length} emailed`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('auth')) {
      const { status, message } = handleAuthError(error);
      return apiError('UNAUTHORIZED', status, message);
    }

    log.error('Error generating certificates:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to generate certificates');
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
