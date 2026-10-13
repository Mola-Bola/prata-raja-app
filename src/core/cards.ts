import { dipMatchesBread, isLinkableDip, MAX_LINKED_DIPS } from './dipLinks';
// Level-up cards: what is offered and what a pick does.
// OWNER: swarm builder "cards".
import type { Rng } from './rng';
import { computeStats } from './stats';
import type { BreadId, Card, Content, DipId, Loadout, PassiveId, Player } from './types';

export const MAX_BREADS = 4;
export const MAX_DIPS = 4;
const MAX_LEVEL = 5;

function dipLink(player: Player, id: string, content: Content, signature?: BreadId): BreadId | undefined {
  const owned = player.dips.find(d => d.id === id);
  if (owned) return owned.linkedBread;
  if (!signature || !isLinkableDip(content.dips[id as DipId]) || player.dips.filter(d => d.linkedBread).length >= MAX_LINKED_DIPS) return;
  const target = player.breads.find(b => b.id === signature || content.breads[b.id].evolvedFrom?.bread === signature);
  return target && dipMatchesBread(content.dips[id as DipId], content.breads[target.id]) ? target.id : undefined;
}

function evolutionReady(player: Player, def: Content['breads'][BreadId], content: Content): boolean {
  const from = def.evolvedFrom;
  if (!from || !player.breads.some(b => b.id === from.bread && b.level === 5)) return false;
  return from.partner.kind === 'dip'
    ? player.dips.some(d => d.id === from.partner.id && d.level === 5)
    : player.passives.some(p => p.id === from.partner.id && p.level === content.passives[p.id].maxLevel);
}

type Candidate = { card: Card; weight: number };

/** Draw `n` (default 3) distinct cards (never two with the same id). Candidates and weights:
 *  owned bread below L5 -> level + 1 (1.2) · new bread from breadPool when breads < MAX_BREADS -> level 1 (0.8)
 *  owned dip below L5 (1.0) · new dip from dipPool when dips < MAX_DIPS (0.8)
 *  passive below its maxLevel, owned or new (0.7).
 *  Guarantee: when the player owns no dip and dipPool is non-empty, at least one card is a new dip.
 *  A signature multiplies its bread/synergy weights by 1.6; up to two linked supports name that bread.
 *  Pools default to every bread/dip whose unlock is 'starter'. Short of candidates: fill with
 *  { kind: 'heal', id: '', level: 1 } then { kind: 'gold', id: '', level: 1 }. Deterministic for a given rng state. */
