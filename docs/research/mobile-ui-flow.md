# Mobile game UI flow: launch, hub, results, panels, motion, onboarding

Date: 2026-10-15. Brief: Prata Raja is portrait mobile (walkable hub with stations, free-move run, results, back to hub; ARPG gear, dips, spec tree, pre-run meal). Method: 6 web searches and 4 fetches in one pass, plus repo raw data (checked: `docs/research/data/*` holds no UI-flow data). Search quality was poor for game-specific UI: most game rows are "not found" or come from a single review or forum thread. Generic framework and platform numbers are labelled as such. Verify before adopting any figure. Complements [readability-refs.md](readability-refs.md) (hub readability, thumb zone, touch targets), [hub-design.md](hub-design.md) and [teardown-habby.md](teardown-habby.md), which are not repeated here.

## 1. Screen flow

| Game | Pattern | Numbers | Source |
|---|---|---|---|
| Archero 2 | Home screen fills up as the player clears stages. Early stages show few features; stage 9 is "much richer" | Feature count rises with stage, no tap counts | https://someselectedstories.substack.com/p/tiny-teardown-archero-2-habby-games |
| Archero 2 | Menus driven by red notification dots: a beginner guide says to click each item with a red alert until alerts clear (purchase-gated ones excepted). A review calls the home screen crowded | Count not given | https://www.highgroundgaming.com/?p=139917 ; https://www.androidauthority.com/archero-2-3517511/ |
| Archero 2 | Level flow after entry: roulette reward spin, then a blessing choice, then angel (2 options), devil (1 option, costs max HP), valkyrie (grants one blessing) | Five steps in-run, no timings | https://someselectedstories.substack.com/p/tiny-teardown-archero-2-habby-games |
| Brawl Stars | Home hub with the selected brawler and a large bold yellow Play button; a 2025 critique says opening a brawler's details takes too many taps (catalogue then scroll), proposes tapping the brawler on home to open details directly | Play is one tap from home; details path is 2+ taps (critique) | https://ixd.prattsi.org/2025/02/design-critique-brawl-stars/ |
| Survivor-likes (Vampire Survivors) | Level-up choice is the only decision screen during a run; the run needs one stick and one confirm button; players call the choice easy to hit by accident, and the dev slowed its appearance | "Slowed" (no ms given) | https://www.gamesasylum.com/2022/11/25/vampire-survivors-review/ ; https://itch.io/post/14876746 |
| Vampire Survivors-likes | Results/stats screen overflowed past 6 weapons+accessories; a reporter suggests scaling text or adding scroll | Overflow at 6+ items | https://steamcommunity.com/app/1794680/discussions/0/4634862623030102973 |
| Dave the Diver | Patch made vertical menu navigation easier and simplified QTEs to one press; a bug showed all restaurant panels (menu, research, ingredients, hiring) overlapping at once | Not numbered | https://www.gameswelt.de/dave-the-diver/news/neues-update-gestaltet-den-indie-hit-zugaenglicher-321849 ; https://steamcommunity.com/app/1868140/discussions/0/3805028278538664855 |
| Survivor.io, Cookie Run Kingdom, Hades, Soul Knight, Capybara Go, Pocket Rogues | Searched; no sourced screen-flow teardown found | not found | n/a |

## 2. Hierarchy: type, button tiers, placement, badges

| Game or source | Pattern | Numbers | Source |
|---|---|---|---|
| Archero 2 (Habby) | Top bar holds the big feature (battle pass, 28-day season); side entries for privilege card (daily gift of 20 gems), tasks, mailbox, events, shop | Pass tiers $9.99 / $29.99 | https://someselectedstories.substack.com/p/tiny-teardown-archero-2-habby-games |
| Brawl Stars | One dominant primary (yellow Play) on a home hub | Size not given | https://ixd.prattsi.org/2025/02/design-critique-brawl-stars/ |
| Menu design (indie guide) | Keep menus under 6 or 7 items; group related items (Settings, Controls, Audio under Options); Continue at top, Exit at bottom; keep most-clicked items visible and move the rest into subcategories | "Fewer than 6 or 7" (author opinion, not measured) | https://indieklem.substack.com/p/9-creating-an-intuitive-in-game-menu |
| Generic mobile UX | Badges top-right of the icon; dot for "something new", count for countable unread; never mix dot and count on one nav bar; cap as "99+"; design the longest string first | Placement and "99+" are convention | https://uxcel.com/lessons/notifications-best-practices-164 ; https://www.eleken.co/blog-posts/badge-ui-design |
| Generic mobile UX | Badges only for actionable unseen items; a count should not include scores or stats | Rule | same as above |
| Thumb zone and targets | Primary actions in the bottom 30-40%; 44 pt iOS / 48 dp Android | see [readability-refs.md](readability-refs.md) | https://parachutedesign.ca/blog/thumb-zone-ux/ |
| Type scale in pt | No sourced game type scale found. Use the repo's `src/ui/theme.ts` as the baseline | not found | n/a |

Tab bar vs hub: no sourced evidence that top games use a persistent tab bar. Brawl Stars and Archero 2 both use a home hub with a single Play entry and side or top entries.

## 3. Panels: sheets, depth, back and close, confirms

