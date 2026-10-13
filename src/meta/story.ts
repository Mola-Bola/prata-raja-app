import type { SaveV2 } from './types';

/** Existing players go straight to their stall, even if they predate the story flag. */
export const shouldShowPrologue = (save: SaveV2): boolean => save.runs === 0 && !save.prologueSeen;

/** Skipping and finishing both count; replaying never changes other progress. */
export const finishPrologue = (save: SaveV2): SaveV2 => save.prologueSeen ? save : { ...save, prologueSeen: true };
