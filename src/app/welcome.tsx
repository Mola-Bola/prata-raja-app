import { router } from 'expo-router';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SIGNUP_OPEN } from '@/data';
import { APP_NAME, BigButton, MAX_WIDTH, space, TAGLINE, useAppTheme } from '@/ui';

// The game's own title art (it carries the logo), so the sign-in door looks like the game rather than the starter kit.
const HERO = require('../../assets/game/scene/hero.webp');

export default function Welcome() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <ImageBackground source={HERO} resizeMode="cover" style={[styles.page, { backgroundColor: theme.colors.coral }]} accessibilityLabel={APP_NAME}>
      <View style={[styles.inner, { paddingTop: insets.top, paddingBottom: insets.bottom + space.xl }]}>
        <View style={{ flex: 1 }} />
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, textAlign: 'center' }} accessibilityRole="header">
            {TAGLINE}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            Sign in so your stall, gear and progress are saved.
          </Text>
          {SIGNUP_OPEN ? (
            <BigButton large onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'up' } })} testID="welcome-create">
              Create an account
            </BigButton>
          ) : null}
          <BigButton tone="ghost" onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'in' } })} testID="welcome-signin">
            I already have an account
          </BigButton>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  inner: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: space.lg },
  card: { borderRadius: 24, padding: space.lg, gap: space.md },
});
