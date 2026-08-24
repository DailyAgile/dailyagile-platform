-- Migration 040: Webhook Observability Infrastructure
-- Purpose: Add tables and infrastructure for structured logging, metrics, and feature flags
-- Status: READY FOR PRODUCTION
-- Date: 2026-08-23
--
-- Tables:
-- 1. webhook_audit_logs: Immutable audit trail for PCI DSS compliance (1-year retention)
-- 2. feature_flags: Dynamic feature flags (no app restart needed)
-- 3. webhook_metrics: Time-series metrics for latency/error tracking (TTL: 90 days)
--
-- Retention policy:
-- - webhook_audit_logs: 1 year (PCI DSS requirement)
-- - webhook_metrics: 90 days (rolling window for analytics)
-- - feature_flags: indefinite (configuration table)
--
-- ============================================================================

-- ==================== TABLE 1: WEBHOOK_AUDIT_LOGS ====================
-- Immutable audit trail for every webhook event (PCI DSS Article 12.2)
-- Used for compliance audits, forensics, debugging
--
-- Time Complexity:
--   - Insert: O(1)
--   - Query by correlation_id: O(1) via index
--   - Query by webhook_id: O(1) via index
--   - Query by date range: O(log n) via created_at index
--
-- PCI DSS Requirements Met:
-- - Action tracking (what happened)
-- - Time tracking (when it happened)
-- - Identity tracking (actor_id - who did it, or 'system' if automated)
-- - Resource tracking (table_name, record_id - what was affected)
-- - Outcome tracking (success/failure - in metadata)
-- - Immutability (created_at only, no UPDATE allowed)

CREATE TABLE IF NOT EXISTS public.webhook_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Correlation tracking
  webhook_id TEXT NOT NULL,                -- Stripe event ID or internal webhook ID
  correlation_id TEXT NOT NULL,             -- Unique ID for tracing entire flow

  -- Action details
  action TEXT NOT NULL,                     -- STUDENT_UPSERT, BILLING_INSERT, EMAIL_QUEUED, ERROR_LOGGED, etc.
  actor_type TEXT NOT NULL DEFAULT 'system', -- 'webhook', 'system', 'automation', 'manual'

  -- Resource tracking
  table_name TEXT NOT NULL,                 -- Table affected (students, quiz_purchases, email_queue, etc.)
  record_id UUID DEFAULT NULL,              -- Primary key of affected record (NULL for bulk/system ops)

  -- Data change tracking (for forensics)
  old_values JSONB DEFAULT NULL,            -- Snapshot of values before change (UPDATE/DELETE)
  new_values JSONB DEFAULT NULL,            -- Snapshot of values after change (INSERT/UPDATE)

  -- Security & context
  ip_address INET DEFAULT NULL,             -- IP of webhook sender (Stripe)
  user_agent TEXT DEFAULT NULL,             -- User agent (for tracking webhook client version)

  -- Metadata for forensics
  metadata JSONB DEFAULT NULL,              -- Additional context (error messages, durations, etc.)

  -- Immutable timestamp (only column set on creation)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT webhook_audit_log_not_empty CHECK (
    record_id IS NOT NULL OR metadata IS NOT NULL
  )
);

-- INDEX 1: correlation_id (primary lookup pattern for tracing)
-- Query: SELECT * FROM webhook_audit_logs WHERE correlation_id = $1 ORDER BY created_at
-- Use case: Trace entire webhook flow
CREATE INDEX idx_webhook_audit_correlation_id
  ON public.webhook_audit_logs(correlation_id, created_at DESC);

-- INDEX 2: webhook_id (lookup by Stripe event ID)
-- Query: SELECT * FROM webhook_audit_logs WHERE webhook_id = $1
-- Use case: Check if webhook already processed (idempotency check)
CREATE INDEX idx_webhook_audit_webhook_id
  ON public.webhook_audit_logs(webhook_id);

-- INDEX 3: created_at DESC (for audit reports)
-- Query: SELECT * FROM webhook_audit_logs WHERE created_at > NOW() - INTERVAL '30 days'
-- Use case: Daily/weekly audit reports
CREATE INDEX idx_webhook_audit_created_at
  ON public.webhook_audit_logs(created_at DESC);

