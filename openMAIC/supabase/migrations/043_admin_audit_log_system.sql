-- Migration 042: Admin Audit Log System
-- Purpose: Track all admin access to sensitive tables for regulatory compliance
-- Status: READY FOR PRODUCTION
-- Date: 2026-08-23
--
-- Tables:
-- 1. admin_audit_log: Immutable log of all admin actions on sensitive data
--
-- Features:
-- - Tracks WHO (admin_user_id), WHEN (timestamp), WHAT (action), WHERE (table_name)
-- - Captures before/after values for all modifications
-- - Includes IP address for security tracking
-- - Immutable (INSERT only, no UPDATE/DELETE)
-- - RLS restricted to service_role and authorized admins
--
-- Compliance:
-- - SOC 2 Requirement: Track all privileged user access
-- - PCI DSS Requirement: Audit trail for sensitive data access
-- - GDPR Requirement: Log data processing actions by admins
--
-- ============================================================================

-- ==================== TABLE: ADMIN_AUDIT_LOG ====================
-- Immutable log of admin actions on sensitive tables
-- Tracks: webhook_audit_logs, feature_flags, email_queue, etc.

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WHO: Admin identity
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  admin_email TEXT NOT NULL,  -- Denormalized for quick viewing

  -- WHEN: Timestamp (immutable)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- WHERE & WHAT: Action details
  action TEXT NOT NULL,  -- SELECT, INSERT, UPDATE, DELETE
  table_name TEXT NOT NULL,  -- webhook_audit_logs, feature_flags, email_queue, deadletter_queue
  row_id TEXT,  -- Primary key or record ID of affected record (NULL for bulk/system ops)

  -- HOW: Before/after values for modifications
  before_values JSONB DEFAULT NULL,  -- Snapshot before change (for UPDATE/DELETE)
  after_values JSONB DEFAULT NULL,   -- Snapshot after change (for INSERT/UPDATE)

  -- WHERE (network): Context for security
  ip_address INET DEFAULT NULL,  -- IP of admin's request
  user_agent TEXT DEFAULT NULL,  -- Browser/client info

  -- WHY: Admin reason/comment
  reason TEXT,  -- Optional: why this action was taken

  -- Metadata for forensics
  metadata JSONB DEFAULT NULL,  -- Additional context (query duration, affected rows, etc.)

  -- Constraints
  CONSTRAINT admin_audit_not_empty CHECK (
    action IS NOT NULL AND table_name IS NOT NULL
  )
);

-- ==================== INDEXES ====================

-- INDEX 1: admin_user_id + created_at (find all actions by an admin)
-- Query: SELECT * FROM admin_audit_log WHERE admin_user_id = $1 ORDER BY created_at DESC
-- Use case: Audit all actions by a specific admin
CREATE INDEX idx_admin_audit_by_admin
  ON public.admin_audit_log(admin_user_id, created_at DESC);

-- INDEX 2: table_name + created_at (find all changes to a sensitive table)
-- Query: SELECT * FROM admin_audit_log WHERE table_name = 'feature_flags' ORDER BY created_at DESC
-- Use case: Audit trail for a specific sensitive table
CREATE INDEX idx_admin_audit_by_table
  ON public.admin_audit_log(table_name, created_at DESC);

-- INDEX 3: created_at DESC (for compliance reports, most recent first)
-- Query: SELECT * FROM admin_audit_log WHERE created_at > NOW() - INTERVAL '30 days'
-- Use case: Weekly/monthly compliance audit reports
CREATE INDEX idx_admin_audit_created_at
  ON public.admin_audit_log(created_at DESC);

-- INDEX 4: action + created_at (find all modifications vs reads)
-- Query: SELECT * FROM admin_audit_log WHERE action IN ('INSERT', 'UPDATE', 'DELETE')
-- Use case: Find all data-modifying actions
CREATE INDEX idx_admin_audit_action
  ON public.admin_audit_log(action, created_at DESC);

-- INDEX 5: table_name + row_id + created_at (audit trail for specific record)
-- Query: SELECT * FROM admin_audit_log WHERE table_name = 'feature_flags' AND row_id = '42'
-- Use case: Full history of changes to a specific record
CREATE INDEX idx_admin_audit_record
  ON public.admin_audit_log(table_name, row_id, created_at DESC)
  WHERE row_id IS NOT NULL;

