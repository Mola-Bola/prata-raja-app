import { describe, expect, it } from 'vitest';

import { insertAtCursor } from '../speechText';
import { createWebEngine, isAndroidBrowser, type WebRecognition } from '../webSpeech';

// Event sequences as Chrome sends them: the whole `results` list every time (resultIndex is not used).
type Item = [string, boolean];
const list = (...items: Item[]) => items.map(([transcript, isFinal]) => Object.assign([{ transcript }], { isFinal }));

class Fake implements WebRecognition {
  static made: Fake[] = [];
  lang = '';
  continuous = false;
  interimResults = false;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error?: string }) => void) | null = null;
  onresult: ((e: { results: ArrayLike<{ isFinal: boolean }> }) => void) | null = null;
  started = false;
  aborted = false;
  constructor() {
    Fake.made.push(this);
  }
  start() {
    this.started = true;
    this.onstart?.();
  }
  stop() {
    this.onend?.(); // the real one delivers a last result first, then ends
  }
  abort() {
    this.aborted = true; // an aborted recogniser may still fire its end later; the engine must ignore it
  }
  say(...items: Item[]) {
    this.onresult?.({ results: list(...items) } as never);
  }
  end() {
    this.onend?.();
  }
}

/** A note box driven by the engine like the app does: spoken words go in at the cursor, typing stops listening first. */
function rig(opts: { android: boolean; now?: () => number }) {
  Fake.made = [];
  const queue: (() => void)[] = [];
  const state = { text: '', cursor: 0, listening: false, interim: '', problem: null as string | null, chunks: [] as string[] };
  const engine = createWebEngine({
    Ctor: Fake as unknown as new () => WebRecognition,
    lang: 'en-AU',
    android: opts.android,
    now: opts.now,
    later: (fn) => queue.push(fn),
    onText: (chunk) => {
      state.chunks.push(chunk);
      const r = insertAtCursor(state.text, state.cursor, chunk);
      state.text = r.text;
      state.cursor = r.cursor;
    },
    onInterim: (w) => (state.interim = w),
    onListening: (on) => (state.listening = on),
    onProblem: (p) => (state.problem = p),
  });
  return {
    state,
    engine,
    sessions: () => Fake.made,
    last: () => Fake.made[Fake.made.length - 1],
    /** Run what the engine scheduled (the next Android session). */
    tick: () => queue.splice(0).forEach((fn) => fn()),
    /** The person types: listening stops first, then the text changes (as in FeedbackSheet's `edit`). */
    type: (text: string) => {
      engine.stop();
      state.text = text;
      state.cursor = text.length;
    },
  };
}

