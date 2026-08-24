/**
 * Check multiple feature flags
 * POST /api/features
 * Body: { flags: string[] }
 */

import { NextRequest } from 'next/server';
import { isFeatureEnabled } from '@/lib/server/feature-flags';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('FeaturesAPI');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { flags } = body;

    // Validate request
    if (!flags || !Array.isArray(flags)) {
      return apiError('INVALID_REQUEST', 400, 'Expected { flags: string[] }');
    }

    if (flags.length === 0) {
      return apiSuccess({ features: {} });
    }

    if (flags.length > 100) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'Maximum 100 flags per request'
      );
    }

    // Check each flag
    const features: Record<string, boolean> = {};

    await Promise.all(
      flags.map(async (flag: string) => {
        if (typeof flag !== 'string') {
          return;
        }
        features[flag] = await isFeatureEnabled(flag);
      })
    );

    log.debug(`Checked ${flags.length} features`);

    return apiSuccess({ features });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('Error checking features:', error);
    return apiError('INTERNAL_ERROR', 500, message);
  }
}
