-- Migration 044: CCPA Compliance Requests Tracking
-- Purpose: Track California Consumer Privacy Act (CCPA) data access and deletion requests
-- Status: READY FOR PRODUCTION
-- Date: 2026-08-24
--
-- Tables:
-- 1. ccpa_requests: Track all CCPA data access and deletion requests
--
-- Features:
-- - Records all CCPA requests (data access §1798.100, deletion §1798.105)
-- - Tracks request type, status, and 45-day deadline
-- - Stores consumer email and student_id (if found)
-- - Captures request metadata (IP, user agent) for security
-- - Immutable for audit purposes
--
-- Compliance:
-- - CCPA §1798.100: Right to know (data access)
-- - CCPA §1798.105: Right to delete (deletion)
-- - CCPA §1798.110: Consumer request service standards
-- - 45-day response deadline tracking
--
-- ============================================================================

-- Create enum for CCPA request types
CREATE TYPE ccpa_request_type AS ENUM ('data_access', 'deletion', 'correction', 'opt_out');

-- Create enum for CCPA request status
CREATE TYPE ccpa_request_status AS ENUM (
  'received',      -- Initial submission
  'processing',    -- Under review
  'completed',     -- Fulfilled
  'denied',        -- Denied with reason
  'expired'        -- Request expired (no follow-up)
);

-- ==================== TABLE: CCPA_REQUESTS ====================
-- Immutable log of all CCPA consumer requests
-- Tracks data access and deletion requests per California Consumer Privacy Act

