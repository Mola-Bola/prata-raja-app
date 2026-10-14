# Combat feel: survivor-likes and top-down auto-throw

Research for the free-movement auto-throw loop (Kannan: joystick, auto-throws at nearest pest, dodges; pests chase; contact damage). Problems from the lead's playtest: pests string into one conga line, hits barely register, throws feel tiny and slow, pacing is sparse.

Tags: **[src]** = found in a source, **[est]** = my estimate, to test on a phone. Units: our field 540 u wide, Kannan ~210 u/s, dash 140 u / 0.18 s / 1.2 s cd, pests ~1.3x base speed.

Gaps, stated plainly: no GDC talk found; Survivor.io, Halls of Torment and Habby numbers not found; Vampire Survivors Experience_Gem wiki returned HTTP 402; Brotato projectile speed and auto-aim targeting rule not found; Brotato modding docs not reached.

## 1. Crowd and swarm movement

| Game / repo | Technique | Numbers | Source |
|---|---|---|---|
| Boids / steering (Reynolds rules) | Separation + alignment + cohesion; separation weighted by distance | Separation weighted more the closer the neighbour | https://code.tutsplus.com/3-simple-rules-of-flocking-behaviors-alignment-cohesion-and-separation--gamedev-3444t |
| FlockAI (UE4) | Separation strongest when agents are about to collide | No numbers; read-only reference, check licence before use | https://github.com/parmandorc/FlockAI |
| swarmr (browser survivor) | Uniform-grid spatial hash rebuilt per tick, zero allocation; powers targeting, separation, collision; 2,000+ enemies | No grid cell size given. **Licence: all rights reserved, study only, do not copy** | https://github.com/brac/swarmr |
| E.T. Returns devlog | "Spread": circular query counts neighbours; sum of vectors pointing at neighbours; if large, edge enemy steers away and breaks the clump | Radius and threshold not published | https://therealmattkain.itch.io/et-returns/devlog/556760/et-returns-postmortemish-part-3-attack-patterns |
| Unity forum (attack sectors) | Player-side slot manager gives each enemy a ring slot to attack from | Slot count not stated | https://discussions.unity.com/t/how-to-prevent-my-npcs-from-clumping-up-while-chasing-a-common-target/825816 |
| Flow Field Survivors (thesis-style) | Flow field instead of per-agent seek for huge counts | Not measured | https://nicolasbrueckner.itch.io/flow-field-survivors |
| Brotato enemy table | Speed per enemy, random spawn speed band (Baby Alien 200-300, Fly 325-375), player base 450 | Chaser 380 (0.84x player), Charger 400 (0.89x), Spitter 200, Pursuer 150 walking to 600 when charging (1.33x) | https://brotato.wiki.spellsandguns.com/Enemies |

Why our line forms: every pest seeks the same point at the same speed, so they follow one path. Fix is separation plus per-pest approach offsets and speed spread, not more speed.

## 2. Taking damage

| Game / repo | Technique | Numbers | Source |
|---|---|---|---|
| Brotato i-frames | Scales with damage taken as share of max HP | `0.4 s x (dmg % max HP) / 15%`, clamped 0.2-0.4 s; self-damage bypasses | https://brotato.wiki.spellsandguns.com/Iframes |
| Brotato knockback | Per-enemy knockback resistance (Tree 1.0 = immune, Charger 0.8, Spitter 0.95, Chaser 0.0) | Player knockback stat: Soldier +15, Ashes -5 | https://brotato.wiki.spellsandguns.com/Enemies |
| Game-feel primer (Unity) | Hit stop by tier; flash 80 ms; impulse shake by tier | Hit stop weak 0-30 ms, strong 50-80 ms, critical 100-150 ms; flash 0.08 s; impulse weak 0.1-0.2, strong 0.3-0.5, critical 0.6-1.0 (Cinemachine units, not px) | https://uhiyama-lab.com/en/notes/unity/unity-game-feel-hit-feedback/ |
| Brotato Tree | Knockback immune at 1.0 | - | https://brotato.wiki.spellsandguns.com/Enemies |

Not found: screen shake duration in px; player red-flash timing in VS/Brotato; HP-bar delay numbers.

## 3. Projectiles and auto-aim

