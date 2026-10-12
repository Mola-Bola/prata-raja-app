import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_NAME, BigButton, MAX_WIDTH, space, TAGLINE, useAppTheme, Wordmark } from '@/ui';

export default function Welcome() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.page, { backgroundColor: theme.colors.coral, paddingTop: insets.top, paddingBottom: insets.bottom + space.xl }]}>
      <View style={styles.inner}>
        <View style={{ flex: 1, justifyContent: 'center', gap: space.md }}>
          <Wordmark variant="ink" width={220} testID="welcome-wordmark" />
          <Text variant="headlineSmall" style={{ color: theme.colors.onCoral }} accessibilityRole="header">
            {TAGLINE}
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onCoral, marginTop: space.sm }}>
            A few words about what {APP_NAME} does for people. Edit this text in src/app/welcome.tsx.
          </Text>
        </View>
        <View style={{ gap: space.md }}>
          <BigButton large onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'up' } })} testID="welcome-create">
            Create an account
          </BigButton>
          <BigButton tone="ghost" onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'in' } })} testID="welcome-signin">
            I already have an account
          </BigButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  inner: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: space.xl },
});
