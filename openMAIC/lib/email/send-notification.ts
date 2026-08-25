/**
 * Email Notification System
 * Central hub for all transactional emails using Brevo/Sendinblue
 * Supports 12+ notification types with DailyAgile branding
 *
 * Template types:
 * - signup-verification: Email verification code for new signups
 * - resend-verification: Resending verification code
 * - email-verified-welcome: Welcome email after successful verification
 * - enrollment-invite: Classroom enrollment invitation
 * - quiz-complete: Quiz completion notification
 * - grade-published: Grade publication notification
 * - certificate-awarded: Certificate delivery email
 * - instructor-welcome: Welcome email for new instructors
 * - bulk-upload-complete: Admin notification of bulk upload completion
 * - course-completed: Course completion with certificate
 * - password-reset: Password reset link (if implemented)
 * - account-warning: Account suspension/warning notification
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('EmailNotification');

// Brevo API configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@dailyagile.com';
const SENDER_NAME = 'DailyAgile';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dailyagile.com';

/**
 * Email template type definitions
 */
export type EmailTemplateType =
  | 'signup-verification'
  | 'resend-verification'
  | 'email-verified-welcome'
  | 'enrollment-invite'
  | 'quiz-complete'
  | 'grade-published'
  | 'certificate-awarded'
  | 'instructor-welcome'
  | 'bulk-upload-complete'
  | 'course-completed'
  | 'password-reset'
  | 'account-warning'
  | 'account-deletion-requested'
  | 'account-deletion-cancelled'
  | 'account-deleted-confirmed'
  | 'data-export-ready'
  | 'consent-withdrawn'
  | 'privacy-policy-accepted'
  | 'ccpa-data-access-no-account'
  | 'ccpa-data-access-received'
  | 'ccpa-deletion-no-account'
  | 'ccpa-deletion-received';

/**
 * Template-specific data types
 */
export interface EmailTemplateData {
  'signup-verification': {
    email: string;
    firstName: string;
    verificationCode: string;
    expiryMinutes?: number;
  };
  'resend-verification': {
    email: string;
    firstName: string;
    verificationCode: string;
    expiryMinutes?: number;
  };
  'email-verified-welcome': {
    email: string;
    firstName: string;
    lastLogin?: string;
  };
  'enrollment-invite': {
    email: string;
    firstName: string;
    classroomName: string;
    instructorName: string;
    joinLink?: string;
    startDate?: string;
  };
  'quiz-complete': {
    email: string;
    firstName: string;
    quizTitle: string;
    score: number;
    maxScore: number;
    classroomName: string;
  };
  'grade-published': {
    email: string;
    firstName: string;
    quizTitle: string;
    feedback: string;
    score?: number;
    maxScore?: number;
    reviewLink?: string;
  };
  'certificate-awarded': {
    email: string;
    firstName: string;
    courseName: string;
    completionDate: string;
    certificateLink: string;
    shareLink?: string;
  };
  'instructor-welcome': {
    email: string;
    firstName: string;
    tempPassword?: string;
    dashboardLink?: string;
    courses?: string[];
  };
  'bulk-upload-complete': {
    email: string;
    adminName: string;
    uploadId: string;
    rowCount: number;
    successCount: number;
    failureCount: number;
    resultsLink?: string;
  };
  'course-completed': {
    email: string;
    firstName: string;
    courseName: string;
    completionDate: string;
    certificateLink?: string;
    nextSteps?: string[];
  };
  'password-reset': {
    email: string;
    firstName: string;
    resetLink: string;
    expiryMinutes?: number;
  };
  'account-warning': {
    email: string;
    firstName: string;
    reason: string;
    actionRequired?: string;
    supportLink?: string;
  };
  'account-deletion-requested': {
    email: string;
    firstName?: string;
    gracePeriodDays?: number;
    confirmLink?: string;
    willBeDeletedAt?: string;
  };
  'account-deletion-cancelled': {
    email: string;
    firstName: string;
  };
  'account-deleted-confirmed': {
    email: string;
    firstName?: string;
    deletionDate?: string;
    deletedAt?: string;
  };
  'data-export-ready': {
    email: string;
    firstName: string;
    downloadLink: string;
    expiryHours?: number;
  };
  'consent-withdrawn': {
    email: string;
    firstName: string;
    consentType: string;
  };
  'privacy-policy-accepted': {
    email: string;
    firstName: string;
    acceptedDate: string;
    policyVersion?: string;
  };
  'ccpa-data-access-no-account': {
    email: string;
    supportEmail?: string;
  };
  'ccpa-data-access-received': {
    email: string;
    requestId: string;
    responseDeadline: string;
    supportEmail?: string;
  };
  'ccpa-deletion-no-account': {
    email: string;
    requestId?: string;
    responseDeadline?: string;
    supportEmail?: string;
  };
  'ccpa-deletion-received': {
    email: string;
    requestId?: string;
    responseDeadline?: string;
    supportEmail?: string;
    gracePeriodDays?: number;
  };
}

