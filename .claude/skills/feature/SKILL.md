---
name: feature
description: Implement a new platform feature end to end, from a short plan through tests and a pull request.
---

# Feature Workflow

1. Restate the feature in one or two sentences and list the files you expect to change.
2. Check `CLAUDE.md` and the relevant `.claude/rules/` files for constraints.
3. Make the smallest change that delivers the feature. Keep server and client code separated.
4. Add or update tests for the changed behavior. Run `pnpm lint` and the build.
5. Commit on a feature branch with a message in the style of recent commits (`feat:`, `fix:`).
6. Open a draft pull request against `main` and summarize what changed and how it was verified.
