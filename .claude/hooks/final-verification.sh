#!/usr/bin/env bash
# Stop hook. Before Claude finishes, runs typecheck, lint and tests in openMAIC
# and reports git state. Any failure blocks the stop (exit 2) with details.

input=$(cat)
# Avoid an endless loop: if this hook already blocked once, let Claude stop.
[ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = "true" ] && exit 0

root="$CLAUDE_PROJECT_DIR"
app="$root/openMAIC"
failed=0
report() { echo "$1" >&2; failed=1; }

echo "== git status ==" >&2
git -C "$root" status --short >&2
echo "== git diff --stat ==" >&2
git -C "$root" diff --stat >&2

if [ -d "$app" ]; then
  cd "$app" || exit 0

  tsc_out=$(npx --no-install tsc --noEmit -p . 2>&1) || report "typecheck failed:
$(printf '%s\n' "$tsc_out" | head -40)"

  lint_out=$(npx --no-install eslint . 2>&1) || report "lint failed:
$(printf '%s\n' "$lint_out" | tail -40)"

  test_out=$(npx --no-install vitest run 2>&1) || report "tests failed:
$(printf '%s\n' "$test_out" | tail -40)"
fi

if [ "$failed" -eq 1 ]; then
  echo "Final verification failed. Fix the issues above before finishing." >&2
  exit 2
fi
echo "Final verification passed: typecheck, lint, tests." >&2
exit 0