/**
 * Validate email configuration
 */
function validateConfiguration(): boolean {
  if (!BREVO_API_KEY) {
    log.warn('BREVO_API_KEY not configured. Email delivery will fail.');
    return false;
  }
  return true;
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

/**
 * Generic email sender via Brevo API
 */
async function sendViaBrevo(params: {
  toEmail: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}): Promise<string> {
  if (!validateConfiguration()) {
    log.warn(`[FALLBACK] Email to ${params.toEmail}: ${params.subject}`);
    return 'fallback-mode';
  }

  try {
    const payload = {
      sender: {
        email: SENDER_EMAIL,
        name: SENDER_NAME,
      },
      to: [{ email: params.toEmail }],
      subject: params.subject,
      htmlContent: params.htmlContent,
      textContent: params.textContent,
    };

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as any;
      const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
      throw new Error(`Brevo API error: ${errorMessage}`);
    }

    const data = (await response.json()) as any;
    if (!data.messageId) {
      throw new Error('Brevo did not return a messageId');
    }

    log.info(`✅ Email sent to ${params.toEmail} (messageId: ${data.messageId})`);
    return data.messageId;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`Failed to send email to ${params.toEmail}: ${message}`);
    throw error;
  }
}

/**
 * Email header component (DailyAgile branding)
 */
function getEmailHeader(title: string): string {
  return `
<div style="background: linear-gradient(135deg, #1E3A5F 0%, #0891B2 100%); color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
  <h1 style="margin: 0; font-size: 24px; font-weight: bold;">${escapeHtml(title)}</h1>
  <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">DailyAgile — Accelerate Business Agility</p>
</div>
  `.trim();
}

/**
 * Email footer component
 */
function getEmailFooter(): string {
  return `
<div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
  <p style="margin: 0 0 8px 0;">© ${new Date().getFullYear()} DailyAgile. All rights reserved.</p>
  <p style="margin: 0;">Accelerate Business Agility | <a href="${APP_URL}" style="color: #0891B2; text-decoration: none;">Visit Academy</a></p>
</div>
  `.trim();
}

/**
 * Email container wrapper with DailyAgile styles
 */