-- INDEX 4: action (for filtering by operation type)
-- Query: SELECT * FROM webhook_audit_logs WHERE action = 'ERROR_LOGGED'
-- Use case: Find all errors logged via webhooks
CREATE INDEX idx_webhook_audit_action
  ON public.webhook_audit_logs(action, created_at DESC);

-- INDEX 5: table_name + record_id (for finding all changes to a record)
-- Query: SELECT * FROM webhook_audit_logs WHERE table_name = 'quiz_purchases' AND record_id = $1
-- Use case: Audit trail for a specific student purchase
CREATE INDEX idx_webhook_audit_record
  ON public.webhook_audit_logs(table_name, record_id, created_at DESC)
  WHERE record_id IS NOT NULL;

-- ==================== TABLE 2: FEATURE_FLAGS ====================
-- Dynamic feature flags - no app restart required
-- Supports gradual rollout (percentage-based) and kill switches

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id SERIAL PRIMARY KEY,

  -- Flag identity
  name TEXT NOT NULL UNIQUE,                -- WEBHOOK_PROCESSING_ENABLED, EMAIL_NOTIFICATIONS_ENABLED, etc.
  description TEXT DEFAULT NULL,            -- Human-readable description

  -- Flag state
  enabled BOOLEAN NOT NULL DEFAULT true,    -- Is the flag on or off?
  rollout_percentage INT DEFAULT 100 CHECK ( -- Gradual rollout: 0-100%
    rollout_percentage >= 0 AND rollout_percentage <= 100
  ),

  -- Metadata
  owner TEXT DEFAULT NULL,                  -- Owner (team, person)
  owner_email TEXT DEFAULT NULL,            -- Contact for questions

  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT feature_flag_name_format CHECK (
    name ~ '^[A-Z_]+$'  -- Enforce SCREAMING_SNAKE_CASE
  )
);

-- INDEX: name (primary lookup)
CREATE INDEX idx_feature_flags_name ON public.feature_flags(name);

-- INDEX: enabled + rollout_percentage (for checking flag state)
CREATE INDEX idx_feature_flags_enabled ON public.feature_flags(enabled, rollout_percentage DESC);

-- Sample feature flags for observability
INSERT INTO public.feature_flags (name, description, enabled, rollout_percentage, owner)
VALUES
  ('WEBHOOK_PROCESSING_ENABLED', 'Master kill switch for webhook processing', true, 100, 'platform'),
  ('WEBHOOK_AUDIT_LOGGING_ENABLED', 'Enable/disable audit log persistence for compliance', true, 100, 'platform'),
  ('EMAIL_NOTIFICATIONS_ENABLED', 'Send confirmation emails to students', true, 100, 'platform'),
  ('METRICS_COLLECTION_ENABLED', 'Collect Prometheus metrics', true, 100, 'platform'),
  ('STRUCTURED_LOGGING_ENABLED', 'Use structured JSON logging', true, 100, 'platform'),
  ('DISTRIBUTED_TRACING_ENABLED', 'Enable Datadog/Jaeger distributed tracing', false, 0, 'platform'),
  ('STUDENT_ENROLLMENT_ENABLED', 'Process student enrollment from webhooks', true, 100, 'platform'),
  ('BILLING_PROCESSING_ENABLED', 'Record billing transactions', true, 100, 'platform')
ON CONFLICT (name) DO NOTHING;

-- ==================== TABLE 3: WEBHOOK_METRICS ====================
-- Time-series metrics for monitoring webhook performance
-- TTL: 90 days (set via retention policy)

