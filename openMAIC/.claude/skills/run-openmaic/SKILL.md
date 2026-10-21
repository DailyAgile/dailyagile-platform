---
name: run-openmaic
description: Install, run, build, test, and drive the OpenMAIC Next.js app. Use when asked to start, run, or launch openMAIC, run its dev server, take a screenshot of its UI, click through a page, check the browser console, build it, or run its tests.
---

OpenMAIC is a Next.js 16 web app. Start the dev server, then drive it with the
headless-browser driver at `.claude/skills/run-openmaic/driver.mjs`. The driver
reads commands from stdin, the same way `chromium-cli` does.

All paths below are relative to `openMAIC/` (the unit root), not to the skill
directory.

## Prerequisites

Verified on macOS (Darwin 25.6, arm64) with Node 24.15.0 and pnpm 10.28.0. Node
22 is the pin in `.nvmrc`; Node 24 worked for install and dev, but I did not
test Node 22 here.

- Node 20.9+ (`engines`), pnpm 10.28.0 (`packageManager`).
- A Chromium build for the driver. It uses the `@playwright/test` installed by
  `pnpm install`. The cache must hold `chromium-1208` (that is what
  `@playwright/test` 1.58.2 expects). If it is missing, run
  `pnpm exec playwright install chromium`. I did not need this; the build was
  already cached.
- No OS packages were needed for the dev server or driver on macOS.
- Linux is not verified by this skill. The CI uses `ubuntu-latest` and Docker
  uses `node:22-alpine`, but I did not run either.

## Setup

```bash
pnpm install --frozen-lockfile        # ~1 min; runs postinstall builds of workspace packages
cp .env.example .env.local
```

`.env.local.example` is not tracked in git, so copy `.env.example`.

The app will not boot without four variables that `.env.example` does not
contain: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` (see `lib/env/validation.ts`). For a local smoke run,
append format-valid placeholders. They are not real services, so anything that
calls Stripe or Supabase will fail.

```bash
printf '%s\n' \
  'STRIPE_SECRET_KEY=sk_test_placeholder_local_smoke' \
  'STRIPE_WEBHOOK_SECRET=whsec_placeholder_local_smoke' \
  'SUPABASE_URL=https://placeholder-local.supabase.co' \
  'SUPABASE_SERVICE_ROLE_KEY=eyJplaceholderlocalsmoke' >> .env.local
```

Real keys (`ANTHROPIC_API_KEY`, etc.) are optional for the pages checked here.
Never commit `.env.local`.

## Build

`pnpm build` **currently fails** on this commit, at the TypeScript step:

```
./app/api/live-quiz/[code]/answer-status/route.ts:67:49
Type error: Parameter 'r' implicitly has an 'any' type.
```

`npx tsc --noEmit` reports 282 errors, mostly in `*.test.ts` files and
`acceptance-test.spec.ts`. Do not treat
a green dev server as a green build. Fix or report the type errors before
claiming the build works.

## Run (agent path)

Start the dev server in the background, then check it answers. Use the status
check below and re-run it until it prints `200`. There is no `timeout` command on
macOS, so do not use one.

```bash
pnpm dev -p 3000 > "$TMPDIR/openmaic-dev.log" 2>&1 &
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```

The first request compiles the route and takes several seconds. Repeat the
`curl` until it prints `200`. It printed `200` for `/` after one restart with
placeholder env vars.

Drive it by piping commands to the driver. Run from `openMAIC/`:

```bash
node .claude/skills/run-openmaic/driver.mjs <<'EOF'
nav http://localhost:3000
wait-for text=DailyAgile
screenshot home
console --errors
EOF
```

Output:

```
nav http://localhost:3000 -> HTTP 200
visible: text=DailyAgile
screenshot: /var/folders/.../T/openmaic-shots/home.png
console: A tree hydrated but some attributes of the server rendered HTML didn't match ...
```

Screenshots go to `$TMPDIR/openmaic-shots/` (set `OPENMAIC_SHOTS` to change it).
Open them with the Read tool and look at them. A blank page or an error page
means the run failed even if `nav` printed `200`.

Driver commands:

| command | what it does |
|---|---|
| `nav <url>` | Load a URL and print the HTTP status |
| `wait-for <selector>` | Wait until visible. Takes the rest of the line, so `text=Take Quiz` works |
| `click <selector>` | Click. Takes the rest of the line |
| `type <text>` | Send real key events to the focused element (preferred for inputs) |
| `fill <selector> <value>` | Set an input's value in one step. See gotchas |
| `press <key>` | Press a key, e.g. `Enter` |
| `text` | Print the first 800 characters of the page's visible text |
| `eval <js>` | Evaluate JS in the page and print the JSON result |
| `screenshot [name]` | Full-page PNG to `$TMPDIR/openmaic-shots/<name>.png` |
| `console --errors` | Print console errors and uncaught page errors collected so far |

Selectors: `text=<words>` matches visible text. Anything else is a CSS selector.

Stop the dev server by killing whatever listens on port 3000. Do not use
`pkill -f` with a broad pattern.

```bash
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill
```

## Run (human path)

`pnpm dev` (or `pnpm dev -p 3000`) serves on `http://localhost:3000`. It opens no
window. Stop it with Ctrl-C. The production path is `pnpm build && pnpm start`,
which is blocked by the build failure above.

