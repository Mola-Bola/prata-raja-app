import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { bossAtOf } from '../director';
import { makeRng } from '../rng';
import { createRun, drainEvents, step } from '../sim';
import { enemyShot, type Ctx } from '../sim/ctx';
import { FREE } from '../sim/free';
import { spawnEnemy } from '../sim/spawn';
import { FIELD, type Content, type GameEvent, type RunInput, type World } from '../types';

const DT = 1 / 30;
const ctxOf = (w: World): Ctx => ({ w, p: w.player, rng: makeRng(7), dt: DT, m: null });
/** A free-mode run parked in its 1.5 s intro (no director), so only what the test places exists. */
const world = (content: Content = CONTENT): World => createRun({ seed: 1, content });
const run = (w: World, secs: number, input: RunInput | ((t: number) => RunInput)): GameEvent[] => {
  const evs: GameEvent[] = [];
  for (let t = 0; t < secs - 1e-9; t += DT) {
    step(w, DT, typeof input === 'function' ? input(t) : input);
    evs.push(...drainEvents(w));
  }
  return evs;
};
const still: RunInput = {};

describe('free movement', () => {
  it('the joystick walks Kannan at moveSpeed x speedMul and keeps him inside the street', () => {
    const w = world();
    const speed = w.player.stats.moveSpeed * FREE.speedMul;
    expect(w.player.y).toBe(FREE.startY);
    run(w, 0.5, { jx: 1, jy: 0 });
    expect(w.player.x).toBeCloseTo(speed * 0.5, 0);
    expect(w.player.moving).toBe(true);
    run(w, 1, { jx: 1, jy: -1 }); // magnitude clamps to 1
    expect(w.player.x).toBe(FIELD.kannanMaxX);
    expect(w.player.y).toBe(FIELD.freeMinY);
  });

  it('a dash covers ~dashDist with i-frames, emits {t:dash}, then waits out its cooldown', () => {
    const w = world();
    const x0 = w.player.x;
    const evs = run(w, FREE.dashTime + 0.05, (t) => ({ jx: 1, jy: 0, dodge: t < DT }));
    expect(evs.filter((e) => e.t === 'dash')).toHaveLength(1);
    expect(w.player.x - x0).toBeGreaterThan(FREE.dashDist * 0.95);
    expect(w.player.dashCd).toBeGreaterThan(0.9);
    // pressing again inside the cooldown does nothing
    const again = run(w, 0.3, (t) => ({ dodge: t < DT }));
    expect(again.some((e) => e.t === 'dash')).toBe(false);
  });

  it('pests chase Kannan and bite on contact; a dash is immune', () => {
    const w = world();
    const e = spawnEnemy(ctxOf(w), CONTENT.enemies['sugar-ant'], w.player.x + 100, { y: w.player.y + 40 });
    e.hp = e.maxHp = 1e9;
    const before = e.x - w.player.x;
    run(w, 0.2, still);
    expect(Math.hypot(e.x - w.player.x, e.y - w.player.y)).toBeLessThan(Math.hypot(before, 40));
    run(w, 1.2, still);
    expect(e.state).toBe('attack');
    expect(w.player.hp).toBeLessThan(w.player.stats.maxHp);
    const hp = w.player.hp;
    run(w, FREE.dashTime, (t) => ({ jx: 0, jy: 0.0001, dodge: t < DT }));
    expect(w.player.hp).toBeGreaterThanOrEqual(hp - 3); // at most the one discrete hit that was due before the dash landed
  });

  it('an enemy shot aimed at Kannan hits where he stands, and a dash lets it through', () => {
    const shotAt = (dash: boolean): number => {
      const w = world();
      const p = w.player;
      w.projectiles.push(enemyShot(ctxOf(w), p.x, p.y + 90, p.x, 10, 520, 'fx/spark', false, p.y));
      run(w, 0.4, (t) => ({ dodge: dash && t < DT }));
      return w.player.hp;
    };
    expect(shotAt(false)).toBeLessThan(100);
    expect(shotAt(true)).toBe(100);
  });

  it('boss arena lock: the stall stops, no adds spawn while the boss lives', () => {
    const w = world();
    w.phase = 'wave';
    w.wave = 1;
    w.god = true;
    const bossAt = bossAtOf(w.chapter);
    w.dist = bossAt - 0.5;
    const evs = run(w, 2, still);
    expect(evs.some((e) => e.t === 'bossSpawn')).toBe(true);
    const boss = w.enemies.find((e) => e.boss)!;
    expect(boss).toBeDefined();
    const spawnedUpTo = w.nextUid;
    for (let i = 0; i < 200 && boss.state !== 'hold'; i++) run(w, DT, still); // it walks down to its post
    run(w, FREE.bossBeat - 0.1, still);
    expect(w.dist).toBe(bossAt);
    expect(w.enemies.filter((e) => e.uid >= spawnedUpTo)).toHaveLength(0);
    expect(boss.cooldowns._st ?? 0).toBe(0); // the opening beat: no attack begun yet
  });
});
