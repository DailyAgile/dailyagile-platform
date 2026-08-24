-- 2FA Pending Confirmations Table
-- Stores temporary 2FA codes for sensitive operations (hard delete)
-- Date: 2026-08-12

-- ============================================================================
-- CREATE PENDING_2FA_CONFIRMATIONS TABLE
-- Stores temporary 2FA codes with 10-minute expiry
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pending_2fa_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_email TEXT NOT NULL,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  quiz_title TEXT NOT NULL, -- Store title at time of request for audit
  operation_type VARCHAR NOT NULL DEFAULT 'hard_delete', -- 'hard_delete', 'other_ops'
  two_fa_code VARCHAR(6) NOT NULL, -- 6-digit code
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL, -- 10 minutes from creation
  used_at TIMESTAMPTZ, -- When code was successfully used
  failed_attempts INTEGER DEFAULT 0, -- Track failed validation attempts
  is_used BOOLEAN DEFAULT FALSE -- Whether code has been used
);

-- Index for quick lookup by instructor + quiz + operation
CREATE INDEX IF NOT EXISTS idx_pending_2fa_email_quiz
  ON public.pending_2fa_confirmations(instructor_email, quiz_id, operation_type);

-- Index for cleanup of expired codes
CREATE INDEX IF NOT EXISTS idx_pending_2fa_expires_at
  ON public.pending_2fa_confirmations(expires_at);

-- Index for lookup by code (for validation)
CREATE INDEX IF NOT EXISTS idx_pending_2fa_code
  ON public.pending_2fa_confirmations(two_fa_code) WHERE is_used = FALSE;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.pending_2fa_confirmations ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all confirmations
CREATE POLICY "Allow service role access to pending_2fa"
  ON public.pending_2fa_confirmations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTION: Generate Pending 2FA Confirmation
-- Returns: { code: string, id: uuid, expires_at: timestamp }
-- ============================================================================

CREATE OR REPLACE FUNCTION create_pending_2fa_confirmation(
  p_instructor_email TEXT,
  p_quiz_id UUID,
  p_quiz_title TEXT,
  p_operation_type VARCHAR DEFAULT 'hard_delete'
) RETURNS TABLE(code TEXT, confirmation_id UUID, expires_at TIMESTAMPTZ) AS $$
DECLARE
  v_code VARCHAR(6);
  v_confirmation_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Generate random 6-digit code
  v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  -- Set expiry to 10 minutes from now
  v_expires_at := NOW() + INTERVAL '10 minutes';

  -- Insert new confirmation
  INSERT INTO public.pending_2fa_confirmations
    (instructor_email, quiz_id, quiz_title, operation_type, two_fa_code, expires_at)
  VALUES
    (p_instructor_email, p_quiz_id, p_quiz_title, p_operation_type, v_code, v_expires_at)
  RETURNING id INTO v_confirmation_id;

  -- Return code, id, and expiry time
  RETURN QUERY SELECT v_code, v_confirmation_id, v_expires_at;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Validate 2FA Code
-- Returns: true if code is valid (not expired, not used, matches)
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_2fa_code(
  p_instructor_email TEXT,
  p_quiz_id UUID,
  p_provided_code VARCHAR,
  p_operation_type VARCHAR DEFAULT 'hard_delete'
) RETURNS TABLE(is_valid BOOLEAN, message TEXT) AS $$
DECLARE
  v_confirmation RECORD;
BEGIN
  -- Find most recent non-used confirmation for this operation
  SELECT * INTO v_confirmation
  FROM public.pending_2fa_confirmations
  WHERE instructor_email = p_instructor_email
    AND quiz_id = p_quiz_id
    AND operation_type = p_operation_type
    AND is_used = FALSE
  ORDER BY created_at DESC
  LIMIT 1;

  -- No confirmation found
  IF v_confirmation IS NULL THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 'No 2FA code sent. Request hard delete first.'::TEXT;
    RETURN;
  END IF;

  -- Code has expired
  IF NOW() > v_confirmation.expires_at THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, '2FA code has expired (valid for 10 minutes only).'::TEXT;
    RETURN;
  END IF;

  -- Code doesn't match
  IF TRIM(p_provided_code) != v_confirmation.two_fa_code THEN
    -- Increment failed attempts
    UPDATE public.pending_2fa_confirmations
    SET failed_attempts = failed_attempts + 1
    WHERE id = v_confirmation.id;

    -- Lock after 5 failed attempts
    IF v_confirmation.failed_attempts >= 4 THEN
      UPDATE public.pending_2fa_confirmations
      SET is_used = TRUE, used_at = NOW()
      WHERE id = v_confirmation.id;
      RETURN QUERY SELECT FALSE::BOOLEAN, 'Too many failed attempts. Code locked. Request a new one.'::TEXT;
    END IF;

    RETURN QUERY SELECT FALSE::BOOLEAN, ('Invalid code. Attempt ' || (v_confirmation.failed_attempts + 1) || ' of 5.')::TEXT;
    RETURN;
  END IF;

  -- Code is valid! Mark as used
  UPDATE public.pending_2fa_confirmations
  SET is_used = TRUE, used_at = NOW()
  WHERE id = v_confirmation.id;

  RETURN QUERY SELECT TRUE::BOOLEAN, 'Code verified successfully.'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- 2FA confirmation table ready for use
-- ============================================================================
