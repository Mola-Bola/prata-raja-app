import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { autoFind, autoInput } from '../autoplay';
import { PICK_EVERY, bossAtOf, nextPickStop } from '../director';
import { FIND_MAGNITUDE, FIND_TIME, MAX_FINDS, grantFind, swapFind } from '../finds';
import { makeRng } from '../rng';
import { createRun, step } from '../sim';
import type { PassiveId, World } from '../types';

const DT = 1 / 30;

/** Step until `until` holds (or the cap), keeping the bot alive. */
function runUntil(w: World, until: (x: World) => boolean, cap = 240 * 30): void {
  for (let i = 0; i < cap && !until(w); i++) {
    w.player.hp = w.player.stats.maxHp;
    step(w, DT, autoInput(w));
  }
}

const fresh = (seed = 11): World => {
  const w = createRun({ seed, content: CONTENT });
  w.phase = 'wave';
  w.wave = 1;
  return w;
};

describe('flow street finds', () => {
  it('in-run level-ups never open cards in flow; a find arrives at each calm stop without pausing', () => {
    const w = fresh();
    w.player.xp = w.player.xpToNext; // owed a level
    runUntil(w, (x) => x.dist > PICK_EVERY + 5);
    expect(w.phase).toBe('wave');
    expect(w.pendingLevelUps).toBe(0);
    expect(w.finds).toHaveLength(1);
  });

  it('a find is granted at once, weaker than a card, and offers two swaps for FIND_TIME seconds', () => {
    const w = fresh();
    grantFind(w, makeRng(3));
    const f = w.find!;
    expect(f.t).toBe(FIND_TIME);
    expect(f.alts.length).toBe(2);
    expect(w.finds).toEqual([f.card]);
    if (f.card.kind === 'passive') {
      const [stat, per] = Object.entries(CONTENT.passives[f.card.id as PassiveId].perLevel)[0];
      expect(w.player.stats[stat as 'dmgPct']).toBeCloseTo((stat === 'maxHp' ? 100 : stat === 'critChance' ? 0.05 : stat === 'critMult' ? 1.5 : 0) + (per as number) * FIND_MAGNITUDE);
    }
  });

  it('swap replaces the find once, inside its window', () => {
    const w = fresh();
    grantFind(w, makeRng(3));
    const [first, alt] = [w.find!.card, w.find!.alts[0]];
    expect(swapFind(w, 0)).toBe(true);
    expect(w.find!.card).toEqual(alt);
    expect(w.finds).toEqual([alt]);
    expect(swapFind(w, 0)).toBe(false);
    expect(first).not.toEqual(alt);
  });

  it('the window closes by itself as the sim runs', () => {
    const w = fresh();
    grantFind(w, makeRng(3));
    runUntil(w, (x) => !x.find, 6 * 30);
    expect(w.find).toBeUndefined();
  });

  it('is capped at MAX_FINDS and the bot can still play a whole run', () => {
    const w = fresh(5);
    for (let i = 0; i < MAX_FINDS + 3; i++) grantFind(w, makeRng(i + 1));
    expect(w.finds).toHaveLength(MAX_FINDS);
    autoFind(w);
  });

  it('the boss mark gets no find, and nextPickStop: next multiple, capped at the boss mark', () => {
    const w = fresh();
    w.dist = bossAtOf(w.chapter) - 2;
    w.pickAt = bossAtOf(w.chapter);
    runUntil(w, (x) => !!x.flowBoss, 60 * 30);
    expect(w.flowBoss).toBe(true);
    expect(w.finds ?? []).toHaveLength(0);
    expect(nextPickStop(PICK_EVERY - 1, 1200)).toBe(PICK_EVERY);
    expect(nextPickStop(1190, 1200)).toBe(1200);
    expect(nextPickStop(1200, 1200)).toBe(Infinity);
  });

  it('waves mode still offers level-ups at once', () => {
    const w = createRun({ seed: 2, content: CONTENT, mode: 'waves' });
    w.pendingLevelUps = 1;
    step(w, DT, autoInput(w));
    expect(w.phase).toBe('levelup');
  });
});
