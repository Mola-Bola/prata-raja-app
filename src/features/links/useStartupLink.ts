import * as Linking from 'expo-linking';
import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { startupLinkPath } from '@/domain';

/**
 * Android: a link (e.g. a reminder) opened while the app is still starting reaches the app before the router listens,
 * so it's dropped and the app stays on Welcome. expo-linking records every link the app receives; once the navigator
 * is up (`ready`), open the recorded one unless it's already showing.
 */
export function useStartupLink(ready: boolean) {
  const pathname = usePathname();
  useEffect(() => {
    if (Platform.OS !== 'android' || !ready) return;
    const to = startupLinkPath(Linking.getLinkingURL(), pathname);
    Linking.clearInitialURL();
    if (to) router.navigate(to);
    // From here on the router gets links itself; forget each one so a JS restart (after an update) can't replay it.
    const sub = Linking.addEventListener('url', () => Linking.clearInitialURL());
    return () => sub.remove();
    // Once, when the navigator first mounts; `pathname` is only read to skip the screen already showing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
}