| Game / repo | Technique | Numbers | Source |
|---|---|---|---|
| Brotato attack speed | 100% attack speed halves cooldown; cooldown floor 0.75 s with Ball and Chain | Claw cd 0.78 s (T1), Hatchet 0.68 s, Ghost Flint 1.23 s, Drill 0.45 s | https://brotato.wiki.spellsandguns.com/Attack_Speed |
| Brotato range | Ranged weapon range boosted by Range stat; melee by half; floor 25 | Wand 350, Slingshot 300, Spear 330, Fist 183, Knife 157 (third-party list, may be stale) | https://www.gamepressure.com/newsroom/brotato-weapon-list/zb4b14 |
| Brotato auto-fire | Auto-fire default, manual aim optional | Target rule (nearest/densest/lowest HP) not confirmed | https://www.gamepressure.com/newsroom/brotato-weapon-list/zb4b14 |

Not found: projectile speed px/s, sprite size ratios, spin/trail, damage-number density caps.

## 4. Pickups and XP gems

| Game / repo | Technique | Numbers | Source |
|---|---|---|---|
| Vampire Survivors Magnet | Radius that collects gems and pickups; multiplicative | Base 30; PowerUp x1.25 per rank, max rank 2 (x1.5625); Attractorb up to x3.98 at level 5 | https://vampire.survivors.wiki/w/Magnet |
| Vampire Survivors gems | Gem value by colour; gem cap | Blue up to 2 XP, green up to 9, red beyond; cap 400 or 500 in forum claims (unverified) | https://steamcommunity.com/app/1794680/discussions/0/3201496916536108528 |
| Vampire Survivors Vacuum | Separate from Magnet; collects all gems on the floor | - | https://vampire.survivors.wiki/w/Magnet |

Not found: pull speed curve, auto-collect timing, coin burst counts. Use the recipe below.

## 5. Pacing and spawns

| Game / repo | Technique | Numbers | Source |
|---|---|---|---|
| Vampire Survivors waves | Waves once a minute; per wave a minimum quantity and interval; keep spawning until quota met | Minute-by-minute counts not found | https://vampire-survivors.fandom.com/wiki/Enemies |
| Vampire Survivors caps | Stop periodic spawns at 300 alive (enemies page); Curse page says total on-screen cap 500 | Sources disagree, version unknown | https://vampire-survivors.fandom.com/wiki/Enemies ; https://vampire.survivors.wiki/w/Curse |
| Curse / Charm | Curse +10% speed, health, quantity, frequency per rank; Charm +20 enemies per wave per rank, max 5 | - | https://vampire.survivors.wiki/w/Curse |
| Brotato | Enemy speed does not scale with wave; damage and HP do | - | https://brotato.wiki.spellsandguns.com/Enemies |

## 6. Physics feel

| Game / repo | Technique | Numbers | Source |
|---|---|---|---|
| GDevelop top-down behaviour (engine default) | Accel 400, decel 800, max 200 | Ratios: accel 2x max, decel 4x max; full speed in 0.5 s, stop in 0.25 s | https://wiki.gdevelop.io/gdevelop5/all-features/top-down-movement-behavior/reference/ |
| Dash tuning (indie devlog) | Dash crossing half the screen broke play; long cooldown was the alternative | Dash 3 s boost / 20 s recharge (forum example, not tuned) | https://www.gamedeveloper.com/design/antegods-design-update-tweaking-dash-gameplay |
| Community feedback | Players prefer longer dash, shorter cooldown; kill-reset cooldown liked | - | https://www.gamedeveloper.com/design/antegods-design-update-tweaking-dash-gameplay |

Not found: Halls of Torment / Survivor.io dash numbers.

## Prata Raja recipe

