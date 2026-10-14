// The run simulation: owns all World mutation. OWNER: the sim engineer.
// Pure TypeScript, no Phaser/React/DOM. Behaviour lives in src/core/sim/*; this file is the step order and the run lifecycle.
// Everything random comes from world.rngState (rebuilt each step, written back at the end), so a run replays from its seed + inputs.
//
// What the renderer can rely on (Projectile fields are reused per motion; no contract change):
//  - straight: radius = hit radius, ttl = range / speed (the path is clipped there). boomerang: returning = on its way back, ty = turn distance.
//  - lob: radius = blast radius, (tx, ty) = landing point, z = arc height 0..1 while t runs to ttl. wave: radius = HALF the bar width, ty = range.
//  - orbit: persistent, targetUid = index on the ring, hit = [uid, time of its last bite, ...]; rebuilt when the bread's level or Kannan's size changes.
//  - enemy shots: motion 'enemy', tx = landing x on the counter, hopsLeft = 1 for boss attacks. Enemy.cooldowns holds sim scratch (keys with _).
//  - fragments are straight projectiles with a stats copy (fragments 0). Zones use sprite 'fx/smoke'.
//  - Kannan.moving is true while he still slides toward targetX (|x - targetX| > 1) as well as while input.moving is set; he throws in neither.
//  - after chooseCard / revive / step the phase is one of intro | wave | levelup | won | lost; events never repeat once drained.
import { applyCard, drawOffer } from './cards';
import { makeRng, type Rng } from './rng';
import { computeStats, xpToNext } from './stats';
import { tickBuffs } from './status';
import { FIELD, type Card, type Content, type GameEvent, type Loadout, type Player, type RunInput, type World } from './types';
import { flowTick, isFlow, waveEquivalent } from './director';
import { spawnTick, startWave, waveDone, type SpawnRequest } from './waves';
import { alive, clamp, dirtyMods, emit, type Ctx } from './sim/ctx';
import { flushContact, updateEnemies, updateEnemyShots } from './sim/enemies';
import { updatePlayerShots, updateZones } from './sim/shots';
import { spawnEnemy } from './sim/spawn';
import { updateThrowing } from './sim/throw';

/** Seconds before wave 1 starts. */
const INTRO_TIME = 1.5;
/** step() splits anything longer than this, so physics never takes a huge leap. */
const MAX_DT = 1 / 30;
const MAX_CALL_DT = 5;
const REVIVE_KNOCK = 300;
const REVIVE_RADIUS_Y = 250;

/** `mode` overrides the chapter's own (Test Kitchen asks for 'waves'); a chapter with no mode runs waves. */
export function createRun(opts: { seed: number; content: Content; chapterId?: string; loadout?: Loadout; mode?: 'flow' | 'waves' }): World {
  const { seed, content } = opts;
  const loadout = opts.loadout && { ...opts.loadout, ...(opts.loadout.dipSimmer ? { dipSimmer: { ...opts.loadout.dipSimmer } } : {}) };
  const found = content.chapters.find((ch) => ch.id === opts.chapterId) ?? content.chapters[0];
  const chapter = opts.mode && opts.mode !== found.mode ? { ...found, mode: opts.mode } : found;
  const stats = computeStats([], content, loadout);
  const player: Player = {
    x: 0, targetX: 0, moving: false, hp: stats.maxHp, stats,
    breads: [{ id: loadout?.startBread ?? 'kosong', level: 1, cd: 0.4, volleyLeft: 0, volleyT: 0 }],
    dips: [], passives: [], buffs: [], level: 1, xp: 0, xpToNext: xpToNext(1), revivesLeft: stats.revives, throwAnim: 0, hurtAnim: 0,
  };
  return {
    seed, rngState: seed >>> 0, content, chapter, time: 0, phase: 'intro', wave: 0, waveTime: 0, budgetLeft: 0, spawnClock: 0, dist: 0, credit: 0,
    player, enemies: [], projectiles: [], zones: [], nextUid: 1, kills: 0, bossKills: 0, gold: 0, pendingLevelUps: 0, offer: [], recentOffers: [],
    rerolls: loadout?.rerolls ?? 1, events: [], result: null, loadout, dipUseXp: {}, dipLastCredit: {}, contactAcc: 0, contactT: 0,
  };
}

