import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { makeRng } from '../rng';
import { autoInput, autoPick, simulateRun } from '../autoplay';
import { chooseCard, createRun, drainEvents, reroll, step } from '../sim';
import type {
  BossAttack, BossDef, BreadDef, BreadId, BreadMotion, BreadStats, BreadTarget, Content, DipDef, DipId, Enemy, EnemyDef, EnemyKind,
  GameEvent, OwnedDip, PassiveDef, PassiveId, PlayerStats, Projectile, RunInput, RunPhase, WaveDef, World,
} from '../types';

// ── Fixtures: a tiny hand-made Content so these tests do not move when the real numbers are tuned ─────────────────

const BREAD_IDS: BreadId[] = ['kosong', 'tissue', 'roti-bomb', 'egg-telur', 'thosai', 'chapati', 'naan', 'garlic-naan', 'murtabak', 'appam', 'idli', 'vadai'];
const DIP_IDS: DipId[] = ['fish-curry', 'condensed-milk', 'mint-chutney', 'masala', 'mutton-curry', 'chicken-curry', 'sambal', 'teh-tarik', 'ghee', 'dhal'];
const PASSIVE_IDS: PassiveId[] = [
  'strong-wrists', 'fast-flip', 'extra-dough', 'big-dough', 'hot-tawa', 'lucky-towel', 'thick-skin', 'kopi-break', 'sharp-eye', 'bigger-tips', 'multitasker', 'second-helping',
];

const ZERO: BreadStats = {
  dmg: 0, cooldown: 1, speed: 0, radius: 0, range: 0, count: 1, spread: 0, volleyGap: 0, pierce: 0, hops: 0, hopRange: 0, hopFalloff: 0,
  fragments: 0, fragmentDmg: 0, blast: 0, lobTime: 0, zoneTime: 0, zoneDps: 0, width: 0, stun: 0, knockback: 0, orbitRadius: 0, orbitHitGap: 0,
  armourPierce: 0, homing: 0,
};
const mkBread = (id: BreadId, motion: BreadMotion, target: BreadTarget, st: Partial<BreadStats>): BreadDef => ({
  id, tags: [], name: id, flavor: '', sprite: `breads/${id}`, motion, target, unlock: id === 'kosong' ? 'starter' : 'rc-test',
  levels: Array.from({ length: 5 }, () => ({ ...ZERO, ...st })),
});
const STRAIGHT = { dmg: 10, cooldown: 0.8, speed: 900, radius: 14, range: 950 };
const BREADS: Partial<Record<BreadId, BreadDef>> = {
  kosong: mkBread('kosong', 'straight', 'nearest', STRAIGHT),
  tissue: mkBread('tissue', 'straight', 'nearest', { ...STRAIGHT, dmg: 5, cooldown: 0.9, speed: 1000, radius: 10, pierce: 2 }),
  'roti-bomb': mkBread('roti-bomb', 'lob', 'cluster', { dmg: 12, cooldown: 1.6, range: 850, blast: 80, lobTime: 0.9 }),
  'garlic-naan': mkBread('garlic-naan', 'lob', 'cluster', { dmg: 6, cooldown: 2.4, range: 850, blast: 90, lobTime: 1.2, zoneTime: 2, zoneDps: 10 }),
  'egg-telur': mkBread('egg-telur', 'straight', 'nearest', { ...STRAIGHT, dmg: 9, speed: 700, radius: 12, fragments: 8, fragmentDmg: 4 }),
  thosai: mkBread('thosai', 'wave', 'none', { dmg: 11, cooldown: 1.2, speed: 700, radius: 20, range: 900, width: 200 }),
  chapati: mkBread('chapati', 'boomerang', 'nearest', { dmg: 7, cooldown: 1.2, speed: 800, radius: 16, range: 600 }),
  murtabak: mkBread('murtabak', 'straight', 'nearest', { ...STRAIGHT, dmg: 16, cooldown: 1.6, speed: 700, radius: 18, knockback: 120, stun: 0.4 }),
  appam: mkBread('appam', 'straight', 'nearest', { ...STRAIGHT, dmg: 8, cooldown: 1, speed: 800, hops: 2, hopRange: 150, hopFalloff: 0.15 }),
  idli: mkBread('idli', 'straight', 'nearest', { ...STRAIGHT, dmg: 3, cooldown: 1, speed: 950, radius: 8, count: 4, volleyGap: 0.1 }),
  vadai: mkBread('vadai', 'orbit', 'none', { dmg: 3, cooldown: 0, speed: 180, radius: 16, count: 1, orbitRadius: 140, orbitHitGap: 0.5 }),
};
const mkDip = (id: DipId, levels: DipDef['levels'][number][]): DipDef => ({ id, family: 'special', name: id, flavor: '', sprite: `dips/${id}`, color: '#112233', unlock: 'rc-test', levels });
const NOOP: DipDef['levels'][number] = { type: 'healOnKill', hp: 0 };
const DIPS: Partial<Record<DipId, DipDef>> = {
  'fish-curry': mkDip('fish-curry', Array(5).fill({ type: 'burn', dps: 10, time: 2 })),
  masala: mkDip('masala', Array(5).fill({ type: 'chain', dmg: 5, jumps: 2, range: 150 })),
  sambal: mkDip('sambal', Array(5).fill({ type: 'deathBlast', dmg: 8, radius: 60 })),
  dhal: mkDip('dhal', Array(5).fill({ type: 'healOnKill', hp: 3 })),
  'teh-tarik': mkDip('teh-tarik', Array(5).fill({ type: 'haste', everyHits: 2, throwSpeedPct: 1, time: 5 })),
};
const mkEnemy = (id: string, kind: EnemyKind, over: Partial<EnemyDef> = {}): EnemyDef => ({
  id, name: id, kind, sprite: `enemies/${id}`, hp: 20, speed: 0, contactDps: 5, xp: 1, radius: 18, ...over,
});
const ANT = mkEnemy('ant', 'walker');
const WAVES: WaveDef[] = [
  { budget: 3, duration: 4, mix: { ant: 1 }, eliteChance: 0 },
  { budget: 3, duration: 4, mix: { ant: 1 }, eliteChance: 0 },
];

