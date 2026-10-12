import type { UseQueryResult } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';

import { brandWords } from '../../brand';
import { setDeviceOnline, setServerDown } from '../connection';
import { friendlyLoadError } from '../errors';
import { isWaitingForData, reportWaiting } from '../waiting';

afterEach(() => {
  setDeviceOnline(true);
  setServerDown(false);
});

// The shape TanStack Query gives a screen (only the parts that matter here).
const result = (over: Partial<UseQueryResult<string[], Error>>) =>
  ({
    data: undefined,
    error: null,
    status: 'pending',
    fetchStatus: 'idle',
    isPending: true,
    isLoading: false,
    isError: false,
    isSuccess: false,
    isLoadingError: false,
    isPaused: false,
    ...over,
  }) as UseQueryResult<string[], Error>;

describe('a load waiting for the server with nothing saved on this device', () => {
  const waiting = () => result({ fetchStatus: 'paused', isPaused: true });

  it('is spotted (offline, or the server isn’t answering: TanStack pauses it with no data and no error)', () => {
    expect(isWaitingForData(waiting())).toBe(true);
  });

  it('reports it as an error, so screens say so instead of an empty state (“All square”, “all caught up”)', () => {
    setDeviceOnline(false);
    const q = reportWaiting(waiting());
    expect(q.error?.message).toMatch(/offline/);
    expect(q.error?.message).toMatch(/isn’t saved on this phone yet/);
    expect(q.isError).toBe(true);
    expect(q.isLoading).toBe(false);
    expect(q.data).toBeUndefined();
  });

  it('says the app can’t be reached when the device is online but the server isn’t answering', () => {
    setServerDown(true);
    expect(reportWaiting(waiting()).error?.message).toContain(`Can’t reach ${brandWords.appName}`);
    expect(friendlyLoadError(reportWaiting(waiting()).error).code).toBe('unreachable');
  });

  it('never says a trip “may have been deleted”, or that nothing is there', () => {
    setDeviceOnline(false);
    const m = friendlyLoadError(reportWaiting(waiting()).error).message;
    expect(m).not.toMatch(/deleted|can’t find|couldn’t find|caught up|square/i);
  });
});

describe('everything else is left as it is', () => {
  it('saved data shown while waiting to refresh', () => {
    const q = result({ data: ['saved'], status: 'success', fetchStatus: 'paused', isPaused: true, isPending: false, isSuccess: true });
    expect(isWaitingForData(q)).toBe(false);
    expect(reportWaiting(q)).toBe(q);
  });

  it('a first load in progress, and a query that isn’t switched on', () => {
    const loading = result({ fetchStatus: 'fetching', isLoading: true });
    expect(reportWaiting(loading)).toBe(loading);
    const off = result({});
    expect(reportWaiting(off)).toBe(off);
  });

  it('a real error', () => {
    const failed = result({ status: 'error', error: new Error('boom'), isError: true, isPending: false });
    expect(reportWaiting(failed)).toBe(failed);
  });
});
