/**
 * ILT Platform: Admin Users Table
 * Separate authentication system for super admins managing platform content
 * Uses bcrypt hashing for passwords + TOTP for 2FA
 * Migration: 045_create_ilt_admin_tables.sql
 */

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_super_admin BOOLEAN DEFAULT FALSE,
  totp_secret TEXT, -- Base32-encoded TOTP secret
  is_2fa_enabled BOOLEAN DEFAULT FALSE,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ, -- Account lockout timestamp
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_active ON admin_users(is_active);
CREATE INDEX idx_admin_users_super_admin ON admin_users(is_super_admin);

-- Trigger: Update updated_at timestamp on row updates
CREATE OR REPLACE FUNCTION update_admin_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_admin_users_update_timestamp
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_timestamp();

-- RLS Policy: Admins can read all other admins (for admin management)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read all admin users" ON admin_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid() AND is_super_admin = TRUE
    )
  );

-- No direct INSERT/UPDATE/DELETE via RLS — only via API with proper validation
CREATE POLICY "No direct row manipulation" ON admin_users
  FOR INSERT WITH CHECK (FALSE);

CREATE POLICY "No direct updates via RLS" ON admin_users
  FOR UPDATE USING (FALSE);

CREATE POLICY "No direct deletes via RLS" ON admin_users
  FOR DELETE USING (FALSE);
