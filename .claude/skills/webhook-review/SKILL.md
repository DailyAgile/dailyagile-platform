---
name: webhook-review
description: Review webhook receivers for signature verification, idempotency, error handling, and safe logging.
---

# Webhook Review

1. Find the webhook route handlers in the changed files.
2. Confirm the handler reads the raw body and verifies the provider signature before parsing.
3. Confirm duplicate events are detected and do not repeat side effects.
4. Confirm the handler returns a non-2xx status on failure so the provider retries, and that it never returns internal error details.
5. Confirm the handler does not log secrets, full payloads, or personal data.
6. Report findings with file and line, plus a fix for each.
