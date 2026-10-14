import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { PaperProvider, Portal, Text } from 'react-native-paper';
import { en, registerTranslation } from 'react-native-paper-dates';

import { AuthProvider, isOwnerEmail, OWNER_HASHES, QueryProvider, useAppConfig, useAuth } from '@/data';
import { APP_NAME, AppRoot, BigButton, buildTheme, ConfirmProvider, EmptyState, LARGE_TEXT, navTheme, setInputFontSize, StartupScreen, stackScreenOptions, TAB_LABELS, ToastProvider, useAppFonts, useAppTheme, useDocumentTitle, webHeaderBack } from '@/ui';
import { useLargeText } from '@/features/settings/largeText';
import { FeedbackHost } from '@/features/feedback/FeedbackHost';
import { useLaunchIntoGame } from '@/features/links/useLaunchIntoGame';
import { useOpenPasswordReset } from '@/features/links/useOpenPasswordReset';
import { useReturnAfterSignIn } from '@/features/links/useReturnAfterSignIn';
import { useStartupLink } from '@/features/links/useStartupLink';
import { registerServiceWorker } from '@/features/offline/registerServiceWorker';

import { installChunkRecovery } from '@/features/offline/chunkRecovery';

installChunkRecovery();
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

/** The sign-in wall is on only when an owner list is built in, so a build without one stays playable as before. */
const WALL = OWNER_HASHES.length > 0;

function RootStack() {
  const { session, loading, email, isAnonymous, signOut } = useAuth();
  // Owner allow-list (src/data/owner.ts): null while the signed-in email is being checked. A guest has no email, so never passes a list.
  const who = session ? `${session.user.id}:${isAnonymous ? '' : email}` : null;
  const [checked, setChecked] = useState<{ who: string; ok: boolean } | null>(null);
  const owner = checked && checked.who === who ? checked.ok : null;
  useEffect(() => {
    if (!who) return;
    let live = true;
    void isOwnerEmail(isAnonymous ? null : email).then((ok) => live && setChecked({ who, ok }));
    return () => { live = false; };
  }, [who, email, isAnonymous]);
  const theme = useAppTheme();
  const config = useAppConfig();
  const min = config.data?.min_client_version;
  const mine = Constants.expoConfig?.version ?? '1.0.0';
  const tooOld = !!min && olderThan(mine, min);
  // Before useStartupLink, which forgets the link Android opened the app with once it has used it.
  useReturnAfterSignIn(!loading && !tooOld, !!session);
  useLaunchIntoGame(!loading && !tooOld && (!WALL || (!!session && owner === true))); // opens the game from the bare start page (once signed in when the wall is on)
  useDocumentTitle();
  useStartupLink(!loading && !tooOld);
  useOpenPasswordReset(!loading && !tooOld, !!session);

  // RootLayout draws nothing until the fonts are ready, so the phone's splash can go as soon as this is drawn: while
  // sign-in settles the coral start-up screen takes over (never a delay added to show it).
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (loading || (!!session && owner === null)) return <StartupScreen />;

  if (session && owner === false) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState emoji="🔒" title="This kitchen is private" body="This account isn’t on the list. Sign out and use the owner’s account." />
        <View style={{ alignItems: 'center', padding: 24 }}>
          <BigButton onPress={() => void signOut()} testID="private-signout">Sign out</BigButton>
        </View>
      </View>
    );
  }

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
      <Stack.Protected guard={!WALL || !!session}>
        {/* The game: full screen, behind the sign-in wall (and the owner list) once EXPO_PUBLIC_OWNER_EMAIL_SHA256 is set. */}
        <Stack.Screen name="play" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        {/* Named for the Back button of a screen stacked over it: "Home, back". */}
        <Stack.Screen name="(app)" options={{ title: TAB_LABELS.home }} />
      </Stack.Protected>
      <Stack.Screen name="reset-password" options={{ headerShown: true, title: 'New password' }} />
    </Stack>
  );
}
