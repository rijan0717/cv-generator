#!/usr/bin/env bash
#
# check-and-sanitise-env.sh
#
# Two jobs, in this order:
#   1. Check  — report whether client/.env and server/.env hold the values the
#               app needs, without ever printing a secret.
#   2. Sanitise — replace the real credentials in server/.env.example with
#               placeholders, so the tracked example file can be committed.
#
# Safe to re-run. Nothing is written until you confirm, and the original
# example file is backed up to server/.env.bak.example (git-ignored).
#
# Usage:
#   bash scripts/check-and-sanitise-env.sh          # check, then prompt
#   bash scripts/check-and-sanitise-env.sh --check  # check only, write nothing
#   bash scripts/check-and-sanitise-env.sh --yes    # check, sanitise, no prompt

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CHECK_ONLY=false
ASSUME_YES=false
case "${1:-}" in
  --check) CHECK_ONLY=true ;;
  --yes|-y) ASSUME_YES=true ;;
  "") ;;
  *) echo "Unknown option: $1"; exit 2 ;;
esac

green() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
red()   { printf '  \033[31m✗\033[0m %s\n' "$1"; }
warn()  { printf '  \033[33m!\033[0m %s\n' "$1"; }

problems=0

# Read one KEY=value from a file and echo just the value. Returns 1 if the key
# is absent, so a missing key and an empty value stay distinguishable.
value_of() {
  local file="$1" key="$2" line
  line="$(grep -E "^${key}=" "$file" 2>/dev/null | head -n 1 || true)"
  [ -n "$line" ] || return 1
  printf '%s' "${line#*=}"
}

# Report on a key without ever echoing the value itself.
report_key() {
  local file="$1" key="$2" requirement="${3:-set}" value
  if ! value="$(value_of "$file" "$key")"; then
    red "$key is missing from $file"
    problems=$((problems + 1))
    return
  fi
  if [ -z "$value" ]; then
    if [ "$requirement" = "may-be-empty" ]; then
      green "$key is empty (intentional)"
    else
      red "$key is present but empty in $file"
      problems=$((problems + 1))
    fi
    return
  fi
  green "$key is set (${#value} characters)"
}

echo
echo "Environment check — $ROOT"
echo

# ---------------------------------------------------------------------------
# 1. client/.env
# ---------------------------------------------------------------------------
echo "client/.env"
if [ ! -f client/.env ]; then
  red "client/.env does not exist (Vite never reads .env.example)"
  problems=$((problems + 1))
else
  # Empty is correct in development: vite.config.js proxies /api and /uploads
  # to Express, so relative URLs stay same-origin.
  report_key client/.env VITE_API_BASE_URL may-be-empty
  report_key client/.env VITE_GOOGLE_CLIENT_ID

  if cid="$(value_of client/.env VITE_GOOGLE_CLIENT_ID)" && [ -n "$cid" ]; then
    case "$cid" in
      *.apps.googleusercontent.com) green "VITE_GOOGLE_CLIENT_ID has the expected suffix" ;;
      *) red "VITE_GOOGLE_CLIENT_ID does not end with .apps.googleusercontent.com"
         problems=$((problems + 1)) ;;
    esac
  fi
fi
echo

# ---------------------------------------------------------------------------
# 2. server/.env — the same keys `npm run check:gmail` validates, plus the
#    core ones, so a single run tells you whether the server can boot.
# ---------------------------------------------------------------------------
echo "server/.env"
if [ ! -f server/.env ]; then
  red "server/.env does not exist"
  problems=$((problems + 1))
else
  for key in MONGODB_URI JWT_SECRET PRINT_TOKEN_SECRET CLIENT_URL \
             GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GOOGLE_REDIRECT_URI GMAIL_TOKEN_KEY; do
    report_key server/.env "$key"
  done
fi
echo

# ---------------------------------------------------------------------------
# 3. Do the client and server agree on the Google client ID? They must, or the
#    browser starts a flow the server cannot finish.
# ---------------------------------------------------------------------------
echo "client / server agreement"
c_id="$(value_of client/.env VITE_GOOGLE_CLIENT_ID 2>/dev/null || true)"
s_id="$(value_of server/.env GOOGLE_CLIENT_ID 2>/dev/null || true)"
if [ -n "$c_id" ] && [ -n "$s_id" ]; then
  if [ "$c_id" = "$s_id" ]; then
    green "VITE_GOOGLE_CLIENT_ID matches server GOOGLE_CLIENT_ID"
  else
    red "client and server Google client IDs differ"
    problems=$((problems + 1))
  fi
else
  warn "skipped — one of the two client IDs is missing"
fi
echo

# ---------------------------------------------------------------------------
# 4. Is the tracked example file carrying real credentials?
# ---------------------------------------------------------------------------
echo "server/.env.example (tracked by git — placeholders only)"
needs_sanitising=false
if [ ! -f server/.env.example ]; then
  warn "server/.env.example not found — nothing to sanitise"
else
  for key in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GMAIL_TOKEN_KEY; do
    ex="$(value_of server/.env.example "$key" 2>/dev/null || true)"
    real="$(value_of server/.env "$key" 2>/dev/null || true)"
    if [ -n "$ex" ] && [ -n "$real" ] && [ "$ex" = "$real" ]; then
      red "$key holds the same value as server/.env — this is a real credential"
      needs_sanitising=true
    else
      green "$key differs from server/.env (looks like a placeholder)"
    fi
  done
fi
echo

if [ "$needs_sanitising" = false ]; then
  echo "Nothing to sanitise."
  [ "$problems" -eq 0 ] && echo "All checks passed." || echo "$problems problem(s) found above."
  exit 0
fi

if [ "$CHECK_ONLY" = true ]; then
  echo "Check-only mode: server/.env.example still needs sanitising before you commit it."
  exit 1
fi

echo "server/.env.example will be rewritten with placeholders."
echo "Your real values stay untouched in server/.env."
if [ "$ASSUME_YES" = false ]; then
  read -r -p "Proceed? [y/N] " reply
  case "$reply" in
    y|Y|yes|YES) ;;
    *) echo "Left unchanged."; exit 0 ;;
  esac
fi

# .env.bak* is already git-ignored, so the backup cannot be committed.
cp server/.env.example server/.env.bak.example
sed -i -E \
  -e 's#^GOOGLE_CLIENT_ID=.*#GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com#' \
  -e 's#^GOOGLE_CLIENT_SECRET=.*#GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret#' \
  -e 's#^GMAIL_TOKEN_KEY=.*#GMAIL_TOKEN_KEY=generate-with-npm-run-setup-gmail#' \
  server/.env.example

echo
green "server/.env.example sanitised (backup: server/.env.bak.example)"
echo
echo "Next:"
echo "  git diff -- server/.env.example   # confirm only placeholders changed"
echo "  npm run check:gmail               # server/.env is untouched, should still pass"
