-- Migration 032: Webhook Error Handling & Idempotency
-- Purpose: Add idempotency tracking and robust error handling for Stripe webhooks
-- Date: 2026-08-23
-- ============================================================================

-- ============================================================================
-- WEBHOOK_PROCESSING TABLE (Idempotency and audit)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_processing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Webhook identification
  external_id TEXT UNIQUE NOT NULL,  -- Stripe event ID (e.g., evt_xxx)
  source TEXT NOT NULL DEFAULT 'stripe' CHECK (source IN ('stripe', 'email_service', 'system')),
  event_type TEXT NOT NULL,          -- checkout.session.completed, charge.succeeded, etc.

  -- Reference data
  resource_id TEXT,                  -- Session ID, Invoice ID, etc.
  resource_type TEXT,                -- session, invoice, payment_intent, etc.

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'skipped', 'idempotent')),
  error_classification TEXT CHECK (error_classification IN ('transient', 'permanent', 'idempotent')),

  -- Attempt tracking
  attempt_number INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,

  -- Error details
  last_error TEXT,
  error_details JSONB,  -- { "code": "ECONNREFUSED", "type": "transient", "retry_count": 2 }

  -- Payload (for debugging and replay)
  payload JSONB NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,  -- { "student_email": "...", "course_id": "..." }

  -- Audit timestamps (immutable, server-generated)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  CONSTRAINT valid_status_transition CHECK (
    -- Valid status transitions only
    (status = 'pending' AND attempt_number = 0) OR
    (status IN ('processing', 'succeeded', 'failed', 'skipped', 'idempotent') AND attempt_number > 0)
  ),

  CONSTRAINT error_classification_consistency CHECK (
    -- If error_classification set, status must be failed or idempotent
    (error_classification IS NULL AND status != 'failed' AND status != 'idempotent') OR
    (error_classification IS NOT NULL AND (status = 'failed' OR status = 'idempotent'))
  )
);

-- Create indexes for efficient lookups
CREATE INDEX idx_webhook_processing_external_id ON public.webhook_processing(external_id);
CREATE INDEX idx_webhook_processing_status ON public.webhook_processing(status);
CREATE INDEX idx_webhook_processing_source_type ON public.webhook_processing(source, event_type);
CREATE INDEX idx_webhook_processing_created_at ON public.webhook_processing(created_at DESC);
CREATE INDEX idx_webhook_processing_next_retry ON public.webhook_processing(status, next_retry_at) WHERE status = 'pending' AND next_retry_at IS NOT NULL;
CREATE INDEX idx_webhook_processing_resource ON public.webhook_processing(resource_type, resource_id);

-- Create unique constraint on Stripe event ID to prevent race conditions
CREATE UNIQUE INDEX idx_webhook_processing_stripe_event_unique ON public.webhook_processing(external_id);

COMMENT ON TABLE public.webhook_processing IS 'Idempotency tracking for webhook events with error classification and retry logic';
COMMENT ON COLUMN public.webhook_processing.external_id IS 'Stripe event ID or unique identifier from webhook source - acts as idempotency key';
COMMENT ON COLUMN public.webhook_processing.error_classification IS 'TRANSIENT (retry) or PERMANENT (no retry) for Stripe retry behavior';
COMMENT ON COLUMN public.webhook_processing.attempt_number IS 'Number of processing attempts - incremented on each retry';
COMMENT ON COLUMN public.webhook_processing.max_retries IS 'Maximum retry attempts before giving up';
COMMENT ON COLUMN public.webhook_processing.next_retry_at IS 'When this webhook should be retried next (exponential backoff)';

-- ============================================================================
-- WEBHOOK_DEADLETTER TABLE (Failed webhooks for manual review)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_deadletter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to processing record
  webhook_processing_id UUID NOT NULL REFERENCES public.webhook_processing(id) ON DELETE CASCADE,

  -- Summary for human review
  error_summary TEXT NOT NULL,
  error_root_cause TEXT,
  resolution_notes TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (status IN ('unreviewed', 'reviewed', 'resolved', 'abandoned')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_admin_id UUID,

  -- Action taken
  manual_action_taken BOOLEAN DEFAULT FALSE,
  action_description TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_deadletter_status ON public.webhook_deadletter(status);
CREATE INDEX idx_webhook_deadletter_created ON public.webhook_deadletter(created_at DESC);
CREATE INDEX idx_webhook_deadletter_processing ON public.webhook_deadletter(webhook_processing_id);

COMMENT ON TABLE public.webhook_deadletter IS 'Persistent failures requiring human review and intervention';
COMMENT ON COLUMN public.webhook_deadletter.error_root_cause IS 'Root cause analysis (e.g., invalid metadata, missing column, permission denied)';

-- ============================================================================
-- STRIPE_TRANSACTION_IDEMPOTENCY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stripe_transaction_idempotency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Idempotency key
  idempotency_key TEXT UNIQUE NOT NULL,  -- Stripe Session ID

  -- Result
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  billing_history_id UUID REFERENCES public.billing_history(id) ON DELETE CASCADE,

  -- Status
  succeeded BOOLEAN DEFAULT FALSE,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT has_either_student_or_error CHECK (
    (student_id IS NOT NULL AND billing_history_id IS NOT NULL) OR
    (error_message IS NOT NULL)
  )
);

