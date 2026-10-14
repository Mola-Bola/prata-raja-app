import { describe, expect, it } from 'vitest';

import { DEFAULT_KITCHEN_TUNING } from '@/core/kitchen';
import type { OwnedBread, OwnedDip, RunResult } from '@/core/types';

import type { AppInfo } from '../appInfo';
import {
  BODY_MAX,
  listNotes,
  noteStatus,
  pairOwner,
  replyToNote,
  validScreenshot,
  SCREENSHOT_MAX,
  buildNote,
  canSend,
  CHIPS,
  contextLine,
  DEFAULT_CHIP,
  initialSheet,
  type NotePayload,
  type RunSnapshot,
  sendNote,
  type SheetAction,
  sheetReducer,
  type SheetState,
  toScreen,
  trackRun,
} from '../feedback';
import { createHub, type HudState } from '../hub';
import { BASE_STATS } from '@/core/stats';

const ID = '3f2b8c1e-5a4d-4e6f-9a1b-0c2d3e4f5a6b';
const DEVICE = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const INFO: AppInfo = { version: '0.1.1', updateId: 'abc-123', runtime: '1', platform: 'android 14', device: 'Google Pixel 8' };
const RUN: RunSnapshot = { seed: 77, wave: 7, level: 4, breads: ['kosong:2'], dips: ['fish-curry:1'], over: false };

const build = (over: Partial<Parameters<typeof buildNote>[0]> = {}): NotePayload =>
  buildNote({ id: ID, deviceId: DEVICE, chip: 'bug', text: '  boss stuck  ', from: ' Mum ', info: INFO, screen: 'run', run: RUN, ...over });

describe('chips', () => {
  it('are Direction, Bug, Feel and Idea, with Idea first chosen', () => {
    expect(CHIPS.map((c) => c.label)).toEqual(['Direction', 'Bug', 'Feel', 'Idea']);
    expect(CHIPS.map((c) => c.id)).toContain(DEFAULT_CHIP);
  });
});

describe('buildNote', () => {
  it('carries the build, the screen and the run', () => {
    expect(build()).toEqual({
      id: ID,
      device_id: DEVICE,
      chip: 'bug',
      body: 'boss stuck',
      from: 'Mum',
      context: {
        app_version: '0.1.1',
        update_id: 'abc-123',
        runtime: '1',
        platform: 'android 14',
        device: 'Google Pixel 8',
        screen: 'run',
        wave: 7,
        level: 4,
        seed: 77,
        breads: ['kosong:2'],
        dips: ['fish-curry:1'],
      },
    });
  });

  it('keeps the run for the results screen, but not for the title or the hub (an old run says nothing there)', () => {
    expect(build({ screen: 'results' }).context).toMatchObject({ screen: 'results', wave: 7, seed: 77 });
    for (const screen of ['title', 'hub'] as const) {
      expect(build({ screen }).context).toMatchObject({ screen, wave: null, level: null, seed: null, breads: [], dips: [] });
    }
  });

  it('copes with no run yet and no app info', () => {
    const n = build({ run: null, info: null });
    expect(n.context).toMatchObject({ platform: 'web', app_version: null, update_id: null, wave: null });
  });

  it('cuts a note at the limit and tidies the name', () => {
    expect(build({ text: 'x'.repeat(BODY_MAX + 50) }).body).toHaveLength(BODY_MAX);
    expect(build({ from: 'a\u0000  b\n' }).from).toBe('a b');
  });
});

describe('contextLine', () => {
  it('says what travels with the note in a few words', () => {
    expect(contextLine(build().context)).toBe('v0.1.1 · run, wave 7 · Lv 4 · android 14');
    expect(contextLine(build({ screen: 'results' }).context)).toBe('v0.1.1 · results, wave 7 · Lv 4 · android 14');
    expect(contextLine(build({ screen: 'title' }).context)).toBe('v0.1.1 · title · android 14');
    expect(contextLine(build({ screen: 'hub', info: null }).context)).toBe('hub · web');
  });
});

