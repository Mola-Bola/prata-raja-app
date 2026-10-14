// Boss behaviour: walk to holdY, then one telegraphed attack at a time (volley, charge, summon, rain, sweep).
// All state lives in Enemy.cooldowns: one timer per attack id, plus _st (0 idle, 1 telling, 2 charging, 3 returning),
// _cur (attack index), _n and _m0.._m(n-1) (the x positions the tell marks), _side (sweep), _rec (pause between attacks).
import { speedMul } from '../status';
import { FIELD, type BossAttack, type BossDef, type Enemy } from '../types';
import { cdGet, clamp, emit, enemyShot, enemySpeed, hurtPlayer, type Ctx } from './ctx';
import { FREE, isFree } from './free';
import { spawnEnemy } from './spawn';

const ST = '_st';
const CUR = '_cur';
const COUNT = '_n';
const SIDE = '_side';
const REC = '_rec';
const mark = (i: number): string => '_m' + i;
/** Free mode: the y of each marked spot, and where Kannan stood when the tell began (volley shots fly to (mark, _py)). */
const markY = (i: number): string => '_y' + i;
const PY = '_py';
/** Free mode: a calm opening after the boss parks (decomp-scrolling-flow). Export so sim.ts can set it at spawn. */
export const bossBeat = (e: Enemy): void => { e.cooldowns[REC] = FREE.bossBeat; };
/** Seconds of calm after any attack. */
const RECOVER = 0.6;
const LINE_UP_SPEED = 500; // a charging boss slides to its lane during the tell
const CHARGE_SLIDE = 1200;

const attackOf = (e: Enemy): BossAttack => (e.def as BossDef).attacks[cdGet(e, CUR)];

/** The danger the current tell marks on the counter: x centres and the full width of each. Used for the 'bossTell' event and the bot. */
export const tellMarkY = (e: Enemy, i: number): number => cdGet(e, markY(i));
export const tellPlayerY = (e: Enemy): number => cdGet(e, PY);

export function tellZones(e: Enemy): { xs: number[]; width: number } {
  const a = attackOf(e);
  const xs: number[] = [];
  for (let i = 0; i < cdGet(e, COUNT); i++) xs.push(cdGet(e, mark(i)));
  switch (a.kind) {
    case 'volley':
      return { xs, width: FIELD.kannanHitHalfWidth * 2 };
    case 'charge':
      return { xs, width: a.laneWidth };
    case 'rain':
      return { xs, width: a.markWidth };
    case 'sweep':
      return { xs, width: FIELD.halfWidth };
    default:
      return { xs, width: 0 };
  }
}

/** Seconds since the current attack's tell began (large once it is past the tell, e.g. mid-charge). */
export const tellAge = (e: Enemy): number => (cdGet(e, ST) === 1 ? attackOf(e).tell - e.t : 99);

/** Cross each hp threshold once: phase++ and a 'bossPhase' event. */
export function bossPhase(c: Ctx, e: Enemy): void {
  const phases = (e.def as BossDef).phases;
  while (e.phase < phases.length && e.hp / e.maxHp <= phases[e.phase]) {
    e.phase++;
    emit(c, { t: 'bossPhase', phase: e.phase });
  }
}

function begin(c: Ctx, e: Enemy, d: BossDef, index: number): void {
  const a = d.attacks[index];
  const cd = e.cooldowns;
  const px = c.p.x;
  const free = isFree(c);
  cd[ST] = 1;
  cd[PY] = c.p.y;
  cd._ch = 0;
  cd[CUR] = index;
  e.t = a.tell;
  const xs: number[] = [];
  switch (a.kind) {
    case 'volley':
      for (let j = 0; j < a.shots; j++) xs.push(clamp(px + (j - (a.shots - 1) / 2) * a.spread, -FIELD.halfWidth, FIELD.halfWidth));
      break;
    case 'charge':
      xs.push(px);
      break;
    case 'rain':
      xs.push(px);
      for (let j = 1; j < a.marks; j++) xs.push(c.rng.range(-FIELD.kannanMaxX, FIELD.kannanMaxX));
      break;
    case 'sweep':
      cd[SIDE] = px < 0 ? -1 : 1;
      xs.push((cd[SIDE] * FIELD.halfWidth) / 2);
      break;
    case 'summon':
      xs.push(e.x);
      break;
  }
  cd[COUNT] = xs.length;
  xs.forEach((x, j) => {
    cd[mark(j)] = x;
    if (free) cd[markY(j)] = a.kind === 'rain' && j > 0 ? c.rng.range(FIELD.freeMinY, FIELD.freeMaxY) : c.p.y;
  });
  const z = tellZones(e);
  emit(c, { t: 'bossTell', attackId: a.id, name: a.name, kind: a.kind, xs: z.xs, width: z.width, time: a.tell, ...(free ? { ys: z.xs.map((_, j) => cdGet(e, markY(j))) } : {}) });
}

