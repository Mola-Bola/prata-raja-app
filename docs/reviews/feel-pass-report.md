# Feel pass — sol/feel, 13 Oct 2026

Implementation ready; commits and browser verification blocked by session permissions.

1. Boss telegraphs: pooled atlas strips, thicker white/vermillion edges, pulsing landing rings; counter flash and small hit shake.
2. Boss approach: 4× walk-in speed, matching throw leading; King Cockroach HP 800 → 480. Final volley damage 18 → 40; charge remains 45.
3. Range readability: pest scale floor 0.48; 24px outlined numbers, perspective floor 0.85, pop, 40px rise and 0.6s fade. Big/crit red-orange, chip yellow; 24 total, 8 DoT, 3 per target; ticks merge.
4. Throws: eased anticipation/release/recovery using existing poses, transformed hand socket, release puff, faster visible lob spin, perspective shrink, three fading bread copies (48 total max).
5. Mob attacks: wind-up and lunge on the existing contact-hit cadence; hit flash persists across multiple sim steps. Contact DPS unchanged.
6. Offers: last two displayed offers (including rerolls) reduce repeat weight to 15%; identities remain distinct; cards reveal at 150ms intervals and stay disabled until revealed.
7. Spent breads: pooled 120ms exit fade (24 max), then recycle; all shots clear on run end.
8. Waves 6–9: pull one affordable spawn forward after a 2.5s quiet gap with ≤2 living enemies; unchanged threat budgets. Boss volley tuning keeps all balance policies in range.
9. Street arrivals: common projection converges at the vanishing point then opens into lanes; far scale 0.30 → 0.42. Rules/spawn positions unchanged; existing arrival fade retained.
10. UI: inert Start footer is immediately hidden during sheet fade-in; boss HP fills a separate strip below wave/Lv.

## Balance (seeds 1–300 per policy; rounded percentages)

| Policy | Target | Before win | After win | Boss seconds before → after (wins) |
|---|---|---|---|---|
| 4 breads | 55–75% | 69% | 62% | 60 → 38 |
| 2 breads | 40–60% | 47% | 43% | 61 → 38 |
| Solo | 10–25% | 26% | 23% | 58 → 36 |

Baseline solo was already above target. Full balance test now asserts all win bands and 30–40s mean winning boss fights at ≥300 seeds.

## Verification and limits

- `npx tsc --noEmit && npx vitest run` passed after each item; final: 46 files, 662 tests (10 added).
- Final `SKIP_DB=1 bash scripts/check.sh`: typecheck, lint (zero warnings), brand and unit tests pass; DB skipped as requested.
- Requested `--web` command: export passed; all 33 Playwright tests failed before reaching the app. Server bind `0.0.0.0:9611` denied (`EPERM`); Chromium Mach port registration denied. No specs changed.
- Web log: `/private/tmp/claude-501/feel-check.log`; balance tables: `/private/tmp/feel-{before,final}-table.md`.
- Phone 60fps and visual playtest remain unverified because browser execution is blocked. Trails, number counts and bread exit slots are capped; steady drawing adds no new transient objects.
- New art required: none. Existing whole-body poses limit articulated arm motion; a rendered throw sequence would be future art work.
- Commits: none. Shared Git index is outside writable paths (`/Users/molabola/prata-raja/.git/worktrees/prata-raja-feel/index.lock`); creation denied. No push, merge or ship attempted.
- Ten ordered item patches plus this report patch are preserved in `/private/tmp/feel-patches/`; working files remain on `sol/feel`.
