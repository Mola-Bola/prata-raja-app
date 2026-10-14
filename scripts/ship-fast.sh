#!/usr/bin/env bash
# Owner fast lane (14 Oct): typecheck + ~1s smoke tests, bump version, publish web, push. Full suite runs in CI after.
# Commits since the last ship that carry a `Feedback: <id>[,<id>]` trailer get their in-game notes marked shipped.
# Usage: bash scripts/ship-fast.sh
set -euo pipefail
cd "$(dirname "$0")/.."
[ "$(git branch --show-current)" = main ] || { echo "ship-fast: not on main"; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "ship-fast: tree not clean"; exit 1; }
last=$(cat .fleet/last-web-ship 2>/dev/null || git rev-parse HEAD~1)
npx tsc --noEmit & tsc=$!
npm run -s test:smoke
wait $tsc
label=$(node scripts/ship-cloud.mjs --next-label)
# The in-game badge reads app.json's version: bump it (and package.json) so the live build says what it is.
node -e 'const fs=require("fs"),v=process.argv[1];for(const f of ["app.json","package.json"]){const j=JSON.parse(fs.readFileSync(f));(j.expo??j).version=v;fs.writeFileSync(f,JSON.stringify(j,null,2)+"\n")}' "$label"
git commit -qam "Release $label"
node scripts/publish-web.mjs --label "$label"
git rev-parse HEAD > .fleet/last-web-ship
git push -q origin main
ids=$(git log "$last"..HEAD --format='%(trailers:key=Feedback,valueonly)' | tr ',\n' '  ' | xargs | tr ' ' ',')
notes=$(git log "$last"..HEAD --no-merges --format='%s' | grep -v '^Release ' | head -8 | paste -sd ';' -)
node scripts/feedback.mjs record-release --label "$label" --kind ota --runtime "$(node -p 'require("./app.json").expo.runtimeVersion')" --notes "$notes" ${ids:+--ids "$ids"} \
  || echo "ship-fast: release recorded locally only (feedback status not updated)"
echo "ship-fast: $label live (full checks run in CI)"
