/** Web (production builds): lets the app open with no connection (public/sw.js). */
export function registerServiceWorker() {
  if (__DEV__ || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
  navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {
    /* not available (private mode, http): the app still works online */
  });
}
