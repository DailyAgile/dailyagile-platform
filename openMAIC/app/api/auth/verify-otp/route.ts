/**
 * POST /api/auth/verify-otp
 * Verifies the OTP and creates an authentication session
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "otp": "123456"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Authentication successful"
 * }
 */

import { cookies } from 'next/headers';
import { apiSuccess, apiError } from '@/lib/server/api-response';
import { verifyOTP, clearOTP } from '@/lib/server/email-auth';
import { createAccessToken } from '@/lib/server/access-token';

interface VerifyOTPRequest {
  email?: string;
  otp?: string;
}

export async function POST(request: Request) {
  let body: VerifyOTPRequest;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const { email, otp } = body;

  // Validate inputs
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return apiError('INVALID_EMAIL', 400, 'Please provide a valid email address');
  }

  if (!otp || typeof otp !== 'string' || otp.length !== 6 || !/^\d+$/.test(otp)) {
    return apiError('INVALID_OTP', 400, 'Please provide a valid 6-digit code');
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Verify OTP
    const result = verifyOTP(normalizedEmail, otp);

    if (!result.valid) {
      return apiError('INVALID_OTP', 401, result.error || 'Invalid OTP');
    }

    // Create session token using email as the secret
    // This is similar to the access code system but uses email instead
    const token = createAccessToken(normalizedEmail);

    // Set authentication cookie
    const cookieStore = await cookies();
    cookieStore.set('dailyagile_auth', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      secure: process.env.NODE_ENV === 'production',
    });

    // Also store the email in a non-httpOnly cookie for client-side access
    cookieStore.set('dailyagile_email', normalizedEmail, {
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      secure: process.env.NODE_ENV === 'production',
    });

    // Clear OTP from store
    clearOTP(normalizedEmail);

    return apiSuccess({
      message: 'Authentication successful',
      email: normalizedEmail,
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return apiError('INTERNAL_ERROR', 500, 'An error occurred. Please try again later.');
  }
}
