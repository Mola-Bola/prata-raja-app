// Dip sockets (round 8, milestone 5): each roti has 1-3 katori. A dip socketed into the roti you start with is in the run from
// the first throw, through Loadout.startDips (the run then treats it like a picked dip, linked to that roti).
import type { BreadId, Content, DipId } from '../core/types';
import { kannanLevel, kannanXpOf } from './kannan';
import { runPools } from './recipes';
import type { Material, SaveV2, SaveV3 } from './types';

export const MAX_SOCKETS = 3;
/** Base sockets per starter roti. Rarer / later breads hold more. Evolutions are never a start roti. */
export const BASE_SOCKETS: Record<string, number> = {
  kosong: 1, tissue: 1, 'roti-bomb': 1, chapati: 1,
  thosai: 2, 'egg-telur': 2, appam: 2, idli: 2, naan: 2, vadai: 2,
  'garlic-naan': 3, murtabak: 3,
};
/** Mastery: Kannan level 10 opens one more katori on every roti (cap MAX_SOCKETS). */
export const MASTERY_LEVEL = 10;
/** The forge adds one more katori (cap MAX_SOCKETS). */
export const SOCKET_FORGE_COST: { gold: number; materials: Partial<Record<Material, number>> } = { gold: 400, materials: { ghee: 3 } };

const stored = (save: SaveV2): Record<string, (DipId | null)[]> => (save as Partial<SaveV3>).sockets ?? {};
export const baseSockets = (bread: BreadId | string): number => BASE_SOCKETS[bread] ?? 1;
export const socketCount = (save: SaveV2, bread: BreadId | string): number =>
  Math.min(MAX_SOCKETS, Math.max(stored(save)[bread]?.length ?? 0, baseSockets(bread) + (kannanLevel(kannanXpOf(save)) >= MASTERY_LEVEL ? 1 : 0)));
/** The sockets of one roti, padded to socketCount with empty ones. */
export const socketsOf = (save: SaveV2, bread: BreadId | string): (DipId | null)[] =>
  Array.from({ length: socketCount(save, bread) }, (_, i) => stored(save)[bread]?.[i] ?? null);

/** Put `dip` (or null to empty) into socket `index` of `bread`. Needs a dip you can use, one socket per dip per roti. */
export function socketDip<S extends SaveV2>(save: S, bread: BreadId | string, index: number, dip: DipId | null, content: Content): S {
  const now = socketsOf(save, bread);
  if (!Number.isInteger(index) || index < 0 || index >= now.length || now[index] === dip) return save;
  if (dip && (!runPools(save, content).dipPool.includes(dip) || now.includes(dip))) return save;
  const next = now.map((d, i) => (i === index ? dip : d));
  return { ...save, sockets: { ...stored(save), [bread]: next } };
}
export function canAddSocket(save: SaveV2, bread: BreadId | string): boolean {
  return socketCount(save, bread) < MAX_SOCKETS && save.gold >= SOCKET_FORGE_COST.gold &&
    Object.entries(SOCKET_FORGE_COST.materials).every(([m, n]) => save.materials[m as Material] >= n!);
}
export function addSocket<S extends SaveV2>(save: S, bread: BreadId | string): S {
  if (!canAddSocket(save, bread)) return save;
  const materials = { ...save.materials };
  for (const [m, n] of Object.entries(SOCKET_FORGE_COST.materials)) materials[m as Material] -= n!;
  return { ...save, gold: save.gold - SOCKET_FORGE_COST.gold, materials, sockets: { ...stored(save), [bread]: [...socketsOf(save, bread), null] } };
}
/** Dips that start the run: the start roti's sockets, only dips still in the run pool, no repeats. */
export function startDips(save: SaveV2, bread: BreadId, content: Content): { id: DipId; linkedBread: BreadId }[] {
  const pool = runPools(save, content).dipPool;
  return [...new Set(socketsOf(save, bread).filter((d): d is DipId => !!d && pool.includes(d)))].map(id => ({ id, linkedBread: bread }));
}
