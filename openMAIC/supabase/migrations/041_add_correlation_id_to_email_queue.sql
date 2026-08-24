/**
 * Migration: Add correlation_id column to email_queue table
 * Purpose: Track emails through the entire webhook flow via correlation IDs
 *
 * This enables:
 * - Tracing a student enrollment from webhook → student upsert → billing → email
 * - Debugging webhook failures by following the correlation_id
 * - Monitoring email delivery linked to specific webhook events
 * - Analytics on end-to-end enrollment flow latency
 *
 * Date: 2026-08-23
 */

-- Add correlation_id column to email_queue for end-to-end tracing
ALTER TABLE email_queue
ADD COLUMN correlation_id TEXT DEFAULT NULL;

-- Create index for efficient correlation_id lookups
-- Allows ops to find all operations (webhook, student, billing, email) for a single enrollment
CREATE INDEX IF NOT EXISTS idx_email_queue_correlation_id
ON email_queue(correlation_id)
WHERE correlation_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN email_queue.correlation_id IS
  'Correlation ID from webhook entry point, enables tracing entire enrollment flow';