/** Attack done: restart its timer (faster in later phases) and rest a moment. */
function finish(e: Enemy, d: BossDef): void {
  const a = d.attacks[cdGet(e, CUR)];
  e.cooldowns[a.id] = a.cooldown * Math.max(0.25, 1 - d.phaseHaste * e.phase);
  e.cooldowns[REC] = RECOVER;
  e.cooldowns[ST] = 0;
}

function execute(c: Ctx, e: Enemy, d: BossDef, a: BossAttack): void {
  const n = cdGet(e, COUNT);
  switch (a.kind) {
    case 'volley':
      for (let j = 0; j < n; j++) c.w.projectiles.push(enemyShot(c, e.x, e.y, cdGet(e, mark(j)), a.dmg, a.projSpeed, a.projSprite, true, isFree(c) ? cdGet(e, PY) : 0));
      emit(c, { t: 'enemyShot', uid: e.uid });
      finish(e, d);
      break;
    case 'charge':
      e.cooldowns[ST] = 2;
      e.state = 'walk';
      break;
    case 'summon': {
      const def = c.w.content.enemies[a.enemy];
      if (def) {
        for (let j = 0; j < a.count; j++) {
          const x = clamp(e.x + (j - (a.count - 1) / 2) * 60, -FIELD.halfWidth, FIELD.halfWidth);
          spawnEnemy(c, def, x, { y: e.y - e.def.radius * 0.5 });
        }
      }
      finish(e, d);
      break;
    }
    case 'rain':
      for (let j = 0; j < n; j++) {
        const x = cdGet(e, mark(j));
        emit(c, { t: 'splat', x });
        if (isFree(c) ? Math.hypot(x - c.p.x, cdGet(e, markY(j)) - c.p.y) <= a.markWidth / 2 + FIELD.kannanRadius / 2 : Math.abs(x - c.p.x) <= a.markWidth / 2) hurtPlayer(c, a.dmg, 'boss');
      }
      finish(e, d);
      break;
    case 'sweep': {
      const side = cdGet(e, SIDE);
      emit(c, { t: 'splat', x: cdGet(e, mark(0)) });
      if (side < 0 ? c.p.x < 0 : c.p.x >= 0) hurtPlayer(c, a.dmg, 'boss');
      finish(e, d);
      break;
    }
  }
}

/** Per step (boss not stunned or frozen). */
export function updateBoss(c: Ctx, e: Enemy): void {
  const d = e.def as BossDef;
  const cd = e.cooldowns;
  const st = cdGet(e, ST);
  if (st === 0) {
    if (e.y > e.holdY + 0.5) {
      e.state = 'walk';
      e.y = Math.max(e.holdY, e.y - enemySpeed(e) * 4 * c.dt);
      cd._mt = cdGet(e, '_mt') + c.dt * speedMul(e);
      return;
    }
    e.state = 'hold';
    cd[REC] = Math.max(0, cdGet(e, REC) - c.dt);
    let pick = -1;
    for (let i = 0; i < d.attacks.length; i++) {
      const id = d.attacks[i].id;
      cd[id] = cdGet(e, id) - c.dt;
      if (cd[id] <= 0 && (pick < 0 || cd[id] < cd[d.attacks[pick].id])) pick = i;
    }
    if (pick >= 0 && cd[REC] <= 0) begin(c, e, d, pick);
    return;
  }
  const a = attackOf(e);
  if (st === 1) {
    if (a.kind === 'charge') e.x += clamp(cdGet(e, mark(0)) - e.x, -LINE_UP_SPEED * c.dt, LINE_UP_SPEED * c.dt);
    e.t -= c.dt;
    if (e.t <= 0) execute(c, e, d, a);
  } else if (st === 2 && a.kind === 'charge') {
    const lane = cdGet(e, mark(0));
    e.x += clamp(lane - e.x, -CHARGE_SLIDE * c.dt, CHARGE_SLIDE * c.dt);
    e.y -= a.speed * c.dt;
    // free mode: the body hurts whenever Kannan is in its lane as it passes over him (once per charge; a dash goes through)
    if (isFree(c) && !cdGet(e, '_ch') && Math.abs(c.p.x - e.x) <= a.laneWidth / 2 && Math.abs(c.p.y - e.y) <= e.def.radius * 0.6 + FIELD.kannanRadius) {
      cd._ch = 1;
      hurtPlayer(c, a.dmg, 'boss');
    }
    if (e.y <= FIELD.reachY) {
      e.y = FIELD.reachY;
      emit(c, { t: 'blast', x: lane, y: 0, radius: a.laneWidth / 2, color: null });
      if (!isFree(c) && Math.abs(c.p.x - lane) <= a.laneWidth / 2) hurtPlayer(c, a.dmg, 'boss');
      cd[ST] = 3;
    }
  } else {
    // returning to holdY after a charge
    e.y += Math.max(200, d.speed * 4) * c.dt;
    if (e.y >= e.holdY) {
      e.y = e.holdY;
      e.state = 'hold';
      finish(e, d);
    }
  }
}
