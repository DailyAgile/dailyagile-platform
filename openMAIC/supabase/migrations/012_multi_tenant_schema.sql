-- Migration 012: Multi-Tenant Schema Architecture
-- Purpose: Prepare database for multi-tenant use (for future activation)
-- Date: 2026-08-12
-- Status: DESIGNED but NOT ACTIVATED - requires additional work to integrate with existing schema
-- ============================================================================

-- IMPORTANT: This migration creates the schema foundation for multi-tenancy but does NOT
-- alter existing tables. It's designed to be implemented in phases:
-- Phase 1 (this migration): Create new tables
-- Phase 2 (future): Add tenant_id columns to existing tables
-- Phase 3 (future): Activate RLS policies based on tenant
-- Phase 4 (future): Update applications to pass tenant context

-- ============================================================================
-- 1. ORGANIZATIONS TABLE (formerly "companies" or "accounts")
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,  -- URL-safe identifier (e.g., "dailyagile-corp")
  description TEXT,
  logo_url TEXT,
  website_url TEXT,

  -- Billing & tier
  billing_tier VARCHAR(50) DEFAULT 'free'  -- free, starter, professional, enterprise
    CHECK (billing_tier IN ('free', 'starter', 'professional', 'enterprise')),
  subscription_status VARCHAR(50) DEFAULT 'active'  -- active, paused, cancelled
    CHECK (subscription_status IN ('active', 'paused', 'cancelled')),
  billing_email TEXT,
  subscription_started_at TIMESTAMPTZ,
  subscription_renewed_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,

  -- Feature limits (enforced by business logic)
  max_students INTEGER DEFAULT 100,
  max_instructors INTEGER DEFAULT 5,
  max_teams INTEGER DEFAULT 3,
  max_courses_published INTEGER DEFAULT 10,

  -- Configuration
  brand_colors JSONB DEFAULT '{}'::jsonb,  -- { "primary": "#1E3A5F", "secondary": "#0891B2" }
  custom_domain TEXT,
  custom_domain_verified BOOLEAN DEFAULT FALSE,

  -- Metadata
  settings JSONB DEFAULT '{}'::jsonb,  -- { "require_2fa": true, "enforce_sso": false }
  metadata JSONB DEFAULT '{}'::jsonb,  -- { "industry": "SaaS", "employee_count": 150 }

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_billing_tier ON public.organizations(billing_tier);
CREATE INDEX idx_organizations_subscription_status ON public.organizations(subscription_status);

COMMENT ON TABLE public.organizations IS 'Top-level tenant: company/account running courses';
COMMENT ON COLUMN public.organizations.slug IS 'URL-safe identifier for white-labeling';
COMMENT ON COLUMN public.organizations.billing_tier IS 'Free/Starter/Professional/Enterprise for feature gating';
COMMENT ON COLUMN public.organizations.max_students IS 'Enforced by business logic based on billing tier';

-- ============================================================================
-- 2. TEAMS TABLE (division within organization)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,

  -- Team type
  type VARCHAR(50) DEFAULT 'department'  -- department, cohort, grade_level, program
    CHECK (type IN ('department', 'cohort', 'grade_level', 'program', 'custom')),

  -- Capacity and limits
  max_members INTEGER DEFAULT 50,
  is_archived BOOLEAN DEFAULT FALSE,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, name)
);

CREATE INDEX idx_teams_organization ON public.teams(organization_id);
CREATE INDEX idx_teams_archived ON public.teams(is_archived);

COMMENT ON TABLE public.teams IS 'Divisions within an organization (e.g., departments, cohorts, grade levels)';

-- ============================================================================
-- 3. ORGANIZATION_MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,  -- Denormalized for fast lookups

  -- Role in organization
  role VARCHAR(50) NOT NULL  -- owner, admin, instructor, student, viewer
    CHECK (role IN ('owner', 'admin', 'instructor', 'student', 'viewer')),

  -- Permissions
  can_manage_instructors BOOLEAN DEFAULT FALSE,
  can_manage_students BOOLEAN DEFAULT FALSE,
  can_manage_billing BOOLEAN DEFAULT FALSE,
  can_publish_courses BOOLEAN DEFAULT FALSE,
  can_view_analytics BOOLEAN DEFAULT FALSE,

  -- Status
  status VARCHAR(50) DEFAULT 'active'  -- active, invited, suspended
    CHECK (status IN ('active', 'invited', 'suspended')),
  invited_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_organization ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_email ON public.organization_members(email);
CREATE INDEX idx_org_members_role ON public.organization_members(organization_id, role);

COMMENT ON TABLE public.organization_members IS 'User membership and roles within organizations';

-- ============================================================================
-- 4. FEATURE_FLAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,  -- NULL = global flag
  flag_name VARCHAR(100) NOT NULL,
  flag_key VARCHAR(100) NOT NULL,  -- snake_case key for code

  -- Status
  is_enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 100
    CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),

  -- Configuration
  config JSONB DEFAULT '{}'::jsonb,  -- { "variant_a": {}, "variant_b": {} } for A/B testing
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, flag_key)
);

CREATE INDEX idx_feature_flags_organization ON public.feature_flags(organization_id);
CREATE INDEX idx_feature_flags_key ON public.feature_flags(flag_key);

COMMENT ON TABLE public.feature_flags IS 'Feature flag configuration for gradual rollouts and A/B testing';