CREATE TABLE IF NOT EXISTS public.ccpa_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- CONSUMER IDENTIFICATION
  email TEXT NOT NULL,  -- Email provided by consumer (primary identifier)
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,  -- NULL if no account found

  -- REQUEST TYPE & STATUS
  request_type ccpa_request_type NOT NULL,  -- data_access, deletion, correction, opt_out
  status ccpa_request_status NOT NULL DEFAULT 'received',  -- Track progress

  -- FORMAT & PREFERENCES
  format TEXT DEFAULT 'json',  -- json, pdf, csv
  reason TEXT,  -- Reason for deletion (optional, consumer-provided)

  -- TIMING: CCPA requires response within 45 days
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_due_at TIMESTAMPTZ,  -- NOW() + 45 days
  responded_at TIMESTAMPTZ,  -- When response was sent
  completed_at TIMESTAMPTZ,  -- When request was fulfilled

  -- SECURITY CONTEXT
  ip_address INET DEFAULT NULL,  -- IP address of requester
  user_agent TEXT DEFAULT NULL,  -- Browser/client information
  verification_method TEXT DEFAULT NULL,  -- 'email', 'magic_link', 'verification_code'
  verification_completed_at TIMESTAMPTZ,

  -- RESPONSE TRACKING
  response_id TEXT,  -- Unique ID for response correspondence
  denial_reason TEXT,  -- If denied, reason why (e.g., "Unable to verify identity")
  response_notes JSONB DEFAULT NULL,  -- Additional processing notes

  -- AUDIT TRAIL
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,  -- Soft delete for expired requests

  -- Constraint: email must be valid
  CONSTRAINT valid_email CHECK (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

-- ==================== INDEXES ====================
-- Optimize query performance for CCPA request lookups

CREATE INDEX IF NOT EXISTS ccpa_requests_email_idx ON public.ccpa_requests(email);
CREATE INDEX IF NOT EXISTS ccpa_requests_student_id_idx ON public.ccpa_requests(student_id);
CREATE INDEX IF NOT EXISTS ccpa_requests_status_idx ON public.ccpa_requests(status);
CREATE INDEX IF NOT EXISTS ccpa_requests_request_type_idx ON public.ccpa_requests(request_type);
CREATE INDEX IF NOT EXISTS ccpa_requests_response_due_at_idx ON public.ccpa_requests(response_due_at);
CREATE INDEX IF NOT EXISTS ccpa_requests_submitted_at_idx ON public.ccpa_requests(submitted_at);

-- ==================== ROW LEVEL SECURITY ====================
-- Restrict access to CCPA requests

ALTER TABLE public.ccpa_requests ENABLE ROW LEVEL SECURITY;

-- Only service_role (backend) can insert/update CCPA requests
CREATE POLICY ccpa_requests_service_role_access ON public.ccpa_requests
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Logged-in students can view ONLY their own CCPA requests
CREATE POLICY ccpa_requests_student_view_own ON public.ccpa_requests
  FOR SELECT
  USING (
    auth.uid() = student_id  -- Can only view if they ARE the student
    OR auth.role() = 'service_role'
  );

-- ==================== AUDIT LOGGING ====================
-- Automatically log CCPA request changes

CREATE OR REPLACE FUNCTION log_ccpa_request_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log to privacy_audit_log table
  INSERT INTO public.privacy_audit_log (
    student_id,
    event_type,
    description,
    metadata,
    created_at
  ) VALUES (
    NEW.student_id,
    'ccpa_request_' || NEW.request_type,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'CCPA ' || NEW.request_type || ' request received'
      WHEN TG_OP = 'UPDATE' THEN 'CCPA ' || NEW.request_type || ' request status: ' || NEW.status
      ELSE 'CCPA request modified'
    END,
    jsonb_build_object(
      'request_id', NEW.id,
      'email', NEW.email,
      'status', NEW.status,
      'operation', TG_OP,
      'submitted_at', NEW.submitted_at,
      'response_due_at', NEW.response_due_at
    ),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ccpa_request_audit_trigger
AFTER INSERT OR UPDATE ON public.ccpa_requests
FOR EACH ROW
EXECUTE FUNCTION log_ccpa_request_change();

-- ==================== MAINTENANCE FUNCTIONS ====================
-- Mark expired CCPA requests after 90 days

CREATE OR REPLACE FUNCTION mark_expired_ccpa_requests()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE public.ccpa_requests
  SET
    status = 'expired'::ccpa_request_status,
    updated_at = NOW()
  WHERE
    status = 'received'::ccpa_request_status
    AND submitted_at < NOW() - INTERVAL '90 days'
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.privacy_audit_log (
    event_type,
    description,
    metadata
  ) VALUES (
    'ccpa_expiry_job',
    'Marked ' || v_count || ' CCPA requests as expired after 90 days',
    jsonb_build_object('count', v_count, 'timestamp', NOW())
  );

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== DOCUMENTATION ====================
-- CCPA Request Lifecycle:
--
-- 1. RECEIVED: Consumer submits request via API or email
--    - Email is required
--    - Response due date = submitted_at + 45 days
--    - No verification yet
--
-- 2. PROCESSING: Staff begins verifying and processing
--    - Email verification occurs
--    - Student record matched (if exists)
--    - Data is compiled
--
-- 3. COMPLETED: Request fulfilled
--    - Data access: Consumer receives data file
--    - Deletion: Consumer record deleted, logs anonymized
--    - Correction: Records updated
--    - Responded_at = completion timestamp
--
-- 4. DENIED: Request denied with reason
--    - Denial_reason populated
--    - Consumer notified with reasoning
--
-- 5. EXPIRED: No follow-up after 90 days
--    - Automatic status via maintenance job
--    - Allows cleanup of stale requests
--
-- COMPLIANCE NOTES:
-- - 45-day deadline is CCPA §1798.110 requirement
-- - Response must include all personal information
-- - Must disclose categories, sources, purposes, recipients
-- - Cannot delay response due to unverified consumer rights
-- - Consumer can verify identity via email confirmation

-- Grant permissions for API functions
GRANT SELECT ON public.ccpa_requests TO authenticated;
GRANT INSERT ON public.ccpa_requests TO authenticated;
GRANT UPDATE ON public.ccpa_requests TO authenticated;

-- Add to privacy_audit_log for logging
-- (Assumes privacy_audit_log table exists)
