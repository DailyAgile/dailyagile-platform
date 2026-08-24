/**
 * TEST ENDPOINT: Send Test Email
 * POST /api/test/send-email
 *
 * Used to verify email templates work correctly
 * SHOULD ONLY BE AVAILABLE IN DEVELOPMENT
 *
 * Body: {
 *   type: 'signup-verification' | 'resend-verification' | ... (12 types total)
 *   testEmail: 'test@example.com'
 * }
 */

import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { sendNotificationEmail, EmailTemplateType } from '@/lib/email/send-notification';

const log = createLogger('TestEmail');

interface TestEmailRequest {
  type: EmailTemplateType;
  testEmail: string;
}

/**
 * Send test email
 */
export async function POST(req: NextRequest): Promise<Response> {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return apiError('FORBIDDEN', 403, 'Test endpoint not available in production');
  }

  try {
    const body = (await req.json()) as TestEmailRequest;
    const { type, testEmail } = body;

    if (!type || !testEmail) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'type and testEmail are required');
    }

    // Validate email format
    if (!testEmail.includes('@')) {
      return apiError('INVALID_REQUEST', 400, 'Invalid email format');
    }

    log.info(`Sending test email: ${type} to ${testEmail}`);

    let result;

    // Generate test data based on template type
    switch (type) {
      case 'signup-verification':
        result = await sendNotificationEmail(type, {
          email: testEmail,
          firstName: 'Test User',
          verificationCode: '123456',
          expiryMinutes: 10,
        });
        break;

      case 'resend-verification':
        result = await sendNotificationEmail(type, {
          email: testEmail,
          firstName: 'Test User',
          verificationCode: '654321',
          expiryMinutes: 10,
        });
        break;

      case 'email-verified-welcome':
        result = await sendNotificationEmail(type, {
          email: testEmail,
          firstName: 'Test User',
        });
        break;

      case 'enrollment-invite':
        result = await sendNotificationEmail(type, {
          email: testEmail,
          firstName: 'Test User',
          classroomName: 'AI for Business Professionals',
          instructorName: 'Dr. Jane Smith',
          joinLink: 'https://dailyagile.com/classrooms/test-123',
          startDate: 'August 15, 2026',
        });
        break;

      case 'quiz-complete':
        result = await sendNotificationEmail(type, {
          email: testEmail,
          firstName: 'Test User',
          quizTitle: 'Module 1: What AI Actually Is',
          score: 85,
          maxScore: 100,
          classroomName: 'AI Fundamentals',
        });
        break;

      case 'grade-published':
        result = await sendNotificationEmail(type, {
          email: testEmail,
          firstName: 'Test User',
          quizTitle: 'Module 1: What AI Actually Is',
          feedback: 'Excellent work! Your analysis demonstrates a solid understanding of AI concepts.',
          score: 90,
          maxScore: 100,
          reviewLink: 'https://dailyagile.com/submissions/test-123',
        });
        break;

      case 'certificate-awarded':
        result = await sendNotificationEmail(type, {
          email: testEmail,
          firstName: 'Test User',
          courseName: 'AI for Business Professionals',
          completionDate: 'August 14, 2026',
          certificateLink: 'https://dailyagile.com/certificates/CERT-TEST-123',
          shareLink: 'https://www.linkedin.com/feed/',
        });
        break;

      case 'instructor-welcome':
        result = await sendNotificationEmail(type, {
          email: testEmail,
          firstName: 'Dr. Smith',
          tempPassword: 'TempPass@2026!',
          dashboardLink: 'https://dailyagile.com/instructor/dashboard',
          courses: ['AI for Business Professionals', 'AI Engineer Track'],
        });
        break;

      case 'bulk-upload-complete':
        result = await sendNotificationEmail(type, {
          email: testEmail,
          adminName: 'Admin Test',
          uploadId: 'upload-test-2026-001',
          rowCount: 100,
          successCount: 95,
          failureCount: 5,
          resultsLink: 'https://dailyagile.com/admin/bulk-uploads/test-123',
        });
        break;

      case 'course-completed':
        result = await sendNotificationEmail(type, {
          email: testEmail,
          firstName: 'Test User',
          courseName: 'AI for Business Professionals',
          completionDate: 'August 14, 2026',
          certificateLink: 'https://dailyagile.com/certificates/CERT-TEST-123',
          nextSteps: [
            'Explore the AI Engineer track',
            'Connect with other professionals',
            'Share your achievement on LinkedIn',
          ],
        });
        break;

      case 'password-reset':
        result = await sendNotificationEmail(type, {
          email: testEmail,
          firstName: 'Test User',
          resetLink: 'https://dailyagile.com/auth/reset?token=test-token-abc123xyz',
          expiryMinutes: 30,
        });
        break;

      case 'account-warning':
        result = await sendNotificationEmail(type, {
          email: testEmail,
          firstName: 'Test User',
          reason: 'Multiple failed login attempts detected on your account',
          actionRequired: 'Please reset your password or contact support if this was not you',
          supportLink: 'https://dailyagile.com/support',
        });
        break;

      default:
        return apiError('INVALID_REQUEST', 400, `Unknown email type: ${type}`);
    }

    log.info(`✅ Test email sent: ${type} to ${testEmail} (messageId: ${result})`);

    return apiSuccess({
      success: true,
      message: `Test email sent: ${type}`,
      email: testEmail,
      messageId: result,
      type,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to send test email:', message);
    return apiError('INTERNAL_ERROR', 500, `Failed to send test email: ${message}`);
  }
}
