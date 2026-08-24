/**
 * Student Account Deletion
 * POST /api/student/account/delete
 *
 * GDPR Article 17 (Right to Erasure) compliant endpoint
 * Implements 30-day grace period for account deletion
 *
 * Requires:
 * - Authorization header with student ID
 * - Password confirmation (for security)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import crypto from 'crypto';

const log = createLogger('AccountDeletion');

interface DeleteRequest {
  action: 'request_deletion' | 'cancel_deletion' | 'confirm_deletion';
  password?: string;
}

/**
 * POST /api/student/account/delete
 * Request account deletion with 30-day grace period
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DeleteRequest;
    const { action, password } = body;

    // Extract student ID from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const studentId = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify password for account deletion
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to delete account' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Fetch student record
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('id, email, password_hash')
      .eq('id', studentId)
      .single();

    if (fetchError || !student) {
      log.warn(`Account deletion request for non-existent student: ${studentId}`);
      return NextResponse.json(
        { error: 'Student account not found' },
        { status: 404 }
      );
    }

    // Verify password
    const hashedPassword = crypto
      .createHash('sha256')
      .update(password + (process.env.PASSWORD_SALT || ''))
      .digest('hex');

    if (hashedPassword !== student.password_hash) {
      log.warn(`Failed password verification for student deletion: ${studentId}`);
      return NextResponse.json(
        { error: 'Invalid password. Account deletion cancelled.' },
        { status: 401 }
      );
    }

    if (action === 'request_deletion') {
      return await handleRequestDeletion(studentId, student.email, req);
    } else if (action === 'cancel_deletion') {
      return await handleCancelDeletion(studentId);
    } else if (action === 'confirm_deletion') {
      return await handleConfirmDeletion(studentId, student.email);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be: request_deletion, cancel_deletion, or confirm_deletion' },
        { status: 400 }
      );
    }
  } catch (error) {
    log.error('Unexpected error in account deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle initial deletion request
 * Creates deletion_request record with 30-day grace period
 */
async function handleRequestDeletion(
  studentId: string,
  studentEmail: string,
  req: NextRequest
): Promise<NextResponse> {
  const supabase = getSupabaseClient();

  // Check if there's already a pending deletion request
  const { data: existingRequest } = await supabase
    .from('deletion_requests')
    .select('id, status')
    .eq('student_id', studentId)
    .eq('status', 'pending')
    .single();

  if (existingRequest) {
    return NextResponse.json(
      {
        error: 'Deletion already requested',
        message: 'Your account is already scheduled for deletion. You can cancel it anytime.',
      },
      { status: 409 }
    );
  }

  // Calculate 30-day grace period
  const willBeDeletedAt = new Date();
  willBeDeletedAt.setDate(willBeDeletedAt.getDate() + 30);

  // Create deletion request
  const { data: deletionRequest, error: insertError } = await supabase
    .from('deletion_requests')
    .insert({
      student_id: studentId,
      status: 'pending',
      requested_at: new Date().toISOString(),
      will_be_deleted_at: willBeDeletedAt.toISOString(),
      reason: 'Student requested account deletion',
    })
    .select('id')
    .single();

  if (insertError) {
    log.error('Failed to create deletion request:', insertError);
    return NextResponse.json(
      { error: 'Failed to process deletion request' },
      { status: 500 }
    );
  }

  // Log privacy event
  await supabase.from('privacy_audit_log').insert({
    student_id: studentId,
    event_type: 'account_deletion_requested',
    description: `Account deletion requested. Grace period: 30 days. Will be deleted on ${willBeDeletedAt.toISOString()}`,
    ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
    user_agent: req.headers.get('user-agent') || '',
  });

  // Send confirmation email
  try {
    const { sendNotificationEmail } = await import('@/lib/email/send-notification');
    await sendNotificationEmail('account-deletion-requested', {
      email: studentEmail,
      willBeDeletedAt: willBeDeletedAt.toISOString(),
      gracePeriodDays: 30,
    });
  } catch (emailError) {
    log.warn('Failed to send deletion confirmation email:', emailError);
    // Continue anyway - deletion request is created
  }

  log.info(`Account deletion requested for student: ${studentId}`);

  return NextResponse.json(
    {
      success: true,
      status: 'deletion_scheduled',
      message: 'Your account will be deleted in 30 days. Check your email for confirmation.',
      data: {
        student_id: studentId,
        requested_at: new Date().toISOString(),
        will_be_deleted_at: willBeDeletedAt.toISOString(),
        grace_period_days: 30,
        cancellation_url: '/settings/account?action=cancel_deletion',
      },
    },
    { status: 202 }
  );
}