-- ============================================================================
-- 5. WHITE_LABEL_SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.white_label_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Branding
  logo_url TEXT,
  favicon_url TEXT,
  primary_color VARCHAR(7),  -- hex color #RRGGBB
  secondary_color VARCHAR(7),
  accent_color VARCHAR(7),
  font_family VARCHAR(100) DEFAULT 'system-ui',

  -- Email branding
  email_logo_url TEXT,
  email_footer_text TEXT,
  sender_name TEXT,
  sender_email TEXT,

  -- UI customization
  hide_dailyagile_branding BOOLEAN DEFAULT FALSE,
  custom_css TEXT,  -- Custom CSS override (limited for security)

  -- Domain
  custom_domain TEXT,
  custom_domain_verified BOOLEAN DEFAULT FALSE,
  dns_verification_token TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_white_label_organization ON public.white_label_settings(organization_id);

COMMENT ON TABLE public.white_label_settings IS 'White-label customization for organizations (colors, logos, domains)';

-- ============================================================================
-- 6. LMS_INTEGRATION_CONFIG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lms_integration_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- LMS type
  lms_type VARCHAR(50)  -- canvas, blackboard, moodle, schoology, brightspace, custom, null
    CHECK (lms_type IS NULL OR lms_type IN ('canvas', 'blackboard', 'moodle', 'schoology', 'brightspace', 'google_classroom', 'custom')),

  -- API credentials (encrypted in production)
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  api_url TEXT,
  webhook_secret_encrypted TEXT,

  -- Sync settings
  auto_sync_students BOOLEAN DEFAULT FALSE,
  auto_sync_grades BOOLEAN DEFAULT FALSE,
  sync_frequency_minutes INTEGER DEFAULT 60,  -- how often to pull data

  -- Mappings
  field_mappings JSONB DEFAULT '{}'::jsonb,  -- { "lms_user_id": "email", "lms_course": "course_code" }
  role_mappings JSONB DEFAULT '{}'::jsonb,   -- { "student": "learner", "instructor": "educator" }

  -- Status
  is_connected BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  sync_error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lms_org ON public.lms_integration_config(organization_id);
CREATE INDEX idx_lms_type ON public.lms_integration_config(lms_type);

COMMENT ON TABLE public.lms_integration_config IS 'Configuration for LMS integrations (Canvas, Blackboard, etc.)';

-- ============================================================================
-- 7. WEBHOOK_LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Event type
  event_type VARCHAR(100) NOT NULL,  -- student.created, course.published, grade.submitted, etc.
  resource_type VARCHAR(50),          -- student, course, quiz, assignment, etc.
  resource_id UUID,

  -- Webhook delivery
  webhook_url TEXT NOT NULL,
  http_method VARCHAR(10) DEFAULT 'POST',
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,

  -- Retry tracking
  attempt_number INTEGER DEFAULT 1,
  next_retry_at TIMESTAMPTZ,
  is_delivered BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,

  CONSTRAINT webhook_url_not_empty CHECK (TRIM(webhook_url) != '')
);

CREATE INDEX idx_webhook_logs_organization ON public.webhook_logs(organization_id);
CREATE INDEX idx_webhook_logs_event ON public.webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_delivered ON public.webhook_logs(is_delivered);
CREATE INDEX idx_webhook_logs_created ON public.webhook_logs(created_at DESC);

COMMENT ON TABLE public.webhook_logs IS 'Log of webhook events sent to external integrations';

-- ============================================================================
-- 8. SUBSCRIPTION_PLANS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  billing_tier VARCHAR(50) NOT NULL UNIQUE
    CHECK (billing_tier IN ('free', 'starter', 'professional', 'enterprise')),

  -- Pricing
  price_monthly_cents INTEGER,
  price_annual_cents INTEGER,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Limits
  max_students INTEGER,
  max_instructors INTEGER,
  max_teams INTEGER,
  max_courses INTEGER,

  -- Features
  features JSONB DEFAULT '{}'::jsonb,  -- { "analytics": true, "sso": false, "white_label": true }

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.subscription_plans IS 'Product subscription tiers with pricing and feature limits';

-- ============================================================================
-- 9. BILLING_HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Invoice details
  invoice_number VARCHAR(50),
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,

  -- Amount
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  tax_cents INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(50) NOT NULL  -- pending, paid, failed, cancelled
    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),

  payment_method VARCHAR(50),  -- stripe, paypal, manual, etc.
  external_invoice_id TEXT,    -- payment processor reference

  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX idx_billing_organization ON public.billing_history(organization_id);
CREATE INDEX idx_billing_status ON public.billing_history(status);
CREATE INDEX idx_billing_created ON public.billing_history(created_at DESC);

COMMENT ON TABLE public.billing_history IS 'Complete billing and payment history for organizations';

-- ============================================================================
-- 10. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_integration_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 11. BASIC RLS POLICIES (More restrictive policies to be added in Phase 3)
-- ============================================================================

-- Allow service role to access all tables (for migrations, cron jobs)
CREATE POLICY "service_role_all_access" ON public.organizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON public.teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON public.organization_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON public.feature_flags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON public.white_label_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON public.lms_integration_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON public.webhook_logs FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 12. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.white_label_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lms_integration_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_logs TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE - SCHEMA DESIGNED BUT NOT INTEGRATED
-- ============================================================================

-- NEXT STEPS (Phase 2-4, to be implemented later):
-- 1. Add tenant_id column to existing tables:
--    ALTER TABLE classrooms ADD COLUMN organization_id UUID REFERENCES organizations(id);
--    ALTER TABLE students ADD COLUMN organization_id UUID REFERENCES organizations(id);
--    ALTER TABLE quizzes ADD COLUMN organization_id UUID REFERENCES organizations(id);
--    ... etc for all tables
--
-- 2. Create tenant context helper function:
--    CREATE FUNCTION get_current_organization_id() RETURNS UUID AS $$
--      SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1;
--    $$ LANGUAGE SQL;
--
-- 3. Update RLS policies to filter by organization_id
-- 4. Update application code to pass organization context
-- 5. Implement tenant isolation validation
