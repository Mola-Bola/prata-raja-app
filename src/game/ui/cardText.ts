// Level-up card text and art keys: pure data, no React or DOM (the test runs it under Node).
// Every line is at most 8 words (__tests__/cardText.test.ts). Names and sprites come from CONTENT.
import { CONTENT } from '@/content';
import type { BreadId, Card, DipId, PassiveId } from '@/core/types';

const BREAD_LINES: Record<BreadId, string> = {
  kosong: 'Spinning prata, ricochets at L3',
  tissue: 'Pierces through a line of pests',
  'roti-bomb': 'Lobbed bomb, splash damage',
  'egg-telur': 'Bursts into fragments on hit',
  thosai: 'Rolling wave hits a whole row',
  chapati: 'Boomerang hits twice',
  naan: 'Slow lob, big landing blast',
  'garlic-naan': 'Lingering garlic zone hurts all inside',
  murtabak: 'Heavy slam: knockback and stun',
  appam: 'Bounces from pest to pest',
  idli: 'Quick volley of mini idli',
  vadai: 'Orbiting vadai guard the counter',
};

const DIP_LINES: Record<DipId, string> = {
  'fish-curry': 'Burns over time',
  'condensed-milk': 'Slows; 5 stacks = Sugar Crash',
  'mint-chutney': 'Chills; 3 chills freeze',
  masala: 'Sparks jump to nearby pests',
  'mutton-curry': 'Knockback; foes take more damage',
  'chicken-curry': 'Hits stack damage; full stacks crit',
  sambal: 'Burning foes explode on death',
  'teh-tarik': 'Every 5th hit speeds up throws',
  ghee: 'Hits spin: faster shots, bigger crits',
  dhal: 'Heals a little on every kill',
};

/** Passives whose CONTENT desc runs past 8 words; the same numbers, shorter words. */
const PASSIVE_LINES: Partial<Record<PassiveId, string>> = {
  'kopi-break': '+0.3 HP/s regen; heal 5% on level-up',
  'bigger-tips': '+15% XP; XP flies to the counter',
  multitasker: 'Throw while moving, 25% rate, +25%/lvl',
};

/** ASSET_URLS keys of the card frames: passives plain, breads rare (gold), dips epic (purple). */
export type CardFrame = 'ui/card' | 'ui/card-rare' | 'ui/card-epic';

export type CardView = {
  name: string;
  line: string;
  /** Spoken label for the card button. */
  label: string;
  /** ASSET_URLS key of the item art. */
  sprite: string;
  frame: CardFrame;
  /** 'NEW' for a first pick, level pips (●●●○○) for an upgrade, null for heal and gold. */
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
    case 'bread': {
      const d = CONTENT.breads[card.id as BreadId];
      return item(d.name, BREAD_LINES[d.id], d.sprite, 'ui/card-rare', card.level, d.levels.length);
    }
    case 'dip': {
      const d = CONTENT.dips[card.id as DipId];
      return item(d.name, DIP_LINES[d.id], d.sprite, 'ui/card-epic', card.level, d.levels.length);
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
