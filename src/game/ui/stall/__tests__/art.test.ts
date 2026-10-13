import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { GEAR_BASES } from '@/meta/gear';
import { MATERIALS, RARITIES } from '@/meta/types';

import { chestArt } from '../helpers';

// The stall asks the art for names built from game data ("gear/" + a base id): a new base, material or rarity without its
// picture would show a broken image, so the manifest (written by the art slicer) is checked against the data.
const manifest = JSON.parse(readFileSync(new URL('../../../../../assets/game/manifest.json', import.meta.url), 'utf8')) as Record<string, unknown>;
const has = (key: string) => Object.hasOwn(manifest, key);

describe('stall art', () => {
  it('has a picture for every piece of gear, every ingredient and every chest look', () => {
    for (const id of Object.keys(GEAR_BASES)) expect(has(`gear/${id}`), `gear/${id}`).toBe(true);
    for (const m of MATERIALS) expect(has(`materials/${m}`), `materials/${m}`).toBe(true);
    for (const r of RARITIES) expect(has(chestArt(r)), chestArt(r)).toBe(true);
  });
  it('has the fixed pieces the hub and the wake-up screen draw', () => {
    for (const key of ['scene/hub', 'scene/wake', 'hub/stall-badge', 'hub/tip-jar', 'hub/recipe-book', 'hub/chef-special', 'hub/settings', 'ui/coins', 'ui/lock']) {
      expect(has(key), key).toBe(true);
    }
  });
});
