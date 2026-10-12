import { Text } from 'react-native-paper';

import { APP_NAME, AppHeader, Panel, Screen, space, TAB_LABELS, useAppTheme, Wordmark } from '@/ui';

/**
 * The placeholder Home screen: replace everything below the header with your app's first screen. It shows the shared
 * primitives (Screen, AppHeader, Panel) so a new app starts on the baseline look.
 */
export default function Home() {
  const theme = useAppTheme();
  return (
    <Screen header={<AppHeader title={TAB_LABELS.home} above={<Wordmark width={104} testID="home-wordmark" />} />}>
      <Panel style={{ marginTop: space.md }} testID="home-hello">
        <Text variant="headlineSmall">Hello from {APP_NAME}</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          This is the starter’s Home screen. Edit src/app/(app)/(tabs)/index.tsx.
        </Text>
      </Panel>
    </Screen>
  );
}
