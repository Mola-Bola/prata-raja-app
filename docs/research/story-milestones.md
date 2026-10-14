# Story at milestones: research and Prata Raja draft (14 Oct)

Cheap pass: WebSearch standard + two WebFetches. Sources are wikis, guides and blogs; confidence noted per item. Gaps listed at the end.

## Patterns

1. **Regular customer returns at milestones, with a line and a gift.** Stardew Valley hearts: dialogue warms, heart events fire, gifts arrive by mail as friendship rises. ([Stardew wiki, Heart](https://stardewvalleywiki.com/Heart), [gift list](https://wiki.stardewvalley.net/Gifts)). High confidence.
2. **Gift-for-bond, bond returns an item.** Hades: first Nectar given to a character returns a Keepsake; later gifts raise affinity and open dialogue. ([RPG Site Nectar guide](https://rpgsite.net/feature/10266-hades-nectar-guide-who-to-give-nectar-to-for-keepsakes)). Medium; sources mix Hades 1 and 2.
3. **Keepsake grows with use.** Equip a Keepsake for a set number of encounters to rank it up (25, then 50 more). ([Keepsake guide](https://gamersdecide.dev.weebpal.com/articles/hades-best-keepsakes-to-upgrade)). Low: weak source, verify in game.
4. **Locked bond becomes a task.** Past a threshold the heart is swapped for a quest or boss condition. Mentioned in Hades guides. Low confidence, uncited specifics.
5. **Milestone menu with one named perk-like choice.** Slay the Spire's Neow offers a fixed four-slot menu after the first boss: card option, reward, trade-off (drawback plus bigger reward), boss swap. Gated: miss the boss and you only get two options. ([Neow wiki, fetched](https://slaythespire.wiki.gg/wiki/Neow)). High confidence.
6. **Faction tiers unlock a reward plus a quest.** Grim Dawn: reaching Friendly unlocks the first reward tier and usually a quest; Revered unlocks a special quest and top gear. ([Grim Dawn factions](https://www.grimdawn.com/guide/character/factions/)). High confidence.
7. **Boss kill carries a story beat and a choice.** Last Epoch: each timeline ends with a boss kill that grants a permanent blessing pick; story quests grant passive points. ([Last Epoch support, Monolith of Fate](https://support.lastepoch.com/hc/en-us/articles/46361839099931-What-is-the-Monolith-of-Fate)). Medium.
8. **Secret character found by playing, not by a cutscene.** Dead Cells: Return to Castlevania's Richter needs several runs, then a cage interaction opens a playable biome. ([Prima Games](https://primagames.com/tips/how-to-unlock-richter-mode-in-dead-cells-return-to-castlevania)). Medium.
9. **Customers arrive daily, and sales have consequences.** Potion Craft: customers with problems visit each day; what you sell them shapes town reputation. ([Hackernoon overview](https://sia.hackernoon.com/a-look-at-potion-craft-an-alchemist-simulator)). Medium.
10. **Hub contractor sells progress, not story.** Hades' House Contractor builds House projects; story stays in conversations. ([Prima Games](https://primagames.com/gaming/hades-guide-house-of-hades-house-contractor-upgrades/2)). Medium. Supports keeping perks mechanical and story as flavour.

Pattern 5 and 1 fit us best: a short menu or a regular, one line, one gift, and the perk named in the line.

## Prata Raja draft

Design rule: each row is data. `perk` points at a `PERKS` level in `src/meta/kannan.ts` (the perk itself is never restated in the line), so lines and perks swap freely. The `beat` column is a proposed `BEATS` key (`src/meta/story.ts`), not wired yet. Owner's WORLD.md regulars and the wake-up uncle are reused.

| Lv | perk (PERKS key) | Who appears | Beat id (proposed) | Line 1 | Line 2 | Gift (flavour only) |
|---|---|---|---|---|---|---|
| 5 | `level: 5` (+1 reroll) | Auntie Siew Lan, the 6 a.m. regular | `milestone-5-regular` | "Eh, first one burn? Just ask again lor, like ordering teh-o." | "Don't say I never give you chance, one more shot for my usual." | 1 sambal sachet |
| 10 | `level: 10` (+5% max HP) | Uncle Ah Seng, the one who shook him awake | `milestone-10-uncle` | "Steady boy, the queue can wait, your own body must eat first." | "Walao, you grow bigger already? Keep eating lah." | 1 teh tarik cup |
| 15 | `level: 15` (+3% dmg) | Grade Inspector, clipboard spirit (teaser) | `milestone-15-grade` | "Hygiene check? Your tawa sizzling like that, cannot fail one." | "Don't worry, I come back next week with my sign, ha." | a grade sticker (cosmetic) |
| 20 | `level: 20` (+5% max HP) | Ah Beng, night-shift cook (chapter 2 teaser) | `milestone-20-night` | "Tonight the neon all turn on, you ready or not?" | "Sia, your prata got fire, I borrow one for the night shift." | 1 chilli padi sachet |
| 25 | `level: 25` (+3% dmg) | Stall regulars, chorus | `milestone-25-raja` | "Raja! Raja! Two kosong, one tissue!" | "Not my stall? Now is your stall, boy." | a golden tawa sticker (cosmetic) |

Notes:
- Lv25 line 2 calls back to the prologue ("Not my stall"); keep callbacks rare.
- Each row is one panel or caption card, not a cutscene. Skip button always visible.
- `PERKS` labels read "+5% max HP" but the stat is `maxHp: 5` (flat). Owner to confirm wording before lines are final.

## Gaps

- Moonlighter, Recipe for Disaster, Battle Chef Brigade, Cooking Simulator: nothing usable found.
- Stardew mail list: fetch returned 403; per-heart letter list not verified.
- Hades exact dialogue thresholds: not found.
- Cult of the Lamb follower progression: only low-quality sources ([PC Invasion](https://www.pcinvasion.com/?p=328555)).

Next cheap step if wanted: one extended search on Stardew mail by heart level, and one on Battle Chef Brigade customer progression.
