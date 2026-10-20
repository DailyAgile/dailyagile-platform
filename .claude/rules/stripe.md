# Stripe Rules

- Create payment intents and checkout sessions on the server only.
- Verify every webhook with the Stripe signature and the raw request body. Parsing the body first breaks verification.
- Make webhook handlers idempotent. Stripe can deliver the same event more than once, so store processed event IDs.
- Treat the webhook event as the source of truth for payment status. Do not grant course access based on the client redirect alone.
- Never log full card details, customer PII, or secret keys.
- Use test-mode keys in development and staging. Confirm the key mode before enabling any live flow.

**Why:** course access and revenue depend on these events, and duplicate or forged events can grant access for free.
**How to apply:** apply to any code that touches Stripe, including `app/api/**` webhook routes and checkout flows.
