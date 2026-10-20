# Security Rules

- Never commit secrets. Keys belong in `.env.local` (git-ignored) or the hosting provider's environment settings.
- Never expose service-role keys, Stripe secret keys, or webhook signing secrets to client code. Only `NEXT_PUBLIC_*` values may ship to the browser.
- Validate all request input on the server, including route params, query strings, and JSON bodies.
- Check authorization on every API route. Authentication alone is not enough: confirm the caller may act on the specific record.
- Return generic error messages to clients. Log details server-side only.
- Rate-limit public endpoints, including login, signup, quiz join, and webhook receivers.

**Why:** the platform handles student accounts, payments, and instructor-only quiz controls, so a single missing check exposes real data or revenue.
**How to apply:** check these rules during any change to `app/api/**`, auth code, or environment handling.
