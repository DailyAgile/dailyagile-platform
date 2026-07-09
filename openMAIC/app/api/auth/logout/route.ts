/**
 * POST /api/auth/logout
 * Clears the authentication session
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Logged out successfully"
 * }
 */

import { cookies } from 'next/headers';
import { apiSuccess } from '@/lib/server/api-response';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('dailyagile_auth');
    cookieStore.delete('dailyagile_email');

    return apiSuccess({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error logging out:', error);
    // Still return success even if there was an error
    return apiSuccess({
      message: 'Logged out',
    });
  }
}
