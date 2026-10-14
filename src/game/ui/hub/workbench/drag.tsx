// Pointer-based drag and drop for the workbench panels (touch + mouse, no library). A source starts a drag after a small move
// (mouse) or a short hold (touch, so the panel still scrolls); a ghost follows the finger; drop targets are generous (hit box grown
// to at least MIN_HIT px) and light up on hover; a miss snaps the ghost back. useUndo gives every drop a 5 s one-step Undo toast.
import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

import type { Commit } from '../../stall/sheets';
import type { SaveV2 } from '@/meta/types';

export const MIN_HIT = 72;
const reducedMotion = (): boolean => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const HOLD_MS = 180;
const MOVE_PX = 6;
type Pt = { x: number; y: number };
type Ghost = { src: string; at: Pt; back?: Pt };

/** The target whose (grown) box holds the point; the nearest centre wins. Pure, for tests. */
export function pickTarget(point: Pt, boxes: Record<string, { left: number; top: number; width: number; height: number }>, min = MIN_HIT): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const [id, b] of Object.entries(boxes)) {
    const gx = Math.max(0, (min - b.width) / 2), gy = Math.max(0, (min - b.height) / 2);
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    if (Math.abs(point.x - cx) > b.width / 2 + gx || Math.abs(point.y - cy) > b.height / 2 + gy) continue;
    const d = (point.x - cx) ** 2 + (point.y - cy) ** 2;
    if (d < bestD) { best = id; bestD = d; }
  }
  return best;
}

/** `onDrop(payload, targetId)` returns false to refuse (the ghost snaps back). */
export function useDnD<P>(onDrop: (payload: P, target: string) => boolean | void) {
  const [dragging, setDragging] = useState<P | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const targets = useRef(new Map<string, HTMLElement>());
  const drop = useRef(onDrop);
  drop.current = onDrop;
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  const hit = (x: number, y: number) => {
    const boxes: Record<string, DOMRect> = {};
    targets.current.forEach((el, id) => { if (!el.hasAttribute('data-off')) boxes[id] = el.getBoundingClientRect(); });
    return pickTarget({ x, y }, boxes);
  };

  /** Props for a draggable element. `ghostSrc` is the image that follows the finger. */
  const source = (payload: P, ghostSrc: string) => ({
    style: { touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none', cursor: 'grab' } as const,
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || cleanup.current) return;
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const start = { x: e.clientX, y: e.clientY };
      const touch = e.pointerType === 'touch';
      let active = false;
      let last = start;
      const begin = () => {
        active = true;
        setDragging(payload);
        setGhost({ src: ghostSrc, at: last });
        setOver(hit(last.x, last.y));
      };
      const timer = touch ? window.setTimeout(begin, HOLD_MS) : 0;
      const move = (ev: globalThis.PointerEvent) => {
        last = { x: ev.clientX, y: ev.clientY };
        if (!active) {
          if (Math.hypot(last.x - start.x, last.y - start.y) < MOVE_PX) return;
          if (touch) { stop(); return; } // moved before the hold: it is a scroll
          begin();
        }
        setGhost({ src: ghostSrc, at: last });
        setOver(hit(last.x, last.y));
      };
      const block = (ev: TouchEvent) => { if (active && ev.cancelable) ev.preventDefault(); };
      const swallowClick = (ev: MouseEvent) => { ev.stopPropagation(); ev.preventDefault(); };
      const stop = () => {
        window.clearTimeout(timer);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', cancel);
        window.removeEventListener('touchmove', block);
        cleanup.current = null;
      };
      const finish = (ok: boolean) => {
        const was = active;
        stop();
        if (!was) return;
        const target = ok ? hit(last.x, last.y) : null;
        const accepted = target !== null && drop.current(payload, target) !== false;
        setDragging(null);
        setOver(null);
        // The click that follows a drag must not also select the tile.
        el.addEventListener('click', swallowClick, { capture: true, once: true });
        window.setTimeout(() => el.removeEventListener('click', swallowClick, true), 0);
        if (accepted || reducedMotion()) setGhost(null); // a miss glides home, unless the phone asks for reduced motion
        else {
          setGhost({ src: ghostSrc, at: last });
          requestAnimationFrame(() => setGhost({ src: ghostSrc, at: last, back: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } }));
          window.setTimeout(() => setGhost(null), 220);
        }
      };
      const up = () => finish(true);
      const cancel = () => finish(false);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', cancel);
      window.addEventListener('touchmove', block, { passive: false });
      cleanup.current = stop;
    },
  });

  /** Props for a drop target. `off` makes it ignore drops (e.g. nothing to accept). */
  const target = (id: string, off = false) => ({
    ref: (el: HTMLElement | null) => { if (el) targets.current.set(id, el); else targets.current.delete(id); },
    'data-drop': id,
    'data-over': over === id && dragging !== null ? '' : undefined,
    'data-armed': dragging !== null ? '' : undefined,
    'data-off': off ? '' : undefined,
  });

  const ghostEl: ReactNode = ghost && (
    <img className="wb-ghost" data-testid="wb-ghost" src={ghost.src} alt="" aria-hidden="true"
      style={ghost.back ? { left: ghost.back.x, top: ghost.back.y, opacity: 0.2, transition: 'left .2s, top .2s, opacity .2s' } : { left: ghost.at.x, top: ghost.at.y }} />
  );
  return { source, target, dragging, over, ghost: ghostEl };
}

/** One-step undo for the newest drop: remembers the save from before it and restores it with commit. */
export function useUndo(commit: Commit) {
  const [toast, setToast] = useState<{ text: string; prev: SaveV2 } | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  /** Applies `update`; shows the toast only if it changed the save. Returns whether it did. */
  const run = useCallback((text: string, update: (s: SaveV2) => SaveV2): boolean => {
    let prev: SaveV2 | null = null;
    let next: SaveV2 | null = null;
    commit(s => { prev = s; next = update(s); return next; });
    if (!prev || prev === next) return false;
    window.clearTimeout(timer.current);
    setToast({ text, prev });
    timer.current = window.setTimeout(() => setToast(null), 5000);
    return true;
  }, [commit]);
  const undo = () => {
    if (!toast) return;
    const { prev } = toast;
    window.clearTimeout(timer.current);
    commit(() => prev);
    setToast(null);
  };
  const el = toast && (
    <div className="wb-toast" role="status" data-testid="wb-undo">
      <span>{toast.text}</span>
      <button type="button" className="gu-btn" data-testid="wb-undo-btn" onClick={undo}>Undo</button>
    </div>
  );
  return { run, toast: el };
}
