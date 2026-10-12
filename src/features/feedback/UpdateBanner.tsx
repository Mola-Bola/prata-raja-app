import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_NAME, MAX_WIDTH, radius, space, useAppTheme } from '@/ui';

import { applyUpdate, checkAndFetch, currentUpdateId, type NativeLatest, newerNativeBuild, Updates, updatesSupported } from './updates';

const CHECK_EVERY_MS = 5 * 60 * 1000;
const SEEN_KEY = 'prata-raja-last-update-seen';

/**
 * Phones only. Checks the Mac's update server when the app comes to the foreground, then offers:
 * "Update ready → Restart" (over-the-air JS update) or "New app version → Download" (new APK).
 * After restarting onto a new update, offers "What's new" once.
 */
export function UpdateBanner() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [native, setNative] = useState<NativeLatest | null>(null);
  const [whatsNew, setWhatsNew] = useState(() => {
    if (!updatesSupported) return false;
    const id = currentUpdateId();
    try {
      return !!id && id !== 'built-in' && globalThis.localStorage?.getItem(SEEN_KEY) !== id;
    } catch {
      return false;
    }
  });
  const [dismissed, setDismissed] = useState(false);
  const lastCheck = useRef(0);

  useEffect(() => {
    if (!updatesSupported) return;
    const check = async () => {
      if (Date.now() - lastCheck.current < CHECK_EVERY_MS) return;
      lastCheck.current = Date.now();
      if (await checkAndFetch()) setReady(true);
      setNative(await newerNativeBuild());
    };
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);

  // The launch-time automatic check may already have downloaded something (no-op state on web).
  const hook = Updates.useUpdates();
  const pending = ready || (updatesSupported && hook.isUpdatePending);

  if (!updatesSupported || dismissed || (!pending && !native && !whatsNew)) return null;

  const markSeen = () => {
    try {
      const id = currentUpdateId();
      if (id) globalThis.localStorage?.setItem(SEEN_KEY, id);
    } catch {
      /* storage unavailable */
    }
    setWhatsNew(false);
  };

  let text = '';
  let action: { label: string; onPress: () => void; testID: string } | null = null;
  if (native) {
    const apkUrl = native.apkUrl;
    text = apkUrl
      ? `New ${APP_NAME} version ${native.version} is ready to install.`
      : `New ${APP_NAME} version ${native.version}: install it from Google Drive → Claude → ${APP_NAME}.`;
    action = apkUrl ? { label: 'Download', onPress: () => Linking.openURL(apkUrl), testID: 'update-download-apk' } : null;
  } else if (pending) {
    text = 'An update is ready.';
    action = { label: 'Restart', onPress: () => applyUpdate(), testID: 'update-restart' };
  } else if (whatsNew) {
    text = `${APP_NAME} just updated.`;
    action = {
      label: 'What’s new',
      onPress: () => {
        markSeen();
        router.push('/whats-new');
      },
      testID: 'update-whats-new',
    };
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + space.sm }]}>
      <View style={[styles.card, { backgroundColor: theme.colors.inverseSurface }]} testID="update-banner">
        <Text variant="bodyMedium" style={{ color: theme.colors.inverseOnSurface, flex: 1 }}>
          {text}
        </Text>
        {action ? (
          <Button mode="text" textColor={theme.colors.inversePrimary} onPress={action.onPress} testID={action.testID} compact>
            {action.label}
          </Button>
        ) : null}
        <Button
          mode="text"
          compact
          textColor={theme.colors.inverseOnSurface}
          onPress={() => {
            if (whatsNew && !pending && !native) markSeen();
            setDismissed(true);
          }}
          accessibilityLabel="Dismiss">
          ✕
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 30, paddingHorizontal: space.lg },
  card: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    borderRadius: radius.lg,
    paddingLeft: space.lg,
    paddingVertical: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    boxShadow: '0px 3px 10px rgba(0,0,0,0.3)',
  },
});
