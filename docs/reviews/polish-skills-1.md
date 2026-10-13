# Skills polish 1 — linked card readability

- Linked dip cards now retain their burn, slow or chill effect line and show a
  separate bold “Linked to X” scope line. Evolved links still name the base bread.
- Global dip cards show “All breads”. Accessible labels include the effect,
  scope and existing stronger/longer linked benefit.
- New/upgrade badges, offer rules, combat mechanics, saves and unlocks are unchanged.
- Existing three-column and narrow stacked layouts are retained.
- The 360 px exhaustive card layout test now includes every linkable dip across
  every base/evolved bread. Additional 320/390 px tests assert visible effect,
  scope, accessible effect labels and no card overflow.

## Verification

- `vitest run --configLoader runner src/game/ui/__tests__/cardText.test.ts`: 7/7 pass.
- `tsc --noEmit`: pass.
- `git diff --check`: pass.
- Browser/layout checks and repository `check.sh` remain with the coordinator.
  No web build run in this worker; initial disk exhaustion prevented writes,
  then disk recovery allowed implementation and focused checks.
- No signature-sheet, progression, dependency or cloud changes; no merge or ship.

## Risk

The added scope line must pass the expanded phone layout tests before integration.
No smaller type or layout switch was introduced without browser evidence.
