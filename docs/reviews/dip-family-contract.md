# Dip families and roti tags: inventory and smallest contract

**Scope:** read-only preparation for the first post-Kitchen build slice. The direction is exploratory; this note separates shipped behavior from a proposal. It does not define balance values or future simmer/quality mechanics.

## Existing facts

The current executable content has 12 base rotis plus 8 evolutions and ten dips. `BreadDef` has motion, target, levels, unlock and optional evolution metadata; it has no tag field. `DipDef` has identity, display/art fields, five `HitEffect` levels and unlock; it has no family, matching tags or stat-line fields ([types](../../src/core/types.ts#L103), [types](../../src/core/types.ts#L130)). The roti tags in `docs/BUILDS.md` are therefore design vocabulary only, not runtime data. The document lists `Thrown`, `Lob`, `Bounce`, `Area`, `Pierce`, `Heat`, `Stuffed`, `Sweet`, `Crisp`, `Orbit`; its examples also use “volley” and “fast,” which are not in that canonical list ([BUILDS](../BUILDS.md#L14)). A first contract should settle whether those two are descriptive traits or actual tags.

The existing dip IDs and effects are:

| Current ID | Current effect (from `src/content/dips.ts`) | Family reference in `BUILDS.md` |
|---|---|---|
| `mint-chutney` | chill / slow / freeze | Chutneys |
| `fish-curry` | burn | Curries |
| `mutton-curry` | tender / knockback / increased damage taken | Curries |
| `chicken-curry` | stacking damage and crit | Curries (name match; proposed effect flavor differs from the future example) |
| `dhal` | heal on kill | Dhal |
| `sambal` | death blast | Sambar (family name appears in the design table) |
| `masala` | chain | Unassigned by name; its effect resembles the documented Sambar/Richness chain example |
| `condensed-milk` | sugar slow / stacking damage / crash stun | Special |
| `ghee` | timed spin buff | Special |
| `teh-tarik` | timed throw-speed buff | Special |

This is an inventory, not a claim that all future family stat flavors or minor skills exist. In particular, current `dhal` heals on kill (not the future table's heal-on-hit example), and `sambal` blasts on death (not the future fire-spread example). Keep `masala`'s family assignment explicit in the content decision; do not silently treat its name as Sambar.

Today, only `fish-curry`, `condensed-milk`, and `mint-chutney` can be linked. A link is assigned to the signature roti when the new dip card is offered or applied, up to two links; existing owned dips keep their existing target ([cards](../../src/core/cards.ts#L10), [cards](../../src/core/cards.ts#L12), [cards](../../src/core/cards.ts#L67)). On hit, a linked dip's entire hit effect is skipped for every other roti; on its linked roti it applies. Its burn/sugar/chill values get a 25% adjustment. Unlinked dips apply their effect on every roti hit ([hit](../../src/core/sim/hit.ts#L59)). There are no dip stat lines today, so current links do not implement “wrong tags give stats only.” This link behavior is based on roti identity, not tags. Kitchen repeats the same three-dip link allowlist and two-link cap ([kitchen](../../src/core/kitchen.ts#L8), [kitchen](../../src/core/kitchen.ts#L75)). Existing signature bias is a separate hard-coded offer weighting in `cards.ts`; it is not a compatibility check.

Dips are run state (`OwnedDip`: id, level, optional `linkedBread`) rather than part of the persistent `SaveV2` schema. The persistent save stores unlocked dip IDs, not owned dip instances or links ([types](../../src/core/types.ts#L340), [meta types](../../src/meta/types.ts#L35)). The V1/V2 reader accepts both save versions and filters unlocked dip IDs through current content ([migrate](../../src/meta/migrate.ts#L42)). Thus the first family/tag slice need not bump save version or migrate links. Keep existing dip IDs stable and make new content metadata additive with defaults; if a future migration ever persists equipped dips, that is a separate contract.

## Smallest proposed shippable slice

Add data-only `RotiTag` and `DipFamily` unions and optional `tags` on roti definitions / `family` on dip definitions, then fill the current content rows from an explicit reviewed mapping. Use only the ten canonical tags until “volley” and “fast” are deliberately promoted. Use the five documented family buckets (Chutneys, Curries, Dhal, Sambar, Specials); resolve `masala`'s family in that mapping rather than deriving it from mechanics. Do not add new dips, assets, stat lines, levels, quality, spice, tiers or balance changes in this slice.

Put the compatibility rule in the pure domain/core layer shared by real runs and Kitchen: a dip declares one or more compatible tags, and a link bonus is eligible when at least one declared tag appears on the target roti. A nonmatching dip keeps its ordinary stats; the tag check affects only the link bonus. The high-level direction says matching tags gate the link bonus ([BUILDS](../BUILDS.md#L30), [order](../BUILDS.md#L46)); it does not define whether a mismatch removes the link entirely or merely removes the bonus. Since current linked effects are already gated to a single roti and there are no stat lines, preserve today's identity-targeted behavior as the default mapping, then add tag-based eligibility only for newly declared link metadata. Avoid silently turning a formerly link-only effect into a global effect.

For a minimal first playable slice, declare tags and compatibility for the current three linkable dips only; preserve their existing signature-roti target and effect behavior while requiring a matching tag for any newly granted link bonus. Expand linkability after the player can inspect and test the contract. This avoids changing the old `LINKABLE_DIPS` behavior before a content mapping is settled. If the owner intends “only matching tags get the link bonus” to apply immediately to those three current links, the next implementation needs an explicit compatibility mapping and should retain the current link target as run data.

Implementation ownership likely touches `src/core/types.ts`, `src/content/breads.ts`, `src/content/dips.ts`, `src/core/cards.ts`, `src/core/sim/hit.ts`, and `src/core/kitchen.ts`; factor the compatibility predicate into a small pure core helper shared by offer/apply, hit resolution, and Kitchen validation rather than duplicating checks. Update `docs/CONTENT.md` only if its data tables are intended to expose the new tags/families. Focused tests should cover: exact current content mappings and valid tag/family values; matched and mismatched link effects (including evolved-roti base identity); old/unlinked dips keeping global behavior; legacy save V1/V2 unlocked IDs round-tripping without a version bump; Kitchen accepting the same compatible links as a real run. Likely test homes are `src/content/__tests__/content.test.ts`, `src/core/__tests__/signature.test.ts` or a focused new compatibility test, `src/core/__tests__/kitchen.test.ts`, and a focused save migration test (the existing migration suite is `src/meta/__tests__/idle-streak-migrate.test.ts`; add dip-specific coverage there or beside it).
