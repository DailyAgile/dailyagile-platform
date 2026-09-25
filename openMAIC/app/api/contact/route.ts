import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:Contact');

export async function POST(req: NextRequest) {
  try {
    const { email, subject, message } = await req.json();

    // Validate inputs
    if (!email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Log the contact request (in production, this would send an email or store in DB)
    log.info(`Contact form submission: ${email} - ${subject}`);

    // TODO: In production, implement one of:
    // 1. Send email to support@dailyagile.com
    // 2. Store in database for support team review
    // 3. Send to email service (SendGrid, Mailgun, etc.)

    return NextResponse.json(
      { success: true, message: 'Contact request received' },
      { status: 200 }
    );
  } catch (error) {
    log.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to process contact request' },
      { status: 500 }
    );
  }
}