-- INDEX 6: admin_email for quick lookups by email
CREATE INDEX idx_admin_audit_admin_email
  ON public.admin_audit_log(admin_email, created_at DESC);

-- ==================== FUNCTION: log_admin_access ====================
-- Called by triggers to record admin actions
-- Automatically called on INSERT/UPDATE/DELETE of sensitive tables

CREATE OR REPLACE FUNCTION log_admin_access(
  p_admin_user_id UUID,
  p_admin_email TEXT,
  p_action TEXT,
  p_table_name TEXT,
  p_row_id TEXT DEFAULT NULL,
  p_before_values JSONB DEFAULT NULL,
  p_after_values JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    admin_email,
    action,
    table_name,
    row_id,
    before_values,
    after_values,
    ip_address,
    user_agent,
    reason,
    metadata
  ) VALUES (
    p_admin_user_id,
    p_admin_email,
    p_action,
    p_table_name,
    p_row_id,
    p_before_values,
    p_after_values,
    p_ip_address,
    p_user_agent,
    p_reason,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== FUNCTION: trigger_audit_webhook_audit_logs ====================
-- Trigger for webhook_audit_logs table
-- Logs whenever an admin views or modifies the audit log itself

CREATE OR REPLACE FUNCTION trigger_audit_webhook_audit_logs()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_admin_email TEXT;
BEGIN
  -- Get current admin user ID from JWT
  v_admin_id := auth.uid();

  -- Get admin email from instructors table (only if user is admin)
  SELECT email INTO v_admin_email
  FROM public.instructors
  WHERE id = v_admin_id AND role = 'admin'
  LIMIT 1;

  -- Only log if action is by an admin (otherwise silently ignore)
  IF v_admin_id IS NOT NULL AND v_admin_email IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      PERFORM log_admin_access(
        p_admin_user_id := v_admin_id,
        p_admin_email := v_admin_email,
        p_action := 'INSERT',
        p_table_name := 'webhook_audit_logs',
        p_row_id := NEW.id::TEXT,
        p_after_values := row_to_json(NEW),
        p_metadata := jsonb_build_object('correlation_id', NEW.correlation_id)
      );
    ELSIF TG_OP = 'UPDATE' THEN
      PERFORM log_admin_access(
        p_admin_user_id := v_admin_id,
        p_admin_email := v_admin_email,
        p_action := 'UPDATE',
        p_table_name := 'webhook_audit_logs',
        p_row_id := NEW.id::TEXT,
        p_before_values := row_to_json(OLD),
        p_after_values := row_to_json(NEW)
      );
    ELSIF TG_OP = 'DELETE' THEN
      PERFORM log_admin_access(
        p_admin_user_id := v_admin_id,
        p_admin_email := v_admin_email,
        p_action := 'DELETE',
        p_table_name := 'webhook_audit_logs',
        p_row_id := OLD.id::TEXT,
        p_before_values := row_to_json(OLD)
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to webhook_audit_logs
CREATE TRIGGER audit_webhook_audit_logs_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.webhook_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_audit_webhook_audit_logs();

-- ==================== FUNCTION: trigger_audit_feature_flags ====================
-- Trigger for feature_flags table
-- Logs all changes to feature flags (kill switches, rollout changes)

CREATE OR REPLACE FUNCTION trigger_audit_feature_flags()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_admin_email TEXT;
BEGIN
  v_admin_id := auth.uid();

  SELECT email INTO v_admin_email
  FROM public.instructors
  WHERE id = v_admin_id AND role = 'admin'
  LIMIT 1;

  IF v_admin_id IS NOT NULL AND v_admin_email IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      PERFORM log_admin_access(
        p_admin_user_id := v_admin_id,
        p_admin_email := v_admin_email,
        p_action := 'INSERT',
        p_table_name := 'feature_flags',
        p_row_id := NEW.id::TEXT,
        p_after_values := row_to_json(NEW),
        p_metadata := jsonb_build_object('flag_name', NEW.name)
      );
    ELSIF TG_OP = 'UPDATE' THEN
      PERFORM log_admin_access(
        p_admin_user_id := v_admin_id,
        p_admin_email := v_admin_email,
        p_action := 'UPDATE',
        p_table_name := 'feature_flags',
        p_row_id := NEW.id::TEXT,
        p_before_values := row_to_json(OLD),
        p_after_values := row_to_json(NEW),
        p_metadata := jsonb_build_object(
          'flag_name', NEW.name,
          'enabled_changed', (OLD.enabled != NEW.enabled),
          'rollout_changed', (OLD.rollout_percentage != NEW.rollout_percentage)
        )
      );
    ELSIF TG_OP = 'DELETE' THEN
      PERFORM log_admin_access(
        p_admin_user_id := v_admin_id,
        p_admin_email := v_admin_email,
        p_action := 'DELETE',
        p_table_name := 'feature_flags',
        p_row_id := OLD.id::TEXT,
        p_before_values := row_to_json(OLD),
        p_metadata := jsonb_build_object('flag_name', OLD.name)
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to feature_flags
CREATE TRIGGER audit_feature_flags_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION trigger_audit_feature_flags();

-- ==================== FUNCTION: trigger_audit_email_queue ====================
-- Trigger for email_queue table
-- Logs all email operations (sent, failed, retried)

CREATE OR REPLACE FUNCTION trigger_audit_email_queue()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_admin_email TEXT;
BEGIN
  v_admin_id := auth.uid();

  SELECT email INTO v_admin_email
  FROM public.instructors
  WHERE id = v_admin_id AND role = 'admin'
  LIMIT 1;

  IF v_admin_id IS NOT NULL AND v_admin_email IS NOT NULL THEN
    IF TG_OP = 'UPDATE' THEN
      -- Only log if status or retry count changed (not every heartbeat update)
      IF OLD.status != NEW.status OR OLD.retry_count != NEW.retry_count THEN
        PERFORM log_admin_access(
          p_admin_user_id := v_admin_id,
          p_admin_email := v_admin_email,
          p_action := 'UPDATE',
          p_table_name := 'email_queue',
          p_row_id := NEW.id::TEXT,
          p_before_values := jsonb_build_object('status', OLD.status, 'retry_count', OLD.retry_count),
          p_after_values := jsonb_build_object('status', NEW.status, 'retry_count', NEW.retry_count),
          p_metadata := jsonb_build_object('recipient', NEW.recipient_email)
        );
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      PERFORM log_admin_access(
        p_admin_user_id := v_admin_id,
        p_admin_email := v_admin_email,
        p_action := 'DELETE',
        p_table_name := 'email_queue',
        p_row_id := OLD.id::TEXT,
        p_before_values := row_to_json(OLD),
        p_metadata := jsonb_build_object('recipient', OLD.recipient_email)
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to email_queue (if table exists)
DO $$
BEGIN
  CREATE TRIGGER audit_email_queue_trigger
    AFTER UPDATE OR DELETE ON public.email_queue
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_email_queue();
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- ==================== ROW LEVEL SECURITY ====================

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy 1: Only service_role can insert (via SECURITY DEFINER trigger functions)
CREATE POLICY admin_audit_insert_service_role ON public.admin_audit_log
  FOR INSERT
  WITH CHECK (
    current_user = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.instructors
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy 2: Only admins can select audit logs
CREATE POLICY admin_audit_select_admin_only ON public.admin_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.instructors
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy 3: PREVENT UPDATE (immutable log)
-- Even admins cannot update audit entries
-- No CREATE POLICY for UPDATE = implicit deny

-- Policy 4: PREVENT DELETE (immutable log)
-- Even admins cannot delete audit entries
-- No CREATE POLICY for DELETE = implicit deny

-- ==================== PERMISSIONS ====================

-- Service role: can insert (via triggers), can read (for admin queries)
GRANT INSERT ON public.admin_audit_log TO service_role;
GRANT SELECT ON public.admin_audit_log TO service_role;

-- Authenticated users: no direct access (RLS prevents)
-- Admins access via SELECT policy above

-- Functions: only service_role can execute
GRANT EXECUTE ON FUNCTION log_admin_access TO service_role;
GRANT EXECUTE ON FUNCTION trigger_audit_webhook_audit_logs TO service_role;
GRANT EXECUTE ON FUNCTION trigger_audit_feature_flags TO service_role;
GRANT EXECUTE ON FUNCTION trigger_audit_email_queue TO service_role;

-- ==================== DOCUMENTATION ====================

COMMENT ON TABLE public.admin_audit_log IS
  'Immutable audit log for admin access to sensitive tables.
   Tracks: webhook_audit_logs, feature_flags, email_queue (status changes).
   Used for SOC 2, PCI DSS, GDPR compliance. Retention: indefinite.
   INSERT only - no UPDATE/DELETE allowed.';

COMMENT ON COLUMN public.admin_audit_log.admin_user_id IS
  'UUID of the admin who performed the action. References auth.users(id).
   Never null - enforced by constraint.';

COMMENT ON COLUMN public.admin_audit_log.admin_email IS
  'Email address of the admin (denormalized for quick access).
   Populated from instructors.email where role = admin.';

COMMENT ON COLUMN public.admin_audit_log.action IS
  'Type of action: SELECT (view), INSERT, UPDATE, DELETE.
   SELECT actions are NOT automatically logged (too verbose).
   Only data-modifying actions and explicit admin queries logged.';

COMMENT ON COLUMN public.admin_audit_log.table_name IS
  'Name of sensitive table affected: webhook_audit_logs, feature_flags,
   email_queue, deadletter_queue, etc.';

COMMENT ON COLUMN public.admin_audit_log.row_id IS
  'Primary key of affected record. NULL for bulk operations or view-only actions.
   For example: UUID of a feature_flag record, or id of an email_queue entry.';

COMMENT ON COLUMN public.admin_audit_log.before_values IS
  'Snapshot of row values before the change (for UPDATE/DELETE).
   Useful for forensics and compliance audits.
   May omit sensitive fields (PII, payment info) per GDPR.';

COMMENT ON COLUMN public.admin_audit_log.after_values IS
  'Snapshot of row values after the change (for INSERT/UPDATE).
   Useful for understanding what changed and why.
   May omit sensitive fields per GDPR.';

COMMENT ON COLUMN public.admin_audit_log.ip_address IS
  'IP address of the admin making the request (from HTTP header X-Forwarded-For).
   Useful for detecting unauthorized access from unusual locations.';

COMMENT ON COLUMN public.admin_audit_log.reason IS
  'Optional admin-provided reason for the action.
   Example: "Disabling webhook processing for maintenance - 2 hour window"
   Helps with compliance audits and root cause analysis.';

COMMENT ON FUNCTION log_admin_access IS
  'Insert a record into admin_audit_log.
   Called by triggers on sensitive tables.
   SECURITY DEFINER so it always executes with service_role permissions.';

COMMENT ON FUNCTION trigger_audit_webhook_audit_logs IS
  'Trigger function: logs all INSERT/UPDATE/DELETE on webhook_audit_logs.
   Automatically called on data changes. Only logs if current user is admin.';

COMMENT ON FUNCTION trigger_audit_feature_flags IS
  'Trigger function: logs all INSERT/UPDATE/DELETE on feature_flags.
   Captures flag name, enabled state, and rollout percentage changes.';

COMMENT ON FUNCTION trigger_audit_email_queue IS
  'Trigger function: logs UPDATE/DELETE on email_queue.
   Only logs status/retry_count changes (not every heartbeat update).';

-- ============================================================================
-- MIGRATION VERIFICATION CHECKLIST
-- ============================================================================
-- [ ] admin_audit_log table created
-- [ ] All 6 indexes created successfully
-- [ ] RLS policies enforced (INSERT allowed, UPDATE/DELETE blocked)
-- [ ] Triggers attached to webhook_audit_logs, feature_flags, email_queue
-- [ ] Functions created and compiled
-- [ ] Permissions granted to service_role
-- [ ] Documentation added
--
-- Test queries (run as admin user):
-- SELECT COUNT(*) FROM public.admin_audit_log;
-- SELECT * FROM public.admin_audit_log ORDER BY created_at DESC LIMIT 10;
-- SELECT admin_email, COUNT(*) as action_count FROM public.admin_audit_log
--   WHERE created_at > NOW() - INTERVAL '7 days'
--   GROUP BY admin_email;
-- SELECT table_name, action, COUNT(*) as count FROM public.admin_audit_log
--   GROUP BY table_name, action;
--
-- Test immutability (run as admin, should fail):
-- UPDATE public.admin_audit_log SET reason = 'test' WHERE id = <any_id>;
-- DELETE FROM public.admin_audit_log WHERE id = <any_id>;
--
-- ============================================================================
