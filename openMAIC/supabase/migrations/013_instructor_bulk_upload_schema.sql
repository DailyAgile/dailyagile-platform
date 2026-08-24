-- Migration 013: Instructor Bulk Upload Schema
-- Purpose: Support CSV/Excel bulk import of instructors for corporate accounts
-- Date: 2026-08-12
-- ============================================================================

-- ============================================================================
-- 1. ENSURE INSTRUCTORS TABLE EXISTS WITH FULL SCHEMA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  cell_number TEXT,

  -- Location & organization
  location TEXT,  -- City, State, Country (for corporate billing)
  bio TEXT,
  avatar_url TEXT,

  -- Teaching info
  courses_they_teach JSONB DEFAULT '[]'::jsonb,  -- Array of course IDs or titles
  specializations TEXT ARRAY,  -- ["Python", "Machine Learning", "Web Dev"]
  years_experience INTEGER,
  certifications JSONB DEFAULT '{}'::jsonb,  -- { "AWS": "AWS Solutions Architect", "GCP": null }

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instructors_email ON public.instructors(email);
CREATE INDEX IF NOT EXISTS idx_instructors_auth_user_id ON public.instructors(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_instructors_is_active ON public.instructors(is_active);
CREATE INDEX IF NOT EXISTS idx_instructors_verified ON public.instructors(is_verified);

COMMENT ON TABLE public.instructors IS 'Instructor profiles with teaching info and verification status';
COMMENT ON COLUMN public.instructors.courses_they_teach IS 'Array of course codes/IDs (e.g., ["AI-101", "AGILE-202"])';
COMMENT ON COLUMN public.instructors.specializations IS 'Teaching expertise areas for matching to courses';
COMMENT ON COLUMN public.instructors.certifications IS 'Professional certifications held (AWS, GCP, Azure, etc.)';

-- ============================================================================
-- 2. INSTRUCTOR_BULK_UPLOADS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.instructor_bulk_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id VARCHAR(100) UNIQUE NOT NULL,  -- Identifier for tracking batch

  -- Upload metadata
  uploaded_by_email TEXT NOT NULL,
  uploaded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name TEXT,
  file_size_bytes INTEGER,
  file_hash TEXT,  -- MD5 hash of file for duplicate detection

  -- Processing
  row_count INTEGER,
  processed_row_count INTEGER DEFAULT 0,
  successful_row_count INTEGER DEFAULT 0,
  failed_row_count INTEGER DEFAULT 0,

  status VARCHAR(50) NOT NULL DEFAULT 'pending'  -- pending, processing, completed, failed
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),

  -- Errors and warnings
  error_message TEXT,
  error_details JSONB DEFAULT '[]'::jsonb,  -- Array of row-level errors: [{ row: 5, field: "email", error: "Invalid format" }]
  warning_details JSONB DEFAULT '[]'::jsonb,  -- Non-fatal warnings

  -- Processing timeline
  started_processing_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_uploads_status ON public.instructor_bulk_uploads(status);
