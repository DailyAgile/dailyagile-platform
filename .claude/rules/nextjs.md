# Next.js Rules

- Use the App Router conventions already in `openMAIC/app/`. Keep route handlers in `route.ts` files.
- Keep server-only code out of client components. Mark client components with `"use client"` only when they need state, effects, or browser APIs.
- Do not import server-only modules (database clients, secret keys) into files that can reach the client bundle.
- Validate request bodies with a schema before using them.
- Use the `next/image` and `next/link` components for images and internal navigation.
- Run `pnpm lint` and the production build before merging changes to routes or config.
- Do not disable `turbopack` or other build options in `next.config.ts` without a note explaining why.

**Why:** the app mixes server and client code across instructor and student flows, and a leaked import can expose secrets.
**How to apply:** apply to any change under `openMAIC/app/` or `openMAIC/next.config.ts`.
