// The browser's speech recogniser (Chrome calls it webkitSpeechRecognition) as one small state machine with no React in
// it, so the exact text a person ends up with can be tested from recorded event sequences (__tests__/webSpeech.test.ts).
// `useWebDictation` in dictation.ts is a thin hook around `createWebEngine`.
//
// What Chrome does, and what this does about it (sources in the comments below and in speechText.ts):
// - Desktop Chrome, continuous = true: each finished phrase once, in order; the session ends by itself after a long pause.
// - Android Chrome: continuous mode is unreliable. It re-sends "growing snapshots" of everything said as final results
//   (each result repeats the earlier words), `resultIndex` never moves, and sessions end on their own after a pause
//   (Chromium issue 40324711 "Web Speech API: Continuous speech recognition is broken on Android"; the Android
//   workarounds in https://github.com/opuswork/delivery-app-fe/pull/1 and
//   https://github.com/shakyadhairyata/meinedeutschelehrerin/pull/22 are what this follows). So on Android we run
//   single-phrase sessions (continuous = false) and start the next one when a session ends, joining the sessions' words;
//   and every list is read as cumulative (speechText.ts collapseCumulative) in case the snapshots arrive anyway.
import { looksCumulative, newFinalWords, transcriptFromResults } from './speechText';

export type WebAlt = { transcript: string };
export type WebResultList = ArrayLike<{ isFinal: boolean; [i: number]: WebAlt | undefined }>;
export type WebRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onresult: ((e: { results: WebResultList }) => void) | null;
};

const finalTexts = (results: WebResultList): string[] => {
  const out: string[] = [];
  for (let i = 0; i < results.length; i++) if (results[i]?.isFinal) out.push(results[i]?.[0]?.transcript?.trim() ?? '');
  return out.filter(Boolean);
};

export const isAndroidBrowser = (ua: string | undefined) => /android/i.test(ua ?? '');

export type WebProblem = 'denied' | 'unheard';

export type WebEngine = {
  /** Starts listening (a new run: words from earlier runs are never repeated). */
  start(): void;
  /** Ends at once; words not yet delivered are dropped. For typing, closing, leaving. */
  stop(): void;
  /** The person tapped stop: the phrase being said is still delivered, then listening ends. */
  finish(): void;
};

type Options = {
  Ctor: new () => WebRecognition;
  lang: string;
  /** Android Chrome: phrase-by-phrase sessions that restart, cumulative results. */
  android: boolean;
  /** Called with each newly finished piece of speech, once. */
  onText: (chunk: string) => void;
  /** The words still being recognised. */
  onInterim: (words: string) => void;
  onListening: (on: boolean) => void;
  onProblem: (problem: WebProblem) => void;
  /** Runs `fn` soon (setTimeout 0 by default); a test passes a manual queue. */
  later?: (fn: () => void) => void;
  now?: () => number;
};

// A session that ends this fast without a single word, this many times in a row, is not going to hear anything.
const QUICK_MS = 1200;
const QUICK_LIMIT = 3;

export function createWebEngine(o: Options): WebEngine {
  const later = o.later ?? ((fn) => void setTimeout(fn, 0));
  const now = o.now ?? Date.now;
  // The recogniser in use. Handlers from any other (one that was stopped, or already over) are ignored.
  let current: WebRecognition | null = null;
  // Whether the person wants to be listened to (start() until stop()/finish() or a fatal problem).
  let wanted = false;
  let finishing = false;
  let quick = 0;
  let latchedCumulative = false;

  const run = () => {
    const r = new o.Ctor();
    r.lang = o.lang;
    r.continuous = !o.android;
    r.interimResults = true;
    // Finished text already handed on from THIS session (each session's list starts empty), and its last list.
    let committed = '';
    let last: WebResultList = [];
    const startedAt = now();
    let heard = false;
    const live = () => current === r;
    const read = (results: WebResultList, flush = false) => {
      // Not Android, but a list that repeats itself: from then on the session is read as cumulative.
      if (!o.android && !latchedCumulative && looksCumulative(finalTexts(results))) latchedCumulative = true;
      let { final, interim } = transcriptFromResults(results, { cumulative: o.android || latchedCumulative });
      if (flush && interim.trim()) {
        // The session is over and a phrase never got its "final": the words were said, so keep them.
        final = `${final} ${interim}`.trim();
        interim = '';
      }
      o.onInterim(interim);
      const next = newFinalWords(committed, final);
      committed = next.committed;
      if (next.add) {
        heard = true;
        quick = 0;
        o.onText(next.add);
      }
    };
    r.onstart = () => live() && o.onListening(true);
    r.onresult = (e) => {
      if (!live()) return;
      last = e.results;
      read(e.results);
    };
    r.onerror = (e) => {
      if (!live()) return;
      current = null;
      wanted = false;
      finishing = false;
      o.onListening(false);
      o.onInterim('');
      if (e.error === 'aborted' || e.error === 'no-speech') return;
      o.onProblem(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : 'unheard');
    };
    r.onend = () => {
      if (!live()) return;
      current = null;
      read(last, true);
      o.onInterim('');
      if (heard) quick = 0;
      else if (now() - startedAt < QUICK_MS) quick++;
      // Android sessions are one phrase long: the next one starts here unless the person has stopped.
      if (o.android && !finishing && quick < QUICK_LIMIT) {
        later(() => {
          // stop() or start() may have come in the meantime.
          if (current === null && wanted) run();
        });
        return;
      }
      const gaveUp = o.android && !finishing && quick >= QUICK_LIMIT;
      wanted = false;
      finishing = false;
      o.onListening(false);
      if (gaveUp) o.onProblem('unheard');
    };
    current = r;
    try {
      r.start();
    } catch {
      current = null;
      wanted = false;
      o.onListening(false);
      o.onProblem('unheard');
    }
  };

  return {
    start() {
      try {
        current?.abort();
      } catch {
        /* already over */
      }
      current = null;
      wanted = true;
      finishing = false;
      quick = 0;
      latchedCumulative = false;
      run();
    },
    stop() {
      wanted = false;
      finishing = false;
      const r = current;
      current = null;
      o.onInterim('');
      o.onListening(false);
      try {
        r?.abort();
      } catch {
        /* not running */
      }
    },
    finish() {
      if (!current) {
        // Between two Android sessions: nothing is being said, so there is nothing to wait for.
        if (wanted) {
          wanted = false;
          o.onListening(false);
        }
        return;
      }
      finishing = true;
      try {
        current.stop();
      } catch {
        /* not running */
      }
    },
  };
}
