/**
 * POST /api/quiz/check-duplicates
 * Check if a question is a duplicate within a quiz
 *
 * Body:
 * {
 *   quizId: string,
 *   question: string,
 *   matchType?: 'exact' | 'normalized' | 'fuzzy' (default: 'normalized')
 * }
 *
 * Response:
 * {
 *   isDuplicate: boolean,
 *   matchType?: string,
 *   matchedQuestion?: { id, text, similarity },
 *   similarity?: number
 * }
 */

import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import {
  checkDuplicateInQuiz,
  DuplicateMatchType,
} from '@/lib/quiz/duplicate-detection-service';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('CheckDuplicates');

interface CheckDuplicatesRequest {
  quizId: string;
  question: string;
  matchType?: 'exact' | 'normalized' | 'fuzzy';
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = (await req.json()) as CheckDuplicatesRequest;
    const { quizId, question, matchType = 'normalized' } = body;

    // Validate required fields
    if (!quizId || !question) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'quizId and question are required');
    }

    if (!['exact', 'normalized', 'fuzzy'].includes(matchType)) {
      return apiError('INVALID_REQUEST', 400, 'matchType must be exact, normalized, or fuzzy');
    }

    // Check for duplicates
    const result = await checkDuplicateInQuiz(
      quizId,
      question,
      matchType as DuplicateMatchType,
    );

    log.info(
      `Duplicate check: ${result.isDuplicate ? '✓ FOUND' : '✗ NOT FOUND'} (${matchType})`,
    );

    return apiSuccess({
      success: true,
      data: result,
    });
  } catch (error) {
    log.error('Error checking duplicates:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to check duplicates');
  }
}
