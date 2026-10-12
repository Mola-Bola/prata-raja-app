// Offline-capable mutations. Defaults are registered on the QueryClient so paused mutations persisted to storage can
// resume after an app restart (functions can't be serialised).
//
// The starter has no offline writes yet. When you add one, put its mutationFn, optimistic update and invalidation next
// to its types in a `<feature>Offline.ts`, register it below, and expose it from the feature's hook:
//   qc.setMutationDefaults(['key'], { scope: OFFLINE_SCOPE, networkMode: 'online', mutationFn, onMutate, onSettled });
//   useMutation({ mutationKey: ['key'], scope: OFFLINE_SCOPE })
// One scope means offline changes replay one at a time, in the order they were made.
import type { QueryClient } from '@tanstack/react-query';

export const OFFLINE_SCOPE = { id: 'offline-writes' };

export function registerOfflineMutations(qc: QueryClient) {
  void qc; // register your <feature>Offline.ts defaults here
}
