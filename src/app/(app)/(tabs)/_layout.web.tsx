import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { TAB_LABELS, useAppTheme, useTabBackTitle } from '@/ui';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const icon = (name: IconName, active: IconName) =>
  function TabIcon({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <MaterialCommunityIcons name={focused ? active : name} color={color as string} size={size} />;
  };

/** Web tab bar (native tabs have no web equivalent). Same routes and labels as the native layout. */
export default function TabsLayoutWeb() {
  const theme = useAppTheme();
  useTabBackTitle();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.coralDeep,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        // Tall enough for the icon plus a full label line; a shorter bar clips the descenders ("Home", "Settings").
        // A 2dp line on top and heavy labels, as in the Sunday market look.
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant, borderTopWidth: 2, height: 76, paddingTop: 8, paddingBottom: 12 },
        tabBarLabelStyle: { fontSize: 13, lineHeight: 18, fontFamily: theme.fonts.bodyMedium.fontFamily, fontWeight: theme.fonts.bodyMedium.fontWeight, flexShrink: 0 },
      }}>
      {/* One Screen per tab, in the same order as _layout.tsx. */}
      <Tabs.Screen name="index" options={{ title: TAB_LABELS.home, tabBarIcon: icon('home-outline', 'home'), tabBarButtonTestID: 'tab-home' }} />
      <Tabs.Screen name="me" options={{ title: TAB_LABELS.me, tabBarIcon: icon('account-circle-outline', 'account-circle'), tabBarButtonTestID: 'tab-me' }} />
    </Tabs>
  );
}
