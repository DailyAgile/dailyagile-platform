/**
 * GDPR Deletion Job Processor
 * Async job queue handler for processing verified deletion requests
 *
 * This file shows how to integrate deletion processing with a job queue
 * system like Bull Queue, Inngest, or AWS SQS.
 *
 * Options:
 * 1. Bull Queue (recommended for Node.js)
 * 2. Inngest (recommended for Vercel/serverless)
 * 3. AWS SQS + Lambda
 * 4. Google Cloud Tasks
 */

import { processDeletion } from '@/lib/gdpr/delete-student-account';
import { sendEmail } from '@/lib/server/email-service';
import { formatDeletionConfirmationEmail } from '@/lib/gdpr/delete-student-account';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('DeletionJobProcessor');

// ============================================================================
// OPTION 1: Bull Queue Integration (Node.js)
// ============================================================================

/**
 * Example: Using Bull Queue with Redis
 * Install: npm install bull redis
 */

export async function setupBullDeletionQueue() {
  // This is pseudo-code - adapt to your environment
  /*
  import Queue from 'bull';
  import Redis from 'redis';

  const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });

  const deletionQueue = new Queue('gdpr-deletions', {
    client: redisClient,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
    },
  });

  // Process deletion jobs
  deletionQueue.process(async (job) => {
    const { deletion_ticket_id, student_email } = job.data;

    try {
      log.info(`Processing deletion job: ${deletion_ticket_id}`);

      // Process deletion
      const result = await processDeletion(deletion_ticket_id);

      // Send confirmation email
      const emailTemplate = formatDeletionConfirmationEmail(
        'Student',
        student_email,
        deletion_ticket_id
      );

      await sendEmail({
        toEmail: student_email,
        subject: emailTemplate.subject,
        htmlBody: emailTemplate.html,
        textBody: emailTemplate.text,
      });

      log.info(`✅ Deletion job completed: ${deletion_ticket_id}`);
      return { success: true, ticket_id: deletion_ticket_id };
    } catch (error) {
      log.error(`❌ Deletion job failed: ${deletion_ticket_id}`, error);
      throw error; // Will retry based on attempts config
    }
  });

  // Handle job completion
  deletionQueue.on('completed', (job) => {
    log.info(`Job completed: ${job.id}`, job.data);
  });

  // Handle job failure
  deletionQueue.on('failed', (job, err) => {
    log.error(`Job failed: ${job.id}`, err);
  });

  return deletionQueue;
};

// ============================================================================
// OPTION 2: Inngest Integration (Serverless)
// ============================================================================

/**
 * Example: Using Inngest for serverless deletion processing
 * Install: npm install inngest
 *
 * File: inngest/functions/gdpr-delete-account.ts
 */

export const gdprDeletionFunctionExample = `
import { inngest } from '@/inngest/client';
import { processDeletion, formatDeletionConfirmationEmail } from '@/lib/gdpr/delete-student-account';
import { sendEmail } from '@/lib/server/email-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('InngestGDPRDeletion');

export const processDeletionRequest = inngest.createFunction(
  {
    id: 'gdpr-process-deletion',
    name: 'Process GDPR Deletion Request',
    retryPolicy: {
      maxAttempts: 3,
      multiplier: 2,
      initialDelayMs: 1000,
    },
  },
  { event: 'gdpr/deletion.verified' },
  async ({ event, step }) => {
    const { deletion_ticket_id, student_email } = event.data;

    // Step 1: Process deletion
    const deleteResult = await step.run('process-deletion', async () => {
      log.info(\`Processing deletion: \${deletion_ticket_id}\`);
      return await processDeletion(deletion_ticket_id);
    });

    // Step 2: Send confirmation email
    const emailResult = await step.run('send-confirmation-email', async () => {
      const emailTemplate = formatDeletionConfirmationEmail(
        'Student',
        student_email,
        deletion_ticket_id
      );

      return await sendEmail({
        toEmail: student_email,
        subject: emailTemplate.subject,
        htmlBody: emailTemplate.html,
        textBody: emailTemplate.text,
      });
    });

    return {
      success: true,
      deletion_ticket_id,
      email_sent: !!emailResult,
    };
  }
);

// Trigger from your endpoint:
// await inngest.send({
//   name: 'gdpr/deletion.verified',
//   data: {
//     deletion_ticket_id,
//     student_email,
//   },
// });
`;

// ============================================================================
// OPTION 3: AWS SQS + Lambda Integration
// ============================================================================

/**
 * Example: AWS Lambda handler for SQS deletion requests
 *
 * File: lambda/gdpr-deletion-handler.ts
 */

export const awsLambdaHandlerExample = `
import { SQSEvent } from 'aws-lambda';
import { processDeletion, formatDeletionConfirmationEmail } from '@/lib/gdpr/delete-student-account';
import { sendEmail } from '@/lib/server/email-service';

export async function handler(event: SQSEvent) {
  const results = [];

  for (const record of event.Records) {
    try {
      const { deletion_ticket_id, student_email } = JSON.parse(record.body);

      // Process deletion
      const deleteResult = await processDeletion(deletion_ticket_id);

      // Send confirmation email
      const emailTemplate = formatDeletionConfirmationEmail(
        'Student',
        student_email,
        deletion_ticket_id
      );

      await sendEmail({
        toEmail: student_email,
        subject: emailTemplate.subject,
        htmlBody: emailTemplate.html,
        textBody: emailTemplate.text,
      });

      results.push({
        messageId: record.messageId,
        status: 'success',
      });
    } catch (error) {
      console.error('Error processing deletion:', error);
      results.push({
        messageId: record.messageId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // SQS will retry if we throw
      throw error;
    }
  }

  return { batchItemFailures: [] };
}

// Send to SQS from your endpoint:
// const sqs = new AWS.SQS();
// await sqs.sendMessage({
//   QueueUrl: process.env.GDPR_DELETION_QUEUE_URL!,
//   MessageBody: JSON.stringify({
//     deletion_ticket_id,
//     student_email,
//   }),
// }).promise();
`;

// ============================================================================
// OPTION 4: Simple Polling Job Runner
// ============================================================================

/**
 * Simple job processor that polls for verified deletions
 * Run this as a cron job or background worker
 *
 * Example cron schedule: Every 5 minutes
 * 0 */5 * * * * node lib/gdpr/run-deletion-jobs.ts
 */

export async function pollAndProcessVerifiedDeletions() {
  try {
    const supabase = getSupabaseClient();

    log.info('🔍 Polling for verified deletion requests...');

    // Fetch all verified deletion requests (not yet processing)
    const { data: deletions, error } = await supabase
      .from('deletion_requests')
      .select('id, student_email, verification_method')
      .eq('status', 'verified')
      .order('verified_at', { ascending: true })
      .limit(10); // Process up to 10 at a time

    if (error) {
      log.error(`Failed to fetch deletion requests: ${error.message}`);
      return { processed: 0, failed: 0 };
    }

    if (!deletions || deletions.length === 0) {
      log.info('No pending deletions to process');
      return { processed: 0, failed: 0 };
    }

    log.info(`📋 Found ${deletions.length} verified deletion requests`);

    let processed = 0;
    let failed = 0;

    // Process each deletion
    for (const deletion of deletions) {
      try {
        log.info(`🗑️ Processing deletion: ${deletion.id}`);

        // Process deletion
        const result = await processDeletion(deletion.id);

        if (result.success) {
          log.info(`✅ Deletion completed: ${deletion.id}`);

          // Send confirmation email
          const emailTemplate = formatDeletionConfirmationEmail(
            'Student',
            deletion.student_email,
            deletion.id
          );

          try {
            await sendEmail({
              toEmail: deletion.student_email,
              subject: emailTemplate.subject,
              htmlBody: emailTemplate.html,
              textBody: emailTemplate.text,
            });
            log.info(`📧 Confirmation email sent to ${deletion.student_email}`);
          } catch (emailError) {
            log.error(`⚠️ Failed to send confirmation email: ${emailError}`);
            // Don't fail the entire job for email failures
          }

          processed++;
        }
      } catch (error) {
        log.error(`❌ Failed to process deletion ${deletion.id}: ${error}`);
        failed++;
      }
    }

    log.info(`Job run complete: ${processed} processed, ${failed} failed`);
    return { processed, failed };
  } catch (error) {
    log.error(`Fatal error in deletion job processor: ${error}`);
    throw error;
  }
}

// ============================================================================
// HEALTH CHECK & MONITORING
// ============================================================================

/**
 * Monitor deletion job health
 * Check for stuck or failed jobs
 */
export async function checkDeletionJobHealth() {
  try {
    const supabase = getSupabaseClient();

    // Check for stuck deletions (verified but not completed after 1 hour)
    const { data: stuckDeletions, error: stuckError } = await supabase
      .from('deletion_requests')
      .select('id, student_email, verified_at')
      .eq('status', 'verified')
      .lt('verified_at', new Date(Date.now() - 3600000).toISOString()) // Older than 1 hour
      .limit(10);

    if (stuckError) {
      log.error(`Failed to check stuck deletions: ${stuckError.message}`);
      return { stuck: 0, failed: 0 };
    }

    // Check for failed deletions
    const { data: failedDeletions, error: failedError } = await supabase
      .from('deletion_requests')
      .select('id, student_email, error_message')
      .eq('status', 'failed')
      .limit(10);

    if (failedError) {
      log.error(`Failed to check failed deletions: ${failedError.message}`);
      return { stuck: 0, failed: 0 };
    }

    const stuckCount = stuckDeletions?.length || 0;
    const failedCount = failedDeletions?.length || 0;

    if (stuckCount > 0) {
      log.warn(`⚠️ Found ${stuckCount} stuck deletion requests (verified >1 hour)`);
      stuckDeletions?.forEach((d) => {
        log.warn(`  - ${d.id} (${d.student_email})`);
      });
    }

    if (failedCount > 0) {
      log.error(`❌ Found ${failedCount} failed deletion requests`);
      failedDeletions?.forEach((d) => {
        log.error(`  - ${d.id} (${d.student_email}): ${d.error_message}`);
      });
    }

    return { stuck: stuckCount, failed: failedCount };
  } catch (error) {
    log.error(`Failed to check job health: ${error}`);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  pollAndProcessVerifiedDeletions,
  checkDeletionJobHealth,
};
