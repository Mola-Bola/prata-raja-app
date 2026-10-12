// The phone's side of the game bridge (Android and iOS). The web twin is bridge.web.ts. Both are passed to GameRoot as
// props, so each function runs in the app's own JS, never inside the game's WebView.
import * as Haptics from 'expo-haptics';
import Storage from 'expo-sqlite/kv-store';

import type { Bridge } from './bridgeTypes';

/** The same SQLite key-value store holds the sign-in session, so the game keeps to its own prefix. */
const NS = 'game:';
const IMPACT = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
} as const;

export const bridge: Bridge = {
  haptic: async (kind) => {
    if (kind === 'success') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else await Haptics.impactAsync(IMPACT[kind]);
  },
  save: (key, json) => Storage.setItem(NS + key, json),
  load: (key) => Storage.getItem(NS + key),
  // ponytail: dev log only; point it at the real analytics sink when the game has one.
  track: async (event, props) => {
    if (__DEV__) console.log('[track]', event, JSON.stringify(props));
  },
};
