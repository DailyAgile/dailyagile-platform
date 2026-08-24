/**
 * Validate Quiz CSV
 * POST /api/instructor/quiz/validate-csv
 *
 * Validates CSV file format and content before creating quiz
 */

import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireCSRFValidation } from '@/lib/server/csrf-token';
import { parseQuizCSV } from '@/lib/quiz/csv-parser';

const log = createLogger('ValidateQuizCSV');

interface ValidateCSVRequest {
  csv_content: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // 🛡️ CSRF PROTECTION: Validate CSRF token
    const csrfValidation = await requireCSRFValidation(req);
    if (!csrfValidation.valid) {
      log.warn('CSRF validation failed for CSV validation');
      return apiError('CSRF_VALIDATION_FAILED', 403, csrfValidation.error || 'CSRF validation failed');
    }

    const body = (await req.json()) as ValidateCSVRequest;
    const { csv_content } = body;

    if (!csv_content || csv_content.trim().length === 0) {
      return apiError('EMPTY_CSV', 400, 'CSV content is empty');
    }

    // Parse and validate CSV
    const result = parseQuizCSV(csv_content);

    log.info(
      `CSV validation: ${result.total_questions} questions, ${result.errors.length} errors, ${result.warnings.length} warnings`,
    );

    return apiSuccess({
      valid: result.success,
      total_questions: result.total_questions,
      errors: result.errors,
      warnings: result.warnings,
      summary: {
        total_points: result.questions.reduce((sum, q) => sum + (q.points || 10), 0),
        estimated_duration_minutes: Math.round(
          result.questions.reduce((sum, q) => sum + q.timer_seconds, 0) / 60,
        ),
      },
    });
  } catch (error) {
    log.error('CSV validation failed:', error);
    return apiError('VALIDATION_ERROR', 500, 'Failed to validate CSV file');
  }
}