| Source | Pattern | Numbers | Source |
|---|---|---|---|
| Apple HIG (alerts) | Use an alert to confirm or cancel a destructive action; if there are several choices, use an action sheet instead. Always include Cancel next to a destructive option; avoid a default button so people read the alert before pressing | Rule | https://developer-rno.apple.com/design/human-interface-guidelines/components/presentation/alerts (via search summary, verify) |
| Apple HIG (alerts) | A deliberately chosen destructive action (e.g. Empty Trash) does not get destructive styling on the confirm button | Rule | same |
| Escape and back | Esc or Cmd-. cancels an alert on Apple platforms; Android back should close the top panel first | Rule | same |
| Menu convention | Opening the menu is the expected way to pause; deviating frustrates players. Use animation to confirm an input was registered | Qualitative | https://indieklem.substack.com/p/9-creating-an-intuitive-in-game-menu |
| Depth limit | No sourced game number for panel depth. Working rule: one panel open at a time, back closes one level | not found | n/a |
| Sheets (detents) | Apple sheet detent docs not reached in this pass | not found | n/a |

## 4. Motion: durations, easing, reward choreography

| Source | Pattern | Numbers | Source |
|---|---|---|---|
| Framework default popup | Default open/close 300 ms; example override 150 ms; default easing is linear (MAUI), so override it | 300 ms, 150 ms | https://docs.telerik.com/devtools/maui/controls/popup/animations (framework default, not a game) |
| web.dev easing | Ease in/out 200-500 ms; bounce and elastic 800-1200 ms | Ranges | https://web.dev/articles/choosing-the-right-easing |
| Press pop | Hold press feedback at about 0.1-0.2 s; longer feels laggy | 100-200 ms | https://bugnet.io/blog/how-to-fix-ui-button-pop-easing-feels-stiff |
| Material 3 (community copy, check m3.material.io) | Short 50-200 ms; medium 250-400 ms; long 450-600 ms; standard decelerate (0,0,0,1) | Listed values | https://openskillindex.com/skills/intense-visions-harness-engineering-design-material-design-3-c65712 |
| Game reward reveal | No sourced game timings found. Archero 2 roulette reward spin is the only reveal seen | not found | https://someselectedstories.substack.com/p/tiny-teardown-archero-2-habby-games |

Working ranges for Prata Raja (my synthesis from the rows above, not a game measurement): panel open 220-280 ms ease-out; close 160-200 ms; press feedback 100-150 ms; reward reveal beats 300-600 ms each, skippable on tap.

## 5. Onboarding and progressive disclosure

| Source | Pattern | Numbers | Source |
|---|---|---|---|
| Archero 2 | Features unlock as stages clear; first-time offers and carnival events appear during onboarding | Stage-gated | https://someselectedstories.substack.com/p/tiny-teardown-archero-2-habby-games |
| Archero 2 | Red dots act as the guide to new content | Count not given | https://www.highgroundgaming.com/?p=139917 |
| Hand pointer (Pudding Monsters, cited in a UX article) | Animated hand shows the gesture when the player is idle; no text needed | Trigger on idle | https://uxplanet.org/mobile-onboarding-interact-don-t-tell-f0c35da2b2b4 |
| Tours | Do not block the interface; add a Help entry to replay; many players skip the first tour | Rule | https://uxplanet.org/design-patterns-progressive-disclosure-for-mobile-apps-f41001a293ba |
| Hidden features | Any masked feature needs a visible cue that it exists | Rule | same |
| Roblox onboarding (already in readability-refs) | Show a prompt 3-5 times, then stop | Unverified | see [readability-refs.md](readability-refs.md) |

## Prata Raja UI rules

1. Put Play on the hub as one big bottom-centre button; no other filled button on that screen.
2. Show features as stages clear; the hub starts with 3-4 stations and reveals the rest by progress.
3. Results screen: loot reveal in 2-3 beats, tap skips to the full recap; never make the player tap through more than 2 screens to return to the hub.
4. End every results screen with one "next goal" line and one route back to the hub (Continue at the bottom).
5. Keep any menu to 6-7 items; group the rest under Options.
6. Stations: one tap to open a panel; a stat or gear detail is at most one tap deeper.
7. Max one panel stacked; back or close always closes the top panel only.
8. Destructive actions (dismantle, sell gear, reset) use a dialog with a Cancel and no default button; deliberate confirms use the plain verb.
9. Red dot only for an unseen, actionable item; clear it on first view; never mix dot and count on one bar.
10. Badges sit top-right of the icon; count caps at "99+".
11. Panel open 220-280 ms ease-out, close 160-200 ms; no bounce curve on panels.
12. Press feedback 100-150 ms; any tap on a choice card waits about 300 ms before it accepts input (accidental-tap guard, from the level-up complaints).
13. Reward reveals skippable on tap; never block input for more than about 1 s.
14. One-time tips: a hand or arrow shown once per mechanic, dismissed by the action itself; never block the screen.
15. Keep a Help entry on the hub that replays any tip; add a search or filter only when a list passes about 20 items.

## Gaps and next steps

- No sourced numbers for Hades, Dave the Diver, Cookie Run Kingdom, Soul Knight or Capybara Go screens. A targeted pass could use Reddit or YouTube UI breakdowns (not fetched).
- Results and reveal timings need a frame-by-frame look at a recorded run, not a search.
- Type scale in pt for phone width needs a screenshot pass with `npm run snap`, not a web search.
