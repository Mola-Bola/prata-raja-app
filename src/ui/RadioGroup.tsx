import { type ReactNode, useLayoutEffect, useRef } from 'react';
import { Platform, type StyleProp, View, type ViewStyle } from 'react-native';

// ── Pick-one groups, by keyboard too ──
// On the web a radio group is one Tab stop: Tab lands on the picked choice (or the first), the arrow keys move between
// choices and pick them, and Space or Enter picks the one you're on. Phones use the screen reader's own gestures, so
// none of this runs there.
const RADIO = '[role="radio"]';
const radiosOf = (group: HTMLElement) =>
  Array.from(group.querySelectorAll<HTMLElement>(RADIO)).filter((r) => r.closest('[role="radiogroup"]') === group && r.getAttribute('aria-disabled') !== 'true');

/** Only the picked radio (or the first, when none is) is a Tab stop. */
function rove(group: HTMLElement | null) {
  if (!group?.querySelectorAll) return;
  const radios = radiosOf(group);
  const on = radios.find((r) => r.getAttribute('aria-checked') === 'true') ?? radios[0];
  for (const r of radios) r.setAttribute('tabindex', r === on ? '0' : '-1');
}

const NEXT: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

/** A group of radios (OptionRow or PickChips inside). `selectOnArrow={false}` when picking one does something big. */
export function RadioGroup({
  label,
  children,
  style,
  selectOnArrow = true,
  testID,
}: {
  label: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  selectOnArrow?: boolean;
  testID?: string;
}) {
  const ref = useRef<View>(null);
  const web = Platform.OS === 'web';
  // After every render: radios come and go, and which one is picked changes.
  useLayoutEffect(() => {
    if (web) rove(ref.current as unknown as HTMLElement);
  });
  const onKeyDown = (e: { key: string; target: unknown; preventDefault: () => void; stopPropagation: () => void }) => {
    const group = ref.current as unknown as HTMLElement | null;
    const target = e.target as HTMLElement | null;
    if (!group || !target?.matches?.(RADIO) || target.closest('[role="radiogroup"]') !== group) return;
    if (e.key === ' ' || e.key === 'Spacebar') {
      // Enter already presses it; Space would scroll the page.
      e.preventDefault();
      e.stopPropagation();
      target.click();
      return;
    }
    const step = NEXT[e.key];
    if (!step) return;
    e.preventDefault();
    e.stopPropagation();
    const radios = radiosOf(group);
    const to = radios[(radios.indexOf(target) + step + radios.length) % radios.length];
    if (!to) return;
    for (const r of radios) r.setAttribute('tabindex', r === to ? '0' : '-1');
    to.focus();
    if (selectOnArrow) to.click();
  };
  return (
    <View ref={ref} role="radiogroup" aria-label={label} style={style} testID={testID} {...(web ? ({ onKeyDown } as object) : null)}>
      {children}
    </View>
  );
}

