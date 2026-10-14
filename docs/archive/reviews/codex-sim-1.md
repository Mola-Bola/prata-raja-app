Verification: checked against current source on 13 Oct 2026 (live 0.4.1); original review text follows.

I’ll review only the supplied code, tracing collisions, damage, timing, and lifecycle behavior without running commands or reading files.
codex
1. **P1 — `src/core/sim.ts:125–128`: Kannan can throw while physically moving because the firing gate trusts `input.moving`.**  
   Status: fixed — `sim.ts` includes actual remaining movement in `p.moving`.
   **Scenario:** Release a drag before Kannan reaches `targetX`; subsequent `{ targetX: null, moving: false }` inputs let him keep sliding and throw at full rate.  
   **Minimal fix:** Include actual movement toward `targetX` when computing `p.moving`.

2. **P1 — `src/core/sim/hit.ts:29–35`: `armourPierce` never affects shield damage, so tissue L5’s documented shield penetration does nothing.**  
   Status: fixed — `hitEnemy` sends the armour-piercing fraction to HP.
   **Scenario:** A straight projectile with positive `armourPierce` and no remaining pierce hits a shielded enemy; the shield absorbs everything.  
   **Minimal fix:** Route the configured penetration fraction through to HP and let the shield absorb the remainder.

3. **P1 — `src/core/sim/enemies.ts:143–145`: Explosions damage Kannan regardless of their radius or position.**  
   Status: fixed — explosion damage now requires counter proximity and horizontal distance within blast radius (`updateExploder`); it uses the counter model rather than a radial player-distance test.
   **Scenario:** An exploder at the left edge detonates while Kannan stands at the right edge, or a fusing exploder is shoved far up the field by a revive; both still deal full damage.  
   **Minimal fix:** Check the distance from the explosion to `(player.x, 0)` against the explosion radius before calling `hurtPlayer`.

4. **P1 — `src/core/sim/shots.ts:228–231`: Orbit hits use global time windows rather than the promised per-enemy cooldown.**  
   Status: fixed — each orb records per-enemy last-hit times.
   **Scenario:** With `orbitHitGap = 0.5`, an orb hits an overlapping enemy at time `0.499`; clearing its hit list at `0.5` permits another hit almost immediately.  
   **Minimal fix:** Store each enemy’s last-hit time per orb and enforce the elapsed gap.

5. **P1 — `src/core/sim/shots.ts:20–27,36–39`: Collision ordering uses closest approach instead of first contact, allowing a projectile to hit the wrong enemy first.**  
   Status: fixed — `contactAt` returns the first segment-circle intersection.
   **Scenario:** On a segment from y=100 to y=120, one enemy’s combined hit radius spans y=108 onward, while a larger enemy centered at y=125 spans y=105 onward; the code selects the smaller enemy despite contacting the larger one first.  
   **Minimal fix:** Return the earliest segment–circle intersection parameter, using zero when the segment starts inside the circle.

6. **P1 — `src/core/sim/shots.ts:174–178`: Waves check only their endpoint and can pass through enemies without hitting them.**  
   Status: fixed — `flyWave` sweeps the full y interval and clips at range.
   **Scenario:** A wave moves from y=0 to y=100 in one substep past an enemy at y=50 whose radius is 5; it misses at 30 Hz but hits at 60 Hz.  
   **Minimal fix:** Test the wave’s swept y interval, expanded by `WAVE_REACH` and the enemy radius.

7. **P1 — `src/core/sim/shots.ts:196–199`: Boomerangs clear hit history before checking their final outgoing segment, permitting a second outgoing hit and suppressing the return hit.**  
   Status: fixed — boomerang slice hits resolve before turn/reset.
   **Scenario:** An enemy near the turn distance overlaps two consecutive outgoing segments; the turn-frame reset lets it take another outgoing hit, then records it as already hit for the return.  
   **Minimal fix:** Resolve outgoing collisions before switching direction and clearing the hit list.

8. **P1 — `src/core/sim/shots.ts:204–206`: Boomerangs disappear before checking the final return segment.**  
   Status: fixed — return-leg hits resolve before catch/removal.
   **Scenario:** A returning boomerang is 60 units from Kannan and can travel 100 units this step; it disappears immediately, missing an enemy at y=30 that lies on its return path.  
   **Minimal fix:** Move to the catch point, resolve swept collisions, then remove the projectile.

