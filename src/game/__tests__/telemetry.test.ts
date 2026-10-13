import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RunResult } from '@/core/types';

import type { AppInfo } from '../appInfo';
import { DEVICE_KEY } from '../deviceState';
import { createHub } from '../hub';
import {
  baseProps,
  bossEvent,
  cardPickEvent,
  cleanProps,
  feedbackSentEvent,
  isTestRun,
  levelUpCounter,
  RENDERER_COVERED,
  runEndEvent,
  runStartEvent,
} from '../telemetryCore';

const INFO: AppInfo = { version: '0.1.1', updateId: 'upd-1', runtime: '1', platform: 'android 14', device: 'Google Pixel 8' };
const ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

describe('baseProps', () => {
  it('puts app and version on every event (version twice: the dashboards group by app_version)', () => {
    expect(baseProps(INFO)).toEqual({ app: 'prata-raja', platform: 'android 14', version: '0.1.1', app_version: '0.1.1', update_id: 'upd-1' });
  });

  it('copes with no info', () => {
    expect(baseProps(null)).toEqual({ app: 'prata-raja', platform: 'web' });
    expect(baseProps({ ...INFO, version: null, updateId: null })).toEqual({ app: 'prata-raja', platform: 'android 14' });
  });
});

describe('isTestRun', () => {
  it('spots the self-playing test mode and ?test=1 in the address', () => {
    expect(isTestRun('?bot=1&seed=3')).toBe(true);
    expect(isTestRun('?seed=3&bot=1')).toBe(true);
    expect(isTestRun('?test=1')).toBe(true);
    expect(isTestRun('')).toBe(false);
    expect(isTestRun('?seed=3')).toBe(false);
    expect(isTestRun('?robot=1&contest=2')).toBe(false);
  });
});

describe('cleanProps', () => {
  it('lets numbers, booleans and short labels through', () => {
    expect(cleanProps({ wave: 7, won: false, kind: 'bread', id: 'garlic-naan', name: "Auntie's Wok" })).toEqual({ wave: 7, won: false, kind: 'bread', id: 'garlic-naan', name: "Auntie's Wok" });
  });

  it('drops everything else: odd numbers, long text, objects, bad names', () => {
    expect(
      cleanProps({ a: NaN, b: Infinity, c: 'x'.repeat(65), d: { x: 1 }, e: [1], f: null, g: undefined, 'Bad Key': 1, h: 'line\nbreak', i: 'a@b.com' }),
    ).toEqual({});
  });
});

describe('the events', () => {
  it('run_start has the chapter and the seed', () => {
    expect(runStartEvent({ seed: 42 }, 'kopitiam-street')).toEqual(['run_start', { chapter: 'kopitiam-street', seed: 42 }]);
    expect(runStartEvent({ seed: 42, chapter: 2 }, 'kopitiam-street')).toEqual(['run_start', { chapter: 2, seed: 42 }]);
  });

  it('run_end has wave, won, kills, secs and level', () => {
    const r = { won: true, wave: 10, kills: 311, time: 612.4, level: 14 } as RunResult;
    expect(runEndEvent(r)).toEqual(['run_end', { wave: 10, won: true, kills: 311, secs: 612, level: 14 }]);
  });

  it('card_pick has the kind and the item id (heal and gold have no id, so they use their kind)', () => {
    expect(cardPickEvent({ kind: 'bread', id: 'kosong' })).toEqual(['card_pick', { kind: 'bread', id: 'kosong' }]);
    expect(cardPickEvent({ kind: 'heal', id: '' })).toEqual(['card_pick', { kind: 'heal', id: 'heal' }]);
  });

  it('boss_spawn, feedback_sent', () => {
    expect(bossEvent('Big Baker')).toEqual(['boss_spawn', { name: 'Big Baker' }]);
    expect(feedbackSentEvent('balance')).toEqual(['feedback_sent', { kind: 'balance' }]);
  });

  it('level_up counts a level once, even when a reroll re-opens the same offer', () => {
    const c = levelUpCounter();
    expect(c.next(2)).toEqual(['level_up', { level: 2 }]);
    expect(c.next(2)).toBeNull();
    expect(c.next(3)).toEqual(['level_up', { level: 3 }]);
    c.reset();
    expect(c.next(2)).toEqual(['level_up', { level: 2 }]);
  });

  it('knows which events the renderer also reports', () => {
    expect([...RENDERER_COVERED].sort()).toEqual(['card_pick', 'level_up', 'run_end', 'run_start']);
  });
});

// ── The glue: posthog-js is replaced by a recorder ────────────────────────────────────────────────────────────────

type Call = [name: string, props: Record<string, unknown>];
const calls: Call[] = [];
const init = vi.fn();
const register = vi.fn();
const startSessionRecording = vi.fn();
const stopSessionRecording = vi.fn();
let beforeSend: ((e: unknown) => unknown) | undefined;

