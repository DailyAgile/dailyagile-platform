/**
 * Email Queue Service
 * Manages email queueing, retry logic, and dead-letter queue handling
 *
 * Architecture:
 * 1. Queue emails in Supabase table (immediate response to client)
 * 2. Async worker polls queue and sends emails (Supabase Edge Function or cron)
 * 3. Failed emails retry up to 3 times with exponential backoff
 * 4. Emails exceeding max retries move to dead-letter queue (DLQ)
 *
 * Flow:
 *   Webhook → Queue email → Return 200 to client
 *   Async worker → Fetch pending emails → Send via provider
 *   If success → Mark as sent, log messageId
 *   If retryable failure → Increment retry_count, reschedule
 *   If max retries exceeded → Move to DLQ for manual review
 */

import { createLogger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { EmailTemplateType, EmailTemplateData } from './send-notification';
import { EmailProvider } from './providers/base-provider';
import {
  EMAIL_MAX_RETRIES,
  EMAIL_RETRY_DELAYS_MS,
  EMAIL_RETRY_FALLBACK_DELAY_MS,
  EMAIL_QUEUE_BATCH_SIZE,
} from '@/lib/constants/webhook-limits';

const log = createLogger('EmailQueueService');

export interface QueuedEmail {
  id: string;
  templateType: EmailTemplateType;
  recipientEmail: string;
  templateData: any;
  subject: string;
  htmlContent: string;
  textContent: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'dlq';
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  scheduledAt: string;
  correlationId?: string; // Webhook correlation ID for tracing entire enrollment flow
}

// Use imported constants instead of local definitions
const DEFAULT_MAX_RETRIES = EMAIL_MAX_RETRIES;

/**
 * Queue email for async delivery
 *
 * Time Complexity: O(1) - single Supabase insert
 * Space Complexity: O(1) - constant storage per email
 *
 * @param email Email recipient
 * @param templateType Email template identifier
 * @param templateData Template variables (will be stored as JSONB)
 * @param subject Email subject line
 * @param htmlContent Rendered HTML email body
 * @param textContent Plain text fallback
 * @param correlationId Optional correlation ID from webhook for end-to-end tracing
 * @returns Promise<string> Queue ID for tracking
 *
 * @throws Will not throw - logs error and returns fallback ID
 */
export async function queueEmail(
  email: string,
  templateType: EmailTemplateType,
  templateData: any,
  subject: string,
  htmlContent: string,
  textContent: string,
  correlationId?: string,
): Promise<string> {
  try {
    if (!email || !email.includes('@')) {
      log.error(`Invalid email for queueing: ${email}`);
      return 'invalid-email';
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('email_queue')
      .insert({
        template_type: templateType,
        recipient_email: email,
        template_data: templateData,
        subject,
        html_content: htmlContent,
        text_content: textContent,
        status: 'pending',
        retry_count: 0,
        max_retries: DEFAULT_MAX_RETRIES,
        provider: 'brevo',
        correlation_id: correlationId || null,
      })
      .select('id')
      .single();

    if (error) {
      log.error(`Failed to queue email for ${email}: ${error.message}`, error);
      return 'queue-error';
    }

    log.info(`✅ Email queued: ${templateType} → ${email} (id: ${data.id})`);
    return data.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`Email queueing exception: ${message}`, error);
    return 'exception-error';
  }
}

/**
 * Fetch pending emails from queue that are ready to send
 *
 * Time Complexity: O(n) where n = batch size
 * @param batchSize Number of emails to fetch
 * @returns Array of pending emails or empty array if none found
 */
async function fetchPendingEmails(batchSize: number): Promise<any[]> {
  const supabase = getSupabaseClient();
  const { data: pendingEmails, error: fetchError } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (fetchError) {
    log.error(`Failed to fetch queue: ${fetchError.message}`, fetchError);
    return [];
  }

  return pendingEmails || [];
}

/**
 * Mark email as processing in database
 * Prevents duplicate sends if service crashes mid-send
 *
 * Time Complexity: O(1) - single update
 */
async function markEmailAsProcessing(emailId: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase
    .from('email_queue')
    .update({ status: 'processing' })
    .eq('id', emailId);
}

/**
 * Handle successful email send
 * Marks email as sent and records messageId
 *
 * Time Complexity: O(1)
 * @returns true if update successful, false otherwise
 */
async function handleEmailSuccess(
  emailId: string,
  messageId: string,
  queuedEmail: any
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    await supabase
      .from('email_queue')
      .update({
        status: 'sent',
        external_message_id: messageId,
        sent_at: new Date().toISOString(),
      })
      .eq('id', emailId);

    log.info(`✅ Email sent: ${queuedEmail.template_type} → ${queuedEmail.recipient_email} (messageId: ${messageId})`);
    return true;
  } catch (error) {
    log.error(`Failed to mark email as sent: ${error}`, error);
    return false;
  }
}

