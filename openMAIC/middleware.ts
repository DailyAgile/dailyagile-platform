import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Authentication is now handled by email + 2FA auth system at the application level
  // Middleware allows all traffic through to the application
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logos/).*)'],
};
