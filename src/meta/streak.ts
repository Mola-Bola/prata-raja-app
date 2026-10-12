import { makeRng } from '../core/rng';
import { rollChest } from './chests';
import { MATERIALS, type GearItem, type Material, type SaveV2 } from './types';

export const STREAK_REWARDS = [
  { gold: 50 }, { reroll: 1 }, { materialCount: 1 }, { gold: 80 },
  { training: 1 }, { materialCount: 2 }, { chest: 'rare' },
] as const;
const DAY_MS = 86400000;
const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / DAY_MS;
const dayString = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);

/** Offset is minutes east of UTC (Sydney +600), not Date.getTimezoneOffset(). */
export function claim(save: SaveV2, now: Date, tzOffsetMinutes: number) {
  const rewards: { day: number; gold: number; reroll: number; training: number; materials: Partial<Record<Material, number>>; chest: GearItem | null } = {
    day: 0, gold: 0, reroll: 0, training: 0, materials: {}, chest: null,
  };
  const localTime = now.getTime() + tzOffsetMinutes * 60000;
  if (!Number.isFinite(localTime) || Math.abs(tzOffsetMinutes) > 840 || Math.abs(localTime) > 8.64e15) return { save, rewards };
  const today = Math.floor(localTime / DAY_MS);
  const last = save.streak.lastClaimDay ? dayNumber(save.streak.lastClaimDay) : null;
  if (last !== null && today <= last) return { save, rewards };
  const anchor = save.streak.windowStartDay ? dayNumber(save.streak.windowStartDay) : today;
  const currentWindow = Math.floor((today - anchor) / 7);
  let restDaysUsed = currentWindow === 0 ? save.streak.restDaysUsed : 0;
  let penalty = 0;
  if (last !== null && today - last > 1) {
    const start = last + 1;
    const end = today - 1;
    const firstWindow = Math.floor((start - anchor) / 7);
    const finalWindow = Math.floor((end - anchor) / 7);
    const firstCount = Math.min(end + 1, anchor + (firstWindow + 1) * 7) - start;
    const used = firstWindow === 0 ? save.streak.restDaysUsed : 0;
    const firstRest = Math.min(firstCount, 2 - used);
    let absorbed = firstRest;
    if (currentWindow === firstWindow) restDaysUsed = used + firstRest;
    if (finalWindow > firstWindow) {
      absorbed += Math.max(0, finalWindow - firstWindow - 1) * 2;
      const finalRest = Math.min(2, end - (anchor + finalWindow * 7) + 1);
      absorbed += finalRest;
      if (currentWindow === finalWindow) restDaysUsed = finalRest;
    }
    penalty = end - start + 1 - absorbed;
  }
  const previous = last === null ? 0 : Math.max(1, save.streak.day - penalty);
  const day = previous % 7 + 1;
  rewards.day = day;
  const gift = STREAK_REWARDS[day - 1];
  rewards.gold = 'gold' in gift ? gift.gold : 0;
  rewards.reroll = 'reroll' in gift ? gift.reroll : 0;
  rewards.training = 'training' in gift ? gift.training : 0;
  // Login rewards replay from their calendar day; callers need no ambient RNG.
  const rng = makeRng(today ^ save.chestPity.opened);
  const materials = { ...save.materials };
  if ('materialCount' in gift) for (let i = 0; i < gift.materialCount; i++) {
    const type = rng.pick(MATERIALS);
    rewards.materials[type] = (rewards.materials[type] ?? 0) + 1;
    materials[type]++;
  }
  const chest = 'chest' in gift ? rollChest(rng, save.chestPity, 'rare') : null;
  if (chest) rewards.chest = { ...chest.item, uid: `daily-${dayString(today)}-${chest.pity.opened}-${chest.item.uid}` };
  const next: SaveV2 = {
    ...save, gold: save.gold + rewards.gold, materials,
    tokens: { reroll: save.tokens.reroll + rewards.reroll, training: save.tokens.training + rewards.training },
    inventory: rewards.chest ? [...save.inventory, rewards.chest] : [...save.inventory],
    chestPity: chest?.pity ?? { ...save.chestPity },
    streak: { day, lastClaimDay: dayString(today), windowStartDay: dayString(anchor + currentWindow * 7), restDaysUsed },
  };
  return { save: next, rewards };
}
