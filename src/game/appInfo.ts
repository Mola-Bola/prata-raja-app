// The app's side of the game's "which build is this?" facts. The game runs in a DOM component (a WebView on Android) that
// cannot read Expo's native modules, so the app measures these once and passes them down as a plain prop:
// <GameRoot info={appInfo()} />. Feedback notes and analytics both carry them. Import this file from the app side only
// (src/app/play.tsx); the game imports just the AppInfo type.
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { currentUpdateId, runtimeVersion } from '@/features/feedback/updates';

export type AppInfo = {
  /** app.json version (the same value as feedback.app_version in the rest of the app). */
  version: string | null;
  /** The OTA update the phone runs ('built-in' for the APK's own bundle); null on web. */
  updateId: string | null;
  runtime: string | null;
  /** 'web' or 'android 14', like the rest of the app's notes. */
  platform: string;
  /** Phone make and model, or the browser's user agent on web. */
  device: string | null;
};

export function appInfo(): AppInfo {
  const web = Platform.OS === 'web';
  return {
    version: Constants.expoConfig?.version ?? null,
    updateId: currentUpdateId(),
    runtime: runtimeVersion(),
    platform: web ? 'web' : `${Platform.OS} ${Platform.Version}`,
    device: web ? (globalThis.navigator?.userAgent?.slice(0, 120) ?? null) : ([Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || null),
  };
}