vi.mock('posthog-js/dist/module.full.no-external', () => ({
  default: {
    init: (key: string, config: { before_send?: (e: unknown) => unknown; loaded?: (ph: unknown) => void }) => {
      init(key, config);
      beforeSend = config.before_send;
      config.loaded?.({ register });
    },
    capture: (name: string, props: Record<string, unknown>) => calls.push([name, props]),
    startSessionRecording,
    stopSessionRecording,
  },
}));

type Telemetry = typeof import('../telemetry');
const flush = () => new Promise((r) => setTimeout(r, 0));

/** A fresh copy of the module (it keeps page-level state) with the build's keys set or not. */
async function load(env: { host?: string; key?: string } = { host: 'https://relay.test', key: 'phc_testkey' }): Promise<Telemetry> {
  vi.resetModules();
  vi.stubEnv('EXPO_PUBLIC_POSTHOG_HOST', env.host ?? '');
  vi.stubEnv('EXPO_PUBLIC_POSTHOG_KEY', env.key ?? '');
  return import('../telemetry');
}

const bridge = (stored: string | null = JSON.stringify({ v: 1, id: ID, from: '', analytics: true })) => {
  const saved: Record<string, string> = {};
  return {
    saved,
    load: async () => stored,
    save: async (k: string, v: string) => {
      saved[k] = v;
    },
  };
};

beforeEach(() => {
  calls.length = 0;
  init.mockClear();
  register.mockClear();
  startSessionRecording.mockClear();
  stopSessionRecording.mockClear();
  beforeSend = undefined;
});
afterEach(() => vi.unstubAllEnvs());

