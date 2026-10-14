import { SIMMER_DIPS, validDipXp } from '../core/dipProgression';
import { BREADS } from '../content/breads';
import { DIPS } from '../content/dips';
import { CHAPTERS } from '../content/chapters';
import { freshSave, parseSave } from '../core/save';
import { AFFIX_POOLS, GEAR_BASES, GEAR_VERSION, MAX_ENHANCE, RARITY_INFO, regenAffixes } from './gear';
import { STAT_REGISTRY } from '../core/statRegistry';
import { chooseSignature } from './signature';
import { CONTENT } from '../content';
import { unlocksForXp } from './stall';
import { kannanLevel } from './kannan';
import { BASE_SOCKETS, MAX_SOCKETS } from './sockets';
import { mealDef } from './meals';
import { fusionOf } from './fusion';
import { settleSpec, specNode } from './specTree';
import { milestonesBelow } from './milestones';
import type { DipId } from '../core/types';
import { MATERIALS, RARITIES, SLOTS, TRAINING_IDS, UNLOCK_FLAGS, type GearBaseId, type GearItem, type Rarity, type SaveV2, type SaveV3 } from './types';

const obj = (value: unknown): Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
const num = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
const integer = (value: unknown, max = Number.MAX_SAFE_INTEGER) => Math.min(max, Math.floor(num(value)));
const date = (value: unknown): string | null => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const calendarDay = (value: unknown): string | null => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && date(value)?.slice(0, 10) === value ? value : null;

