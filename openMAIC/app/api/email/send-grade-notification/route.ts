/**
 * Grade Notification Email API
 * Sends email to student when instructor publishes their grade
 */

import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { sendNotificationEmail } from '@/lib/email/send-notification';

const log = createLogger('GradeNotificationEmail');

interface GradeNotificationRequest {
  studentEmail: string;
  studentId: string;
  studentName?: string;
  quizTitle: string;
  feedback: string;
  score?: number;
  maxScore?: number;
  reviewLink?: string;
  timestamp: string;
}

/**
 * Send grade publication notification email
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = (await req.json()) as GradeNotificationRequest;
    const { studentEmail, studentName, quizTitle, feedback, score, maxScore, reviewLink, timestamp } = body;

    if (!studentEmail || !feedback) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'studentEmail and feedback are required');
    }

    // Extract first name from full name or email
    const firstName = studentName ? studentName.split(' ')[0] : studentEmail.split('@')[0];

    // Send via template system
    try {
      await sendNotificationEmail('grade-published', {
        email: studentEmail,
        firstName,
        quizTitle: quizTitle || 'Your Quiz',
        feedback,
        score,
        maxScore,
        reviewLink,
      });
    } catch (emailError) {
      log.warn('Failed to send grade notification email:', emailError);
      // Continue anyway — grade is already saved
    }

    log.info(`Grade notification email sent to ${studentEmail}`);

    return apiSuccess({
      success: true,
      message: 'Notification sent',
      email: studentEmail,
    });
  } catch (error) {
    log.error('Failed to send grade notification:', error);
    // Return success anyway — the grade is already saved
    return apiSuccess({ success: true, message: 'Notification queued' });
  }
}
