/**
 * GET /api/certificates
 * Get authenticated student's certificates
 */

import { NextRequest } from 'next/server';
import { getStudentCertificates } from '@/lib/certificates/certificate-generator';
import { requireStudent, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('CertificatesAPI');

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const student = await requireStudent(req);

    const certificates = await getStudentCertificates(student.id);

    return apiSuccess({
      success: true,
      data: {
        certificates,
        count: certificates.length,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('auth')) {
      const { status, message } = handleAuthError(error);
      return apiError('UNAUTHORIZED', status, message);
    }
    log.error('Error getting certificates:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to fetch certificates');
  }
}
