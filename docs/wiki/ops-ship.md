# Ship-fast, CI, snap tour, monitor
Purpose: ship each slice fast; look at the result; watch notes and replays cheaply.

## Files
- `scripts/ship-fast.sh`, `publish-web.mjs`, `ship-cloud.mjs`, `ship-label.mjs`, `snap-tour.mjs`, `check.sh`, `you-search.mjs`; `.github/workflows/{check,e2e-nightly}.yml`; `e2e/`; [MONITOR](../MONITOR.md), [INBOX](../INBOX.md), [BUILDS](../BUILDS.md)

## How it works
- `bash scripts/ship-fast.sh` on clean main: tsc + `test:smoke`, bump version, publish web, push. CI runs the full suite after.
- `npm run snap` (`-- --local`, `-- --random 6`): bot with god=1 at chapter points, contact sheet, balance table.
- Monitor: Haiku scout every ~2h reads notes + PostHog into INBOX.md (never ran yet).
- Web only; no APK unless the owner asks.

## Status
Live. Last change 2026-10-14. Monitor: experimental.

## Research
- Used: [malleable-dev-flow](../research/malleable-dev-flow.md), [knowledge-practices](../research/knowledge-practices.md).
- Not yet: P5 state-hash repro, P8 telemetry dimensions.

Related: [login-cloud-save](login-cloud-save.md), [street-floor](street-floor.md), [stale-code](stale-code.md).
