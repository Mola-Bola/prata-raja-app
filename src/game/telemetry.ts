// Analytics, session replay and error tracking for the game, all inside the DOM component so it works on the web and in the
// APK's WebView with no native module. posthog-js (the self-contained "no-external" build: the recorder and error capture are in
// the bundle, so the only things fetched at run time are the project's replay settings and the events themselves) talks to
// PostHog through the fam-relay proxy.
//
// Anonymous by design: persistence 'memory' (the WebView has no localStorage), distinct id = the random device id kept by
// deviceState.ts, person_profiles 'never' (no identify, no person properties), inputs masked in replays. The Analytics
// switch in the pause sheet turns all of it off (events, replay, errors) and is remembered.
//
// On only when EXPO_PUBLIC_POSTHOG_HOST and EXPO_PUBLIC_POSTHOG_KEY are set at build time: .env.production (web and OTA
// bundles) and eas.json (APK builds). The local .env has neither, so dev builds and tests send nothing.
import posthog from 'posthog-js/dist/module.full.no-external';

import { CONTENT } from '@/content';
import type { Card } from '@/core/types';

import type { AppInfo } from './appInfo';
import type { Bridge } from './bridgeTypes';
import { createDeviceStore } from './deviceState';
import type { Hub } from './hub';
import {
  baseProps,
  bossEvent,
  cardPickEvent,
  cleanProps,
  type Evt,
  feedbackSentEvent,
  isTestRun,
  levelUpCounter,
  RENDERER_COVERED,
  runEndEvent,
  runStartEvent,
} from './telemetryCore';

const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? '';
const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
export const analyticsConfigured = HOST !== '' && KEY !== '';

/** Replay frames of the canvas: two a second, about 130 px wide, low quality (the pictures are what costs: measured about 6 KB a
 *  frame, roughly a megabyte a minute of play before compression; the HUD and the sheets are recorded as page structure, not
 *  pictures). posthog-js scales a frame against the canvas's size on screen, so the scale comes from that width. */
const CANVAS = { fps: 2, quality: '0.3', width: 130 } as const;
const canvasScale = (): number => {
  const shown = (typeof document !== 'undefined' && document.querySelector('canvas')?.clientWidth) || (typeof innerWidth === 'number' ? innerWidth : 0);
  return shown > 0 ? Math.min(1, +(CANVAS.width / shown).toFixed(3)) : 0.33;
};
/** Events that happen before posthog-js is up wait here (a run can start the moment the page opens). */
const QUEUE_MAX = 40;

/** This device's id, name and Analytics switch. The feedback sheet reads the same one. */
export const device = createDeviceStore();

let info: AppInfo | null = null;
let live = false; // posthog.init has run
let booting = false; // posthog.init is waiting for the remote config
let opened = false; // app_open went out
let queue: Evt[] = [];

const on = (): boolean => analyticsConfigured && device.get()?.analytics === true;

function send([name, props]: Evt): void {
  try {
    posthog.capture(name, cleanProps(props));
  } catch {
    // analytics must never interrupt the game
  }
}

/**
 * posthog-js reads the project's replay settings from a "remote config" it asks the relay for with a CORS request, and the
 * relay's copy of that file carries no CORS header, so a browser refuses it and replay would never start. A plain script tag
 * needs no CORS, and the SDK uses a config that is already on the page, so load the file that way first. If it cannot be
 * loaded (offline), analytics start without replay.
 */
function preloadRemoteConfig(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const script = document.createElement('script');
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, 5000);
    script.async = true;
    script.onload = done;
    script.onerror = done;
    script.src = `${HOST.replace(/\/+$/, '')}/array/${KEY}/config.js`;
    document.head.appendChild(script);
  });
}

