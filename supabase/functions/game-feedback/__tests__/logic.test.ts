import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BODY_MAX, CHIPS } from '../../../../src/game/feedback';
import { FROM_MAX } from '../../../../src/game/deviceState';
import { CHIP_KIND, LIMITS, parseNote, rateVerdict, rowFor, screenLabel } from '../logic';

const ID = '3f2b8c1e-5a4d-4e6f-9a1b-0c2d3e4f5a6b';
const DEVICE = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const note = (over: Record<string, unknown> = {}) => ({
  id: ID,
  device_id: DEVICE,
  chip: 'bug',
  body: 'The boss gets stuck behind the counter',
  from: 'Mum',
  context: {
    app_version: '0.1.1',
    update_id: '5b1c3a52-1111-4c7e-8e8a-aaaaaaaaaaaa',
    runtime: '1',
    platform: 'android 14',
    device: 'Google Pixel 8',
    screen: 'run',
    wave: 7,
    level: 4,
    seed: 123456,
    breads: ['kosong:2', 'tissue:1'],
    dips: ['fish-curry:1'],
  },
  ...over,
});
const ok = (raw: unknown) => {
  const r = parseNote(raw);
  if (!r.ok) throw new Error(`expected ok, got ${r.error}`);
  return r.note;
};

describe('the chips and the feedback_kind enum', () => {
  it('only maps to kinds the database has (read from the foundation migration)', () => {
    const sql = readFileSync(join(__dirname, '../../../migrations/20260101000010_foundation.sql'), 'utf8');
    const enumBody = /create type public\.feedback_kind as enum \(([^)]*)\)/.exec(sql)?.[1] ?? '';
    const kinds = [...enumBody.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(kinds.length).toBeGreaterThan(0);
    for (const kind of Object.values(CHIP_KIND)) expect(kinds).toContain(kind);
  });

  it('accepts exactly the current chips plus legacy compatibility, with the same limits', () => {
    expect(Object.keys(CHIP_KIND).sort()).toEqual(['art', 'balance', 'bug', 'direction', 'feel', 'idea']);
    for (const chip of CHIPS) expect(Object.keys(CHIP_KIND)).toContain(chip.id);
    expect(Object.keys(CHIP_KIND).sort()).toEqual([...new Set([...CHIPS.map((c) => c.id), 'art', 'balance'])].sort());
    expect(LIMITS.body).toBe(BODY_MAX);
    expect(LIMITS.from).toBe(FROM_MAX);
  });
});

describe('parseNote', () => {
  it('accepts a whole note and keeps the context', () => {
    const n = ok(note());
    expect(n).toMatchObject({ id: ID, deviceId: DEVICE, chip: 'bug', from: 'Mum', screen: 'run', wave: 7, level: 4, seed: 123456, platform: 'android 14', appVersion: '0.1.1' });
    expect(n.breads).toEqual(['kosong:2', 'tissue:1']);
  });

  it('works with nothing but the required fields', () => {
    const n = ok({ id: ID, device_id: DEVICE, chip: 'idea', body: '  hi  ' });
    expect(n).toMatchObject({ body: 'hi', from: '', screen: 'title', wave: null, seed: null, platform: 'unknown', device: null });
    expect(n.breads).toEqual([]);
  });

  it.each([
    ['not an object', 'hello'],
    ['an array', [1]],
    ['a bad id', note({ id: 'nope' })],
    ['a bad device id', note({ device_id: '12345' })],
    ['an unknown chip', note({ chip: 'like' })],
    ['a missing body', note({ body: undefined })],
    ['an empty body', note({ body: ' \n ' })],
    ['a body past the limit', note({ body: 'x'.repeat(LIMITS.body + 1) })],
  ])('refuses %s', (_why, raw) => {
    expect(parseNote(raw).ok).toBe(false);
  });

  it('takes a body of exactly the limit', () => {
    expect(ok(note({ body: 'x'.repeat(LIMITS.body) })).body).toHaveLength(LIMITS.body);
  });

  it('strips control characters (a NUL would make Postgres refuse the row) but keeps line breaks', () => {
    expect(ok(note({ body: 'a\u0000b\nc\u0007d' })).body).toBe('ab\ncd');
  });

  it('cleans the name to one short line', () => {
    expect(ok(note({ from: '  Mum \n\t and   Dad ' + 'z'.repeat(80) })).from).toHaveLength(LIMITS.from);
    expect(ok(note({ from: 'Mum\u0000' })).from).toBe('Mum');
    expect(ok(note({ from: 42 })).from).toBe('');
  });

  it('drops context values that are the wrong shape instead of refusing the note', () => {
    const n = ok(
      note({
        context: {
          app_version: '<script>',
          update_id: 'x'.repeat(200),
          platform: 'a'.repeat(100),
          screen: 'settings',
          wave: -1,
          level: 1.5,
          seed: 'abc',
          breads: ['kosong:2', 'DROP TABLE', 7, 'tissue:100'],
          dips: 'fish-curry:1',
        },
      }),
    );
    expect(n).toMatchObject({ appVersion: null, updateId: null, platform: 'unknown', screen: 'title', wave: null, level: null, seed: null, dips: [] });
    expect(n.breads).toEqual(['kosong:2']);
  });

  it('caps the build list', () => {
    const many = Array.from({ length: 40 }, (_, i) => `bread-${i}:1`);
    expect(ok(note({ context: { breads: many } })).breads).toHaveLength(16);
  });
});