describe('toScreen', () => {
  it('names the stall hub "hub" and anything unknown the title', () => {
    expect(['title', 'stall', 'run', 'results', 'hub', 'weird'].map(toScreen)).toEqual(['title', 'hub', 'run', 'results', 'hub', 'title']);
  });
});

describe('kitchen note context', () => {
  it('reports the sandbox screen, wave and chosen build in the sent payload', () => {
    const note = build({ screen: toScreen('kitchen'), run: RUN });
    expect(note.context).toMatchObject({ screen: 'kitchen', wave: 7, seed: 77, breads: ['kosong:2'], dips: ['fish-curry:1'] });
    expect(contextLine(note.context)).toBe('v0.1.1 · kitchen, wave 7 · Lv 4 · android 14');
  });
});

describe('sendNote', () => {
  const res = (status: number) => new Response(JSON.stringify({ ok: true, id: ID }), { status });

  it('posts the note as text/plain JSON (no CORS preflight) and answers with its id', async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return res(200);
    }) as unknown as typeof fetch;
    const note = build();
    await expect(sendNote(note, { url: 'https://x.test/functions/v1/game-feedback', fetchImpl })).resolves.toEqual({ ok: true, id: ID });
    expect(seen?.url).toBe('https://x.test/functions/v1/game-feedback');
    expect(seen?.init.method).toBe('POST');
    expect((seen?.init.headers as Record<string, string>)['content-type']).toMatch(/^text\/plain/);
    expect(JSON.parse(String(seen?.init.body))).toEqual(note);
  });

  it.each([
    [429, 'busy'],
    [400, 'rejected'],
    [413, 'rejected'],
    [500, 'server'],
    [503, 'server'],
  ])('maps HTTP %i to "%s"', async (status, reason) => {
    const fetchImpl = (async () => res(status)) as unknown as typeof fetch;
    await expect(sendNote(build(), { url: 'https://x.test/f', fetchImpl })).resolves.toEqual({ ok: false, reason });
  });

  it('reports a network failure as offline, and never throws', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(sendNote(build(), { url: 'https://x.test/f', fetchImpl })).resolves.toEqual({ ok: false, reason: 'offline' });
  });

  it('gives up on a call that never answers', async () => {
    const fetchImpl = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))) as unknown as typeof fetch;
    await expect(sendNote(build(), { url: 'https://x.test/f', fetchImpl, timeoutMs: 20 })).resolves.toEqual({ ok: false, reason: 'offline' });
  });

  it('says so when the build has no address for the function', async () => {
    await expect(sendNote(build(), { url: '' })).resolves.toEqual({ ok: false, reason: 'unconfigured' });
  });
});

