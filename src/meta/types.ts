import type { SaveV1 } from '../core/save';
import type { BreadId, DipId, PlayerStats } from '../core/types';

export const SLOTS = ['towel', 'headband', 'apron', 'gloves', 'slippers'] as const;
export type Slot = typeof SLOTS[number];
export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'raja'] as const;
export type Rarity = typeof RARITIES[number];
export type GearBaseId =
  | 'faded-kopitiam-towel' | 'sweat-stained-towel' | 'lucky-red-towel'
  | 'plain-headband' | 'stall-bandana' | 'cooks-hairnet'
  | 'cotton-apron' | 'oil-splashed-apron' | 'denim-apron'
  | 'oven-gloves' | 'silicone-gloves' | 'chefs-gloves'
  | 'rubber-flip-flops' | 'kitchen-clogs' | 'old-house-slippers';
export type Affix = { id: string; stat: keyof PlayerStats; value: number };
export type GearItem = { uid: string; baseId: GearBaseId; slot: Slot; rarity: Rarity; level: number; affixes: Affix[] };
export const MATERIALS = ['flour', 'ghee', 'egg', 'onion', 'spice', 'sugar', 'milk'] as const;
export type Material = typeof MATERIALS[number];
export const TRAINING_IDS = ['wrist', 'stamina', 'flip'] as const;
export type TrainingId = typeof TRAINING_IDS[number];
export const UNLOCK_FLAGS = ['signature', 'gear', 'training', 'secondReroll', 'recipeBook', 'chefsSpecial', ...SLOTS] as const;
export type UnlockFlag = typeof UNLOCK_FLAGS[number];
export type ChestPity = { rare: number; epic: number; opened: number };
export type StreakState = {
  day: number;
  lastClaimDay: string | null;
  windowStartDay: string | null;
  restDaysUsed: number;
};
/** Every save from v2 on: a v3 save (`SaveV3`) is also a SaveV2, so the stall's shared code takes either. Read v3 fields via `beatsOf`. */
export type SaveV2 = Omit<SaveV1, 'v'> & {
  v: 2 | 3;
  prologueSeen: boolean;
  signatureBread: BreadId;
  stallXp: number;
  unlockedBreads: BreadId[];
  unlockedDips: DipId[];
  dipXp: Partial<Record<DipId, number>>;
  bossAttempts: Record<string, number>;
  inventory: GearItem[];
  equipped: Partial<Record<Slot, string>>;
  training: Record<TrainingId, number>;
  materials: Record<Material, number>;
  streak: StreakState;
  idle: { lastCollectedAt: string | null };
  chestPity: ChestPity;
  unlocks: Partial<Record<UnlockFlag, boolean>>;
  /** uids of inventory items still in a closed chest. A chest's item is owned from the moment it is rolled (so a crash can
   *  never lose it); opening only reveals it, and until then the item stays out of the gear rack. */
  pendingChests: string[];
};

/** v3 (Direction 2.0): story beats replace level gates, one persistent Kannan level, stall components. Everything in v2 is kept. */
export type SaveV3 = Omit<SaveV2, 'v'> & {
  v: 3;
  /** Story beats done (e.g. 'prologue', 'kopitiam-street-done'). */
  beats: string[];
  kannanXp: number;
  /** Unspent spec points: 1 per Kannan level above 1 (the spec tree that spends them comes later). */
  specPoints: number;
  stall: { parts: Record<string, number> };
};