function makeContent(o: { enemies?: EnemyDef[]; bosses?: BossDef[]; breads?: Partial<Record<BreadId, BreadDef>>; dips?: Partial<Record<DipId, DipDef>>; waves?: WaveDef[] } = {}): Content {
  const breads = Object.fromEntries(BREAD_IDS.map((id) => [id, o.breads?.[id] ?? BREADS[id] ?? mkBread(id, 'straight', 'nearest', STRAIGHT)])) as Record<BreadId, BreadDef>;
  const dips = Object.fromEntries(DIP_IDS.map((id) => [id, o.dips?.[id] ?? DIPS[id] ?? mkDip(id, Array(5).fill(NOOP))])) as Record<DipId, DipDef>;
  const passives = Object.fromEntries(
    PASSIVE_IDS.map((id) => [id, { id, name: id, desc: '', maxLevel: 3, perLevel: {}, sprite: `passives/${id}` } satisfies PassiveDef]),
  ) as Record<PassiveId, PassiveDef>;
  return {
    breads, dips, passives,
    enemies: Object.fromEntries([ANT, ...(o.enemies ?? [])].map((e) => [e.id, e])),
    bosses: Object.fromEntries((o.bosses ?? []).map((b) => [b.id, b])),
    chapters: [{ id: 'test', name: 'Test', background: 'scene/background', hpPerWave: 0.1, waves: o.waves ?? WAVES }],
    lines: { wake: [], win: [], tips: [] },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────────────────────────────────────────

const STILL: RunInput = { targetX: null, moving: false };
const DT = 1 / 60;

/** A world parked in the intro (no wave director), no crits, with the owned items set directly. */
function mkWorld(content: Content, o: { stats?: Partial<PlayerStats>; breads?: BreadId[]; dips?: [DipId, number][] } = {}): World {
  const w = createRun({ seed: 1, content, loadout: { stats: { critChance: -0.05, ...o.stats } } });
  w.time = -1000;
  w.player.breads = (o.breads ?? ['kosong']).map((id) => ({ id, level: 1, cd: 0.4, volleyLeft: 0, volleyT: 0 }));
  w.player.dips = (o.dips ?? []).map(([id, level]): OwnedDip => ({ id, level }));
  return w;
}

function addEnemy(w: World, def: EnemyDef | BossDef, x: number, y: number, over: Partial<Enemy> = {}): Enemy {
  const e: Enemy = {
    uid: w.nextUid++, def, boss: false, elite: false, x, y, hp: def.hp, maxHp: def.hp, shield: def.shield ?? 0, statuses: [], state: 'walk',
    t: 0, age: 0, knock: 0, flash: 0, cooldowns: { bx: x, ph: 0, _mt: 0 }, phase: 0, holdY: 0, ...over,
  };
  w.enemies.push(e);
  return e;
}

/** Run for `seconds` at 60 Hz; returns every event produced. */
function play(w: World, seconds: number, input: RunInput = STILL): GameEvent[] {
  const out: GameEvent[] = [];
  for (let i = 0, n = Math.round(seconds / DT); i < n; i++) {
    step(w, DT, input);
    out.push(...drainEvents(w));
  }
  return out;
}
type Of<T extends GameEvent['t']> = Extract<GameEvent, { t: T }>;
const of = <T extends GameEvent['t']>(ev: GameEvent[], t: T): Of<T>[] => ev.filter((e): e is Of<T> => e.t === t);
const BIG = mkEnemy('wall', 'tank', { hp: 1e6, contactDps: 0 });

/** Run `seconds` at an explicit step size; returns every event. */
function playAt(w: World, seconds: number, dt: number, input: RunInput = STILL): GameEvent[] {
  const out: GameEvent[] = [];
  for (let i = 0, n = Math.round(seconds / dt); i < n; i++) {
    step(w, dt, input);
    out.push(...drainEvents(w));
  }
  return out;
}

/** A player projectile placed by hand (the bread's L1 stats), so a test controls exactly where it is. */
function proj(w: World, bread: BreadDef, over: Partial<Projectile>): Projectile {
  const st = bread.levels[0];
  const p: Projectile = {
    uid: w.nextUid++, owner: 'player', sprite: bread.sprite, breadId: bread.id, motion: bread.motion, x: 0, y: 0, vx: 0, vy: 0, z: 0, t: 0, ttl: 10,
    dmg: st.dmg, radius: st.radius, pierceLeft: 0, hopsLeft: 0, hit: [], returning: false, targetUid: null, tx: 0, ty: 0, stats: st, spin: 0, ...over,
  };
  w.projectiles.push(p);
  return p;
}

// ── Throwing ──────────────────────────────────────────────────────────────────────────────────────────────────────

describe('throwing', () => {
  it('a straight shot kills a 20 hp enemy in two 10 dmg hits', () => {
    const w = mkWorld(makeContent());
    addEnemy(w, ANT, 0, 400);
    const ev = play(w, 3);
    expect(of(ev, 'hit').map((h) => h.dmg)).toEqual([10, 10]);
    expect(of(ev, 'kill')).toHaveLength(1);
    expect(w.kills).toBe(1);
    expect(w.enemies).toHaveLength(0);
    expect(w.projectiles).toHaveLength(0);
  });

  it('throws only while standing still (Archero rule), and again as soon as he stops', () => {
    const w = mkWorld(makeContent());
    addEnemy(w, BIG, 0, 500);
    const moving: RunInput = { targetX: 100, moving: true };
    expect(of(play(w, 3, moving), 'throw')).toHaveLength(0);
    expect(w.projectiles).toHaveLength(0);
    expect(of(play(w, 1, STILL), 'throw').length).toBeGreaterThan(0);
  });

  it('throwWhileMoving (Multitasker) keeps a share of the rate while moving', () => {
    const w = mkWorld(makeContent(), { stats: { throwWhileMoving: 0.5 } });
    addEnemy(w, BIG, 0, 500);
    const moving = of(play(w, 6, { targetX: 100, moving: true }), 'throw').length;
    const w2 = mkWorld(makeContent());
    addEnemy(w2, BIG, 0, 500);
    const still = of(play(w2, 6, STILL), 'throw').length;
    expect(moving).toBeGreaterThan(0);
    expect(moving).toBeLessThan(still * 0.7);
  });

  it('slides toward targetX at moveSpeed and clamps to the counter', () => {
    const w = mkWorld(makeContent());
    play(w, 0.1, { targetX: 150, moving: true });
    expect(w.player.x).toBeCloseTo(70, 0);
    play(w, 2, { targetX: 9999, moving: true });
    expect(w.player.x).toBe(230);
    expect(w.player.targetX).toBe(230);
  });

  it('does not fire at an enemy beyond range, and sharp eye (rangePct) extends it', () => {
    const w = mkWorld(makeContent());
    addEnemy(w, BIG, 0, 1000);
    expect(of(play(w, 2), 'throw')).toHaveLength(0);
    const w2 = mkWorld(makeContent(), { stats: { rangePct: 0.1 } });
    addEnemy(w2, BIG, 0, 1000);
    expect(of(play(w2, 2), 'throw').length).toBeGreaterThan(0);
  });

  it('leads a walking target so the shot meets it', () => {
    const walker = mkEnemy('walker', 'walker', { hp: 15, speed: 200 });
    const w = mkWorld(makeContent({ enemies: [walker] }));
    addEnemy(w, walker, 120, 800);
    const ev = play(w, 2);
    expect(of(ev, 'hit').length).toBeGreaterThan(0);
    expect(w.kills).toBe(1);
  });

  it('pierce passes through enemies in a line', () => {
    const w = mkWorld(makeContent(), { breads: ['tissue'] });
    const es = [300, 360, 420].map((y) => addEnemy(w, BIG, 0, y));
    play(w, 1.0);
    expect(es.map((e) => e.hp)).toEqual([1e6 - 5, 1e6 - 5, 1e6 - 5]);
  });

  it('a volley keeps firing while Kannan moves, spaced by volleyGap', () => {
    const w = mkWorld(makeContent(), { breads: ['idli'] });
    addEnemy(w, BIG, 0, 600);
    const uid0 = w.nextUid;
    play(w, 0.45, STILL); // first shot at 0.4 s
    const afterFirst = w.nextUid - uid0;
    expect(afterFirst).toBeGreaterThanOrEqual(1);
    play(w, 0.5, { targetX: 200, moving: true });
    expect(w.nextUid - uid0).toBe(4);
  });

  it('extraProjectiles fan out 12 degrees apart, symmetrically', () => {
    const w = mkWorld(makeContent(), { stats: { extraProjectiles: 2 } });
    addEnemy(w, BIG, 0, 800);
    play(w, 0.45);
    const ps = w.projectiles.filter((p) => p.owner === 'player');
    expect(ps).toHaveLength(3);
    const ang = ps.map((p) => (Math.atan2(p.vx, p.vy) * 180) / Math.PI).sort((a, b) => a - b);
    expect(ang[1]).toBeCloseTo(0, 1);
    expect(ang[1] - ang[0]).toBeCloseTo(12, 1);
    expect(ang[2] - ang[1]).toBeCloseTo(12, 1);
  });

  it('size and projectile speed bonuses apply at launch', () => {
    const w = mkWorld(makeContent(), { stats: { sizePct: 0.5 } });
    addEnemy(w, BIG, 0, 800);
    play(w, 0.45);
    expect(w.projectiles[0].radius).toBeCloseTo(21, 5);
  });
});

describe('lob, wave, boomerang, orbit', () => {
  it('a lob blasts every enemy in the radius once, and not the far one', () => {
    const w = mkWorld(makeContent(), { breads: ['roti-bomb'] });
    const near = [addEnemy(w, BIG, -30, 400), addEnemy(w, BIG, 30, 400), addEnemy(w, BIG, 0, 440)];
    const far = addEnemy(w, BIG, 200, 700);
    const ev = play(w, 1.5);
    expect(of(ev, 'blast')).toHaveLength(1);
    expect(of(ev, 'hit')).toHaveLength(3);
    expect(near.map((e) => e.hp)).toEqual([1e6 - 12, 1e6 - 12, 1e6 - 12]);
    expect(far.hp).toBe(1e6);
  });

  it('a lob at a walking boss aims no further than where the boss parks (holdY)', () => {
    const kc: BossDef = { ...mkEnemy('kc', 'walker', { hp: 1e6, speed: 60, contactDps: 0 }), id: 'kc', phases: [], phaseHaste: 0, holdY: 620, attacks: [] };
    const w = mkWorld(makeContent({ bosses: [kc] }), { breads: ['garlic-naan'] });
    addEnemy(w, kc, 0, 900, { boss: true, state: 'walk', holdY: 620 });
    for (let i = 0; i < 60 && !w.projectiles.length; i++) play(w, DT);
    expect(w.projectiles.length).toBeGreaterThan(0);
    expect(w.projectiles[0].ty).toBeGreaterThanOrEqual(620);
  });

  it('cluster targeting bombs the biggest group, not the nearest loner', () => {
    const w = mkWorld(makeContent(), { breads: ['roti-bomb'] });
    const loner = addEnemy(w, BIG, 0, 200);
    const pack = [addEnemy(w, BIG, 200, 600), addEnemy(w, BIG, 230, 600), addEnemy(w, BIG, 215, 640)];
    play(w, 1.5);
    expect(loner.hp).toBe(1e6);
    expect(pack.every((e) => e.hp < 1e6)).toBe(true);
  });

  it('a lob arcs (z rises then falls) and a lingering zone burns what stays inside', () => {
    const w = mkWorld(makeContent(), { breads: ['garlic-naan'] });
    const e = addEnemy(w, BIG, 0, 300);
    let peak = 0;
    for (let i = 0; i < 60 * 2.2; i++) {
      step(w, DT, STILL);
      for (const p of w.projectiles) if (p.motion === 'lob') peak = Math.max(peak, p.z);
    }
    expect(peak).toBeGreaterThan(0.9);
    expect(w.zones.length === 0 || w.zones[0].time > 0).toBe(true);
    // landed at ~1.6 s: 6 blast + zone 10 dps x 2 s (+ a little still ticking at 2.2 s)
    const lost = 1e6 - e.hp;
    expect(lost).toBeGreaterThan(6 + 10 * 0.5);
    expect(lost).toBeLessThanOrEqual(6 + 10 * 2 + 0.001);
  });

  it('a thosai wave hits a whole row once and leaves enemies outside its width alone', () => {
    const w = mkWorld(makeContent(), { breads: ['thosai'] });
    const row = [-80, 0, 80].map((x) => addEnemy(w, BIG, x, 300));
    const out = addEnemy(w, BIG, 200, 300);
    play(w, 1.2);
    expect(row.map((e) => e.hp)).toEqual([1e6 - 11, 1e6 - 11, 1e6 - 11]);
    expect(out.hp).toBe(1e6);
  });

  it('a boomerang hits on the way out and again on the way back, then is caught', () => {
    const w = mkWorld(makeContent(), { breads: ['chapati'] });
    const e = addEnemy(w, BIG, 0, 300);
    const ev = play(w, 1.6); // thrown at 0.4 s, back by ~1.55 s, next throw at 1.6 s
    expect(of(ev, 'hit').filter((h) => h.uid === e.uid)).toHaveLength(2);
    w.enemies.length = 0;
    play(w, 2);
    expect(w.projectiles.filter((p) => p.motion === 'boomerang')).toHaveLength(0);
  });

  it('vadai keeps count + extra orbs circling and bites an enemy on its path once per orbitHitGap', () => {
    const w = mkWorld(makeContent(), { breads: ['vadai'], stats: { extraProjectiles: 1 } });
    play(w, 0.05);
    expect(w.projectiles.filter((p) => p.motion === 'orbit')).toHaveLength(2);
    const w2 = mkWorld(makeContent(), { breads: ['vadai'] });
    // on the ring at 45 degrees: the single orb sweeps past every 2 s (inside one hit window each time)
    const e = addEnemy(w2, BIG, 99, 189);
    const ev = play(w2, 4.5);
    expect(of(ev, 'hit').filter((h) => h.uid === e.uid)).toHaveLength(3);
    expect(w2.projectiles.filter((p) => p.motion === 'orbit')).toHaveLength(1);
  });

  it('egg fragments radiate from the hit and damage neighbours', () => {
    const w = mkWorld(makeContent(), { breads: ['egg-telur'] });
    const mid = addEnemy(w, BIG, 0, 300);
    const side = [addEnemy(w, BIG, 60, 300), addEnemy(w, BIG, -60, 300)];
    play(w, 1.2);
    expect(mid.hp).toBe(1e6 - 9);
    expect(side.every((e) => e.hp < 1e6)).toBe(true);
  });

  it('appam hops to the nearest un-hit enemy with falling damage', () => {
    const w = mkWorld(makeContent(), { breads: ['appam'] });
    addEnemy(w, BIG, 0, 300);
    addEnemy(w, BIG, 100, 300);
    addEnemy(w, BIG, 200, 300);
    const hits = of(play(w, 1.2), 'hit').map((h) => h.dmg);
    expect(hits).toHaveLength(3);
    expect(hits[0]).toBeCloseTo(8);
    expect(hits[1]).toBeCloseTo(8 * 0.85);
    expect(hits[2]).toBeCloseTo(8 * 0.85 * 0.85);
  });

  it('bread knockback shoves enemies back: full, x knockbackTaken for tanks, only 10% for bosses', () => {
    const plain = mkEnemy('plain', 'walker', { hp: 1e6 });
    const tank = mkEnemy('tank', 'tank', { hp: 1e6, knockbackTaken: 0.25 });
    const boss: BossDef = { ...plain, id: 'boss', phases: [], phaseHaste: 0, holdY: 300, attacks: [] };
    for (const [def, isBoss, expected] of [[plain, false, 120], [tank, false, 30], [boss, true, 12]] as const) {
      const w = mkWorld(makeContent({ bosses: [boss] }), { breads: ['murtabak'] });
      const e = addEnemy(w, def, 0, 300, { boss: isBoss, state: isBoss ? 'hold' : 'walk', holdY: 300 });
      play(w, 1.2); // thrown at 0.4 s, lands ~0.8 s, shove done 0.2 s later; the next throw is at 2.0 s
      expect(e.y - 300).toBeCloseTo(expected, 3);
    }
  });

  it('bread stun stops a walker in its tracks for the stun time', () => {
    const walker = mkEnemy('walker', 'walker', { hp: 1e6, speed: 60 });
    const w = mkWorld(makeContent(), { breads: ['murtabak'] });
    const e = addEnemy(w, walker, 0, 500);
    let hitAt = -1;
    let ev: GameEvent[] = [];
    for (let i = 0; i < 60 * 3 && hitAt < 0; i++) {
      step(w, DT, STILL);
      ev = drainEvents(w);
      if (of(ev, 'hit').length) hitAt = i;
    }
    expect(hitAt).toBeGreaterThan(0);
    expect(of(ev, 'status')).toEqual([{ t: 'status', uid: e.uid, status: 'stun' }]);
    play(w, 0.26); // shove finished
    const y = e.y;
    play(w, 0.1); // still stunned (0.4 s)
    expect(e.y).toBe(y);
    play(w, 0.4); // stun over: walking again
    expect(e.y).toBeLessThan(y);
  });
});

// ── Hits, shields, dips ───────────────────────────────────────────────────────────────────────────────────────────

describe('hits', () => {
  const beetle = mkEnemy('beetle', 'shielded', { hp: 30, shield: 25 });

  it('a shield eats straight shots (no hp damage, no dips) until it breaks', () => {
    const w = mkWorld(makeContent({ enemies: [beetle] }), { dips: [['fish-curry', 1]] });
    const e = addEnemy(w, beetle, 0, 300);
    const ev = play(w, 4);
    expect(of(ev, 'shieldHit').length).toBeGreaterThanOrEqual(3);
    expect(of(ev, 'shieldBreak')).toHaveLength(1);
    expect(e.shield).toBe(0);
    // the first three throws (10 + 10 + 10 vs shield 25) never touched hp or applied burn; later ones do
    const firstHp = of(ev, 'hit')[0];
    const breakIdx = ev.findIndex((x) => x.t === 'shieldBreak');
    expect(ev.findIndex((x) => x === firstHp)).toBeGreaterThan(breakIdx);
    expect(ev.slice(0, breakIdx).some((x) => x.t === 'status')).toBe(false);
  });

  it('pierce bypasses the shield', () => {
    const w = mkWorld(makeContent({ enemies: [beetle] }), { breads: ['tissue'] });
    const e = addEnemy(w, beetle, 0, 300);
    play(w, 0.9);
    expect(e.shield).toBe(25);
    expect(e.hp).toBe(25);
  });

  it('a lob blast ignores shields too', () => {
    const w = mkWorld(makeContent({ enemies: [beetle] }), { breads: ['roti-bomb'] });
    const e = addEnemy(w, beetle, 0, 300);
    play(w, 1.5);
    expect(e.shield).toBe(25);
    expect(e.hp).toBe(18);
  });

  it('fish curry burns: a dot number every 0.5 s, 10 dps for 2 s', () => {
    const w = mkWorld(makeContent(), { dips: [['fish-curry', 1]] });
    const e = addEnemy(w, BIG, 0, 300);
    w.player.breads[0].cd = 0;
    play(w, 0.1); // exactly one shot goes out
    w.player.breads[0].cd = 99; // and no more
    const ev = play(w, 3);
    expect(of(ev, 'status').some((s) => s.status === 'burn')).toBe(true);
    const dots = of(ev, 'dot');
    expect(dots.length).toBeGreaterThanOrEqual(3);
    expect(dots.length).toBeLessThanOrEqual(5);
    expect(dots.reduce((s, d) => s + d.dmg, 0)).toBeCloseTo(20, 0);
    expect(dots.every((d) => d.color === '#112233')).toBe(true);
    expect(e.hp).toBeCloseTo(1e6 - 10 - 20, 0);
  });

  it('masala chains to the nearest enemies in range and reports the path', () => {
    const w = mkWorld(makeContent(), { dips: [['masala', 1]] });
    const a = addEnemy(w, BIG, 0, 300);
    const b = addEnemy(w, BIG, 100, 300);
    const c = addEnemy(w, BIG, 100, 400);
    const far = addEnemy(w, BIG, -250, 300);
    w.player.breads[0].cd = 0;
    const ev = play(w, 0.5);
    const chain = of(ev, 'chain');
    expect(chain).toHaveLength(1);
    expect(chain[0].points).toEqual([{ x: 0, y: 300 }, { x: 100, y: 300 }, { x: 100, y: 400 }]);
    expect(1e6 - b.hp).toBe(5);
    expect(1e6 - c.hp).toBe(5);
    expect(far.hp).toBe(1e6);
    expect(1e6 - a.hp).toBe(10);
  });

  it('sambal: a burning enemy that dies blasts and ignites its neighbours', () => {
    const w = mkWorld(makeContent(), { dips: [['fish-curry', 1], ['sambal', 1]] });
    const doomed = addEnemy(w, mkEnemy('d', 'walker', { hp: 5 }), 0, 300);
    const buddy = addEnemy(w, BIG, 40, 300);
    const stranger = addEnemy(w, BIG, 200, 300);
    w.player.breads[0].cd = 0;
    const ev = play(w, 0.5);
    expect(doomed.state).toBe('dead');
    expect(of(ev, 'blast')).toHaveLength(1);
    expect(buddy.hp).toBeLessThan(1e6 - 7); // 8 blast dmg, plus burn ticking
    expect(buddy.statuses.some((s) => s.id === 'burn')).toBe(true);
    expect(stranger.hp).toBe(1e6);
  });

  it('dhal heals on kill; kill gives xp, bumps counters and may drop gold', () => {
    const w = mkWorld(makeContent(), { dips: [['dhal', 1]] });
    w.player.hp = 50;
    addEnemy(w, mkEnemy('a', 'walker', { hp: 5, xp: 2 }), 0, 300);
    w.player.breads[0].cd = 0;
    const ev = play(w, 0.5);
    expect(w.player.hp).toBe(53);
    expect(of(ev, 'heal')[0].hp).toBe(3);
    expect(of(ev, 'kill')[0]).toMatchObject({ enemyId: 'a', xp: 2, boss: false, elite: false });
    expect(w.player.xp).toBe(2);
    expect(w.kills).toBe(1);
    expect(w.gold).toBeLessThanOrEqual(1);
  });

  it('elites pay 3x xp and 5 gold; bosses 50 gold and count as boss kills', () => {
    const w = mkWorld(makeContent());
    addEnemy(w, mkEnemy('a', 'walker', { hp: 5, xp: 2 }), -100, 300, { elite: true });
    const boss = { ...mkEnemy('b', 'tank', { hp: 5, xp: 10 }), phases: [], phaseHaste: 0, holdY: 300, attacks: [] } satisfies BossDef;
    addEnemy(w, boss, 100, 300, { boss: true, state: 'hold', holdY: 300 });
    w.player.breads[0].cd = 0;
    const ev = play(w, 2);
    const kills = of(ev, 'kill');
    expect(kills.find((k) => k.elite)?.xp).toBe(6);
    expect(w.bossKills).toBe(1);
    expect(w.gold).toBeGreaterThanOrEqual(55);
    expect(w.gold).toBeLessThanOrEqual(57);
  });

  it('teh tarik haste speeds up the next throws', () => {
    const w = mkWorld(makeContent(), { dips: [['teh-tarik', 1]] });
    addEnemy(w, BIG, 0, 300);
    const ev = play(w, 6);
    const throws = of(ev, 'throw').length;
    const w2 = mkWorld(makeContent());
    addEnemy(w2, BIG, 0, 300);
    expect(throws).toBeGreaterThan(of(play(w2, 6), 'throw').length);
  });
});

// ── Enemy behaviour ───────────────────────────────────────────────────────────────────────────────────────────────

describe('enemies', () => {
  const imp = mkEnemy('imp', 'shooter', { hp: 1e6, ranged: { minY: 400, maxY: 400, cooldown: 1, aimTime: 0.5, dmg: 6, projSpeed: 500, projSprite: 'fx/flame' } });
  const noBread = (w: World) => {
    w.player.breads = [];
    return w;
  };

  it('a shooter parks, announces its aim at where Kannan stands, then fires; staying put takes the hit', () => {
    const w = noBread(mkWorld(makeContent({ enemies: [imp] })));
    addEnemy(w, imp, 0, 400, { state: 'hold', holdY: 400, cooldowns: { bx: 0, ph: 0, _mt: 0, _cd: 0.2 } });
    const ev = play(w, 2.5);
    const aim = of(ev, 'aim');
    expect(aim.length).toBeGreaterThanOrEqual(1);
    expect(aim[0]).toMatchObject({ tx: 0, time: 0.5 });
    expect(of(ev, 'enemyShot').length).toBeGreaterThanOrEqual(1);
    const hit = of(ev, 'playerHit').filter((h) => h.source === 'shot');
    expect(hit[0].dmg).toBe(6);
    expect(w.player.hp).toBeLessThan(100);
  });

  it('sliding away during the flight dodges the shot (splat), and dodge chance can also dodge', () => {
    const w = noBread(mkWorld(makeContent({ enemies: [imp] })));
    addEnemy(w, imp, 0, 400, { state: 'hold', holdY: 400, cooldowns: { bx: 0, ph: 0, _mt: 0, _cd: 0.2 } });
    const ev = [...play(w, 0.8), ...play(w, 0.5, { targetX: 150, moving: true }), ...play(w, 0.4, STILL)];
    expect(of(ev, 'playerHit')).toHaveLength(0);
    expect(of(ev, 'splat').length).toBeGreaterThanOrEqual(1);
    expect(w.player.hp).toBe(100);

    const w2 = noBread(mkWorld(makeContent({ enemies: [imp] }), { stats: { dodge: 1 } }));
    addEnemy(w2, imp, 0, 400, { state: 'hold', holdY: 400, cooldowns: { bx: 0, ph: 0, _mt: 0, _cd: 0.2 } });
    const ev2 = play(w2, 2.5);
    expect(of(ev2, 'dodge').length).toBeGreaterThanOrEqual(1);
    expect(w2.player.hp).toBe(100);
  });

  it('a shooter walks down to its holdY before it starts', () => {
    const walkIn = mkEnemy('imp2', 'shooter', { hp: 1e6, speed: 100, ranged: { minY: 500, maxY: 500, cooldown: 5, aimTime: 0.5, dmg: 6, projSpeed: 500, projSprite: 'fx/flame' } });
    const w = noBread(mkWorld(makeContent({ enemies: [walkIn] })));
    const e = addEnemy(w, walkIn, 0, 700, { holdY: 500, cooldowns: { bx: 0, ph: 0, _mt: 0, _cd: 0.1 } });
    play(w, 1);
    expect(e.state).toBe('walk');
    play(w, 1.5);
    expect(e.state).toBe('hold');
    expect(e.y).toBe(500);
  });

  it('a splitter splits into count children where it died', () => {
    const blob = mkEnemy('blob', 'splitter', { hp: 10, split: { into: 'pearl', count: 3 } });
    const pearl = mkEnemy('pearl', 'runner', { hp: 6 });
    const w = mkWorld(makeContent({ enemies: [blob, pearl] }));
    addEnemy(w, blob, 0, 300);
    w.player.breads[0].cd = 0;
    play(w, 0.6);
    expect(w.kills).toBe(1);
    const kids = w.enemies.filter((e) => e.def.id === 'pearl');
    expect(kids).toHaveLength(3);
    expect(kids.every((k) => Math.abs(k.x) <= 30 && k.hp === 6)).toBe(true);
  });

  it('a healer heals others within its radius (capped), never itself', () => {
    const healer = mkEnemy('healer', 'healer', { hp: 16, heal: { hps: 10, radius: 120, minY: 300, maxY: 300 } });
    const w = noBread(mkWorld(makeContent({ enemies: [healer] })));
    const h = addEnemy(w, healer, 0, 300, { state: 'hold', holdY: 300, hp: 5 });
    const near = addEnemy(w, ANT, 50, 300, { hp: 5 });
    const far = addEnemy(w, ANT, 250, 300, { hp: 5 });
    play(w, 1);
    expect(near.hp).toBeCloseTo(15, 0);
    expect(far.hp).toBe(5);
    expect(h.hp).toBe(5);
    play(w, 3);
    expect(near.hp).toBe(20);
  });

  it('an exploder fuses at the counter, then blasts Kannan and vanishes without xp', () => {
    const bomb = mkEnemy('bomb', 'exploder', { hp: 22, speed: 100, explode: { fuse: 1, dmg: 30, radius: 90 } });
    const w = noBread(mkWorld(makeContent({ enemies: [bomb] })));
    const e = addEnemy(w, bomb, 0, 100);
    play(w, 1);
    expect(e.state).toBe('fuse');
    const ev = play(w, 1.5);
    expect(e.state).toBe('dead');
    expect(w.enemies).toHaveLength(0);
    expect(of(ev, 'playerHit')[0]).toMatchObject({ dmg: 30, source: 'explode' });
    expect(of(ev, 'blast')).toHaveLength(1);
    expect(w.kills).toBe(0);
    expect(w.player.xp).toBe(0);
    expect(w.player.hp).toBe(70);
  });

  it('contact damage: dps x time, aggregated into one playerHit per 0.5 s, hurt animation on', () => {
    const w = noBread(mkWorld(makeContent()));
    addEnemy(w, ANT, 0, 30, { state: 'attack' });
    addEnemy(w, ANT, 80, 30, { state: 'attack', elite: true });
    const ev = play(w, 2.2);
    expect(w.player.hp).toBeCloseTo(100 - 2.2 * (5 + 7.5), 1);
    const hits = of(ev, 'playerHit');
    expect(hits.every((h) => h.source === 'contact')).toBe(true);
    expect(hits.length).toBe(4);
    expect(hits.reduce((s, h) => s + h.dmg, 0)).toBeCloseTo(25, 0);
    expect(w.player.hurtAnim).toBeGreaterThan(0);
  });

  it('walkers reach the counter and switch to attack; thick skin (dmgTakenPct) raises contact damage', () => {
    const walker = mkEnemy('walker', 'walker', { hp: 100, speed: 100 });
    const w = noBread(mkWorld(makeContent({ enemies: [walker] }), { stats: { dmgTakenPct: 0.5 } }));
    const e = addEnemy(w, walker, 0, 130);
    play(w, 1.5);
    expect(e.state).toBe('attack');
    expect(e.y).toBe(30);
    expect(w.player.hp).toBeLessThan(100 - 5 * 0.5 * 1.5 + 0.01);
  });

  it('runners dash and rest; flyers zigzag around their spawn x; swarms stay near their lane', () => {
    const runner = mkEnemy('roach', 'runner', { hp: 1e6, speed: 100, dash: { go: 0.5, rest: 0.5, boost: 2 } });
    const flyer = mkEnemy('fly', 'flyer', { hp: 1e6, speed: 50, zigzag: { amp: 50, period: 2 } });
    const w = noBread(mkWorld(makeContent({ enemies: [runner, flyer] })));
    const r = addEnemy(w, runner, -100, 900);
    const f = addEnemy(w, flyer, 100, 900);
    let minX = 1e9;
    let maxX = -1e9;
    play(w, 0.25);
    expect(900 - r.y).toBeCloseTo(50, 0); // dashing at 200 u/s
    play(w, 0.5);
    const y1 = r.y;
    play(w, 0.2); // resting until 1.0 s
    expect(r.y).toBeCloseTo(y1, 0);
    for (let i = 0; i < 4 * 60; i++) {
      step(w, DT, STILL);
      minX = Math.min(minX, f.x);
      maxX = Math.max(maxX, f.x);
    }
    expect(minX).toBeLessThan(55);
    expect(maxX).toBeGreaterThan(145);
    expect(minX).toBeGreaterThan(49);
    expect(maxX).toBeLessThan(151);
  });

  it('a summoner spawns its minion beside itself every few seconds, up to max alive nearby', () => {
    const kettle = mkEnemy('kettle', 'summoner', { hp: 1e6, speed: 0, summon: { id: 'ant', every: 1, max: 2 } });
    const w = noBread(mkWorld(makeContent({ enemies: [kettle] })));
    addEnemy(w, kettle, 0, 600, { t: 0.5 });
    play(w, 0.6);
    expect(w.enemies.filter((e) => e.def.id === 'ant')).toHaveLength(1);
    play(w, 5);
    expect(w.enemies.filter((e) => e.def.id === 'ant')).toHaveLength(2);
  });
});

// ── Bosses ────────────────────────────────────────────────────────────────────────────────────────────────────────

describe('bosses', () => {
  const mkBoss = (attack: BossAttack, over: Partial<BossDef> = {}): BossDef => ({
    ...mkEnemy('boss', 'tank', { hp: 1000, speed: 100, radius: 60, xp: 10 }), phases: [0.5], phaseHaste: 0.5, holdY: 500, attacks: [attack], ...over,
  });
  const spawnBoss = (w: World, b: BossDef) => addEnemy(w, b, 0, 500, { boss: true, state: 'hold', holdY: 500 });
  const setup = (attack: BossAttack, over: Partial<BossDef> = {}) => {
    const boss = mkBoss(attack, over);
    const w = mkWorld(makeContent({ bosses: [boss], enemies: [ANT] }));
    w.player.breads = [];
    return { w, boss, e: spawnBoss(w, boss) };
  };

  it('walks into fighting range in two seconds, without overshooting or skipping the tell', () => {
    const { w, e } = setup({ kind: 'rain', id: 'r', name: 'R', tell: 1, cooldown: 100, marks: 1, markWidth: 60, dmg: 18 });
    e.y = 1000;
    e.state = 'walk';
    e.def = { ...e.def, speed: 60 };
    expect(of(play(w, 2), 'bossTell')).toHaveLength(0);
    expect(e.y).toBeCloseTo(520);
    const events = play(w, 0.2);
    expect(e.y).toBe(500);
    expect(of(events, 'bossTell')).toHaveLength(1);
    expect(of(events, 'playerHit')).toHaveLength(0);
  });

  it('volley: tells the landing spots, then fires a symmetric spread; only the shot aimed at Kannan hits', () => {
    const { w, e } = setup({ kind: 'volley', id: 'v', name: 'V', tell: 0.5, cooldown: 100, shots: 3, spread: 100, dmg: 10, projSpeed: 500, projSprite: 'fx/spark' });
    const ev = play(w, 2);
    const tell = of(ev, 'bossTell');
    expect(tell).toHaveLength(1);
    expect(tell[0]).toMatchObject({ attackId: 'v', kind: 'volley', xs: [-100, 0, 100], time: 0.5 });
    expect(of(ev, 'playerHit')).toEqual([{ t: 'playerHit', dmg: 10, source: 'boss' }]);
    expect(of(ev, 'splat')).toHaveLength(2);
    expect(e.cooldowns.v).toBeGreaterThan(0);
  });

  it('charge: lines up in a lane, dashes to the counter, hits only if Kannan is still in the lane, then walks back', () => {
    const atk: BossAttack = { kind: 'charge', id: 'c', name: 'C', tell: 0.5, cooldown: 100, laneWidth: 100, dmg: 25, speed: 1000 };
    const { w, e } = setup(atk);
    const ev = play(w, 1.2);
    expect(of(ev, 'bossTell')[0]).toMatchObject({ kind: 'charge', xs: [0], width: 100 });
    expect(of(ev, 'playerHit')).toEqual([{ t: 'playerHit', dmg: 25, source: 'boss' }]);
    play(w, 3);
    expect(e.y).toBe(500);
    expect(e.state).toBe('hold');

    const t2 = setup(atk);
    const out = [...play(t2.w, 0.3), ...play(t2.w, 0.4, { targetX: 200, moving: true }), ...play(t2.w, 1)];
    expect(of(out, 'bossTell')).toHaveLength(1);
    expect(of(out, 'playerHit')).toHaveLength(0);
    expect(t2.w.player.hp).toBe(100);
  });

  it('rain: marks the counter (one at Kannan), hits only the marks he stands in', () => {
    const atk: BossAttack = { kind: 'rain', id: 'r', name: 'R', tell: 0.5, cooldown: 100, marks: 1, markWidth: 60, dmg: 18 };
    const { w } = setup(atk);
    const ev = play(w, 1);
    expect(of(ev, 'bossTell')[0]).toMatchObject({ kind: 'rain', xs: [0], width: 60 });
    expect(of(ev, 'playerHit')[0]).toMatchObject({ dmg: 18, source: 'boss' });
    const t2 = setup(atk);
    const out = [...play(t2.w, 0.2), ...play(t2.w, 0.3, { targetX: 150, moving: true }), ...play(t2.w, 0.5)];
    expect(of(out, 'splat')).toHaveLength(1);
    expect(of(out, 'playerHit')).toHaveLength(0);
  });

  it('sweep: hits the half Kannan stood on when the tell began', () => {
    const atk: BossAttack = { kind: 'sweep', id: 's', name: 'S', tell: 0.6, cooldown: 100, dmg: 20 };
    const left = setup(atk);
    left.w.player.x = -100;
    left.w.player.targetX = -100;
    const ev = play(left.w, 1);
    expect(of(ev, 'bossTell')[0]).toMatchObject({ kind: 'sweep', xs: [-135], width: 270 });
    expect(of(ev, 'playerHit')).toHaveLength(1);
    const dodge = setup(atk);
    dodge.w.player.x = -100;
    dodge.w.player.targetX = -100;
    const out = [...play(dodge.w, 0.1), ...play(dodge.w, 0.4, { targetX: 100, moving: true }), ...play(dodge.w, 1)];
    expect(of(out, 'playerHit')).toHaveLength(0);
  });

  it('summon: spawns count minions near the boss after the tell', () => {
    const { w } = setup({ kind: 'summon', id: 'm', name: 'M', tell: 0.4, cooldown: 100, enemy: 'ant', count: 3 });
    play(w, 1);
    expect(w.enemies.filter((e) => e.def.id === 'ant')).toHaveLength(3);
  });

  it('attacks never overlap and later phases shorten the cooldown', () => {
    const a: BossAttack = { kind: 'summon', id: 'a', name: 'A', tell: 0.3, cooldown: 2, enemy: 'ant', count: 1 };
    const b: BossAttack = { kind: 'summon', id: 'b', name: 'B', tell: 0.3, cooldown: 2, enemy: 'ant', count: 1 };
    const { w, e } = setup(a, { attacks: [a, b], phaseHaste: 0.5 });
    const ev = play(w, 8);
    const tells = ev.filter((x) => x.t === 'bossTell').length;
    expect(tells).toBeGreaterThanOrEqual(3);
    e.hp = 100; // crosses the 50% phase
    const ev2 = play(w, 0.1);
    expect(of(ev2, 'bossPhase')).toEqual([{ t: 'bossPhase', phase: 1 }]);
    expect(e.phase).toBe(1);
    play(w, 3);
    expect(of(play(w, 0.1), 'bossPhase')).toHaveLength(0);
  });

  it('boss bread knockback is 10% of normal', () => {
    const { w, e } = setup({ kind: 'summon', id: 'm', name: 'M', tell: 0.4, cooldown: 100, enemy: 'ant', count: 0 }, { hp: 1e6, phases: [] });
    w.player.breads = [{ id: 'murtabak', level: 1, cd: 0, volleyLeft: 0, volleyT: 0 }];
    e.hp = e.maxHp = 1e6;
    e.holdY = 500;
    play(w, 0.9);
    expect(e.knock).toBeLessThanOrEqual(12.001);
  });
});

// ── Waves, level-ups, revive, end ─────────────────────────────────────────────────────────────────────────────────

describe('run lifecycle', () => {
  const strong = (): Content => makeContent({ breads: { kosong: mkBread('kosong', 'straight', 'nearest', { ...STRAIGHT, dmg: 1000, cooldown: 0.2 }) } });

  it('createRun: starting state', () => {
    const w = createRun({ seed: 7, content: makeContent(), loadout: { startBread: 'thosai', stats: { revives: 1 } } });
    expect(w).toMatchObject({ phase: 'intro', wave: 0, time: 0, kills: 0, gold: 0, rerolls: 1, rngState: 7, pendingLevelUps: 0 });
    expect(w.player).toMatchObject({ hp: 100, level: 1, xp: 0, xpToNext: 9, revivesLeft: 1, x: 0 });
    expect(w.player.breads).toEqual([{ id: 'thosai', level: 1, cd: 0.4, volleyLeft: 0, volleyT: 0 }]);
    expect(w.chapter.id).toBe('test');
    expect(createRun({ seed: 1, content: makeContent(), chapterId: 'nope' }).chapter.id).toBe('test');
  });

  it('after 1.5 s of intro wave 1 starts; elites and later waves have scaled hp', () => {
    const w = createRun({ seed: 3, content: makeContent({ waves: [{ budget: 40, duration: 2, mix: { ant: 1 }, eliteChance: 1 }, ...WAVES] }) });
    w.player.breads = [];
    const ev = play(w, 1.4);
    expect(w.phase).toBe('intro');
    expect(ev).toHaveLength(0);
    const ev2 = play(w, 0.3);
    expect(w.phase).toBe('wave');
    expect(of(ev2, 'waveStart')).toEqual([{ t: 'waveStart', wave: 1, total: 3 }]);
    play(w, 1);
    expect(w.enemies.length).toBeGreaterThan(0);
    expect(w.enemies.every((e) => e.elite && e.maxHp === 60)).toBe(true);
  });

  it('clearing every wave wins: runEnd, result with bonus gold, and the world stops', () => {
    const w = createRun({ seed: 5, content: strong() });
    for (let i = 0; i < 60 * 40 && w.phase !== 'won'; i++) {
      if (w.phase === 'levelup') chooseCard(w, 0);
      else step(w, DT, STILL);
    }
    expect(w.phase).toBe('won');
    expect(w.wave).toBe(2);
    expect(w.result).toMatchObject({ won: true, wave: 2, kills: w.kills, bossKills: 0 });
    expect(w.result!.gold).toBeGreaterThanOrEqual(5 * 2 + 50);
    expect(drainEvents(w).filter((e) => e.t === 'runEnd')).toEqual([{ t: 'runEnd', won: true }]);
    const t = w.time;
    step(w, DT, STILL);
    expect(w.time).toBe(t);
  });

  it('a boss wave spawns the boss (bossSpawn) and is not over until it dies', () => {
    const boss: BossDef = { ...mkEnemy('kc', 'tank', { hp: 100, speed: 0, radius: 40 }), phases: [], phaseHaste: 0, holdY: 600, attacks: [] };
    const content = makeContent({ bosses: [boss], waves: [{ budget: 1, duration: 1, mix: { ant: 1 }, eliteChance: 0, boss: 'kc' }] });
    const w = createRun({ seed: 5, content });
    w.player.breads = [];
    const ev = play(w, 4);
    expect(of(ev, 'bossSpawn')).toEqual([{ t: 'bossSpawn', bossId: 'kc', name: 'kc' }]);
    expect(w.phase).toBe('wave');
    expect(w.enemies.some((e) => e.boss)).toBe(true);
    w.enemies.find((e) => e.boss)!.hp = 0.001;
    w.player.breads = [{ id: 'kosong', level: 1, cd: 0, volleyLeft: 0, volleyT: 0 }];
    const boss0 = w.enemies.find((e) => e.boss)!;
    boss0.y = 500;
    boss0.holdY = 500;
    for (let i = 0; i < 60 * 20 && w.phase === 'wave'; i++) {
      step(w, DT, STILL);
      if ((w.phase as RunPhase) === 'levelup') chooseCard(w, 0);
    }
    expect(w.bossKills).toBe(1);
    expect(w.phase === 'won' || w.phase === 'levelup').toBe(true);
  });

  it('level-up: xp crossing the threshold pauses the world with 3 cards; reroll once; choose applies and resumes', () => {
    const w = mkWorld(makeContent());
    w.player.xp = 8.5;
    addEnemy(w, mkEnemy('a', 'walker', { hp: 5, xp: 1 }), 0, 200);
    w.player.breads[0].cd = 0;
    const ev = play(w, 1);
    expect(of(ev, 'levelUp')).toEqual([{ t: 'levelUp', level: 2 }]);
    expect(w.phase).toBe('levelup');
    expect(w.player.level).toBe(2);
    expect(w.player.xp).toBeCloseTo(0.5);
    expect(w.player.xpToNext).toBe(13);
    expect(w.offer).toHaveLength(3);
    const before = JSON.stringify(w);
    step(w, DT, STILL);
    expect(JSON.stringify(w)).toBe(before);

    const firstOffer = w.offer;
    expect(w.recentOffers).toEqual([firstOffer]);
    const first = JSON.stringify(w.offer);
    expect(reroll(w)).toBe(true);
    expect(w.rerolls).toBe(0);
    expect(w.recentOffers).toEqual([firstOffer, w.offer]);
    expect(w.offer).toHaveLength(3);
    expect(JSON.stringify(w.offer)).not.toBe(first);
    expect(reroll(w)).toBe(false);

    const card = w.offer[1];
    chooseCard(w, 1);
    expect(w.pendingLevelUps).toBe(0);
    expect(w.offer).toHaveLength(0);
    expect(w.phase).toBe('intro');
    const owned = [...w.player.breads, ...w.player.dips, ...w.player.passives].find((o) => o.id === card.id);
    if (card.kind === 'heal' || card.kind === 'gold') expect(owned).toBeUndefined();
    else expect(owned?.level).toBe(card.level);
    expect(chooseCard(w, 0)).toBeUndefined(); // not in levelup any more: no-op
    expect(reroll(w)).toBe(false);
  });

  it('several level-ups in one step queue their offers one after another', () => {
    const w = mkWorld(makeContent());
    w.player.xp = 0;
    addEnemy(w, mkEnemy('big', 'walker', { hp: 5, xp: 40 }), 0, 200);
    w.player.breads[0].cd = 0;
    play(w, 1);
    expect(w.phase).toBe('levelup');
    expect(w.pendingLevelUps).toBeGreaterThanOrEqual(2);
    const n = w.pendingLevelUps;
    const firstOffer = w.offer;
    chooseCard(w, 0);
    expect(w.phase).toBe('levelup');
    expect(w.pendingLevelUps).toBe(n - 1);
    expect(w.offer).toHaveLength(3);
    expect(w.recentOffers).toEqual([firstOffer, w.offer]);
    const secondOffer = w.offer;
    expect(reroll(w)).toBe(true);
    expect(w.recentOffers).toEqual([secondOffer, w.offer]);
  });

  it('chooseCard keeps loadout stats (Kopi Break style recompute does not lose them)', () => {
    const w = mkWorld(makeContent(), { stats: { maxHp: 50 } });
    expect(w.player.stats.maxHp).toBe(150);
    w.phase = 'levelup';
    w.pendingLevelUps = 1;
    w.offer = [{ kind: 'passive', id: 'thick-skin', level: 1 }];
    chooseCard(w, 0);
    expect(w.player.stats.maxHp).toBe(150);
    expect(w.player.stats.critChance).toBeCloseTo(0);
  });

  it('Second Helping: one revive at half hp, shoves the crowd back and wipes enemy shots; then the next death ends the run', () => {
    const w = mkWorld(makeContent(), { stats: { revives: 1 } });
    w.player.breads = [];
    const ants = [addEnemy(w, ANT, -50, 30, { state: 'attack' }), addEnemy(w, ANT, 50, 100)];
    const far = addEnemy(w, ANT, 100, 600);
    w.player.hp = 0.01;
    const ev = play(w, 0.05);
    expect(of(ev, 'revive')).toHaveLength(1);
    expect(w.player.revivesLeft).toBe(0);
    expect(w.player.hp).toBeGreaterThan(45);
    expect(w.phase).toBe('intro');
    play(w, 0.7);
    expect(ants.every((a) => a.y > 250)).toBe(true);
    expect(far.y).toBe(600);

    w.player.hp = 0.001;
    addEnemy(w, ANT, 0, 30, { state: 'attack' });
    const end = play(w, 0.2);
    expect(w.phase).toBe('lost');
    expect(of(end, 'runEnd')).toEqual([{ t: 'runEnd', won: false }]);
    expect(w.result).toMatchObject({ won: false, wave: 0, kills: 0 });
  });

  it('enemy projectiles are cleared by a revive', () => {
    const imp = mkEnemy('imp', 'shooter', { hp: 1e6, ranged: { minY: 400, maxY: 400, cooldown: 0.1, aimTime: 0.1, dmg: 1, projSpeed: 100, projSprite: 'fx/flame' } });
    const w = mkWorld(makeContent({ enemies: [imp] }), { stats: { revives: 1 } });
    w.player.breads = [];
    addEnemy(w, imp, 0, 400, { state: 'hold', holdY: 400, cooldowns: { bx: 0, ph: 0, _mt: 0, _cd: 0 } });
    play(w, 1);
    expect(w.projectiles.some((p) => p.owner === 'enemy')).toBe(true);
    w.player.hp = 0;
    play(w, 0.02);
    expect(w.projectiles.some((p) => p.owner === 'enemy')).toBe(false);
  });

  it('dropping in a long dt is split into small steps', () => {
    const w = mkWorld(makeContent());
    addEnemy(w, ANT, 0, 100, { state: 'attack' });
    w.enemies[0].y = 30;
    step(w, 1, STILL);
    expect(w.time).toBeCloseTo(-999, 5);
    expect(w.player.hp).toBeCloseTo(95, 1);
  });
});

// ── More rules ────────────────────────────────────────────────────────────────────────────────────────────────────

describe('more rules', () => {
  it('drainEvents hands the events over once', () => {
    const w = mkWorld(makeContent());
    addEnemy(w, ANT, 0, 400);
    for (let i = 0; i < 30; i++) step(w, DT, STILL);
    const first = drainEvents(w);
    expect(first.length).toBeGreaterThan(0);
    expect(drainEvents(w)).toEqual([]);
  });

  it('crits multiply damage and are flagged', () => {
    const w = mkWorld(makeContent(), { stats: { critChance: 1 } }); // 0.05 - 0.05 + 1 -> always
    addEnemy(w, BIG, 0, 300);
    const h = of(play(w, 1), 'hit')[0];
    expect(h).toMatchObject({ crit: true });
    expect(h.dmg).toBeCloseTo(15);
  });

  it('later waves spawn tougher enemies (hpPerWave) and a stunned enemy at the counter does not hurt', () => {
    const w = createRun({ seed: 2, content: makeContent({ waves: [{ budget: 2, duration: 1, mix: { ant: 1 }, eliteChance: 0 }, { budget: 2, duration: 1, mix: { ant: 1 }, eliteChance: 0 }] }) });
    w.player.breads = [];
    play(w, 3);
    expect(w.wave).toBeGreaterThanOrEqual(2);
    expect(w.enemies.some((e) => e.maxHp === 22)).toBe(true);

    const w2 = mkWorld(makeContent());
    w2.player.breads = [];
    addEnemy(w2, ANT, 0, 30, { state: 'attack', statuses: [{ id: 'stun', time: 1, stacks: 1, dps: 0, amount: 0 }] });
    play(w2, 0.9);
    expect(w2.player.hp).toBe(100);
    play(w2, 0.5);
    expect(w2.player.hp).toBeLessThan(100);
  });

  it('healOnLevelUpPct heals on level-up and goldPct scales gold', () => {
    const w = mkWorld(makeContent(), { stats: { healOnLevelUpPct: 0.2, goldPct: 1 } });
    w.player.hp = 50;
    w.player.xp = 8.5;
    addEnemy(w, mkEnemy('a', 'walker', { hp: 5, xp: 1 }), 0, 200, { elite: true });
    w.player.breads[0].cd = 0;
    const ev = play(w, 1);
    expect(of(ev, 'heal')).toEqual([{ t: 'heal', hp: 20 }]);
    expect(w.player.hp).toBe(70);
    expect(w.gold).toBeGreaterThanOrEqual(10); // elite 5, doubled
    expect(w.gold).toBeLessThanOrEqual(12);
  });

  it('Second Helping picked mid-run grants a usable revive', () => {
    const content = makeContent();
    content.passives['second-helping'].perLevel = { revives: 1 };
    const w = mkWorld(content);
    expect(w.player.revivesLeft).toBe(0);
    w.phase = 'levelup';
    w.pendingLevelUps = 1;
    w.offer = [{ kind: 'passive', id: 'second-helping', level: 1 }];
    chooseCard(w, 0);
    expect(w.player.revivesLeft).toBe(1);
  });

  it('orbs are rebuilt when the bread levels up or the ring grows', () => {
    const content = makeContent();
    content.breads.vadai.levels[1] = { ...content.breads.vadai.levels[1], count: 3 };
    const w = mkWorld(content, { breads: ['vadai'] });
    play(w, 0.05);
    expect(w.projectiles.filter((p) => p.motion === 'orbit')).toHaveLength(1);
    w.player.breads[0].level = 2;
    play(w, 0.05);
    const orbs = w.projectiles.filter((p) => p.motion === 'orbit');
    expect(orbs).toHaveLength(3);
    expect(new Set(orbs.map((o) => o.targetUid)).size).toBe(3);
    // evenly spaced on the ring
    const ang = orbs.map((o) => Math.atan2(o.y - 90, o.x - w.player.x)).sort((a, b) => a - b);
    expect(ang[1] - ang[0]).toBeCloseTo((2 * Math.PI) / 3, 1);
  });

  it('extra projectiles send extra lobs to the next-best clusters; count 2 sends two bombs at once', () => {
    const content = makeContent();
    content.breads['roti-bomb'].levels = content.breads['roti-bomb'].levels.map((l) => ({ ...l, count: 2 }));
    const w = mkWorld(content, { breads: ['roti-bomb'] });
    const packA = [addEnemy(w, BIG, -200, 500), addEnemy(w, BIG, -190, 520), addEnemy(w, BIG, -210, 520)];
    const packB = [addEnemy(w, BIG, 200, 500), addEnemy(w, BIG, 190, 520)];
    const ev = play(w, 1.5);
    expect(of(ev, 'throw')).toHaveLength(1);
    expect(of(ev, 'blast')).toHaveLength(2);
    expect(packA.every((e) => e.hp < 1e6)).toBe(true);
    expect(packB.every((e) => e.hp < 1e6)).toBe(true);
  });

  it('a frozen boss still fights: its attack timers run (a boss is only slowed, never stopped)', () => {
    const boss: BossDef = {
      ...mkEnemy('boss', 'tank', { hp: 1000, radius: 60 }), phases: [], phaseHaste: 0, holdY: 500,
      attacks: [{ kind: 'summon', id: 'm', name: 'M', tell: 0.2, cooldown: 1, enemy: 'ant', count: 1 }],
    };
    const w = mkWorld(makeContent({ bosses: [boss] }));
    w.player.breads = [];
    addEnemy(w, boss, 0, 500, { boss: true, state: 'hold', holdY: 500, cooldowns: { bx: 0, ph: 0, _mt: 0, m: 1 }, statuses: [{ id: 'freeze', time: 3, stacks: 1, dps: 0, amount: 0 }] });
    expect(of(play(w, 2.5), 'bossTell').length).toBeGreaterThanOrEqual(1);
  });

  it('a frozen or stunned boss keeps walking in, at 60% speed; an ordinary enemy stops dead', () => {
    const boss: BossDef = { ...mkEnemy('boss', 'tank', { hp: 1e6, radius: 60, speed: 100, contactDps: 0 }), phases: [], phaseHaste: 0, holdY: 100, attacks: [] };
    const walker = mkEnemy('walker', 'walker', { hp: 1e6, speed: 100, contactDps: 0 });
    const frozen = (id: 'freeze' | 'stun') => [{ id, time: 5, stacks: 1, dps: 0, amount: 0 }];
    const travelled = (def: EnemyDef | BossDef, boss: boolean, statuses: Enemy['statuses']): number => {
      const w = mkWorld(makeContent({ bosses: boss ? [def as BossDef] : [], enemies: boss ? [] : [def] }));
      w.player.breads = [];
      const e = addEnemy(w, def, 0, 900, { boss, holdY: 100, statuses });
      play(w, 2);
      return 900 - e.y;
    };
    const free = travelled(boss, true, []);
    expect(free).toBeCloseTo(800, 0);
    expect(travelled(boss, true, frozen('freeze'))).toBeCloseTo(free * 0.6, 0);
    expect(travelled(boss, true, frozen('stun'))).toBeCloseTo(free * 0.6, 0);
    expect(travelled(walker, false, frozen('freeze'))).toBe(0);
    expect(travelled(walker, false, frozen('stun'))).toBe(0);
  });

  it('freezes cannot chain: after one ends the enemy shrugs off the next for 3 s (chill still stacks), then it can be frozen again', () => {
    const chill = { type: 'chill', slowPerStack: 0.1, time: 5, freezeAt: 2, freezeTime: 1 } as const;
    const w = mkWorld(makeContent({ dips: { 'mint-chutney': mkDip('mint-chutney', Array(5).fill(chill)) } }), { dips: [['mint-chutney', 1]] });
    const wall = addEnemy(w, WALL_TOUGH, 0, 400);
    const events: GameEvent[] = [];
    const freezes: number[] = [];
    const turnedAway: number[] = [];
    for (let i = 0; i < Math.round(20 / DT); i++) {
      step(w, DT, STILL);
      for (const ev of drainEvents(w)) {
        events.push(ev);
        if (ev.t === 'status' && ev.status === 'freeze') freezes.push(w.time);
        if (ev.t === 'status' && ev.status === 'ccImmune') turnedAway.push(w.time);
      }
    }
    expect(freezes.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < freezes.length; i++) expect(freezes[i] - freezes[i - 1], `freeze ${i}`).toBeGreaterThanOrEqual(1 + 3 - 0.05); // its 1 s, then 3 s of immunity
    expect(wall.hp).toBeLessThan(wall.maxHp); // and it was being hit all along
    expect(of(events, 'status').some((ev) => ev.status === 'ccImmune')).toBe(true); // 'ccImmune' says: the immunity just began, or turned a freeze away
  });

  it('keeps every number finite over a long messy fight', () => {
    const w = createRun({ seed: 9, content: CONTENT });
    for (let i = 0; i < 30 * 120; i++) {
      if (w.phase === 'levelup') chooseCard(w, autoPick(w));
      else step(w, 1 / 30, autoInput(w));
      if (w.events.length > 4000) drainEvents(w);
    }
    const bad: string[] = [];
    const walk = (v: unknown, path: string): void => {
      if (typeof v === 'number') {
        if (!Number.isFinite(v)) bad.push(path);
      } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
      else if (v && typeof v === 'object' && path.split('.').length < 6) for (const [k, x] of Object.entries(v)) if (k !== 'content' && k !== 'def' && k !== 'chapter') walk(x, `${path}.${k}`);
    };
    walk(w, 'w');
    expect(bad).toEqual([]);
  }, 60_000);
});

// ── Fuzz: random builds, inputs and crowds never break the rules ─────────────────────────────────────────────────

describe('fuzz', () => {
  const BREADS_ALL = Object.keys(CONTENT.breads) as BreadId[];
  const DIPS_ALL = Object.keys(CONTENT.dips) as DipId[];

  /** Throws on the first thing that should never happen to a World. */
  function invariants(w: World, where: string): void {
    const bad = (m: string): never => {
      throw new Error(`${where} t=${w.time.toFixed(2)} phase=${w.phase}: ${m}`);
    };
    const p = w.player;
    if (![p.x, p.hp, p.xp].every(Number.isFinite)) bad('player not finite');
    if (p.hp > p.stats.maxHp + 1e-6) bad('hp above max');
    const uids = new Set<number>();
    for (const e of w.enemies) {
      if (![e.x, e.y, e.hp, e.maxHp, e.shield, e.knock, e.t, e.holdY, ...Object.values(e.cooldowns)].every(Number.isFinite)) bad(`enemy ${e.def.id} not finite`);
      if (e.state === 'dead') bad('dead enemy left in the list');
      if (e.hp > e.maxHp + 1e-6) bad(`enemy ${e.def.id} above max hp`);
      if (e.y < 0 || e.y > 1100 || Math.abs(e.x) > 300) bad(`enemy ${e.def.id} off the field (${e.x}, ${e.y})`);
      if (uids.has(e.uid)) bad('duplicate uid');
      uids.add(e.uid);
    }
    for (const s of w.projectiles) {
      if (![s.x, s.y, s.vx, s.vy, s.z, s.t, s.ttl, s.dmg, s.radius].every(Number.isFinite)) bad(`projectile ${s.motion} not finite`);
      if (s.ttl < 0) bad('spent projectile left in the list');
      if (uids.has(s.uid)) bad('duplicate uid');
      uids.add(s.uid);
    }
  }

  it('random loadouts, builds, inputs and step sizes: every run ends, nothing goes non-finite or off the field', () => {
    let ended = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const r = makeRng(seed * 7919);
      const w = createRun({
        seed, content: CONTENT,
        loadout: {
          stats: {
            extraProjectiles: r.int(0, 3), sizePct: r.range(0, 0.6), rangePct: r.range(0, 0.4), dodge: r.chance(0.3) ? 0.3 : 0, revives: r.int(0, 2),
            throwWhileMoving: r.chance(0.5) ? r.range(0, 0.75) : 0, critChance: r.range(0, 0.4), throwSpeedPct: r.range(0, 1.5), dotPct: r.range(0, 1),
            dmgPct: seed % 3 === 0 ? 4 : seed % 3 === 1 ? r.range(0, 1) : -0.5, maxHp: seed % 3 === 2 ? -80 : r.range(-50, 100), xpPct: r.range(0, 1.5),
          },
        },
      });
      const picked = new Set<BreadId>();
      w.player.breads = Array.from({ length: r.int(1, 4) }, () => BREADS_ALL[r.int(0, BREADS_ALL.length - 1)])
        .filter((id) => !picked.has(id) && picked.add(id))
        .map((id) => ({ id, level: r.int(1, 5), cd: 0, volleyLeft: 0, volleyT: 0 }));
      const dipPicked = new Set<DipId>();
      w.player.dips = Array.from({ length: r.int(0, 4) }, () => DIPS_ALL[r.int(0, DIPS_ALL.length - 1)])
        .filter((id) => !dipPicked.has(id) && dipPicked.add(id))
        .map((id) => ({ id, level: r.int(1, 5) }));
      w.player.hp = w.player.stats.maxHp;
      let tx: number | null = null;
      let moving = false;
      for (let i = 0; i < 30 * 420 && w.phase !== 'won' && w.phase !== 'lost'; i++) {
        if (w.phase === 'levelup') {
          if (r.chance(0.3)) reroll(w);
          chooseCard(w, r.int(0, 2));
          continue;
        }
        if (i % 15 === 0) {
          tx = r.chance(0.3) ? null : r.range(-260, 260);
          moving = r.chance(0.4);
        }
        step(w, r.chance(0.05) ? r.range(0.04, 0.2) : 1 / 30, { targetX: tx, moving });
        drainEvents(w);
        invariants(w, `seed ${seed} step ${i}`);
      }
      if (w.phase === 'won' || w.phase === 'lost') ended++;
      expect(JSON.parse(JSON.stringify(w)).time).toBe(w.time);
    }
    expect(ended).toBe(24);
  }, 120_000);

  it('a crowd of 100+ enemies of every kind plus both bosses, with a stacked build', () => {
    const ids = Object.keys(CONTENT.enemies);
    for (let seed = 1; seed <= 8; seed++) {
      const r = makeRng(seed * 104729);
      const w = createRun({ seed, content: CONTENT, loadout: { stats: { extraProjectiles: r.int(0, 3), dmgPct: 2, throwSpeedPct: 1, maxHp: 400 } } });
      w.player.breads = [...new Set(Array.from({ length: 4 }, () => BREADS_ALL[r.int(0, BREADS_ALL.length - 1)]))].map((id) => ({ id, level: r.int(1, 5), cd: 0, volleyLeft: 0, volleyT: 0 }));
      w.player.dips = [...new Set(Array.from({ length: 4 }, () => DIPS_ALL[r.int(0, DIPS_ALL.length - 1)]))].map((id) => ({ id, level: r.int(1, 5) }));
      w.player.hp = w.player.stats.maxHp;
      w.time = -1000; // no wave director: the crowd is placed by hand
      const spawn = (id: string, boss: boolean): void => {
        const def = boss ? CONTENT.bosses[id] : CONTENT.enemies[id];
        const e = addEnemy(w, def, r.range(-250, 250), r.range(300, 1000), { boss, elite: r.chance(0.2), hp: def.hp * 5, maxHp: def.hp * 5 });
        e.cooldowns.ph = r.range(0, 6);
        if (boss) {
          e.holdY = (def as BossDef).holdY;
          for (const a of (def as BossDef).attacks) e.cooldowns[a.id] = a.cooldown * 0.3;
        }
        if (def.ranged) {
          e.holdY = r.range(def.ranged.minY, def.ranged.maxY);
          e.cooldowns._cd = 0.5;
        }
        if (def.heal) e.holdY = r.range(def.heal.minY, def.heal.maxY);
        if (def.summon) e.t = 1;
      };
      for (let i = 0; i < 110; i++) spawn(ids[r.int(0, ids.length - 1)], false);
      spawn('king-cockroach', true);
      spawn('burger-baron', true);
      let most = 0;
      for (let i = 0; i < 30 * 40 && w.phase !== 'lost'; i++) {
        if (w.phase === 'levelup') {
          chooseCard(w, r.int(0, 2));
          continue;
        }
        step(w, 1 / 30, { targetX: i % 90 < 30 ? r.range(-230, 230) : null, moving: i % 90 < 30 });
        drainEvents(w);
        invariants(w, `crowd seed ${seed} step ${i}`);
        most = Math.max(most, w.enemies.length);
        while (w.enemies.length < 90 && i < 30 * 30) spawn(ids[r.int(0, ids.length - 1)], false);
      }
      expect(most).toBeGreaterThan(90);
    }
  }, 120_000);
});

// ── Regressions for the Codex review of the sim (docs/reviews/codex-sim-1.md) ──────────────────────────────────────

describe('review fixes', () => {
  const stand = (bread: BreadDef, extra: Partial<Record<BreadId, BreadDef>> = {}): Content => makeContent({ breads: { [bread.id]: bread, ...extra } });

  it('#1 no throws while still sliding to targetX, even after the finger lifts', () => {
    const w = mkWorld(makeContent());
    addEnemy(w, BIG, 0, 500);
    w.player.breads[0].cd = 0; // ready to throw the moment he may
    const ev: GameEvent[] = [];
    step(w, DT, { targetX: 200, moving: true });
    ev.push(...drainEvents(w));
    let slid = 0;
    while (w.player.x < 199 && slid < 200) {
      step(w, DT, STILL); // finger up: no targetX, moving false
      ev.push(...drainEvents(w));
      expect(w.player.moving).toBe(true);
      slid++;
    }
    expect(slid).toBeGreaterThan(10);
    expect(of(ev, 'throw')).toHaveLength(0);
    expect(w.projectiles).toHaveLength(0);
    ev.push(...play(w, 0.3));
    expect(w.player.moving).toBe(false);
    expect(of(ev, 'throw').length).toBeGreaterThan(0);
  });

  it('#2 armourPierce: that share of a shielded hit bypasses the shield to hp', () => {
    const beetle = mkEnemy('beetle', 'shielded', { hp: 30, shield: 25 });
    const withAp = (ap: number): Content => stand(mkBread('kosong', 'straight', 'nearest', { ...STRAIGHT, armourPierce: ap }), {});
    const first = (ap: number, hp = 30): { ev: GameEvent[]; e: Enemy } => {
      const w = mkWorld(makeContent({ enemies: [{ ...beetle, hp }], breads: { kosong: withAp(ap).breads.kosong } }));
      const e = addEnemy(w, { ...beetle, hp }, 0, 300);
      w.player.breads[0].cd = 0;
      return { ev: play(w, 0.7), e }; // one throw
    };
    const a = first(0.4);
    expect(of(a.ev, 'shieldHit')).toHaveLength(1);
    expect(a.e.shield).toBeCloseTo(25 - 6);
    expect(a.e.hp).toBeCloseTo(30 - 4);
    expect(of(a.ev, 'hit').map((h) => h.dmg)).toEqual([expect.closeTo(4)]);
    expect(a.ev.some((x) => x.t === 'status')).toBe(false); // still no dips on a shield hit
    const all = first(1);
    expect(all.e.shield).toBe(25);
    expect(all.e.hp).toBeCloseTo(20);
    const none = first(0);
    expect(none.e.hp).toBe(30);
    expect(of(none.ev, 'hit')).toHaveLength(0);
    const kill = first(0.5, 4); // 5 of the hit goes to hp, enough to finish it
    expect(kill.e.state).toBe('dead');
    expect(of(kill.ev, 'kill')).toHaveLength(1);
  });

  it('#3 an exploder only hurts Kannan inside its radius, and only while it is still at the counter', () => {
    const bomb = mkEnemy('bomb', 'exploder', { hp: 22, speed: 100, explode: { fuse: 1, dmg: 30, radius: 90 } });
    const blow = (playerX: number, bombY = 30): { hp: number; blasts: number } => {
      const w = mkWorld(makeContent({ enemies: [bomb] }));
      w.player.breads = [];
      w.player.x = w.player.targetX = playerX;
      addEnemy(w, bomb, 0, bombY, { state: 'fuse', t: 0.05 });
      const ev = play(w, 0.2);
      return { hp: w.player.hp, blasts: of(ev, 'blast').length };
    };
    expect(blow(0)).toEqual({ hp: 70, blasts: 1 });
    expect(blow(90)).toEqual({ hp: 70, blasts: 1 }); // right on the edge
    expect(blow(91)).toEqual({ hp: 100, blasts: 1 });
    expect(blow(-230)).toEqual({ hp: 100, blasts: 1 });
    expect(blow(0, 300)).toEqual({ hp: 100, blasts: 1 }); // shoved up the street before it went off
  });

  it('#4 an orb bites an enemy at most once per orbitHitGap, whatever the clock does; each orb keeps its own', () => {
    // The orb crosses (0, 230) at 0.5 s, right on the old global 0.5 s window edge.
    const w = mkWorld(makeContent(), { breads: ['vadai'] });
    const e = addEnemy(w, BIG, 0, 230);
    const ev = play(w, 1.2);
    expect(of(ev, 'hit').filter((h) => h.uid === e.uid)).toHaveLength(1);

    // An enemy the orb never leaves: one bite per 0.5 s, spaced at least the gap apart.
    const huge = mkEnemy('huge', 'tank', { hp: 1e9, radius: 400, contactDps: 0 });
    const bites = (extra: number): number[] => {
      const w2 = mkWorld(makeContent(), { breads: ['vadai'], stats: { extraProjectiles: extra } });
      addEnemy(w2, huge, 0, 90);
      const times: number[] = [];
      for (let i = 0; i < 60 * 3.2; i++) {
        step(w2, DT, STILL);
        for (const h of drainEvents(w2)) if (h.t === 'hit') times.push(w2.time);
      }
      return times;
    };
    const one = bites(0);
    expect(one.length).toBeGreaterThanOrEqual(6);
    expect(one.length).toBeLessThanOrEqual(7);
    for (let i = 1; i < one.length; i++) expect(one[i] - one[i - 1]).toBeGreaterThanOrEqual(0.5 - 1e-6);
    const two = bites(1);
    expect(two.length).toBeGreaterThanOrEqual(2 * one.length - 2);
    expect(two.length).toBeLessThanOrEqual(2 * one.length);
  });

  it('#5 the enemy a shot touches first is hit first, not the one whose centre is nearest the path', () => {
    const content = makeContent();
    const small = mkEnemy('small', 'tank', { hp: 1e6, contactDps: 0, radius: 5 });
    const large = mkEnemy('large', 'tank', { hp: 1e6, contactDps: 0, radius: 40 });
    const run = (pierce: number): { order: number[]; uids: Record<string, number> } => {
      const w = mkWorld(content);
      w.player.breads = [];
      const s = addEnemy(w, small, 0, 140); // listed first, so a tie would pick it
      const l = addEnemy(w, large, 0, 160);
      proj(w, content.breads.kosong, { x: 0, y: 100, vy: 900, radius: 10, pierceLeft: pierce });
      step(w, 1 / 30, STILL); // one 30 u step covers both contacts: the large one from y 110, the small one from y 125
      return { order: of(drainEvents(w), 'hit').map((h) => h.uid), uids: { small: s.uid, large: l.uid } };
    };
    const single = run(0);
    expect(single.order).toEqual([single.uids.large]);
    const both = run(1);
    expect(both.order).toEqual([both.uids.large, both.uids.small]);
  });

  it('#6 a wave bar that jumps past a small enemy in one step still hits it, at any step size', () => {
    const fast = mkBread('thosai', 'wave', 'none', { dmg: 11, cooldown: 99, speed: 6000, radius: 20, range: 900, width: 200 });
    const tiny = mkEnemy('tiny', 'tank', { hp: 1e6, contactDps: 0, radius: 5 });
    for (const dt of [1 / 30, 1 / 60, 1 / 120]) {
      const w = mkWorld(stand(fast), { breads: ['thosai'] });
      addEnemy(w, tiny, 0, 100);
      const hits = of(playAt(w, 0.8, dt), 'hit');
      expect(hits).toHaveLength(1);
    }
  });

  it('#7 a boomerang resolves its last outgoing hits before it turns, so the return pass hits again', () => {
    const content = makeContent();
    const w = mkWorld(content);
    w.player.breads = [];
    const e = addEnemy(w, BIG, 0, 556); // reach 522..590: the turn-frame segment (580..600) clips its edge
    proj(w, content.breads.chapati, { x: 0, y: 580, vy: 800, t: 580 / 800, ty: 600, hit: [e.uid] });
    step(w, 1 / 30, STILL);
    expect(of(drainEvents(w), 'hit')).toHaveLength(0); // already hit on the way out: not again at the turn
    expect(w.projectiles[0].returning).toBe(true);
    expect(of(play(w, 0.3), 'hit').filter((h) => h.uid === e.uid)).toHaveLength(1); // the return pass
  });

  it('#8 a boomerang reaching the catch point still hits what its last return segment crosses', () => {
    const content = makeContent();
    const w = mkWorld(content);
    w.player.breads = [];
    const e = addEnemy(w, BIG, 0, 30);
    proj(w, content.breads.chapati, { x: 0, y: 60, vy: -3000, returning: true, ty: 600, t: 0.3 });
    step(w, 1 / 30, STILL); // 100 u of travel, 30 u to the catch point
    expect(of(drainEvents(w), 'hit').filter((h) => h.uid === e.uid)).toHaveLength(1);
    expect(w.projectiles.filter((p) => p.motion === 'boomerang')).toHaveLength(0);
  });

  it('#9 a new throw waits for the unfinished volley', () => {
    // 3 shots 0.2 s apart (0.4 s) but a 0.3 s cooldown: the next throw used to overwrite the volley.
    const burst = mkBread('kosong', 'straight', 'nearest', { ...STRAIGHT, dmg: 1, cooldown: 0.3, count: 3, volleyGap: 0.2 });
    const w = mkWorld(stand(burst));
    addEnemy(w, BIG, 0, 700);
    let made = 0;
    let throws = 0;
    for (let i = 0; i < 60 * 3; i++) {
      const before = w.nextUid;
      step(w, DT, STILL);
      made += w.nextUid - before;
      if (of(drainEvents(w), 'throw').length) {
        throws++;
        expect((made - 1) % 3).toBe(0); // beyond this throw's own first shot, only whole earlier volleys were fired
      }
    }
    expect(throws).toBeGreaterThanOrEqual(3);
  });

  it('#10 shots and waves do nothing beyond their range', () => {
    const lance = mkBread('kosong', 'straight', 'nearest', { ...STRAIGHT, dmg: 5, speed: 600, radius: 10, pierce: 2, range: 300 });
    const w = mkWorld(stand(lance));
    const a = addEnemy(w, BIG, 0, 250);
    const b = addEnemy(w, BIG, 0, 400); // out of range, in the line of fire
    play(w, 1.1); // one throw
    expect(a.hp).toBe(1e6 - 5);
    expect(b.hp).toBe(1e6);

    const bar = mkBread('thosai', 'wave', 'none', { dmg: 11, cooldown: 99, speed: 700, radius: 20, range: 400, width: 200 });
    const w2 = mkWorld(stand(bar), { breads: ['thosai'] });
    const near = addEnemy(w2, BIG, 0, 100);
    const far = addEnemy(w2, BIG, 0, 455); // its reach window (417..493) starts above the bar's last y = 400
    play(w2, 1.3);
    expect(near.hp).toBe(1e6 - 11);
    expect(far.hp).toBe(1e6);
  });

  it('#11 fragments fly exactly the time left after the hit, whatever the step size', () => {
    const egg = mkBread('egg-telur', 'straight', 'nearest', { ...STRAIGHT, dmg: 9, speed: 700, radius: 12, fragments: 8, fragmentDmg: 4 });
    const content = stand(egg);
    for (const dt of [1 / 30, 1 / 60, 1 / 120]) {
      const w = mkWorld(content);
      w.player.breads = [];
      const e = addEnemy(w, BIG, 0, 100);
      proj(w, egg, { x: 0, y: 60, vy: 900, radius: 12 }); // touches the enemy (reach 30) at y 70, i.e. 1/90 s in
      playAt(w, 4 / 60, dt);
      const frags = w.projectiles.filter((p) => p.stats?.fragments === 0);
      expect(frags).toHaveLength(8);
      for (const f of frags) expect(Math.hypot(f.x - e.x, f.y - e.y)).toBeCloseTo(600 * (4 / 60 - 1 / 90), 3);
    }
  });

  it('#12 a cascade never hits a lethally damaged enemy again, and a dead one gets no more effects', () => {
    const sambal = { ...mkDip('sambal', Array(5).fill({ type: 'deathBlast', dmg: 8, radius: 60 })), color: '#AA0000' };
    const content = makeContent({ dips: { sambal } });
    const w = mkWorld(content, { dips: [['masala', 1], ['fish-curry', 1], ['sambal', 1]] });
    const a = addEnemy(w, mkEnemy('a', 'walker', { hp: 5 }), 0, 300);
    const n = addEnemy(w, mkEnemy('n', 'walker', { hp: 2 }), 60, 300, { statuses: [{ id: 'burn', time: 3, stacks: 1, dps: 1, amount: 0 }] });
    const c = addEnemy(w, BIG, 120, 300);
    w.player.breads[0].cd = 0;
    const ev = play(w, 0.6);
    const kills = of(ev, 'kill');
    expect(kills.filter((k) => k.uid === a.uid)).toHaveLength(1);
    expect(kills.filter((k) => k.uid === n.uid)).toHaveLength(1);
    // N's blast must pass A by (it is already dead on its feet) but still reach C
    expect(of(ev, 'hit').filter((h) => h.color === '#AA0000' && h.uid === a.uid)).toHaveLength(0);
    expect(of(ev, 'hit').filter((h) => h.color === '#AA0000' && h.uid === c.uid).length).toBeGreaterThan(0);
    // A's own dips (burn) land before it dies, never on the corpse
    const killA = ev.findIndex((x) => x.t === 'kill' && x.uid === a.uid);
    const lateStatus = ev.findIndex((x, i) => i > killA && x.t === 'status' && x.uid === a.uid);
    expect(lateStatus).toBe(-1);
    expect(w.kills).toBe(2);
  });

  it('hits do not depend on the step size: the same scenarios at 1/30, 1/60 and 1/120 give the same hits', () => {
    /** [enemy index, damage] per hit, in event order. */
    const hitsOf = (w: World, ev: GameEvent[]): string[] => of(ev, 'hit').map((h) => `${w.enemies.findIndex((e) => e.uid === h.uid)}:${h.dmg.toFixed(4)}`);
    const column = (ys: number[], radius = 18): ((w: World) => void) => (w) => {
      const def = mkEnemy('post', 'tank', { hp: 1e6, contactDps: 0, radius });
      ys.forEach((y, i) => addEnemy(w, def, i % 2 ? 6 : -6, y));
    };
    const scenarios: { name: string; bread: BreadDef; seconds: number; fill: (w: World) => void; ordered: boolean }[] = [
      {
        name: 'pierce through a column, range ends before the last',
        bread: mkBread('kosong', 'straight', 'nearest', { ...STRAIGHT, dmg: 5, cooldown: 99, speed: 1000, radius: 10, pierce: 2, range: 600 }),
        seconds: 1.5, ordered: true, fill: column([200, 290, 380, 650]),
      },
      {
        name: 'appam hops down an uneven row',
        bread: mkBread('kosong', 'straight', 'nearest', { ...STRAIGHT, dmg: 8, cooldown: 99, speed: 800, hops: 3, hopRange: 220, hopFalloff: 0.15 }),
        seconds: 2, ordered: true,
        fill: (w) => {
          const def = mkEnemy('post', 'tank', { hp: 1e6, contactDps: 0 });
          [[0, 300], [120, 330], [230, 380], [110, 450], [-60, 520]].forEach(([x, y]) => addEnemy(w, def, x, y));
        },
      },
      {
        name: 'egg fragments into a ring of neighbours',
        bread: mkBread('kosong', 'straight', 'nearest', { ...STRAIGHT, dmg: 9, cooldown: 99, speed: 700, radius: 12, fragments: 8, fragmentDmg: 4 }),
        seconds: 1.5, ordered: false,
        fill: (w) => {
          const def = mkEnemy('post', 'tank', { hp: 1e6, contactDps: 0 });
          addEnemy(w, def, 0, 300); // the nearest: the egg bursts here
          for (const a of [-90, -60, -30, 0, 30, 60, 90]) addEnemy(w, def, 60 * Math.sin((a * Math.PI) / 180), 300 + 60 * Math.cos((a * Math.PI) / 180));
        },
      },
      {
        name: 'a fast wave across enemies of different sizes',
        bread: mkBread('thosai', 'wave', 'none', { dmg: 11, cooldown: 99, speed: 3000, radius: 20, range: 600, width: 220 }),
        seconds: 1, ordered: true,
        fill: (w) => {
          [[-80, 150, 5], [0, 220, 30], [90, 230, 8], [10, 400, 5], [0, 700, 5], [150, 300, 5]].forEach(([x, y, r]) => addEnemy(w, mkEnemy('r' + r, 'tank', { hp: 1e6, contactDps: 0, radius: r }), x, y));
        },
      },
      {
        name: 'a boomerang out and back',
        bread: mkBread('chapati', 'boomerang', 'nearest', { dmg: 7, cooldown: 99, speed: 800, radius: 16, range: 600 }),
        seconds: 3, ordered: true, fill: column([150, 400, 560, 585]),
      },
      {
        name: 'an orb sweeping a stationary enemy',
        bread: mkBread('vadai', 'orbit', 'none', { dmg: 3, speed: 180, radius: 16, count: 1, orbitRadius: 140, orbitHitGap: 0.5 }),
        seconds: 4.5, ordered: false,
        fill: (w) => {
          addEnemy(w, BIG, 99, 189); // 45 degrees on the ring: crossed mid-window at 0.25 s, 2.25 s, 4.25 s
        },
      },
    ];
    for (const sc of scenarios) {
      const runs = [1 / 30, 1 / 60, 1 / 120].map((dt) => {
        const w = mkWorld(stand(sc.bread), { breads: [sc.bread.id] });
        sc.fill(w);
        const out = hitsOf(w, playAt(w, sc.seconds, dt));
        return sc.ordered ? out : out.sort();
      });
      expect(runs[0].length, sc.name).toBeGreaterThan(0);
      expect(runs[1], sc.name).toEqual(runs[0]);
      expect(runs[2], sc.name).toEqual(runs[0]);
    }
  });
});

// ── Determinism and the real content ──────────────────────────────────────────────────────────────────────────────

const WALL_TOUGH = mkEnemy('wall-tough', 'tank', { hp: 1e6, contactDps: 0 });

describe('targeting', () => {
  const WALL = mkEnemy('wall', 'tank', { hp: 1e6, contactDps: 0 }); // never moves, never dies, never hurts
  const GUARD = { x: 0 }; // Kannan stands in the middle unless a test moves him

  /** Step until the first player shot exists and return it: its targetUid says who was aimed at. */
  function firstShot(w: World): Projectile {
    for (let i = 0; i < 300; i++) {
      step(w, DT, STILL);
      drainEvents(w);
      const s = w.projectiles.find((p) => p.owner === 'player');
      if (s) return s;
    }
    throw new Error('Kannan never threw');
  }
  const attacker = (w: World, x: number): Enemy => addEnemy(w, WALL, x, 30, { state: 'attack' });

  it('an attacker at the far left beats a closer enemy mid-street', () => {
    const w = mkWorld(makeContent());
    w.player.x = GUARD.x;
    addEnemy(w, WALL, 0, 200); // 200 away, straight ahead: the old "nearest" pick
    const hurting = attacker(w, -260); // 262 away, but chewing on him
    expect(firstShot(w).targetUid).toBe(hurting.uid);
  });

  it('attackers come first even when Kannan stands under the other side of the counter', () => {
    const w = mkWorld(makeContent());
    w.player.x = 200;
    addEnemy(w, WALL, 200, 120);
    const hurting = attacker(w, -250);
    expect(firstShot(w).targetUid).toBe(hurting.uid);
  });

  it('with several attackers, the one nearest his lane goes first', () => {
    const w = mkWorld(makeContent());
    attacker(w, -250);
    const near = attacker(w, 90);
    attacker(w, 230);
    expect(firstShot(w).targetUid).toBe(near.uid);
  });

  it('with nobody at the counter, the enemy closest to it (lowest y) goes first, even if another is nearer by distance', () => {
    const w = mkWorld(makeContent());
    addEnemy(w, WALL, 0, 420); // 420 away
    const lower = addEnemy(w, WALL, 250, 380); // 455 away, but 40 closer to the counter
    expect(firstShot(w).targetUid).toBe(lower.uid);
  });

  it('equal y goes to the enemy nearest his lane, and a full tie keeps the first one found', () => {
    const w = mkWorld(makeContent());
    addEnemy(w, WALL, -200, 400);
    const lane = addEnemy(w, WALL, 100, 400);
    expect(firstShot(w).targetUid).toBe(lane.uid);
    const tie = mkWorld(makeContent());
    const first = addEnemy(tie, WALL, -100, 400);
    addEnemy(tie, WALL, 100, 400);
    expect(firstShot(tie).targetUid).toBe(first.uid);
  });

  it('the dead are never aimed at, and an attacker that was knocked away is an ordinary enemy again', () => {
    const w = mkWorld(makeContent());
    addEnemy(w, WALL, -250, 30, { state: 'dead' });
    const live = addEnemy(w, WALL, 0, 300);
    expect(firstShot(w).targetUid).toBe(live.uid);
    const w2 = mkWorld(makeContent());
    const pushed = addEnemy(w2, WALL, -250, 300); // walking again, not at the counter
    const ahead = addEnemy(w2, WALL, 0, 200);
    expect(firstShot(w2).targetUid).toBe(ahead.uid);
    expect(pushed.state).toBe('walk');
  });

  it('a bomb goes for the cluster that has an attacker in it, over a bigger one up the street', () => {
    const w = mkWorld(makeContent(), { breads: ['roti-bomb'] });
    for (const [x, y] of [[0, 400], [30, 400], [0, 430], [30, 430]]) addEnemy(w, WALL, x, y); // four together, blast is 80
    const hurting = attacker(w, -250);
    const near = addEnemy(w, WALL, -230, 60); // a neighbour of the attacker: a pair beats a four with no attacker
    const shot = firstShot(w);
    expect([hurting.uid, near.uid]).toContain(shot.targetUid);
  });

  it('a bomb with no attackers about still takes the biggest cluster, then the one closest to the counter', () => {
    const w = mkWorld(makeContent(), { breads: ['roti-bomb'] });
    for (const [x, y] of [[0, 500], [30, 500], [0, 530]]) addEnemy(w, WALL, x, y); // three together
    addEnemy(w, WALL, 200, 150); // a lone enemy much closer
    expect(firstShot(w).tx).toBeLessThan(100); // the cluster's lane, not the lone enemy's (x 200)
    const tie = mkWorld(makeContent(), { breads: ['roti-bomb'] });
    const low = addEnemy(tie, WALL, 150, 200);
    addEnemy(tie, WALL, -150, 400);
    expect(firstShot(tie).targetUid).toBe(low.uid); // two lone enemies: the lower one
  });
});

describe('determinism', () => {
  /** A scripted (not bot) input stream, so this checks the sim and not the bot. */
  const script = (i: number): RunInput => (i % 240 < 40 ? { targetX: ((i / 240) % 2 < 1 ? 1 : -1) * 120, moving: true } : STILL);

  function run(seed: number, seconds: number): World {
    const w = createRun({ seed, content: CONTENT });
    for (let i = 0; i < seconds * 30; i++) {
      if (w.phase === 'levelup') chooseCard(w, autoPick(w));
      else step(w, 1 / 30, script(i));
      if (w.events.length > 5000) drainEvents(w);
    }
    return w;
  }

  it('same seed and inputs give a byte-identical world after 60 s; another seed differs', () => {
    const a = run(11, 60);
    const b = run(11, 60);
    expect(a.time).toBeGreaterThan(30);
    expect(a.kills).toBeGreaterThan(5);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(run(12, 60))).not.toBe(JSON.stringify(a));
  }, 60_000);

  it('a world saved as JSON mid-fight resumes identically (rng state lives in the world)', () => {
    const w = mkWorld(makeContent(), { dips: [['fish-curry', 1], ['masala', 1]] });
    for (let i = 0; i < 12; i++) addEnemy(w, mkEnemy(`e${i}`, 'walker', { hp: 60, speed: 40 }), (i - 6) * 35, 300 + (i % 4) * 90);
    play(w, 2);
    const copy = JSON.parse(JSON.stringify(w)) as World;
    expect(JSON.stringify(copy)).toBe(JSON.stringify(w));
    play(w, 6);
    play(copy, 6);
    expect(JSON.stringify(copy)).toBe(JSON.stringify(w));
  });

  it('a real run saved as JSON mid-wave resumes identically (waves, spawns, rng)', () => {
    const play30 = (w: World, from: number, to: number): void => {
      for (let i = from; i < to; i++) {
        if (w.phase === 'levelup') chooseCard(w, autoPick(w));
        else step(w, 1 / 30, script(i));
        if (w.events.length > 5000) drainEvents(w);
      }
    };
    const a = createRun({ seed: 21, content: CONTENT });
    play30(a, 0, 30 * 40);
    expect(a.wave).toBeGreaterThanOrEqual(2);
    const b = JSON.parse(JSON.stringify(a)) as World;
    play30(a, 30 * 40, 30 * 70);
    play30(b, 30 * 40, 30 * 70);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  }, 60_000);

  it('stays well inside a frame at the stated ceiling: 150 enemies and 300 projectiles', () => {
    const w = mkWorld(CONTENT as Content, { breads: ['kosong', 'tissue', 'roti-bomb', 'chapati'], dips: [['masala', 5], ['fish-curry', 5], ['condensed-milk', 5], ['mint-chutney', 5]], stats: { extraProjectiles: 2 } });
    const ids = Object.keys(CONTENT.enemies);
    const r = makeRng(5);
    const fill = (): void => {
      while (w.enemies.length < 150) {
        const def = CONTENT.enemies[ids[r.int(0, ids.length - 1)]];
        addEnemy(w, def, r.range(-250, 250), r.range(150, 950), { hp: 1e9, maxHp: 1e9, holdY: def.ranged?.maxY ?? def.heal?.maxY ?? 0 });
      }
      for (let missing = 300 - w.projectiles.length; missing > 0; missing--) {
        w.projectiles.push({
          uid: w.nextUid++, owner: 'enemy', sprite: 'fx/flame', motion: 'enemy', x: r.range(-250, 250), y: r.range(300, 900), vx: 0, vy: -30, z: 0, t: 0, ttl: 60,
          dmg: 0, radius: 8, pierceLeft: 0, hopsLeft: 0, hit: [], returning: false, targetUid: null, tx: 300, ty: 0, stats: null, spin: 0,
        });
      }
    };
    const t0 = performance.now();
    for (let i = 0; i < 300; i++) {
      fill();
      step(w, DT, STILL);
      w.events.length = 0;
    }
    const perStep = (performance.now() - t0) / 300;
    expect(w.projectiles.length).toBeGreaterThanOrEqual(250);
    expect(perStep).toBeLessThan(16); // a 60 Hz frame; it is ~1 ms on a laptop, the slack is for loaded CI machines
  }, 60_000);

  it('never mutates the content tables', () => {
    const before = JSON.stringify(CONTENT);
    run(5, 40);
    expect(JSON.stringify(CONTENT)).toBe(before);
  }, 60_000);
});

