import { router } from 'expo-router';
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Dialog, Icon, Portal, Snackbar, Text } from 'react-native-paper';

import { friendlyError, friendlyLoadError } from '../data/errors';
import { useDialogFocus } from './chrome';
import { Pulse } from './motion';
import { MAX_WIDTH, radius, space } from './theme';
import { useAppTheme } from './useAppTheme';

// ── Toasts ──
type ToastApi = { show: (message: string, action?: { label: string; onPress: () => void }) => void; error: (e: unknown) => void };
const ToastCtx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; action?: { label: string; onPress: () => void }; error?: boolean } | null>(null);
  const theme = useAppTheme();
  const [api] = useState<ToastApi>(() => ({
    show: (text, action) => setMsg({ text, action }),
    error: (e) => setMsg({ text: friendlyError(e).message, error: true }),
  }));
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <Portal>
        <Snackbar
          visible={!!msg}
          onDismiss={() => setMsg(null)}
          duration={msg?.error ? 6000 : msg?.action ? 7000 : 3500}
          action={msg?.action ? { label: msg.action.label, onPress: msg.action.onPress } : { label: 'OK', onPress: () => setMsg(null) }}
          style={msg?.error ? { backgroundColor: theme.colors.errorContainer } : undefined}
          theme={msg?.error ? { colors: { inverseOnSurface: theme.colors.onErrorContainer, inversePrimary: theme.colors.onErrorContainer } } : undefined}>
          {msg?.text}
        </Snackbar>
      </Portal>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const v = useContext(ToastCtx);
  if (!v) throw new Error('useToast outside ToastProvider');
  return v;
}

// ── Confirm dialog ──
type ConfirmOpts = { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean };
const ConfirmCtx = createContext<((o: ConfirmOpts) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});
  const dialog = useRef<View>(null);
  const theme = useAppTheme();
  const confirm = useCallback((o: ConfirmOpts) => {
    setOpts(o);
    return new Promise<boolean>((res) => {
      resolver.current = res;
    });
  }, []);
  const close = (v: boolean) => {
    setOpts(null);
    resolver.current(v);
  };
  // Web: a real modal dialog, like the sheets. Focus moves in and returns after, Escape cancels, and the page (or
  // the sheet it was opened from) can't be reached behind it.
  useDialogFocus(!!opts, dialog, () => close(false));
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Portal>
        <Dialog visible={!!opts} onDismiss={() => close(false)} style={{ maxWidth: 480, alignSelf: 'center', width: '90%' }}>
          <View
            ref={dialog}
            role="alertdialog"
            aria-modal
            aria-labelledby={CONFIRM_TITLE_ID}
            aria-describedby={opts?.message ? CONFIRM_MESSAGE_ID : undefined}
            tabIndex={-1}
            style={styles.dialog}
            testID="confirm-dialog">
            {/* Paper gives the dialog's first child (this View) the top margin its title would have had. */}
            <Dialog.Title nativeID={CONFIRM_TITLE_ID} style={{ marginTop: 0 }}>
              {opts?.title}
            </Dialog.Title>
            {opts?.message ? (
              <Dialog.Content>
                <Text variant="bodyMedium" nativeID={CONFIRM_MESSAGE_ID}>
                  {opts.message}
                </Text>
              </Dialog.Content>
            ) : null}
            <Dialog.Actions>
              <Button onPress={() => close(false)} testID="confirm-cancel">
                {opts?.cancelLabel ?? 'Cancel'}
              </Button>
              <Button
                mode="contained"
                buttonColor={opts?.danger ? theme.colors.error : undefined}
                textColor={opts?.danger ? theme.colors.onError : undefined}
                onPress={() => close(true)}
                testID="confirm-ok">
                {opts?.confirmLabel ?? 'OK'}
              </Button>
            </Dialog.Actions>
          </View>
        </Dialog>
      </Portal>
    </ConfirmCtx.Provider>
  );
}

const CONFIRM_TITLE_ID = 'prata-raja-confirm-title';
const CONFIRM_MESSAGE_ID = 'prata-raja-confirm-message';