9. **P1 — `src/core/sim/throw.ts:262–266`: Starting a new throw can overwrite an unfinished volley and discard its remaining shots.**  
   Status: fixed — `updateThrowing` waits while `volleyLeft > 0`.
   **Scenario:** A three-shot volley has a 0.2-second gap and a 0.3-second effective cooldown; the next throw resets `volleyLeft` before the third shot leaves.  
   **Minimal fix:** Prevent another throw from starting while `volleyLeft > 0`.

10. **P1 — `src/core/sim/throw.ts:112,125` and `src/core/sim/shots.ts:138–143,174–183`: Straight shots and waves can damage enemies beyond their declared maximum travel range.**  
   Status: fixed — straight lifetime equals range/speed; straight and wave final travel is clipped.
    **Scenario:** A straight shot with range 300 and speed 600 lives for 0.75 seconds, allowing it to travel 450 units and hit an enemy beyond range after passing through its original target. Collision checks also run before expiry is enforced.  
    **Minimal fix:** Remove the lifetime slack and clip the final movement to the remaining permitted distance before checking collisions.

11. **P1 — `src/core/sim/shots.ts:91–96,245–248`: Newly spawned fragments receive a full extra simulation step immediately, making their travel and hits depend on frame size.**  
   Status: fixed — the pass snapshots projectile count; fragments fly only the time remaining after contact.
    **Scenario:** A parent projectile hits near the end of a 1/30-second step; its fragments are appended to the active loop and immediately travel another 20 units, potentially hitting a neighbour before that travel time has elapsed.  
    **Minimal fix:** Update only projectiles present at the start of the pass, or advance fragments by the actual remaining collision time.

12. **P1 — `src/core/sim/hit.ts:45–53,98–104`: Dip cascades can hit an already lethally damaged enemy and continue applying effects after it has been marked dead.**  
   Status: fixed — secondary targets use `hurtable` (HP > 0), and dip processing stops when a cascade marks the original dead.
    **Scenario:** A lethal bread hit triggers Masala, which kills a burning neighbour; that neighbour’s Sambal blast targets the original enemy because its state is still alive, kills it, and returns to an outer dip loop that continues applying statuses to its corpse.  
    **Minimal fix:** Exclude HP-depleted enemies from secondary damage targets and stop processing further effects once the original enemy becomes dead.

Not checked: execution or the referenced `status`, `stats`, `cards`, `waves`, and `rng` implementations, which were not supplied. Findings are based on the supplied code and contracts.
tokens used
40,596
1. **P1 — `src/core/sim.ts:125–128`: Kannan can throw while physically moving because the firing gate trusts `input.moving`.**  
   Status: fixed — `sim.ts` includes actual remaining movement in `p.moving`.
   **Scenario:** Release a drag before Kannan reaches `targetX`; subsequent `{ targetX: null, moving: false }` inputs let him keep sliding and throw at full rate.  
   **Minimal fix:** Include actual movement toward `targetX` when computing `p.moving`.

2. **P1 — `src/core/sim/hit.ts:29–35`: `armourPierce` never affects shield damage, so tissue L5’s documented shield penetration does nothing.**  
   Status: fixed — `hitEnemy` sends the armour-piercing fraction to HP.
   **Scenario:** A straight projectile with positive `armourPierce` and no remaining pierce hits a shielded enemy; the shield absorbs everything.  
   **Minimal fix:** Route the configured penetration fraction through to HP and let the shield absorb the remainder.

3. **P1 — `src/core/sim/enemies.ts:143–145`: Explosions damage Kannan regardless of their radius or position.**  
   Status: fixed — explosion damage now requires counter proximity and horizontal distance within blast radius (`updateExploder`); it uses the counter model rather than a radial player-distance test.
   **Scenario:** An exploder at the left edge detonates while Kannan stands at the right edge, or a fusing exploder is shoved far up the field by a revive; both still deal full damage.  
   **Minimal fix:** Check the distance from the explosion to `(player.x, 0)` against the explosion radius before calling `hurtPlayer`.

4. **P1 — `src/core/sim/shots.ts:228–231`: Orbit hits use global time windows rather than the promised per-enemy cooldown.**  
   Status: fixed — each orb records per-enemy last-hit times.
   **Scenario:** With `orbitHitGap = 0.5`, an orb hits an overlapping enemy at time `0.499`; clearing its hit list at `0.5` permits another hit almost immediately.  
   **Minimal fix:** Store each enemy’s last-hit time per orb and enforce the elapsed gap.

