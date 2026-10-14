# Readability and feel: how good games solve it

Date: 2026-10-15. Owner brief: the hub feels clunky, messy and hard to read; in-run choices and the top-down view need the same work. Method: web search and fetch only. Most game-specific figures come from wikis, reviews, devlogs or player comments, so verify before adopting one. "Not found" means no sourced answer; treat those cells as open. Complements [game-feel.md](game-feel.md) and [hub-design.md](hub-design.md), which are not repeated here.

## 1. Hub and station readability

| Game | Technique | Number / evidence | Source |
|---|---|---|---|
| Soul Knight | Shop sits behind an NPC (Lucky Cat) plus a small top-right corner option; needs internet | Path is NPC, then menu, then corner button. Guide is 4+ years old | https://www.touchtapplay.com/where-is-the-lucky-cat-shop-in-soul-knight/ |
| Hades | Third-party HUD analyses: contrast, colour and silhouette keep the action readable; HUD hides extra boons | No station or prompt numbers found | https://tech4gamers.com/game-dev-students-should-analyze-hades-for-design-lessons/ ; https://medium.com/@bramhadalvi/hud-redesign-fdc332d05291 |
| Moonlighter | Town NPCs unlock through a noticeboard after saving cash; reviews list five unlockable NPCs | Five NPCs (Blacksmith, Potion, Rare Items, Bank, Accessories); no layout numbers | https://rpgamer.com/review/moonlighter-review/ |
| Stardew Valley | Player critique: NPC indicator draws too much attention and is detached from the dialogue; meaning learned only after first use | Qualitative (Steam thread) | https://steamcommunity.com/app/413150/discussions/0/405693392920123329 |
| Cult of the Lamb | Hold-to-interact friction; developers added a toggle; some holds remain (user-reported) | Qualitative | https://steamcommunity.com/app/1313140/discussions/0/3416557114765491263 |
| Dave the Diver, Archero 2 | Searches returned only generic pages | Not found | n/a |
| Generic onboarding guidance | Show a proximity prompt only when near; show it for the first 3-5 uses then stop; never interrupt play; show over tell | "3-5 times" is an unverified rule of thumb (search summary did not capture the exact page) | https://create.roblox.com/docs/en-us/production/game-design/onboarding-techniques |
| Generic game UI pack | Prompt glyphs swap to the detected device and re-detect on switch; hover-only prompts fail on touch | Target 44-48 px; 5% safe-area inset | https://cdn.jsdelivr.net/npm/@hegemonart/get-design-done@1.60.4/reference/domains/gaming-patterns.md |
| All six games | Stations visible at once, grid and symmetry, distances between stations, prompt trigger radius, fade timing | Not found in any sourced page | n/a |

## 2. In-run choices on mobile

| Game | Technique | Number / evidence | Source |
|---|---|---|---|
| Vampire Survivors | Level-up choices are few, so chests (several upgrades at once) are valued | "Limited choices" (no count) | https://www.pocketgamer.com/vampire-survivors/review |
| Vampire Survivors | Magnet sets pickup radius for gems and other pickups; chests added in a May 2026 fix | Base 30; rank 1 x1.25; rank 2 x1.5625 (multiplicative) | https://vampire.survivors.wiki/w/Magnet |
| Vampire Survivors (mobile) | Touch joystick less responsive than a physical stick; pause freezes player input (player reviews) | Qualitative | https://www.commonsensemedia.org/app-reviews/vampire-survivors ; https://backloggd.com/u/lance4dragons/likes/ |
| Survivor.io | Magnet collects every crystal on the map, not just nearby; save it for high-crystal moments | Qualitative; no radius found | https://www.bluestacks.com/blog/game-guides/survivor-io/sio-tips-tricks-en.html |
| Survivor.io | Elite chest shows an on-screen pointer to its location; grants 1 upgrade, sometimes 3 | 1 or 3 upgrades | https://www.pocketgamer.com/survivor-io/guide/ |
| Archero 2 | Level-up offers at least 3 skills; crystals picked up at wave end in arena mode, instantly in survivors mode | "At least 3" | https://progameguides.com/archero-2/archero-2-beginners-guide/ |
| Brotato | Level-up choices reroll for materials. 2022 Steam request: 0.3 s delay before a reroll (stops double-roll), countdown on unpause. Implementation unverified | 0.3 s (request only) | https://steamcommunity.com/app/1942280/discussions/0/3714937078846288074 |
| Brotato | "Ban" is a shop feature (up to 8 items), not a level-up feature | Per New Dawn notes | same thread and patch notes |
| All | Pause policy, time windows, current-vs-offered comparison, card size, tap targets in mobile ports | Not found | n/a |

## 3. Top-down readability on portrait phones