/**
 * Handle non-retryable email error
 * Moves email to dead-letter queue immediately
 *
 * Time Complexity: O(1)
 * @returns true if update successful
 */
async function moveEmailToDLQ(
  emailId: string,
  errorMessage: string,
  queuedEmail: any,
  retryCount: number = 0
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    await supabase
      .from('email_queue')
      .update({
        status: 'dlq',
        error_message: errorMessage,
        retry_count: retryCount,
      })
      .eq('id', emailId);

    log.warn(`📌 Email moved to DLQ: ${queuedEmail.template_type} → ${queuedEmail.recipient_email} (${errorMessage})`);
    return true;
  } catch (error) {
    log.error(`Failed to move email to DLQ: ${error}`, error);
    return false;
  }
}

/**
 * Handle retryable email error
 * Either schedules retry or moves to DLQ if max retries exceeded
 *
 * Time Complexity: O(1)
 * @returns 'retry' | 'dlq' indicating next action
 */
async function handleEmailRetryableError(
  emailId: string,
  errorMessage: string,
  currentRetryCount: number,
  maxRetries: number,
  queuedEmail: any
): Promise<'retry' | 'dlq'> {
  const supabase = getSupabaseClient();
  const nextRetry = currentRetryCount + 1;

  if (nextRetry > maxRetries) {
    // Max retries exceeded: move to DLQ
    await moveEmailToDLQ(
      emailId,
      `Max retries exceeded: ${errorMessage}`,
      queuedEmail,
      nextRetry
    );
    log.warn(`📌 Email max retries exceeded → DLQ: ${queuedEmail.template_type} → ${queuedEmail.recipient_email}`);
    return 'dlq';
  }

  // Schedule next retry with exponential backoff
  const delayMs = EMAIL_RETRY_DELAYS_MS[nextRetry as keyof typeof EMAIL_RETRY_DELAYS_MS] || EMAIL_RETRY_FALLBACK_DELAY_MS;
  const nextScheduledAt = new Date(Date.now() + delayMs);

  try {
    await supabase
      .from('email_queue')
      .update({
        status: 'failed',
        retry_count: nextRetry,
        error_message: errorMessage,
        scheduled_at: nextScheduledAt.toISOString(),
      })
      .eq('id', emailId);

    log.info(`🔄 Email retry scheduled: ${queuedEmail.template_type} → ${queuedEmail.recipient_email} (attempt ${nextRetry}/${maxRetries})`);
    return 'retry';
  } catch (error) {
    log.error(`Failed to schedule email retry: ${error}`, error);
    return 'dlq'; // Fail to DLQ if we can't update status
  }
}

/**
 * Send single email via provider and handle result
 *
 * Time Complexity: O(1) - provider call
 * @returns 'sent' | 'retry' | 'dlq' indicating outcome
 */
