import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { TAB_LABELS, useAppTheme, useTabBackTitle } from '@/ui';

/** Native tab bar: Material 3 bottom navigation on Android, UITabBar on iOS. Web uses _layout.web.tsx. */
export default function TabsLayout() {
  const theme = useAppTheme();
  useTabBackTitle();
  const tabLabel = theme.fonts.bodyMedium;
  return (
    <NativeTabs
      backgroundColor={theme.colors.surface}
      indicatorColor={theme.colors.secondaryContainer}
      iconColor={{ default: theme.colors.onSurfaceVariant, selected: theme.colors.coralDeep }}
      // Heavier labels: the picked tab is coral, the others muted.
      labelStyle={{
        default: { color: theme.colors.onSurfaceVariant, fontFamily: tabLabel.fontFamily, fontWeight: tabLabel.fontWeight, fontSize: 13 },
        selected: { color: theme.colors.coralDeep, fontFamily: tabLabel.fontFamily, fontWeight: tabLabel.fontWeight, fontSize: 13 },
      }}
      tintColor={theme.colors.coralDeep}
      labelVisibilityMode="labeled">
      {/* One Trigger per tab; `name` is the route file in this folder. Add a TAB_LABELS entry (src/ui/labels.ts) and a
          TAB_TITLE entry (src/ui/a11y.ts) for each, and the same tab in _layout.web.tsx. */}
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{TAB_LABELS.home}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="me">
        <NativeTabs.Trigger.Label>{TAB_LABELS.me}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.circle', selected: 'person.circle.fill' }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
