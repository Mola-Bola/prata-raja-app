// Player numbers: base stats, passive/loadout sums, buff modifiers, hit damage, XP curve, wave HP scaling.
// OWNER: swarm builder "stats". Pure functions; spec in the JSDoc is the contract.
import type { Rng } from './rng';
import type { Buff, ChapterDef, Content, DipId, Loadout, OwnedDip, OwnedPassive, PlayerStats } from './types';

export const BASE_STATS: PlayerStats = {
  maxHp: 100, regen: 0, moveSpeed: 700, dmgPct: 0, throwSpeedPct: 0, critChance: 0.05, critMult: 1.5,
  extraProjectiles: 0, sizePct: 0, dotPct: 0, rangePct: 0, xpPct: 0, throwWhileMoving: 0, revives: 0,
  dmgTakenPct: 0, dodge: 0, healOnLevelUpPct: 0, goldPct: 0,
  soak: 0, critSplash: 0, splashCrit: 0,
};

export type BuffMods = { throwSpeedPct: number; projSpeedPct: number; critMultAdd: number; dmgPct: number; critChance: number };

/** Which dip powers each self-buff. */
const BUFF_DIP: Record<Buff['id'], DipId> = { haste: 'teh-tarik', spin: 'ghee', stackDmg: 'chicken-curry' };

/** BASE_STATS + loadout.stats + Σ passive.perLevel × level (all numbers add). Pure: never mutates inputs. */
export function computeStats(passives: OwnedPassive[], content: Content, loadout?: Loadout): PlayerStats {
  const out: PlayerStats = { ...BASE_STATS };
  const add = (src: Partial<PlayerStats>, times: number) => {
    for (const key of Object.keys(src) as (keyof PlayerStats)[]) {
      const v = src[key];
      if (typeof v === 'number') out[key] += v * times;
    }
  };
  add(loadout?.stats ?? {}, 1);
  for (const p of passives) add(content.passives[p.id].perLevel, p.level);
  return out;
}

/** Modifiers from active self-buffs, using each buff's dip level from `dips`:
 *  haste -> throwSpeedPct (dip 'teh-tarik' effect.throwSpeedPct);
 *  spin -> projSpeedPct and critMultAdd (= critDmgPct) (dip 'ghee');
 *  stackDmg -> dmgPct = stacks × pctPerStack, plus critChance = critAtMax when stacks >= maxStacks (dip 'chicken-curry').
 *  Buffs whose dip is not owned contribute nothing. All zero when no buffs. */
export function buffMods(buffs: Buff[], dips: OwnedDip[], content: Content): BuffMods {
  const mods: BuffMods = { throwSpeedPct: 0, projSpeedPct: 0, critMultAdd: 0, dmgPct: 0, critChance: 0 };
  for (const buff of buffs) {
    if (buff.time <= 0) continue; // untriggered (haste before its Nth hit) or expired
    const owned = dips.find((d) => d.id === BUFF_DIP[buff.id]);
    if (!owned) continue;
    const fx = content.dips[owned.id].levels[owned.level - 1];
    if (buff.id === 'haste' && fx.type === 'haste') {
      mods.throwSpeedPct += fx.throwSpeedPct;
    } else if (buff.id === 'spin' && fx.type === 'spin') {
      mods.projSpeedPct += fx.projSpeedPct;
      mods.critMultAdd += fx.critDmgPct;
    } else if (buff.id === 'stackDmg' && fx.type === 'stackDmg') {
      mods.dmgPct += buff.stacks * fx.pctPerStack;
      if (buff.stacks >= fx.maxStacks) mods.critChance += fx.critAtMax;
    }
  }
  return mods;
}

/** One hit: dmg = base × (1 + stats.dmgPct + mods.dmgPct) × (crit ? stats.critMult + mods.critMultAdd : 1) × takenMul.
 *  crit when canCrit and rng.next() < min(1, stats.critChance + mods.critChance). Draws exactly one rng number
 *  when canCrit, none otherwise. dmg is never below 0. */
export function rollHit(base: number, stats: PlayerStats, mods: BuffMods, takenMul: number, rng: Rng, canCrit = true): { dmg: number; crit: boolean } {
  const crit = canCrit && rng.next() < Math.min(1, stats.critChance + mods.critChance);
  const critMul = stats.critMult + mods.critMultAdd;
  const dmg = base * (1 + stats.dmgPct + mods.dmgPct) * (crit ? critMul : 1) * takenMul;
  return { dmg: Math.max(0, dmg), crit };
}

/** XP to go from `level` to level + 1: Math.round(5 + 3 × level + 0.5 × level²). level 1 -> 9, level 5 -> 33. */
export function xpToNext(level: number): number {
  return Math.round(5 + 3 * level + 0.5 * level * level);
}

/** HP multiplier for 1-based `wave`: 1 + chapter.hpPerWave × (wave − 1). */
export function waveHpScale(chapter: ChapterDef, wave: number): number {
  return 1 + chapter.hpPerWave * (wave - 1);
}

/** Seconds between throws: cooldown / (1 + stats.throwSpeedPct + mods.throwSpeedPct), never below 0.08. */
export function effectiveCooldown(cooldown: number, stats: PlayerStats, mods: BuffMods): number {
  // A big enough slow could push the rate to zero or below; clamp so the cooldown stays finite.
  return Math.max(0.08, cooldown / Math.max(0.1, 1 + stats.throwSpeedPct + mods.throwSpeedPct));
}
