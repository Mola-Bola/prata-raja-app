// Free mode street finds: a tiffin pickup scrolls down the street, touching it opens a three-card choice, picking grants that card.
import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { autoInput, autoPick } from '../autoplay';
import { PICK_EVERY } from '../director';
import { MAX_FINDS, PICKUP_SPEED, chooseFind, spawnPickup } from '../finds';
import { makeRng } from '../rng';
import { chooseCard, createRun, drainEvents, reroll, step } from '../sim';
import { FIELD, type RunInput, type World } from '../types';

const DT = 1 / 30;
const still: RunInput = { targetX: null, moving: false };
const COUNTER = { ...CONTENT, tune: { ...CONTENT.tune, controlMode: 'counter' as const } };

const fresh = (seed = 11, content = CONTENT): World => {
  const w = createRun({ seed, content });
  w.phase = 'wave';
  w.wave = 1;
  return w;
};
/** Step with the bot's input, topping hp up, until `until` holds. */
function runUntil(w: World, until: (x: World) => boolean, cap = 240 * 30): void {
  for (let i = 0; i < cap && !until(w); i++) {
    w.player.hp = w.player.stats.maxHp;
    step(w, DT, autoInput(w));
  }
}
/** A world with a pickup placed on top of Kannan, so the next step opens it. */
function touching(): World {
  const w = fresh();
  spawnPickup(w, makeRng(3));
  w.pickup!.x = w.player.x;
  w.pickup!.y = w.player.y;
  return w;
}

describe('free mode tiffin pickup', () => {
  it('spawns at the find stop (no grant yet) at the top of the street, with three distinct cards', () => {
    const w = fresh();
    runUntil(w, (x) => !!x.pickup);
    expect(w.dist).toBeGreaterThanOrEqual(PICK_EVERY);
    expect(w.finds ?? []).toHaveLength(0);
    expect(w.find).toBeUndefined();
    expect(w.pickup!.offer).toHaveLength(3);
    expect(w.pickup!.y).toBeLessThanOrEqual(FIELD.freeMaxY);
    expect(Math.abs(w.pickup!.x)).toBeLessThanOrEqual(FIELD.kannanMaxX);
  });

  it('is deterministic per seed', () => {
    const [a, b] = [fresh(7), fresh(7)];
    spawnPickup(a, makeRng(9));
    spawnPickup(b, makeRng(9));
    expect(a.pickup).toEqual(b.pickup);
  });

  it('scrolls down the street at PICKUP_SPEED', () => {
    const w = fresh();
    spawnPickup(w, makeRng(3));
    w.player.x = -FIELD.kannanMaxX;
    w.pickup!.x = FIELD.kannanMaxX;
    const y0 = w.pickup!.y;
    step(w, DT, still);
    expect(w.pickup!.y).toBeCloseTo(y0 - PICKUP_SPEED * DT, 5);
  });

  it('touching it pauses the run on its three cards; choosing grants exactly that card', () => {
    const w = touching();
    const offer = w.pickup!.offer;
    step(w, DT, still);
    expect(w.phase).toBe('levelup');
    expect(w.offer).toEqual(offer);
    expect(w.finds ?? []).toHaveLength(0);
    const t = w.time;
    step(w, DT, still);
    expect(w.time).toBe(t); // paused
    expect(reroll(w)).toBe(false);
    chooseCard(w, 1);
    expect(w.phase).toBe('wave');
    expect(w.pickup).toBeUndefined();
    expect(w.finds).toEqual([offer[1]]);
    step(w, DT, still);
    expect(w.time).toBeGreaterThan(t);
  });

  it('a bad index grants nothing and leaves the choice open', () => {
    const w = touching();
    step(w, DT, still);
    chooseCard(w, 7);
    chooseFind(w, 7);
    expect(w.phase).toBe('levelup');
    expect(w.finds ?? []).toHaveLength(0);
  });

  it('missing it grants nothing and says so', () => {
    const w = fresh();
    spawnPickup(w, makeRng(3));
    w.player.x = -FIELD.kannanMaxX;
    w.pickup!.x = FIELD.kannanMaxX;
    const evs = [];
    for (let i = 0; i < 20 * 30 && w.pickup; i++) {
      step(w, DT, still);
      evs.push(...drainEvents(w));
    }
    expect(w.pickup).toBeUndefined();
    expect(w.finds ?? []).toHaveLength(0);
    expect(evs.some((e) => e.t === 'findMissed')).toBe(true);
    expect(w.phase).not.toBe('levelup');
  });

  it('respects MAX_FINDS', () => {
    const w = fresh(5);
    w.finds = Array.from({ length: MAX_FINDS }, () => ({ kind: 'passive', id: 'strong-wrists', level: 1 }) as never);
    spawnPickup(w, makeRng(3));
    expect(w.pickup).toBeUndefined();
  });

  it('counter mode is unchanged: the find is granted at once with a swap window, no pickup', () => {
    const w = fresh(11, COUNTER);
    runUntil(w, (x) => (x.finds?.length ?? 0) > 0);
    expect(w.finds).toHaveLength(1);
    expect(w.find).toBeDefined();
    expect(w.pickup).toBeUndefined();
  });

  it('the bot walks into the gift and the whole run still plays through', () => {
    const w = fresh(21);
    let opened = 0;
    for (let i = 0; i < 600 * 30 && w.phase !== 'won' && w.phase !== 'lost'; i++) {
      w.player.hp = w.player.stats.maxHp;
      if (w.phase === 'levelup') { opened++; chooseCard(w, autoPick(w)); } else step(w, DT, autoInput(w));
    }
    expect(opened).toBeGreaterThan(0);
    expect(w.finds!.length).toBeLessThanOrEqual(MAX_FINDS);
  });
});