describe('the sheet', () => {
  const run = (state: SheetState, ...actions: SheetAction[]) => actions.reduce(sheetReducer, state);
  const typed = run(initialSheet('Mum'), { type: 'text', text: 'too hard' });

  it('starts empty on Idea with the remembered name, and cannot send nothing', () => {
    const s = initialSheet('Mum');
    expect(s).toMatchObject({ phase: 'edit', text: '', chip: 'idea', from: 'Mum', noteId: null });
    expect(canSend(s)).toBe(false);
    expect(canSend(run(s, { type: 'text', text: '   ' }))).toBe(false);
    expect(canSend(typed)).toBe(true);
  });

  it('sends: edit, sending, sent', () => {
    const sending = run(typed, { type: 'send', id: 'n1' });
    expect(sending).toMatchObject({ phase: 'sending', noteId: 'n1' });
    expect(run(sending, { type: 'sent' }).phase).toBe('sent');
  });

  it('does not send an empty note', () => {
    expect(run(initialSheet(), { type: 'send', id: 'n1' }).phase).toBe('edit');
  });

  it('keeps the text and the id on a failure, and Retry sends the same note again', () => {
    const failed = run(typed, { type: 'send', id: 'n1' }, { type: 'fail', reason: 'offline' });
    expect(failed).toMatchObject({ phase: 'failed', reason: 'offline', text: 'too hard', noteId: 'n1' });
    const retry = run(failed, { type: 'send', id: 'n2' });
    expect(retry).toMatchObject({ phase: 'sending', noteId: 'n1' }); // not n2: the first attempt may have landed
  });

  it('treats an edit after a failure as a new note', () => {
    const failed = run(typed, { type: 'send', id: 'n1' }, { type: 'fail', reason: 'server' });
    for (const edit of [{ type: 'text', text: 'too hard!' }, { type: 'chip', chip: 'feel' }, { type: 'from', from: 'Dad' }, { type: 'clear' }] as SheetAction[]) {
      expect(run(failed, edit)).toMatchObject({ phase: 'edit', noteId: null, reason: null });
    }
    expect(run(failed, { type: 'clear' }).text).toBe('');
  });

  it('is read-only while a note is on its way or has gone', () => {
    const sending = run(typed, { type: 'send', id: 'n1' });
    expect(run(sending, { type: 'text', text: 'changed' })).toBe(sending);
    expect(run(sending, { type: 'send', id: 'n2' })).toBe(sending);
    const sent = run(sending, { type: 'sent' });
    expect(run(sent, { type: 'chip', chip: 'feel' })).toBe(sent);
    expect(run(sent, { type: 'fail', reason: 'offline' })).toBe(sent);
  });

  it('cuts text at the limit', () => {
    expect(run(initialSheet(), { type: 'text', text: 'x'.repeat(BODY_MAX + 5) }).text).toHaveLength(BODY_MAX);
  });
});

