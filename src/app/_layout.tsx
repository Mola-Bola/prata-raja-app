import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';
import { PaperProvider, Portal, Text } from 'react-native-paper';
import { en, registerTranslation } from 'react-native-paper-dates';

import { AuthProvider, QueryProvider, useAppConfig, useAuth } from '@/data';
import { APP_NAME, AppRoot, buildTheme, ConfirmProvider, EmptyState, LARGE_TEXT, navTheme, setInputFontSize, StartupScreen, stackScreenOptions, TAB_LABELS, ToastProvider, useAppFonts, useAppTheme, useDocumentTitle, webHeaderBack } from '@/ui';
import { useLargeText } from '@/features/settings/largeText';
import { FeedbackHost } from '@/features/feedback/FeedbackHost';
import { useLaunchIntoGame } from '@/features/links/useLaunchIntoGame';
import { useOpenPasswordReset } from '@/features/links/useOpenPasswordReset';
import { useReturnAfterSignIn } from '@/features/links/useReturnAfterSignIn';
import { useStartupLink } from '@/features/links/useStartupLink';
import { registerServiceWorker } from '@/features/offline/registerServiceWorker';

registerTranslation('en', en);
SplashScreen.preventAutoHideAsync().catch(() => {});
registerServiceWorker(); // web: opens with no connection

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  // Fredoka and Nunito load here, once. The splash stays up until they have (or failed, or took too long): then the
  // system font is used and the app still works.
  const fonts = useAppFonts();
  const large = useLargeText();
  const theme = buildTheme(isDark, { nunito: fonts.ok, large });
  setInputFontSize(large ? Math.round(16 * LARGE_TEXT) : null);
  if (!fonts.ready) return null;
  return (
    <QueryProvider>
      <PaperProvider theme={theme} settings={{ icon: (p) => <MaterialCommunityIcons {...(p as React.ComponentProps<typeof MaterialCommunityIcons>)} /> }}>
        <ThemeProvider value={navTheme(theme, isDark)}>
          <AuthProvider>
            <ToastProvider>
              <ConfirmProvider>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                {/* Sheets and menus portal here, inside the auth/toast/confirm providers; toasts and
                    confirm dialogs portal to PaperProvider's outer host, so they appear above sheets. */}
                <Portal.Host>
                  <AppRoot>
                    <RootStack />
                    {/* Floating "Tell …" handle + sheet + update banner, on every signed-in screen. */}
                    <FeedbackHost />
                  </AppRoot>
                </Portal.Host>
              </ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </PaperProvider>
    </QueryProvider>
  );
}

const semver = (v: string) => v.split('.').map((n) => parseInt(n, 10) || 0);
const olderThan = (a: string, b: string) => {
  const [x, y] = [semver(a), semver(b)];
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0);
  return false;
};

function RootStack() {
  const { session, loading } = useAuth();
  const theme = useAppTheme();
  const config = useAppConfig();
  const min = config.data?.min_client_version;
  const mine = Constants.expoConfig?.version ?? '1.0.0';
  const tooOld = !!min && olderThan(mine, min);
  // Before useStartupLink, which forgets the link Android opened the app with once it has used it.
  useReturnAfterSignIn(!loading && !tooOld, !!session);
  useLaunchIntoGame(!loading && !tooOld); // opens the game from the bare start page (signed in or not)
  useDocumentTitle();
  useStartupLink(!loading && !tooOld);
  useOpenPasswordReset(!loading && !tooOld, !!session);

  // RootLayout draws nothing until the fonts are ready, so the phone's splash can go as soon as this is drawn: while
  // sign-in settles the coral start-up screen takes over (never a delay added to show it).
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (loading) return <StartupScreen />;

  if (tooOld) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState emoji="⬆️" title={`Please update ${APP_NAME}`} body={`This version (${mine}) is too old. Update to ${min} or later to keep going.`} />
        <Text style={{ textAlign: 'center' }}>Reload the web page, or install the latest app build.</Text>
      </View>
    );
  }

  return (
    // The screens here that show a header (sign in, new password) look like the rest of the app's.
    <Stack screenOptions={{ ...stackScreenOptions(theme), headerShown: false, ...webHeaderBack }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="sign-in" options={{ headerShown: true, title: 'Sign in' }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        {/* Named for the Back button of a screen stacked over it: "Home, back". */}
        <Stack.Screen name="(app)" options={{ title: TAB_LABELS.home }} />
      </Stack.Protected>
      <Stack.Screen name="reset-password" options={{ headerShown: true, title: 'New password' }} />
      {/* The game: full screen, and open to everyone (no account needed to play). Not inside either guard above. */}
      <Stack.Screen name="play" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
    </Stack>
  );
}
