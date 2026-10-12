import type { BossDef } from '../core/types';

// One boss per chapter. Every attack is dodgeable by sliding; tell = warning time before it lands.
export const BOSSES: Record<string, BossDef> = {
  'king-cockroach': {
    id: 'king-cockroach',
    name: 'King Cockroach',
    kind: 'tank',
    sprite: 'bosses/king-cockroach',
    hp: 450,
    speed: 50,
    contactDps: 20,
    xp: 30,
    radius: 70,
    knockbackTaken: 0,
    weakTo: 'Burn, pierce',
    phases: [0.5],
    phaseHaste: 0.35,
    holdY: 620,
    attacks: [
      { kind: 'volley', id: 'antenna-volley', name: 'Antenna Volley', tell: 0.9, cooldown: 4.5, shots: 3, spread: 70, dmg: 10, projSpeed: 520, projSprite: 'fx/spark' },
      { kind: 'charge', id: 'scuttle-charge', name: 'Scuttle Charge', tell: 1, cooldown: 7, laneWidth: 120, dmg: 25, speed: 900 },
      { kind: 'summon', id: 'brood-call', name: 'Brood Call', tell: 1.2, cooldown: 9, enemy: 'roach', count: 3 },
    ],
  },
  'burger-baron': {
    id: 'burger-baron',
    name: 'The Burger Baron',
    kind: 'tank',
    sprite: 'bosses/burger-baron',
    hp: 1400,
    speed: 40,
    contactDps: 25,
    xp: 60,
    radius: 80,
    weakTo: 'Chill, knockback',
    phases: [0.66, 0.33],
    phaseHaste: 0.25,
    holdY: 640,
    attacks: [
      { kind: 'volley', id: 'patty-toss', name: 'Patty Toss', tell: 1.2, cooldown: 4, shots: 3, spread: 90, dmg: 12, projSpeed: 450, projSprite: 'fx/smoke' },
      { kind: 'rain', id: 'sauce-fountain', name: 'Sauce Fountain', tell: 1, cooldown: 6, marks: 3, markWidth: 90, dmg: 18 },
      { kind: 'charge', id: 'combo-rush', name: 'Combo Rush', tell: 0.8, cooldown: 8, laneWidth: 140, dmg: 30, speed: 950 },
    ],
  },
};