describe('rowFor', () => {
  const author = 'aaaaaaaa-0000-4000-8000-bbbbbbbbbbbb';

  it('files a feedback row the factory tools understand', () => {
    const row = rowFor(ok(note()), author);
    expect(row).toMatchObject({
      id: ID,
      author_id: author,
      kind: 'bug',
      body: 'The boss gets stuck behind the counter',
      route: '/play',
      screen: 'Game: run, wave 7',
      platform: 'android 14',
      app_version: '0.1.1',
      device: 'Google Pixel 8',
      tags: ['in-game', 'bug'],
    });
    expect(row.params).toEqual({
      src: 'game',
      chip: 'bug',
      device_id: DEVICE,
      from: 'Mum',
      screen: 'run',
      runtime: '1',
      seed: 123456,
      wave: 7,
      level: 4,
      build: { breads: ['kosong:2', 'tissue:1'], dips: ['fish-curry:1'] },
    });
    // The row never sets status or module: the table's defaults (new, prata-raja) put it in the inbox.
    expect(row).not.toHaveProperty('status');
    expect(row).not.toHaveProperty('module');
  });

  it('maps balance and art notes to "change" and keeps the chip as a tag', () => {
    expect(rowFor(ok(note({ chip: 'balance' })), author)).toMatchObject({ kind: 'change', tags: ['in-game', 'balance'] });
    expect(rowFor(ok(note({ chip: 'art' })), author)).toMatchObject({ kind: 'change', tags: ['in-game', 'art'] });
    expect(rowFor(ok(note({ chip: 'idea' })), author).kind).toBe('idea');
  });

  it('leaves run details out when the note was written on the title', () => {
    const row = rowFor(ok({ id: ID, device_id: DEVICE, chip: 'idea', body: 'hi', context: { screen: 'title' } }), author);
    expect(row.screen).toBe('Game: title');
    expect(row.params).toEqual({ src: 'game', chip: 'idea', device_id: DEVICE, screen: 'title' });
  });

  it('labels the screen for the digest', () => {
    expect(screenLabel({ screen: 'results', wave: 9 })).toBe('Game: results, wave 9');
    expect(screenLabel({ screen: 'hub', wave: null })).toBe('Game: hub');
    expect(screenLabel({ screen: 'run', wave: 0 })).toBe('Game: run');
  });
});

describe('rateVerdict', () => {
  it('lets a device file a few notes an hour, then asks it to slow down', () => {
    expect(rateVerdict({ device: 0, global: 0 })).toBe('ok');
    expect(rateVerdict({ device: LIMITS.perDevicePerHour - 1, global: 0 })).toBe('ok');
    expect(rateVerdict({ device: LIMITS.perDevicePerHour, global: 0 })).toBe('device');
  });

  it('stops everyone when the whole game is flooding', () => {
    expect(rateVerdict({ device: 0, global: LIMITS.globalPerHour - 1 })).toBe('ok');
    expect(rateVerdict({ device: 0, global: LIMITS.globalPerHour })).toBe('global');
  });
});
