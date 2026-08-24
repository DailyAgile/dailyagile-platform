-- Migration 014: Immutable Audit Logging System
-- Purpose: Create append-only audit trail for GDPR compliance and security forensics
-- Date: 2026-08-12
-- ============================================================================

-- DESIGN PRINCIPLES:
-- 1. Append-only: INSERT only, no UPDATE/DELETE allowed at database level
-- 2. Immutable: RLS policies prevent modification
-- 3. Complete: Log all sensitive operations (auth, data access, modifications)
-- 4. Auditable: Link all logs to actors, resources, and outcomes
-- 5. GDPR-ready: Support data subject access requests and deletion tracking

-- ============================================================================
-- 1. AUDIT_LOGS_IMMUTABLE TABLE (Enhanced from migration 001)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs_immutable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor (who did this)
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  actor_ip_address INET,
  actor_user_agent TEXT,

  -- Organization/Classroom context
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,

  -- Action & Resource
  action VARCHAR(100) NOT NULL,  -- create, read, update, delete, export, verify, approve, reject, etc.
    CHECK (action IN (
      'create', 'read', 'update', 'delete', 'export', 'verify', 'approve', 'reject',
      'login', 'logout', 'password_reset', 'email_verification', 'mfa_enable', 'mfa_disable',
      'permission_grant', 'permission_revoke', 'hard_delete', 'restore',
      'data_access_request', 'data_deletion_request', 'consent_grant', 'consent_revoke'
    )),

  resource_type VARCHAR(50) NOT NULL,  -- student, course, quiz, grade, instructor, etc.
    CHECK (resource_type IN (
      'student', 'instructor', 'classroom', 'course', 'quiz', 'assignment',
      'quiz_session', 'quiz_response', 'submission', 'grade', 'user_account',
      'organization', 'team', 'api_key', 'webhook', 'feature_flag',
      'bulk_upload', 'report', 'certificate', 'extension_request'
    )),

  resource_id VARCHAR(255),  -- UUID or identifier of the resource being acted upon
  resource_name TEXT,        -- human-readable name of resource (for readability)

  -- Change details
  changes JSONB DEFAULT NULL,        -- { before: {...}, after: {...} } for UPDATE
  details JSONB DEFAULT '{}'::jsonb, -- Additional context-specific data

  -- Outcome
  status VARCHAR(50) DEFAULT 'success'  -- success, denied, error
    CHECK (status IN ('success', 'denied', 'error')),
  error_message TEXT,  -- if status = error or denied

  -- Timestamp (immutable)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Data retention metadata
  data_subject_id UUID REFERENCES public.students(id) ON DELETE SET NULL,  -- for GDPR subject access requests
  retention_until TIMESTAMPTZ,  -- when this log can be deleted (for retention policies)

  CONSTRAINT valid_changes CHECK (
    (action IN ('update', 'delete', 'restore') AND changes IS NOT NULL)
    OR (action NOT IN ('update', 'delete', 'restore'))
  )
);

-- ============================================================================
-- 2. AUDIT_LOGS_IMMUTABLE INDEXES (for query performance)
-- ============================================================================

