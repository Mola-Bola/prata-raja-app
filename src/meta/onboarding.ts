// First-15-minutes guide (docs/research/onboarding.md): which hub stations are open, and the ONE thing to do next. Pure; derived
// from the save alone, so the pulse moves only when the player's own action changes the save. Voice: the Kopi uncle.
import { CONTENT } from '@/content';
import type { StationId } from '../game/hub';
import { MEALS, canCookMeal } from './meals';
import { runPools } from './recipes';
import { specOf } from './specTree';
import { specPointsOf } from './kannan';
import { socketsOf } from './sockets';
import { TRAINING_COSTS, trainingOpen } from './training';
import { SLOTS, TRAINING_IDS, type SaveV2 } from './types';

export type StationState = 'open' | { locked: string };
export type NextStep = { station: StationId; line: string };

/** Runs played before a station opens (0 = always). Spec also opens early when the player holds points or perks. */
const OPENS_AFTER: Record<StationId, number> = { tawa: 0, exit: 0, pantry: 1, dips: 1, orders: 2, gear: 3, kopi: 3, spec: 5 };

export function stationState(save: SaveV2, id: StationId): StationState {
  const need = OPENS_AFTER[id];
  if (save.runs >= need) return 'open';
  if (id === 'spec' && (specPointsOf(save) > 0 || specOf(save).length > 0)) return 'open';
  return { locked: `After run ${need}` };
}

const open = (save: SaveV2, id: StationId): boolean => stationState(save, id) === 'open';

/** The one pressing thing, or null when nothing is (a veteran with nothing waiting). Lines are 12 words or fewer. */
export function nextStep(save: SaveV2): NextStep | null {
  if (save.runs === 0) return { station: 'exit', line: 'Go outside and cook up some tips, lah.' };
  if (save.pendingChests.length && open(save, 'pantry')) return { station: 'pantry', line: 'Open your chest. Got something inside, lah.' };
  const { dipPool } = runPools(save, CONTENT);
  if (open(save, 'dips') && dipPool.length && socketsOf(save, save.signatureBread).every((d) => !d)) {
    return { station: 'dips', line: 'Put a dip in a katori. Your roti hits harder.' };
  }
  if (open(save, 'spec') && specPointsOf(save) > 0) return { station: 'spec', line: 'Spend your spec point. Make Kannan stronger.' };
  if (open(save, 'gear')) {
    const rack = save.inventory.filter((i) => !save.pendingChests.includes(i.uid));
    if (SLOTS.some((slot) => !save.equipped[slot] && rack.some((i) => i.slot === slot))) return { station: 'gear', line: 'Wear your new gear before you go.' };
  }
  if (open(save, 'spec') && save.unlocks.training && TRAINING_IDS.some((id) => trainingOpen(save, id) && save.training[id] < TRAINING_COSTS.length && save.gold >= TRAINING_COSTS[save.training[id]])) {
    return { station: 'spec', line: 'You got coins. Train up at the spec board.' };
  }
  if (open(save, 'kopi') && MEALS.some((m) => canCookMeal(save, m.id))) {
    return { station: 'kopi', line: 'Cook a meal first. Small buff for the run.' };
  }
  return save.runs < 5 ? { station: 'exit', line: 'Go again to earn more.' } : null;
}
