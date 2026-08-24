/**
 * Toggle a specific feature flag (global)
 * PUT /api/admin/feature-flags/[flagName]
 * Body: { enabled: boolean, reason?: string }
 */

import { NextRequest } from 'next/server';
import {
  toggleFeatureFlag,
  toggleOrgFeatureFlag,
  getFeatureFlagAuditLog,
} from '@/lib/server/feature-flags';
import { requireAdmin } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { handleAuthError } from '@/lib/server/auth-middleware';
import { createLogger } from '@/lib/logger';

const log = createLogger('AdminFlagToggleAPI');

/**
 * PUT /api/admin/feature-flags/[flagName]
 * Toggle a global feature flag
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ flagName: string }> }
) {
  try {
    // Verify admin
    const admin = await requireAdmin(req);

    const { flagName } = await params;
    const body = await req.json();
    const { enabled, reason } = body;

    // Validate input
    if (typeof enabled !== 'boolean') {
      return apiError(
        'INVALID_REQUEST',
        400,
        'enabled must be boolean'
      );
    }

    const success = await toggleFeatureFlag(
      flagName,
      enabled,
      admin.id,
      reason
    );

    if (!success) {
      return apiError('INTERNAL_ERROR', 500, 'Failed to toggle feature flag');
    }

    log.info(
      `Admin ${admin.email} toggled flag "${flagName}" to ${enabled}`
    );

    return apiSuccess({
      message: `Feature flag "${flagName}" toggled to ${enabled}`,
      flagName,
      enabled,
    });
  } catch (error) {
    const { status, message } = handleAuthError(error);
    return apiError('UNAUTHORIZED', status, message);
  }
}

/**
 * GET /api/admin/feature-flags/[flagName]/audit
 * Get audit log for a specific flag
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ flagName: string }> }
) {
  try {
    // Verify admin
    await requireAdmin(req);

    const { flagName } = await params;

    const auditLog = await getFeatureFlagAuditLog(50, flagName);

    return apiSuccess({
      flagName,
      auditLog,
      total: auditLog.length,
    });
  } catch (error) {
    const { status, message } = handleAuthError(error);
    return apiError('UNAUTHORIZED', status, message);
  }
}
