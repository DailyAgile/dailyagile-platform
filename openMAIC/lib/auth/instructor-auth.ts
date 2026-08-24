/**
 * Instructor Authentication Utilities
 * Uses Supabase Auth for session management (no manual JWT handling)
 */

import { createLogger } from '@/lib/logger';
import { getSupabaseBrowserClient } from '@/lib/client/supabase-client';

const log = createLogger('InstructorAuth');

/**
 * Sign in instructor with email (magic link)
 */
export async function signInWithEmail(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase(),
      options: {
        shouldCreateUser: false, // Instructor must be pre-created by admin
      },
    });

    if (error) {
      log.warn(`Sign-in failed for ${email}: ${error.message}`);
      return { success: false, error: error.message };
    }

    log.info(`Magic link sent to ${email}`);
    return { success: true };
  } catch (error) {
    log.error('Sign-in error:', error);
    return { success: false, error: 'Sign-in failed' };
  }
}

/**
 * Sign in instructor with email + password
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error) {
      log.warn(`Password sign-in failed for ${email}: ${error.message}`);
      return { success: false, error: error.message };
    }

    log.info(`Instructor signed in: ${email}`);
    return { success: true };
  } catch (error) {
    log.error('Sign-in error:', error);
    return { success: false, error: 'Sign-in failed' };
  }
}

/**
 * Get current instructor session
 */
export async function getInstructorSession() {
  try {
    const supabase = getSupabaseBrowserClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session;
  } catch (error) {
    log.error('Failed to get session:', error);
    return null;
  }
}

/**
 * Get current instructor user
 */
export async function getInstructorUser() {
  try {
    const supabase = getSupabaseBrowserClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  } catch (error) {
    log.error('Failed to get user:', error);
    return null;
  }
}

/**
 * Check if instructor is logged in
 */
export async function isInstructorLoggedIn(): Promise<boolean> {
  const session = await getInstructorSession();
  return !!session;
}

/**
 * Sign out instructor
 */
export async function signOutInstructor(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    log.info('Instructor signed out');
    return { success: true };
  } catch (error) {
    log.error('Sign-out error:', error);
    return { success: false, error: 'Sign-out failed' };
  }
}

/**
 * Get access token (for API calls, if needed)
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const session = await getInstructorSession();
    return session?.access_token || null;
  } catch (error) {
    log.error('Failed to get access token:', error);
    return null;
  }
}
