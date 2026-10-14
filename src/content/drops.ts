import type { EnemyKind } from '../core/types';
import type { Material } from '../meta/types';

/** Chance per kill that an enemy of this kind drops one of each listed material. Data only: retune freely. */
export const MATERIAL_DROPS: Record<EnemyKind | 'boss', Partial<Record<Material, number>>> = {
  walker: { flour: .06, onion: .03 },
  runner: { egg: .05, flour: .03 },
  swarm: { flour: .02, curryLeaves: .01 },
  flyer: { egg: .04, curryLeaves: .03 },
  tank: { ghee: .08, onion: .05 },
  shooter: { chilli: .08, masala: .03 },
  splitter: { ghee: .05, sugar: .03 },
  shielded: { masala: .06, onion: .04 },
  healer: { curryLeaves: .08, milk: .04 },
  summoner: { masala: .06, ghee: .04 },
  exploder: { chilli: .07, masala: .04 },
  boss: { ghee: 1, masala: 1, chilli: .5, curryLeaves: .5 },
};
