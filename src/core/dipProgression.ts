import { dipMatchesBread } from './dipLinks';
import type { BreadId, Content, DipId, HitEffect, OwnedDip, World } from './types';

export const SIMMER_DIPS = ['fish-curry', 'mint-chutney', 'condensed-milk'] as const satisfies readonly DipId[];
export type SimmerDipId = typeof SIMMER_DIPS[number];
export const DIP_XP_CAP = 2470;
export const DIP_RUN_XP_CAP = 120;
export const isSimmerDip = (id: DipId): id is SimmerDipId => SIMMER_DIPS.some(d => d === id);
export const validDipXp = (value: unknown, cap = DIP_XP_CAP): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(cap, Math.floor(value)) : 0;

export function simmerProgress(xp: unknown): { level: number; xp: number; needed: number } {
  let remaining = validDipXp(xp);
  let level = 1;
  while (level < 20 && remaining >= 40 + 10 * (level - 1)) {
    remaining -= 40 + 10 * (level - 1);
    level++;
  }
  return { level, xp: remaining, needed: level === 20 ? 0 : 40 + 10 * (level - 1) };
}
export const simmerBonusPct = (level: number): number =>
  Number.isInteger(level) && level >= 1 && level <= 20 ? (level - 1) * 0.5 : 0;

/** Takes the already tag-bonused effect; never scales status refreshes or copied Sambal burns. */
export function simmerEffect(id: DipId, effect: HitEffect, level = 1): HitEffect {
  const mul = 1 + simmerBonusPct(level) / 100;
  if (mul === 1) return effect;
  if (id === 'fish-curry' && effect.type === 'burn') return { ...effect, dps: effect.dps * mul };
  if (id === 'mint-chutney' && effect.type === 'chill') return { ...effect, time: effect.time * mul };
  if (id === 'condensed-milk' && effect.type === 'sugar') return { ...effect, slowTime: effect.slowTime * mul };
  return effect;
}

export function matchingDipLink(content: Content, dip: OwnedDip, breadId?: BreadId): boolean {
  if (!dip.linkedBread || !breadId || !isSimmerDip(dip.id)) return false;
  const linked = content.breads[dip.linkedBread];
  const hit = content.breads[breadId];
  return !!linked && !!hit && (linked.evolvedFrom?.bread ?? linked.id) === (hit.evolvedFrom?.bread ?? hit.id)
    && dipMatchesBread(content.dips[dip.id], linked) && dipMatchesBread(content.dips[dip.id], hit);
}

/** Called only for positive direct HP damage to a living enemy. Snapshot presence opts ordinary runs in. */
export function creditDipUse(world: World, breadId?: BreadId): void {
  if (!world.loadout?.dipSimmer || world.phase !== 'wave') return;
  for (const dip of world.player.dips) {
    if (!matchingDipLink(world.content, dip, breadId)) continue;
    const earned = world.dipUseXp ??= {};
    const last = world.dipLastCredit ??= {};
    if ((earned[dip.id] ?? 0) >= DIP_RUN_XP_CAP || (last[dip.id] !== undefined && world.time - last[dip.id]! < 1 - 1e-9)) continue;
    earned[dip.id] = (earned[dip.id] ?? 0) + 1;
    last[dip.id] = world.time;
  }
}