CREATE INDEX IF NOT EXISTS idx_bulk_uploads_uploaded_by ON public.instructor_bulk_uploads(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_uploads_created ON public.instructor_bulk_uploads(created_at DESC);

COMMENT ON TABLE public.instructor_bulk_uploads IS 'Track CSV/Excel uploads for bulk instructor import';
COMMENT ON COLUMN public.instructor_bulk_uploads.upload_id IS 'Unique ID for batch (useful for linking to uploaded file)';
COMMENT ON COLUMN public.instructor_bulk_uploads.error_details IS 'Array of validation errors: [{ row: 2, field: "email", error: "Already exists" }]';
COMMENT ON COLUMN public.instructor_bulk_uploads.warning_details IS 'Non-critical warnings for user awareness';

-- ============================================================================
-- 3. INSTRUCTOR_BULK_UPLOAD_ROWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.instructor_bulk_upload_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.instructor_bulk_uploads(id) ON DELETE CASCADE,

  -- Row in CSV
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL,  -- { "email": "john@example.com", "first_name": "John", ... }

  -- Processing
  status VARCHAR(50) NOT NULL DEFAULT 'pending'  -- pending, processing, success, skipped, failed
    CHECK (status IN ('pending', 'processing', 'success', 'skipped', 'failed')),

  created_instructor_id UUID REFERENCES public.instructors(id) ON DELETE SET NULL,
  existing_instructor_id UUID REFERENCES public.instructors(id) ON DELETE SET NULL,

  -- Validation
  validation_errors JSONB DEFAULT '[]'::jsonb,  -- [{ field: "email", error: "Invalid format" }]
  validation_warnings JSONB DEFAULT '[]'::jsonb,

  -- Processing result
  error_message TEXT,
  action_taken VARCHAR(50),  -- created, skipped, updated, error
    CHECK (action_taken IS NULL OR action_taken IN ('created', 'skipped', 'updated', 'error')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_upload_rows_upload ON public.instructor_bulk_upload_rows(upload_id);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_rows_status ON public.instructor_bulk_upload_rows(status);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_rows_instructor ON public.instructor_bulk_upload_rows(created_instructor_id);

COMMENT ON TABLE public.instructor_bulk_upload_rows IS 'Individual row processing for bulk uploads';

-- ============================================================================
-- 4. CREATE FUNCTION: Validate Instructor Row
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_instructor_row(
  p_row_data JSONB
) RETURNS TABLE(
  is_valid BOOLEAN,
  errors TEXT[],
  warnings TEXT[],
  normalized_data JSONB
) AS $$
DECLARE
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_warnings TEXT[] := ARRAY[]::TEXT[];
  v_email TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_normalized JSONB;
BEGIN
  v_email := TRIM(COALESCE(p_row_data->>'email', ''));
  v_first_name := TRIM(COALESCE(p_row_data->>'first_name', ''));
  v_last_name := TRIM(COALESCE(p_row_data->>'last_name', ''));

  -- Validate email
  IF v_email = '' THEN
    v_errors := array_append(v_errors, 'email: required');
  ELSIF NOT (v_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$') THEN
    v_errors := array_append(v_errors, 'email: invalid format');
  END IF;

  -- Validate first_name
  IF v_first_name = '' THEN
    v_errors := array_append(v_errors, 'first_name: required');
  END IF;

  -- Validate last_name
  IF v_last_name = '' THEN
    v_errors := array_append(v_errors, 'last_name: required');
  END IF;

  -- Check if email already exists
  IF v_email != '' AND EXISTS(SELECT 1 FROM public.instructors WHERE LOWER(email) = LOWER(v_email)) THEN
    v_warnings := array_append(v_warnings, 'email: already registered (will update existing record)');
  END IF;

  -- Build normalized data
  v_normalized := jsonb_build_object(
    'email', v_email,
    'first_name', v_first_name,
    'last_name', v_last_name,
    'cell_number', COALESCE(p_row_data->>'cell_number', NULL),
    'location', COALESCE(p_row_data->>'location', NULL),
    'phone_number', COALESCE(p_row_data->>'phone_number', NULL),
    'years_experience', CASE
      WHEN (p_row_data->>'years_experience')::INT IS NOT NULL
      THEN (p_row_data->>'years_experience')::INT
      ELSE NULL
    END,
    'courses_they_teach', CASE
      WHEN p_row_data->'courses_they_teach' IS NOT NULL
      THEN p_row_data->'courses_they_teach'
      ELSE '[]'::jsonb
    END
  );

  RETURN QUERY SELECT
    (array_length(v_errors, 1) IS NULL)::BOOLEAN,
    v_errors,
    v_warnings,
    v_normalized;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. CREATE FUNCTION: Process Bulk Upload
-- ============================================================================

CREATE OR REPLACE FUNCTION process_instructor_bulk_upload(
  p_upload_id UUID
) RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  processed_count INTEGER,
  success_count INTEGER,
  error_count INTEGER
) AS $$
DECLARE
  v_upload RECORD;
  v_row RECORD;
  v_validation RECORD;
  v_instructor_id UUID;
  v_processed_count INTEGER := 0;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
BEGIN
  -- Lock upload to prevent concurrent processing
  SELECT * INTO v_upload
  FROM public.instructor_bulk_uploads
  WHERE id = p_upload_id
  FOR UPDATE;

  IF v_upload IS NULL THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 'Upload not found'::TEXT, 0::INTEGER, 0::INTEGER, 0::INTEGER;
    RETURN;
  END IF;

  -- Update status to processing
  UPDATE public.instructor_bulk_uploads
  SET status = 'processing', started_processing_at = NOW()
  WHERE id = p_upload_id;

  -- Process each row
  FOR v_row IN (
    SELECT * FROM public.instructor_bulk_upload_rows
    WHERE upload_id = p_upload_id
    ORDER BY row_number
    FOR UPDATE
  ) LOOP
    v_processed_count := v_processed_count + 1;

    -- Validate row
    SELECT * INTO v_validation
    FROM validate_instructor_row(v_row.raw_data);

    IF NOT v_validation.is_valid THEN
      -- Mark as failed
      UPDATE public.instructor_bulk_upload_rows
      SET
        status = 'failed',
        validation_errors = to_jsonb(v_validation.errors),
        action_taken = 'error',
        error_message = array_to_string(v_validation.errors, '; ')
      WHERE id = v_row.id;

      v_error_count := v_error_count + 1;
      CONTINUE;
    END IF;

    -- Try to create or update instructor
    BEGIN
      INSERT INTO public.instructors (
        email, first_name, last_name, cell_number, location, phone_number, years_experience, courses_they_teach
      ) VALUES (
        v_validation.normalized_data->>'email',
        v_validation.normalized_data->>'first_name',
        v_validation.normalized_data->>'last_name',
        v_validation.normalized_data->>'cell_number',
        v_validation.normalized_data->>'location',
        v_validation.normalized_data->>'phone_number',
        (v_validation.normalized_data->>'years_experience')::INTEGER,
        v_validation.normalized_data->'courses_they_teach'
      )
      ON CONFLICT (email) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        cell_number = COALESCE(EXCLUDED.cell_number, instructors.cell_number),
        location = COALESCE(EXCLUDED.location, instructors.location),
        updated_at = NOW()
      RETURNING id INTO v_instructor_id;

      UPDATE public.instructor_bulk_upload_rows
      SET
        status = 'success',
        created_instructor_id = v_instructor_id,
        action_taken = CASE WHEN created_instructor_id IS NULL THEN 'created' ELSE 'updated' END,
        validation_warnings = to_jsonb(v_validation.warnings)
      WHERE id = v_row.id;

      v_success_count := v_success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      UPDATE public.instructor_bulk_upload_rows
      SET
        status = 'failed',
        action_taken = 'error',
        error_message = SQLERRM
      WHERE id = v_row.id;

      v_error_count := v_error_count + 1;
    END;
  END LOOP;

  -- Update upload status
  UPDATE public.instructor_bulk_uploads
  SET
    status = CASE WHEN v_error_count = 0 THEN 'completed' ELSE 'partial' END,
    processed_row_count = v_processed_count,
    successful_row_count = v_success_count,
    failed_row_count = v_error_count,
    completed_at = NOW()
  WHERE id = p_upload_id;

  RETURN QUERY SELECT
    (v_error_count = 0)::BOOLEAN,
    'Bulk upload processing complete. ' || v_success_count || ' succeeded, ' || v_error_count || ' failed.'::TEXT,
    v_processed_count,
    v_success_count,
    v_error_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_bulk_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_bulk_upload_rows ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage everything
CREATE POLICY "service_role_all_access" ON public.instructors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON public.instructor_bulk_uploads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON public.instructor_bulk_upload_rows FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instructors TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instructor_bulk_uploads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instructor_bulk_upload_rows TO service_role;
GRANT EXECUTE ON FUNCTION validate_instructor_row TO service_role;
GRANT EXECUTE ON FUNCTION process_instructor_bulk_upload TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- Instructors bulk upload system ready
-- ============================================================================

-- USAGE EXAMPLE:
-- 1. Create upload record:
--    INSERT INTO instructor_bulk_uploads (upload_id, uploaded_by_email, file_name, row_count)
--    VALUES (
--      'batch-20260812-001',
--      'admin@company.com',
--      'instructors_aug2026.csv',
--      25
--    ) RETURNING id;
--
-- 2. Create rows from CSV parsing:
--    INSERT INTO instructor_bulk_upload_rows (upload_id, row_number, raw_data)
--    VALUES
--      (upload_uuid, 1, '{"email":"john@company.com","first_name":"John","last_name":"Doe",...}'),
--      (upload_uuid, 2, '{"email":"jane@company.com","first_name":"Jane","last_name":"Smith",...}'),
--      ...
--
-- 3. Process upload:
--    SELECT * FROM process_instructor_bulk_upload(upload_uuid);
--
-- 4. Check results:
--    SELECT * FROM instructor_bulk_upload_rows WHERE upload_id = upload_uuid ORDER BY row_number;