CREATE INDEX idx_audit_logs_actor ON public.audit_logs_immutable(actor_id);
CREATE INDEX idx_audit_logs_actor_email ON public.audit_logs_immutable(actor_email);
CREATE INDEX idx_audit_logs_organization ON public.audit_logs_immutable(organization_id);
CREATE INDEX idx_audit_logs_classroom ON public.audit_logs_immutable(classroom_id);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs_immutable(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs_immutable(action);
CREATE INDEX idx_audit_logs_created ON public.audit_logs_immutable(created_at DESC);
CREATE INDEX idx_audit_logs_data_subject ON public.audit_logs_immutable(data_subject_id);
CREATE INDEX idx_audit_logs_retention ON public.audit_logs_immutable(retention_until)
  WHERE retention_until IS NOT NULL;

-- ============================================================================
-- 3. PREVENT UPDATES & DELETES ON AUDIT LOGS (Database-level constraints)
-- ============================================================================

-- This approach prevents all modifications to audit_logs_immutable table
-- Only INSERT and SELECT are allowed (enforced by RLS below)

ALTER TABLE public.audit_logs_immutable ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS POLICIES (CRITICAL: No UPDATE/DELETE, only INSERT/SELECT for authorized roles)
-- ============================================================================

-- Service role can INSERT (create audit logs)
CREATE POLICY "audit_logs_service_role_insert" ON public.audit_logs_immutable
  FOR INSERT USING (true) WITH CHECK (true);

-- Service role can SELECT (query audit logs)
CREATE POLICY "audit_logs_service_role_select" ON public.audit_logs_immutable
  FOR SELECT USING (true);

-- CRITICAL: No UPDATE or DELETE policies - audit logs are immutable

-- Authenticated users can view their own audit logs
CREATE POLICY "audit_logs_user_own_view" ON public.audit_logs_immutable
  FOR SELECT USING (actor_id = auth.uid() OR data_subject_id IN (SELECT id FROM public.students WHERE auth_user_id = auth.uid()));

-- Instructors can view classroom audit logs
CREATE POLICY "audit_logs_instructor_classroom" ON public.audit_logs_immutable
  FOR SELECT USING (
    classroom_id IN (
      SELECT id FROM public.classrooms
      WHERE instructor_id = auth.uid()
    )
  );

-- Organization admins can view organization audit logs
CREATE POLICY "audit_logs_org_admin_view" ON public.audit_logs_immutable
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 5. FUNCTION: Log Audit Event (used by application)
-- ============================================================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_action VARCHAR,
  p_resource_type VARCHAR,
  p_resource_id VARCHAR,
  p_resource_name TEXT DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_classroom_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_status VARCHAR DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL,
  p_data_subject_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_actor_id UUID;
  v_actor_email TEXT;
  v_actor_ip TEXT;
  v_actor_user_agent TEXT;
BEGIN
  -- Get actor context from current session
  v_actor_id := auth.uid();
  v_actor_email := COALESCE(auth.jwt()->>'email', 'system');
  v_actor_ip := COALESCE((current_setting('request.headers', true)::json)->>'x-forwarded-for', '127.0.0.1');
  v_actor_user_agent := COALESCE((current_setting('request.headers', true)::json)->>'user-agent', 'unknown');

  -- Create audit log entry
  INSERT INTO public.audit_logs_immutable (
    actor_id,
    actor_email,
    actor_ip_address,
    actor_user_agent,
    organization_id,
    classroom_id,
    action,
    resource_type,
    resource_id,
    resource_name,
    changes,
    details,
    status,
    error_message,
    data_subject_id,
    retention_until
  ) VALUES (
    v_actor_id,
    v_actor_email,
    v_actor_ip::INET,
    v_actor_user_agent,
    p_organization_id,
    p_classroom_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    p_changes,
    p_details,
    p_status,
    p_error_message,
    p_data_subject_id,
    NOW() + INTERVAL '7 years'  -- GDPR default: 7-year retention
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. FUNCTION: Trigger for Automatic Audit Logging on Sensitive Tables
-- ============================================================================

-- This trigger captures changes to sensitive tables automatically
CREATE OR REPLACE FUNCTION audit_log_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  v_action VARCHAR;
  v_changes JSONB;
BEGIN
  -- Determine action type
  CASE
    WHEN TG_OP = 'INSERT' THEN v_action := 'create';
    WHEN TG_OP = 'UPDATE' THEN v_action := 'update';
    WHEN TG_OP = 'DELETE' THEN v_action := 'delete';
  END CASE;

  -- Capture changes for UPDATE
  IF TG_OP = 'UPDATE' THEN
    v_changes := jsonb_build_object(
      'before', row_to_json(OLD),
      'after', row_to_json(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'before', row_to_json(OLD)
    );
  END IF;

  -- Log to audit trail
  INSERT INTO public.audit_logs_immutable (
    actor_email,
    resource_type,
    resource_id,
    action,
    changes,
    details
  ) VALUES (
    COALESCE(auth.jwt()->>'email', 'system'),
    TG_TABLE_NAME,
    (CASE WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT ELSE NEW.id::TEXT END),
    v_action,
    v_changes,
    jsonb_build_object('table_schema', TG_TABLE_SCHEMA)
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. ATTACH AUDIT TRIGGERS TO SENSITIVE TABLES
-- ============================================================================

-- Trigger on students table (sensitive: user data)
DROP TRIGGER IF EXISTS audit_log_students ON public.students;
CREATE TRIGGER audit_log_students
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_trigger_function();

-- Trigger on quizzes table (sensitive: content ownership)
DROP TRIGGER IF EXISTS audit_log_quizzes ON public.quizzes;
CREATE TRIGGER audit_log_quizzes
  AFTER INSERT OR UPDATE OR DELETE ON public.quizzes
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_trigger_function();

-- Trigger on quiz_responses table (sensitive: student answers)
DROP TRIGGER IF EXISTS audit_log_quiz_responses ON public.quiz_responses;
CREATE TRIGGER audit_log_quiz_responses
  AFTER INSERT OR UPDATE OR DELETE ON public.quiz_responses
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_trigger_function();

-- Trigger on quiz_sessions table (sensitive: attempt tracking)
DROP TRIGGER IF EXISTS audit_log_quiz_sessions ON public.quiz_sessions;
CREATE TRIGGER audit_log_quiz_sessions
  AFTER INSERT OR UPDATE OR DELETE ON public.quiz_sessions
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_trigger_function();

-- ============================================================================
-- 8. GDPR DATA ACCESS FUNCTION
-- ============================================================================

-- Allow students/subjects to access their own audit logs (GDPR Article 15)
CREATE OR REPLACE FUNCTION get_data_subject_access_logs(
  p_data_subject_id UUID
) RETURNS TABLE (
  action VARCHAR,
  resource_type VARCHAR,
  resource_name TEXT,
  actor_email TEXT,
  created_at TIMESTAMPTZ,
  details JSONB
) AS $$
BEGIN
  -- Verify requestor is the data subject or admin
  IF auth.uid() != p_data_subject_id AND NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized to access these logs';
  END IF;

  RETURN QUERY
  SELECT
    al.action,
    al.resource_type,
    al.resource_name,
    al.actor_email,
    al.created_at,
    al.details
  FROM public.audit_logs_immutable al
  WHERE al.data_subject_id = p_data_subject_id
  ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. GDPR DATA DELETION FUNCTION
-- ============================================================================

-- Mark logs for deletion when a student account is deleted (GDPR Article 17)
-- Note: Logs are marked for deletion but may be retained if legal requirements exist
CREATE OR REPLACE FUNCTION mark_data_for_deletion(
  p_data_subject_id UUID,
  p_reason TEXT DEFAULT 'GDPR Right to be Forgotten'
) RETURNS TABLE (
  logs_marked_for_deletion INTEGER,
  retention_until TIMESTAMPTZ
) AS $$
DECLARE
  v_deletion_date TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Verify requestor is the data subject
  IF auth.uid() != p_data_subject_id THEN
    RAISE EXCEPTION 'Cannot request deletion of another user''s data';
  END IF;

  -- Set deletion to 30 days from now (grace period for legal hold)
  v_deletion_date := NOW() + INTERVAL '30 days';

  -- Update audit logs to mark for deletion
  UPDATE public.audit_logs_immutable
  SET retention_until = v_deletion_date
  WHERE data_subject_id = p_data_subject_id
    AND retention_until > v_deletion_date;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Log the deletion request itself
  PERFORM log_audit_event(
    'data_deletion_request',
    'user_account',
    p_data_subject_id::TEXT,
    NULL,
    NULL,
    NULL,
    NULL,
    jsonb_build_object('reason', p_reason, 'grace_period_until', v_deletion_date),
    'success',
    NULL,
    p_data_subject_id
  );

  RETURN QUERY SELECT v_count::INTEGER, v_deletion_date::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. MAINTENANCE FUNCTION: Clean Expired Logs
-- ============================================================================

-- Run this periodically (via cron) to delete logs past retention date
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.audit_logs_immutable
  WHERE retention_until IS NOT NULL
    AND retention_until < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.audit_logs_immutable IS 'GDPR-compliant append-only audit trail. No UPDATE/DELETE allowed. Immutable by RLS.';
COMMENT ON COLUMN public.audit_logs_immutable.action IS 'What was done (create, update, delete, login, verify, approve, etc.)';
COMMENT ON COLUMN public.audit_logs_immutable.resource_type IS 'What type of entity was affected (student, quiz, grade, etc.)';
COMMENT ON COLUMN public.audit_logs_immutable.resource_id IS 'Unique ID of the affected entity';
COMMENT ON COLUMN public.audit_logs_immutable.changes IS 'For UPDATE/DELETE: { before: {...}, after: {...} }';
COMMENT ON COLUMN public.audit_logs_immutable.status IS 'Outcome: success, denied (authorization), error (technical)';
COMMENT ON COLUMN public.audit_logs_immutable.data_subject_id IS 'Links to student if log involves personal data (for GDPR access requests)';
COMMENT ON COLUMN public.audit_logs_immutable.retention_until IS 'When this log can be deleted (GDPR retention policy)';

COMMENT ON FUNCTION log_audit_event IS 'Call this to manually log an event to the audit trail';
COMMENT ON FUNCTION audit_log_trigger_function IS 'Automatic trigger function for sensitive table monitoring';
COMMENT ON FUNCTION get_data_subject_access_logs IS 'GDPR Article 15: Data subject access request - returns all logs involving the subject';
COMMENT ON FUNCTION mark_data_for_deletion IS 'GDPR Article 17: Right to be forgotten - marks subject''s logs for deletion';
COMMENT ON FUNCTION cleanup_expired_audit_logs IS 'Maintenance: Run periodically to delete expired logs (past retention_until date)';

-- ============================================================================
-- 12. GRANT PERMISSIONS
-- ============================================================================

GRANT INSERT, SELECT ON public.audit_logs_immutable TO service_role;
GRANT EXECUTE ON FUNCTION log_audit_event TO service_role;
GRANT EXECUTE ON FUNCTION audit_log_trigger_function TO service_role;
GRANT EXECUTE ON FUNCTION get_data_subject_access_logs TO authenticated;
GRANT EXECUTE ON FUNCTION mark_data_for_deletion TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_audit_logs TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE - IMMUTABLE AUDIT SYSTEM READY
-- ============================================================================

-- USAGE EXAMPLES:

-- 1. Manually log an event:
--    SELECT log_audit_event(
--      'hard_delete', 'quiz', quiz_id::TEXT, 'Quiz Title',
--      NULL, classroom_id, NULL,
--      '{"reason":"instructor request"}'::jsonb
--    );

-- 2. Access your own audit logs (as student):
--    SELECT * FROM get_data_subject_access_logs(auth.uid());

-- 3. Request data deletion (as student):
--    SELECT * FROM mark_data_for_deletion(auth.uid(), 'GDPR Right to be Forgotten');

-- 4. Cleanup expired logs (run via pg_cron):
--    SELECT cleanup_expired_audit_logs();

-- SCHEMA NOTES:
-- - Logs are write-once (INSERT only)
-- - RLS prevents all UPDATE/DELETE operations
-- - Automatic triggers capture changes to sensitive tables
-- - GDPR-ready: supports access requests + deletion marking
-- - Retention policy: 7 years by default, configurable via retention_until
-- - IP address + user agent captured for forensics