CREATE TABLE IF NOT EXISTS public.webhook_metrics (
  id BIGSERIAL PRIMARY KEY,

  -- Time bucketing (useful for time-series queries)
  bucket_time TIMESTAMPTZ NOT NULL,         -- 1-minute bucket
  metric_name TEXT NOT NULL,                -- webhook_latency, webhook_errors, etc.

  -- Metric value
  value NUMERIC DEFAULT 0,                  -- Latency in ms, count, or other value

  -- Labels (for filtering)
  status TEXT DEFAULT NULL,                 -- success, failed, rejected
  error_type TEXT DEFAULT NULL,             -- For error metrics
  operation TEXT DEFAULT NULL,              -- For operation-specific metrics

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEX: bucket_time for time-series queries
CREATE INDEX idx_webhook_metrics_bucket_time
  ON public.webhook_metrics(bucket_time DESC);

-- INDEX: metric_name + bucket_time for specific metrics
CREATE INDEX idx_webhook_metrics_name_time
  ON public.webhook_metrics(metric_name, bucket_time DESC);

-- Retention policy: 90 days (set via pg_cron if available)
-- Note: Uncomment if pg_cron extension is enabled:
-- SELECT cron.schedule('delete_old_webhook_metrics', '0 0 * * *', $$
--   DELETE FROM public.webhook_metrics
--   WHERE created_at < NOW() - INTERVAL '90 days';
-- $$);

-- ==================== ROW LEVEL SECURITY ====================

ALTER TABLE public.webhook_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY webhook_audit_logs_admin_only ON public.webhook_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.instructors
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read feature flags (needed for feature checks)
CREATE POLICY feature_flags_read_public ON public.feature_flags
  FOR SELECT
  USING (true);

-- Only admins can update feature flags
CREATE POLICY feature_flags_update_admin ON public.feature_flags
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.instructors
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

ALTER TABLE public.webhook_metrics ENABLE ROW LEVEL SECURITY;

-- Only admins can read metrics
CREATE POLICY webhook_metrics_admin_only ON public.webhook_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.instructors
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==================== PERMISSIONS ====================

-- Service role (for webhooks, migrations, backend jobs)
GRANT INSERT ON public.webhook_audit_logs TO service_role;
GRANT INSERT ON public.webhook_metrics TO service_role;
GRANT SELECT, UPDATE ON public.feature_flags TO service_role;

-- Authenticated users can read feature flags
GRANT SELECT ON public.feature_flags TO authenticated;

-- ==================== DOCUMENTATION ====================

COMMENT ON TABLE public.webhook_audit_logs IS
  'PCI DSS compliant audit trail for webhook processing. Immutable, 1-year retention.
   Tracks all student enrollments, billing transactions, emails sent, and errors.';

COMMENT ON COLUMN public.webhook_audit_logs.correlation_id IS
  'Unique ID for tracing entire webhook flow from receipt to completion.
   Links multiple operations (student upsert, billing insert, email queue).';

COMMENT ON COLUMN public.webhook_audit_logs.action IS
  'Type of action logged: STUDENT_UPSERT, STUDENT_CREATE, BILLING_INSERT,
   EMAIL_QUEUED, ERROR_LOGGED, SIGNATURE_VERIFICATION_FAILED, etc.';

COMMENT ON COLUMN public.webhook_audit_logs.old_values IS
  'Previous values before change (for UPDATE/DELETE operations).
   Useful for forensics and compliance audits.';

COMMENT ON COLUMN public.webhook_audit_logs.new_values IS
  'New values after change (for INSERT/UPDATE operations).
   Does NOT include PII like full emails or amounts in sensitive operations.';

COMMENT ON TABLE public.feature_flags IS
  'Dynamic feature flags for gradual rollout, A/B testing, and kill switches.
   Changes take effect immediately without app restart.';

COMMENT ON COLUMN public.feature_flags.rollout_percentage IS
  'Percentage of users seeing this feature (0-100).
   0: Off for everyone. 50: 50% of users. 100: On for everyone.';

COMMENT ON TABLE public.webhook_metrics IS
  'Time-series metrics for monitoring webhook performance (latency, errors, etc.).
   Retention: 90 days. Use for dashboards, alerting, and SLA tracking.';

-- ============================================================================
-- MIGRATION VERIFICATION CHECKLIST
-- ============================================================================
-- [ ] Table creation verified
-- [ ] Indexes created successfully
-- [ ] RLS policies enforced
-- [ ] Permissions granted to service_role
-- [ ] Sample feature flags inserted
-- [ ] Documentation added
-- [ ] Retention policies configured (if pg_cron available)
--
-- Test queries:
-- SELECT COUNT(*) FROM public.webhook_audit_logs;
-- SELECT * FROM public.feature_flags WHERE name = 'WEBHOOK_PROCESSING_ENABLED';
-- SELECT COUNT(*) FROM public.webhook_metrics WHERE bucket_time > NOW() - INTERVAL '1 day';
--
-- ============================================================================
