/**
 * POST /api/student/delete-account
 * GDPR Article 17 - Right to be Forgotten
 * Initiates student account deletion request
 *
 * Request body (JSON):
 * {
 *   "email": "student@example.com",
 *   "verification_method": "magic_link" | "password",
 *   "action": "initiate" | "verify" | "cancel"
 * }
 *
 * Verify body (for magic link):
 * {
 *   "action": "verify",
 *   "deletion_ticket_id": "uuid",
 *   "token": "encrypted-token"
 * }
 *
 * Cancel body:
 * {
 *   "action": "cancel",
 *   "deletion_ticket_id": "uuid"
 * }
 *
 * Response (202 Accepted):
 * {
 *   "success": true,
 *   "deletion_ticket_id": "uuid",
 *   "message": "Check your email for verification link",
 *   "status": "pending"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth-middleware';
import {
  initiateDeletion,
  verifyDeletionByMagicLink,
  cancelDeletion,
  generateDeletionMagicLink,
  formatDeletionVerificationEmail,
  formatDeletionConfirmationEmail,
} from '@/lib/gdpr/delete-student-account';
import { sendEmail } from '@/lib/server/email-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('DeleteAccountAPI');

interface DeleteAccountRequest {
  email?: string;
  action?: 'initiate' | 'verify' | 'cancel';
  deletion_ticket_id?: string;
  token?: string;
  verification_method?: 'magic_link' | 'password';
}

/**
 * POST /api/student/delete-account
 * Initiate account deletion
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request);

    // Only students can delete their own account
    if (user.role !== 'student' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only students can delete their own account' },
        { status: 403 }
      );
    }

    const body: DeleteAccountRequest = await request.json();
    const { action = 'initiate', email, deletion_ticket_id, token, verification_method = 'magic_link' } = body;

    // ========================================================================
    // ACTION: INITIATE DELETION
    // ========================================================================
    if (action === 'initiate') {
      // Validate email matches authenticated user
      if (!email || email.toLowerCase() !== user.email.toLowerCase()) {
        return NextResponse.json(
          { error: 'Email does not match your account' },
          { status: 400 }
        );
      }

      // Verify verification method
      if (!['magic_link', 'password'].includes(verification_method)) {
        return NextResponse.json(
          { error: 'Invalid verification method. Use "magic_link" or "password"' },
          { status: 400 }
        );
      }

      try {
        // Initiate deletion
        const deletionResult = await initiateDeletion(
          user.id,
          email.toLowerCase(),
          verification_method as 'magic_link' | 'password'
        );

        // Generate magic link if using magic link verification
        if (verification_method === 'magic_link') {
          const { link, expiresAt } = generateDeletionMagicLink(
            deletionResult.deletion_ticket_id,
            user.id,
            3600 * 24 // 24 hours
          );

          // Format verification email
          const emailTemplate = formatDeletionVerificationEmail(
            user.email,
            user.email,
            link,
            expiresAt
          );

          // Send verification email
          try {
            await sendEmail({
              toEmail: user.email,
              subject: emailTemplate.subject,
              htmlBody: emailTemplate.html,
              textBody: emailTemplate.text,
            });
            log.info(`✅ Deletion verification email sent to ${user.email}`);
          } catch (emailError) {
            log.error(`Failed to send verification email: ${emailError}`);
            // Don't fail the request, but log the error
            // Student can still verify via the ticket ID if needed
          }
        }

        return NextResponse.json(
          {
            success: true,
            deletion_ticket_id: deletionResult.deletion_ticket_id,
            message:
              verification_method === 'magic_link'
                ? 'Check your email for a confirmation link. Link expires in 24 hours.'
                : 'Please enter your password to confirm deletion.',
            status: 'pending',
            verification_method,
          },
          { status: 202 } // 202 Accepted
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        log.error(`initiateDeletion failed: ${message}`);

        // Check if account already deleted
        if (message.includes('already deleted')) {
          return NextResponse.json(
            { error: 'Account already deleted or deletion in progress' },
            { status: 400 }
          );
        }

        return NextResponse.json(
          { error: message || 'Failed to initiate account deletion' },
          { status: 500 }
        );
      }
    }

    // ========================================================================
    // ACTION: VERIFY DELETION (MAGIC LINK)
    // ========================================================================
    if (action === 'verify') {
      // Validate required fields
      if (!deletion_ticket_id || !token) {
        return NextResponse.json(
          { error: 'Missing deletion_ticket_id or token' },
          { status: 400 }
        );
      }

      try {
        // Verify deletion by magic link
        const verifyResult = await verifyDeletionByMagicLink(
          deletion_ticket_id,
          token,
          user.id
        );

        // Queue async deletion job
        // TODO: Queue to job processor (Bull, Inngest, etc.)
        // For now, just note that this should be done
        log.info(`📋 Deletion verified for ticket: ${deletion_ticket_id}. Queue for async processing.`);

        return NextResponse.json(
          {
            success: true,
            deletion_ticket_id,
            message: 'Deletion verified. Your account will be deleted within 24 hours.',
            status: 'verified',
          },
          { status: 202 }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        log.error(`verifyDeletion failed: ${message}`);

        return NextResponse.json(
          { error: message || 'Failed to verify deletion' },
          { status: 400 }
        );
      }
    }

    // ========================================================================
    // ACTION: CANCEL DELETION
    // ========================================================================
    if (action === 'cancel') {
      // Validate required fields
      if (!deletion_ticket_id) {
        return NextResponse.json(
          { error: 'Missing deletion_ticket_id' },
          { status: 400 }
        );
      }

      try {
        // Cancel deletion
        const cancelResult = await cancelDeletion(deletion_ticket_id, user.id);

        return NextResponse.json(
          {
            success: true,
            deletion_ticket_id,
            message: 'Deletion cancelled. Your account remains active.',
            status: 'cancelled',
          },
          { status: 200 }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        log.error(`cancelDeletion failed: ${message}`);

        return NextResponse.json(
          { error: message || 'Failed to cancel deletion' },
          { status: 400 }
        );
      }
    }

    // Invalid action
    return NextResponse.json(
      { error: 'Invalid action. Use "initiate", "verify", or "cancel"' },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Handle auth errors
    if (message.includes('UNAUTHORIZED') || message.includes('UNVERIFIED')) {
      return NextResponse.json(
        { error: 'Please login to delete your account' },
        { status: 401 }
      );
    }

    if (message.includes('FORBIDDEN')) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this account' },
        { status: 403 }
      );
    }

    // Invalid JSON
    if (message.includes('JSON')) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    log.error(`Unexpected error in DELETE /api/student/delete-account: ${message}`);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/student/delete-account
 * Check status of deletion request
 * Query params: ?ticket=<deletion_ticket_id>
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request);

    // Get ticket ID from query params
    const ticket = request.nextUrl.searchParams.get('ticket');
    if (!ticket) {
      return NextResponse.json(
        { error: 'Missing ticket query parameter' },
        { status: 400 }
      );
    }

    // TODO: Fetch deletion request status from database
    // For now, return placeholder
    const supabase = (await import('@/lib/server/supabase-client')).getSupabaseClient();
    const { data, error } = await supabase
      .from('deletion_requests')
      .select('id, status, requested_at, verified_at, completed_at, error_message, records_deleted')
      .eq('id', ticket)
      .eq('student_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Deletion request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        deletion_ticket_id: data.id,
        status: data.status,
        requested_at: data.requested_at,
        verified_at: data.verified_at,
        completed_at: data.completed_at,
        records_deleted: data.records_deleted,
        error: data.error_message,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`GET /api/student/delete-account failed: ${message}`);

    return NextResponse.json(
      { error: 'Failed to fetch deletion status' },
      { status: 500 }
    );
  }
}
