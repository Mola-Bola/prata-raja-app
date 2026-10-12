#!/bin/bash
# Builds the web export with PUBLIC values only (Supabase URL + publishable key from eas.json, PostHog host + project key from
# ~/.cell/posthog.env) into ./dist, then serve it:  node scripts/serve-web.mjs 9591
#   bash docs/reviews/feedback-telemetry-check/build-web.sh [--no-posthog]     (--no-posthog = what CI builds: analytics off)
set -euo pipefail
cd "$(dirname "$0")/../../.."
export EXPO_PUBLIC_SUPABASE_URL="$(node -e "console.log(require('./eas.json').build.apk.env.EXPO_PUBLIC_SUPABASE_URL)")"
export EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$(node -e "console.log(require('./eas.json').build.apk.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)")"
export EXPO_PUBLIC_WEB_URL="http://localhost:9591"
if [ "${1:-}" != "--no-posthog" ]; then
  export EXPO_PUBLIC_POSTHOG_HOST="$(grep -E '^POSTHOG_HOST=' ~/.cell/posthog.env | cut -d= -f2-)"
  export EXPO_PUBLIC_POSTHOG_KEY="$(grep -E '^POSTHOG_KEY=' ~/.cell/posthog.env | cut -d= -f2-)"
fi
TMP="$(mktemp -d)"
rm -rf dist
TMPDIR="$TMP" CI=1 npx expo export -p web --clear --output-dir dist
node scripts/web-pwa.mjs dist