describe('isAndroidBrowser', () => {
  it('reads the user agent', () => {
    expect(isAndroidBrowser('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36')).toBe(true);
    expect(isAndroidBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36')).toBe(false);
    expect(isAndroidBrowser(undefined)).toBe(false);
  });
});

describe('desktop Chrome (continuous, one session)', () => {
  it('each event carries the whole list: the note gets every word once', () => {
    const t = rig({ android: false });
    t.engine.start();
    const r = t.last();
    expect(r.continuous).toBe(true);
    expect(r.interimResults).toBe(true);
    r.say(['hello', false]);
    expect(t.state.interim).toBe('hello');
    r.say(['hello there', true], [' how', false]);
    expect(t.state.interim).toBe('how');
    r.say(['hello there', true], [' how are you', true]);
    r.say(['hello there', true], [' how are you', true]); // the same list again
    r.say(['hello there', true], ['how are you', true], ['fine thanks', false]);
    r.say(['hello there', true], ['how are you', true], ['fine thanks', true]);
    expect(t.state.text).toBe('hello there how are you fine thanks');
    expect(t.state.chunks).toEqual(['hello there', 'how are you', 'fine thanks']);
    expect(t.state.interim).toBe('');
  });

  it('a phrase said twice is said twice (desktop does not collapse repeats)', () => {
    const t = rig({ android: false });
    t.engine.start();
    t.last().say(['yes', true]);
    t.last().say(['yes', true], ['yes', true]);
    expect(t.state.text).toBe('yes yes');
  });

  it('a list that keeps repeating itself (a chain of three) is read as cumulative from then on', () => {
    const t = rig({ android: false });
    t.engine.start();
    t.last().say(['two', true], ['two tim tams', true], ['two tim tams for mum', true]);
    expect(t.state.text).toBe('two tim tams for mum');
    t.last().say(['two', true], ['two tim tams', true], ['two tim tams for mum', true], ['two tim tams for mum and dad', true]);
    expect(t.state.text).toBe('two tim tams for mum and dad');
  });

  it('two real phrases that start alike are both kept on desktop', () => {
    const t = rig({ android: false });
    t.engine.start();
    t.last().say(['I need help', true]);
    t.last().say(['I need help', true], ['I need help with packing', true]);
    expect(t.state.text).toBe('I need help I need help with packing');
  });

  it('a session that ends by itself ends listening (no restart on desktop)', () => {
    const t = rig({ android: false });
    t.engine.start();
    t.last().onstart?.();
    t.last().say(['hello', true]);
    t.last().end();
    t.tick();
    expect(t.sessions()).toHaveLength(1);
    expect(t.state.listening).toBe(false);
    expect(t.state.text).toBe('hello');
  });

  it('typing in between: the late phrase is dropped, the typed text stays', () => {
    const t = rig({ android: false });
    t.engine.start();
    const r = t.last();
    r.say(['hello there', true]);
    t.type('Hello there');
    r.say(['hello there', true], ['how are you', true]);
    r.end();
    expect(t.state.text).toBe('Hello there');
    expect(t.state.listening).toBe(false);
    expect(r.aborted).toBe(true);
  });

  it('start() again begins a clean run: nothing from before is added a second time', () => {
    const t = rig({ android: false });
    t.engine.start();
    t.last().say(['hello', true]);
    t.engine.finish();
    t.engine.start();
    t.last().say(['world', true]);
    expect(t.state.text).toBe('hello world');
  });
});

describe('Android Chrome', () => {
  it('runs one phrase at a time (continuous off), interim results on', () => {
    const t = rig({ android: true });
    t.engine.start();
    expect(t.last().continuous).toBe(false);
    expect(t.last().interimResults).toBe(true);
  });

  it('growing snapshots marked final: every word once, longest wins', () => {
    const t = rig({ android: true });
    t.engine.start();
    const r = t.last();
    r.say(['hello', false]);
    r.say(['hello', true], ['hello there', false]);
    r.say(['hello', true], ['hello there', true], ['hello there how', false]);
    expect(t.state.interim).toBe('how');
    r.say(['hello', true], ['hello there', true], ['hello there how are you', true]);
    r.say(['hello', true], ['hello there', true], ['hello there how are you', true]); // repeated list
    expect(t.state.text).toBe('hello there how are you');
    expect(t.state.chunks.join(' ')).toBe('hello there how are you');
  });

  it('snapshots that change capitals, punctuation or numbers do not repeat words', () => {
    const t = rig({ android: true });
    t.engine.start();
    const r = t.last();
    r.say(['two tim tams', true]);
    r.say(['two tim tams', true], ['Two Tim-Tams, for mum', true]);
    r.say(['2 Tim Tams for mum', true]);
    expect(t.state.text).toBe('two tim tams for mum');
  });

  it('a new session after a pause: sessions are joined, words never repeated', () => {
    const t = rig({ android: true });
    t.engine.start();
    t.last().onstart?.();
    t.last().say(['hello there', true]);
    t.last().end(); // Chrome ends the phrase-long session
    expect(t.state.listening).toBe(true); // still listening: the next session is on its way
    expect(t.sessions()).toHaveLength(1);
    t.tick();
    expect(t.sessions()).toHaveLength(2);
    t.last().onstart?.();
    t.last().say(['how are you', false]);
    expect(t.state.interim).toBe('how are you');
    t.last().say(['how are you', true]);
    t.last().say(['how are you', true], ['how are you today', true]);
    t.last().end();
    t.tick();
    t.last().say(['fine', true]);
    expect(t.sessions()).toHaveLength(3);
    expect(t.state.text).toBe('hello there how are you today fine');
  });

  it('a session that ends with words said but never marked final keeps them', () => {
    const t = rig({ android: true });
    t.engine.start();
    t.last().say(['milk and bread', false]);
    t.last().end();
    expect(t.state.text).toBe('milk and bread');
    expect(t.state.interim).toBe('');
  });

  it('the person taps stop: the phrase in progress is added, then listening ends and nothing restarts', () => {
    const t = rig({ android: true });
    t.engine.start();
    t.last().onstart?.();
    t.last().say(['honey', true]);
    t.last().say(['honey', true], ['and jam', false]);
    t.engine.finish(); // Fake.stop() ends the session straight away, as Chrome does after its last result
    t.tick();
    expect(t.state.text).toBe('honey and jam');
    expect(t.state.listening).toBe(false);
    expect(t.sessions()).toHaveLength(1);
  });

  it('tapping stop between two sessions ends listening and the next one never starts', () => {
    const t = rig({ android: true });
    t.engine.start();
    t.last().onstart?.();
    t.last().say(['hello', true]);
    t.last().end();
    t.engine.finish();
    t.tick();
    expect(t.sessions()).toHaveLength(1);
    expect(t.state.listening).toBe(false);
  });

  it('typing between sessions: the typed text stays and no new session starts', () => {
    const t = rig({ android: true });
    t.engine.start();
    t.last().onstart?.();
    t.last().say(['hello there', true]);
    t.last().end();
    t.type('Hello there, mum');
    t.tick();
    expect(t.sessions()).toHaveLength(1);
    expect(t.state.text).toBe('Hello there, mum');
    // Talking again goes in at the end of what was typed, and the earlier session's words do not come back.
    t.engine.start();
    t.last().say(['how are you', true]);
    expect(t.state.text).toBe('Hello there, mum how are you');
  });

  it('typing while a session is live: its late results are ignored', () => {
    const t = rig({ android: true });
    t.engine.start();
    const r = t.last();
    r.say(['hello', true]);
    t.type('Hello');
    r.say(['hello', true], ['hello there', true]);
    r.end();
    t.tick();
    expect(t.state.text).toBe('Hello');
    expect(t.sessions()).toHaveLength(1);
  });

  it('no speech heard ends listening quietly', () => {
    const t = rig({ android: true });
    t.engine.start();
    t.last().onstart?.();
    t.last().onerror?.({ error: 'no-speech' });
    t.last().end();
    t.tick();
    expect(t.state.listening).toBe(false);
    expect(t.state.problem).toBeNull();
    expect(t.sessions()).toHaveLength(1);
  });

  it('a blocked microphone says so and does not loop', () => {
    const t = rig({ android: true });
    t.engine.start();
    t.last().onerror?.({ error: 'not-allowed' });
    t.last().end();
    t.tick();
    expect(t.state.problem).toBe('denied');
    expect(t.state.listening).toBe(false);
    expect(t.sessions()).toHaveLength(1);
  });

  it('sessions that end at once with nothing heard stop after a few tries instead of looping', () => {
    let clock = 0;
    const t = rig({ android: true, now: () => clock });
    t.engine.start();
    for (let i = 0; i < 6 && t.state.listening !== false; i++) {
      t.last().onstart?.();
      clock += 100;
      t.last().end();
      t.tick();
    }
    expect(t.sessions().length).toBeLessThanOrEqual(3);
    expect(t.state.listening).toBe(false);
    expect(t.state.problem).toBe('unheard');
  });
});