5. **P1 — `src/core/sim/shots.ts:20–27,36–39`: Collision ordering uses closest approach instead of first contact, allowing a projectile to hit the wrong enemy first.**  
   Status: fixed — `contactAt` returns the first segment-circle intersection.
   **Scenario:** On a segment from y=100 to y=120, one enemy’s combined hit radius spans y=108 onward, while a larger enemy centered at y=125 spans y=105 onward; the code selects the smaller enemy despite contacting the larger one first.  
   **Minimal fix:** Return the earliest segment–circle intersection parameter, using zero when the segment starts inside the circle.

6. **P1 — `src/core/sim/shots.ts:174–178`: Waves check only their endpoint and can pass through enemies without hitting them.**  
   Status: fixed — `flyWave` sweeps the full y interval and clips at range.
   **Scenario:** A wave moves from y=0 to y=100 in one substep past an enemy at y=50 whose radius is 5; it misses at 30 Hz but hits at 60 Hz.  
   **Minimal fix:** Test the wave’s swept y interval, expanded by `WAVE_REACH` and the enemy radius.

7. **P1 — `src/core/sim/shots.ts:196–199`: Boomerangs clear hit history before checking their final outgoing segment, permitting a second outgoing hit and suppressing the return hit.**  
   Status: fixed — boomerang slice hits resolve before turn/reset.
   **Scenario:** An enemy near the turn distance overlaps two consecutive outgoing segments; the turn-frame reset lets it take another outgoing hit, then records it as already hit for the return.  
   **Minimal fix:** Resolve outgoing collisions before switching direction and clearing the hit list.

8. **P1 — `src/core/sim/shots.ts:204–206`: Boomerangs disappear before checking the final return segment.**  
   Status: fixed — return-leg hits resolve before catch/removal.
   **Scenario:** A returning boomerang is 60 units from Kannan and can travel 100 units this step; it disappears immediately, missing an enemy at y=30 that lies on its return path.  
   **Minimal fix:** Move to the catch point, resolve swept collisions, then remove the projectile.

9. **P1 — `src/core/sim/throw.ts:262–266`: Starting a new throw can overwrite an unfinished volley and discard its remaining shots.**  
   Status: fixed — `updateThrowing` waits while `volleyLeft > 0`.
   **Scenario:** A three-shot volley has a 0.2-second gap and a 0.3-second effective cooldown; the next throw resets `volleyLeft` before the third shot leaves.  
   **Minimal fix:** Prevent another throw from starting while `volleyLeft > 0`.

10. **P1 — `src/core/sim/throw.ts:112,125` and `src/core/sim/shots.ts:138–143,174–183`: Straight shots and waves can damage enemies beyond their declared maximum travel range.**  
   Status: fixed — straight lifetime equals range/speed; straight and wave final travel is clipped.
    **Scenario:** A straight shot with range 300 and speed 600 lives for 0.75 seconds, allowing it to travel 450 units and hit an enemy beyond range after passing through its original target. Collision checks also run before expiry is enforced.  
    **Minimal fix:** Remove the lifetime slack and clip the final movement to the remaining permitted distance before checking collisions.

11. **P1 — `src/core/sim/shots.ts:91–96,245–248`: Newly spawned fragments receive a full extra simulation step immediately, making their travel and hits depend on frame size.**  
   Status: fixed — the pass snapshots projectile count; fragments fly only the time remaining after contact.
    **Scenario:** A parent projectile hits near the end of a 1/30-second step; its fragments are appended to the active loop and immediately travel another 20 units, potentially hitting a neighbour before that travel time has elapsed.  
    **Minimal fix:** Update only projectiles present at the start of the pass, or advance fragments by the actual remaining collision time.

12. **P1 — `src/core/sim/hit.ts:45–53,98–104`: Dip cascades can hit an already lethally damaged enemy and continue applying effects after it has been marked dead.**  
   Status: fixed — secondary targets use `hurtable` (HP > 0), and dip processing stops when a cascade marks the original dead.
    **Scenario:** A lethal bread hit triggers Masala, which kills a burning neighbour; that neighbour’s Sambal blast targets the original enemy because its state is still alive, kills it, and returns to an outer dip loop that continues applying statuses to its corpse.  
    **Minimal fix:** Exclude HP-depleted enemies from secondary damage targets and stop processing further effects once the original enemy becomes dead.

Not checked: execution or the referenced `status`, `stats`, `cards`, `waves`, and `rng` implementations, which were not supplied. Findings are based on the supplied code and contracts.
