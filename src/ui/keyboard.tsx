// Keeping what you're typing above the on-screen keyboard.
// Android draws apps edge to edge now (SDK 57), so the window no longer shrinks when the keyboard opens: without this
// the keyboard sits on top of the field you're typing in and the Save button. Each screen or sheet measures how much of
// itself the keyboard actually covers (so a phone that does still shrink the window isn't padded twice) and ends above
// it; the field you're in then scrolls into view. iOS screens use KeyboardAvoidingView; on the web the browser moves
// the page itself.
import { type ReactNode, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Dimensions, Keyboard, Platform, View, type ViewStyle } from 'react-native';

/** Where the keyboard's top edge is on the screen (null while it's closed). */
let keyboardTop: number | null = null;
const listeners = new Set<() => void>();
let subscribed = false;

function set(top: number | null) {
  if (top === keyboardTop) return;
  keyboardTop = top;
  listeners.forEach((l) => l());
}

function ensureSubscribed() {
  if (subscribed || Platform.OS === 'web') return;
  subscribed = true;
  const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
  const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
  Keyboard.addListener(show, (e) => {
    const end = e.endCoordinates;
    // Android reports the keyboard's height without the gesture bar under it, so go by its top edge.
    const screen = Dimensions.get('screen').height;
    set(end?.screenY > 0 && end.screenY < screen ? end.screenY : screen - (end?.height ?? 0));
  });
  Keyboard.addListener(hide, () => set(null));
}

const subscribe = (l: () => void) => {
  ensureSubscribed();
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getTop = () => keyboardTop;

/** The keyboard's top edge on the screen, or null while it's closed (always null on the web). */
export function useKeyboardTop(): number | null {
  return useSyncExternalStore(subscribe, getTop, getTop);
}

/** How much of the bottom of the screen the keyboard covers right now (0 when it's closed, and on the web). */
export function useKeyboardHeight(): number {
  const top = useKeyboardTop();
  return top == null ? 0 : Math.max(0, Dimensions.get('screen').height - top);
}

/**
 * Android: a box that ends where the keyboard starts. It measures how much of it the keyboard covers and pads its
 * contents by that much, so a footer's Save button and the field you're typing in stay visible. Elsewhere it's a
 * plain box. `onInset` hears the padding (a sheet shortens its list by it). `fill={false}` for a box sized by its
 * contents (a bottom sheet) rather than one that fills the screen.
 */
export function KeyboardSafeView({ children, style, onInset, fill = true }: { children: ReactNode; style?: ViewStyle; onInset?: (px: number) => void; fill?: boolean }) {
  const top = useKeyboardTop();
  const box = useRef<View>(null);
  const [inset, setInset] = useState(0);
  const ticket = useRef(0);
  const measure = useCallback(() => {
    const mine = ++ticket.current;
    if (Platform.OS !== 'android' || top == null) {
      setInset(0);
      return;
    }
    box.current?.measureInWindow((_x, y, _w, h) => {
      if (mine !== ticket.current) return;
      setInset(Math.max(0, Math.round(y + h - top)));
    });
  }, [top]);
  // Re-measure whenever the keyboard opens, closes or moves (the measurement itself arrives asynchronously).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(measure, [measure]);
  useEffect(() => onInset?.(inset), [inset, onInset]);
  return (
    <View ref={box} collapsable={false} style={[fill && styles.fill, style]} onLayout={top == null ? undefined : measure}>
      <View style={[fill && styles.fill, { paddingBottom: inset }]}>{children}</View>
    </View>
  );
}

const styles = { fill: { flex: 1 } } as const;
