/**
 * POST /api/auth/send-otp
 * Sends a one-time password (OTP) to the user's email
 *
 * Request body:
 * {
 *   "email": "user@example.com"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "OTP sent to your email"
 * }
 */

import { apiSuccess, apiError } from '@/lib/server/api-response';
import { generateOTP, checkOTPRateLimit } from '@/lib/server/email-auth';
import { sendOTPEmail } from '@/lib/server/brevo';

interface SendOTPRequest {
  email?: string;
}

export async function POST(request: Request) {
  let body: SendOTPRequest;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const { email } = body;

  // Validate email
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return apiError('INVALID_EMAIL', 400, 'Please provide a valid email address');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check rate limit
  const rateLimit = checkOTPRateLimit(normalizedEmail);
  if (rateLimit.limited) {
    return apiError(
      'RATE_LIMIT',
      429,
      `Please wait ${rateLimit.secondsUntilRetry} seconds before requesting another code`
    );
  }

  try {
    // Generate OTP
    const otp = generateOTP(normalizedEmail);

    // Send email
    const emailSent = await sendOTPEmail(normalizedEmail, otp);

    if (!emailSent) {
      return apiError(
        'EMAIL_SEND_FAILED',
        500,
        'Failed to send OTP email. Please try again later.'
      );
    }

    return apiSuccess({
      message: 'OTP sent to your email. Check your inbox and spam folder.',
      email: normalizedEmail,
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return apiError('INTERNAL_ERROR', 500, 'An error occurred. Please try again later.');
  }
}
