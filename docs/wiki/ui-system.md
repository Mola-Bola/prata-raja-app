# Game UI system (r8-uisys)

Status: built and applied everywhere in the game overlay: hub panels, spec, meal, workbench, free-run HUD, Tell Kannan sheet, and (r8-flow) `GameUi.css` (title, pause, results, level-up, tiffin choice), `Kitchen`, `Tune`, `Prologue`, `FeedbackNotes`, `Stall.css` leftovers, `RunBuild` (CSS info glyph, no emoji). Old `.gu-btn`/`.gu-chip`/`--fs-*` are gone; `.gu-pill` is the cream caption pill, `.rs-*` the results panel.
Last change: 15 Oct (r8-flow). Spec: [ui audit](../reviews/ui-audit-2026-10-15.md) section 4. Research used: [mobile-ui-flow](../research/mobile-ui-flow.md) (44 px targets, one primary per screen, sheet motion), [readability-refs](../research/readability-refs.md) (thumb zone, 13 px floor on busy art). Skipped on purpose: haptic and sound rules (separate system).

## Files
- `src/ui/brand.ts` `game` block: the overlay colours (cream, ink, muted, orange, red, red-text, edge, gold, glass).
- `src/ui/gameTokens.ts`: type scale, radii, spacing, motion, the contrast pair list. `gameTokenCss()` renders `src/game/ui/tokens.css` (generated; `UPDATE_TOKENS=1 npx vitest run src/ui/__tests__/gameTokens.test.ts` rewrites it, the test fails on drift).
- `src/game/ui/system.css` (+ `system.ts`, the side-effect import): tier classes, type classes, `.ic-*` control glyphs, sheet motion.
- `src/ui/__tests__/gameTokens.test.ts`: every game text/background pair (4.5:1; ink on orange 5.9, red text 5.7, cream on glass over white 8.1).

## Tokens (CSS vars on `.gu-root`)
| Type | px / font | Use |
|---|---|---|
| `--f-hero` | 30 Fredoka 700 | Start, results number, Tell Kannan heading |
| `--f-title` | 22 Fredoka 600 | sheet titles, level number |
| `--f-btn` | 18 Fredoka 600 | button labels, HUD numbers |
| `--f-body` | 15 Nunito 700 | everything readable |
| `--f-cap` | 13 Nunito 700 | captions, pills, tile names. Nothing smaller |

Radii `--r-s` 12 (cards, tiles), `--r-m` 18 (buttons, sheets), `--r-full` 999 (pills, circles; never `50%`). Spacing `--sp-1..5` = 4/8/12/16/24. Motion `--m-press` 90 ms, `--m-in` 220 ms with `--m-ease` cubic-bezier(.2,.8,.2,1), `--m-out` 140 ms; reduced motion = fades only. `--touch` 44.
Only exception to the five sizes: text inputs stay 16 px (iOS zooms the page on focus below 16).

## Button tiers (all 3 px edge, lip shadow, ink label, 44 px minimum)
- `u-go`: orange fill. One per screen or sheet footer (Learn, Cook, Enhance, Open chests). `u-wide` = full width.
- `u-plain`: cream fill, brown edge. Secondary (Back, Reroll, Undo, Story).
- `u-chip`: pill, 44 high, tabs/filters/toggles; selected (`aria-selected|pressed|checked` or `.is-on`) = orange.
- `u-round` (+ `--lg` 56): circle for close, Settings, Dodge; combine with `u-plain` or `u-go`. Dodge is `u-go u-round` (ink on orange).
- `u-link`: underlined text action (Reset all).
Never use Paper's Button/Chip/Dialog in the game overlay, never the old `.gu-btn`/`.gu-chip` in migrated files.

## Rules
- Panels: header (painted icon, `t-title`, one `u-plain u-round` x with `.ic-x`), body, sticky footer with the one go (hub GO docks there). No second title inside the body (`embedded`).
- Icons: painted atlas (`ASSET_URLS`: roomui/icon-*, hub/star, hub/settings, ui/lock, materials/*, dips/*) for things owned or done; CSS glyphs `.ic-x/.ic-back/.ic-check/.ic-info/.ic-lock` for controls. No emoji, no unicode shapes. Spec nodes: dot, diamond (CSS), keystone = painted star, legend row above the list.
- No hex in migrated CSS: use vars. State is never opacity-only (locked card = dashed + muted text).
- Colour in text: red words use `--red-text`, never `--red` (3.98:1).
