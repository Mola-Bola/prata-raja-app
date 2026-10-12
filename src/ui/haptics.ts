// A small buzz to confirm what a finger just did: a tick bought, a step done, something that needs a second look.
// Android uses the phone's vibrator (the app already has the permission), the web uses navigator.vibrate where the
// browser has it (Android Chrome). iOS stays still for now: its plain vibration is one long buzz, too heavy for a tap.
// Use it for moments that matter, not every press.
import { Platform, Vibration } from 'react-native';

export type HapticKind = 'tap' | 'select' | 'success' | 'warning';

const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 8,
  select: 5,
  success: [0, 12, 70, 20],
  warning: [0, 30, 60, 30],
};

let last = 0;

export function haptic(kind: HapticKind = 'tap'): void {
  const now = Date.now();
  if (now - last < 40) return; // a run of quick taps buzzes once, not in a blur
  last = now;
  const pattern = PATTERNS[kind];
  try {
    if (Platform.OS === 'android') Vibration.vibrate(pattern);
    else if (Platform.OS === 'web') (globalThis.navigator as { vibrate?: (p: number | number[]) => boolean } | undefined)?.vibrate?.(pattern);
  } catch {
    // No vibrator, or the browser said no: the moment still happened, just silently.
  }
}
