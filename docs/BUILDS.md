# Builds: rotis are weapons, dips are gems (owner direction, 13 Oct 2026)

**Exploratory, not firm.** The owner wants to *feel* this playstyle first and steer in-line; everything below is a starting hypothesis to prototype, play and reshape. Broad picture, not a spec. Sessions own the details: fill gaps, expand, prototype, tune with the bot, ship in slices. Supersedes the build parts of `docs/DEPTH.md` where they differ (DEPTH stays as background research and examples). Never pay-to-win: every power is earned by playing.

## 1. The three layers
| Layer | PoE analogue | Prata Raja | Lives |
|---|---|---|---|
| **Roti** (main weapon) | skill gem / weapon | what Kannan throws; defines the build | persistent signature + in-run picks |
| **Dip** (support gem) | support gem, tiered | sits in a katori (bowl) linked to one roti; adds a minor skill + stats | persistent collection, levels with use |
| **Gear + drinks** | items + flasks | apron, headband, towel, gloves, slippers, tawa, ladle, tiffin; drinks as flasks | persistent, enhanced in the stall |

In-run level-up cards stay: they offer rotis, dips and passives that **lean toward the equipped build** (already started in 0.4.0).

## 2. Rotis: main weapons, major builds
- Each roti has a **base attack** (straight, lob, bounce, sweep, orbit, pierce…) and **tags** that decide which dips fit: `Thrown`, `Lob`, `Bounce`, `Area`, `Pierce`, `Heat`, `Stuffed`, `Sweet`, `Crisp`, `Orbit`.
  Examples: Kosong (Thrown, Crisp) · Tissue (Thrown, Pierce, Crisp) · Telur (Thrown, Stuffed) · Murtabak (Lob, Stuffed, Area) · Roti Bomb (Lob, Area, Heat) · Thosai (Area, Crisp sweep) · Appam (Bounce) · Naan / Garlic Naan (Lob, Heat) · Idli (Thrown, volley) · Vadai (Orbit, Crisp) · Chapati (Thrown, fast).
- A roti has **katori slots** (1 at start → up to 4–6 late), unlocked by stall level, gear (the **thali tray** item) and roti mastery. Linked katori = PoE links.
- **Roti mastery** per roti: using it levels its own small tree (3–5 picks: e.g. Murtabak "extra filling" / "double fold" / "last order"), so every main weapon has its own build identity. Evolutions (already in game) stay the in-run payoff.

## 3. Dips as gems
Four families, each with its own stat type and flavour of minor skill:
| Family | Stat type ("flavour") | Feel | Examples (minor skill) |
|---|---|---|---|
| **Chutneys** | **Tang**: crit, speed, precision | sharp, quick | Mint (chill → freeze), Coconut (cool: slow + small shield), Tamarind (sour mark: next hit crits), Tomato (tangy splash on crit), Coriander (fresh: +throw speed after kills) |
| **Curries** | **Spice**: damage over time, burn, armour shred | heavy, lingering | Fish Curry (burn), Mutton (tender: damage taken up), Chicken (crushing stun), Fish-head (big burn pool on kill), Rendang (slow-cooked: DoT grows the longer it ticks) |
| **Dhal** | **Comfort**: sustain, shields, recovery | warm, safe | Dhal (heal on hit), Dhal Makhani (shield on kill), Parippu (regen while still) |
| **Sambar** | **Richness**: area, spread, chain, more projectiles | splashy | Sambar (splash), Rasam (chain to nearby), Kuah (pool on landing), Sambal (fire spread) |
| Specials | mixed | rare | Condensed Milk (sticky → sugar crash stun), Ghee (bounce/shine), Teh Tarik foam (pierce) |

- **Minor skill**: every dip does one small thing of its own (a mark, a splash, a pool, a heal), plus **stat lines** of its flavour. Linked to a roti with matching tags it is stronger ("Linked to Murtabak"); on the wrong tags it gives only its stats.
- **Tiers (like gem level + quality):** dips **simmer** (level 1–20, XP from runs where they were linked) and **age overnight** (quality 0–20%: "curry tastes better the next day"; from ingredients/time). Rarity: House → Special → **Legendary** (named family recipes, e.g. "Ah Ma's Fish Head Curry", rule-changing like PoE awakened/unique gems).
- **Spice levels** (alt quality): Mild / Pedas / Extra Pedas shift the dip's balance (more damage, less sustain), chosen in the stall.
- **Trigger dips** (late, PoE cast-on-crit analogue): "Kuah Splash: when a linked roti crits, splash curry". Caps and cooldowns so phones stay readable.
- **Set meals** (combos): specific roti + dip pairs that name a build ("Fish Head Combo") and give a small bonus, discoverable in the recipe book.

