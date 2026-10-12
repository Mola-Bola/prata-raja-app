import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { isStartLink } from '@/domain';

// Web: the address the page was opened with, read before the router can change it.
const LAUNCH_URL = Platform.OS === 'web' ? (globalThis.location?.href ?? null) : null;
const BASE = process.env.EXPO_BASE_URL ?? '';

/**
 * The app opens straight into the game (/play: no account, signed in or not). Only the bare start page goes there, once:
 * a link to any other page, or an email's sign-in link, opens where it points. `replace`, so Back leaves the app.
 * Call it before the hooks that use up the launch link (useStartupLink forgets it).
 */
export function useLaunchIntoGame(ready: boolean) {
  const done = useRef(false);
  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true; // once, when the navigator first mounts
    if (isStartLink(Platform.OS === 'web' ? LAUNCH_URL : Linking.getLinkingURL(), BASE)) router.replace('/play');
  }, [ready]);
}
