import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { autoInput, autoPick, simulateRun, type BotOptions } from '../autoplay';
import { chooseCard, createRun, drainEvents, step } from '../sim';
import { computeLoadout } from '../../meta/loadout';
import { freshSaveV2 } from '../../meta/migrate';
import { rollItem } from '../../meta/gear';
import { unlocksForXp } from '../../meta/stall';
import { SLOTS } from '../../meta/types';
import { makeRng } from '../rng';
import type { Loadout, RunResult } from '../types';

/** BALANCE_SEEDS=300 gives the full measurement; the default stays quick. BALANCE_FIRST_SEED=301 runs a holdout range. */
const SEED_COUNT = Number(process.env.BALANCE_SEEDS ?? 20);
const FIRST_SEED = Number(process.env.BALANCE_FIRST_SEED ?? 1);
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => FIRST_SEED + i);
const MAX_TIME = 1200;

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** The bot always dodges and stands still; what it picks on level-up is the one knob: how many breads it carries. */
const POLICIES = [
  { name: 'takes new breads (up to 4)', maxBreads: 4 },
  { name: 'takes new breads (up to 2)', maxBreads: 2 },
  { name: 'solo Kosong', maxBreads: 1 },
];

/** Damage Kannan takes from the boss spawn until the boss dies (null when no boss fight happened). */
type Measured = { result: RunResult; bossFightHpLost: number | null; bossAttackHpLost: number | null };

/** The autoplay loop of simulateRun, plus event bookkeeping for the boss fight. */
function measureRun(seed: number, maxBreads: number): Measured {
  const world = createRun({ seed, content: CONTENT });
  const dt = 1 / 30;
  let taken = 0;
  let bossTaken = 0;
  let fight: { start: number; bossStart: number } | null = null;
  let bossFightHpLost: number | null = null;
  let bossAttackHpLost: number | null = null;
  const options: BotOptions = { maxBreads };
  for (let i = 0; i < MAX_TIME * 60 + 1000 && world.phase !== 'won' && world.phase !== 'lost' && world.time < MAX_TIME; i++) {
    if (world.phase === 'levelup') chooseCard(world, autoPick(world, options));
    else step(world, dt, autoInput(world));
    for (const ev of drainEvents(world)) {
      if (ev.t === 'playerHit') {
        taken += ev.dmg;
        if (ev.source === 'boss') bossTaken += ev.dmg;
      } else if (ev.t === 'bossSpawn' && fight === null) {
        fight = { start: taken, bossStart: bossTaken };
      } else if (ev.t === 'kill' && ev.boss && fight !== null && bossFightHpLost === null) {
        bossFightHpLost = taken - fight.start;
        bossAttackHpLost = bossTaken - fight.bossStart;
      }
    }
  }
  const p = world.player;
  const result: RunResult = world.result ?? {
    chapterId: world.chapter.id, bossAttempted: world.bossAttempted ?? false,
    won: false, wave: world.wave, kills: world.kills, bossKills: world.bossKills, time: world.time, level: p.level, gold: Math.round(world.gold),
    breads: p.breads.map((b) => ({ ...b })), dips: p.dips.map((d) => ({ ...d })),
  };
  return { result, bossFightHpLost, bossAttackHpLost };
}

describe(`balance (autoplay bot, real content, seeds ${FIRST_SEED}..${FIRST_SEED + SEED_COUNT - 1})`, () => {
  it('every run ends before maxTime; prints median wave, win rate, avg level / time / kills and boss-fight HP per pick policy', () => {
    // The reporting loop must be the bot's own loop: same seed, same policy, same result.
    expect(measureRun(1, 4).result).toEqual(simulateRun({ seed: 1, content: CONTENT, maxTime: MAX_TIME, maxBreads: 4 }));
    const lines = [
      '| bot picks | median wave | win rate | avg level | avg time (s) | avg kills | boss HP lost (wins) | of which boss shots |',
      '|---|---|---|---|---|---|---|---|',
    ];
    for (const { name, maxBreads } of POLICIES) {
      const runs = SEEDS.map((seed) => measureRun(seed, maxBreads));
      const results = runs.map((r) => r.result);
      for (const r of results) expect(r.time).toBeLessThan(MAX_TIME);
      const wins = results.filter((r) => r.won).length;
      const fights = runs.filter((r) => r.result.won && r.bossFightHpLost !== null);
      const fightCell = (pick: (r: Measured) => number | null): string => (fights.length ? mean(fights.map((r) => pick(r) ?? 0)).toFixed(0) : '-');
      lines.push(
        `| ${name} | ${median(results.map((r) => r.wave))} | ${Math.round((100 * wins) / results.length)}% | ${mean(results.map((r) => r.level)).toFixed(1)} | ${mean(results.map((r) => r.time)).toFixed(0)} | ${mean(results.map((r) => r.kills)).toFixed(0)} | ${fightCell((r) => r.bossFightHpLost)} | ${fightCell((r) => r.bossAttackHpLost)} |`,
      );
    }
    console.log(lines.join('\n'));
  }, 600_000);
});

function boostedLoadout(): Loadout {
  const save = freshSaveV2();
  save.stallXp = 1800;
  save.unlocks = unlocksForXp(save.stallXp);
  save.training = { wrist: 2, stamina: 2, flip: 2 };
  const rng = makeRng(42);
  for (const slot of SLOTS) {
    const item = rollItem(rng, { slot, rarity: 'rare' });
    save.inventory.push(item);
    save.equipped[slot] = item.uid;
  }
  return computeLoadout(save, CONTENT);
}

describe('chapter 2 balance (two training steps each, Rare gear, S2 pools)', () => {
  it('finishes and reports boosted four-bread and solo win rates', () => {
    const loadout = boostedLoadout();
    const lines = ['| chapter | breads | wins / seeds | win rate | median wave |', '|---|---|---|---|---|'];
    for (const maxBreads of [4, 1]) {
      const results = SEEDS.map(seed => simulateRun({ seed, content: CONTENT, chapterId: 'hawker-night', loadout, maxBreads, maxTime: MAX_TIME }));
      for (const result of results) expect(result.time).toBeLessThan(MAX_TIME);
      const wins = results.filter(r => r.won).length;
      const rate = wins / SEED_COUNT;
      lines.push(`| hawker-night | ${maxBreads} | ${wins} / ${SEED_COUNT} | ${(rate * 100).toFixed(1)}% | ${median(results.map(r => r.wave))} |`);
      if (SEED_COUNT >= 300 && FIRST_SEED === 1) {
        expect(rate).toBeGreaterThanOrEqual(maxBreads === 4 ? .45 : .10);
        expect(rate).toBeLessThanOrEqual(maxBreads === 4 ? .65 : .25);
      }
    }
    console.log(lines.join('\n'));
  }, 600_000);
});
