import { describe, expect, it } from 'vitest';
import { createHub } from '../hub';

describe('hub', () => {
  it('delivers typed events to listeners until they unsubscribe', () => {
    const hub = createHub();
    const seen: number[] = [];
    const off = hub.on('waveStart', ({ wave }) => seen.push(wave));
    hub.emit('waveStart', { wave: 1, waves: 10 });
    off();
    hub.emit('waveStart', { wave: 2, waves: 10 });
    expect(seen).toEqual([1]);
  });

  it('tells the overlay when the renderer held the run by itself', () => {
    const hub = createHub();
    const reasons: string[] = [];
    hub.on('paused', ({ reason }) => reasons.push(reason));
    hub.emit('paused', { reason: 'hidden' });
    expect(reasons).toEqual(['hidden']);
  });
});