## Test

```bash
pnpm test
```

Result on this commit: `Test Files 16 failed | 253 passed (269)`,
`Tests 75 failed | 2291 passed | 46 skipped (2412)`. I did not check whether these failures pre-date
this work. `npx tsc --noEmit` fails as described under Build.

## Gotchas

- **`.claude/` is gitignored** (`openMAIC/.gitignore` line 4 and the repo
  `.gitignore`). A plain `git add` skips this skill. Commit it with
  `git add -f .claude/skills/run-openmaic`.
- **The app refuses to boot without the four Stripe/Supabase variables.** The
  home page returns HTTP 500 with `EnvironmentValidationError: CRITICAL
  ENVIRONMENT VARIABLES MISSING`. `.env.example` does not list them. The
  placeholders above fix the boot; they do not make any Stripe or Supabase
  feature work.
- **`fill` did not update React state on the home page.** After
  `fill input[placeholder*="8-digit"] ZZZZZZZZ`, the input's DOM value was
  correct, but clicking "Take Quiz" still showed `❌ Please enter a quiz code`.
  Use `click` then `type` instead. Typing did not fix the quiz flow either; see
  the next gotcha.
- **Home page quiz-code entry does not work in dev.** Even after real typing and
  clicking "Take Quiz", the page shows `❌ Please enter a quiz code`. The same
  page logs a React hydration mismatch on the code input's `style` attribute
  (`A tree hydrated but some attributes of the server rendered HTML didn't
  match`). That mismatch is the likely cause, but I did not confirm it. Treat
  client-side interaction on `/` as broken until someone checks.
- **The hydration warning is a normal `console --errors` line here.** It prints
  on every load of `/`. Filter it out when you check for new errors.
- **`pnpm build` fails at type-check, not at compile.** "Compiled successfully"
  prints first, then `Running TypeScript ...` fails. The dev server served `/`
  fine on the same tree.
- **macOS has no `timeout` command.** Use a re-run check or a counter loop.
- **The working copy in the main checkout is not clean.** `openMAIC/next.config.ts`
  has uncommitted changes there. This skill was written and verified in a clean
  worktree at HEAD, so those changes are not in play.
- **Next 16 prints a `middleware` deprecation warning** on dev and build. It is
  harmless for this run.

## Troubleshooting

- **`GET / 500`, log shows `EnvironmentValidationError`**: a required variable is
  missing from `.env.local`. Add the four variables from Setup, then restart
  the dev server (the env is read at boot).
- **`Failed to compile` on `Running TypeScript`**: the type errors described
  under Build. Not caused by the dev server or the driver.
- **`FAILED wait-for ...: Timeout 30000ms exceeded`**: the element is not on the
  page. Run `text` to see what is there, then retry with a selector that matches.
  (This happened with `wait-for text=Quiz not found` on `/`, because that text
  does not appear.)
- **`EADDRINUSE` on port 3000**: an earlier dev server is still running. Run the
  `lsof ... | xargs kill` command under Run (agent path).
