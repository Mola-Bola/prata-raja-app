// Offline (or while the app isn't answering), TanStack Query pauses a load until it can be reached. If nothing was saved
// on this device for it yet, the paused query has no data, no error and isn't "loading", so screens took it for
// "nothing here": "All square", "You're all caught up", "This trip may have been deleted". Here that state reports
// itself as an error instead ("You're offline, and this isn't saved on this phone yet…"), which every screen already
// shows (ErrorView, or its section's error note). It loads by itself once the app can be reached.
import type { UseQueryResult } from '@tanstack/react-query';

import { notSavedYet } from './errors';

/** No saved copy on this device, and waiting for the app to be reachable before it can load. */
export function isWaitingForData(q: { data: unknown; fetchStatus: string }): boolean {
  return q.data === undefined && q.fetchStatus === 'paused';
}

/** The query as screens should see it: waiting with nothing saved becomes an error saying so. */
export function reportWaiting<T extends UseQueryResult<unknown, Error>>(q: T): T {
  if (!isWaitingForData(q)) return q;
  return { ...q, status: 'error', error: notSavedYet(), isError: true, isLoadingError: true, isPending: false, isLoading: false } as T;
}
