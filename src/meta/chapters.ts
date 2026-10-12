import type { SaveV2 } from './types';

export function chapterUnlocked(save: SaveV2, id: string): boolean {
  return id === 'kopitiam-street' || (id === 'hawker-night' && (save.bossAttempts['kopitiam-street'] ?? 0) >= 3);
}
