/**
 * PATCH /api/student/profile
 *
 * Update student profile settings:
 * - timezone
 * - preferred_language
 * - preferred_currency
 * - accessibility_settings (read_aloud, font_size, high_contrast, reduced_motion, extra_time_pct)
 *
 * Returns: { updated: true, profile: {...} }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { requireAuth, getStudentProfile } from '@/lib/student/auth-utils';
import type { ProfileUpdateRequest, ProfileUpdateResponse } from '@/lib/student/types';

const log = createLogger('API:StudentProfile');

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) {
      return apiError('UNAUTHORIZED', 401, 'Not authenticated');
    }

    const { studentId } = auth;
    const body = (await req.json()) as ProfileUpdateRequest;

    const supabase = getSupabaseClient();

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    // Timezone validation
    if (body.timezone) {
      const validTimezones = [
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Asia/Tokyo',
        'Asia/Singapore',
        'Australia/Sydney',
      ];
      if (!validTimezones.includes(body.timezone)) {
        return apiError('INVALID_REQUEST', 400, 'Invalid timezone');
      }
      updates.timezone = body.timezone;
    }

    // Language validation
    if (body.preferred_language) {
      const validLanguages = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'pt'];
      if (!validLanguages.includes(body.preferred_language)) {
        return apiError('INVALID_REQUEST', 400, 'Invalid language');
      }
      updates.preferred_language = body.preferred_language;
    }

    // Currency validation
    if (body.preferred_currency) {
      const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'AUD'];
      if (!validCurrencies.includes(body.preferred_currency)) {
        return apiError('INVALID_REQUEST', 400, 'Invalid currency');
      }
      updates.preferred_currency = body.preferred_currency;
    }

    // Accessibility settings validation
    if (body.accessibility_settings) {
      const settings = body.accessibility_settings;

      // Validate extra_time_pct is between 0-100
      if (
        settings.extra_time_pct !== undefined &&
        (settings.extra_time_pct < 0 || settings.extra_time_pct > 100)
      ) {
        return apiError(
          'INVALID_REQUEST',
          400,
          'extra_time_pct must be 0-100'
        );
      }

      // Validate font_size
      if (
        settings.font_size &&
        !['small', 'medium', 'large'].includes(settings.font_size)
      ) {
        return apiError('INVALID_REQUEST', 400, 'Invalid font_size');
      }

      updates.accessibility_settings = settings;
    }

    // Update student profile
    const { error: updateError } = await supabase
      .from('students')
      .update(updates)
      .eq('id', studentId);

    if (updateError) {
      log.error('Error updating profile:', updateError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to update profile');
    }

    // Fetch updated profile
    const profile = await getStudentProfile(studentId);

    if (!profile) {
      return apiError('NOT_FOUND', 404, 'Student profile not found');
    }

    const response: ProfileUpdateResponse = {
      updated: true,
      profile: {
        id: profile.id,
        email: profile.email,
        timezone: profile.timezone || 'UTC',
        preferred_language: profile.preferred_language || 'en',
        preferred_currency: profile.preferred_currency || 'USD',
        accessibility_settings: profile.accessibility_settings || {},
      },
    };

    log.info(`Updated profile for student ${studentId}`);
    return apiSuccess(response);
  } catch (error) {
    log.error('Profile update error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to update profile');
  }
}
