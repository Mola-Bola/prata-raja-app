import type { BreadDef, BreadId, BreadStats } from '../core/types';

// unlock: 'starter' = S1 starter pool; 'starter-s2' = S2 starter pool with no recipe; 'rc-...' = crafted at the stall first.
// roti-bomb is 'starter' (S1 pool) even though CONTENT.md also lists rc-roti-bomb.

/** Every BreadStats field at zero ("not used"). count is shots per throw: 1 for most breads. */
const BLANK: BreadStats = {
  dmg: 0, cooldown: 0, speed: 0, radius: 0, range: 0, count: 1, spread: 0, volleyGap: 0,
  pierce: 0, hops: 0, hopRange: 0, hopFalloff: 0, fragments: 0, fragmentDmg: 0,
  blast: 0, lobTime: 0, zoneTime: 0, zoneDps: 0, width: 0, stun: 0, knockback: 0,
  orbitRadius: 0, orbitHitGap: 0, armourPierce: 0, homing: 0,
};

/** L1 base, then four cumulative upgrades for L2..L5: each is added on top of the level before. */
function ladder(
  l1: Partial<BreadStats>,
  ups: [Partial<BreadStats>, Partial<BreadStats>, Partial<BreadStats>, Partial<BreadStats>],
): BreadStats[] {
  const levels: BreadStats[] = [{ ...BLANK, ...l1 }];
  for (const up of ups) levels.push({ ...levels[levels.length - 1], ...up });
  return levels;
}