CREATE INDEX idx_stripe_idempotency_key ON public.stripe_transaction_idempotency(idempotency_key);
CREATE INDEX idx_stripe_idempotency_student ON public.stripe_transaction_idempotency(student_id);
CREATE INDEX idx_stripe_idempotency_created ON public.stripe_transaction_idempotency(created_at DESC);

COMMENT ON TABLE public.stripe_transaction_idempotency IS 'Deduplication for Stripe transaction processing - prevents duplicate billing records';

-- ============================================================================
-- HELPER FUNCTION: Check if webhook already processed (idempotency)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_webhook_idempotency(
  p_external_id TEXT,
  p_source TEXT DEFAULT 'stripe'
)
RETURNS TABLE (
  is_processed BOOLEAN,
  status TEXT,
  processing_id UUID,
  attempt_count INTEGER
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (wp.id IS NOT NULL) as is_processed,
    wp.status::text,
    wp.id as processing_id,
    wp.attempt_number
  FROM public.webhook_processing wp
  WHERE wp.external_id = p_external_id
    AND wp.source = p_source
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.check_webhook_idempotency IS 'Check if webhook already processed by external_id - prevents duplicate processing';

-- ============================================================================
-- HELPER FUNCTION: Mark webhook as processing
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_webhook_processing(
  p_external_id TEXT,
  p_source TEXT,
  p_event_type TEXT,
  p_resource_id TEXT,
  p_resource_type TEXT,
  p_payload JSONB,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_processing_id UUID;
BEGIN
  -- Insert new webhook processing record
  INSERT INTO public.webhook_processing (
    external_id,
    source,
    event_type,
    resource_id,
    resource_type,
    payload,
    metadata,
    status,
    attempt_number
  ) VALUES (
    p_external_id,
    p_source,
    p_event_type,
    p_resource_id,
    p_resource_type,
    p_payload,
    p_metadata,
    'processing',
    1
  )
  ON CONFLICT (external_id) DO UPDATE SET
    status = 'processing',
    attempt_number = webhook_processing.attempt_number + 1,
    updated_at = NOW(),
    last_error = NULL
  RETURNING id INTO v_processing_id;

  RETURN v_processing_id;
EXCEPTION WHEN OTHERS THEN
  -- Log error and re-raise
  RAISE LOG 'Error in mark_webhook_processing: %', SQLERRM;
  RAISE;
END;
$$;

COMMENT ON FUNCTION public.mark_webhook_processing IS 'Atomically mark webhook as processing - handles both new and retry cases';

-- ============================================================================
-- HELPER FUNCTION: Mark webhook as succeeded
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_webhook_succeeded(
  p_processing_id UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.webhook_processing
  SET
    status = 'succeeded',
    processed_at = NOW(),
    updated_at = NOW(),
    error_details = NULL
  WHERE id = p_processing_id;
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: Mark webhook as failed
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_webhook_failed(
  p_processing_id UUID,
  p_error_message TEXT,
  p_error_classification TEXT,
  p_error_details JSONB DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_max_retries INTEGER;
  v_attempt_count INTEGER;
  v_next_retry_at TIMESTAMPTZ;
  v_backoff_seconds INTEGER;
BEGIN
  SELECT max_retries, attempt_number INTO v_max_retries, v_attempt_count
  FROM public.webhook_processing
  WHERE id = p_processing_id;

  -- Calculate exponential backoff: 2^attempt_number * 60 seconds (1m, 2m, 4m, 8m, ...)
  v_backoff_seconds := (2 ^ LEAST(v_attempt_count, 5)) * 60;
  v_next_retry_at := NOW() + (v_backoff_seconds || ' seconds')::INTERVAL;

  UPDATE public.webhook_processing
  SET
    status = CASE
      WHEN p_error_classification = 'transient' AND v_attempt_count < v_max_retries THEN 'pending'
      ELSE 'failed'
    END,
    error_classification = p_error_classification,
    last_error = p_error_message,
    error_details = p_error_details,
    next_retry_at = CASE
      WHEN p_error_classification = 'transient' AND v_attempt_count < v_max_retries THEN v_next_retry_at
      ELSE NULL
    END,
    failed_at = CASE WHEN status = 'failed' THEN NOW() ELSE failed_at END,
    updated_at = NOW()
  WHERE id = p_processing_id;

  -- Move to deadletter if max retries exceeded
  IF v_attempt_count >= v_max_retries AND p_error_classification = 'transient' THEN
    INSERT INTO public.webhook_deadletter (
      webhook_processing_id,
      error_summary,
      error_root_cause,
      status
    ) VALUES (
      p_processing_id,
      'Max retries exceeded (' || v_max_retries || ') for transient error',
      p_error_message,
      'unreviewed'
    );
  END IF;
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: Mark webhook as idempotent (duplicate)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_webhook_idempotent(
  p_processing_id UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.webhook_processing
  SET
    status = 'idempotent',
    error_classification = 'idempotent',
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_processing_id;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.webhook_processing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deadletter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_transaction_idempotency ENABLE ROW LEVEL SECURITY;

-- Service role can access all webhook tables
CREATE POLICY "service_role_webhook_all" ON public.webhook_processing FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_deadletter_all" ON public.webhook_deadletter FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_idempotency_all" ON public.stripe_transaction_idempotency FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.webhook_processing TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.webhook_deadletter TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.stripe_transaction_idempotency TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
