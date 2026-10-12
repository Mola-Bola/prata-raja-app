// Saving a change that can wait for a connection: resolve "saved" once the server has it, or "queued" when the app can't
// be reached (straight away, or if the connection drops while saving), so a screen only says "Done" when it is. Throws
// when the server says no, so the caller keeps what was typed. A queued change that later fails goes to `onLateError`.
import { onlineManager } from '@tanstack/react-query';

export type SaveResult = 'saved' | 'queued';

/** What a screen says when a change was queued rather than saved. */
export const QUEUED_NOTE = 'Saved on this phone, will sync';

type Mutation<V> = { mutateAsync: (v: V) => Promise<unknown> };

export function saveOrQueue<V>(m: Mutation<V>, vars: V, onLateError: (e: Error) => void): Promise<SaveResult> {
  if (!onlineManager.isOnline()) {
    // This promise outlives the screen (unlike mutate's per-call callbacks), so a queued change the server later
    // refuses is still reported.
    m.mutateAsync(vars).catch(onLateError);
    return Promise.resolve('queued');
  }
  return new Promise<SaveResult>((resolve, reject) => {
    let settled = false;
    const stop = onlineManager.subscribe((online) => {
      if (online || settled) return;
      settled = true;
      stop();
      resolve('queued');
    });
    m.mutateAsync(vars).then(
      () => {
        stop();
        if (settled) return;
        settled = true;
        resolve('saved');
      },
      (e: Error) => {
        stop();
        if (settled) return onLateError(e);
        settled = true;
        reject(e);
      },
    );
  });
}
