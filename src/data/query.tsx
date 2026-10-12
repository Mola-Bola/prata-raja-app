import NetInfo from '@react-native-community/netinfo';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import {
  MutationCache,
  onlineManager,
  QueryCache,
  QueryClient,
  type QueryKey,
  useIsMutating,
  useMutationState,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { type PersistedClient, type Persister, PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { type ReactNode, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { isDeviceOnline, isServerDown, setDeviceOnline, subscribeConnection } from './connection';
import { dataOwner } from './deviceScope';
import { isNetworkError } from './errors';
import { registerOfflineMutations } from './offline';
import { reportServerOk, reportServerUnreachable } from './reachability';
import { reportWaiting } from './waiting';

// "Online", for the query client, means the app can be reached: the device is connected and the server answers.
// While it can't, reads keep showing saved data and wait, and offline writes queue; both carry on by
// themselves once it's back (src/data/reachability.ts keeps checking the server).
onlineManager.setEventListener((setOnline) => {
  const sync = () => setOnline(isDeviceOnline() && !isServerDown());
  const stopSync = subscribeConnection(sync);
  let stopDevice: () => void;
  if (Platform.OS === 'web') {
    const on = () => setDeviceOnline(true);
    const off = () => setDeviceOnline(false);
    globalThis.addEventListener?.('online', on);
    globalThis.addEventListener?.('offline', off);
    setDeviceOnline(globalThis.navigator?.onLine !== false);
    stopDevice = () => {
      globalThis.removeEventListener?.('online', on);
      globalThis.removeEventListener?.('offline', off);
    };
  } else {
    stopDevice = NetInfo.addEventListener((st) => setDeviceOnline(!!st.isConnected));
  }
  sync();
  return () => {
    stopSync();
    stopDevice();
  };
});

const noteFailure = (e: unknown) => {
  if (isNetworkError(e)) reportServerUnreachable();
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: noteFailure, onSuccess: reportServerOk }),
  mutationCache: new MutationCache({ onError: noteFailure, onSuccess: reportServerOk }),
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7,
      staleTime: 20_000,
      // No answer twice in a row (Supabase's own retries are off, src/data/supabase.ts): the server is unreachable.
      // The query then waits, showing saved data or "Can't reach the app", instead of spinning and then failing.
      retry: (failures, e) => {
        if (!isNetworkError(e)) return failures < 1;
        if (failures >= 1) reportServerUnreachable();
        return true;
      },
      // While the app can't be reached (offline, or known not to answer), don't try: show the saved copy, or say it isn't
      // saved on this phone yet (src/data/waiting.ts), straight away. Trying anyway only delayed that: with an expired
      // session, supabase-js first spends ~25 s failing to renew it.
      networkMode: 'online',
    },
    // Saves try straight away and say so if they fail, instead of hanging until the app can be reached. Offline saves
    // are the exception: they queue (src/data/offline.ts).
    mutations: { networkMode: 'always' },
  },
});

registerOfflineMutations(queryClient);

/** Bump when cached shapes change, so old caches are discarded. */
const CACHE_BUSTER = 'v1';

const CACHE_KEY = 'prata-raja-query-cache';

const storagePersister = createSyncStoragePersister({
  storage: globalThis.localStorage,
  key: CACHE_KEY,
  throttleTime: 1000,
});

type OwnedClient = PersistedClient & { owner?: string | null };

/** The saved cache is stamped with whose data it is (src/data/deviceScope.ts), and only restored for them. */
const persister: Persister = {
  persistClient: (c) => storagePersister.persistClient({ ...c, owner: dataOwner() } as OwnedClient),
  restoreClient: async () => {
    const saved = (await storagePersister.restoreClient()) as OwnedClient | undefined;
    if (!saved) return undefined;
    if (saved.owner != null && saved.owner === dataOwner()) return saved;
    storagePersister.removeClient();
    return undefined;
  },
  removeClient: storagePersister.removeClient,
};

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, buster: CACHE_BUSTER, maxAge: 1000 * 60 * 60 * 24 * 7 }}
      onSuccess={() => queryClient.resumePausedMutations().then(() => queryClient.invalidateQueries())}>
      {children}
    </PersistQueryClientProvider>
  );
}

/**
 * Drop everything cached, and changes waiting to sync, for the previous person. With `refetchActive` (someone new
 * is signed in), screens still showing go back to loading and fetch again as them.
 */
export function clearQueryCache(opts?: { refetchActive?: boolean }) {
  queryClient.getMutationCache().clear();
  if (opts?.refetchActive) {
    queryClient.removeQueries({ type: 'inactive' });
    void queryClient.resetQueries({ type: 'active' });
  } else {
    queryClient.clear();
  }
  try {
    globalThis.localStorage?.removeItem(CACHE_KEY);
  } catch {
    /* storage unavailable */
  }
}

/**
 * useQuery for what screens show. Offline, or while the app isn't answering, a load with nothing saved on this device
 * waits; it then reports "not saved on this phone yet" as its error (src/data/waiting.ts), so screens say so instead
 * of an empty or "not found" state.
 */
export function useSavedQuery<TQueryFnData, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
  options: UseQueryOptions<TQueryFnData, Error, TData, TQueryKey>,
): UseQueryResult<TData, Error> {
  return reportWaiting(useQuery(options));
}

/** Can the app be reached right now (device online and the server answering)? Changes made while not are queued. */
export function useIsOnline() {
  const [online, setOnline] = useState(onlineManager.isOnline());
  useEffect(() => onlineManager.subscribe(setOnline), []);
  return online;
}

/** Number of changes waiting to sync (paused while offline). */
export function useQueuedChanges() {
  const paused = useMutationState({ filters: { predicate: (m) => m.state.isPaused } });
  const running = useIsMutating();
  return { queued: paused.length, syncing: running > 0 };
}