function wrapEmailTemplate(header: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .cta-button { display: inline-block; background: #0891B2; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: 500; margin: 16px 0; }
    .cta-button:hover { background: #06B6D4; }
    .code-box { background: #f0f7fa; border-left: 4px solid #0891B2; padding: 16px; margin: 16px 0; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #1E3A5F; text-align: center; letter-spacing: 2px; }
    .section { margin-bottom: 20px; }
    .label { font-weight: 600; color: #1E3A5F; margin-bottom: 8px; }
    .text-muted { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    ${header}
    <div style="padding: 24px;">
      ${content}
    </div>
    ${getEmailFooter()}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Template generators - each returns { subject, html, text }
 */

function generateSignupVerification(
  data: EmailTemplateData['signup-verification'],
): { subject: string; html: string; text: string } {
  const expiryMinutes = data.expiryMinutes || 10;
  const content = `
<div class="section">
  <p>Hi ${escapeHtml(data.firstName)},</p>
  <p>Welcome to DailyAgile! Verify your email to get started with our interactive AI learning platform.</p>
</div>

<div class="section">
  <div class="label">Your Verification Code:</div>
  <div class="code-box">${escapeHtml(data.verificationCode)}</div>
  <p style="text-align: center; color: #E74C3C; font-weight: bold;">⏰ Expires in ${expiryMinutes} minutes</p>
</div>

<div class="section">
  <p><a href="${APP_URL}" class="cta-button">Enter Verification Code</a></p>
</div>

<div class="section">
  <p style="font-size: 12px; color: #999;">If you didn't sign up for DailyAgile, please ignore this email.</p>
</div>
  `.trim();

  const textContent = `
Welcome to DailyAgile!

Your Verification Code: ${data.verificationCode}

⏰ Expires in ${expiryMinutes} minutes

Visit: ${APP_URL}

If you didn't sign up, please ignore this email.
  `.trim();

  return {
    subject: '✅ Verify Your DailyAgile Email',
    html: wrapEmailTemplate(getEmailHeader('Email Verification'), content),
    text: textContent,
  };
}

function generateResendVerification(
  data: EmailTemplateData['resend-verification'],
): { subject: string; html: string; text: string } {
  const expiryMinutes = data.expiryMinutes || 10;
  const content = `
<div class="section">
  <p>Hi ${escapeHtml(data.firstName)},</p>
  <p>Here's your new verification code. Please use it to complete your email verification.</p>
</div>

<div class="section">
  <div class="label">Your New Verification Code:</div>
  <div class="code-box">${escapeHtml(data.verificationCode)}</div>
  <p style="text-align: center; color: #E74C3C; font-weight: bold;">⏰ Expires in ${expiryMinutes} minutes</p>
</div>

<div class="section">
  <p><a href="${APP_URL}" class="cta-button">Verify Now</a></p>
</div>
  `.trim();

  const textContent = `
Resend Verification Code

Your New Code: ${data.verificationCode}

⏰ Expires in ${expiryMinutes} minutes

Visit: ${APP_URL}
  `.trim();

  return {
    subject: '🔄 New Verification Code - DailyAgile',
    html: wrapEmailTemplate(getEmailHeader('New Verification Code'), content),
    text: textContent,
  };
}

function generateEmailVerifiedWelcome(
  data: EmailTemplateData['email-verified-welcome'],
): { subject: string; html: string; text: string } {
  const content = `
<div class="section">
  <p>Hi ${escapeHtml(data.firstName)},</p>
  <p>🎉 Your email has been verified! Welcome to DailyAgile.</p>
  <p>You're now ready to start learning AI and Agile from industry experts. Explore our interactive courses and accelerate your business agility.</p>
</div>

<div class="section">
  <p><a href="${APP_URL}/academy" class="cta-button">Start Learning Now</a></p>
</div>

<div class="section">
  <p><strong>What's next?</strong></p>
  <ul style="margin: 12px 0; padding-left: 20px;">
    <li>Browse our AI and Agile course catalog</li>
    <li>Complete your first module to unlock certificates</li>
    <li>Join interactive classroom sessions</li>
  </ul>
</div>

<div class="section">
  <p class="text-muted">Have questions? Contact support@dailyagile.com</p>
</div>
  `.trim();

  const textContent = `
Welcome to DailyAgile!

Your email has been verified. You're now ready to start learning.

Visit: ${APP_URL}/academy

Start exploring our AI and Agile courses today!
  `.trim();

  return {
    subject: '🎉 Welcome to DailyAgile Academy',
    html: wrapEmailTemplate(getEmailHeader('Welcome to DailyAgile'), content),
    text: textContent,
  };
}

function generateEnrollmentInvite(
  data: EmailTemplateData['enrollment-invite'],
): { subject: string; html: string; text: string } {
  const joinLink = data.joinLink || `${APP_URL}/classrooms`;
  const content = `
<div class="section">
  <p>Hi ${escapeHtml(data.firstName)},</p>
  <p>${escapeHtml(data.instructorName)} has invited you to join the classroom: <strong>${escapeHtml(data.classroomName)}</strong></p>
</div>

${data.startDate ? `
<div class="section">
  <div class="label">📅 Start Date</div>
  <p>${escapeHtml(data.startDate)}</p>
</div>
` : ''}

<div class="section">
  <p><a href="${joinLink}" class="cta-button">Join Classroom</a></p>
</div>

<div class="section">
  <p>Once you join, you'll have access to:</p>
  <ul style="margin: 12px 0; padding-left: 20px;">
    <li>Interactive lessons and activities</li>
    <li>Quizzes and assignments</li>
    <li>Live instructor feedback</li>
    <li>Progress tracking and certificates</li>
  </ul>
</div>
  `.trim();

  const textContent = `
Classroom Enrollment Invitation

You've been invited to: ${data.classroomName}
Instructor: ${data.instructorName}

${data.startDate ? `Start Date: ${data.startDate}\n` : ''}

Join: ${joinLink}
  `.trim();

  return {
    subject: `📚 Join ${data.classroomName} - DailyAgile`,
    html: wrapEmailTemplate(getEmailHeader('Classroom Invitation'), content),
    text: textContent,
  };
}

function generateQuizComplete(
  data: EmailTemplateData['quiz-complete'],
): { subject: string; html: string; text: string } {
  const percentage = Math.round((data.score / data.maxScore) * 100);
  const content = `
<div class="section">
  <p>Hi ${escapeHtml(data.firstName)},</p>
  <p>Great job! You've completed the quiz: <strong>${escapeHtml(data.quizTitle)}</strong></p>
</div>

<div class="section">
  <div class="label">📊 Your Score</div>
  <div style="background: #f0f7fa; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px; color: #666;">Score</p>
    <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: bold; color: #0891B2;">${data.score}/${data.maxScore}</p>
    <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">${percentage}% Correct</p>
  </div>
</div>

<div class="section">
  <p><a href="${APP_URL}/classrooms" class="cta-button">View Results</a></p>
</div>

<div class="section">
  <p>Your instructor will review your submission and provide detailed feedback soon.</p>
</div>
  `.trim();

  const textContent = `
Quiz Completed: ${data.quizTitle}

Your Score: ${data.score}/${data.maxScore} (${percentage}%)

Classroom: ${data.classroomName}

View results: ${APP_URL}/classrooms
  `.trim();

  return {
    subject: `✅ Quiz Complete: ${data.quizTitle}`,
    html: wrapEmailTemplate(getEmailHeader('Quiz Completed'), content),
    text: textContent,
  };
}

function generateGradePublished(
  data: EmailTemplateData['grade-published'],
): { subject: string; html: string; text: string } {
  const content = `
<div class="section">
  <p>Hi ${escapeHtml(data.firstName)},</p>
  <p>Your instructor has published feedback for: <strong>${escapeHtml(data.quizTitle)}</strong></p>
</div>

${data.score && data.maxScore ? `
<div class="section">
  <div class="label">📊 Grade</div>
  <p style="font-size: 18px; font-weight: bold; color: #0891B2;">${data.score}/${data.maxScore}</p>
</div>
` : ''}

<div class="section">
  <div class="label">📝 Instructor Feedback:</div>
  <div style="background: #f0f7fa; border-left: 4px solid #0891B2; padding: 16px; border-radius: 4px; margin: 12px 0;">
    ${data.feedback.split('\n').map(line => `<p style="margin: 8px 0;">${escapeHtml(line)}</p>`).join('')}
  </div>
</div>

<div class="section">
  <p><a href="${data.reviewLink || APP_URL}" class="cta-button">Review Full Feedback</a></p>
</div>
  `.trim();

  const textContent = `
Grade Published: ${data.quizTitle}

${data.score && data.maxScore ? `Grade: ${data.score}/${data.maxScore}\n\n` : ''}Instructor Feedback:
${data.feedback}

Review: ${data.reviewLink || APP_URL}
  `.trim();

  return {
    subject: `📬 Feedback on ${data.quizTitle}`,
    html: wrapEmailTemplate(getEmailHeader('Grade Published'), content),
    text: textContent,
  };
}

function generateCertificateAwarded(
  data: EmailTemplateData['certificate-awarded'],
): { subject: string; html: string; text: string } {
  const content = `
<div class="section">
  <p>Hi ${escapeHtml(data.firstName)},</p>
  <p>🎓 Congratulations! You've completed <strong>${escapeHtml(data.courseName)}</strong> and earned your certificate!</p>
</div>

<div class="section">
  <div class="label">📜 Certificate Details</div>
  <p><strong>Course:</strong> ${escapeHtml(data.courseName)}</p>
  <p><strong>Completed:</strong> ${data.completionDate}</p>
</div>

<div class="section">
  <p><a href="${data.certificateLink}" class="cta-button">Download Certificate</a></p>
</div>

${data.shareLink ? `
<div class="section">
  <p><a href="${data.shareLink}" style="color: #0891B2; text-decoration: none; font-weight: 500;">📤 Share on LinkedIn</a></p>
</div>
` : ''}

<div class="section">
  <p><strong>What's next?</strong></p>
  <ul style="margin: 12px 0; padding-left: 20px;">
    <li>Explore related courses to expand your skills</li>
    <li>Add your certificate to your LinkedIn profile</li>
    <li>Recommend DailyAgile to your network</li>
  </ul>
</div>
  `.trim();

  const textContent = `
Certificate Awarded!

Congratulations on completing: ${data.courseName}

Completed: ${data.completionDate}

Download: ${data.certificateLink}

${data.shareLink ? `Share: ${data.shareLink}\n` : ''}
  `.trim();

  return {
    subject: '🎓 Certificate Awarded - ' + data.courseName,
    html: wrapEmailTemplate(getEmailHeader('Certificate Awarded'), content),
    text: textContent,
  };
}

function generateInstructorWelcome(
  data: EmailTemplateData['instructor-welcome'],
): { subject: string; html: string; text: string } {
  const dashboardLink = data.dashboardLink || `${APP_URL}/instructor`;
  const content = `
<div class="section">
  <p>Hi ${escapeHtml(data.firstName)},</p>
  <p>Welcome to DailyAgile! Your instructor account has been created and is ready to use.</p>
</div>

${data.tempPassword ? `
<div class="section">
  <div class="label">🔐 Temporary Password</div>
  <div class="code-box">${escapeHtml(data.tempPassword)}</div>
  <p style="color: #E74C3C; font-weight: bold;">⚠️ Change this password on first login</p>
</div>
` : ''}

<div class="section">
  <p><a href="${dashboardLink}" class="cta-button">Access Dashboard</a></p>
</div>

${data.courses && data.courses.length > 0 ? `
<div class="section">
  <div class="label">📚 Your Courses</div>
  <ul style="margin: 12px 0; padding-left: 20px;">
    ${data.courses.map(course => `<li>${escapeHtml(course)}</li>`).join('')}
  </ul>
</div>
` : ''}

<div class="section">
  <p><strong>Quick Start:</strong></p>
  <ul style="margin: 12px 0; padding-left: 20px;">
    <li>Review your course materials and student roster</li>
    <li>Set up your grading preferences</li>
    <li>Schedule office hours if applicable</li>
  </ul>
</div>

<div class="section">
  <p class="text-muted">Need help? Contact support@dailyagile.com</p>
</div>
  `.trim();

  const textContent = `
Welcome to DailyAgile - Instructor Account

Your instructor account has been created.

${data.tempPassword ? `Temporary Password: ${data.tempPassword}\n\nChange this on first login.\n\n` : ''}Dashboard: ${dashboardLink}

${data.courses && data.courses.length > 0 ? `Your Courses:\n${data.courses.map(c => `- ${c}`).join('\n')}\n\n` : ''}Support: support@dailyagile.com
  `.trim();

  return {
    subject: '👋 Welcome to DailyAgile - Instructor Account',
    html: wrapEmailTemplate(getEmailHeader('Instructor Welcome'), content),
    text: textContent,
  };
}

function generateBulkUploadComplete(
  data: EmailTemplateData['bulk-upload-complete'],
): { subject: string; html: string; text: string } {
  const content = `
<div class="section">
  <p>Hi ${escapeHtml(data.adminName)},</p>
  <p>Your instructor bulk upload has completed processing.</p>
</div>

<div class="section">
  <div class="label">📊 Upload Summary</div>
  <div style="background: #f0f7fa; padding: 16px; border-radius: 8px; margin: 12px 0;">
    <p style="margin: 8px 0;"><strong>Upload ID:</strong> ${escapeHtml(data.uploadId)}</p>
    <p style="margin: 8px 0;"><strong>Total Rows:</strong> ${data.rowCount}</p>
    <p style="margin: 8px 0; color: #16a34a;"><strong>✅ Successful:</strong> ${data.successCount}</p>
    ${data.failureCount > 0 ? `<p style="margin: 8px 0; color: #E74C3C;"><strong>❌ Failed:</strong> ${data.failureCount}</p>` : ''}
  </div>
</div>

${data.resultsLink ? `
<div class="section">
  <p><a href="${data.resultsLink}" class="cta-button">View Detailed Results</a></p>
</div>
` : ''}

${data.failureCount > 0 ? `
<div class="section">
  <p style="color: #E74C3C; font-weight: bold;">⚠️ Some rows failed processing. Review the detailed results to see what needs to be corrected.</p>
</div>
` : ''}
  `.trim();

  const textContent = `
Bulk Upload Complete

Upload ID: ${data.uploadId}

Summary:
- Total Rows: ${data.rowCount}
- Successful: ${data.successCount}
${data.failureCount > 0 ? `- Failed: ${data.failureCount}\n` : ''}

${data.resultsLink ? `View Results: ${data.resultsLink}\n` : ''}
  `.trim();

  return {
    subject: '✅ Bulk Upload Complete - ' + data.uploadId,
    html: wrapEmailTemplate(getEmailHeader('Bulk Upload Complete'), content),
    text: textContent,
  };
}

function generateCourseCompleted(
  data: EmailTemplateData['course-completed'],
): { subject: string; html: string; text: string } {
  const content = `
<div class="section">
  <p>Hi ${escapeHtml(data.firstName)},</p>
  <p>🎉 Fantastic! You've successfully completed <strong>${escapeHtml(data.courseName)}</strong>!</p>
</div>

<div class="section">
  <div class="label">🏆 Achievement Unlocked</div>
  <p>Completed on: <strong>${data.completionDate}</strong></p>
</div>

${data.certificateLink ? `
<div class="section">
  <p><a href="${data.certificateLink}" class="cta-button">🎓 Get Your Certificate</a></p>
</div>
` : ''}

${data.nextSteps && data.nextSteps.length > 0 ? `
<div class="section">
  <div class="label">📚 Recommended Next Steps</div>
  <ul style="margin: 12px 0; padding-left: 20px;">
    ${data.nextSteps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
  </ul>
</div>
` : ''}

<div class="section">
  <p><strong>Share Your Achievement!</strong></p>
  <p>Let your network know about your new skills. Share your completion on LinkedIn and inspire others to learn.</p>
</div>
  `.trim();

  const textContent = `
Course Completed: ${data.courseName}

Completed: ${data.completionDate}

${data.certificateLink ? `Get Certificate: ${data.certificateLink}\n\n` : ''}${data.nextSteps && data.nextSteps.length > 0 ? `Next Steps:\n${data.nextSteps.map(s => `- ${s}`).join('\n')}\n\n` : ''}Share your achievement!
  `.trim();

  return {
    subject: `🎉 Course Completed: ${data.courseName}`,
    html: wrapEmailTemplate(getEmailHeader('Course Completed'), content),
    text: textContent,
  };
}

function generatePasswordReset(
  data: EmailTemplateData['password-reset'],
): { subject: string; html: string; text: string } {
  const expiryMinutes = data.expiryMinutes || 30;
  const content = `
<div class="section">
  <p>Hi ${escapeHtml(data.firstName)},</p>
  <p>We received a request to reset your DailyAgile password.</p>
</div>

<div class="section">
  <p><a href="${data.resetLink}" class="cta-button">Reset Password</a></p>
  <p style="text-align: center; color: #E74C3C; font-weight: bold;">⏰ Link expires in ${expiryMinutes} minutes</p>
</div>

<div class="section">
  <p>Or copy this link: <code style="background: #f0f7fa; padding: 4px 8px; border-radius: 4px; word-break: break-all;">${data.resetLink}</code></p>
</div>

<div class="section">
  <p style="color: #E74C3C; font-weight: bold;">🔒 If you didn't request a password reset, please ignore this email.</p>
</div>
  `.trim();

  const textContent = `
Password Reset Request

Click the link to reset your password:
${data.resetLink}

This link expires in ${expiryMinutes} minutes.

If you didn't request this, please ignore this email.
  `.trim();

  return {
    subject: '🔐 Reset Your DailyAgile Password',
    html: wrapEmailTemplate(getEmailHeader('Password Reset'), content),
    text: textContent,
  };
}

function generateAccountWarning(
  data: EmailTemplateData['account-warning'],
): { subject: string; html: string; text: string } {
  const content = `
<div class="section" style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 4px;">
  <p style="margin: 0;"><strong>⚠️ Account Alert</strong></p>
  <p style="margin: 8px 0 0 0;">${escapeHtml(data.reason)}</p>
</div>

<div class="section">
  <p>Hi ${escapeHtml(data.firstName)},</p>
  <p>We're reaching out regarding your DailyAgile account.</p>
</div>

${data.actionRequired ? `
<div class="section">
  <div class="label">⚠️ Action Required</div>
  <p>${escapeHtml(data.actionRequired)}</p>
</div>
` : ''}

${data.supportLink ? `
<div class="section">
  <p><a href="${data.supportLink}" class="cta-button">Get Help</a></p>
</div>
` : ''}

<div class="section">
  <p class="text-muted">Questions? Contact support@dailyagile.com</p>
</div>
  `.trim();

  const textContent = `
Account Alert

${data.reason}

${data.actionRequired ? `Action Required:\n${data.actionRequired}\n\n` : ''}${data.supportLink ? `Get Help: ${data.supportLink}\n\n` : ''}Support: support@dailyagile.com
  `.trim();

  return {
    subject: '⚠️ Account Alert - DailyAgile',
    html: wrapEmailTemplate(getEmailHeader('Account Alert'), content),
    text: textContent,
  };
}

/**
 * Main email sender function - routes to appropriate template
 */
export async function sendNotificationEmail<T extends EmailTemplateType>(
  type: T,
  data: EmailTemplateData[T],
  toEmail?: string,
): Promise<string> {
  try {
    // Ensure email is provided (from data.email in most cases)
    const email = toEmail || (data as any).email;
    if (!email) {
      throw new Error('No email address provided');
    }

    let emailContent;

    switch (type) {
      case 'signup-verification':
        emailContent = generateSignupVerification(data as EmailTemplateData['signup-verification']);
        break;
      case 'resend-verification':
        emailContent = generateResendVerification(data as EmailTemplateData['resend-verification']);
        break;
      case 'email-verified-welcome':
        emailContent = generateEmailVerifiedWelcome(data as EmailTemplateData['email-verified-welcome']);
        break;
      case 'enrollment-invite':
        emailContent = generateEnrollmentInvite(data as EmailTemplateData['enrollment-invite']);
        break;
      case 'quiz-complete':
        emailContent = generateQuizComplete(data as EmailTemplateData['quiz-complete']);
        break;
      case 'grade-published':
        emailContent = generateGradePublished(data as EmailTemplateData['grade-published']);
        break;
      case 'certificate-awarded':
        emailContent = generateCertificateAwarded(data as EmailTemplateData['certificate-awarded']);
        break;
      case 'instructor-welcome':
        emailContent = generateInstructorWelcome(data as EmailTemplateData['instructor-welcome']);
        break;
      case 'bulk-upload-complete':
        emailContent = generateBulkUploadComplete(data as EmailTemplateData['bulk-upload-complete']);
        break;
      case 'course-completed':
        emailContent = generateCourseCompleted(data as EmailTemplateData['course-completed']);
        break;
      case 'password-reset':
        emailContent = generatePasswordReset(data as EmailTemplateData['password-reset']);
        break;
      case 'account-warning':
        emailContent = generateAccountWarning(data as EmailTemplateData['account-warning']);
        break;
      default:
        throw new Error(`Unknown email template type: ${type}`);
    }

    // Send via Brevo
    const messageId = await sendViaBrevo({
      toEmail: email,
      subject: emailContent.subject,
      htmlContent: emailContent.html,
      textContent: emailContent.text,
    });

    log.info(`✅ ${type} email sent to ${email} (messageId: ${messageId})`);
    return messageId;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`Failed to send ${type} email:`, message);
    // Don't throw - allow caller to continue even if email fails
    return 'error-' + type;
  }
}
