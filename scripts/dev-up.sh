#!/usr/bin/env bash
# Bring up everything Prata Raja needs on this Mac: Docker VM, Supabase (DB/auth/storage) on the 595xx ports, the web app
# and the over-the-air update server. Runs side by side with the other apps (each has its own project_id and ports).
# Usage: scripts/dev-up.sh [--rebuild-web] [--reset-db]
#   --reset-db  re-applies migrations and seed (demo login demo@prata-raja.test / prata-raja-demo-1)
# First time: copy .env.example to .env and fill in the publishable key that `supabase status` prints.
set -euo pipefail
cd "$(dirname "$0")/.."
LOGS="$HOME/.prata-raja-logs"; mkdir -p "$LOGS"
IP="$(ipconfig getifaddr en0 || echo 127.0.0.1)"
[ -f .env ] || { echo "No .env: copy .env.example to .env first."; exit 1; }

colima status >/dev/null 2>&1 || colima start --cpu 4 --memory 6
# `supabase status` reads this project's containers only (project_id "prata-raja"), never another app's.
if ! supabase status >/dev/null 2>&1; then
  supabase start -x vector,logflare,imgproxy,supavisor
fi
if [ "${1:-}" = "--reset-db" ] || [ "${2:-}" = "--reset-db" ]; then supabase db reset >"$LOGS/db-reset.log" 2>&1; fi

# Over-the-air update server on :9492 (phones check it on launch/foreground).
if ! lsof -nP -iTCP:9492 -sTCP:LISTEN >/dev/null 2>&1; then
  PORT=9492 nohup node scripts/updates-server.mjs > "$LOGS/updates.log" 2>&1 &
  sleep 1
fi

# Web app (production build) on :9490 for phones and browsers on this Wi-Fi.
# web-pwa.mjs: installable, and the whole app saved for offline use from the first visit (public/sw.js).
if [ "${1:-}" = "--rebuild-web" ] || [ ! -f dist/index.html ]; then
  (set -a; . ./.env; set +a; npx expo export -p web > "$LOGS/web-export.log" 2>&1 && node scripts/web-pwa.mjs dist >> "$LOGS/web-export.log" 2>&1)
fi
if ! lsof -nP -iTCP:9490 -sTCP:LISTEN >/dev/null 2>&1; then
  nohup node scripts/serve-web.mjs 9490 > "$LOGS/web.log" 2>&1 &
  sleep 1
fi

echo "Prata Raja is up."
echo "  Web:                 http://$IP:9490"
echo "  Supabase API:        http://$IP:59521   (Studio http://$IP:59523, mail http://$IP:59524)"
echo "  App updates:         http://$IP:9492"
echo "  Demo login:          demo@prata-raja.test / prata-raja-demo-1"
echo "  Built-in app server: $(grep EXPO_PUBLIC_SUPABASE_URL .env | cut -d= -f2)"
[ "http://$IP:59521" = "$(grep EXPO_PUBLIC_SUPABASE_URL .env | cut -d= -f2)" ] || echo "  ! The Mac's IP changed. In the app: Me → long-press the version → set server to http://$IP:59521"
