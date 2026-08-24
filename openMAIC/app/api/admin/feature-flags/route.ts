/**
 * Admin Feature Flags Management API
 * GET /api/admin/feature-flags - List all flags
 * POST /api/admin/feature-flags - Create new flag
 * PUT /api/admin/feature-flags/:flagName - Toggle flag (requires admin)
 */

import { NextRequest } from 'next/server';
import {
  getAllFeatures,
  createFeatureFlag,
  toggleFeatureFlag,
  toggleOrgFeatureFlag,
  getFeatureFlagAuditLog,
} from '@/lib/server/feature-flags';
import { requireAdmin } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { handleAuthError } from '@/lib/server/auth-middleware';
import { createLogger } from '@/lib/logger';

const log = createLogger('AdminFeaturesAPI');

/**
 * GET /api/admin/feature-flags
 * List all feature flags with their current status
 */
export async function GET(req: NextRequest) {
  try {
    // Verify admin
    await requireAdmin(req);

    const features = await getAllFeatures();

    log.info(`Admin fetched all features (${features.length} total)`);

    return apiSuccess({
      features,
      total: features.length,
    });
  } catch (error) {
    const { status, message } = handleAuthError(error);
    return apiError('UNAUTHORIZED', status, message);
  }
}

/**
 * POST /api/admin/feature-flags
 * Create a new feature flag
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin
    const admin = await requireAdmin(req);

    const body = await req.json();
    const { flagName, description, category } = body;

    // Validate input
    if (!flagName || !description || !category) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'Required: flagName, description, category'
      );
    }

    if (typeof flagName !== 'string' || flagName.length === 0) {
      return apiError('INVALID_REQUEST', 400, 'flagName must be non-empty string');
    }

    if (!/^[a-z_]+$/.test(flagName)) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'flagName must contain only lowercase letters and underscores'
      );
    }

    const success = await createFeatureFlag(
      flagName,
      description,
      category,
      admin.id
    );

    if (!success) {
      return apiError('INTERNAL_ERROR', 500, 'Failed to create feature flag');
    }

    log.info(`Admin ${admin.email} created flag "${flagName}"`);

    return apiSuccess(
      {
        message: `Feature flag "${flagName}" created successfully`,
        flagName,
      },
      201
    );
  } catch (error) {
    const { status, message } = handleAuthError(error);
    if (error instanceof Error && error.message.includes('INVALID_REQUEST')) {
      return apiError('INVALID_REQUEST', 400, error.message);
    }
    return apiError('UNAUTHORIZED', status, message);
  }
}
