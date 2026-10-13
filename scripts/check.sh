#!/bin/bash
export DO_NOT_TRACK=1 SUPABASE_TELEMETRY_DISABLED=1
# Every check Prata Raja must pass, with SHORT output: one line per check, and details only for what failed.
# Made for Claude sessions (long test logs cost a lot of tokens); fine for people too.
#   bash scripts/check.sh            typecheck, lint, brand words, unit tests, database tests
#   bash scripts/check.sh --web      …plus a web build (private Metro cache) and the Playwright suite on :9491
#   bash scripts/check.sh --web a.spec.ts b.spec.ts   …only those specs
#   SKIP_DB=1 bash scripts/check.sh   …without the database tests (they need the local Supabase: bash scripts/dev-up.sh)
# Full logs are kept in $LOGS (default /tmp/prata-raja-check) for when a failure needs a closer look.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
LOGS="${LOGS:-/tmp/prata-raja-check}"
IP="$(ipconfig getifaddr en0 2>/dev/null || echo 127.0.0.1)"
PORT="${PORT:-9491}"
mkdir -p "$LOGS"
WEB=0
if [ "${1:-}" = "--web" ]; then WEB=1; shift; fi
SPECS=("$@")
FAILED=0

run() { # run <name> <command…>: prints "✓ name" or "✗ name" plus the tail of what failed
  local name="$1"; shift
  local log="$LOGS/$name.log"
  if "$@" >"$log" 2>&1; then
    echo "✓ $name$(summary "$name" "$log")"
  else
    FAILED=1
    echo "✗ $name$(summary "$name" "$log")"
    case "$name" in
      tsc) grep -E "error TS" "$log" | head -15 ;;
      lint) grep -E "^\s+[0-9]+:[0-9]+\s+(error|warning)|^/" "$log" | head -20 ;;
      brand) head -20 "$log" ;;
      vitest) grep -E "FAIL|AssertionError|Expected|Received|×" "$log" | head -25 ;;
      pgtap) grep -E "not ok|Failed|# " "$log" | head -20 ;;
      build) tail -15 "$log" ;;
      e2e) grep -E "✘|Error:|Expected|Received|›" "$log" | grep -vE "✓" | head -30 ;;
    esac
  fi
}

summary() { # one short tail for the ✓/✗ line
  case "$1" in
    vitest) grep -E "^\s+Tests " "$2" | tail -1 | sed -E 's/^[[:space:]]+/ · /' ;;
    pgtap) grep -E "^Files=" "$2" | sed -E 's/,.*//; s/^/ · /' ;;
    e2e) grep -E "[0-9]+ (passed|failed|flaky|skipped)" "$2" | tr '\n' ' ' | sed -E 's/^ +/ · /' ;;
    lint) grep -E "✖" "$2" | sed -E 's/^/ · /' ;;
    *) ;;
  esac
}

run tsc npx tsc --noEmit
run lint npx expo lint src
run brand node scripts/brand-lint.mjs # names people see come from src/brand.ts only
# Worktrees share read-only node_modules; avoid Vite's bundled-config temp files there.
run vitest npx vitest run --configLoader runner
if [ "${SKIP_DB:-0}" = 1 ]; then echo "- pgtap skipped (SKIP_DB=1)"; else run pgtap supabase test db; fi

if [ "$WEB" = 1 ]; then
  TMP="$LOGS/metro" && rm -rf "$TMP" && mkdir -p "$TMP"
  build() {
    set -a && . ./.env && set +a
    EXPO_PUBLIC_WEB_URL="http://$IP:$PORT" TMPDIR="$TMP" CI=1 npx expo export -p web --clear --output-dir dist &&
      node scripts/web-pwa.mjs dist
  }
  run build build
  if [ "${CHECK_OWN_SERVER:-0}" = 1 ]; then
    node scripts/serve-web.mjs "$PORT" >"$LOGS/serve.log" 2>&1 &
    SERVER_PID=$!
    trap 'kill "$SERVER_PID" 2>/dev/null || true; wait "$SERVER_PID" 2>/dev/null || true' EXIT
    sleep 2
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      echo "✗ e2e server failed (port $PORT); see $LOGS/serve.log"
      exit 1
    fi
  elif ! curl -s -o /dev/null "http://localhost:$PORT/"; then
    nohup node scripts/serve-web.mjs "$PORT" >"$LOGS/serve.log" 2>&1 &
    sleep 2
  fi
  run e2e env APP_WEB="http://localhost:$PORT" APP_WEB_URL="http://$IP:$PORT" \
    npx playwright test -c e2e/web --reporter=line --output "$LOGS/playwright" ${SPECS[@]+"${SPECS[@]}"}
fi

[ "$FAILED" = 0 ] && echo "All checks passed." || echo "Some checks failed (full logs: $LOGS)."
exit "$FAILED"
