import { dipBonusLabel, dipFamilyLabel, dipMatchesBread, isLinkableDip, tagLabels } from '@/core/dipLinks';
// Level-up card text and art keys: pure data, no React or DOM (the test runs it under Node).
// Every line is at most 8 words and 25 characters (__tests__/cardText.test.ts). Names and sprites come from CONTENT.
import { CONTENT } from '@/content';
import type { BreadId, Card, DipId, PassiveId } from '@/core/types';

/** A card is about 80 px of text wide on a 360 px phone, three to a row: a line wraps every 10 characters or so, so it must stay
 *  short (words and letters both are capped in __tests__/cardText.test.ts) to take three lines at most. */
const BREAD_LINES: Record<BreadId, string> = {
  kosong: 'Spins; ricochets at L3',
  tissue: 'Pierces a line of pests',
  'roti-bomb': 'Bomb with big splash',
  'egg-telur': 'Bursts into bits on hit',
  thosai: 'Wave hits a whole row',
  chapati: 'Boomerang hits twice',
  naan: 'Slow lob, big blast',
  'garlic-naan': 'Zone hurts all inside',
  murtabak: 'Slam: knockback, stun',
  appam: 'Bounces between pests',
  idli: 'Volley of mini idli',
  vadai: 'Orbiting vadai guard you',
  'golden-ghee-chakra': 'Bounces off 6 pests',
  'tarik-lance': 'Fast, endless pierce',
  'inferno-bomb': 'Blast leaves burning zone',
  'half-boiled-halo': 'Homing bits heal on hit',
  'thosai-typhoon': 'Wide wave pulls foes in',
  'tandoor-meteor': 'Blast makes foes tender',
  'garlic-thunder-zone': 'Zone sparks jump to foes',
  'crusher-murtabak': 'Stun; 5th throw crits',
};

const DIP_LINES: Record<DipId, string> = {
  'fish-curry': 'Burns over time',
  'condensed-milk': 'Slows, then Sugar Crash',
  'mint-chutney': 'Chills; 3 chills freeze',
  masala: 'Sparks jump to pests',
  'mutton-curry': 'Shoves; foes hurt more',
  'chicken-curry': 'Stacking damage, crits',
  sambal: 'Burning foes explode',
  'teh-tarik': '5th hit speeds throws',
  ghee: 'Faster shots, big crits',
  dhal: 'Heals a little per kill',
};

/** Passives whose CONTENT desc is too long for a card; the same numbers, shorter words. */
const PASSIVE_LINES: Partial<Record<PassiveId, string>> = {
  'extra-dough': '+1 bread, 12° fan',
  'big-dough': '+10% size and blast',
  'crisp-edges': '+3% crit, +0.1 crit dmg',
  'curry-soak': 'Hits splash +8% nearby',
  'crackling-curry': 'Crits splash +20% nearby',
  'twice-fried': 'Splash can crit',
  'kopi-break': '+0.3 HP/s; heals on level',
  'bigger-tips': '+15% XP, auto-collected',
  multitasker: 'Throw on the move +25%',
  'second-helping': '+1 revive at half HP',
};

/** ASSET_URLS keys of the card frames: passives plain, breads rare (gold), dips and evolutions epic (purple). */
export type CardFrame = 'ui/card' | 'ui/card-rare' | 'ui/card-epic';

export type CardView = {
  family?: string;
  fit?: string;
  bonus?: string;
  name: string;
  line: string;
  /** Linked dip effects are rendered beside their original link line. */
  effect?: string;
  /** Dips affect every bread unless linked to one. Keep this separate from their effect. */
  scope?: string;
  /** Spoken label for the card button. */
  label: string;
  /** ASSET_URLS key of the item art. */
  sprite: string;
  frame: CardFrame;
  /** 'EVOLVE' for an evolution, 'NEW' for a first pick, level pips (●●●○○) for an upgrade, null for heal and gold. */
  badge: string | null;
};

/** Pips for the level a card makes: level 3 of 5 is ●●●○○. */
export function pipText(level: number, max: number): string {
  return '●'.repeat(level) + '○'.repeat(Math.max(0, max - level));
}

const badgeFor = (level: number, max: number): string => (level <= 1 ? 'NEW' : pipText(level, max));

function item(name: string, line: string, sprite: string, frame: CardFrame, level: number, max: number): CardView {
  const badge = badgeFor(level, max);
  const spoken = level <= 1 ? 'new' : `level ${level} of ${max}`;
  return { name, line, label: `${name}, ${spoken}. ${line}`, sprite, frame, badge };
}

export function cardView(card: Card): CardView {
  switch (card.kind) {
    case 'evolve':
    case 'bread': {
      const d = CONTENT.breads[card.id as BreadId];
      const view = item(d.name, BREAD_LINES[d.id], d.sprite, card.kind === 'evolve' ? 'ui/card-epic' : 'ui/card-rare', card.level, d.evolvedFrom ? 1 : d.levels.length);
      return card.kind === 'evolve' ? { ...view, badge: 'EVOLVE', label: `Evolve ${d.name}. ${view.line}` } : view;
    }
    case 'dip': {
      const d = CONTENT.dips[card.id as DipId];
      const view = item(d.name, DIP_LINES[d.id], d.sprite, 'ui/card-epic', card.level, d.levels.length);
      const metadata = { family: dipFamilyLabel(d), fit: isLinkableDip(d) ? `Fits: ${tagLabels(d.matchingTags!)}` : undefined };
      if (!card.linkedBread) return { ...view, ...metadata, scope: 'All breads' };
      const linked = CONTENT.breads[card.linkedBread];
      const name = CONTENT.breads[linked.evolvedFrom?.bread ?? linked.id].name;
      const scope = `Linked to ${name}`;
      return { ...view, ...metadata, bonus: dipBonusLabel(d, linked), effect: view.line, line: scope.length <= 25 ? scope : `Link: ${name}`, scope, label: `${view.label}. Linked to ${name}; ${!dipMatchesBread(d, linked) ? 'ordinary effect; No tag bonus' : d.id === 'condensed-milk' ? 'longer Sticky and Sugar Crash' : d.id === 'mint-chutney' ? 'longer chill and freeze' : 'stronger burn'} on this bread only.` };
    }
    case 'passive': {
      const d = CONTENT.passives[card.id as PassiveId];
      return item(d.name, PASSIVE_LINES[d.id] ?? d.desc, d.sprite, 'ui/card', card.level, d.maxLevel);
    }
    // Same numbers as applyCard in src/core/cards.ts (30% of max HP, 25 gold). Change both together.
    case 'heal':
      return { name: 'Kopi break', line: 'Heal 30% of max HP', label: 'Kopi break. Heal 30% of max HP', sprite: 'ui/heart', frame: 'ui/card', badge: null };
    case 'gold':
      return { name: 'Tips', line: '+25 gold', label: 'Tips. +25 gold', sprite: 'ui/coins', frame: 'ui/card', badge: null };
  }
}
