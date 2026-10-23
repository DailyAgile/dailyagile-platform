#!/usr/bin/env bash
# PostToolUse hook for Edit/Write/MultiEdit. After a .ts/.tsx change in openMAIC:
# format -> lint -> typecheck. Failures are sent back to Claude on stderr (exit 2).

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

app="$CLAUDE_PROJECT_DIR/openMAIC"
[ -d "$app" ] || exit 0
cd "$app" || exit 0

case "$file" in
  "$app"/*) rel="${file#"$app"/}" ;;
  *) exit 0 ;;   # changed file is outside openMAIC
esac

failed=0
report() { echo "$1" >&2; failed=1; }

npx --no-install prettier --write "$rel" >/dev/null 2>&1 || report "prettier failed on $rel"

lint_out=$(npx --no-install eslint "$rel" 2>&1) || report "eslint failed on $rel:
$lint_out"

tsc_out=$(npx --no-install tsc --noEmit -p . 2>&1) || report "typecheck failed (tsc --noEmit):
$(printf '%s\n' "$tsc_out" | head -40)"

if [ "$failed" -eq 1 ]; then
  echo "Fix the issues above before continuing." >&2
  exit 2
fi
exit 0
