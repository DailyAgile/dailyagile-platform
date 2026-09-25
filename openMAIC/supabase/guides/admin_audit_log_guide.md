# Admin Audit Log Guide

## Overview

The `admin_audit_log` table tracks all admin access to sensitive tables for regulatory compliance (SOC 2, PCI DSS, GDPR).

**Key Properties:**
- **Immutable**: No one can UPDATE or DELETE audit entries (enforced by RLS)
- **Automatic**: Triggers capture all changes to sensitive tables
- **Complete**: Tracks WHO, WHEN, WHAT, WHERE, and HOW (before/after values)
- **Secure**: Only admins can view; IP addresses and timestamps captured

## Sensitive Tables Tracked

1. **webhook_audit_logs**: All direct access (INSERT, UPDATE, DELETE)
2. **feature_flags**: All feature flag changes (kill switches, rollout updates)
3. **email_queue**: Status changes and deletions (sent, failed, retried)

## Schema

```sql
admin_audit_log {
  id: UUID (primary key)
  admin_user_id: UUID (who - references auth.users)
  admin_email: TEXT (who - for quick lookup)
  created_at: TIMESTAMPTZ (when - immutable timestamp)
  action: TEXT (what - INSERT, UPDATE, DELETE)
  table_name: TEXT (where - webhook_audit_logs, feature_flags, etc.)
  row_id: TEXT (which record - can be NULL for bulk ops)
  before_values: JSONB (was - previous state)
  after_values: JSONB (now - current state)
  ip_address: INET (network security)
  user_agent: TEXT (client info)
  reason: TEXT (why - admin comment)
  metadata: JSONB (additional context)
}
```

## Query Examples

### 1. All Actions by a Specific Admin (Last 30 Days)

```sql
SELECT 
  created_at,
  action,
  table_name,
  row_id,
  CASE 
    WHEN action = 'UPDATE' THEN 'Modified'
    WHEN action = 'INSERT' THEN 'Created'
    WHEN action = 'DELETE' THEN 'Removed'
  END as operation
FROM public.admin_audit_log
WHERE admin_email = 'admin@example.com'
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

### 2. All Feature Flag Changes

```sql
SELECT 
  created_at,
  admin_email,
  action,
  (after_values->>'name') as flag_name,
  (before_values->>'enabled') as was_enabled,
  (after_values->>'enabled') as is_enabled,
  (before_values->>'rollout_percentage') as was_rollout,
  (after_values->>'rollout_percentage') as is_rollout,
  reason
FROM public.admin_audit_log
WHERE table_name = 'feature_flags'
ORDER BY created_at DESC;
```

### 3. Kill Switch History (Feature Flag Disables)

```sql
SELECT 
  created_at,
  admin_email,
  (after_values->>'name') as flag_name,
  (after_values->>'enabled') as enabled,
  reason
FROM public.admin_audit_log
WHERE table_name = 'feature_flags'
  AND action = 'UPDATE'
  AND (after_values->>'enabled')::BOOLEAN = false
ORDER BY created_at DESC;
```

### 4. All Audit Log Access by Admins

```sql
SELECT 
  created_at,
  admin_email,
  action,
  (metadata->>'correlation_id') as correlation_id,
  reason
FROM public.admin_audit_log
WHERE table_name = 'webhook_audit_logs'
ORDER BY created_at DESC
LIMIT 50;
```

### 5. Compliance Report: Weekly Admin Actions

```sql
SELECT 
  DATE_TRUNC('week', created_at) as week,
  admin_email,
  COUNT(*) as total_actions,
  COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deletes,
  COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
  COUNT(CASE WHEN action = 'INSERT' THEN 1 END) as inserts,
  COUNT(DISTINCT table_name) as tables_modified
FROM public.admin_audit_log
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY week, admin_email
ORDER BY week DESC, total_actions DESC;
```

### 6. Audit Trail for a Specific Feature Flag

```sql
SELECT 
  created_at,
  admin_email,
  action,
  (after_values->>'enabled') as enabled,
  (after_values->>'rollout_percentage') as rollout,
  reason
FROM public.admin_audit_log
WHERE table_name = 'feature_flags'
  AND row_id = '42'  -- Replace with actual flag ID
