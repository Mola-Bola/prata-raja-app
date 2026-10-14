# Stale-code report (14 Oct 2026)
Source: `npx knip --no-progress --reporter compact` (not a dependency; nothing deleted). Knip has no entry config here, so many "unused files" are scripts/functions run outside the import graph: verify before removing.

## Unused files (25)
| Item | Recommendation |
|---|---|
| `scripts/*.mjs` (brand-lint, brand-data, cloud-env, feedback, publish-web, release-apk, render-icons, retain-web-chunks, serve-web, set-project, ship-cloud, ship-label, updates-server, web-pwa, you-search) | False positives: invoked by shell/npm. Keep. Add them as knip entries if knip is adopted. |
| `e2e/smoke.mjs`, `e2e/web/playwright.config.ts` | False positive (test runners). Keep. |
| `plugins/with-release-signing.js`, `with-startup-link-intent.js` | Config plugins used only for APK; keep (web-only for now). |
| `public/sw.js` | Registered at runtime; keep. |
| `supabase/functions/{game-feedback,updates}/index.ts` | Edge functions; keep. |
| `docs/reviews/feedback-telemetry-check/*.mjs` | Codex-era probe scripts (now `docs/archive/reviews/...`); candidates to delete. |
| `src/meta/gear.ts.bak` (not reported by knip) | Delete: stale backup. |

## Unused dependencies / binaries
- `expo-symbols`: unused; remove (check no native need; JS-only removal is safe).
- `sips` (macOS) and `supabase` binaries unlisted: expected, ignore.

## Unused exports, game code (delete or un-export when touched)
- `core/dipLinks DIP_FAMILIES`, `core/director DEFAULT_BOSS_AT`, `core/kitchen KITCHEN_MAX_*`, `core/sim/ctx ELITE_SPEED`, `core/soak TAG_*`, `core/view depthScale`: un-export or use; low risk.
- `core/statRegistry statLabel/statsByGroup/sheetStats` and `StatGroup/StatUnit`: keep; sheets should use them (likely under-adopted, see [stat-registry](stat-registry.md)).
- `game/audio/music.ts SA, BOSS_BPM, mulberry32, RHYTHMS, KICK_STEPS, PHRASE_ROOTS, SONG, LeadNote`: un-export (internal).
- `game/phaser/{layout ART_*/COUNTER_K, look LOB_ARC, street U_PER_M, tex tex/hasSprite/Tex}`: un-export; `LOB_ARC` may indicate an unwired lob arc.
- `game/telemetryCore levelUpEvent`: unwired event; wire or delete.
- `game/ui/RunBuild statText/effectRows`, `game/ui/FeedbackSheet closeFeedback`, `game/ui/cardText CardFrame`: delete if no plan.
- `meta/gear AFFIX_BANDS/affixRange/ENHANCE_PCT`, `meta/uniques hooksOf`, `meta/milestones MILESTONE_LEVELS`: gear v2 data likely meant for UI; wire into the build/gear sheet or un-export.
- `meta/migrate migrateV2toV3`: keep (called internally; un-export fine).
- `meta/types StreakState`, `core/types Zone`: delete if unused.

## Unused exports, starter template (src/ui, src/data, src/domain, src/ext, src/features, supabase)
- `src/ui` (ActionSheet, SquareFab, Celebrate, ChoiceCards, fields.tsx, display Stat, motion helpers, fonts helpers, theme exports) and `src/ui/index.ts` barrel: Cell starter kit primitives not used by the game. Keep until the starter is next synced; do not hand-delete (shared with Oleh/Hatch).
- `src/data/*` (queryClient, saveOrQueue, QUEUED_NOTE, useIsOnline, etc.), `src/ext/*` types, `src/domain/format localDate`, `features/feedback/{context,updates}`: starter/offline-queue code. Recommend keep: offline queue may matter for cloud save; revisit when real-phone pass happens.
- `supabase/functions/game-feedback/logic.ts AUTHOR_NAME/validScreenshot`: check tests; likely test-only.
- `src/game/feedback.ts NO_INFO/FEEDBACK_URL/authHeaders`: verify then un-export.

## Types
23 unused exported types, mostly starter template; low value, ignore.
