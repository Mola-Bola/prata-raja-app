# Earned dip simmer — ledger 50

Implementation follows the adopted `.fleet/reviews/dip-simmer-contract.md` (lead-owned design packet). This slice preserves run tiers 1–5 and adds cumulative saved XP deriving simmer 1–20 for Fish Curry, Mint Chutney and Condensed Milk only. Quality/overnight aging is explicitly deferred; no quality fields, timer or spend controls were added.

Ordinary `computeLoadout` supplies a copied run-start `dipSimmer` snapshot. Only living enemies taking positive direct bread HP damage through the ordinary unshielded hit boundary grant use: owned matching links, base/evolution family identity and matching tags on both linked and hit bread. Each dip gets one credit per rolling simulation second, capped at 120/run. Shield-blocked hits **including the armour-pierce shield branch** deliberately earn no XP in this first slice. Credit precedes secondary cascades, so lethal direct hits count; chain, Sambal, DoT, misses, no-hit time and paused phases cannot credit. No RNG calls were added.

Saved XP has tolerant independent defaults, flooring and a 2470 lifetime cap. Payout requires wave 2, actual reported use and matching final owned dip/bread family; absent/invalid maps pay zero. Existing GameUi ticket protection remains the exactly-once boundary. Save version stays 2; prior records, items, availability and recipe unlocks remain intact.

At matching hits only, existing +25% effect transformations run first, then simmer scales Fish burn DPS / Mint chill duration / Milk sticky slow duration by +0.5% per simmer above 1 (maximum +9.5%). Bread damage and every other effect field remain unchanged. Power earned now benefits the next run. Sambal copies raw runtime-tier Fish burn as before; directly boosted neighbours retain the existing max-refresh rule. Milk slow still survives Sugar Crash.

Collection is visible on all saves. It explains Signature's stall-level-9 link gate, shows recipe/stall availability, family/effect text, numeric simmer bonus and labeled progress. Other dips have no XP/upgrade controls. The compact collection action uses clear central scene space without adding an art hotspot or another footer row. Results draw capped receipts from the computed payout only, including next threshold and next-run wording.

## Verification

- Full `SKIP_DB=1 bash scripts/check.sh` passes: typecheck, lint, brand and 949 unit tests. Local pgTAP was explicitly skipped (no DB changes).
- 22 focused progression/persistence/receipt tests pass; 93 tests including changed migration/loadout expectations pass.
- Typecheck and lint pass without warnings after the final collection effect-copy change. No Expo or React Native APIs changed; UI follows existing DOM components and card text helpers.
- Focused Chromium browser tests pass at 320×480 and 360×640: legacy access, every stall control's center unobscured, collection scrolling/no horizontal overflow, exact two-dip receipts, repeated runEnd protection, reload progress and byte-identical complete save through Kitchen loss/restart/exit.
- All 26 browser cases pass on the build before the final effect-text/receipt-spacing polish: three dip cases, six existing Kitchen cases and seventeen existing stall cases (including hotspot alignment and normal payout fit).
- The final polished export passes all three focused dip cases again (8.3s). Both earned receipts fit together at 360×640; each remains under 130px tall. The final receipt-only class/CSS edit also passes the renderer test, typecheck and lint.
- CI is inspected after pushing the frozen branch; the worker reports its run separately rather than assuming it passed.
- Final screenshots are in `.spike/dip-simmer/`: `hub-{320x480,360x640}.png`, `collection-top-{320x480,360x640}.png`, `collection-bar-{320x480,360x640}.png`, `collection-bottom-{320x480,360x640}.png`, `collection-earned-360x640.png`, `results-top-360x640.png`, `results-receipts-360x640.png`. These ignored local artifacts remain available for lead review.
- Logs: `/tmp/prata-dip-browser.log` (26 cases), `/tmp/prata-dip-final-browser.log` (final three), `/tmp/prata-dip-final-check/` (full checks).

The browser payout test injects a reported use map at the ordinary run-end boundary to verify integration; deterministic core tests verify actual successful-hit accounting separately. Browser viewport proof is not real-device proof. Lead-owned real-phone browser verification, paired baseline identity and 300-seed effect-specific balance evidence remain required before adopting the numeric tuning. No cloud, database, merge or shipping effects were performed by this worker.
