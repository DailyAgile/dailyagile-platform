/**
 * Student Authentication Utilities
 * Extract student ID and validate auth from request context
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('Student:Auth');

/**
 * Extract Supabase auth user ID from request headers
 * Format: Authorization: Bearer <jwt_token>
 */
export async function getAuthUserId(req: NextRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseClient();

    // Verify token and get user ID
    const { data } = await supabase.auth.getUser(token);
    return data.user?.id || null;
  } catch (error) {
    log.debug('Error extracting auth user ID:', error);
    return null;
  }
}

/**
 * Get student ID for authenticated user
 * Looks up students table by auth.users(id)
 */
export async function getStudentId(userId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();

    const { data: student, error } = await supabase
      .from('students')
      .select('id')
      .eq('auth_user_id', userId)
      .single();

    if (error) {
      log.debug(`Student not found for auth user ${userId}`);
      return null;
    }

    return student?.id || null;
  } catch (error) {
    log.error('Error looking up student ID:', error);
    return null;
  }
}

/**
 * Validate student is authenticated and return student ID
 * Returns null if not authenticated
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ studentId: string; userId: string } | null> {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return null;
    }

    const studentId = await getStudentId(userId);
    if (!studentId) {
      return null;
    }

    return { studentId, userId };
  } catch (error) {
    log.error('Error validating auth:', error);
    return null;
  }
}

/**
 * Get student profile data
 */
export async function getStudentProfile(studentId: string) {
  try {
    const supabase = getSupabaseClient();

    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (error) {
      log.error('Error fetching student profile:', error);
      return null;
    }

    return student;
  } catch (error) {
    log.error('Error getting student profile:', error);
    return null;
  }
}