/**
 * Handle cancellation of deletion request
 * Allows students to cancel within the 30-day grace period
 */
async function handleCancelDeletion(studentId: string): Promise<NextResponse> {
  const supabase = getSupabaseClient();

  // Fetch pending deletion request
  const { data: deletionRequest, error: fetchError } = await supabase
    .from('deletion_requests')
    .select('id, will_be_deleted_at')
    .eq('student_id', studentId)
    .eq('status', 'pending')
    .single();

  if (fetchError || !deletionRequest) {
    return NextResponse.json(
      { error: 'No pending deletion request found' },
      { status: 404 }
    );
  }

  // Check if still within grace period
  if (new Date() > new Date(deletionRequest.will_be_deleted_at)) {
    return NextResponse.json(
      {
        error: 'Grace period has expired. Account will be deleted automatically.',
        message: 'You can no longer cancel the deletion.',
      },
      { status: 410 }
    );
  }

  // Cancel deletion
  const { error: updateError } = await supabase
    .from('deletion_requests')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', deletionRequest.id);

  if (updateError) {
    log.error('Failed to cancel deletion request:', updateError);
    return NextResponse.json(
      { error: 'Failed to cancel deletion' },
      { status: 500 }
    );
  }

  // Log privacy event
  await supabase.from('privacy_audit_log').insert({
    student_id: studentId,
    event_type: 'account_deletion_cancelled',
    description: 'Student cancelled account deletion request',
  });

  log.info(`Account deletion cancelled for student: ${studentId}`);

  return NextResponse.json(
    {
      success: true,
      status: 'deletion_cancelled',
      message: 'Your account deletion has been cancelled. Your account is safe.',
      data: {
        student_id: studentId,
        cancelled_at: new Date().toISOString(),
      },
    },
    { status: 200 }
  );
}

/**
 * Handle immediate deletion confirmation
 * Allows student to immediately delete without 30-day wait
 * (Only available within first 24 hours)
 */
async function handleConfirmDeletion(
  studentId: string,
  studentEmail: string
): Promise<NextResponse> {
  const supabase = getSupabaseClient();

  // Fetch deletion request
  const { data: deletionRequest, error: fetchError } = await supabase
    .from('deletion_requests')
    .select('id, requested_at')
    .eq('student_id', studentId)
    .eq('status', 'pending')
    .single();

  if (fetchError || !deletionRequest) {
    return NextResponse.json(
      { error: 'No pending deletion request found' },
      { status: 404 }
    );
  }

  // Check if requested within 24 hours (can confirm immediately)
  const requestedAt = new Date(deletionRequest.requested_at);
  const now = new Date();
  const hoursSinceRequest = (now.getTime() - requestedAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceRequest > 24) {
    return NextResponse.json(
      {
        error: 'Immediate deletion only available within 24 hours of request',
        message: 'Your account will be automatically deleted on the scheduled date.',
      },
      { status: 403 }
    );
  }

  // Mark as processing
  await supabase
    .from('deletion_requests')
    .update({ status: 'processing', processing_started_at: new Date().toISOString() })
    .eq('id', deletionRequest.id);

  // Execute deletion (hard delete all student data)
  await executeHardDelete(studentId, supabase);

  // Mark as completed
  await supabase
    .from('deletion_requests')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', deletionRequest.id);

  // Log privacy event
  await supabase.from('privacy_audit_log').insert({
    student_id: studentId,
    event_type: 'account_deleted_confirmed',
    description: 'Account permanently deleted upon student request',
  });

  // Send final email
  try {
    const { sendNotificationEmail } = await import('@/lib/email/send-notification');
    await sendNotificationEmail('account-deleted-confirmed', {
      email: studentEmail,
      deletedAt: new Date().toISOString(),
    });
  } catch (emailError) {
    log.warn('Failed to send deletion confirmation email:', emailError);
  }

  log.info(`Account permanently deleted for student: ${studentId}`);

  return NextResponse.json(
    {
      success: true,
      status: 'account_deleted',
      message: 'Your account has been permanently deleted. Check your email for confirmation.',
      data: {
        student_id: studentId,
        deleted_at: new Date().toISOString(),
      },
    },
    { status: 200 }
  );
}