async function sendSingleEmail(
  queuedEmail: any,
  provider: EmailProvider
): Promise<'sent' | 'retry' | 'dlq'> {
  try {
    const result = await provider.send({
      to: queuedEmail.recipient_email,
      subject: queuedEmail.subject,
      htmlContent: queuedEmail.html_content,
      textContent: queuedEmail.text_content,
      headers: {
        // GDPR/CAN-SPAM: Add unsubscribe header
        'List-Unsubscribe': '<https://dailyagile.com/unsubscribe?email=' + encodeURIComponent(queuedEmail.recipient_email) + '>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });

    if (result.success && result.messageId) {
      await handleEmailSuccess(queuedEmail.id, result.messageId, queuedEmail);
      return 'sent';
    }

    if (!result.retryable) {
      await moveEmailToDLQ(queuedEmail.id, result.error?.message || 'Non-retryable error', queuedEmail);
      return 'dlq';
    }

    // Retryable error
    await handleEmailRetryableError(
      queuedEmail.id,
      result.error?.message || 'Unknown error',
      queuedEmail.retry_count,
      queuedEmail.max_retries,
      queuedEmail
    );
    return 'retry';
  } catch (error) {
    // Unexpected error - mark as failed but don't fail batch
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`Error processing email ${queuedEmail.id}: ${message}`, error);

    const supabase = getSupabaseClient();
    await supabase
      .from('email_queue')
      .update({ status: 'failed', error_message: message })
      .eq('id', queuedEmail.id)
      .catch((err: any) => log.error(`Failed to update email status: ${err.message}`));

    return 'retry';
  }
}

/**
 * Process pending emails from queue
 * Should be called by Supabase Edge Function or scheduled job
 *
 * Time Complexity: O(n) where n = batch size of pending emails
 * Space Complexity: O(n) for storing pending emails in memory
 *
 * @param provider EmailProvider implementation (Brevo, SendGrid, etc.)
 * @param batchSize Number of emails to process per call (default: 10)
 * @returns Promise<{processed: number, sent: number, failed: number, dlq: number}>
 */
export async function processEmailQueue(
  provider: EmailProvider,
  batchSize: number = EMAIL_QUEUE_BATCH_SIZE,
): Promise<{ processed: number; sent: number; failed: number; dlq: number }> {
  try {
    provider.validateConfig();
  } catch (error) {
    log.error('Email provider configuration invalid', error);
    return { processed: 0, sent: 0, failed: 0, dlq: 0 };
  }

  const stats = { processed: 0, sent: 0, failed: 0, dlq: 0 };

  try {
    // Fetch pending emails ready to send
    const pendingEmails = await fetchPendingEmails(batchSize);

    if (pendingEmails.length === 0) {
      log.debug('No pending emails in queue');
      return stats;
    }

    log.info(`Processing ${pendingEmails.length} pending emails`);

    // Process each email
    for (const queuedEmail of pendingEmails) {
      stats.processed++;

      // Mark as processing to prevent duplicate sends
      await markEmailAsProcessing(queuedEmail.id);

      // Send and handle result
      const result = await sendSingleEmail(queuedEmail, provider);
      if (result === 'sent') stats.sent++;
      else if (result === 'retry') stats.failed++;
      else stats.dlq++;
    }

    log.info(`Queue processing complete: ${stats.sent} sent, ${stats.failed} failed, ${stats.dlq} DLQ`);
    return stats;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`Email queue processing exception: ${message}`, error);
    return stats;
  }
}

/**
 * Get email queue statistics
 *
 * Time Complexity: O(1) - single aggregate query
 */
export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  dlq: number;
  oldestPendingAge: string | null;
}> {
  try {
    const supabase = getSupabaseClient();

    const { data: stats, error } = await supabase.rpc('get_email_queue_stats');

    if (error) {
      log.error(`Failed to get queue stats: ${error.message}`);
      return {
        pending: 0,
        processing: 0,
        sent: 0,
        failed: 0,
        dlq: 0,
        oldestPendingAge: null,
      };
    }

    return stats;
  } catch (error) {
    log.error('Queue stats exception', error);
    return {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      dlq: 0,
      oldestPendingAge: null,
    };
  }
}

/**
 * Manually retry a DLQ email
 * Moves email from DLQ back to pending for reprocessing
 */
export async function retryDLQEmail(emailId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('email_queue')
      .update({
        status: 'pending',
        retry_count: 0,
        scheduled_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', emailId)
      .eq('status', 'dlq');

    if (error) {
      log.error(`Failed to retry DLQ email ${emailId}: ${error.message}`);
      return false;
    }

    log.info(`✅ DLQ email ${emailId} moved back to pending for retry`);
    return true;
  } catch (error) {
    log.error('DLQ retry exception', error);
    return false;
  }
}
