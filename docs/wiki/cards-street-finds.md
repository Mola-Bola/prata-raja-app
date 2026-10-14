# Cards -> street finds
Purpose: in-run picks. Placeholder bridge; lead plan is small run-only "street finds" at calm moments, owner to steer after story/gear settle.

## Files
- `src/core/cards.ts`, `src/game/ui/cardText.ts`, `src/core/sim.ts` (offer queue), `src/core/__tests__/{cards,picks,evolutions}.test.ts`

## How it works
- Level-ups queue picks ("Pick 2 of 3", Later button); dip family and linked bonuses gated by roti tags; evolutions exist.
- Power must come from gear/spec, not cards (ARPG direction).

## Status
Experimental. Last change 2026-10-14. Beat-time picks (PLAN-2 #8) not confirmed done.

## Research
- Used: [game-feel](../research/game-feel.md) section 4, [engagement](../research/engagement.md) #1/#5.
- Not yet: [teardown-ballpit-terraria](../research/teardown-ballpit-terraria.md) fusion/evolution rules, [teardown-vs-brotato-oss](../research/teardown-vs-brotato-oss.md) signposting.

## TODO
- Demote to run-only, small effects; remove mid-fight pause.

Related: [kannan-level](kannan-level.md), [crisp-soak](crisp-soak.md). Archived: [DEPTH](../archive/DEPTH.md).
