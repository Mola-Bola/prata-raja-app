import { BREADS } from '../content/breads';
import { DIPS } from '../content/dips';
import { CHAPTERS } from '../content/chapters';
import { freshSave, parseSave } from '../core/save';
import { AFFIX_POOLS, GEAR_BASES, RARITY_INFO } from './gear';
import { unlocksForXp } from './stall';
import { MATERIALS, RARITIES, SLOTS, TRAINING_IDS, UNLOCK_FLAGS, type GearBaseId, type GearItem, type Rarity, type SaveV2 } from './types';

const obj = (value: unknown): Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
const num = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
const integer = (value: unknown, max = Number.MAX_SAFE_INTEGER) => Math.min(max, Math.floor(num(value)));
const date = (value: unknown): string | null => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const calendarDay = (value: unknown): string | null => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && date(value)?.slice(0, 10) === value ? value : null;

export function freshSaveV2(): SaveV2 {
  return {
    ...freshSave(), v: 2, prologueSeen: false, stallXp: 0, unlockedBreads: [], unlockedDips: [], bossAttempts: {}, inventory: [], equipped: {},
    training: { wrist: 0, stamina: 0, flip: 0 },
    materials: { flour: 0, ghee: 0, egg: 0, onion: 0, spice: 0, sugar: 0, milk: 0 },
    streak: { day: 0, lastClaimDay: null, windowStartDay: null, restDaysUsed: 0 },
    idle: { lastCollectedAt: null }, chestPity: { rare: 0, epic: 0, opened: 0 },
    unlocks: {}, pendingChests: [],
  };
}
function parseItem(value: unknown): GearItem | null {
  const item = obj(value);
  if (typeof item.uid !== 'string' || !item.uid || typeof item.baseId !== 'string' ||
      !Object.hasOwn(GEAR_BASES, item.baseId) || !RARITIES.includes(item.rarity as Rarity)) return null;
  const baseId = item.baseId as GearBaseId;
  const slot = GEAR_BASES[baseId];
  const rarity = item.rarity as Rarity;
  if (item.slot !== slot || !Number.isSafeInteger(item.level) || num(item.level) < 1 ||
      !Array.isArray(item.affixes) || item.affixes.length !== RARITY_INFO[rarity].affixes) return null;
  // Match by id and take stat/value from current content, so a balance retune never drops an owned item.
  const affixes = item.affixes.map(value => AFFIX_POOLS[slot].find(a => a.id === obj(value).id));
  if (affixes.some(a => !a) || new Set(affixes.map(a => a?.id)).size !== affixes.length) return null;
  return { uid: item.uid, baseId, slot, rarity, level: item.level as number, affixes: affixes.map(a => ({ ...a! })) };
}
/** Storage boundary: unknown versions and garbage are fresh; damaged fields recover independently. */
export function parseSaveV2(json: unknown): SaveV2 {
  const fresh = freshSaveV2();
  if (typeof json !== 'string') return fresh;
  try {
  const raw = obj(JSON.parse(json));
  if (raw.v !== 1 && raw.v !== 2) return fresh;
  const base = parseSave(JSON.stringify({ ...raw, v: 1 }));
  const save: SaveV2 = { ...fresh, ...base, v: 2, prologueSeen: raw.prologueSeen === true };
  if (raw.bossAttempts === undefined) {
    // Legacy wins prove attempts; reaching the boss wave proves at least one, not one per run.
    const attempts = Math.max(integer(base.wins), Number(base.bestWave >= CHAPTERS[0].waves.length));
    if (attempts) save.bossAttempts[CHAPTERS[0].id] = attempts;
  }
  if (raw.v === 1) {
    save.idle.lastCollectedAt = date(base.lastPlayed);
    return save;
  }
  save.stallXp = num(raw.stallXp);
  save.unlockedBreads = Object.values(BREADS).filter(b => !b.evolvedFrom && Array.isArray(raw.unlockedBreads) && raw.unlockedBreads.includes(b.id)).map(b => b.id);
  save.unlockedDips = Object.values(DIPS).filter(d => Array.isArray(raw.unlockedDips) && raw.unlockedDips.includes(d.id)).map(d => d.id);
  for (const chapter of CHAPTERS) {
    const attempts = integer(obj(raw.bossAttempts)[chapter.id]);
    if (attempts) save.bossAttempts[chapter.id] = attempts;
  }
  const seen = new Set<string>();
  if (Array.isArray(raw.inventory)) for (const value of raw.inventory) {
    const item = parseItem(value);
    if (item && !seen.has(item.uid)) { save.inventory.push(item); seen.add(item.uid); }
  }
  for (const slot of SLOTS) {
    const uid = obj(raw.equipped)[slot];
    if (save.inventory.some(i => i.uid === uid && i.slot === slot)) save.equipped[slot] = uid as string;
  }
  for (const id of TRAINING_IDS) save.training[id] = integer(obj(raw.training)[id], 5);
  for (const type of MATERIALS) save.materials[type] = integer(obj(raw.materials)[type]);
  const streak = obj(raw.streak);
  const lastClaimDay = calendarDay(streak.lastClaimDay);
  const windowStartDay = calendarDay(streak.windowStartDay);
  if (lastClaimDay && windowStartDay && windowStartDay <= lastClaimDay &&
      (Date.parse(lastClaimDay) - Date.parse(windowStartDay)) / 86400000 < 7) {
    save.streak = { day: Math.max(1, integer(streak.day, 7)), lastClaimDay, windowStartDay, restDaysUsed: integer(streak.restDaysUsed, 2) };
  }
  save.idle.lastCollectedAt = date(obj(raw.idle).lastCollectedAt);
  const pity = obj(raw.chestPity);
  save.chestPity = { rare: integer(pity.rare) % 5, epic: integer(pity.epic) % 20, opened: integer(pity.opened) };
  for (const flag of UNLOCK_FLAGS) if (obj(raw.unlocks)[flag] === true) save.unlocks[flag] = true;
  Object.assign(save.unlocks, unlocksForXp(save.stallXp));
  // A closed chest must name an item that is still owned; anything else is dropped (the item itself is never lost).
  if (Array.isArray(raw.pendingChests)) for (const uid of raw.pendingChests) {
    if (typeof uid === 'string' && seen.has(uid) && !save.pendingChests.includes(uid)) save.pendingChests.push(uid);
  }
  return save;
  } catch { return fresh; }
}
