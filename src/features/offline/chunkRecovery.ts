const KEY = 'chunk-reload-once';

export function isChunkFailure(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return /AsyncRequireError|ChunkLoadError|Loading chunk .* failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(message);
}

/** One attempt per browser session. Storage unavailable means no automatic reload. */
export function recoverChunk(error: unknown): void {
  if (typeof window === 'undefined' || !isChunkFailure(error)) return;
  try {
    if (window.sessionStorage.getItem(KEY)) return;
    window.sessionStorage.setItem(KEY, '1');
  } catch { return; }
  window.location.reload();
}

export function installChunkRecovery(): void {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  window.addEventListener('error', event => recoverChunk(event.error ?? event.message));
  window.addEventListener('unhandledrejection', event => recoverChunk(event.reason));
}
