-- Email Queue System for Async Email Processing
-- Enables reliable email delivery with retry mechanism and dead-letter queue

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT NOT NULL,
  template_data JSONB,
  status TEXT DEFAULT 'pending', -- pending, processing, sent, failed, dlq
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  error_message TEXT,
  provider TEXT DEFAULT 'brevo',
  external_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + interval '7 days'),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dlq'))
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_at ON email_queue(scheduled_at, status);
CREATE INDEX IF NOT EXISTS idx_email_queue_expires_at ON email_queue(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_recipient ON email_queue(recipient_email);

-- Enable row level security
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Service role can manage all queue operations
CREATE POLICY "Allow service role to manage queue"
  ON email_queue
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow anyone to queue emails
CREATE POLICY "Allow email queueing"
  ON email_queue
  FOR INSERT
  WITH CHECK (true);