ORDER BY created_at ASC;
```

### 7. Email Queue Operations by Admins

```sql
SELECT 
  created_at,
  admin_email,
  action,
  (before_values->>'status') as previous_status,
  (after_values->>'status') as new_status,
  (metadata->>'recipient') as email_recipient
FROM public.admin_audit_log
WHERE table_name = 'email_queue'
ORDER BY created_at DESC
LIMIT 50;
```

### 8. Unusual Activity: Nighttime Modifications

```sql
SELECT 
  created_at,
  admin_email,
  action,
  table_name,
  EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') as hour_utc,
  ip_address
FROM public.admin_audit_log
WHERE EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') NOT BETWEEN 8 AND 18
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### 9. Audit Log Completeness Check

```sql
SELECT 
  table_name,
  COUNT(*) as total_changes,
  COUNT(DISTINCT admin_email) as admins,
  MIN(created_at) as earliest_change,
  MAX(created_at) as latest_change
FROM public.admin_audit_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY table_name
ORDER BY total_changes DESC;
```

### 10. Before/After Comparison for a Specific Change

```sql
SELECT 
  id,
  created_at,
  admin_email,
  action,
  before_values,
  after_values,
  reason
FROM public.admin_audit_log
WHERE table_name = 'feature_flags'
  AND row_id = '42'  -- Specific flag
  AND action = 'UPDATE'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 1;
```

## Compliance Use Cases

### SOC 2 Requirement: Privileged User Access Tracking

**Question:** Who accessed sensitive tables and what did they do?

```sql
SELECT 
  admin_email,
  COUNT(*) as actions,
  COUNT(DISTINCT table_name) as tables,
  COUNT(DISTINCT DATE(created_at)) as days_active
FROM public.admin_audit_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY admin_email
ORDER BY actions DESC;
```

### PCI DSS Requirement: Audit Trail Preservation

**Question:** Is the audit log immutable and complete?

```sql
-- Verify no updates to audit log exist
SELECT COUNT(*) as update_count
FROM public.admin_audit_log
WHERE table_name = 'admin_audit_log' AND action = 'UPDATE';
-- Result: 0 (updates should be blocked by RLS)

-- Verify no deletes exist
SELECT COUNT(*) as delete_count
FROM public.admin_audit_log
WHERE table_name = 'admin_audit_log' AND action = 'DELETE';
-- Result: 0 (deletes should be blocked by RLS)
```

### GDPR Requirement: Track Data Processing Actions

**Question:** When was [student_id] data accessed or modified?

```sql
-- Find all changes related to a specific student
SELECT 
  created_at,
  admin_email,
  action,
  table_name,
  before_values,
  after_values,
  reason
FROM public.admin_audit_log
WHERE (
  before_values::TEXT ILIKE '%student_id%' OR
  after_values::TEXT ILIKE '%student_id%'
)
  AND created_at > NOW() - INTERVAL '1 year'
ORDER BY created_at DESC;
```

## Key Indexes

For optimal performance, the following indexes are created:

| Index Name | Columns | Use Case |
|------------|---------|----------|
| `idx_admin_audit_by_admin` | admin_user_id, created_at DESC | Find all actions by a specific admin |
| `idx_admin_audit_by_table` | table_name, created_at DESC | Audit trail for a sensitive table |
| `idx_admin_audit_created_at` | created_at DESC | Compliance reports (date range) |
| `idx_admin_audit_action` | action, created_at DESC | Find all modifications (INSERT/UPDATE/DELETE) |
| `idx_admin_audit_record` | table_name, row_id, created_at DESC | Audit history for a specific record |
| `idx_admin_audit_admin_email` | admin_email, created_at DESC | Find actions by email (faster than user_id lookup) |

## Security Guarantees

### 1. Immutability (ROW LEVEL SECURITY)

```sql
-- Try to update an audit entry (will FAIL)
UPDATE public.admin_audit_log 
SET reason = 'hacked'
WHERE id = 'any_id';
-- ERROR: new row violates row-level security policy "admin_audit_select_admin_only" for table "admin_audit_log"
```

### 2. No-Delete Protection

```sql
-- Try to delete an audit entry (will FAIL)
DELETE FROM public.admin_audit_log 
WHERE id = 'any_id';
-- ERROR: new row violates row-level security policy "admin_audit_select_admin_only" for table "admin_audit_log"
```

### 3. Admin-Only Access

