# Supabase Rules

- Every table in the `public` schema must have Row Level Security enabled, with policies written for each operation that clients can perform.
- Do not use the service-role key in browser code or in routes that serve end users. Use it only in trusted server code, and say why in a comment.
- Write schema changes as migrations under `supabase/migrations/`. Do not edit the production schema by hand.
- Keep policies explicit. An instructor should only manage quizzes they own; a student should only read their own answers.
- Use `auth.uid()` in policies rather than trusting client-supplied user IDs.
- After any schema or policy change, run the Supabase security advisor and resolve any new findings before merging.

**Why:** the live quiz RLS work showed that policy gaps are easy to miss and expensive to fix after release.
**How to apply:** apply to any change under `supabase/`, and to any query that uses the Supabase client.
