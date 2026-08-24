import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';


interface PilotSignupRequest {
  email: string;
}

interface PilotSignupResponse {
  success: boolean;
  message: string;
  data?: {
    email: string;
    access_token: string;
    access_expires_at: string;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<PilotSignupResponse>> {
  try {
    const body: PilotSignupRequest = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Calculate access expiration (90 days from now)
    const accessGrantedAt = new Date();
    const accessExpiresAt = new Date(accessGrantedAt.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Generate simple access token (base64: email:timestamp)
    const tokenData = `${normalizedEmail}:${accessGrantedAt.getTime()}`;
    const accessToken = Buffer.from(tokenData).toString('base64');

    // Check if user already has access
    const { data: existingAccess } = await getSupabaseClient()
      .from('demo_access')
      .select('id, status')
      .eq('email', normalizedEmail)
      .single();

    if (existingAccess) {
      // Update existing record
      await getSupabaseClient()
        .from('demo_access')
        .update({
          access_granted_at: accessGrantedAt.toISOString(),
          access_expires_at: accessExpiresAt.toISOString(),
          status: 'invited',
        })
        .eq('email', normalizedEmail);

      return NextResponse.json({
        success: true,
        message: 'You already have pilot access! Here is a refreshed access link.',
        data: {
          email: normalizedEmail,
          access_token: accessToken,
          access_expires_at: accessExpiresAt.toISOString(),
        },
      });
    }

    // Create new demo_access record
    const { data: newAccess, error: insertError } = await getSupabaseClient()
      .from('demo_access')
      .insert([
        {
          email: normalizedEmail,
          status: 'invited',
          access_granted_at: accessGrantedAt.toISOString(),
          access_expires_at: accessExpiresAt.toISOString(),
          is_active: true,
        },
      ])
      .select('id')
      .single();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return NextResponse.json(
        { success: false, message: 'Failed to create access record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Welcome to DailyAgile! Your pilot access is ready. Redirecting to lesson...',
      data: {
        email: normalizedEmail,
        access_token: accessToken,
        access_expires_at: accessExpiresAt.toISOString(),
      },
    });

  } catch (error) {
    console.error('Pilot signup error:', error);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    message: 'Pilot signup API is running',
    endpoint: 'POST /api/pilot-signup',
  });
}