**1. Crowd (fixes the conga line)**
- Spatial hash, cell = max separation radius (about 2x pest radius). Query neighbours only through the hash; cap at 8 nearest per pest. [est]
- Separation: for each neighbour d < r_sep = 1.4 x (ra + rb), add `k * (1 - d / r_sep)` along the away vector. Weight separation 1.8 vs seek 1.0; clamp total to max speed. [est; weights from Reynolds-style weighting, src]
- Per-pest approach: at spawn pick a fixed angle offset in +/-30 deg and a speed factor in 0.85-1.15 (Brotato's random band is about +/-20%, src). Pests aim at a ring slot 70-90 u from Kannan at their offset angle, not Kannan's centre. [est]
- Spread (E.T. Returns idea): if the summed neighbour vector exceeds ~0.6 of max speed, that pest sidesteps 90 deg for 0.6 s. [est; threshold unpublished]
- Speed ratios: standard chaser base ~0.65x Kannan (137 u/s), x1.3 pest multiplier = ~178 u/s (0.85x). Rush packs 1.1-1.3x Kannan for 0.8 s bursts, then decel. Keep at least one slow tank per wave so the line breaks. [est; compare Brotato 0.84-0.89x]
- Player push-back: pests overlapping Kannan get a 20-30 u separation push, not a player push. Kannan takes no displacement from pests. [est]

**2. Damage feel**
- I-frames: `clamp(0.4 * dmg / (0.15 * maxHP), 0.2, 0.4)` seconds. Brotato formula, src. Dash invuln 0.18 s on the dash only. [src formula, est constants]
- Knockback: pests that hit Kannan lose their velocity for 0.08 s; Kannan gets no push. Knockback immune: tank class 1.0. [src resistance idea; est]
- Hit stop: 30 ms on pest hit, 50 ms on pest kill, 100 ms on boss phase change. [src ranges, est picks]
- Shake: impulse 0.15 on pest hit, 0.4 on kill, 0.8 on Kannan hit. Units are the engine's impulse units, not px. [src ranges]
- Hit flash: 80 ms white on pest, 80 ms red on Kannan. [src flash duration]

**3. Throws**
- Target: nearest pest in throw range; tie-break to the pest closest to Kannan's facing. Densest-cluster target is an option once separation exists. [est]
- Cadence: one throw per 0.55 s base, halved by attack-speed stat, floor 0.3 s. [src Brotato cooldown magnitudes]
- Range: 300-330 u (about 0.6x field width), based on Brotato's Slingshot/Spear values scaled to our field. [est; arena sizes differ]
- Projectile: radius 0.45x Kannan body radius; speed 600 u/s (about 2.9x Kannan); spin 720 deg/s; 4-point trail. [est]
- Sparks: 6-8 particles on hit, 0.2 s life; damage number only on crit or kill to cap density at 1 per pest per 0.5 s. [est]

**4. Pickups**
- Magnet base 90 u (lead to check against VS base 30 scaled to field, src 1.25 per rank). [est]
- Pull: accelerating pull, speed = min(2.5 x Kannan, 1.0 x Kannan + 2.0 * (time inside magnet) * Kannan), i.e. ramp to 2.5x Kannan over 0.4 s. [est]
- Auto-collect inside 24 u, no pull time. Coin burst: 5-8 drops, 40-70 u radius, 0.25 s scatter. [est]

**5. Pacing**
- Waves every 20 s (not VS's 60 s, because our run is shorter). Min quantity and interval per wave, keep spawning until quota met. [src VS wave logic, est timing]
- Alive targets: 0-30 s: 6-10; 30-60 s: 14-18; 60-120 s: 22-32; hard cap 40 on screen. [est]
- Spawn ring: offscreen at radius = half screen diagonal + 60 u; pests spawn in a 40-60 deg arc, not all from one side. [est]

**6. Physics**
- Kannan: accel 2400 u/s^2 (full speed in ~90 ms), decel 3200 u/s^2 (stop in ~66 ms); instant with a 60-80 ms ease. [est; GDevelop ratios src]
- Dash: keep 140 u / 0.18 s / 1.2 s cd (140 u is about 26 % of 540 width, inside the quarter-to-third rule). Kill during cooldown lowers it by 0.2 s, cap 0.6 s reduction. [src rule, est numbers]
- Camera: exp2 lerp (see readability-refs), dead zone 60 u. [est]

Ship order: 1 crowd (separation + offsets), 2 hit feedback constants, 3 throw speed and cadence, 4 magnet pull, 5 pacing. Each is one slice; verify with `npm run snap -- --random 6` after each visual change.

## Sources

- https://code.tutsplus.com/3-simple-rules-of-flocking-behaviors-alignment-cohesion-and-separation--gamedev-3444t
- https://github.com/parmandorc/FlockAI
- https://github.com/brac/swarmr (study only, all rights reserved)
- https://therealmattkain.itch.io/et-returns/devlog/556760/et-returns-postmortemish-part-3-attack-patterns
- https://discussions.unity.com/t/how-to-prevent-my-npcs-from-clumping-up-while-chasing-a-common-target/825816
- https://nicolasbrueckner.itch.io/flow-field-survivors
- https://brotato.wiki.spellsandguns.com/Enemies
- https://brotato.wiki.spellsandguns.com/Iframes
- https://brotato.wiki.spellsandguns.com/Attack_Speed
- https://www.gamepressure.com/newsroom/brotato-weapon-list/zb4b14
- https://uhiyama-lab.com/en/notes/unity/unity-game-feel-hit-feedback/
- https://vampire.survivors.wiki/w/Magnet
- https://vampire.survivors.wiki/w/Curse
- https://vampire-survivors.fandom.com/wiki/Enemies
- https://steamcommunity.com/app/1794680/discussions/0/3201496916536108528
- https://wiki.gdevelop.io/gdevelop5/all-features/top-down-movement-behavior/reference/
- https://www.gamedeveloper.com/design/antegods-design-update-tweaking-dash-gameplay
