/**
 * Email Service for Brevo (Sendinblue)
 * Sends transactional emails via Brevo API
 * Currently used for: 2FA codes for sensitive operations
 *
 * Brevo API Docs: https://developers.brevo.com/docs/send-transactional-email
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('EmailService');

// Brevo API configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER_EMAIL = 'noreply@dailyagile.com';
const SENDER_NAME = 'DailyAgile Security';

/**
 * Validate that email service is properly configured
 * Throws error if BREVO_API_KEY is missing
 */
function validateConfiguration() {
  if (!BREVO_API_KEY) {
    const msg = 'FATAL: BREVO_API_KEY environment variable is not set. Email delivery disabled.';
    log.error(msg);
    throw new Error(msg);
  }
}

interface EmailParams {
  toEmail: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

interface BrevoResponse {
  messageId?: string;
  error?: string;
  message?: string;
}

/**
 * Send email via Brevo API
 * @param params - Email parameters (toEmail, subject, htmlBody, textBody)
 * @returns messageId if successful, throws error if failed
 */
export async function sendEmail(params: EmailParams): Promise<string> {
  try {
    validateConfiguration();

    const { toEmail, subject, htmlBody, textBody } = params;

    // Validate email format (basic check)
    if (!toEmail || !toEmail.includes('@')) {
      throw new Error(`Invalid email address: ${toEmail}`);
    }

    // Build Brevo API request
    const payload = {
      sender: {
        email: SENDER_EMAIL,
        name: SENDER_NAME,
      },
      to: [
        {
          email: toEmail,
        },
      ],
      subject,
      htmlContent: htmlBody,
      textContent: textBody || htmlBody.replace(/<[^>]*>/g, ''), // Strip HTML if no text version
    };

    // Send via Brevo API
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as BrevoResponse;
      const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
      throw new Error(`Brevo API error: ${errorMessage}`);
    }

    const data = (await response.json()) as BrevoResponse;

    if (!data.messageId) {
      throw new Error('Brevo API did not return a messageId');
    }

    log.info(`✅ Email sent to ${toEmail} (messageId: ${data.messageId})`);
    return data.messageId;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`Failed to send email: ${message}`);
    throw error;
  }
}

/**
 * Send 2FA code email to instructor
 * @param instructorEmail - Instructor's email address
 * @param twoFACode - 6-digit 2FA code
 * @param quizTitle - Quiz title being deleted (for context)
 * @returns messageId if successful
 */
export async function send2FAEmail(
  instructorEmail: string,
  twoFACode: string,
  quizTitle: string,
): Promise<string> {
  // HTML email template
  const htmlBody = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <!-- Header -->
          <div style="background-color: #1E3A5F; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">DailyAgile Security Verification</h1>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p>Hello,</p>

            <p>You requested to delete the quiz: <strong>${escapeHtml(quizTitle)}</strong></p>

            <p>To complete this action, please enter the following verification code:</p>

            <!-- 2FA Code Display -->
            <div style="background-color: #F0F7FA; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="margin: 0; font-size: 12px; color: #666;">Your 2FA Code</p>
              <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; letter-spacing: 2px; color: #1E3A5F; font-family: 'Courier New', monospace;">
                ${twoFACode}
              </p>
            </div>

            <p style="color: #E74C3C; font-weight: bold;">⚠️ This code will expire in 10 minutes.</p>

            <p>If you did not request this action, please ignore this email and your quiz will not be deleted.</p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

            <!-- Footer -->
            <p style="font-size: 12px; color: #999; margin-bottom: 0;">
              This is an automated security email from DailyAgile. Please do not reply to this email.
              <br>
              © DailyAgile — Accelerate Business Agility
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  // Plain text version
  const textBody = `
DailyAgile Security Verification

You requested to delete the quiz: ${quizTitle}

Your 2FA Code: ${twoFACode}

⚠️ This code will expire in 10 minutes.

If you did not request this action, please ignore this email and your quiz will not be deleted.

---
This is an automated security email from DailyAgile.
© DailyAgile — Accelerate Business Agility
  `.trim();

  return sendEmail({
    toEmail: instructorEmail,
    subject: '🔐 DailyAgile Security Code - Verify Quiz Deletion',
    htmlBody,
    textBody,
  });
}

/**
 * Escape HTML special characters to prevent injection
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
