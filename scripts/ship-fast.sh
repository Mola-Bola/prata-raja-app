#!/usr/bin/env bash
# Owner fast lane (14 Oct): typecheck + tests related to what changed since the last web ship, then publish.
# The full suite runs afterwards in CI on the main push; fix forward. Usage: bash scripts/ship-fast.sh
set -euo pipefail
cd "$(dirname "$0")/.."
[ "$(git branch --show-current)" = main ] || { echo "ship-fast: not on main"; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "ship-fast: tree not clean"; exit 1; }
last=$(cat .fleet/last-web-ship 2>/dev/null || git rev-parse HEAD~1)
npx tsc --noEmit
npx vitest run --configLoader runner --changed "$last" --passWithNoTests
label=$(node scripts/ship-cloud.mjs --next-label)
# The in-game badge reads app.json's version: bump it (and package.json) so the live build says what it is.
node -e 'const fs=require("fs"),v=process.argv[1];for(const f of ["app.json","package.json"]){const j=JSON.parse(fs.readFileSync(f));(j.expo??j).version=v;fs.writeFileSync(f,JSON.stringify(j,null,2)+"\n")}' "$label"
git commit -qam "Release $label"
node scripts/publish-web.mjs --label "$label"
git rev-parse HEAD > .fleet/last-web-ship
git push -q origin main
echo "ship-fast: $label live (full checks run in CI)"
