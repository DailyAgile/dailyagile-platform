/**
 * Student Authentication Utilities
 * Token validation and student session management
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!url || !key) {
      throw new Error('Missing Supabase credentials in .env.local');
    }

    supabase = createClient(url, key);
  }
  return supabase;
}

export interface StudentSession {
  studentId: string;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Verify JWT token and return student info
 */
export async function verifyStudentToken(token: string): Promise<StudentSession | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'fallback-secret')
      .update(`${parts[0]}.${parts[1]}`)
      .digest('base64');

    if (expectedSignature !== parts[2]) {
      return null;
    }

    // Fetch student from database to verify they still exist
    const { data: student } = await (getSupabaseClient() as any)
      .from('students')
      .select('id, email, first_name, last_name')
      .eq('id', payload.sub)
      .eq('email_verified', true)
      .single();

    if (!student) return null;

    return {
      studentId: (student as any).id,
      email: (student as any).email,
      firstName: (student as any).first_name,
      lastName: (student as any).last_name,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get student session from request headers
 */
export function getStudentTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Check if student is authenticated (client-side)
 */
export function isStudentAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('student_token');
}

/**
 * Get current student data (client-side)
 */
export function getCurrentStudent() {
  if (typeof window === 'undefined') return null;

  return {
    id: localStorage.getItem('student_id'),
    email: localStorage.getItem('student_email'),
    token: localStorage.getItem('student_token'),
  };
}

/**
 * Logout student (client-side)
 */
export function logoutStudent() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('student_token');
  localStorage.removeItem('student_email');
  localStorage.removeItem('student_id');
}
