import { TRAINING_DEFS } from '../core/statRegistry';
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
export type AffixBand = 'Fine' | 'Good' | 'Great';
export type Affix = { id: string; stat: keyof PlayerStats; value: number; /** Value band within the affix range (v2 items only). */ tier?: AffixBand };
/** v2 fields are optional so legacy items stay valid: no `version` (or 1) = legacy, `affixes` are then the stored truth.
 *  version 2 = `affixes` are derived from (baseId, ilvl, rarity, seed) by deriveAffixes and can be regenerated. */
export type GearItem = {
  uid: string; baseId: GearBaseId; slot: Slot; rarity: Rarity; level: number; affixes: Affix[];
  ilvl?: number; seed?: number; version?: number;
  /** Forge steps, 0..MAX_ENHANCE. Never lost. */
  enhance?: number;
  /** Affix rerolls done at the forge; salts the next roll so it is deterministic. */
  rerolls?: number;
  /** Unique rule-hook id (src/meta/uniques.ts). */
  uniqueId?: string;
};
export const MATERIALS = ['flour', 'ghee', 'egg', 'onion', 'masala', 'sugar', 'milk', 'chilli', 'curryLeaves'] as const;
export type Material = typeof MATERIALS[number];
/** Generated from the stat registry (a stat with `training`). Ids are save keys; the set grows, never renames. */
export const TRAINING_IDS: readonly string[] = TRAINING_DEFS.map(t => t.id);
export type TrainingId = string;
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
  /** Kannan levels whose milestone visitor has been thanked (or was already past when the field was added). */
  seenMilestones: number[];
};