async function boot(): Promise<void> {
  const d = device.get();
  if (live || booting || !d) return;
  if (!on()) {
    queue = []; // the saved switch is off: whatever waited for the load is not sent
    return;
  }
  booting = true;
  await preloadRemoteConfig();
  booting = false;
  if (live) return;
  if (!on()) {
    queue = []; // switched off while it waited
    return;
  }
  try {
    posthog.init(KEY, {
      api_host: HOST,
      ui_host: 'https://eu.posthog.com',
      persistence: 'memory',
      person_profiles: 'never',
      bootstrap: { distinctID: d.id, isIdentifiedID: false },
      // Only the events in telemetryCore.ts: no page views, clicks, heatmaps, web vitals or surveys.
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      rageclick: false,
      capture_dead_clicks: false,
      capture_heatmaps: false,
      capture_performance: false,
      disable_surveys: true,
      disable_conversations: true,
      disable_web_experiments: true,
      save_referrer: false,
      save_campaign_params: false,
      // Errors and replay: the two things this exists for.
      capture_exceptions: true,
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
        captureCanvas: { recordCanvas: true, canvasFps: CANVAS.fps, canvasQuality: CANVAS.quality },
        canvasCapture: { resolutionScale: canvasScale() },
      },
      // The Analytics switch also stops what posthog-js captures by itself (errors); replay is stopped in setAnalytics.
      before_send: (event) => (on() ? event : null),
      loaded: (ph) => {
        // ?bot=1 and ?test=1 pages (Playwright, checks by hand) are tagged, so they can be left out of the charts.
        ph.register({ ...baseProps(info), ...(typeof location !== 'undefined' && isTestRun(location.search) ? { test: true } : {}) });
      },
    });
    live = true;
    if (!opened) {
      opened = true;
      send(['app_open', { version: info?.version ?? 'unknown' }]);
    }
    const waiting = queue;
    queue = [];
    waiting.forEach(send);
  } catch {
    // a build whose bundle cannot start posthog-js just plays without analytics
  }
}

/** The build facts the app passed to the game (version, update id, platform, device), for the feedback sheet. */
export const getInfo = (): AppInfo | null => info;

/** Report an event (a no-op when analytics are off or not configured). */
export function emit(evt: Evt): void {
  // Before the device state has loaded the switch is not known yet: hold the event (boot() drops the queue if it is off).
  if (!analyticsConfigured || device.get()?.analytics === false) return;
  if (live) send(evt);
  else if (queue.length < QUEUE_MAX) queue.push(evt);
}

/**
 * The renderer's own bridge.track calls land here (GameRoot's facade). True when analytics own them, so the app's dev log is
 * skipped; false when analytics are not configured and the old sink should still see them.
 */
export function trackFromRenderer(event: string, props: Record<string, unknown>): boolean {
  if (!analyticsConfigured) return false;
  if (!RENDERER_COVERED.has(event)) emit([event, cleanProps(props)]);
  return true;
}

/** A card was picked (GameUi.pickCard): the hub does not announce which one. */
export function trackCardPick(card: Pick<Card, 'kind' | 'id'> | undefined): void {
  if (card) emit(cardPickEvent(card));
}

export function trackFeedbackSent(kind: string): void {
  emit(feedbackSentEvent(kind));
}

/** The Analytics switch. Off: nothing more is sent and replay stops. On again: replay resumes (or analytics start). */
export function setAnalytics(next: boolean): void {
  device.update({ analytics: next });
  if (!analyticsConfigured) return;
  if (!next) queue = [];
  try {
    if (!live) void boot();
    else if (next) posthog.startSessionRecording();
    else posthog.stopSessionRecording();
  } catch {
    // see boot()
  }
}

/**
 * Start analytics with the game (GameRoot): read this device's state, start posthog-js, and report the run events the hub
 * announces. Returns the cleanup for the hub listeners (posthog-js itself lives as long as the page).
 */
export function startTelemetry(args: { hub: Hub; bridge: Pick<Bridge, 'load' | 'save'>; info: AppInfo | null }): () => void {
  info = args.info;
  void device.load(args.bridge).then(() => boot());
  const levels = levelUpCounter();
  const offs = [
    args.hub.on('runStart', (p) => {
      levels.reset();
      emit(runStartEvent(p, CONTENT.chapters[0].id));
    }),
    args.hub.on('levelUp', (p) => {
      const evt = levels.next(p.level);
      if (evt) emit(evt);
    }),
    args.hub.on('boss', (p) => emit(bossEvent(p.name))),
    args.hub.on('runEnd', (r) => emit(runEndEvent(r))),
  ];
  return () => offs.forEach((off) => off());
}