```sql
-- Non-admin users cannot view audit logs
SELECT * FROM public.admin_audit_log;
-- Returns 0 rows (RLS blocks access)
```

## Triggering Events

Audit events are automatically created when:

1. **webhook_audit_logs**: Any INSERT, UPDATE, or DELETE
2. **feature_flags**: Any INSERT, UPDATE, or DELETE
3. **email_queue**: Status or retry_count changes (not every heartbeat)

### Trigger Functions

| Trigger | Fires On | Purpose |
|---------|----------|---------|
| `audit_webhook_audit_logs_trigger` | INSERT, UPDATE, DELETE on webhook_audit_logs | Track audit log access |
| `audit_feature_flags_trigger` | INSERT, UPDATE, DELETE on feature_flags | Track feature flag changes |
| `audit_email_queue_trigger` | UPDATE, DELETE on email_queue | Track email operation changes |

## Recommended Monitoring

### Daily Compliance Check

```sql
-- Run every morning to verify audit log health
SELECT 
  (SELECT COUNT(*) FROM admin_audit_log 
   WHERE created_at > NOW() - INTERVAL '1 day') as changes_today,
  (SELECT COUNT(DISTINCT admin_email) FROM admin_audit_log 
   WHERE created_at > NOW() - INTERVAL '1 day') as active_admins,
  (SELECT COUNT(*) FROM admin_audit_log 
   WHERE table_name = 'feature_flags' 
   AND created_at > NOW() - INTERVAL '1 day') as flag_changes,
  (SELECT COUNT(*) FROM admin_audit_log 
   WHERE table_name = 'webhook_audit_logs' 
   AND created_at > NOW() - INTERVAL '1 day') as audit_access_events;
```

### Weekly Summary Report

```sql
-- Email this report every Monday morning
WITH weekly_summary AS (
  SELECT 
    admin_email,
    COUNT(*) as actions,
    COUNT(DISTINCT table_name) as tables_modified,
    COUNT(DISTINCT DATE(created_at)) as activity_days,
    MAX(created_at) as last_action
  FROM admin_audit_log
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY admin_email
)
SELECT * FROM weekly_summary
ORDER BY actions DESC;
```

## Retention Policy

- **Default**: Indefinite (audit logs are kept forever)
- **Legal Hold**: For compliance investigations, filter by date range
- **Purge Old Data**: Consider archiving logs older than 2 years to a separate table/database

## Permissions

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| service_role | ✓ | ✓ | ✗ | ✗ |
| authenticated (admin) | ✓ | ✗ | ✗ | ✗ |
| authenticated (user) | ✗ | ✗ | ✗ | ✗ |

## Troubleshooting

### Q: Audit log is not recording my changes?

**A:** Check that:
1. You are logged in as an admin (role = 'admin' in instructors table)
2. The table you're modifying is one of: webhook_audit_logs, feature_flags, email_queue
3. Check trigger status:

```sql
SELECT trigger_name, trigger_schema, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('webhook_audit_logs', 'feature_flags', 'email_queue')
ORDER BY event_object_table;
```

### Q: I deleted an audit entry accidentally - what do I do?

**A:** You shouldn't be able to delete. If you did, contact Supabase support immediately. Deletion of audit logs is a critical compliance violation.

### Q: Why are my feature flag changes showing up twice?

**A:** If you're viewing a specific flag's changes via the admin API and also checking admin_audit_log, both sources are authoritative. The trigger captures the fact of modification; feature_flags table shows the current state.

### Q: How do I export audit logs for compliance?

**A:** Use this query to get CSV-compatible output:

```sql
\copy (
  SELECT 
    id,
    created_at,
    admin_email,
    action,
    table_name,
    row_id,
    reason,
    ip_address
  FROM public.admin_audit_log
  WHERE created_at > NOW() - INTERVAL '90 days'
  ORDER BY created_at DESC
) TO '/path/to/audit_report.csv' WITH (FORMAT CSV, HEADER);
```

## Related Queries

- **View webhook audit logs**: `SELECT * FROM webhook_audit_logs ORDER BY created_at DESC`
- **View feature flags**: `SELECT * FROM feature_flags ORDER BY updated_at DESC`
- **Check admin users**: `SELECT email, role FROM instructors WHERE role = 'admin'`
- **Email queue status**: `SELECT status, COUNT(*) as count FROM email_queue GROUP BY status`
