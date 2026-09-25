/**
 * Email Queue Processor - Supabase Edge Function
 *
 * Processes pending emails from the email queue table
 * Called periodically (every 5 minutes) to send queued emails
 *
 * Features:
 * - Batches emails (10 at a time) for efficiency
 * - Retries failed emails with exponential backoff
 * - Moves emails to DLQ after max retries
 * - GDPR/CAN-SPAM compliant (unsubscribe headers)
 * - Comprehensive logging and error handling
 *
 * Deployment:
 *   supabase functions deploy process-email-queue --no-verify-jwt
 *
 * Trigger Setup (in Supabase dashboard):
 *   - Go to Extensions > pg_cron
 *   - Create cron job: SELECT cron.schedule('process-email-queue', '/ 5 * * * *', 'select net.http_post(...)')
 *   - Or invoke manually: curl -X POST https://<project>.functions.supabase.co/process-email-queue
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

interface EmailQueueRecord {
  id: string;
  template_type: string;
  recipient_email: string;
  subject: string;
  html_content: string;
  text_content: string;
  template_data: Record<string, any>;
  status: 'pending' | 'processing' | 'failed' | 'dlq';
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  created_at: string;
  scheduled_at: string;
}

interface ProcessingResult {
  processed: number;
  sent: number;
  failed: number;
  dlq: number;
  errors: string[];
}

const BATCH_SIZE = 10;
const RETRY_DELAYS = {
  1: 5 * 60 * 1000,    // 5 minutes
  2: 15 * 60 * 1000,   // 15 minutes
  3: 60 * 60 * 1000,   // 1 hour
};

serve(async (req) => {
  try {
    // Verify Authorization (optional but recommended)
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${Deno.env.get('FUNCTION_SECRET')}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );

    const result = await processEmailQueue(supabase);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Email queue processor error:', message, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
});

/**
 * Main email queue processing logic
 */
async function processEmailQueue(supabase: any): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    dlq: 0,
    errors: [],
  };

  try {
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      result.errors.push('BREVO_API_KEY not configured');
      console.error('BREVO_API_KEY not set');
      return result;
    }

    // Fetch pending emails
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      result.errors.push(`Failed to fetch queue: ${fetchError.message}`);
      console.error('Failed to fetch pending emails:', fetchError);
      return result;
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      console.log('No pending emails in queue');
      return result;
    }

    console.log(`Processing ${pendingEmails.length} pending emails`);

    // Process each email
    for (const queuedEmail of pendingEmails) {
      result.processed++;

      try {
        // Mark as processing
        await supabase
          .from('email_queue')
          .update({ status: 'processing' })
          .eq('id', queuedEmail.id);

        // Send email via Brevo
        const sendResult = await sendBrevoEmail(brevoApiKey, queuedEmail);

        if (sendResult.success) {
          // Mark as sent
          await supabase
            .from('email_queue')
            .update({
              status: 'sent',
              external_message_id: sendResult.messageId,
              sent_at: new Date().toISOString(),
            })
            .eq('id', queuedEmail.id);

          result.sent++;
          console.log(
            `✅ Email sent: ${queuedEmail.template_type} → ${queuedEmail.recipient_email} (id: ${queuedEmail.id})`,
          );
        } else if (!sendResult.retryable) {
          // Move to DLQ (non-retryable error)
          await supabase
            .from('email_queue')
            .update({
              status: 'dlq',
              error_message: sendResult.error,
              retry_count: queuedEmail.retry_count,
            })
            .eq('id', queuedEmail.id);

          result.dlq++;
          console.warn(
            `📌 Email to DLQ (non-retryable): ${queuedEmail.recipient_email} (id: ${queuedEmail.id})`,
          );
        } else {
          // Retry logic
          const nextRetry = queuedEmail.retry_count + 1;

          if (nextRetry > queuedEmail.max_retries) {
            // Max retries exceeded
            await supabase
              .from('email_queue')
              .update({
                status: 'dlq',
                error_message: `Max retries exceeded: ${sendResult.error}`,
                retry_count: nextRetry,
              })
              .eq('id', queuedEmail.id);

            result.dlq++;
            console.warn(
              `📌 Email max retries → DLQ: ${queuedEmail.recipient_email} (id: ${queuedEmail.id})`,
            );
          } else {
            // Schedule retry
            const delayMs =
              RETRY_DELAYS[nextRetry as keyof typeof RETRY_DELAYS] ||
              2 * 60 * 60 * 1000;
            const nextScheduledAt = new Date(Date.now() + delayMs);

            await supabase
              .from('email_queue')
              .update({
                status: 'failed',
                retry_count: nextRetry,
                error_message: sendResult.error,
                scheduled_at: nextScheduledAt.toISOString(),
              })
              .eq('id', queuedEmail.id);

            result.failed++;
            console.log(
              `🔄 Email retry scheduled: ${queuedEmail.recipient_email} (attempt ${nextRetry}/${queuedEmail.max_retries})`,
            );
          }
        }
      } catch (processError) {
        const message =
          processError instanceof Error ? processError.message : 'Unknown error';
        console.error(
          `Error processing email ${queuedEmail.id}: ${message}`,
          processError,
        );
        result.errors.push(
          `Failed to process email ${queuedEmail.id}: ${message}`,
        );

        // Mark as failed for retry
        await supabase
          .from('email_queue')
          .update({
            status: 'failed',
            error_message: message,
          })
          .eq('id', queuedEmail.id);

        result.failed++;
      }
    }

    console.log(
      `Queue processing complete: ${result.sent} sent, ${result.failed} failed, ${result.dlq} DLQ`,
    );
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Queue processing exception: ${message}`);
    console.error('Queue processing exception:', message, error);
    return result;
  }
}

/**
 * Send email via Brevo API
 */
async function sendBrevoEmail(
  apiKey: string,
  queuedEmail: EmailQueueRecord,
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  retryable: boolean;
}> {
  try {
    const payload = {
      sender: {
        email: 'support@dailyagile.com',
        name: 'DailyAgile',
      },
      to: [{ email: queuedEmail.recipient_email }],
      subject: queuedEmail.subject,
      htmlContent: queuedEmail.html_content,
      textContent: queuedEmail.text_content,
      headers: {
        'List-Unsubscribe': `<https://dailyagile.com/unsubscribe?email=${encodeURIComponent(queuedEmail.recipient_email)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as any;
      const errorMessage = errorData.message || errorData.error || response.statusText;

      if (response.status === 429) {
        return {
          success: false,
          error: `Rate limited: ${errorMessage}`,
          retryable: true,
        };
      }

      if (response.status >= 500) {
        return {
          success: false,
          error: `Server error: ${errorMessage}`,
          retryable: true,
        };
      }

      if (response.status === 400 || response.status === 403) {
        return {
          success: false,
          error: `Validation error: ${errorMessage}`,
          retryable: false,
        };
      }

      return {
        success: false,
        error: `HTTP ${response.status}: ${errorMessage}`,
        retryable: true,
      };
    }

    const data = (await response.json()) as any;

    if (!data.messageId) {
      return {
        success: false,
        error: 'No messageId returned',
        retryable: true,
      };
    }

    return {
      success: true,
      messageId: data.messageId,
      retryable: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Network error: ${message}`,
      retryable: true,
    };
  }
}
