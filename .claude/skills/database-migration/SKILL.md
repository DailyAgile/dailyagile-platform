---
name: database-migration
description: Create and review Supabase schema migrations safely, including RLS policies and rollback notes.
---

# Database Migration

1. Inspect the current schema before changing it (tables, columns, policies, indexes).
2. Write one migration file under `supabase/migrations/` per logical change, with a timestamped name.
3. Enable RLS on every new table and add policies for each operation clients can perform.
4. Avoid destructive changes (drops, type changes, NOT NULL on populated columns) without a backfill plan.
5. Add a short rollback note at the top of the migration describing how to undo it.
6. Apply to a branch or local database first. Run the security advisor afterwards and resolve new findings.
