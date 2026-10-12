// Tiny store: whether the floating button is shown, the unsent draft, and the sheet's open state. Saved on the
// device for whoever is signed in, and cleared when someone else (or nobody) signs in.
import { useSyncExternalStore } from 'react';

import { type FeedbackKind, onSignedInUserChange } from '@/data';

type State = {
  hidden: boolean;
  /** Has opened Tell … at least once: the button then folds down to its icon. */
  used: boolean;
  open: boolean;
  listenOnOpen: boolean;
  screenshot: string | null;
  draft: { kind: FeedbackKind; body: string };
};

const KEY_HIDDEN = 'prata-raja-feedback-hidden';
const KEY_USED = 'prata-raja-feedback-used';
const KEY_DRAFT = 'prata-raja-feedback-draft';

function read<T>(key: string, fallback: T): T {
  try {
    const v = globalThis.localStorage?.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function remove(key: string) {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}
function write(key: string, value: unknown) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

let state: State = {
  hidden: read(KEY_HIDDEN, false),
  used: read(KEY_USED, false),
  open: false,
  listenOnOpen: false,
  screenshot: null,
  draft: read(KEY_DRAFT, { kind: 'idea' as FeedbackKind, body: '' }),
};
/** Counts sign-ins and sign-outs, so a note box opened for one person can't write its draft after someone else signed in. */
let epoch = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const feedbackStore = {
  get: () => state,
  epoch: () => epoch,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  open(screenshot: string | null, listen = false) {
    if (!state.used) write(KEY_USED, true);
    state = { ...state, open: true, used: true, screenshot, listenOnOpen: listen };
    emit();
  },
  close() {
    state = { ...state, open: false, listenOnOpen: false };
    emit();
  },
  setHidden(hidden: boolean) {
    state = { ...state, hidden };
    write(KEY_HIDDEN, hidden);
    emit();
  },
  /** `quiet`: keep it without waking every listener (the note box saves as you type; nothing else shows the draft). */
  setDraft(draft: State['draft'], quiet = false) {
    state = { ...state, draft };
    write(KEY_DRAFT, draft);
    if (!quiet) emit();
  },
  clearDraft() {
    feedbackStore.setDraft({ kind: 'idea', body: '' });
    state = { ...state, screenshot: null };
    emit();
  },
};

// The next person on this device must not get the previous person's unsent note (and send it as themselves).
onSignedInUserChange(() => {
  epoch++;
  remove(KEY_DRAFT);
  remove(KEY_HIDDEN);
  remove(KEY_USED);
  state = { hidden: false, used: false, open: false, listenOnOpen: false, screenshot: null, draft: { kind: 'idea', body: '' } };
  emit();
});

export function useFeedbackStore() {
  return useSyncExternalStore(feedbackStore.subscribe, feedbackStore.get, feedbackStore.get);
}
