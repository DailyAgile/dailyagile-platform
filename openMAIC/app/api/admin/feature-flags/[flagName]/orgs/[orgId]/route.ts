/**
 * Toggle a feature flag for a specific organization
 * PUT /api/admin/feature-flags/[flagName]/orgs/[orgId]
 * Body: { enabled: boolean, reason?: string }
 */

import { NextRequest } from 'next/server';
import { toggleOrgFeatureFlag } from '@/lib/server/feature-flags';
import { requireAdmin } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { handleAuthError } from '@/lib/server/auth-middleware';
import { createLogger } from '@/lib/logger';

const log = createLogger('AdminOrgFlagToggleAPI');

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ flagName: string; orgId: string }> }
) {
  try {
    // Verify admin
    const admin = await requireAdmin(req);

    const { flagName, orgId } = await params;
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

    const success = await toggleOrgFeatureFlag(
      flagName,
      orgId,
      enabled,
      admin.id,
      reason
    );

    if (!success) {
      return apiError(
        'INTERNAL_ERROR',
        500,
        'Failed to toggle organization feature flag'
      );
    }

    log.info(
      `Admin ${admin.email} toggled flag "${flagName}" for org "${orgId}" to ${enabled}`
    );

    return apiSuccess({
      message: `Feature flag "${flagName}" for org "${orgId}" toggled to ${enabled}`,
      flagName,
      orgId,
      enabled,
    });
  } catch (error) {
    const { status, message } = handleAuthError(error);
    return apiError('UNAUTHORIZED', status, message);
  }
}
