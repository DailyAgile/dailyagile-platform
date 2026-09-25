-- Certificate Table Enhancements
-- Add fields for certificate generation and email tracking

-- Add new columns to certificates table
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS email_error TEXT;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS pdf_generated BOOLEAN DEFAULT FALSE;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_certificates_emailed_at ON certificates(emailed_at);
CREATE INDEX IF NOT EXISTS idx_certificates_pdf_generated ON certificates(pdf_generated);

-- Add RLS policy for instructors to manage certificates
CREATE POLICY "instructors_can_resend_own_quiz_certificates"
  ON certificates FOR UPDATE
  USING (
    auth.uid()::text IN (
      SELECT instructor_id::text FROM quizzes WHERE id = certificates.quiz_id
    )
  )
  WITH CHECK (
    auth.uid()::text IN (
      SELECT instructor_id::text FROM quizzes WHERE id = certificates.quiz_id
    )
  );

-- Add RLS policy for instructors to view certificates for their quizzes
CREATE POLICY "instructors_can_view_own_quiz_certificates"
  ON certificates FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT instructor_id::text FROM quizzes WHERE id = certificates.quiz_id
    )
    OR auth.uid()::text = student_id::text
  );
