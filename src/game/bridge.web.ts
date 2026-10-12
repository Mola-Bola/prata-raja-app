// The browser's side of the game bridge: localStorage, navigator.vibrate (Android Chrome; iOS Safari has none), and a
// console line for analytics. Same shape as bridge.ts (the phone's), which Metro picks on Android and iOS.
import type { Bridge, HapticKind } from './bridgeTypes';

const NS = 'game:';
const BUZZ: Record<HapticKind, number | number[]> = { light: 8, medium: 16, heavy: 32, success: [0, 12, 70, 20] };

export const bridge: Bridge = {
  haptic: async (kind) => {
    navigator.vibrate?.(BUZZ[kind]);
  },
  save: async (key, json) => localStorage.setItem(NS + key, json),
  load: async (key) => localStorage.getItem(NS + key),
  track: async (event, props) => console.log('[track]', event, JSON.stringify(props)),
};
