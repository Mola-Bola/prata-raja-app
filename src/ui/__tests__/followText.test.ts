import { describe, expect, it } from 'vitest';

import { followOutside, type Followed, numberFieldAgrees, showNumber, showStepper, startFollowed, stepperAgrees } from '../followText';

const clampKg = (v: number) => Math.round(Math.min(100, Math.max(0, v)) * 100) / 100;
const agrees = stepperAgrees(clampKg);

/** What the box shows after the screen's value moves to each of `values` in turn. */
function shownAfter(start: number, values: number[]) {
  let s = startFollowed(start, showStepper);
  for (const v of values) s = followOutside(s, v, agrees, showStepper);
  return s;
}

describe('a box that holds its own copy follows the screen', () => {
  it('c66fc27c: "keep 12 kg" said while the box reads 2.5 shows 12, and starts afresh', () => {
    const s = startFollowed(2.5, showStepper);
    const next = followOutside(s, 12, agrees, showStepper);
    expect(next.text).toBe('12');
    expect(next.fresh).toBe(s.fresh + 1);
  });

  it('shows the value after any run of outside changes, even back to an earlier one', () => {
    for (const run of [[12], [12, 2.5], [12, 2.5, 12], [0, 34.5, 0.5, 34.5], [5, 5, 6]]) {
      expect(shownAfter(2.5, run).text).toBe(String(run[run.length - 1]));
    }
  });

  it('typing is left alone: the value that comes back is what the words stand for', () => {
    let s: Followed<number> = startFollowed(2.5, showStepper);
    s = { ...s, text: '12' }; // typed
    const next = followOutside(s, 12, agrees, showStepper); // the screen echoes 12
    expect(next.text).toBe('12');
    // The dot typed next is not a number yet: nothing is handed up, the value stays, nothing to follow.
    expect(followOutside({ ...next, text: '12.' }, 12, agrees, showStepper).text).toBe('12.');
    expect(next.fresh).toBe(s.fresh); // no restart, so the keyboard stays up
    expect(next.last).toBe(12);
  });

  it('a blank box stands for 0 and stays blank while typing', () => {
    const s: Followed<number> = { ...startFollowed(5, showStepper), text: '' };
    expect(followOutside(s, 0, agrees, showStepper).text).toBe('');
    expect(followOutside(s, 3, agrees, showStepper).text).toBe('3'); // but a change from outside is shown
  });

  it('words that are not a number stand for nothing, so an outside change replaces them', () => {
    const s: Followed<number> = { ...startFollowed(5, showStepper), text: '1.2.3' };
    expect(followOutside(s, 8, agrees, showStepper).text).toBe('8');
  });

  it('a typed number beyond the limit is clamped by the screen: the box agrees with the clamp', () => {
    const s: Followed<number> = { ...startFollowed(5, showStepper), text: '500' };
    expect(followOutside(s, 100, agrees, showStepper).text).toBe('500'); // until the box is left
    expect(followOutside(s, 40, agrees, showStepper).text).toBe('40');
  });

  it('nothing changed, nothing to do', () => {
    const s = startFollowed(2.5, showStepper);
    expect(followOutside(s, 2.5, agrees, showStepper)).toBe(s);
  });
});

describe('NumberField: blank and not-a-number hand up null', () => {
  const a = numberFieldAgrees();
  const whole = numberFieldAgrees(true);
  it('a prefill replaces what was typed', () => {
    const s: Followed<number | null> = { ...startFollowed<number | null>(null, showNumber), text: '3' };
    expect(followOutside(s, 12.5, a, showNumber).text).toBe('12.5');
  });
  it('emptying the box from outside empties it', () => {
    const s = startFollowed<number | null>(7, showNumber);
    const next = followOutside(s, null, a, showNumber);
    expect(next.text).toBe('');
    expect(next.fresh).toBe(1);
  });
  it('"15a" typed hands up null, which is what the box now stands for', () => {
    const s: Followed<number | null> = { ...startFollowed<number | null>(15, showNumber), text: '15a' };
    expect(followOutside(s, null, a, showNumber).text).toBe('15a');
  });
  it('"12,50" and "1,299" stand for 12.5 and 1299', () => {
    expect(a('12,50', 12.5)).toBe(true);
    expect(a('1,299', 1299)).toBe(true);
  });
  it('whole-number boxes: 2.5 stands for null', () => {
    expect(whole('2.5', null)).toBe(true);
    expect(whole('2', 2)).toBe(true);
  });
});
