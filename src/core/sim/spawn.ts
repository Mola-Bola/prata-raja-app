// Turning defs and wave-director requests into living enemies.
import { waveHpScale } from '../stats';
import { FIELD, type BossDef, type Enemy, type EnemyDef, type SpawnLane } from '../types';
import { clamp, newUid, SPAWN_Y, type Ctx } from './ctx';

/** Create one enemy and add it to the world. hp and shield scale with the wave (x3 for elites).
 *  Scratch numbers in cooldowns: bx = spawn x (walk wobble / zigzag centre), ph = wobble phase,
 *  _mt = movement clock (advances only while walking). Shooters also get _cd, bosses one timer per attack id. */
/** Side spawns enter this far in from the field edge, at a height partway down the street (y 420..540). */
const SIDE_EDGE = FIELD.halfWidth - 20;
const SIDE_Y = 420;

export function spawnEnemy(c: Ctx, def: EnemyDef | BossDef, x: number, opts: { y?: number; elite?: boolean; boss?: boolean; lane?: SpawnLane } = {}): Enemy {
  const { w, rng } = c;
  const elite = opts.elite ?? false;
  const boss = opts.boss ?? false;
  const side = !boss && opts.lane !== undefined && opts.lane !== 'ahead';
  if (side) x = opts.lane === 'left' ? -SIDE_EDGE : SIDE_EDGE;
  const y = opts.y ?? (side ? SIDE_Y + rng.range(0, 120) : (def.drain?.y ?? SPAWN_Y) + rng.range(0, 40));
  const scale = waveHpScale(w.chapter, w.waveF ?? Math.max(1, w.wave)) * (elite ? 3 : 1);
  const hp = def.hp * scale * (boss && w.chapter.mode === 'flow' ? w.chapter.bossHp ?? 1 : 1);
  const cd: Record<string, number> = { bx: x, ph: rng.range(0, Math.PI * 2), _mt: 0 };
  const e: Enemy = {
    uid: newUid(c), def, boss, elite, x, y, hp, maxHp: hp, shield: (def.shield ?? 0) * scale,
    statuses: [], state: 'walk', t: 0, age: 0, knock: 0, flash: 0, cooldowns: cd, phase: 0, holdY: 0,
  };
  if (side) e.lane = opts.lane;
  if (def.zigzag) cd.bx = clamp(x, -(FIELD.halfWidth - def.zigzag.amp), FIELD.halfWidth - def.zigzag.amp);
  if (def.dash && def.kind === 'runner') e.t = rng.range(0, def.dash.go + def.dash.rest);
  if (def.summon) e.t = def.summon.every * 0.5;
  if (def.ranged) {
    e.holdY = rng.range(def.ranged.minY, def.ranged.maxY);
    cd._cd = def.ranged.cooldown * rng.range(0.3, 1);
  }
  if (def.heal) e.holdY = rng.range(def.heal.minY, def.heal.maxY);
  if (boss) {
    const b = def as BossDef;
    e.holdY = b.holdY;
    b.attacks.forEach((a, i) => {
      cd[a.id] = a.cooldown * (0.5 + 0.3 * i);
    });
  }
  w.enemies.push(e);
  return e;
}
