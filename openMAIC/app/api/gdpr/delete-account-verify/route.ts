/**
 * POST /api/gdpr/delete-account-verify
 * GDPR Article 17 - Verify and Process Deletion
 *
 * This endpoint verifies the deletion request and processes it immediately.
 * Called when student clicks magic link from deletion verification email.
 *
 * Request body:
 * {
 *   "deletion_ticket_id": "uuid",
 *   "token": "encrypted-token-from-email",
 *   "student_id": "uuid"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Account deleted successfully",
 *   "status": "completed"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyDeletionByMagicLink,
  processDeletion,
  formatDeletionConfirmationEmail,
} from '@/lib/gdpr/delete-student-account';
import { sendEmail } from '@/lib/server/email-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('DeleteAccountVerifyAPI');

interface VerifyDeleteAccountRequest {
  deletion_ticket_id: string;
  token: string;
  student_id: string;
}

/**
 * POST /api/gdpr/delete-account-verify
 * Verify deletion request via magic link and process deletion
 */
export async function POST(request: NextRequest) {
  try {
    const body: VerifyDeleteAccountRequest = await request.json();
    const { deletion_ticket_id, token, student_id } = body;

    // Validate required fields
    if (!deletion_ticket_id || !token || !student_id) {
      return NextResponse.json(
        { error: 'Missing required fields: deletion_ticket_id, token, student_id' },
        { status: 400 }
      );
    }

    // Step 1: Verify deletion by magic link
    log.info(`Verifying deletion for ticket: ${deletion_ticket_id}`);

    const verifyResult = await verifyDeletionByMagicLink(
      deletion_ticket_id,
      token,
      student_id
    );

    if (!verifyResult.success) {
      return NextResponse.json(
        { error: 'Failed to verify deletion request' },
        { status: 400 }
      );
    }

    // Step 2: Process deletion immediately
    log.info(`Processing deletion for ticket: ${deletion_ticket_id}`);

    try {
      const processResult = await processDeletion(deletion_ticket_id);

      // Step 3: Send confirmation email
      // Fetch student email from deletion request
      const supabase = (await import('@/lib/server/supabase-client')).getSupabaseClient();
      const { data: deletionRequest, error: fetchError } = await supabase
        .from('deletion_requests')
        .select('student_email')
        .eq('id', deletion_ticket_id)
        .single();

      if (!fetchError && deletionRequest) {
        const studentEmail = deletionRequest.student_email;

        // Format confirmation email
        const emailTemplate = formatDeletionConfirmationEmail(
          'Student',
          studentEmail,
          deletion_ticket_id
        );

        // Send confirmation email
        try {
          await sendEmail({
            toEmail: studentEmail,
            subject: emailTemplate.subject,
            htmlBody: emailTemplate.html,
            textBody: emailTemplate.text,
          });
          log.info(`✅ Deletion confirmation email sent to ${studentEmail}`);
        } catch (emailError) {
          log.error(`Failed to send confirmation email: ${emailError}`);
          // Don't fail the response, just log it
        }
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Account deleted successfully. Check your email for confirmation details.',
          status: 'completed',
          deletion_ticket_id,
        },
        { status: 200 }
      );
    } catch (processError) {
      const message = processError instanceof Error ? processError.message : 'Unknown error';
      log.error(`Failed to process deletion: ${message}`);

      // Return error but don't expose internal details
      return NextResponse.json(
        { error: 'Failed to process deletion. Please try again or contact support.' },
        { status: 500 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Invalid JSON
    if (message.includes('JSON')) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    log.error(`Unexpected error in POST /api/gdpr/delete-account-verify: ${message}`);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
