// App-wide accessibility defaults.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useNavigationContainerRef, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { APP_NAME, TAB_LABELS } from './labels';

// Icon fonts draw their glyphs as text, so screen readers read them out ("󰑑 Add note", "󰀝 󰀝 Home").
// Icons are decoration here: buttons carry their own words or an accessibilityLabel.
const Icon = MaterialCommunityIcons as unknown as { defaultProps?: Record<string, unknown> };
Icon.defaultProps = { ...Icon.defaultProps, 'aria-hidden': true };

/** Web: name the browser tab after the screen ("Settings · <app name>"), not just the app name everywhere. */
export function useDocumentTitle() {
  const nav = useNavigationContainerRef();
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const set = (options?: object) => {
      const title = (options as { title?: unknown } | undefined)?.title;
      document.title = typeof title === 'string' && title && title !== APP_NAME ? `${title} · ${APP_NAME}` : APP_NAME;
    };
    if (nav.isReady()) set(nav.getCurrentOptions());
    const offOptions = nav.addListener('options', (e) => set(e.data.options));
    const offState = nav.addListener('state', () => set(nav.getCurrentOptions()));
    return () => {
      offOptions();
      offState();
    };
  }, [nav]);
}

/** Title of each tab route, as its tab bar and Back buttons name it. */
export const TAB_TITLE: Record<string, string> = {
  index: TAB_LABELS.home,
  me: TAB_LABELS.me,
};

/**
 * Tabs layouts call this: while a tab is showing, the tabs route takes that tab's title, so a screen opened from it
 * names its Back button after where it goes ("Me, back", not "Home, back"). Screen options can't work the tab out
 * themselves (a route's nested state isn't given to them), and a tab's focus event doesn't fire on a first load.
 */
export function useTabBackTitle() {
  const navigation = useNavigation();
  const segments = useSegments() as string[];
  // e.g. ['(app)', '(tabs)', 'me']; Home, the index, may have no segment of its own. null while a screen is on top.
  const at = segments.indexOf('(tabs)');
  const tab = at < 0 ? null : (segments[at + 1] ?? 'index');
  useEffect(() => {
    if (tab) navigation.setOptions({ title: TAB_TITLE[tab] ?? TAB_LABELS.home });
  }, [navigation, tab]);
}