export function freshSaveV2(): SaveV2 {
  return {
    ...freshSave(), v: 2, prologueSeen: false, signatureBread: 'kosong', stallXp: 0, unlockedBreads: [], unlockedDips: [], dipXp: {}, bossAttempts: {}, inventory: [], equipped: {},
    training: Object.fromEntries(TRAINING_IDS.map(id => [id, 0])),
    materials: { flour: 0, ghee: 0, egg: 0, onion: 0, masala: 0, chilli: 0, curryLeaves: 0, sugar: 0, milk: 0 },
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
  const meta = {
    ...(Number.isSafeInteger(item.ilvl) && num(item.ilvl) >= 1 ? { ilvl: item.ilvl as number } : {}),
    ...(Number.isSafeInteger(item.seed) ? { seed: item.seed as number } : {}),
    ...(Number.isSafeInteger(item.version) ? { version: item.version as number } : {}),
    ...(Number.isSafeInteger(item.enhance) ? { enhance: Math.min(MAX_ENHANCE, num(item.enhance)) } : {}),
    ...(Number.isSafeInteger(item.rerolls) && num(item.rerolls) >= 0 ? { rerolls: num(item.rerolls) } : {}),
    ...(typeof item.uniqueId === 'string' ? { uniqueId: item.uniqueId } : {}),
  };
  const base = { uid: item.uid, baseId, slot, rarity, level: item.level as number, ...meta };
  if (meta.version === GEAR_VERSION) {
    // v2: affixes regenerate from the seed. If the stored ones can't be reproduced (content retuned since), keep them as an
    // override and mark the item legacy (version 1) so they are never silently rerolled.
    const regen = regenAffixes({ ...base, affixes: [] });
    const stored = Array.isArray(item.affixes) ? item.affixes.map(obj) : [];
    const same = regen && stored.length === regen.length && regen.every((a, i) => stored[i].id === a.id && stored[i].value === a.value);
    if (regen && same) return { ...base, affixes: regen };
    const ok = stored.length === RARITY_INFO[rarity].affixes && stored.every(a => AFFIX_POOLS[slot].some(p => p.id === a.id) && typeof a.value === 'number' && Number.isFinite(a.value) && Object.hasOwn(STAT_REGISTRY, a.stat as string));
    return ok ? { ...base, version: 1, affixes: stored.map(a => ({ id: a.id as string, stat: a.stat as keyof typeof STAT_REGISTRY, value: a.value as number, ...(typeof a.tier === 'string' ? { tier: a.tier as 'Fine' } : {}) })) } : null;
  }
  // Legacy: match by id and take stat/value from current content, so a balance retune never drops an owned item.
  const affixes = item.affixes.map(value => AFFIX_POOLS[slot].find(a => a.id === obj(value).id));
  if (affixes.some(a => !a) || new Set(affixes.map(a => a?.id)).size !== affixes.length) return null;
  return { ...base, affixes: affixes.map(a => ({ ...a! })) };
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
  for (const id of SIMMER_DIPS) {
    const xp = validDipXp(obj(raw.dipXp)[id]);
    if (xp) save.dipXp[id] = xp;
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
  const mats = obj(raw.materials);
  for (const type of MATERIALS) save.materials[type] = integer(mats[type]);
  if (mats.masala === undefined) save.materials.masala = integer(mats.spice); // 'spice' was renamed 'masala'; old saves keep their count
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
  return chooseSignature(save, raw.signatureBread, CONTENT);
  } catch { return fresh; }
}

/** Round-8 fields on a v3 save (sockets, spec tree, meal): an additive step inside v3, so no version bump (same pattern as seenMilestones). */
/** Idempotent, never drops owned progress: reads the three round-8 fields from raw JSON, cleaning each on its own.
 *  Junk entries are dropped from sockets/spec/meal only (unknown dip ids, unknown nodes, unknown meal). Absent fields get defaults. */
export function migrateMeta(raw: Record<string, unknown>): Pick<SaveV3, 'sockets' | 'spec' | 'meal' | 'fusions' | 'tiffin'> {
  const sockets: SaveV3['sockets'] = {};
  for (const [bread, list] of Object.entries(obj(raw.sockets))) {
    if (!Object.hasOwn(BASE_SOCKETS, bread) || !Array.isArray(list)) continue;
    const dips = list.slice(0, MAX_SOCKETS).map(d => (typeof d === 'string' && Object.hasOwn(DIPS, d) ? d as DipId : null));
    const seenDip = new Set<string>(); // one socket per dip per roti; keep the first
    sockets[bread] = dips.map(d => (d && !seenDip.has(d) && seenDip.add(d) ? d : null));
  }
  const nodes = Array.isArray(obj(raw.spec).nodes) ? obj(raw.spec).nodes as unknown[] : [];
  const meal = obj(raw.meal).id;
  const list = (v: unknown) => (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === 'string');
  const fusions = [...new Set(list(raw.fusions).filter(id => fusionOf(id)))];
  const tiffin = [...new Set(list(raw.tiffin).filter(id => Object.hasOwn(BASE_SOCKETS, id)))].slice(0, 2);
  return { fusions, tiffin, sockets, spec: { nodes: [...new Set(nodes.filter((id): id is string => typeof id === 'string' && !!specNode(id)))] }, meal: typeof meal === 'string' && mealDef(meal) ? { id: meal } : null };
}
export function freshSaveV3(): SaveV3 {
  return { ...freshSaveV2(), v: 3, beats: [], kannanXp: 0, specPoints: 0, stall: { parts: {} }, seenMilestones: [], ...migrateMeta({}) };
}
/** Pure v2 -> v3. Keeps every v2 field; the Kannan level starts at the old stall level (never lower), and beats mirror progress already made. */
export function migrateV2toV3(save: SaveV2): SaveV3 {
  const beats: string[] = [];
  if (save.prologueSeen) beats.push('prologue');
  for (const c of CHAPTERS) if ((save.bossAttempts[c.id] ?? 0) >= 3) beats.push(`${c.id}-done`);
  return { ...save, v: 3, beats, kannanXp: save.stallXp, specPoints: kannanLevel(save.stallXp) - 1, stall: { parts: {} }, seenMilestones: milestonesBelow(save.stallXp), ...migrateMeta({}) };
}
/** Storage boundary for v3: v1/v2 saves migrate, v3 recovers its own fields independently. Idempotent. */
export function parseSaveV3(json: unknown): SaveV3 {
  if (typeof json !== 'string') return freshSaveV3();
  let raw: Record<string, unknown>;
  try { raw = obj(JSON.parse(json)); } catch { return freshSaveV3(); }
  if (raw.v !== 3) return migrateV2toV3(parseSaveV2(json));
  const base = migrateV2toV3(parseSaveV2(JSON.stringify({ ...raw, v: 2 })));
  const parts: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj(obj(raw.stall).parts))) if (Number.isSafeInteger(v) && (v as number) >= 1) parts[k] = v as number;
  const beats = Array.isArray(raw.beats) ? raw.beats.filter((b): b is string => typeof b === 'string') : [];
  const kannanXp = Math.max(num(raw.kannanXp), base.stallXp);
  // Gates read the Kannan level (never lower than the stall level they were migrated from).
  // A save from before seenMilestones marks the milestones it already passed; a newer one keeps its own list.
  const seenMilestones = Array.isArray(raw.seenMilestones) ? [...new Set(raw.seenMilestones.filter((l): l is number => Number.isSafeInteger(l)))] : milestonesBelow(kannanXp);
  const meta = migrateMeta(raw);
  const { nodes, specPoints } = settleSpec(kannanLevel(kannanXp), meta.spec.nodes); // points are derived from the level, never read from the file
  return { ...base, beats: [...new Set([...base.beats, ...beats])], kannanXp, specPoints, unlocks: { ...base.unlocks, ...unlocksForXp(kannanXp) }, stall: { parts }, seenMilestones, ...meta, spec: { nodes } };
}