/** Start a fresh run at an actual 1-based chapter wave, using the ordinary director and spawn RNG.
 *  Intended for in-memory sandboxes; never slices/reindexes content or resets an active run. */
export function startRunWave(world: World, wave: number): void {
  if (!Number.isInteger(wave) || wave < 1 || wave > world.chapter.waves.length) throw new Error('Invalid starting wave');
  if (world.phase !== 'intro' || world.wave !== 0 || world.time !== 0) throw new Error('Starting wave requires a fresh run');
  const rng = makeRng(world.rngState);
  beginWave({ w: world, p: world.player, rng, dt: 0, m: null }, wave);
  world.rngState = rng.state;
}

/** Advance by dt seconds (callers pass <= 1/30; split larger steps). Does nothing in 'levelup', 'won', 'lost'.
 *  A longer dt is cut into 1/30 s sub-steps (at most 5 s per call, so a stalled frame can never hang the game). */
export function step(world: World, dt: number, input: RunInput): void {
  let left = Math.min(dt, MAX_CALL_DT);
  while (left > 1e-9) {
    if (world.phase === 'levelup' || world.phase === 'won' || world.phase === 'lost') return;
    const h = Math.min(left, MAX_DT);
    stepOnce(world, h, input);
    left -= h;
  }
}

/** Every displayed offer counts, including rerolls and queued level-ups. */
function nextOffer(world: World, rng: Rng): Card[] {
  const history = world.recentOffers ?? [];
  const offer = drawOffer(world.player, world.content, rng, { ...world.loadout, recentOffers: history });
  world.recentOffers = [...history.slice(-1), offer];
  return offer;
}

export function chooseCard(world: World, index: number): void {
  if (world.phase !== 'levelup') return;
  const card = world.offer[index];
  if (!card) return;
  const rng = makeRng(world.rngState);
  const p = world.player;
  const revives = p.stats.revives;
  world.gold += applyCard(p, card, world.content, world.loadout).gold;
  p.revivesLeft += Math.max(0, p.stats.revives - revives); // Second Helping: the new revive is usable at once
  world.pendingLevelUps = Math.max(0, world.pendingLevelUps - 1);
  if (world.pendingLevelUps > 0) {
    world.offer = nextOffer(world, rng);
  } else {
    world.offer = [];
    world.phase = world.wave === 0 ? 'intro' : 'wave';
  }
  world.rngState = rng.state;
}

export function reroll(world: World): boolean {
  if (world.phase !== 'levelup' || world.rerolls <= 0) return false;
  const rng = makeRng(world.rngState);
  world.offer = nextOffer(world, rng);
  world.rerolls--;
  world.rngState = rng.state;
  return true;
}

/** Return and clear world.events. */
export function drainEvents(world: World): GameEvent[] {
  const events = world.events;
  world.events = [];
  return events;
}

// ── One step ─────────────────────────────────────────────────────────────────

function stepOnce(w: World, dt: number, input: RunInput): void {
  const rng = makeRng(w.rngState);
  const c: Ctx = { w, p: w.player, rng, dt, m: null };
  w.time += dt;
  movePlayer(c, input);
  if (w.phase === 'intro' && w.time >= INTRO_TIME) beginRun(c);
  updateThrowing(c);
  updatePlayerShots(c);
  updateZones(c);
  updateEnemies(c);
  updateEnemyShots(c);
  if (c.p.hp <= 0) {
    if (c.p.revivesLeft > 0) revive(c);
    else endRun(c, false);
  }
  if (w.phase === 'wave') runDirector(c);
  sweepDead(w);
  if (w.pendingLevelUps > 0 && (w.phase === 'wave' || w.phase === 'intro')) {
    w.phase = 'levelup';
    w.offer = nextOffer(w, rng);
  }
  w.rngState = rng.state;
}

