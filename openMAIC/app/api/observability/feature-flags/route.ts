/**
 * Feature Flags Admin API
 *
 * Endpoints:
 * - GET /api/observability/feature-flags: List all feature flags
 * - PATCH /api/observability/feature-flags/{name}: Update a feature flag
 *
 * Authentication:
 * - Admin-only (verified via auth.uid() and instructors table role='admin')
 *
 * Usage:
 * # Get all flags
 * curl -H "Authorization: Bearer <token>" \
 *   https://dailyagile.com/api/observability/feature-flags
 *
 * # Enable a flag
 * curl -X PATCH -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"enabled": true}' \
 *   https://dailyagile.com/api/observability/feature-flags/WEBHOOK_PROCESSING_ENABLED
 *
 * # Gradual rollout (50% of users)
 * curl -X PATCH -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"enabled": true, "rollout_percentage": 50}' \
 *   https://dailyagile.com/api/observability/feature-flags/NEW_FEATURE_ENABLED
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalFeatureFlagManager } from '@/lib/server/observability';
import { getSupabaseClient } from '@/lib/server/supabase-client';

/**
 * Verify admin authorization
 */
async function verifyAdminAuth(req: NextRequest): Promise<{ isAdmin: boolean; userId?: string }> {
  try {
    const supabase = getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { isAdmin: false };

    // Verify admin role
    const { data: instructor } = await supabase
      .from('instructors')
      .select('role')
      .eq('id', user.id)
      .single();

    return {
      isAdmin: instructor?.role === 'admin',
      userId: user.id,
    };
  } catch (err) {
    return { isAdmin: false };
  }
}

/**
 * GET /api/observability/feature-flags
 * List all feature flags (admin only)
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const flags = getGlobalFeatureFlagManager(getSupabaseClient());
    const allFlags = await flags.getAll();

    return NextResponse.json({
      success: true,
      flags: allFlags,
      count: Object.keys(allFlags).length,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Failed to fetch feature flags', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/observability/feature-flags/{name}
 * Update a feature flag (admin only)
 *
 * Request body:
 * {
 *   "enabled": true,                 // optional
 *   "rollout_percentage": 100,        // optional, 0-100
 *   "description": "Updated desc"     // optional
 * }
 */
export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Extract flag name from URL path
    // URL format: /api/observability/feature-flags/{name}
    const pathname = req.nextUrl.pathname;
    const parts = pathname.split('/');
    const flagName = parts[parts.length - 1];

    if (!flagName || flagName === 'feature-flags') {
      return NextResponse.json(
        { error: 'Flag name required in URL' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { enabled, rollout_percentage } = body;

    // Validate rollout percentage
    if (rollout_percentage !== undefined) {
      if (typeof rollout_percentage !== 'number' || rollout_percentage < 0 || rollout_percentage > 100) {
        return NextResponse.json(
          { error: 'rollout_percentage must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    // Update flag
    const flags = getGlobalFeatureFlagManager(getSupabaseClient());

    if (enabled !== undefined) {
      if (enabled) {
        await flags.enable(flagName);
      } else {
        await flags.disable(flagName);
      }
    }

    if (rollout_percentage !== undefined) {
      await flags.setRolloutPercentage(flagName, rollout_percentage);
    }

    // Fetch updated flag
    const allFlags = await flags.getAll();
    const updatedFlag = allFlags[flagName];

    return NextResponse.json({
      success: true,
      flag: flagName,
      state: updatedFlag,
      message: `Feature flag '${flagName}' updated successfully`,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: 'Failed to update feature flag',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