export function drawOffer(
  player: Player, content: Content, rng: Rng,
  opts?: { n?: number; breadPool?: BreadId[]; dipPool?: DipId[]; recentOffers?: readonly Card[][]; signatureBread?: BreadId },
): Card[] {
  const n = opts?.n ?? 3;
  const breadPool = opts?.breadPool ?? Object.values(content.breads).filter((b) => b.unlock === 'starter').map((b) => b.id).sort();
  const dipPool = opts?.dipPool ?? Object.values(content.dips).filter((d) => d.unlock === 'starter').map((d) => d.id).sort();

  const cands: Candidate[] = [];
  for (const b of player.breads) {
    if (!content.breads[b.id].evolvedFrom && b.level < MAX_LEVEL) cands.push({ card: { kind: 'bread', id: b.id, level: b.level + 1 }, weight: 1.2 });
  }
  if (player.breads.length < MAX_BREADS) {
    for (const id of new Set(breadPool)) {
      if (!content.breads[id].evolvedFrom && !player.breads.some((b) => b.id === id || content.breads[b.id].evolvedFrom?.bread === id)) cands.push({ card: { kind: 'bread', id, level: 1 }, weight: 0.8 });
    }
  }
  for (const d of player.dips) {
    if (d.level < MAX_LEVEL) cands.push({ card: { kind: 'dip', id: d.id, level: d.level + 1 }, weight: 1 });
  }
  if (player.dips.length < MAX_DIPS) {
    for (const id of new Set(dipPool)) {
      if (!player.dips.some((d) => d.id === id)) cands.push({ card: { kind: 'dip', id, level: 1 }, weight: 0.8 });
    }
  }
  for (const p of Object.values(content.passives).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const level = player.passives.find((o) => o.id === p.id)?.level ?? 0;
    if (level < p.maxLevel) cands.push({ card: { kind: 'passive', id: p.id, level: level + 1 }, weight: 0.7 });
  }

  const signature = opts?.signatureBread;
  if (signature) {
    const def = content.breads[signature];
    const synergies = def.motion === 'orbit' || def.id === 'idli'
      ? ['condensed-milk', 'chicken-curry', 'hot-tawa']
      : def.motion === 'lob' || def.id === 'murtabak'
        ? ['fish-curry', 'mutton-curry', 'big-dough', 'strong-wrists']
        : ['ghee', 'teh-tarik', 'fast-flip', 'lucky-towel'];
    for (const c of cands) {
      if (c.card.id === signature || synergies.includes(c.card.id)) c.weight *= 1.6;
      if (c.card.kind === 'dip') c.card.linkedBread = dipLink(player, c.card.id, content, signature);
    }
  }

  const evolutions = Object.values(content.breads).filter(b => evolutionReady(player, b, content));
  const recent = new Set(opts?.recentOffers?.slice(-2).flat().map((c) => `${c.kind}:${c.id}`));
  for (const c of cands) if (recent.has(`${c.card.kind}:${c.card.id}`)) c.weight *= 0.15;

  const offer: Card[] = [];
  if (n > 0 && evolutions.length) offer.push({ kind: 'evolve', id: rng.pick(evolutions).id, level: 1 });
  const take = (c: Candidate) => {
    for (let i = cands.length - 1; i >= 0; i--) if (cands[i].card.kind === c.card.kind && cands[i].card.id === c.card.id) cands.splice(i, 1);
    offer.push(c.card);
  };
  // Guarantee: a player with no dip is always offered a new one (when the pool has any).
  if (offer.length < n && player.dips.length === 0) {
    const newDips = cands.filter((c) => c.card.kind === 'dip');
    if (newDips.length > 0) take(rng.weighted(newDips, (c) => c.weight));
  }
  while (offer.length < n && cands.length > 0) take(rng.weighted(cands, (c) => c.weight));
  if (offer.length < n) offer.push({ kind: 'heal', id: '', level: 1 });
  if (offer.length < n) offer.push({ kind: 'gold', id: '', level: 1 });
  return offer;
}

/** Apply a picked card to the player (mutates player): add a new item at level 1 (bread gets cd 0, volleyLeft 0,
 *  volleyT 0) or set the owned item's level to card.level; then recompute player.stats with computeStats(passives,
 *  content, loadout); if maxHp rose, heal by the rise (hp never above maxHp). heal: hp += 30% maxHp (capped).
 *  gold: returns { gold: 25 }. Every other card returns { gold: 0 }. */
export function applyCard(player: Player, card: Card, content: Content, loadout?: Loadout): { gold: number } {
  if (card.kind === 'evolve') {
    const def = content.breads[card.id as BreadId];
    if (!def || !evolutionReady(player, def, content)) return { gold: 0 };
    const owned = player.breads.find(b => b.id === def.evolvedFrom!.bread)!;
    for (const dip of player.dips) if (dip.linkedBread === owned.id) dip.linkedBread = def.id;
    Object.assign(owned, { id: def.id, level: 1, volleyLeft: 0, volleyT: 0, casts: 0 });
  } else if (card.kind === 'bread') {
    const owned = player.breads.find((b) => b.id === card.id);
    if (owned) owned.level = card.level;
    else player.breads.push({ id: card.id as BreadId, level: 1, cd: 0, volleyLeft: 0, volleyT: 0 });
  } else if (card.kind === 'dip') {
    const owned = player.dips.find((d) => d.id === card.id);
    if (owned) owned.level = card.level;
    else {
      const linkedBread = dipLink(player, card.id, content, loadout?.signatureBread);
      player.dips.push({ id: card.id as DipId, level: 1, ...(linkedBread ? { linkedBread } : {}) });
    }
  } else if (card.kind === 'passive') {
    const owned = player.passives.find((p) => p.id === card.id);
    if (owned) owned.level = card.level;
    else player.passives.push({ id: card.id as PassiveId, level: 1 });
  }
  const oldMaxHp = player.stats.maxHp;
  player.stats = computeStats(player.passives, content, loadout);
  const rise = Math.max(0, player.stats.maxHp - oldMaxHp);
  player.hp = Math.min(player.stats.maxHp, player.hp + rise);
  if (card.kind === 'heal') player.hp = Math.min(player.stats.maxHp, player.hp + 0.3 * player.stats.maxHp);
  return { gold: card.kind === 'gold' ? 25 : 0 };
}
