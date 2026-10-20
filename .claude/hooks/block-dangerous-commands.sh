#!/usr/bin/env bash
# PreToolUse hook for Bash. Blocks destructive commands and asks for approval
# on production-facing ones. Reads the hook payload (JSON) on stdin.
#   exit 2 -> command blocked, reason sent back to Claude
#   JSON permissionDecision "ask" -> user must approve

if ! command -v jq >/dev/null 2>&1; then
  printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"jq is not installed, so this command could not be checked for dangerous patterns."}}'
  exit 0
fi

cmd=$(jq -r '.tool_input.command // empty')
[ -z "$cmd" ] && exit 0

block() {
  echo "Blocked by dangerous-command hook: $1" >&2
  echo "Command: $cmd" >&2
  echo "Run it yourself in a terminal if it is really needed." >&2
  exit 2
}

ask() {
  jq -n --arg reason "$1" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: $reason}}'
  exit 0
}

# --- Blocked outright ---------------------------------------------------
echo "$cmd" | grep -Eiq 'supabase[[:space:]]+db[[:space:]]+reset' \
  && block "supabase db reset wipes the local database."
echo "$cmd" | grep -Eiq 'drop[[:space:]]+(database|table)([[:space:]]|;|$)' \
  && block "DROP DATABASE / DROP TABLE is not allowed."
echo "$cmd" | grep -Eiq '(^|[^[:alnum:]_])truncate[[:space:]]' \
  && block "TRUNCATE is not allowed."
echo "$cmd" | grep -Eq 'git[[:space:]]+push[[:space:]]+(.*[[:space:]])?(--force([-a-z]*)?|-[a-zA-Z]*f[a-zA-Z]*)([[:space:]]|$)' \
  && block "git push --force rewrites remote history."
echo "$cmd" | grep -Eq 'git[[:space:]]+reset[[:space:]]+--hard' \
  && block "git reset --hard discards uncommitted work."

# --- Requires approval --------------------------------------------------
echo "$cmd" | grep -Eq 'vercel[[:space:]].*(--prod|[[:space:]]promote)' \
  && ask "vercel --prod deploys to production. Approve only if you intend a live release."
echo "$cmd" | grep -Eq 'stripe[[:space:]].*--live|sk_live_' \
  && ask "This Stripe command touches live mode and real payments. Approve only if intended."
echo "$cmd" | grep -Eq '(^|[;&|[:space:]])rm[[:space:]]+.*(-[a-zA-Z]*[rR][a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|--recursive.*--force|--force.*--recursive)' \
  && ask "rm -rf deletes files without recovery. Confirm the target path."

exit 0