describe('trackRun (what run a note is about)', () => {
  const breads: OwnedBread[] = [{ id: 'kosong', level: 2, cd: 0, volleyLeft: 0, volleyT: 0 }];
  const dips: OwnedDip[] = [{ id: 'fish-curry', level: 1 }];
  const hud = (wave: number, level: number): HudState => ({
    wave,
    waves: 10,
    route: null,
    hp: 50,
    maxHp: 100,
    xp: 0,
    xpToNext: 10,
    level,
    gold: 0,
    kills: 0,
    time: 1,
    boss: null,
    breads: [{ id: 'kosong', level: 2 }],
    dips: [{ id: 'fish-curry', level: 1 }],
    passives: [], stats: { ...BASE_STATS }, buffs: [], revivesLeft: 0, dipSimmer: {}, signatureBread: undefined, shownDps: 0,
  });

  const kitchenStats = (wave: number) => ({ time: 12, wave, phase: 'wave' as const, hp: 50, maxHp: 100,
    kills: 3, damageShown: 200, damageShownPerSecond: 200 / 12, tuning: { ...DEFAULT_KITCHEN_TUNING } });

  it('replaces production context with the kitchen lifecycle and keeps its final HUD build', () => {
    const hub = createHub();
    const t = trackRun(hub);
    hub.emit('runStart', { seed: 99 });
    hub.emit('runEnd', { won: false, wave: 5, kills: 30, bossKills: 0, time: 90, level: 4, gold: 12, breads, dips });
    hub.emit('kitchenStart', { seed: 456, tuning: { ...DEFAULT_KITCHEN_TUNING } });
    expect(t.read()).toEqual({ seed: 456, wave: 0, level: 1, breads: [], dips: [], over: false });
    hub.emit('kitchenStats', kitchenStats(8));
    expect(t.read()).toMatchObject({ seed: 456, wave: 8, over: false });
    hub.emit('hud', { ...hud(8, 1), breads: [{ id: 'inferno-bomb', level: 1 }], dips: [{ id: 'mint-chutney', level: 5 }] });
    hub.emit('kitchenEnd', { reason: 'lost', stats: { ...kitchenStats(9), phase: 'lost' } });
    expect(t.read()).toEqual({ seed: 456, wave: 9, level: 1, breads: ['inferno-bomb:1'], dips: ['mint-chutney:5'], over: true });
    expect(build({ screen: 'kitchen', run: t.read() }).context).toMatchObject({ screen: 'kitchen', seed: 456, wave: 9, breads: ['inferno-bomb:1'], dips: ['mint-chutney:5'] });
    hub.emit('kitchenEnd', { reason: 'stopped', stats: { ...kitchenStats(9), phase: 'lost' } });
    expect(t.read()).toBeNull();
    hub.emit('runStart', { seed: 100 });
    expect(t.read()).toEqual({ seed: 100, wave: 0, level: 1, breads: [], dips: [], over: false });
    t.stop();
  });

  it('clears a stopped kitchen and unsubscribes from every kitchen event', () => {
    const hub = createHub();
    const t = trackRun(hub);
    hub.emit('kitchenStart', { seed: 77, tuning: { ...DEFAULT_KITCHEN_TUNING } });
    hub.emit('hud', hud(4, 1));
    hub.emit('kitchenEnd', { reason: 'stopped', stats: kitchenStats(4) });
    expect(t.read()).toBeNull();
    t.stop();
    hub.emit('kitchenStart', { seed: 88, tuning: { ...DEFAULT_KITCHEN_TUNING } });
    hub.emit('kitchenStats', kitchenStats(8));
    hub.emit('hud', hud(8, 1));
    hub.emit('kitchenEnd', { reason: 'won', stats: { ...kitchenStats(8), phase: 'won' } });
    expect(t.read()).toBeNull();
  });

  it('knows nothing before a run, then follows the hud, then the result', () => {
    const hub = createHub();
    const t = trackRun(hub);
    expect(t.read()).toBeNull();
    hub.emit('runStart', { seed: 99 });
    expect(t.read()).toEqual({ seed: 99, wave: 0, level: 1, breads: [], dips: [], over: false });
    hub.emit('hud', hud(3, 2));
    hub.emit('hud', hud(4, 3));
    expect(t.read()).toEqual({ seed: 99, wave: 4, level: 3, breads: ['kosong:2'], dips: ['fish-curry:1'], over: false });
    const result: RunResult = { won: false, wave: 5, kills: 30, bossKills: 0, time: 90, level: 4, gold: 12, breads, dips };
    hub.emit('runEnd', result);
    expect(t.read()).toEqual({ seed: 99, wave: 5, level: 4, breads: ['kosong:2'], dips: ['fish-curry:1'], over: true });
    hub.emit('runStart', { seed: 100 }); // the next run forgets the last
    expect(t.read()).toMatchObject({ seed: 100, wave: 0, over: false });
    t.stop();
    hub.emit('hud', hud(9, 9));
    expect(t.read()).toMatchObject({ seed: 100, wave: 0 }); // stopped: no longer listening
  });
});


