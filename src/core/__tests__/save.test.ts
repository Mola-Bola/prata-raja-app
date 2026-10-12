import { describe, expect, it } from 'vitest';
import { freshSave, parseSave, recordRun, type SaveV1 } from '../save';
import type { RunResult } from '../types';

const NOW = new Date('2026-10-12T10:00:00.000Z');

const FRESH: SaveV1 = {
  v: 1,
  bestWave: 0,
  runs: 0,
  wins: 0,
  gold: 0,
  totalKills: 0,
  lastPlayed: null,
  settings: { sfx: true, music: true, haptics: true },
};

const SAVE: SaveV1 = {
  v: 1,
  bestWave: 6,
  runs: 2,
  wins: 1,
  gold: 100,
  totalKills: 300,
  lastPlayed: '2026-10-01T00:00:00.000Z',
  settings: { sfx: false, music: true, haptics: true },
};

const RUN: RunResult = {
  won: false,
  wave: 4,
  kills: 50,
  bossKills: 0,
  time: 200,
  level: 6,
  gold: 30,
  breads: [],
  dips: [],
};

describe('freshSave', () => {
  it('is all zeros, never played, every setting on', () => {
    expect(freshSave()).toEqual(FRESH);
  });
  it('hands out a new object each time', () => {
    const a = freshSave();
    a.settings.sfx = false;
    expect(freshSave()).toEqual(FRESH);
  });
});

describe('parseSave', () => {
  it('returns a fresh save for null, invalid JSON and non-object JSON', () => {
    for (const json of [null, '', '{', 'not json', 'null', '5', '"x"', 'true', '[]', '[{"v":1}]']) {
      expect(parseSave(json)).toEqual(FRESH);
    }
  });

  it('returns a fresh save for any version other than 1', () => {
    expect(parseSave(JSON.stringify({ ...SAVE, v: 2 }))).toEqual(FRESH);
    expect(parseSave(JSON.stringify({ ...SAVE, v: '1' }))).toEqual(FRESH);
    expect(parseSave(JSON.stringify({ runs: 5 }))).toEqual(FRESH);
  });

  it('reads a valid save back unchanged', () => {
    expect(parseSave(JSON.stringify(SAVE))).toEqual(SAVE);
  });

  it('keeps the valid fields of a v1 save and fills the rest from fresh values', () => {
    const out = parseSave(
      JSON.stringify({ v: 1, bestWave: 7, runs: 'lots', gold: 30, settings: { music: false, sfx: 'yes' } }),
    );
    expect(out).toEqual({ ...FRESH, bestWave: 7, gold: 30, settings: { sfx: true, music: false, haptics: true } });
  });

  it('rejects negative, non-numeric, null and non-finite numbers', () => {
    // 1e400 parses to Infinity; JSON.stringify could never have written it.
    const out = parseSave('{"v":1,"bestWave":-1,"runs":"3","wins":null,"gold":1e400,"totalKills":12}');
    expect(out).toEqual({ ...FRESH, totalKills: 12 });
  });

  it('only takes real booleans for settings, and tolerates a broken settings field', () => {
    expect(parseSave('{"v":1,"settings":{"sfx":0,"music":false,"haptics":"no"}}').settings).toEqual({
      sfx: true,
      music: false,
      haptics: true,
    });
    expect(parseSave('{"v":1,"settings":"off"}').settings).toEqual(FRESH.settings);
    expect(parseSave('{"v":1,"settings":[false]}').settings).toEqual(FRESH.settings);
    expect(parseSave('{"v":1,"settings":null}').settings).toEqual(FRESH.settings);
  });

  it('keeps lastPlayed only when it is a date string', () => {
    const iso = NOW.toISOString();
    expect(parseSave(JSON.stringify({ v: 1, lastPlayed: iso })).lastPlayed).toBe(iso);
    expect(parseSave('{"v":1,"lastPlayed":12345}').lastPlayed).toBeNull();
    expect(parseSave('{"v":1,"lastPlayed":"last tuesday"}').lastPlayed).toBeNull();
  });

  it('never throws, whatever is stored', () => {
    const junk: unknown[] = [
      undefined,
      '{"v":1',
      '1e999',
      '{"v":{"x":1}}',
      '{"v":1,"settings":{"__proto__":{"sfx":false}}}',
    ];
    for (const json of junk) expect(() => parseSave(json as string)).not.toThrow();
  });
});

describe('recordRun', () => {
  it('counts the run into every running total', () => {
    expect(recordRun(SAVE, { ...RUN, won: true, wave: 4, gold: 45, kills: 120 }, NOW)).toEqual({
      v: 1,
      bestWave: 6,
      runs: 3,
      wins: 2,
      gold: 145,
      totalKills: 420,
      lastPlayed: NOW.toISOString(),
      settings: { sfx: false, music: true, haptics: true },
    });
  });

  it('a lost run adds no win, and bestWave only rises when the run beats it', () => {
    expect(recordRun(SAVE, { ...RUN, won: false, wave: 9 }, NOW)).toMatchObject({ runs: 3, wins: 1, bestWave: 9 });
    expect(recordRun(SAVE, { ...RUN, won: false, wave: 2 }, NOW).bestWave).toBe(6);
  });

  it('is pure: the input is untouched and the result shares no objects with it', () => {
    const before = structuredClone(SAVE);
    const out = recordRun(SAVE, RUN, NOW);
    expect(SAVE).toEqual(before);
    expect(out).not.toBe(SAVE);
    expect(out.settings).not.toBe(SAVE.settings);
    out.settings.sfx = true;
    expect(SAVE.settings.sfx).toBe(false);
  });
});

describe('save round-trip', () => {
  it('parseSave reads back exactly what recordRun wrote', () => {
    const once = recordRun(freshSave(), RUN, NOW);
    expect(parseSave(JSON.stringify(once))).toEqual(once);
    const twice = recordRun(once, { ...RUN, won: true, wave: 2 }, new Date(NOW.getTime() + 60_000));
    expect(parseSave(JSON.stringify(twice))).toEqual(twice);
  });
});
