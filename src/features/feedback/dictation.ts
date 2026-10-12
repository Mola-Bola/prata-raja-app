// Speech-to-text for notes. On-device Google recognition on Android, SFSpeech on iOS, the browser's own on the web.
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { createWebEngine, isAndroidBrowser, type WebRecognition } from './webSpeech';

const lang = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en-AU';
  } catch {
    return 'en-AU';
  }
})();

const MIC_OFF = 'Microphone access is off. You can turn it on in Settings, or type instead.';
const DIDNT_HEAR = 'Couldn’t hear that. Try again or type it.';

// The browser's SpeechRecognition (Chrome calls it webkitSpeechRecognition). On the web we talk to it directly: the
// expo-speech-recognition wrapper reports only `results[resultIndex]`, and Android Chrome's resultIndex never moves, so
// every event repeated the first phrase. The engine itself (Android sessions, cumulative results) is in webSpeech.ts.
const webCtor = (): (new () => WebRecognition) | null => {
  const g = globalThis as { SpeechRecognition?: new () => WebRecognition; webkitSpeechRecognition?: new () => WebRecognition };
  return g.webkitSpeechRecognition ?? g.SpeechRecognition ?? null;
};

export function dictationAvailable(): boolean {
  if (Platform.OS === 'web') return webCtor() != null;
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

export type Dictation = {
  listening: boolean;
  interim: string;
  error: string | null;
  start: () => void;
  /** Ends listening at once; words not yet delivered are dropped. For typing, closing, leaving. */
  stop: () => void;
  /** The person tapped stop: the recogniser finishes the phrase it is on, which is still added. */
  finish: () => void;
  toggle: () => void;
};

/** Native engine. Calls onText(finalChunk) for each finished phrase; `interim` is the words still being recognised. */
function useNativeDictation(onText: (chunk: string) => void): Dictation {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const onTextRef = useRef(onText);
  // Each start() is a session; stop() ends it. Words recognised after that (the recogniser can deliver a last result
  // late, or a permission prompt can finish after you've moved on) are dropped instead of landing in the middle of
  // whatever you're now typing.
  const session = useRef(0);
  const active = useRef(false);
  const finishing = useRef(false);
  useEffect(() => {
    onTextRef.current = onText;
  });

  useSpeechRecognitionEvent('start', () => {
    setListening(true);
    setError(null);
  });
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    setInterim('');
    if (finishing.current) active.current = false;
    finishing.current = false;
  });
  useSpeechRecognitionEvent('result', (e) => {
    if (!active.current) return;
    const t = e.results[0]?.transcript ?? '';
    if (e.isFinal) {
      setInterim('');
      if (t.trim()) onTextRef.current(t.trim());
    } else {
      setInterim(t);
    }
  });
  useSpeechRecognitionEvent('error', (e) => {
    setListening(false);
    setInterim('');
    if (e.error !== 'aborted' && e.error !== 'no-speech') setError(e.message || DIDNT_HEAR);
  });

  const start = useCallback(async () => {
    const mine = ++session.current;
    setError(null);
    finishing.current = false;
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (mine !== session.current) return;
    if (!perm.granted) {
      setError(MIC_OFF);
      return;
    }
    active.current = true;
    ExpoSpeechRecognitionModule.start({ lang, interimResults: true, continuous: true, addsPunctuation: true });
  }, []);

  const stop = useCallback(() => {
    session.current++;
    const wasActive = active.current;
    active.current = false;
    finishing.current = false;
    setInterim('');
    if (!wasActive) return;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      /* not running */
    }
  }, []);

  const finish = useCallback(() => {
    if (!active.current) return;
    finishing.current = true; // results keep counting until the recogniser says it has ended
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      active.current = false;
    }
  }, []);

  return { listening, interim, error, start, stop, finish, toggle: () => (listening ? finish() : start()) };
}

/** Web engine: the browser's recogniser, run by `createWebEngine` (webSpeech.ts). */
function useWebDictation(onText: (chunk: string) => void): Dictation {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const onTextRef = useRef(onText);
  const engine = useRef<ReturnType<typeof createWebEngine> | null>(null);
  useEffect(() => {
    onTextRef.current = onText;
  });

  const start = useCallback(() => {
    const Ctor = webCtor();
    setError(null);
    if (!Ctor) {
      setError('Talking isn’t available in this browser. You can type instead.');
      return;
    }
    // A fresh engine for each start: whatever the old one still says (a late result, its end) is ignored.
    engine.current?.stop();
    engine.current = createWebEngine({
      Ctor,
      lang,
      android: isAndroidBrowser(globalThis.navigator?.userAgent),
      onText: (chunk) => onTextRef.current(chunk),
      onInterim: setInterim,
      onListening: setListening,
      onProblem: (p) => setError(p === 'denied' ? MIC_OFF : DIDNT_HEAR),
    });
    engine.current.start();
  }, []);

  const stop = useCallback(() => {
    engine.current?.stop();
    engine.current = null;
    setInterim('');
    setListening(false);
  }, []);

  // finish() asks for the final result of the phrase in progress; it is still added before listening ends.
  const finish = useCallback(() => engine.current?.finish(), []);

  return { listening, interim, error, start, stop, finish, toggle: () => (listening ? finish() : start()) };
}

/** Chosen once per platform, so the hook order never changes. */
export const useDictation: (onText: (chunk: string) => void) => Dictation = Platform.OS === 'web' ? useWebDictation : useNativeDictation;
