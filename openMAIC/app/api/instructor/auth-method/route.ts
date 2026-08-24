/**
 * POST /api/instructor/auth-method
 * Check which auth method an instructor uses (password or OTP)
 * Request: { email: string }
 * Response: { method: 'password' | 'otp' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('InstructorAuthMethod');

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email: string };

    if (!email?.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const supabase = getSupabaseClient();

    // Check if instructor exists
    const { data: instructor, error } = await supabase
      .from('instructors')
      .select('id, password_hash')
      .eq('email', normalizedEmail)
      .single();

    if (error || !instructor) {
      log.warn(`Instructor not found: ${normalizedEmail}`);
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Determine auth method based on password_hash presence
    const method = instructor.password_hash ? 'password' : 'otp';
    log.info(`Auth method for ${normalizedEmail}: ${method}`);

    return NextResponse.json({ method });
  } catch (err) {
    log.error('Auth method check error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
