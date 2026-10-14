# Dip family and tag slice

Branch: `sol/dip-tags`; base `bb95823`; fleet ownership row 28.

Rotis now declare the ten canonical tag vocabulary values; all 12 base mappings follow the lead contract and evolutions inherit their base tags. Murtabak is Thrown/Stuffed because its current simulator travels straight. Naan and Garlic Naan are Lob/Area without an invented Heat mechanic. All ten dips declare a family; Masala remains Specials/Mixed.

Only Fish Curry, Condensed Milk and Mint Chutney have matching-tag metadata and can target a roti, with at most two links. Fish fits Lob/Heat/Stuffed; Milk fits Thrown/Orbit/Bounce/Sweet; Mint fits Thrown/Area/Crisp. Every current roti fits Mint; its mismatch guard is exercised with an explicitly untagged unit fixture, not presented as a current recipe.

A matching linked target receives the existing 25% effect adjustment. A mismatched Kitchen link keeps the ordinary target-only effect and says “No tag bonus”. Unlinked dips keep ordinary global effects. New run dip picks auto-link only to a fitting signature. Existing owned targets persist through upgrades/evolution. Linked Milk's rate cap and existing crowd-control behavior remain intact. Save schema/version, stat lines, tiers, minor skills, art and dependencies are untouched.

Kitchen selections display roti tags, dip family/flavour, compatible tags and the current bonus state. Level-up cards retain their original effect and scope beside compact family/fit/bonus text. Existing scope/effect assertion selectors remain unique. Existing gameplay assertions were preserved; only minimal simulator fixture metadata defaults were added to satisfy the stronger content type.

Verification:
- `SKIP_DB=1 LOGS=/tmp/prata-raja-dip-tags-check bash scripts/check.sh`: typecheck, lint, brand and all 881 then-current unit tests passed; local DB explicitly skipped.
- Additional linked-Milk mismatch cap test: focused dip contract suite 8/8 passed after the full suite started; final typecheck passed.
- `BALANCE_SEEDS=300 npx vitest run --configLoader runner src/core/__tests__/balance.test.ts`: all five balance tests passed in 156.37s, including enforced chapter/signature win-rate bands.
- Incremental web export and focused automated Playwright on unique port 9598: 5/5 passed (Kitchen tags/families/fit/bonus, new normal-card fit/bonus, existing Kitchen launch/build/save assertions, existing dip effect/scope/overflow assertions at 320 and 390 pixels).
- Initial browser run correctly caught new metadata overflowing the original fixed frame at 390px. Dip cards now size their frame to content with fixed padding. The old overflow assertion remains unchanged. The new normal-card test uses the existing hub seam without mutating phase (setting phase caused the simulation to overwrite its synthetic offer).
- No manual localhost CUA used. CI inspection is recorded with the branch result after push.

No publishing or shipping performed.