export const BREADS: Record<BreadId, BreadDef> = {
  kosong: {
    id: 'kosong',
    name: 'Kosong',
    flavor: 'Plain, honest, and it never leaves the tawa.',
    sprite: 'breads/kosong',
    motion: 'straight',
    target: 'nearest',
    unlock: 'starter',
    levels: ladder({ dmg: 10, cooldown: 0.8, speed: 900, radius: 18.2, range: 950 }, [
      { dmg: 12, cooldown: 0.72 },
      { hops: 1, hopRange: 260, cooldown: 0.68 },
      { hops: 2, cooldown: 0.64 },
      { dmg: 15, cooldown: 0.58 },
    ]),
  },
  tissue: {
    id: 'tissue',
    name: 'Tissue',
    flavor: 'Paper-thin and sharp enough to poke a cockroach.',
    sprite: 'breads/tissue',
    motion: 'straight',
    target: 'nearest',
    unlock: 'starter',
    levels: ladder({ dmg: 4.8, cooldown: 0.9, speed: 1000, radius: 13, range: 950, pierce: 3 }, [
      { pierce: 4 },
      { dmg: 6 },
      { pierce: 5 },
      { armourPierce: 0.25 },
    ]),
  },
  'roti-bomb': {
    id: 'roti-bomb',
    name: 'Roti Bomb',
    flavor: 'Lands soft, explodes loud, clears the whole row.',
    sprite: 'breads/roti-bomb',
    motion: 'lob',
    target: 'cluster',
    unlock: 'starter',
    // ponytail: scorch zoneDps 3.6 is a guess for the balance sim to tune.
    levels: ladder({ dmg: 7.2, cooldown: 1.6, range: 850, blast: 80, lobTime: 0.9 }, [
      { dmg: 9 },
      { blast: 100 },
      { zoneTime: 2, zoneDps: 3.6 },
      { count: 2, spread: 15 },
    ]),
  },
  'egg-telur': {
    id: 'egg-telur',
    name: 'Egg (Telur)',
    flavor: 'One egg in, three fragments out. Breakfast economics.',
    sprite: 'breads/egg-telur',
    motion: 'straight',
    target: 'nearest',
    unlock: 'rc-egg-telur',
    // ponytail: L5 "fragments split once" has no BreadStats field yet; approximated as 8 fragments (2 each).
    levels: ladder({ dmg: 5.4, cooldown: 1.1, speed: 700, radius: 15.6, range: 950, fragments: 3, fragmentDmg: 2.4 }, [
      { fragments: 4 },
      { homing: 0.3 },
      { dmg: 6.6 },
      { fragments: 8 },
    ]),
  },
  thosai: {
    id: 'thosai',
    name: 'Thosai',
    flavor: 'Wide and golden, sweeps the whole counter clean.',
    sprite: 'breads/thosai',
    motion: 'wave',
    target: 'none',
    unlock: 'starter',
    levels: ladder({ dmg: 6.6, cooldown: 1.2, speed: 700, radius: 26, range: 900, width: 200 }, [
      { width: 240 },
      { dmg: 8.4 },
      { dmg: 9.6, width: 270 },
      { cooldown: 0.9 },
    ]),
  },
  chapati: {
    id: 'chapati',
    name: 'Chapati',
    flavor: 'It always comes back, like a regular customer.',
    sprite: 'breads/chapati',
    motion: 'boomerang',
    target: 'nearest',
    unlock: 'starter',
    levels: ladder({ dmg: 4.2, cooldown: 1.2, speed: 800, radius: 20.8, range: 600 }, [
      { dmg: 5.4 },
      { dmg: 6.6 },
      { range: 750 },
      { cooldown: 1.0 },
    ]),
  },
  naan: {
    id: 'naan',
    name: 'Naan',
    flavor: 'Slow to fly, heavy to land, impossible to ignore.',
    sprite: 'breads/naan',
    motion: 'lob',
    target: 'cluster',
    unlock: 'rc-naan',
    levels: ladder({ dmg: 10.8, cooldown: 1.8, range: 850, blast: 110, lobTime: 1.2 }, [
      { dmg: 13.2 },
      { blast: 130 },
      { stun: 0.3 },
      { cooldown: 1.5 },
    ]),
  },
  'garlic-naan': {
    id: 'garlic-naan',
    name: 'Garlic Naan',
    flavor: 'The smell lingers, and so do the enemies.',
    sprite: 'breads/garlic-naan',
    motion: 'lob',
    target: 'cluster',
    unlock: 'rc-garlic-naan',
    // blast doubles as the zone radius.
    levels: ladder({ dmg: 3.6, cooldown: 2.4, range: 850, blast: 90, lobTime: 1.2, zoneTime: 3, zoneDps: 7.2 }, [
      { zoneTime: 4 },
      { zoneDps: 9.6 },
      { zoneDps: 12 },
      { blast: 120 },
    ]),
  },
  murtabak: {
    id: 'murtabak',
    name: 'Murtabak',
    flavor: 'Stuffed heavy, lands heavier. Nobody stands after.',
    sprite: 'breads/murtabak',
    motion: 'straight',
    target: 'nearest',
    unlock: 'rc-murtabak',
    levels: ladder({ dmg: 9.6, cooldown: 1.6, speed: 700, radius: 23.4, range: 950, knockback: 120, stun: 0.4 }, [
      { dmg: 12 },
      { stun: 0.6 },
      { knockback: 160 },
      { cooldown: 1.3 },
    ]),
  },
  appam: {
    id: 'appam',
    name: 'Appam',
    flavor: 'Bowl-shaped and bouncy, passes the hot potato along.',
    sprite: 'breads/appam',
    motion: 'straight',
    target: 'nearest',
    unlock: 'starter-s2',
    levels: ladder({ dmg: 4.8, cooldown: 1.0, speed: 800, radius: 18.2, range: 950, hops: 3, hopRange: 300, hopFalloff: 0.15 }, [
      { hops: 4 },
      { dmg: 6 },
      { hopFalloff: 0 },
      { dmg: 7.2 },
    ]),
  },
  idli: {
    id: 'idli',
    name: 'Idli',
    flavor: 'Little steamed rounds, many of them, all at once.',
    sprite: 'breads/idli',
    motion: 'straight',
    target: 'nearest',
    unlock: 'starter-s2',
    levels: ladder({ dmg: 1.8, cooldown: 1.0, speed: 950, radius: 10.4, range: 950, count: 4, spread: 6, volleyGap: 0.1 }, [
      { count: 5 },
      { dmg: 2.4 },
      { spread: 20 },
      { cooldown: 0.8 },
    ]),
  },
  vadai: {
    id: 'vadai',
    name: 'Vadai',
    flavor: 'Round and humming, guards Kannan like a bodyguard.',
    sprite: 'breads/vadai',
    motion: 'orbit',
    target: 'none',
    unlock: 'rc-vadai',
    // orbit: speed is degrees per second (not u/s); no cooldown; range unused.
    levels: ladder({ dmg: 1.8, cooldown: 0, speed: 180, radius: 20.8, count: 4, orbitRadius: 140, orbitHitGap: 0.5 }, [
      { count: 5 },
      { orbitRadius: 170 },
      { dmg: 2.4 },
      { knockback: 40 },
    ]),
  },
};
