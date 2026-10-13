import { afterEach, expect, it, vi } from 'vitest';
import { installChunkRecovery, isChunkFailure, recoverChunk } from '../chunkRecovery';

afterEach(() => vi.unstubAllGlobals());

it('reloads a stale chunk once per session, and ignores unrelated errors', () => {
  const storage = new Map<string, string>();
  const reload = vi.fn();
  vi.stubGlobal('window', { sessionStorage: { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) }, location: { reload } });
  recoverChunk(new Error('ordinary application bug'));
  expect(reload).not.toHaveBeenCalled();
  const error = new Error('Could not load GameRoot-123.js');
  error.name = 'AsyncRequireError';
  recoverChunk(error);
  recoverChunk(error);
  expect(reload).toHaveBeenCalledTimes(1);
  expect(isChunkFailure('Failed to fetch dynamically imported module')).toBe(true);
});

it('never loops when session storage is blocked', () => {
  const reload = vi.fn();
  vi.stubGlobal('window', { sessionStorage: { getItem: () => { throw new Error('blocked'); } }, location: { reload } });
  recoverChunk('ChunkLoadError');
  expect(reload).not.toHaveBeenCalled();
});

it('is inert in a native runtime with a window alias but no browser event API', () => {
  vi.stubGlobal('window', {});
  expect(() => installChunkRecovery()).not.toThrow();
  expect(() => recoverChunk('AsyncRequireError')).not.toThrow();
});
