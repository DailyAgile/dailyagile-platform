---
name: security-review
description: Review pending changes on the current branch for security issues in auth, RLS, payments, and secrets handling.
---

# Security Review

Review the diff against `main` and report only verified issues.

1. Run `git diff main...HEAD` and list changed files.
2. For each changed route handler, check authentication, authorization for the specific record, and input validation.
3. For Supabase changes, check that RLS is enabled and each policy is scoped to the owner (`auth.uid()`).
4. For Stripe changes, check signature verification, idempotency, and that access is granted from webhook events only.
5. Search the diff for secrets, service-role keys, and `NEXT_PUBLIC_` values that should be private.
6. Report each finding with file, line, the risk, and a concrete fix. Say explicitly when a category has no findings.
