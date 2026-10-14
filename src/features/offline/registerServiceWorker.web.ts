/** Web (production builds): lets the app open with no connection (public/sw.js), and offers a newer build when one is live. */
export function registerServiceWorker() {
  if (__DEV__ || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
  navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {
    /* not available (private mode, http): the app still works online */
  });
  watchForNewBuild(base);
}

const ENTRY = /_expo\/static\/js\/web\/(entry-[a-z0-9]+)\.js/;

/** Compares the live page's entry bundle with the one running; when they differ, shows a tap-to-update bar. */
function watchForNewBuild(base: string) {
  const running = Array.from(document.scripts).map((s) => ENTRY.exec(s.src)?.[1]).find(Boolean);
  if (!running) return;
  let shown = false;
  const check = async () => {
    if (shown || document.visibilityState !== 'visible') return;
    try {
      const html = await (await fetch(`${base}/index.html`, { cache: 'no-cache' })).text();
      const live = ENTRY.exec(html)?.[1];
      if (live && live !== running) {
        shown = true;
        showBar();
      }
    } catch {
      /* offline: try again later */
    }
  };
  document.addEventListener('visibilitychange', () => void check());
  setInterval(() => void check(), 5 * 60_000);
}

function showBar() {
  const bar = document.createElement('button');
  bar.type = 'button';
  bar.textContent = 'New version ready · tap to update';
  bar.setAttribute('data-testid', 'new-build-bar');
  Object.assign(bar.style, {
    position: 'fixed', left: '50%', top: 'calc(env(safe-area-inset-top) + 8px)', transform: 'translateX(-50%)', zIndex: '99999',
    padding: '10px 16px', borderRadius: '999px', border: 'none', font: '600 15px Nunito, system-ui, sans-serif',
    background: '#f28c28', color: '#2b1a10', boxShadow: '0 4px 14px rgba(0,0,0,.3)', cursor: 'pointer',
  });
  bar.onclick = () => location.reload();
  document.body.appendChild(bar);
}
