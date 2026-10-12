import { useState } from 'react';

import { type Followed, followOutside, startFollowed } from './followText';

/**
 * The text of a box that also holds a value elsewhere (see followText.ts). Returns what to show, a `fresh` to key the
 * box on, `type` for each change the person makes, and `settle` (on blur) to show the value cleanly again.
 * The follow happens while rendering, so no frame ever shows the old words next to the new value.
 */
export function useFollowedText<V>(value: V, agrees: (text: string, value: V) => boolean, show: (v: V) => string) {
  const [state, setState] = useState<Followed<V>>(() => startFollowed(value, show));
  const next = followOutside(state, value, agrees, show);
  if (next !== state) setState(next);
  return {
    text: next.text,
    fresh: next.fresh,
    type: (text: string) => setState((p) => ({ ...p, text })),
    settle: () => setState((p) => ({ ...p, text: show(value), last: value })),
  };
}