| Game / source | Technique | Number / evidence | Source |
|---|---|---|---|
| Neverwinter (MMO) | Floating combat text: sans-serif, less noise, smaller, narrower spawn zones; size still scales with hit strength | Numbers cut 23-50% | https://forum.arcgames.com/Neverwinter/roletracker/jump/1266779 |
| Castle Survivor (VS-style prototype) | Numbers smaller, muted, fade faster after a Diablo 4 reference; big bright long-lived numbers pulled focus | Qualitative | https://indieben.itch.io/castle-survivor/devlog/661003/improved-some-animations-and-visual-effects |
| VS-style players | Once the screen fills, hard to tell which enemies are hit; fading enemies hard to see (suggest outline); dead enemies linger | Qualitative | https://itch.io/post/6177373 ; https://itch.io/post/12264213 |
| VS-style reviewer | Pickups hard to tell apart from enemies; suggests a clashing palette | Qualitative | https://itch.io/post/6469507 |
| Survival game patch | Enemy projectiles and area effects in one high-contrast warm palette, with shapes and borders | No numbers | https://steamdb.info/patchnotes/10859022 |
| Thumb zones (Hoober, via Parachute Design) | Easy zone bottom-centre (about bottom 30-40%); primary items in lower 40-50%; hard zone top corners; zones shift with size and hand | 30-40%, 40-50%, about 75% of touches by thumb (secondary figure) | https://parachutedesign.ca/blog/thumb-zone-ux/ |
| Touch target minimums | iOS 44 pt; Android 48 dp; WCAG 2.2 AA 24 px floor | 44 / 48 / 24 | https://adrianroselli.com/2019/06/target-size-and-2-5-5.html |
| Font size (bad example) | Accessibility database: much Cult of the Lamb text under 1/20 of screen height; colour emphasis loses contrast | 1/20 screen height | https://www.familygamingdatabase.com/accessibility/Cult+Of+The+Lamb |
| Contrast ratio, outline widths, drop-shadow offsets, HUD font px | Not found in sourced game pages. Repo already contrast-tests text pairings (CLAUDE.md, src/ui/brand.ts) | n/a | n/a |

## 4. Juice and fluidity for walking characters

| Technique | Number / evidence | Source |
|---|---|---|
| Hit stop, heavy hits | 50-100 ms (3-6 frames at 60 fps, our arithmetic) | https://www.wayline.io/learn/game-feel/1 |
| Hit stop, blog guidance | 0.05-0.1 s works best; longer reads as lag; freeze only the animation, not the world | https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/ |
| Hit stop, community tutorial | Light 0.04-0.08 s; heavy 0.10-0.18 s (not a published game value) | https://forum.godotengine.org/t/tutorial-hit-stop-and-screen-shake-in-godot-4-autoload-trauma-camera-mit/145240 |
| Hit stop and shake ranking | "19 features, hit stop top 3" (IEEE 2022) seen only through blog summaries, unverified | https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/ |
| Screen shake | Keep small; big shake nauseates; no magnitudes found | https://www.wayline.io/learn/game-feel/1 |
| Nuclear Throne (Vlambeer dev) | 30 fps, 320x240; bullet 16 px per frame; 0-4 degree spread; camera kick 6 px; +4 to shake | Nijman, Rock Paper Shotgun interview (URL not captured) |
| Walk cycle length | 8 drawings held on twos at 12 fps (loop about 1.33 s); small sprites 4-6 drawings; 4 on fours at 12 fps | https://org.osu.edu/gamedev/?p=16737 ; https://www.sprite-ai.art/blog/sprite-animation-frames |
| Animation frame rate | 8-12 fps common for pixel art; 12 fps widely used | https://divoom.com/blogs/setup-ideas/pixel-art-animation-frame-rate |
| Foot skating | Tie cycle playback to measured speed; blend two cycles near target speed | https://discourse.panda3d.org/t/how-to-stop-skating-of-a-walk-cycle/5569 |
| Camera follow (frame-rate independent) | value = lerp(target, value, exp2(-rate * dt)); rate 1.0 covers half the gap per second; old per-frame coefficient c at 60 fps becomes rate = -60 * log2(1 - c) | https://www.gamedeveloper.com/programming/improved-lerp-smoothing- |
| Camera dead zone, soft zone, damping | Dead zone: no camera move; soft zone: camera corrects; damping = heavy-camera lag, per axis; lookahead smoothing trades lag for jitter | https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachinePositionComposer.html |
| Footstep dust, easing durations, squash percentages | Not found | n/a |

## Top 12 rules for Prata Raja

1. Give every hub station a permanent icon and a one- or two-word sign visible from the default hub view; never make the player find an NPC first.
2. Show one interact prompt at a time, anchored above the station, only inside its zone; retire it after 3-5 uses (test the number).
3. Fit each hub view on one portrait screen with no scroll; count labelled stations in the snap check and set a ceiling by playtest.
4. Lock level-up card input for 0.3 s after it opens so an accidental tap cannot pick or reroll.
5. Show current value and offered value side by side with the delta on each choice card (design judgement, no source).
6. Auto-collect pickups inside a radius that grows x1.25 per rank (Magnet base 30, then x1.25, then x1.5625), tuned to tile size.
7. Give enemies a dark outline or drop shadow, and give pickups a hue outside the enemy palette.
8. Cap damage numbers at one per hit and a small on-screen count; shrink them from the first draft (Neverwinter cut 23-50%) and mute the colour.
9. Fade dead enemies out quickly so they do not compete with live ones (player feedback; set the time by playtest).
10. Put primary buttons in the bottom 30-40% of the portrait screen, centred; keep the top corners for read-only info; 44 pt / 48 dp hit areas, padded beyond small icons.
11. Drive the camera with exp2(-rate * dt) lerp plus a dead zone for small moves, and keep lookahead modest.
12. Use hit stop only on heavy hits at 50-100 ms; drive walk-cycle playback from measured speed; use 6-8 drawings at 12 fps on twos.

## Open gaps

- Layout counts, distances and prompt trigger radius for Hades, Dave the Diver, Moonlighter, Soul Knight and Stardew: no sourced numbers. A developer talk or postmortem would be the next source.
- Survivor.io and Archero 2 pickup radii, mobile level-up card layout and pause policy: not found.
- Footstep dust, easing durations and screen-shake magnitudes: not found.
- Several figures are second-hand (blogs, wikis, player comments). Re-check before shipping a value.
