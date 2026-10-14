# Cards -> street finds
Purpose: in-run picks. Placeholder bridge; lead plan is small run-only "street finds" at calm moments, owner to steer after story/gear settle.

## Files
- `src/core/cards.ts`, `src/game/ui/cardText.ts`, `src/core/sim.ts` (offer queue), `src/core/finds.ts`, `src/core/__tests__/{cards,picks,finds-pickup,evolutions}.test.ts`

## How it works
- Level-ups queue picks ("Pick 2 of 3", Later button); dip family and linked bonuses gated by roti tags; evolutions exist.
- Power must come from gear/spec, not cards (ARPG direction).

## Street finds (flow runs)
- Counter mode: a find is granted at once with a 3 s "Swap?" toast (`finds.ts` grantFind/swapFind, FindToast).
- Free mode (default): at each find stop a tiffin PICKUP (`w.pickup`, tiffin-carrier sprite, "Gift" label, glow ring) appears at `PICKUP_Y` and drifts down at `PICKUP_SPEED`. Kannan touching it pauses the run (phase `levelup`, `pickup.open`) on three cards (the find + 2 alts, drawn at spawn from the sim rng): "A regular left you a tiffin - pick one". Tap grants exactly that card (`chooseFind`), run resumes after 0.3 s. No timer. Missed gifts scroll off ("Missed a gift", event `findMissed`); boss mark drops any left. MAX_FINDS applies. Card text: `findChoice` in `cardText.ts`; overlay `FindChoice` in `GameUi.tsx`.
- Bot (`autoplay.ts` GIFT_PULL) beelines for a gift; finds decide balance (no finds = 0% wins), so the pull is strong.
- Tests: `__tests__/finds-pickup.test.ts` (free), `picks.test.ts` (counter).

## Status
Experimental. Last change 2026-10-15 (r8-finds). Beat-time picks (PLAN-2 #8) not confirmed done.

## Research
- Used: [game-feel](../research/game-feel.md) section 4, [engagement](../research/engagement.md) #1/#5.
- Not yet: [teardown-ballpit-terraria](../research/teardown-ballpit-terraria.md) fusion/evolution rules, [teardown-vs-brotato-oss](../research/teardown-vs-brotato-oss.md) signposting.

## TODO
- Demote to run-only, small effects; remove mid-fight pause.

Related: [kannan-level](kannan-level.md), [crisp-soak](crisp-soak.md). Archived: [DEPTH](../archive/DEPTH.md).
