/**
 * GET /api/auth/status
 * Checks if the user is authenticated
 *
 * Response:
 * {
 *   "authenticated": true,
 *   "email": "user@example.com"
 * }
 */

import { cookies } from 'next/headers';
import { apiSuccess } from '@/lib/server/api-response';
import { verifyAccessToken } from '@/lib/server/access-token';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('dailyagile_auth')?.value;
    const email = cookieStore.get('dailyagile_email')?.value;

    let authenticated = false;

    if (authToken && email) {
      // Verify the token using the email as the secret
      authenticated = verifyAccessToken(authToken, email);
    }

    return apiSuccess({
      authenticated,
      email: authenticated ? email : null,
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    return apiSuccess({
      authenticated: false,
      email: null,
    });
  }
}