/** Slide toward the finger, regen, count buffs and animations down. */
function movePlayer(c: Ctx, input: RunInput): void {
  const { p, dt } = c;
  if (input.targetX !== null) p.targetX = clamp(input.targetX, -FIELD.kannanMaxX, FIELD.kannanMaxX);
  const dx = p.targetX - p.x;
  p.moving = input.moving || Math.abs(dx) > 1; // still sliding to targetX counts as moving, finger down or not
  const reach = p.stats.moveSpeed * dt;
  p.x = Math.abs(dx) <= reach ? p.targetX : p.x + Math.sign(dx) * reach;
  if (p.stats.regen > 0 && p.hp > 0) p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.regen * dt);
  tickBuffs(p, dt);
  dirtyMods(c);
  p.throwAnim = Math.max(0, p.throwAnim - dt);
  p.hurtAnim = Math.max(0, p.hurtAnim - dt);
}

// ── Waves ────────────────────────────────────────────────────────────────────

function spawnRequest(c: Ctx, r: SpawnRequest): void {
  const content = c.w.content;
  const def = r.boss ? content.bosses[r.enemyId] : content.enemies[r.enemyId];
  if (!def) return;
  spawnEnemy(c, def, r.x, { elite: r.elite, boss: r.boss });
  if (r.boss) c.w.bossAttempted = true;
  if (r.boss) emit(c, { t: 'bossSpawn', bossId: def.id, name: def.name });
}

/** The intro is over: waves start wave 1, flow just sets off (no banner, the street starts to move). */
function beginRun(c: Ctx): void {
  if (!isFlow(c.w.chapter)) return beginWave(c, 1);
  c.w.wave = 1;
  c.w.waveF = waveEquivalent(c.w.chapter, 0);
  c.w.phase = 'wave';
}

function beginWave(c: Ctx, wave: number): void {
  const { events, spawns } = startWave(c.w, wave);
  for (const ev of events) emit(c, ev);
  c.w.phase = 'wave';
  for (const r of spawns) spawnRequest(c, r);
}

function runDirector(c: Ctx): void {
  const { w } = c;
  if (isFlow(w.chapter)) {
    const f = flowTick(w, c.dt, c.rng);
    for (const r of f.spawns) spawnRequest(c, r);
    if (f.won) endRun(c, true);
    return;
  }
  for (const r of spawnTick(w, c.dt, c.rng)) spawnRequest(c, r);
  if (!waveDone(w)) return;
  if (w.wave >= w.chapter.waves.length) endRun(c, true);
  else beginWave(c, w.wave + 1);
}

// ── Death, revive, end ───────────────────────────────────────────────────────

/** Second Helping: half hp, shove everything near the counter back, wipe the enemy shots. */
function revive(c: Ctx): void {
  const { w, p } = c;
  p.revivesLeft--;
  p.hp = p.stats.maxHp * 0.5;
  for (const e of w.enemies) {
    if (alive(e) && e.y < REVIVE_RADIUS_Y) e.knock += REVIVE_KNOCK * (e.boss ? 0.1 : 1);
  }
  let keep = 0;
  for (const s of w.projectiles) if (s.owner !== 'enemy') w.projectiles[keep++] = s;
  w.projectiles.length = keep;
  emit(c, { t: 'revive' });
}

function endRun(c: Ctx, won: boolean): void {
  const { w, p } = c;
  flushContact(c, true);
  w.phase = won ? 'won' : 'lost';
  const cleared = won ? w.chapter.waves.length : Math.max(0, w.wave - 1);
  w.result = {
    chapterId: w.chapter.id, bossAttempted: w.bossAttempted ?? false,
    won, wave: w.wave, ...(isFlow(w.chapter) ? { dist: Math.round(w.dist) } : {}), kills: w.kills, bossKills: w.bossKills, time: w.time, level: p.level,
    gold: Math.round(w.gold) + 5 * cleared + (won ? 50 : 0),
    dipUseXp: { ...w.dipUseXp },
    breads: p.breads.map((b) => ({ ...b })), dips: p.dips.map((d) => ({ ...d })),
  };
  emit(c, { t: 'runEnd', won });
}

/** Drop dead enemies and spent projectiles (in place). */
function sweepDead(w: World): void {
  let k = 0;
  for (let i = 0; i < w.enemies.length; i++) if (w.enemies[i].state !== 'dead') w.enemies[k++] = w.enemies[i];
  w.enemies.length = k;
  k = 0;
  for (let i = 0; i < w.projectiles.length; i++) if (w.projectiles[i].ttl >= 0) w.projectiles[k++] = w.projectiles[i];
  w.projectiles.length = k;
}
