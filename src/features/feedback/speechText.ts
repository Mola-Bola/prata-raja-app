// Pure text helpers for dictation: where spoken words land in a note, and how the browser's results become text.

/**
 * Puts `chunk` into `text` at the position `at` (clamped), with a space either side when it would otherwise run into
 * a neighbouring word. `cursor` is just after the inserted words, ready for the next chunk.
 */
export function insertAtCursor(text: string, at: number, chunk: string): { text: string; cursor: number } {
  const words = chunk.trim();
  const pos = Math.max(0, Math.min(at, text.length));
  if (!words) return { text, cursor: pos };
  const before = text.slice(0, pos);
  const after = text.slice(pos);
  const lead = before && !/\s$/.test(before) ? ' ' : '';
  // No space before closing punctuation that is already there ("hello" + ", world").
  const tail = after && !/^[\s.,;:!?)]/.test(after) ? ' ' : '';
  const head = before + lead + words;
  return { text: head + tail + after, cursor: head.length };
}

type WebResult = { isFinal: boolean; [index: number]: { transcript: string } | undefined };

// Words for comparing what the recogniser says: case, punctuation and hyphens don't count ("Tim-Tams," = "tim tams").
const wordsOf = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[\s\-\u2010-\u2015]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
const isPrefix = (head: string[], all: string[]) => head.length <= all.length && head.every((w, i) => w === all[i]);

/**
 * Cumulative results. Chrome on Android (continuous mode) sends "growing snapshots": result 0 is "hello", result 1 is
 * "hello there", result 2 is "hello there how are you", all marked final, so adding them up says the same words many
 * times (observed and fixed in https://github.com/opuswork/delivery-app-fe/pull/1 and
 * https://github.com/shakyadhairyata/meinedeutschelehrerin/pull/22; Chromium issue 40324711, "continuous speech
 * recognition is broken on Android"). Desktop Chrome gives each finished phrase once. This keeps the longest snapshot:
 * a part that starts with everything so far replaces it, a part already contained in what we have is dropped, anything
 * else is a new phrase and is added on.
 */
export function collapseCumulative(parts: string[]): string {
  let acc = '';
  for (const part of parts) {
    if (!acc) {
      acc = part;
      continue;
    }
    const have = wordsOf(acc);
    const next = wordsOf(part);
    if (next.length >= have.length && isPrefix(have, next)) acc = part;
    else if (have.length > next.length && isPrefix(next, have)) continue;
    else acc = `${acc} ${part}`;
  }
  return acc;
}

/** True when three or more finished phrases in a row each begin with the whole one before ("two", "two tim tams", "two
 *  tim tams for mum"). Desktop Chrome never does that, so once seen the rest of the session is read as cumulative
 *  whatever the browser says it is. Two in a row is not enough: "I need help" then "I need help with packing" can be
 *  two real phrases. */
export function looksCumulative(finals: string[]): boolean {
  let chain = 0;
  for (let i = 1; i < finals.length; i++) {
    const before = wordsOf(finals[i - 1]);
    const next = wordsOf(finals[i]);
    chain = before.length > 0 && next.length > before.length && isPrefix(before, next) ? chain + 1 : 0;
    if (chain >= 2) return true;
  }
  return false;
}

/** `text` without its first `n` words (words as `wordsOf` counts them: hyphens separate, punctuation doesn't count). */
function dropWords(text: string, n: number): string {
  if (n <= 0) return text.trim();
  let seen = 0;
  for (const m of text.matchAll(/[^\s\-\u2010-\u2015]+/g)) {
    if (wordsOf(m[0]).length) seen++;
    if (seen >= n) return text.slice(m.index! + m[0].length).replace(/^[\s\-\u2010-\u2015]+/, '');
  }
  return '';
}

/**
 * Rebuilds what was said from the browser's whole `event.results` list: every finished phrase in order, and the
 * unfinished ones as a tail. Android Chrome sends the whole list so far on every event (resultIndex stays 0), so
 * reading only the newest result, or adding each event's text on, repeats words. With `cumulative` (Android, or a list
 * that repeats itself) the finished phrases and the tail are cut down to what was actually said once.
 */
export function transcriptFromResults(results: ArrayLike<WebResult>, opts: { cumulative?: boolean } = {}): { final: string; interim: string } {
  const finals: string[] = [];
  const tail: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const t = r?.[0]?.transcript?.trim();
    if (!t) continue;
    (r.isFinal ? finals : tail).push(t);
  }
  if (!opts.cumulative) return { final: finals.join(' '), interim: tail.join(' ') };
  const final = collapseCumulative(finals);
  let interim = collapseCumulative(tail);
  // The unfinished part can restate the finished one too ("hello there how" after "hello there").
  const done = wordsOf(final);
  if (done.length && isPrefix(done, wordsOf(interim))) interim = dropWords(interim, done.length);
  return { final, interim };
}

/**
 * Which words of `final` are new since `committed` (the finished text already put in the note this session).
 * Compared word by word, so if the recogniser rewords something it has already given us we never add it twice.
 */
export function newFinalWords(committed: string, final: string): { add: string; committed: string } {
  // Counted as words (not as space-separated bits), so "Tim-Tams," and "tim tams" are the same two words.
  const have = wordsOf(committed).length;
  if (wordsOf(final).length <= have) return { add: '', committed };
  return { add: dropWords(final, have), committed: final };
}