## 4. Equipment and enhancements, in theme
- Slots: apron (body), headband (head), towel (shoulder), gloves, slippers (feet), **tawa** (off-hand, heat), **ladle** (off-hand alt), **tiffin** (drink holder), **thali tray** (katori sockets).
- Affixes hawker-named (prefix "Uncle Lim's", suffix "of the Night Market"); rolls follow `docs/research/decomp-mechanisms.md` (item level window, seed-stored items).
- **Enhancement paths** (no paid shortcuts, no destroy-on-fail):
  - **Seasoning** the tawa/ladle: cast-iron layers +1…+15 (MapleStory star force feel, but safe: worst case a layer doesn't take).
  - **Stitching / patching** cloth gear: re-roll one affix with an ingredient (PoE crafting bench feel).
  - **Hawker sets**: Mamak set (headband + towel + apron), Night Market set, Kopitiam set, with 2/3-piece bonuses.
  - **Uniques**: rule-changers with costs, e.g. "Ah Ma's Tawa: breads cook twice as fast but scorch (burn yourself a little)".
- **Drinks = flasks** in the tiffin: Teh Tarik (haste), Kopi O (crit), Bandung (heal), Milo Dinosaur (shield), Sirap Bandung, Limau (cleanse); charges refill from kills; drink uniques later.

## 5. Order (broad, sessions refine)
0. **Test Kitchen first (malleable base):** a sandbox mode reachable from the stall (and `?kitchen=1` on web) where the owner can pick any roti, put any dips in its katori at any tier/spice, add gear/drinks, choose a wave or boss, and tweak key numbers live, all data-driven so a new roti/dip/rule is a content row, not a code change. Polish the base feel while building it. Use it to try ideas before they become progression; nothing here is earned or saved to the real save.
1. Dip families + tags + "only matching tags get the link bonus" (data + rules; existing links become the first katori).
2. Dip tiers: simmer levels + overnight quality + collection screen in the stall.
3. Katori slots (2 → 3) and the thali tray; roti mastery mini-trees for 3 rotis (Murtabak, Roti Bomb, Appam first).
4. Gear seasoning + stitching; first hawker set.
5. Drinks in the tiffin; legendary dips and trigger dips; set meals.
Each step: contracts first, bot balance (300 seeds), phone-readable UI, kid-friendly surface with depth behind it.

## 6. Crisp & Soak axes (owner, 14 Oct; DIRECTION.md "Crispy vs soggy")
Two named, real stats. Crispy builds crit; soggy builds splash. Hybrids are first-class.
- **Crisp** = crit chance + crit damage (existing `critChance`/`critMult`). Crits show golden sparks and a "CRISP!" number. Crisp builds trade status potency (Crisp Edges costs -5% DoT per level).
- **Soak** (`soak`, new) = share of a hit's damage, plus the dip statuses it applied (burn, sugar, chill, tender), splashed to every other foe within 90 units of the target (x `1 + sizePct`). Splash never re-splashes and never touches shields. Shown as a curry-coloured ring (skipped with reduced motion).
- Hybrid hooks: **Crackling Curry** (`critSplash`: crits splash extra) and **Twice-Fried** (`splashCrit`: splash hits roll to crit).

| Source | Crisp | Soak |
|---|---|---|
| Roti tag | `crisp` rotis +5% crit | `soggy` rotis (Murtabak, Egg Telur) +15% soak |
| Dips | chutneys/Ghee already crit-flavoured | curry +4%, dhal +3%, sambar +6% (+1% per level above 1; linked dips only count for their roti) |
| Cards (passives) | Crisp Edges (+3% crit, +0.1 crit dmg, -5% DoT) | Curry Soak (+8%) |
| Hybrid cards | Crackling Curry (crit +20% splash, max 3) | Twice-Fried (splash can crit, +5% soak) |
| Gear affixes | Crispy (headband, +0.1 crit dmg) | Soaked (apron), Curry-splashed (gloves), +3% soak |
| Stall / later | tawa seasoning (crit), drinks (Kopi O) | thali tray / sambar-pot upgrades, uniques |

Determinism: `rollHit` is unchanged (one rng draw only when `canCrit`). Splash adds no draws unless `splashCrit > 0` (one draw per splashed foe, in `w.enemies` order). Crisp-tag crit chance changes the threshold, not the draw count. Both stats show in the in-run build sheet ("Crisp & Soak" block, per-roti totals). Card art reuses existing passive icons until new ones are drawn.
