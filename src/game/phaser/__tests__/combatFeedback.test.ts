import { describe, expect, it } from 'vitest';
import { FeedbackGate, strongerHaptic } from '../combatFeedback';

describe('combat feedback spacing', () => {
  it('starts immediately, caps mixed bursts, respects larger gaps and resets per run', () => {
    const gate = new FeedbackGate();
    expect(gate.allow(0)).toBe(true);
    expect(gate.allow(250)).toBe(false);
    expect(gate.allow(500, 150)).toBe(false);
    expect(gate.allow(749)).toBe(false);
    expect(gate.allow(750)).toBe(true);
    expect(gate.allow(1500, 1000)).toBe(false);
    expect(gate.allow(1750, 1000)).toBe(true);
    gate.reset();
    expect(gate.allow(1751)).toBe(true);
  });

  it('selects the strongest cue independent of event order', () => {
    expect(strongerHaptic(strongerHaptic(null, 'light'), 'heavy')).toBe('heavy');
    expect(strongerHaptic(strongerHaptic(null, 'heavy'), 'light')).toBe('heavy');
    expect(strongerHaptic('medium', 'light')).toBe('medium');
  });
});
