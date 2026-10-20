import { NextRequest, NextResponse } from 'next/server';
import {
  AuthenticatedUser,
  extractToken,
  handleAuthError,
  requireAuth,
} from '@/lib/server/auth-middleware';
import { verifyStudentToken } from '@/lib/auth/student-auth';

/**
 * Runs an auth guard. Returns the caller, or a 401/403 response to send back.
 * Usage: const caller = await authorize(req, requireInstructor);
 *        if (caller instanceof NextResponse) return caller;
 */
export async function authorize(
  req: NextRequest,
  guard: (req: NextRequest) => Promise<AuthenticatedUser>
): Promise<AuthenticatedUser | NextResponse> {
  try {
    return await guard(req);
  } catch (error) {
    const { status, message } = handleAuthError(error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/** Accepts a student token (HMAC, from student login) or a signed JWT. */
export async function requireStudentOrStaff(req: NextRequest): Promise<AuthenticatedUser> {
  const token = extractToken(req);
  if (token) {
    const student = await verifyStudentToken(token).catch(() => null);
    if (student) {
      return {
        id: student.studentId,
        email: student.email,
        role: 'student',
        verified: true,
        iat: 0,
        exp: 0,
      };
    }
  }
  return requireAuth(req);
}

/** True for admins, and for the instructor who owns the record. */
export function canManage(caller: AuthenticatedUser, ownerId: string | null | undefined): boolean {
  return caller.role === 'admin' || (!!ownerId && caller.id === ownerId);
}
