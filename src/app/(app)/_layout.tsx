import { Stack } from 'expo-router';

import { stackScreenOptions, TAB_LABELS, useAppTheme, webHeaderBack } from '@/ui';

// Deep links land on top of the tabs, so there's always a way back.
export const unstable_settings = { initialRouteName: '(tabs)' };

/**
 * Signed-in area. Screens set their own titles with <Stack.Screen options={{ title }} />; the titles here are only
 * what shows before a screen sets its own, so a header never reads a raw route name like "feedback/[id]".
 * Add a <Stack.Screen name="…" /> line for each screen you add outside the tabs.
 */
export default function AppLayout() {
  const theme = useAppTheme();
  return (
    <Stack screenOptions={{ ...stackScreenOptions(theme), ...webHeaderBack }}>
      {/* The title names the back button on screens above the tabs ("Me, back", not "(tabs), back"). The tabs
          layout keeps it on the tab in focus (useTabBackTitle); Home until then. */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: TAB_LABELS.home }} />
      <Stack.Screen name="feedback/index" options={{ title: 'My notes' }} />
      <Stack.Screen name="feedback/[id]" options={{ title: 'Your note' }} />
      <Stack.Screen name="whats-new" options={{ title: 'What’s new' }} />
    </Stack>
  );
}