export function useConfirm() {
  const v = useContext(ConfirmCtx);
  if (!v) throw new Error('useConfirm outside ConfirmProvider');
  return v;
}

// ── Loading / error / empty ──
/**
 * While a screen loads for the first time: grey shapes where the cards will be (they read as "nearly there", where a
 * spinner reads as "waiting"). With a `label` (something is being done, e.g. "Saving…"): a spinner and
 * the words.
 */
export function LoadingView({ label }: { label?: string }) {
  const theme = useAppTheme();
  if (label) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: space.sm }}>{label}</Text>
      </View>
    );
  }
  const block = { backgroundColor: theme.colors.elevation.level3, borderRadius: radius.sm };
  const card = (key: number, lines: number) => (
    <View key={key} style={[styles.skeletonCard, { backgroundColor: theme.colors.elevation.level1, borderColor: theme.colors.cardBorder }]}>
      <View style={[block, { height: 18, width: '55%' }]} />
      {Array.from({ length: lines }, (_, i) => (
        <View key={i} style={[block, { height: 14, width: i === lines - 1 ? '40%' : '85%' }]} />
      ))}
    </View>
  );
  return (
    <View style={styles.skeleton} accessible accessibilityRole="progressbar" accessibilityLabel="Loading" aria-busy testID="loading">
      <Pulse style={{ gap: space.md }}>
        {card(0, 2)}
        {card(1, 3)}
        {card(2, 1)}
      </Pulse>
    </View>
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const theme = useAppTheme();
  const e = friendlyLoadError(error);
  // Missing, not shared with you, or a broken link: trying again can't help, so offer a way out instead.
  const deadEnd = e.code === 'not_found' || e.code === '42501' || e.code === 'bad_id';
  // Not on this phone yet and waiting for the connection: nothing is wrong, and it loads by itself once back online
  // (so no "Try again" while offline).
  const waiting = e.code === 'offline' || e.code === 'unreachable';
  return (
    <View style={styles.center} accessibilityRole="alert" testID={waiting ? 'not-saved-yet' : undefined}>
      {waiting ? (
        <View style={{ marginBottom: space.sm }}>
          <Icon source={e.code === 'offline' ? 'wifi-off' : 'cloud-off-outline'} size={36} color={theme.colors.onSurfaceVariant} />
        </View>
      ) : null}
      <Text variant="titleMedium" style={{ color: waiting ? theme.colors.onSurface : theme.colors.error, textAlign: 'center', maxWidth: 420 }}>
        {e.message}
      </Text>
      {deadEnd ? (
        <>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: space.sm, maxWidth: 360 }}>
            If someone shared it with you, ask them to send the link again.
          </Text>
          <Button mode="contained" onPress={() => router.replace('/')} style={{ marginTop: space.lg }} testID="error-go-home">
            Go to Home
          </Button>
        </>
      ) : onRetry && e.code !== 'offline' ? (
        <Button onPress={onRetry} style={{ marginTop: space.md }} testID="error-retry">
          Try again
        </Button>
      ) : null}
    </View>
  );
}

export function EmptyState({ emoji = '🧳', title, body, action }: { emoji?: string; title: string; body?: string; action?: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.center, { paddingVertical: space.xxl }]}>
      <Text style={{ fontSize: 44 }}>{emoji}</Text>
      <Text variant="titleMedium" style={{ marginTop: space.sm, textAlign: 'center' }}>
        {title}
      </Text>
      {body ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: space.xs, maxWidth: 360 }}>
          {body}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: space.lg }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Side padding too: some screens show this on its own, outside a padded Screen.
  skeleton: { flexGrow: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', padding: space.lg },
  skeletonCard: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg, gap: space.sm },
  center: { alignItems: 'center', justifyContent: 'center', padding: space.xl, flexGrow: 1 },
  // No focus ring on the dialog box itself (it takes focus only so screen readers announce it). Chrome draws its
  // ring whatever the width while the style is 'auto', so the style has to go too.
  dialog: { outlineWidth: 0, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
});
