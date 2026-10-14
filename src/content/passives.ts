import type { PassiveDef, PassiveId } from '../core/types';

// Passives have no art yet, so every card uses the level-up ring. perLevel is added to PlayerStats once per level.

export const PASSIVES: Record<PassiveId, PassiveDef> = {
  'strong-wrists': { id: 'strong-wrists', name: 'Strong Wrists', desc: '+6% damage', maxLevel: 5, perLevel: { dmgPct: 0.06 }, sprite: 'passives/strong-wrists' },
  'fast-flip': { id: 'fast-flip', name: 'Fast Flip', desc: '+5% throw speed', maxLevel: 5, perLevel: { throwSpeedPct: 0.05 }, sprite: 'passives/fast-flip' },
  'extra-dough': { id: 'extra-dough', name: 'Extra Dough', desc: '+1 projectile, 12° fan', maxLevel: 3, perLevel: { extraProjectiles: 1 }, sprite: 'passives/extra-dough' },
  'big-dough': { id: 'big-dough', name: 'Big Dough', desc: '+10% projectile size and AoE radius', maxLevel: 5, perLevel: { sizePct: 0.1 }, sprite: 'passives/big-dough' },
  'hot-tawa': { id: 'hot-tawa', name: 'Hot Tawa', desc: '+10% DoT damage', maxLevel: 5, perLevel: { dotPct: 0.1 }, sprite: 'passives/hot-tawa' },
  'lucky-towel': { id: 'lucky-towel', name: 'Lucky Towel', desc: '+2% crit chance', maxLevel: 5, perLevel: { critChance: 0.02 }, sprite: 'passives/lucky-towel' },
  'thick-skin': { id: 'thick-skin', name: 'Thick Skin', desc: '+10 max HP', maxLevel: 5, perLevel: { maxHp: 10 }, sprite: 'passives/thick-skin' },
  'kopi-break': {
    id: 'kopi-break',
    name: 'Kopi Break',
    desc: '+0.3 HP/s regen; heal 5% max HP on level-up',
    maxLevel: 5,
    perLevel: { regen: 0.3, healOnLevelUpPct: 0.05 },
    sprite: 'passives/kopi-break',
  },
  'sharp-eye': { id: 'sharp-eye', name: 'Sharp Eye', desc: '+8% range', maxLevel: 5, perLevel: { rangePct: 0.08 }, sprite: 'passives/sharp-eye' },
  'bigger-tips': {
    id: 'bigger-tips',
    name: 'Bigger Tips',
    desc: '+15% XP (XP flies to the counter by itself)',
    maxLevel: 5,
    perLevel: { xpPct: 0.15 },
    sprite: 'passives/bigger-tips',
  },
  // Crisp & Soak axes (docs/BUILDS.md). Art reuses existing passive sprites until new icons exist.
  'crisp-edges': { id: 'crisp-edges', name: 'Crisp Edges', desc: '+3% crit chance, +0.1 crit damage, -5% DoT', maxLevel: 5, perLevel: { critChance: 0.03, critMult: 0.1, dotPct: -0.05 }, sprite: 'passives/lucky-towel' },
  'curry-soak': { id: 'curry-soak', name: 'Curry Soak', desc: 'Hits splash +8% damage and dip effects nearby', maxLevel: 5, perLevel: { soak: 0.08 }, sprite: 'passives/big-dough' },
  'crackling-curry': { id: 'crackling-curry', name: 'Crackling Curry', desc: 'Crits splash +20% damage and dip effects nearby', maxLevel: 3, perLevel: { critSplash: 0.2 }, sprite: 'passives/hot-tawa' },
  'twice-fried': { id: 'twice-fried', name: 'Twice-Fried', desc: 'Splash can crit; +5% soak', maxLevel: 1, perLevel: { splashCrit: 1, soak: 0.05 }, sprite: 'passives/strong-wrists' },
  multitasker: {
    id: 'multitasker',
    name: 'Multitasker',
    desc: 'Throw while moving at 25% rate, +25% per level',
    maxLevel: 3,
    perLevel: { throwWhileMoving: 0.25 },
    sprite: 'passives/multitasker',
  },
  'second-helping': {
    id: 'second-helping',
    name: 'Second Helping',
    desc: '+1 revive per run; revive at 50% HP',
    maxLevel: 2,
    perLevel: { revives: 1 },
    sprite: 'passives/second-helping',
  },
};
