/**
 * Brevo (Sendinblue) email service utilities
 * Handles transactional email sending via Brevo API
 */

interface SendEmailParams {
  email: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export async function sendEmail({ email, subject, htmlContent, textContent }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('BREVO_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [{ email }],
        sender: {
          email: 'noreply@dailyagile.com',
          name: 'DailyAgile',
        },
        subject,
        htmlContent,
        textContent,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Brevo API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending email via Brevo:', error);
    return false;
  }
}

/**
 * Send OTP verification email
 */
export async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1E3A5F 0%, #0891B2 100%); color: white; padding: 2rem; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">DailyAgile</h1>
        <p style="margin: 0.5rem 0 0 0; font-size: 14px;">Accelerate Business Agility</p>
      </div>
      <div style="padding: 2rem; background-color: #f9fafb;">
        <p style="margin: 0 0 1rem 0; color: #374151;">Hi,</p>
        <p style="margin: 0 0 1.5rem 0; color: #374151;">Your verification code is:</p>

        <div style="background-color: white; border: 2px solid #0891B2; border-radius: 8px; padding: 1.5rem; text-align: center; margin: 0 0 1.5rem 0;">
          <p style="margin: 0; font-size: 40px; font-weight: bold; letter-spacing: 4px; color: #1E3A5F; font-family: 'Courier New', monospace;">
            ${otp}
          </p>
        </div>

        <p style="margin: 0 0 1rem 0; color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
        <p style="margin: 0 0 1rem 0; color: #6b7280; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
          © 2026 DailyAgile. All rights reserved. | <a href="https://dailyagile.com" style="color: #0891B2; text-decoration: none;">dailyagile.com</a>
        </p>
      </div>
    </div>
  `;

  const textContent = `Your DailyAgile verification code is: ${otp}. This code expires in 10 minutes.`;

  return sendEmail({
    email,
    subject: 'Your DailyAgile Verification Code',
    htmlContent,
    textContent,
  });
}
