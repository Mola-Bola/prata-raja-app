# S3 integration — sol/s3, 13 Oct 2026

Status: superseded — shipped in 0.3.0.


## Conflict resolutions
- Resolved all eight files; no conflict markers remain. Index intentionally untouched; lead must stage the resolutions.
- Cards keep S3 recipe pools, guaranteed eligible evolutions and slot replacement, plus main's distinct picks and last-two-offer repeat damping.
- All offer paths (initial, queued and reroll) retain loadout pools and history; Loadout includes both pools and Extra reroll.
- Rewards keep wave-2 pay gating, tips, idle-clock initialization, pending chests and chapter-specific boss attempts.
- Save-field assertions retain S3 unlocks/attempts and pending chests; obsolete tokens stay removed.
- Evolution descriptions obey 8 words / 25 characters / 10 letters per word; main's short descriptions remain.
- Main's CC immunity, boss approach, predictY clamp, telemetry, feedback and staggered card reveal remain integrated.

## UI
- Recipe book replaces the coming-soon preview at stall level 6: ten cookable recipes, exact ingredient costs/balances and eight evolution pairs.
- Known evolutions require available bread/partner pools; unknown pairs show a lock and their requirements. Cooking uses the newest save through commit(cook).
- Start daydream goes directly to chapter 1 until chapterUnlocked opens night after three chapter-1 boss attempts, then opens a chapter sheet.
- Chapter selection reaches both pending boot and normal starts; replay/restart retain the chosen chapter and revalidate its gate.
- Chapter 2 selects scene/background2; evolution cards use ui/card-epic, evolutions/<id> and EVOLVE badges.
- Counter bread slots now use content sprite keys, including evolutions. All new visuals use existing rendered art, with no Phaser Graphics.
- Added pure helper, combined offer-path and atlas coverage; three seeded Playwright cases cover cooking/persistence and the 2/3-attempt chapter gate.

## Checks
- Final explicit tsc + vitest + expo lint src + brand lint: PASS, 704 tests in 48 files, no lint warnings.
- Final SKIP_DB=1 scripts/check.sh: PASS (704 tests); pgTAP skipped.
- Requested PORT=9631 LOGS=/tmp/s3-logs SKIP_DB=1 scripts/check.sh --web: web export PASS; 36 browser cases blocked before app execution.
- Server listen on 0.0.0.0:9631 failed EPERM; Chromium MachPortRendezvous bootstrap registration denied. Logs: /tmp/s3-logs/{serve,e2e}.log.
- Worktree lacked main's installed PostHog dependencies. Offline Expo install hit filesystem permissions; missing dependencies restored from local checkout, without manifest/lockfile changes.

## Balance (seeds 1–300 per policy)
| Chapter / loadout | 4 breads | 2 breads | Solo | Target |
|---|---|---|---|---|
| 1 / no meta | 63% | 42% | 24% | 55–75 / 40–60 / 10–25% |
| 2 / two training steps each, Rare gear, S2 pools | 62.3% (187) | 32.0% (96) | 10.3% (31) | 45–65 / report / 10–25% |
- Chapter 1 mean winning boss fights: 37 seconds for all policies (target 30–40); its content tuning is unchanged.
- BALANCE_SEEDS=300 vitest balance.test.ts: PASS (both tests); chapter 2 HP scaling 0.27 → 0.21, Baron HP 1,400 → 2,500. Earlier waves support solo builds; the boss preserves the four-bread challenge.

## Open issues
- Browser assertions and real-phone visual/performance checks remain unverified; rerun the web suite outside this sandbox with local bench env (the worktree has no .env).
- Night solo clears only 31/300 seeds, close to its lower bound; validate the longer Baron fight on a phone.
- Database tests skipped; no database/cloud changes, Git index writes, commits or shipping performed.
