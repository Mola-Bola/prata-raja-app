import { useEffect, useState } from 'react';

/** One number format for the whole overlay: 1,234 (never 1234), so a long coin count scans the same everywhere. */
export const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');

const reduced = (): boolean => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A number that ticks from 0 up to `to` once when it appears (a run's payout). Reduced motion: it is simply the number. */
export function useCountUp(to: number, ms = 800, delay = 150): number {
  const [n, setN] = useState(() => (reduced() ? to : 0));
  useEffect(() => {
    if (reduced() || to <= 0) return setN(to);
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / ms));
      setN(Math.round(to * (1 - (1 - k) ** 3))); // ease-out
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, delay]);
  return n;
}
