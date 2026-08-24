/**
 * Development-only endpoint to set test instructor session cookie
 * This allows testing instructor features without building a full login flow
 * ONLY available in development mode
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest): Promise<Response> {
  // Only available in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test instructor endpoint not available in production' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { id = 'test-instructor-001', email = 'test.instructor@example.com' } = body;

    // Create session data
    const sessionData = JSON.stringify({ id, email });

    // Set cookie with 24-hour expiry
    const response = NextResponse.json(
      {
        success: true,
        message: 'Test instructor session created',
        instructor: { id, email },
      },
      { status: 200 }
    );

    response.cookies.set('instructor-session', sessionData, {
      httpOnly: false, // Allow JS to verify it's set
      secure: (process.env.NODE_ENV as string) === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to set test instructor session' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest): Promise<Response> {
  // Only available in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test instructor endpoint not available in production' },
      { status: 403 }
    );
  }

  const response = NextResponse.json(
    { success: true, message: 'Test instructor session cleared' },
    { status: 200 }
  );

  response.cookies.delete('instructor-session');
  return response;
}
