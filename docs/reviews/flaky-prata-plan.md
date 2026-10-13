# Flaky prata: bounded Kitchen experiment

14 Oct 2026. Proposal, not shipped. Source: in-game idea6e457239, whose device is not yet authenticated as the owner. This fits the recorded food-specific weapon direction but does not authorize replacing an existing build.

## What exists
Kosong is currently a straight shot with ricochets from level3 (one hop at3, two at4). Egg Telur already emits radial damage fragments; loaded Murtabak also uses that helper. `spawnFragments` in `src/core/sim/shots.ts` makes non-recursive children with the parent target excluded, and uses swept contacts. It currently emits only after the final ricochet. Reusing it unchanged would produce a terminal burst, not progressive flaking. Do not rebuild collision detection or claim tiny copies of a whole roti are finished flake art.

## Prototype to compare
Add an explicit, default-off Kitchen experiment for **Flaky Kosong**, preserving ordinary runs and saves. Keep the base hit, firing cadence and level progression fixed for the first comparison. At each successful unshielded impact, emit two short-lived flakes in a forward fan; the main roti retains its existing remaining hops. Children cannot recurse, hop or hit the struck parent target again. Start at10% of that impact's damage per flake and a short travel distance (about120 world units). These are experimental starting values, not verified tuning. Cap flake children at six per original roti (the existing maximum three impacts), and use the renderer's existing pool limits. Preserve source roti identity for linked dips; specifically measure extra proc frequency so low direct damage cannot hide a large support-dip buff.

Show loss of layers through decreasing parent scale across impacts and small cropped portions of existing Kosong artwork for children. This is a first readability prototype; use generated flake sprites later only if existing art cannot communicate the effect. Keep Egg's full radial burst visually distinct. The Kitchen control must call it experimental and explain that normal runs are unchanged. Include its state in sandbox feedback context and reset it with the experiment.

## Evidence before direction decision
- Deterministic impact tests: two children, no recursive children, no repeated target, shield behavior, multi-hop cap, equivalent coarse/fine stepping.
- Baseline versus experiment: isolated Kosong plus Fish/Milk/Mint/Teh setups; record direct damage, proc counts and peak projectiles, then300seed win bands before proposing normal-run adoption.
- Inspect phone-width motion: flakes must read as pieces, retain legible parent motion and avoid covering enemy telegraphs.
- Ship the sandbox prototype only after normal-run regression checks. Present a concrete recommendation and ask the owner whether flakes should supplement ricochets, replace them, or become a later mastery choice. This direction decision remains open; do not silently replace live Kosong.

Implementation follows the measured knockback fix and Teh visual slice. Dip progression remains on the roadmap; this experiment is bounded feedback work rather than a replacement progression system.
