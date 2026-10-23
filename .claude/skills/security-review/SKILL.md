---
name: security-review
description: Periodic security review of the DailyAgile platform, layer by layer - Next.js routes, auth, Supabase RLS, Stripe, Brevo email, webhooks, secrets, Vercel, Cloudflare, and dependencies. Use when asked to run a security review or before a release.
---

# Security review

Review in this order. Each layer depends on the one before it: a route that skips auth makes the layers after it irrelevant.

Report every finding with file and line, the risk, and a concrete fix. Mark each layer as "no findings", "findings", or "not used in this repo". Never print secret values; mask them.

## 1. Next.js routes (`openMAIC/app/api/**`)
- List every `route.ts` and classify it: public, signed-in, instructor, admin.
- Public routes must not return answer keys, emails, or other people's records.
- Every non-public route must call an auth guard before reading or writing data.
- Routes that accept an ID must check ownership, not only that the caller is signed in.
- Client code must not import server-only modules (service-role client, secrets).

## 2. Auth (`lib/server/auth-middleware.ts`, `lib/server/route-guards.ts`, `lib/instructor/auth-utils.ts`)
- Tokens are verified, not just decoded. Check for header-only checks.
- Dev-only backdoors (for example `TEST_SESSION:` tokens) must be gated by `NODE_ENV`.
- Session cookies are `httpOnly`, `SameSite=lax`, and signed.
- Login and OTP routes are rate-limited; error messages do not reveal whether an email exists.

## 3. Supabase RLS and data access
- Every table in `public` has RLS enabled (check with the Supabase advisors).
- Service-role client is used only in server code, never in client bundles.
- Queries that select columns use an explicit list; no `select('*')` on tables with answer keys or personal data.
- Schema references in code match the database (look for missing tables and columns).

## 4. Stripe
- Checkout and webhook code runs on the server only.
- Webhook signatures are verified against the raw body.
- Events are idempotent; access is granted from webhook events, not the redirect.
- Stripe keys: test keys in code are a finding even when they are test keys.

## 5. Brevo (email)
- Email sends are not reachable by unauthenticated callers (no open relay).
- Recipient addresses come from the signed-in user or the database, never from free text in the request alone.
- Rate limits exist on OTP and signup sends.

## 6. Webhooks
- Each webhook verifies its signature and rejects replays.
- Failures return non-2xx codes; errors are not echoed back.

## 7. Secrets
- Scan the repo and git history for live-looking keys (`sk_live_`, `whsec_`, long JWTs, service-role keys). Placeholder values are not findings.
- `.env*` files are git-ignored; `.env.example` contains no values.
- Check that secrets are read from the environment, not hardcoded.

## 8. Vercel
- `vercel.json` and deploy settings: production deploys require approval (see hook 4).
- Environment variables with `NEXT_PUBLIC_` prefix contain no secrets.
- Preview deployments do not use production data.

## 9. Cloudflare
- Check whether Cloudflare is used at all (`grep -ri cloudflare`). If not, say "not used in this repo".

## 10. Dependencies
- Run `pnpm audit` in `openMAIC/` and report high and critical advisories.
- Flag packages committed in git (for example `node_modules` folders tracked by git).

## Output
One section per layer, in the order above. End with the top three fixes by risk.
