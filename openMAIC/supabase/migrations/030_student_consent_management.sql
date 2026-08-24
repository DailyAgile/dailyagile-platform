-- Migration 030: Student Consent Management System
-- Depends on: 029_atomic_sm2_updates_and_export_limits
-- Created: 2026-08-15
-- Purpose: GDPR Article 7 compliant consent tracking and privacy management

-- Student Consent Management System
-- GDPR Article 7 compliant consent tracking
-- Tracks all privacy notices accepted by students

-- Student Consents Table
CREATE TABLE IF NOT EXISTS student_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL,
  -- consent_type values: 'privacy', 'marketing', 'analytics', 'third_party'
  given BOOLEAN DEFAULT FALSE,
  given_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  ip_address INET,
  user_agent VARCHAR(500),
  policy_version INTEGER DEFAULT 1,
  -- Tracks which version of privacy policy they consented to
  metadata JSONB DEFAULT '{}',
  -- Can store additional context (e.g., { "source": "signup_form", "utm_source": "email" })
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: only one active consent per student per type
  CONSTRAINT unique_student_consent_type UNIQUE (student_id, consent_type)
);

-- Deletion Requests Table
-- Implements GDPR Article 17 Right to Erasure with 30-day grace period
CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- status values: 'pending', 'processing', 'completed', 'cancelled'
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  will_be_deleted_at TIMESTAMPTZ NOT NULL,
  -- 30 days from request_at by default
  processing_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  reason VARCHAR(500),
  -- e.g., "Student requested deletion"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing Preferences Table
-- CCPA compliance: easy opt-out of marketing
CREATE TABLE IF NOT EXISTS marketing_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  email_marketing BOOLEAN DEFAULT FALSE,
  sms_marketing BOOLEAN DEFAULT FALSE,
  push_notifications BOOLEAN DEFAULT FALSE,
  leaderboard_public BOOLEAN DEFAULT TRUE,
  -- Allow students to exclude themselves from public leaderboards
  analytics_tracking BOOLEAN DEFAULT TRUE,
  -- Can opt out of usage analytics
  third_party_sharing BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log: Privacy-Related Events
-- Immutable log for compliance audit trail
CREATE TABLE IF NOT EXISTS privacy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  -- e.g., 'consent_given', 'consent_withdrawn', 'data_exported', 'account_deleted_requested', 'account_deleted_completed'
  description TEXT,
  ip_address INET,
  user_agent VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Immutable: no updates allowed
  CONSTRAINT privacy_audit_log_immutable CHECK (true)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_student_consents_student_id
  ON student_consents(student_id);

CREATE INDEX IF NOT EXISTS idx_student_consents_type
  ON student_consents(consent_type);

CREATE INDEX IF NOT EXISTS idx_student_consents_given
  ON student_consents(student_id, consent_type, given);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_student_id
  ON deletion_requests(student_id);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_status
  ON deletion_requests(status);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_will_be_deleted_at
  ON deletion_requests(will_be_deleted_at);

CREATE INDEX IF NOT EXISTS idx_marketing_prefs_student_id
  ON marketing_preferences(student_id);

CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_student_id
  ON privacy_audit_log(student_id);

CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_event_type
  ON privacy_audit_log(event_type);

CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_created_at
  ON privacy_audit_log(created_at);

-- Row Level Security
ALTER TABLE student_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: Students can view their own consents
CREATE POLICY "Students can view own consents" ON student_consents
  FOR SELECT USING (auth.uid()::text = student_id::text);

-- RLS: Students can update their own consents
CREATE POLICY "Students can update own consents" ON student_consents
  FOR UPDATE USING (auth.uid()::text = student_id::text);

-- RLS: Students cannot insert their own consents (system does this)
-- This prevents them from manually adding fake consent records

-- RLS: Students can view their deletion request
CREATE POLICY "Students can view own deletion request" ON deletion_requests
  FOR SELECT USING (auth.uid()::text = student_id::text);

-- RLS: Students cannot insert/update deletion requests directly
-- This is handled via API endpoint only

-- RLS: Students can view their marketing preferences
CREATE POLICY "Students can view own marketing prefs" ON marketing_preferences
  FOR SELECT USING (auth.uid()::text = student_id::text);

-- RLS: Students can update their marketing preferences
CREATE POLICY "Students can update own marketing prefs" ON marketing_preferences
  FOR UPDATE USING (auth.uid()::text = student_id::text);

-- RLS: Only service role can write to privacy audit log (immutable)
CREATE POLICY "Only service role can insert privacy audit" ON privacy_audit_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users cannot delete privacy audit logs" ON privacy_audit_log
  FOR DELETE TO authenticated USING (false);

-- Helper function to withdraw all consents (called by account deletion)
CREATE OR REPLACE FUNCTION withdraw_all_consents(student_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE student_consents
  SET given = false, withdrawn_at = NOW(), updated_at = NOW()
  WHERE student_id = student_uuid AND given = true;

  -- Log the event
  INSERT INTO privacy_audit_log (
    student_id,
    event_type,
    description,
    metadata
  ) VALUES (
    student_uuid,
    'consent_withdrawn_all',
    'All consents withdrawn during account deletion',
    jsonb_build_object('reason', 'account_deletion')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get all student data (for GDPR data access requests)
CREATE OR REPLACE FUNCTION get_student_data_export(student_uuid UUID)
RETURNS TABLE (
  category TEXT,
  data JSONB
) AS $$
BEGIN
  -- Profile data
  RETURN QUERY SELECT 'profile'::TEXT, to_jsonb(s) FROM students s WHERE s.id = student_uuid;

  -- Quiz data
  RETURN QUERY SELECT 'quiz_history'::TEXT, jsonb_agg(to_jsonb(qh))
    FROM student_quiz_history qh
    WHERE qh.student_id = student_uuid;

  -- Progress data
  RETURN QUERY SELECT 'progress'::TEXT, to_jsonb(sp)
    FROM student_progress sp
    WHERE sp.student_id = student_uuid;

  -- Consents
  RETURN QUERY SELECT 'consents'::TEXT, jsonb_agg(to_jsonb(sc))
    FROM student_consents sc
    WHERE sc.student_id = student_uuid;

  -- Marketing preferences
  RETURN QUERY SELECT 'marketing_prefs'::TEXT, to_jsonb(mp)
    FROM marketing_preferences mp
    WHERE mp.student_id = student_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update student_consents.updated_at
CREATE OR REPLACE FUNCTION update_student_consents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_consents_update_timestamp
  BEFORE UPDATE ON student_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_student_consents_timestamp();

-- Trigger to update deletion_requests.updated_at
CREATE OR REPLACE FUNCTION update_deletion_requests_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deletion_requests_update_timestamp
  BEFORE UPDATE ON deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_deletion_requests_timestamp();

-- Trigger to update marketing_preferences.updated_at
CREATE OR REPLACE FUNCTION update_marketing_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marketing_preferences_update_timestamp
  BEFORE UPDATE ON marketing_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_preferences_timestamp();
