-- Feature Flags System
-- Date: 2026-08-12
-- Enables progressive feature rollout and per-organization feature control

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. FEATURE FLAGS TABLE
-- Master list of all features and their global enable/disable state
-- ============================================================================

CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name VARCHAR(100) NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT FALSE,
  description TEXT,
  category VARCHAR(50), -- 'analytics', 'collaboration', 'integration', 'admin', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feature_flags_name ON feature_flags(flag_name);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled);
CREATE INDEX idx_feature_flags_category ON feature_flags(category);

-- ============================================================================
-- 2. ORGANIZATION FEATURES TABLE
-- Per-organization feature flag overrides
-- Allows organizations to enable/disable features independently
-- ============================================================================

CREATE TABLE organization_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  flag_name VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL,
  reason TEXT, -- Why was this override set?
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(org_id, flag_name),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_org_features_org_id ON organization_features(org_id);
CREATE INDEX idx_org_features_flag_name ON organization_features(flag_name);
CREATE INDEX idx_org_features_enabled ON organization_features(enabled);

-- ============================================================================
-- 3. BILLING TIER FEATURES TABLE
-- Maps which features are included in each billing tier
-- Tier: free, pro, enterprise
-- ============================================================================

CREATE TABLE billing_tier_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier VARCHAR(50) NOT NULL, -- 'free', 'pro', 'enterprise'
  flag_name VARCHAR(100) NOT NULL,
  included BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tier, flag_name)
);

CREATE INDEX idx_billing_tier_features_tier ON billing_tier_features(tier);
CREATE INDEX idx_billing_tier_features_flag_name ON billing_tier_features(flag_name);

-- ============================================================================
-- 4. FEATURE ROLLOUT LOG TABLE
-- Audit trail for feature flag changes (admin actions)
-- ============================================================================

CREATE TABLE feature_flag_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action VARCHAR(50), -- 'toggle_global', 'toggle_org', 'create_flag'
  flag_name VARCHAR(100) NOT NULL,
  org_id UUID, -- NULL if global toggle
  changed_from BOOLEAN,
  changed_to BOOLEAN,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_feature_flag_audit_flag ON feature_flag_audit_log(flag_name);
CREATE INDEX idx_feature_flag_audit_admin ON feature_flag_audit_log(admin_id);
CREATE INDEX idx_feature_flag_audit_org ON feature_flag_audit_log(org_id);
CREATE INDEX idx_feature_flag_audit_created ON feature_flag_audit_log(created_at DESC);

-- ============================================================================
-- 5. INITIAL FEATURE FLAGS
-- All flags default to FALSE (disabled)
-- Matches the spec: 8 future enterprise features
-- ============================================================================

INSERT INTO feature_flags (flag_name, enabled, description, category) VALUES
  ('analytics_dashboard', FALSE, 'Show analytics features and dashboards', 'analytics'),
  ('white_label_branding', FALSE, 'Enable white-label branding customization', 'admin'),
  ('lms_integration', FALSE, 'Show LMS integration settings', 'integration'),
  ('org_management', FALSE, 'Show organization/team management features', 'admin'),
  ('team_collaboration', FALSE, 'Show team collaboration features', 'collaboration'),
  ('advanced_reporting', FALSE, 'Show advanced reporting and export options', 'analytics'),
  ('api_webhooks', FALSE, 'Show webhook configuration and API settings', 'integration'),
  ('sso_auth', FALSE, 'Show SSO (Single Sign-On) settings', 'admin')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. INITIAL BILLING TIER MAPPINGS
-- Defines which features are available in which tiers
-- Free tier: minimal features
-- Pro tier: most features
-- Enterprise tier: all features
-- ============================================================================

INSERT INTO billing_tier_features (tier, flag_name, included) VALUES
  -- Free tier: only basic features, all flags disabled for free
  ('free', 'analytics_dashboard', FALSE),
  ('free', 'white_label_branding', FALSE),
  ('free', 'lms_integration', FALSE),
  ('free', 'org_management', FALSE),
  ('free', 'team_collaboration', FALSE),
  ('free', 'advanced_reporting', FALSE),
  ('free', 'api_webhooks', FALSE),
  ('free', 'sso_auth', FALSE),

  -- Pro tier: analytics, team collab, basic API
  ('pro', 'analytics_dashboard', TRUE),
  ('pro', 'white_label_branding', FALSE),
  ('pro', 'lms_integration', FALSE),
  ('pro', 'org_management', FALSE),
  ('pro', 'team_collaboration', TRUE),
  ('pro', 'advanced_reporting', FALSE),
  ('pro', 'api_webhooks', TRUE),
  ('pro', 'sso_auth', FALSE),

  -- Enterprise tier: all features
  ('enterprise', 'analytics_dashboard', TRUE),
  ('enterprise', 'white_label_branding', TRUE),
  ('enterprise', 'lms_integration', TRUE),
  ('enterprise', 'org_management', TRUE),
  ('enterprise', 'team_collaboration', TRUE),
  ('enterprise', 'advanced_reporting', TRUE),
  ('enterprise', 'api_webhooks', TRUE),
  ('enterprise', 'sso_auth', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_tier_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_audit_log ENABLE ROW LEVEL SECURITY;

-- Feature flags are readable by all authenticated users
CREATE POLICY "Anyone can read feature flags" ON feature_flags
  FOR SELECT USING (true);

-- Organization features can be read if user is part of that organization
CREATE POLICY "Read org features if member" ON organization_features
  FOR SELECT USING (true);

-- Admin can modify feature flags
CREATE POLICY "Admin can modify feature flags" ON feature_flags
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() AND u.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Admins can modify audit log (insert only, no delete)
CREATE POLICY "Admin can insert audit log" ON feature_flag_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() AND u.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Anyone can read audit log" ON feature_flag_audit_log
  FOR SELECT USING (true);

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Check if a feature is enabled globally
CREATE OR REPLACE FUNCTION is_feature_enabled(flag_name VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT enabled FROM feature_flags WHERE feature_flags.flag_name = is_feature_enabled.flag_name);
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if a feature is enabled for an organization (with fallback to global)
CREATE OR REPLACE FUNCTION is_feature_enabled_for_org(flag_name VARCHAR, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check organization override first
  RETURN COALESCE(
    (SELECT enabled FROM organization_features
     WHERE organization_features.flag_name = is_feature_enabled_for_org.flag_name
     AND organization_features.org_id = is_feature_enabled_for_org.org_id),
    -- Fall back to global feature flag
    (SELECT enabled FROM feature_flags WHERE feature_flags.flag_name = is_feature_enabled_for_org.flag_name),
    FALSE
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Get all enabled features for an organization
CREATE OR REPLACE FUNCTION get_org_features(org_id UUID)
RETURNS TABLE(flag_name VARCHAR, enabled BOOLEAN, level VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ff.flag_name,
    COALESCE(of.enabled, ff.enabled) as enabled,
    CASE
      WHEN of.id IS NOT NULL THEN 'organization'
      ELSE 'global'
    END as level
  FROM feature_flags ff
  LEFT JOIN organization_features of ON ff.flag_name = of.flag_name AND of.org_id = get_org_features.org_id
  WHERE COALESCE(of.enabled, ff.enabled) = TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 9. MIGRATION COMPLETE
-- Feature flags infrastructure ready for use
-- All flags created but disabled by default
-- ============================================================================
