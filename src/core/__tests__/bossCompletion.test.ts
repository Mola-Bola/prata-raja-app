import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { createRun, drainEvents, startRunWave, step } from '../sim';
import type { Enemy, World } from '../types';

const still = {};
const dt = 1 / 60;
function run(chapterId: string, wave?: number, content = CONTENT): World {
  const w = createRun({ seed: 5, chapterId, content, mode: 'waves' });
  w.player.breads = []; w.player.stats.maxHp = 1000; w.player.hp = 1000;
  startRunWave(w, wave ?? w.chapter.waves.length);
  drainEvents(w);
  return w;
}
function adds(w: World, n = 3): Enemy[] {
  const def = w.content.enemies[Object.keys(w.chapter.waves[w.wave - 1].mix)[0]];
  const list = Array.from({ length: n }, (_, i): Enemy => ({ uid: w.nextUid++, def: { ...def, speed: 0 }, boss: false, elite: false,
    x: i * 100, y: 800, hp: 1000, maxHp: 1000, shield: 0, statuses: [], state: 'walk', t: 0, age: 0, knock: 0, flash: 0, cooldowns: { bx: i * 100 }, phase: 0, holdY: 0 }));
  w.enemies.push(...list);
  return list;
}
function defeatThisStep(w: World) {
  const boss = w.enemies.find(e => e.boss)!;
  boss.hp = .01;
  boss.statuses = [{ id: 'burn', time: 1, stacks: 1, dps: 10, amount: 0 }];
}

describe('boss defeat ends its wave', () => {
  it.each(['kopitiam-street', 'hawker-night'])('%s wins immediately after an early defeat despite budget/adds, without another spawn or repeated payout', chapterId => {
    const w = run(chapterId); const remaining = adds(w);
    expect(w.budgetLeft).toBeGreaterThan(0); expect(w.waveTime).toBe(0);
    const nextUid = w.nextUid; const budget = w.budgetLeft;
    defeatThisStep(w);
    step(w, dt, still);
    expect(w.phase).toBe('won');
    expect(w.result).toMatchObject({ won: true, chapterId, wave: w.chapter.waves.length, bossKills: 1 });
    expect(w.enemies.map(e => e.uid)).toEqual(remaining.map(e => e.uid));
    expect(w.nextUid).toBe(nextUid); expect(w.budgetLeft).toBe(budget);
    expect(w.waveTime).toBe(0); // the defeated wave never reaches spawnTick
    expect(drainEvents(w).filter(e => e.t === 'runEnd')).toEqual([{ t: 'runEnd', won: true }]);
    const result = structuredClone(w.result); const gold = w.gold; const state = w.rngState;
    step(w, .5, still);
    expect(drainEvents(w)).toEqual([]); expect(w.result).toEqual(result); expect(w.gold).toBe(gold); expect(w.rngState).toBe(state);
  });

  it.each(['kopitiam-street', 'hawker-night'])('%s remains open while its boss is alive even with exhausted budget and elapsed timeout', chapterId => {
    const w = run(chapterId); w.budgetLeft = 0; w.waveTime = 1000;
    step(w, dt, still);
    expect(w.phase).toBe('wave'); expect(w.result).toBeNull(); expect(w.enemies.some(e => e.boss && e.state !== 'dead')).toBe(true);
  });

  it('does not mistake a chapter-global prior attempt/kill for an unspawned future boss defeat', () => {
    const w = createRun({ seed: 5, content: CONTENT, mode: 'waves' });
    w.phase = 'wave'; w.wave = w.chapter.waves.length; w.waveTime = 1000; w.budgetLeft = 0;
    w.player.breads = []; w.bossAttempted = true; w.bossKills = 1;
    step(w, dt, still);
    expect(w.phase).toBe('wave'); expect(w.result).toBeNull();
  });

  it('a repeated future boss ID is spawned synchronously and stays alive after the previous corpse is swept', () => {
    const base = CONTENT.chapters[0]; const bossWave = base.waves.at(-1)!;
    const content = { ...CONTENT, chapters: [{ ...base, waves: [{ ...bossWave }, { ...bossWave }] }] };
    const w = run(base.id, 1, content); w.player.stats.xpPct = -1; defeatThisStep(w);
    step(w, dt, still);
    expect(w.wave).toBe(2); expect(w.result).toBeNull();
    const bosses = w.enemies.filter(e => e.boss);
    expect(bosses).toHaveLength(1); expect(bosses[0].def.id).toBe(bossWave.boss); expect(bosses[0].state).not.toBe('dead');
    step(w, dt, still);
    expect(w.wave).toBe(2); expect(w.phase).toBe('wave'); expect(w.result).toBeNull();
  });

  it('a missing future boss cannot inherit a matching corpse or prior attempt after sweepDead', () => {
    const base = CONTENT.chapters[0]; const bossWave = base.waves.at(-1)!;
    const content = { ...CONTENT, bosses: { ...CONTENT.bosses }, chapters: [{ ...base, waves: [{ ...bossWave }, { ...bossWave }] }] };
    const w = run(base.id, 1, content); w.player.stats.xpPct = -1;
    delete content.bosses[bossWave.boss!]; // first boss already spawned; malformed later request has no definition
    defeatThisStep(w); step(w, dt, still);
    expect(w.wave).toBe(2); expect(w.enemies.some(e => e.boss)).toBe(false);
    w.budgetLeft = 0; w.waveTime = 1000;
    step(w, dt, still);
    expect(w.phase).toBe('wave'); expect(w.result).toBeNull();
  });

  it('ordinary player death takes precedence when an existing add kills on the boss-defeat step', () => {
    const w = run('kopitiam-street'); const [attacker] = adds(w, 1);
    attacker.x = w.player.x; attacker.y = w.player.y; attacker.state = 'attack'; attacker.def = { ...attacker.def, contactDps: 100 };
    w.player.hp = .01; defeatThisStep(w);
    step(w, dt, still);
    expect(w.phase).toBe('lost'); expect(w.result).toMatchObject({ won: false, bossKills: 1 });
    expect(drainEvents(w).filter(e => e.t === 'runEnd')).toEqual([{ t: 'runEnd', won: false }]);
  });

  it('normal waves still spawn from budget and then advance under their existing completion rules', () => {
    const w = run('kopitiam-street', 1); const budget = w.budgetLeft;
    step(w, dt, still);
    expect(w.phase).toBe('wave'); expect(w.wave).toBe(1); expect(w.budgetLeft).toBeLessThan(budget); expect(w.enemies.length).toBeGreaterThan(0);
    w.budgetLeft = 0; w.enemies = [];
    step(w, dt, still);
    expect(w.wave).toBe(2); expect(w.phase).toBe('wave'); expect(w.result).toBeNull();
  });
});
