/**
 * TEST ONLY - Login endpoint for testing instructor operations
 * This endpoint is for development/testing purposes only
 * In production, use proper authentication system
 */

import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Create a mock instructor identity
    const instructorData = {
      id: 'test-instructor-001',
      email: 'test.instructor@example.com',
      role: 'instructor',
      timestamp: new Date().toISOString(),
    };

    // Create response with cookie
    const response = NextResponse.json(
      {
        success: true,
        message: 'Test login successful - instructor session created',
        instructor: instructorData,
      },
      { status: 200 }
    );

    // Set a test instructor cookie (for browser to send with requests)
    response.cookies.set('instructor-session', JSON.stringify(instructorData), {
      httpOnly: false,
      secure: false,
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: { message: 'Test login failed' } },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: '🧪 TEST LOGIN ENDPOINT',
    description: 'This endpoint creates a test instructor session for development/testing',
    usage: 'POST /api/test/login to create instructor session',
    warning: '⚠️ FOR DEVELOPMENT ONLY - Remove in production',
  });
}
