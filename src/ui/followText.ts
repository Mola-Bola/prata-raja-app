// A text box that keeps the words being typed, yet always shows what the screen holds. Pure, so the rule is tested.
//
// Why this exists (owner note c66fc27c): saying "keep 12 kg" set the screen to 12 (the summary read 12) while the kg
// box still read 2.5. A box that holds its own copy of a value must follow the value when it is changed from outside
// (a voice fill, a prefill, a flight number, a chip undone). Changing the copy in React state was not enough: a native
// text box (Android) can keep showing the words typed into it when only its `value` changes, so a followed change also
// bumps `fresh`, and the box is keyed on it: it starts again, showing the new value. Typing never bumps it (the value
// that comes back from the parent is the one the typed words stand for), so the box never loses focus while typing.
import { parseAmount } from '../domain/format';

export type Followed<V> = {
  /** What the box shows. */
  text: string;
  /** The value of the screen the last time this was looked at. */
  last: V;
  /** Changes when the box must start again to show `text`; use as the box's `key`. */
  fresh: number;
};

export const startFollowed = <V>(value: V, show: (v: V) => string): Followed<V> => ({ text: show(value), last: value, fresh: 0 });

/**
 * The screen's value is `value`. If it is not what it was, and the words in the box do not already stand for it,
 * the box takes it on: new text, and a new `fresh`. Otherwise the same object comes back (nothing to do).
 */
export function followOutside<V>(s: Followed<V>, value: V, agrees: (text: string, value: V) => boolean, show: (v: V) => string): Followed<V> {
  if (value === s.last) return s;
  if (agrees(s.text, value)) return { ...s, last: value };
  return { text: show(value), last: value, fresh: s.fresh + 1 };
}

/** The words typed into a number box, as the number they stand for: null when blank or not a number (or not whole, if `integer`). */
export function numberOfText(text: string, integer = false): number | null {
  const p = parseAmount(text);
  if (p === 'invalid' || p == null) return null;
  return integer && !Number.isInteger(p) ? null : p;
}

/** A NumberField: blank or not-a-number hands null up, so null is what those words stand for. */
export const numberFieldAgrees = (integer = false) => (text: string, value: number | null) => numberOfText(text, integer) === value;
export const showNumber = (v: number | null) => (v == null ? '' : String(v));

/**
 * A kg/quantity stepper's box: blank counts as 0 and every typed number goes through `clamp`. Words that are not a
 * number hand nothing up, so they stand for no value at all and any change from outside replaces them.
 */
export const stepperAgrees = (clamp: (v: number) => number) => (text: string, value: number) => {
  const p = parseAmount(text);
  if (p === 'invalid') return false;
  return clamp(p ?? 0) === value;
};
export const showStepper = (v: number) => String(v);
