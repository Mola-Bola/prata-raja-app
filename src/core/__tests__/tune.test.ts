import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { applyTune, cleanOverrides, tuneKnobs } from '../tune';
import { createRun, step } from '../sim';

const knobs = tuneKnobs(CONTENT);
const input = { targetX: null, moving: false };

describe('tune overlay', () => {
  it('generates knobs from the tables', () => {
    const ids = knobs.map((k) => k.id);
    expect(ids).toContain('breads.kosong.dmg');
    expect(ids).toContain('enemies.all.hp');
    expect(ids).toContain('director.liveCap');
    for (const k of knobs) { expect(k.min).toBeLessThanOrEqual(k.def); expect(k.max).toBeGreaterThanOrEqual(k.def); }
  });
  it('applies without mutating the base; no overrides returns base', () => {
    const before = JSON.stringify(CONTENT);
    expect(applyTune(CONTENT, {})).toBe(CONTENT);
    const t = applyTune(CONTENT, { 'breads.kosong.dmg': 20, 'enemies.all.hp': 2, 'director.liveCap': 30, 'chapters.kopitiam-street.bossAt': 600 });
    expect(t.breads.kosong.levels[0].dmg).toBe(20);
    expect(t.breads.kosong.levels[1].dmg).toBe(24); // 12 x2: whole ladder scales
    expect(t.enemies['sugar-ant'].hp).toBe(40);
    expect(t.tune?.liveCap).toBe(30);
    expect(t.chapters[0].bossAt).toBe(600);
    expect(JSON.stringify(CONTENT)).toBe(before);
    expect(CONTENT.tune).toBeUndefined();
  });
  it('cleans junk and default values (reset clears)', () => {
    expect(cleanOverrides({ 'breads.kosong.dmg': 10, nope: 1, 'enemies.all.hp': 'x', 'director.cruise': 999 }, knobs)).toEqual({ 'director.cruise': 20 });
    expect(cleanOverrides(null, knobs)).toEqual({});
  });
  it('tuned content stays deterministic and a faster stall covers more ground', () => {
    const run = (c: typeof CONTENT) => { const w = createRun({ seed: 7, content: c }); for (let i = 0; i < 300; i++) step(w, 1 / 60, input); return w.dist; };
    const t = applyTune(CONTENT, { 'director.cruise': 10 });
    expect(run(t)).toBe(run(applyTune(CONTENT, { 'director.cruise': 10 })));
    expect(run(t)).toBeGreaterThan(run(CONTENT));
  });
});