describe('real content + autoplay bot', () => {
  it('a bot run ends with a consistent result, within time and without a NaN anywhere', () => {
    const r = simulateRun({ seed: 4, content: CONTENT });
    expect(r.time).toBeGreaterThan(20);
    expect(r.time).toBeLessThan(1200);
    expect(r.wave).toBeGreaterThanOrEqual(1);
    expect(r.wave).toBeLessThanOrEqual(10);
    expect(r.kills).toBeGreaterThan(10);
    expect(r.gold).toBeGreaterThanOrEqual(0);
    expect(r.breads.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(r)).not.toContain('null');
  }, 60_000);

  it('the bot picks bread cards first (new breads only while there is room), then dips, then passives', () => {
    const w = mkWorld(makeContent());
    w.offer = [{ kind: 'passive', id: 'strong-wrists', level: 1 }, { kind: 'dip', id: 'masala', level: 1 }, { kind: 'bread', id: 'tissue', level: 1 }];
    expect(autoPick(w)).toBe(2);
    expect(autoPick(w, { maxBreads: 1 })).toBe(1); // solo Kosong: no room for a second bread
    w.offer = [{ kind: 'passive', id: 'strong-wrists', level: 1 }, { kind: 'dip', id: 'masala', level: 1 }, { kind: 'bread', id: 'kosong', level: 2 }];
    expect(autoPick(w, { maxBreads: 1 })).toBe(2); // an upgrade of what he has always counts
    w.offer = [{ kind: 'passive', id: 'strong-wrists', level: 1 }, { kind: 'dip', id: 'masala', level: 1 }, { kind: 'heal', id: '', level: 1 }];
    expect(autoPick(w)).toBe(1);
  });

  it('the bot dodges: it leaves a boss lane and an incoming shot, and stands still otherwise', () => {
    const imp = mkEnemy('imp', 'shooter', { hp: 1e6, ranged: { minY: 400, maxY: 400, cooldown: 1, aimTime: 0.5, dmg: 6, projSpeed: 500, projSprite: 'fx/flame' } });
    const w = mkWorld(makeContent({ enemies: [imp] }));
    expect(autoInput(w)).toEqual({ targetX: null, moving: false });
    addEnemy(w, imp, 0, 400, { state: 'hold', holdY: 400, cooldowns: { bx: 0, ph: 0, _mt: 0, _cd: 0.05 } });
    let moved = false;
    for (let i = 0; i < 180; i++) {
      const inp = autoInput(w);
      if (inp.moving) moved = true;
      step(w, DT, inp);
    }
    expect(moved).toBe(true);
    expect(w.player.hp).toBe(100);
  });
});