/**
 * Execute hard delete of all student data
 * Called after grace period expires or student confirms deletion
 */
async function executeHardDelete(studentId: string, supabase: any): Promise<void> {
  try {
    // Withdraw all consents first
    await supabase.rpc('withdraw_all_consents', { student_uuid: studentId });

    // Anonymize audit logs (GDPR requirement: keep for 7 years but anonymize)
    await supabase
      .from('privacy_audit_log')
      .update({
        student_id: null,
        metadata: { anonymised: true, anonymised_at: new Date().toISOString() },
      })
      .eq('student_id', studentId);

    // Delete all student data (cascade deletes handle related tables)
    const { error: deleteError } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (deleteError) {
      throw new Error(`Failed to delete student record: ${deleteError.message}`);
    }

    log.info(`Hard delete completed for student: ${studentId}`);
  } catch (error) {
    log.error('Failed to execute hard delete:', error);
    throw error;
  }
}

/**
 * Background job (runs via Supabase pg_cron)
 * Executes deletions after 30-day grace period expires
 *
 * SQL to add to a pg_cron migration:
 * SELECT cron.schedule('execute_pending_deletions', '0 2 * * *', $$
 *   UPDATE deletion_requests
 *   SET status = 'processing', processing_started_at = NOW()
 *   WHERE status = 'pending' AND will_be_deleted_at <= NOW();
 * $$);
 */
export async function DELETE(req: NextRequest) {
  // This endpoint is called by Supabase pg_cron, not directly by users
  const authHeader = req.headers.get('authorization');

  // Verify this is a system call (has service role token)
  if (!authHeader || !authHeader.includes('service_role')) {
    return NextResponse.json(
      { error: 'Unauthorized. This endpoint is for internal use only.' },
      { status: 401 }
    );
  }

  try {
    const supabase = getSupabaseClient();

    // Get all pending deletions that have expired
    const { data: expiredDeletions, error: fetchError } = await supabase
      .from('deletion_requests')
      .select('id, student_id')
      .eq('status', 'pending')
      .lt('will_be_deleted_at', new Date().toISOString());

    if (fetchError) {
      log.error('Failed to fetch expired deletion requests:', fetchError);
      return NextResponse.json({ error: 'Failed to process deletions' }, { status: 500 });
    }

    let deletedCount = 0;

    for (const { id, student_id } of expiredDeletions || []) {
      try {
        // Mark as processing
        await supabase
          .from('deletion_requests')
          .update({ status: 'processing', processing_started_at: new Date().toISOString() })
          .eq('id', id);

        // Execute hard delete
        await executeHardDelete(student_id, supabase);

        // Mark as completed
        await supabase
          .from('deletion_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', id);

        deletedCount++;
      } catch (error) {
        log.error(`Failed to delete student ${student_id}:`, error);
        // Continue with next student
      }
    }

    log.info(`Completed scheduled deletions: ${deletedCount} accounts`);

    return NextResponse.json(
      {
        success: true,
        message: `Processed ${deletedCount} scheduled account deletions`,
        data: { deleted_count: deletedCount },
      },
      { status: 200 }
    );
  } catch (error) {
    log.error('Unexpected error in background deletion job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