describe('telemetry (posthog-js mocked)', () => {
  it('starts posthog anonymously: memory persistence, no person profiles, the device id, replay with a low-rate canvas', async () => {
    const t = await load();
    t.startTelemetry({ hub: createHub(), bridge: bridge(), info: INFO });
    await flush();
    expect(init).toHaveBeenCalledTimes(1);
    const [key, config] = init.mock.calls[0] as [string, Record<string, any>];
    expect(key).toBe('phc_testkey');
    expect(config).toMatchObject({
      api_host: 'https://relay.test',
      persistence: 'memory',
      person_profiles: 'never',
      bootstrap: { distinctID: ID, isIdentifiedID: false },
      autocapture: false,
      capture_pageview: false,
      capture_exceptions: true,
      disable_session_recording: false,
      session_recording: { maskAllInputs: true, captureCanvas: { recordCanvas: true, canvasFps: 2, canvasQuality: '0.3' }, canvasCapture: { resolutionScale: 0.33 } }, // no window in Node: the fallback scale
    });
    expect(config.session_recording.captureCanvas.canvasFps).toBeLessThanOrEqual(4);
    expect(register).toHaveBeenCalledWith({ app: 'prata-raja', platform: 'android 14', version: '0.1.1', app_version: '0.1.1', update_id: 'upd-1' });
    expect(calls).toEqual([['app_open', { version: '0.1.1' }]]);
  });

  it('tags test pages (?bot=1, ?test=1) so the charts can leave them out, and leaves real pages untagged', async () => {
    vi.stubGlobal('location', { search: '?bot=1&seed=3' });
    const t = await load();
    t.startTelemetry({ hub: createHub(), bridge: bridge(), info: INFO });
    await flush();
    expect(register).toHaveBeenLastCalledWith(expect.objectContaining({ test: true, app: 'prata-raja' }));
    vi.stubGlobal('location', { search: '' });
    const again = await load();
    again.startTelemetry({ hub: createHub(), bridge: bridge(), info: INFO });
    await flush();
    expect(register.mock.lastCall?.[0]).not.toHaveProperty('test');
    vi.unstubAllGlobals();
  });

  it('sizes the replay frames to the screen: about 130 px wide whatever the screen', async () => {
    const scaleFor = async (width: number | undefined) => {
      if (width !== undefined) vi.stubGlobal('innerWidth', width);
      const t = await load();
      t.startTelemetry({ hub: createHub(), bridge: bridge(), info: INFO });
      await flush();
      return (init.mock.lastCall?.[1] as { session_recording: { canvasCapture: { resolutionScale: number } } }).session_recording.canvasCapture.resolutionScale;
    };
    expect(await scaleFor(undefined)).toBe(0.33); // no screen to measure (Node)
    expect(await scaleFor(390)).toBeCloseTo(0.333, 2);
    expect(await scaleFor(780)).toBeCloseTo(0.167, 2);
    expect(await scaleFor(100)).toBe(1); // never enlarged
    vi.unstubAllGlobals();
  });

  it('sends nothing, and loads nothing, when the build has no PostHog keys', async () => {
    const t = await load({});
    expect(t.analyticsConfigured).toBe(false);
    t.startTelemetry({ hub: createHub(), bridge: bridge(), info: INFO });
    await flush();
    t.emit(['run_start', { seed: 1 }]);
    expect(init).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
    // the renderer's events stay with the app's own (dev log) sink
    expect(t.trackFromRenderer('run_start', {})).toBe(false);
  });

  it('reports the run from the hub: run_start, level_up, boss_spawn, run_end', async () => {
    const t = await load();
    const hub = createHub();
    t.startTelemetry({ hub, bridge: bridge(), info: INFO });
    await flush();
    calls.length = 0;
    hub.emit('runStart', { seed: 5 });
    hub.emit('levelUp', { offer: [], rerolls: 1, level: 2 });
    hub.emit('levelUp', { offer: [], rerolls: 0, level: 2 }); // a reroll: same level
    hub.emit('boss', { name: 'Big Baker' });
    hub.emit('runEnd', { won: false, wave: 6, kills: 40, bossKills: 0, time: 120.2, level: 5, gold: 10, breads: [], dips: [] });
    expect(calls).toEqual([
      ['run_start', { chapter: 'kopitiam-street', seed: 5 }],
      ['level_up', { level: 2 }],
      ['boss_spawn', { name: 'Big Baker' }],
      ['run_end', { wave: 6, won: false, kills: 40, secs: 120, level: 5 }],
    ]);
  });

  it('holds events that happen before posthog is up, and sends them in order', async () => {
    const t = await load();
    const hub = createHub();
    t.startTelemetry({ hub, bridge: bridge(), info: INFO }); // the device state has not loaded yet
    hub.emit('runStart', { seed: 8 });
    expect(calls).toEqual([]);
    await flush();
    expect(calls.map((c) => c[0])).toEqual(['app_open', 'run_start']);
  });

  it('drops the renderer’s own copies of events it reports itself, and passes the rest on', async () => {
    const t = await load();
    t.startTelemetry({ hub: createHub(), bridge: bridge(), info: INFO });
    await flush();
    calls.length = 0;
    for (const name of ['run_start', 'run_end', 'level_up', 'card_pick']) expect(t.trackFromRenderer(name, { kind: 'bread' })).toBe(true);
    expect(calls).toEqual([]);
    expect(t.trackFromRenderer('chest_open', { n: 2, secret: 'two words and an@address.com' })).toBe(true);
    expect(calls).toEqual([['chest_open', { n: 2 }]]);
  });

  it('reports a picked card and a sent note', async () => {
    const t = await load();
    t.startTelemetry({ hub: createHub(), bridge: bridge(), info: INFO });
    await flush();
    calls.length = 0;
    t.trackCardPick({ kind: 'dip', id: 'masala' });
    t.trackCardPick(undefined);
    t.trackFeedbackSent('art');
    expect(calls).toEqual([
      ['card_pick', { kind: 'dip', id: 'masala' }],
      ['feedback_sent', { kind: 'art' }],
    ]);
  });

  it('does not start when the saved Analytics switch is off, and starts when it is switched on', async () => {
    const t = await load();
    const b = bridge(JSON.stringify({ v: 1, id: ID, from: '', analytics: false }));
    t.startTelemetry({ hub: createHub(), bridge: b, info: INFO });
    await flush();
    expect(init).not.toHaveBeenCalled();
    t.emit(['run_start', { seed: 1 }]);
    expect(calls).toEqual([]);
    t.setAnalytics(true);
    await flush(); // posthog starts once the remote config is in
    expect(init).toHaveBeenCalledTimes(1);
    expect(JSON.parse(b.saved[DEVICE_KEY]).analytics).toBe(true);
    expect(calls.map((c) => c[0])).toEqual(['app_open']);
  });

  it('turning Analytics off stops events, replay and posthog’s own captures, and on resumes replay', async () => {
    const t = await load();
    const b = bridge();
    t.startTelemetry({ hub: createHub(), bridge: b, info: INFO });
    await flush();
    calls.length = 0;
    t.setAnalytics(false);
    expect(stopSessionRecording).toHaveBeenCalledTimes(1);
    expect(JSON.parse(b.saved[DEVICE_KEY]).analytics).toBe(false);
    t.emit(['run_start', { seed: 1 }]);
    expect(calls).toEqual([]);
    // errors posthog captures itself go through before_send, which now refuses them
    expect(beforeSend?.({ event: '$exception' })).toBeNull();
    t.setAnalytics(true);
    expect(startSessionRecording).toHaveBeenCalledTimes(1);
    expect(beforeSend?.({ event: '$exception' })).toEqual({ event: '$exception' });
    t.emit(['run_start', { seed: 2 }]);
    expect(calls).toEqual([['run_start', { seed: 2 }]]);
  });

  it('keeps going if posthog throws', async () => {
    const t = await load();
    init.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    t.startTelemetry({ hub: createHub(), bridge: bridge(), info: INFO });
    await flush();
    expect(() => t.emit(['run_start', { seed: 1 }])).not.toThrow();
  });
});
