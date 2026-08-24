/**
 * Email Template Testing and Verification
 * Simple script to test all 12 email notification templates
 *
 * Usage:
 *   npx ts-node lib/email/email-templates.test.ts
 *
 * Or test individual templates via API:
 *   POST /api/test/send-email
 *   Body: { type: 'signup-verification', testEmail: 'test@example.com' }
 */

import { sendNotificationEmail, EmailTemplateType } from './send-notification';

const TEST_EMAIL = process.env.TEST_EMAIL || 'test@dailyagile.com';

/**
 * Test all email templates
 */
export async function testAllEmailTemplates(): Promise<void> {
  const templates: Array<{ type: EmailTemplateType; label: string }> = [
    { type: 'signup-verification', label: 'Signup Verification' },
    { type: 'resend-verification', label: 'Resend Verification' },
    { type: 'email-verified-welcome', label: 'Email Verified Welcome' },
    { type: 'enrollment-invite', label: 'Enrollment Invite' },
    { type: 'quiz-complete', label: 'Quiz Complete' },
    { type: 'grade-published', label: 'Grade Published' },
    { type: 'certificate-awarded', label: 'Certificate Awarded' },
    { type: 'instructor-welcome', label: 'Instructor Welcome' },
    { type: 'bulk-upload-complete', label: 'Bulk Upload Complete' },
    { type: 'course-completed', label: 'Course Completed' },
    { type: 'password-reset', label: 'Password Reset' },
    { type: 'account-warning', label: 'Account Warning' },
  ];

  console.log('🧪 Testing DailyAgile Email Templates\n');
  console.log(`📧 Test email: ${TEST_EMAIL}\n`);

  for (const { type, label } of templates) {
    try {
      console.log(`Testing: ${label}...`);

      let result;
      switch (type) {
        case 'signup-verification':
          result = await sendNotificationEmail(type, {
            email: TEST_EMAIL,
            firstName: 'Test',
            verificationCode: '123456',
            expiryMinutes: 10,
          });
          break;

        case 'resend-verification':
          result = await sendNotificationEmail(type, {
            email: TEST_EMAIL,
            firstName: 'Test',
            verificationCode: '654321',
            expiryMinutes: 10,
          });
          break;

        case 'email-verified-welcome':
          result = await sendNotificationEmail(type, {
            email: TEST_EMAIL,
            firstName: 'Test',
          });
          break;

        case 'enrollment-invite':
          result = await sendNotificationEmail(type, {
            email: TEST_EMAIL,
            firstName: 'Test',
            classroomName: 'AI for Business Professionals',
            instructorName: 'Dr. Jane Smith',
            joinLink: 'https://dailyagile.com/classrooms/123',
            startDate: 'August 15, 2026',
          });
          break;

        case 'quiz-complete':
          result = await sendNotificationEmail(type, {
            email: TEST_EMAIL,
            firstName: 'Test',
            quizTitle: 'Module 1: What AI Actually Is',
            score: 85,
            maxScore: 100,
            classroomName: 'AI Fundamentals',
          });
          break;

        case 'grade-published':
          result = await sendNotificationEmail(type, {
            email: TEST_EMAIL,
            firstName: 'Test',
            quizTitle: 'Module 1: What AI Actually Is',
            feedback: 'Great job! Your understanding of AI concepts is solid.',
            score: 85,
            maxScore: 100,
            reviewLink: 'https://dailyagile.com/submissions/123',
          });
          break;

        case 'certificate-awarded':
          result = await sendNotificationEmail(type, {
            email: TEST_EMAIL,
            firstName: 'Test',
            courseName: 'AI for Business Professionals',
            completionDate: 'August 14, 2026',
            certificateLink: 'https://dailyagile.com/certificates/CERT-123',
            shareLink: 'https://www.linkedin.com/feed/update/urn:li:activity:123',
          });
          break;

        case 'instructor-welcome':
          result = await sendNotificationEmail(type, {
            email: TEST_EMAIL,
            firstName: 'Test',
            tempPassword: 'Temp@Pass123',
            dashboardLink: 'https://dailyagile.com/instructor',
            courses: [
              'AI for Business Professionals',
              'AI Engineer Track',
            ],
          });
          break;

        case 'bulk-upload-complete':
          result = await sendNotificationEmail(type, {
            email: TEST_EMAIL,
            adminName: 'Admin',
            uploadId: 'upload-2026-001',
            rowCount: 100,
            successCount: 95,
            failureCount: 5,
            resultsLink: 'https://dailyagile.com/admin/bulk-uploads/123',
          });
          break;

        case 'course-completed':
          result = await sendNotificationEmail(type, {
            email: TEST_EMAIL,
            firstName: 'Test',
            courseName: 'AI for Business Professionals',
            completionDate: 'August 14, 2026',
            certificateLink: 'https://dailyagile.com/certificates/CERT-123',
            nextSteps: [
              'Explore the AI Engineer track',
              'Connect with other professionals',
            ],
          });
          break;

        case 'password-reset':
          result = await sendNotificationEmail(type, {
            email: TEST_EMAIL,
            firstName: 'Test',
            resetLink: 'https://dailyagile.com/reset?token=abc123',
            expiryMinutes: 30,
          });
          break;

        case 'account-warning':
          result = await sendNotificationEmail(type, {
            email: TEST_EMAIL,
            firstName: 'Test',
            reason: 'Multiple failed login attempts detected',
            actionRequired:
              'Please reset your password or contact support',
            supportLink: 'https://dailyagile.com/support',
          });
          break;
      }

      console.log(`✅ ${label}: ${result}\n`);
    } catch (error) {
      console.error(`❌ ${label}: ${error}\n`);
    }
  }

  console.log('✅ All email templates tested');
}

// Run tests if executed directly
if (require.main === module) {
  testAllEmailTemplates().catch(console.error);
}

export default testAllEmailTemplates;