describe('private note actions', () => {
  const pair = { device_id: DEVICE, device_secret: `${DEVICE}.${ID}` };
  const reply = (data: unknown, status = 200) => ({ url: 'https://x.test/f', fetchImpl: (async () => new Response(JSON.stringify(data), { status })) as typeof fetch });
  it('requires validated private notes and an explicit server owner boolean', async () => {
    const note = { id: ID, body: 'My note', chip: 'direction', status: 'approved', plan: null, shipped_in: null, created_at: '2026-10-13', messages: [] };
    await expect(listNotes(pair, reply({ ok: true, notes: [note], owner: false }))).resolves.toEqual({ ok: true, notes: [note], owner: false });
    for (const data of [{ ok: true }, { ok: true, notes: [note], owner: 'true' }, { ok: true, notes: [{ ...note, messages: [{}] }], owner: false }]) {
      await expect(listNotes(pair, reply(data))).resolves.toEqual({ ok: false, reason: 'unavailable' });
    }
    await expect(listNotes(pair, reply({}, 400))).resolves.toEqual({ ok: false, reason: 'unavailable' });
    await expect(listNotes({ ...pair, device_secret: '' }, reply({ ok: true, notes: [], owner: true }))).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });
  it('never confirms an owner from a generic success response', async () => {
    await expect(pairOwner(pair, 'code', reply({ ok: true }))).resolves.toEqual({ ok: false, reason: 'rejected' });
    await expect(pairOwner(pair, 'code', reply({ ok: true, owner: true }))).resolves.toEqual({ ok: true, owner: true });
  });
  it('requires the reply acknowledgement to match both note and message IDs', async () => {
    await expect(replyToNote(pair, ID, DEVICE, 'reply', reply({ ok: true, id: ID, message_id: DEVICE }))).resolves.toEqual({ ok: true, id: DEVICE });
    await expect(replyToNote(pair, ID, DEVICE, 'reply', reply({ ok: true, id: ID }))).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });
  it('rejects malformed send acknowledgements and bounds optional screenshots', async () => {
    await expect(sendNote(build(), reply({ ok: true, id: 'another-note' }))).resolves.toEqual({ ok: false, reason: 'server' });
    await expect(sendNote(build(), reply({}))).resolves.toEqual({ ok: false, reason: 'server' });
    expect(validScreenshot('data:image/png;base64,/9j/2Q==')).toBe(false);
    expect(validScreenshot('data:image/jpeg;base64,' + 'A'.repeat(SCREENSHOT_MAX))).toBe(false);
    const screenshot = 'data:image/jpeg;base64,/9j/2Q==';
    expect(build({ screenshot, deviceSecret: pair.device_secret })).toMatchObject({ screenshot, device_secret: pair.device_secret });
    expect(build({ screenshot: null })).not.toHaveProperty('screenshot');
  });
});

describe('noteStatus', () => {
  it('shows a release only while a note is shipped, preserving its current status after reopening', () => {
    expect(noteStatus({ status: 'shipped', shipped_in: '0.4.3' })).toBe('Shipped in 0.4.3');
    for (const status of ['new', 'in_progress', 'done', 'wont_do']) {
      expect(noteStatus({ status, shipped_in: '0.4.3' })).toBe(noteStatus({ status, shipped_in: null }));
    }
    expect(noteStatus({ status: 'new', shipped_in: '0.4.3' })).toBe('Received');
    expect(noteStatus({ status: 'in_progress', shipped_in: '0.4.3' })).toBe('Building');
    expect(noteStatus({ status: 'done', shipped_in: '0.4.3' })).toBe('Done');
    expect(noteStatus({ status: 'wont_do', shipped_in: '0.4.3' })).toBe('Not now');
  });
});


describe('Flaky Kosong feedback lifecycle', () => {
  it('captures the active experiment and clears it on a new test, exit and ordinary run', () => {
    const hub = createHub(), tracker = trackRun(hub);
    hub.emit('kitchenStart', { seed: 123, tuning: { ...DEFAULT_KITCHEN_TUNING }, flakyKosong: true });
    expect(build({ screen: 'kitchen', run: tracker.read() }).context.flaky_kosong).toBe(true);
    hub.emit('kitchenStart', { seed: 123, tuning: { ...DEFAULT_KITCHEN_TUNING }, flakyKosong: false });
    expect(build({ screen: 'kitchen', run: tracker.read() }).context.flaky_kosong).toBe(false);
    expect(build({ screen: 'hub', run: tracker.read() }).context).not.toHaveProperty('flaky_kosong');
    hub.emit('runStart', { seed: 321 });
    expect(tracker.read()).not.toHaveProperty('flakyKosong');
    expect(build({ screen: 'run', run: tracker.read() }).context).not.toHaveProperty('flaky_kosong');
    tracker.stop();
  });
});
