import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { PROLOGUE } from '@/content/story';
import { SAVE_KEY } from '@/core/save';
import { freshSaveV2, parseSaveV2, parseSaveV3 } from '@/meta/migrate';
import { finishPrologue } from '@/meta/story';

import { createSaveStore } from '../saveStore';

const root = new URL('../../../../', import.meta.url);

describe('story presentation and storage', () => {
  it('has six rendered panels and captions of at most twelve words', () => {
    expect(PROLOGUE).toHaveLength(6);
    const manifest = JSON.parse(readFileSync(new URL('assets/game/manifest.json', root), 'utf8'));
    for (const panel of PROLOGUE) {
      expect(panel.caption.trim().split(/\s+/).length).toBeLessThanOrEqual(12);
      expect(panel.caption.length).toBeGreaterThan(0);
      expect(manifest[panel.sprite]).toBeDefined();
      expect(existsSync(new URL(`assets/game/${panel.sprite}.webp`, root))).toBe(true);
    }
  });

  it('keeps story and stall scenes out of the GPU atlases', () => {
    const dir = new URL('assets/game-atlas/', root);
    for (const file of readdirSync(dir).filter(f => f.endsWith('.json'))) {
      const frames = JSON.parse(readFileSync(new URL(file, dir), 'utf8')).frames;
      expect(Object.keys(frames).some(k => k.startsWith('story/') || k.startsWith('scene/'))).toBe(false);
    }
  });

  it('serializes the flag through the save store alongside another setting change', async () => {
    let disk = JSON.stringify(freshSaveV2());
    const io = { load: async () => disk, save: async (_key: string, value: string) => { disk = value; } };
    const store = createSaveStore(io, `${SAVE_KEY}/story-test`);
    await store.load();
    store.commit(finishPrologue);
    store.commit(s => ({ ...s, settings: { ...s.settings, sfx: false } }));
    await store.flush();
    expect(parseSaveV3(disk)).toMatchObject({ prologueSeen: true, runs: 0, settings: { sfx: false } });
    const remount = createSaveStore(io, `${SAVE_KEY}/story-test`);
    expect(await remount.load()).toMatchObject({ prologueSeen: true, settings: { sfx: false } });
  });
});
