import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from 'expo-router';
import { type ReactNode, type RefObject, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { type ColorValue, Platform, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { IconButton, Modal, Portal, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsOnline, useQueuedChanges } from '../data/query';
import { useServerDown } from '../data/reachability';
import { KeyboardSafeView, useKeyboardHeight } from './keyboard';
import { APP_NAME } from './labels';
import { Rise } from './motion';
import { MAX_WIDTH, radius, space } from './theme';
import { useAppTheme } from './useAppTheme';

/**
 * Web header Back button: a full 44 × 44 tap target (the stock one is 30 × 30), named after where it goes
 * ("Me, back"). Native keeps the platform's own. Spread into a stack's screenOptions: `...webHeaderBack`.
 */
function HeaderBack({ canGoBack, label, tintColor }: { canGoBack?: boolean; label?: string; tintColor?: ColorValue }) {
  const navigation = useNavigation();
  // Nothing to go back to (e.g. Sign in opened from a link): keep the title off the screen's edge.
  if (!canGoBack) return <View style={{ width: space.md }} />;
  return (
    <IconButton
      icon="arrow-left"
      iconColor={typeof tintColor === 'string' ? tintColor : undefined}
      size={24}
      onPress={() => navigation.goBack()}
      accessibilityLabel={label && label !== 'Back' ? `${label}, back` : 'Go back'}
      style={styles.headerBack}
      testID="header-back"
    />
  );
}
export const webHeaderBack = Platform.OS === 'web' ? { headerLeft: (p: Parameters<typeof HeaderBack>[0]) => <HeaderBack {...p} /> } : {};

export function OfflineBanner() {
  const online = useIsOnline();
  const serverDown = useServerDown();
  const { queued } = useQueuedChanges();
  const theme = useAppTheme();
  const changes = `${queued} change${queued === 1 ? '' : 's'}`;
  const text = serverDown
    ? `Can’t reach ${APP_NAME} · ${queued ? `${changes} will sync` : 'trying again'}`
    : !online
      ? `Offline${queued ? ` · ${changes} will sync` : ' · showing saved data'}`
      : queued
        ? `Syncing ${changes}…`
        : null;
  if (!text) return null;
  const warn = !online || serverDown;
  return (
    <View
      style={[styles.banner, { backgroundColor: warn ? theme.colors.warnContainer : theme.colors.tertiaryContainer }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      testID="offline-banner">
      <Text variant="labelMedium" style={{ color: warn ? theme.colors.onWarnContainer : theme.colors.onTertiaryContainer, textAlign: 'center' }}>
        {text}
      </Text>
    </View>
  );
}

/**
 * THE chip: a sky pill, 44dp to tap. Pick one of a set (filters: a tab), switch something on or off
 * (`kind="toggle"`: a checkbox with a tick) or go somewhere (`kind="button"`). Screen readers hear the
 * role and whether it's selected (Paper's Chip and Button can't say so on web). `strong` fills the selected one with the
 * primary colour (toggles always are). Don't use Paper's Chip.
 */
export function ChoiceChip({
  label,
  selected,
  onPress,
  strong,
  kind = 'tab',
  icon,
  accessibilityLabel,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  strong?: boolean;
  /** `tab` (default): one of a set, a filter. `toggle`: on or off, many can be on; a tick shows when on. `button`: goes somewhere. */
  kind?: 'tab' | 'toggle' | 'button';
  /** A MaterialCommunityIcons name, before the label. */
  icon?: string;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const theme = useAppTheme();
  // Sky pills; the picked one is filled (leaf when `strong` or a toggle, ink otherwise) so it isn't only a tint.
  const leaf = strong || kind === 'toggle';
  const [bg, fg] = !selected
    ? [theme.colors.secondaryContainer, theme.colors.onSecondaryContainer]
    : leaf
      ? [theme.colors.primary, theme.colors.onPrimary]
      : [theme.colors.inverseSurface, theme.colors.inverseOnSurface];
  const glyph = icon ?? (kind === 'toggle' && selected ? 'check' : undefined);
  const roleProps =
    kind === 'toggle'
      ? ({ role: 'checkbox', 'aria-checked': selected, accessibilityState: { checked: selected } } as const)
      : kind === 'button'
        ? ({ role: 'button' } as const)
        : ({ role: 'tab', 'aria-selected': selected, accessibilityState: { selected } } as const);
  return (
    // The pill is 36 tall, the tap area around it 44 (easier to hit, same look).
    <Pressable onPress={onPress} {...roleProps} accessibilityLabel={accessibilityLabel ?? label} testID={testID} style={styles.choiceTap}>
      {({ pressed }) => (
        <View style={[styles.choice, { backgroundColor: bg, opacity: pressed ? 0.8 : 1 }]}>
          {glyph ? <MaterialCommunityIcons name={glyph as never} size={18} color={fg} accessible={false} importantForAccessibility="no" accessibilityElementsHidden /> : null}
          <Text variant="labelLarge" numberOfLines={1} style={{ color: fg, flexShrink: 1 }}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** Wraps the app's screens (src/app/_layout.tsx). While a sheet is open it's made inert on web: no Tab stops or
 *  screen-reader access behind the sheet. Sheets, menus, dialogs and toasts are portalled outside it. */
const APP_ROOT_ID = 'app-root';
export function AppRoot({ children }: { children: ReactNode }) {
  return (
    <View nativeID={APP_ROOT_ID} style={{ flex: 1 }}>
      {children}
    </View>
  );
}

/** Sheets and dialogs open right now, newest last. Escape closes only the top one, and only the top one can be
 *  reached: the app and every layer under the top are inert. */
type Layer = { dismiss: () => void; node: () => HTMLElement | null };
const layers: Layer[] = [];

function syncInert() {
  const app = document.getElementById(APP_ROOT_ID);
  if (layers.length) app?.setAttribute('inert', '');
  else app?.removeAttribute('inert');
  layers.forEach((l, i) => {
    const n = l.node();
    if (i < layers.length - 1) n?.setAttribute('inert', '');
    else n?.removeAttribute('inert');
  });
}

/** Web: a sheet or dialog behaves as a modal dialog. Focus moves into it and comes back after, Escape closes it
 *  (even from a text field inside it), and nothing behind it can be reached. (Native: Paper's Modal already
 *  handles focus and the back button.) Used by Sheet and the confirm dialog (feedback.tsx). */
export function useDialogFocus(visible: boolean, ref: RefObject<View | null>, onDismiss: () => void) {
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || typeof document === 'undefined') return;
    const node = () => ref.current as unknown as HTMLElement | null;
    const previous = document.activeElement as HTMLElement | null;
    const layer: Layer = { dismiss: () => dismissRef.current(), node };
    layers.push(layer);
    syncInert();
    const focusIn = setTimeout(() => node()?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.isComposing || layers[layers.length - 1] !== layer) return;
      // Leave Escape to a picker opened over the sheet (e.g. the date picker, which closes itself).
      const active = document.activeElement;
      if (active && active !== document.body && !node()?.contains(active)) return;
      e.preventDefault();
      e.stopPropagation();
      layer.dismiss();
    };
    // Capture phase: react-native-web's TextInput stops every keydown from bubbling, so a listener on the way
    // back up never hears Escape pressed in a field.
    document.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(focusIn);
      document.removeEventListener('keydown', onKey, true);
      layers.splice(layers.indexOf(layer), 1);
      syncInert();
      if (previous?.isConnected) previous.focus();
    };
  }, [visible, ref]);
}

/**
 * How many times a sheet has opened this session. Sheets are drawn by Paper's Portal, and what mounts later is drawn
 * above what mounted earlier, so something that must stay reachable over a sheet (the Tell … tab) mounts again
 * each time this changes (give it as its `key`). Counts every `Sheet`, so `ActionSheet` and the pickers too.
 */
let sheetOpens = 0;
const sheetListeners = new Set<() => void>();
const noteSheetOpened = () => {
  sheetOpens++;
  sheetListeners.forEach((l) => l());
};
export const useSheetOpens = () =>
  useSyncExternalStore(
    (l) => {
      sheetListeners.add(l);
      return () => sheetListeners.delete(l);
    },
    () => sheetOpens,
    () => 0,
  );

/** Bottom sheet (modal) — used for quick edits like "mark bought". `footer` (e.g. the Save button) stays at the
 *  bottom of the sheet, above the keyboard, while the rest scrolls. */
export function Sheet({ visible, onDismiss, title, children, footer, testID }: { visible: boolean; onDismiss: () => void; title?: string; children: ReactNode; footer?: ReactNode; testID?: string }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const dialog = useRef<View>(null);
  useDialogFocus(visible, dialog, onDismiss);
  useEffect(() => {
    if (visible) noteSheetOpened();
  }, [visible]);
  // Android: the part of the sheet under the keyboard is padding, so what you're typing sits above it; the list gets
  // shorter by the same amount.
  const [androidInset, setAndroidInset] = useState(0);
  // iOS: the sheet is portalled outside the screen's KeyboardAvoidingView, so it lifts itself by the keyboard's height.
  const keyboardHeight = useKeyboardHeight();
  const iosLift = Platform.OS === 'ios' ? keyboardHeight : 0;
  const keyboard = androidInset || iosLift;
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.sheet,
          { backgroundColor: theme.colors.surface, paddingBottom: keyboard ? space.md + iosLift : Math.max(insets.bottom, space.lg) },
        ]}
        style={{ justifyContent: 'flex-end', margin: 0 }}
        testID={testID}>
        <KeyboardSafeView fill={false} onInset={setAndroidInset}>
          {/* The sheet rises into place over about 300 ms (not at all when the phone asks for reduced motion). */}
          <Rise>
            <View ref={dialog} role="dialog" aria-modal aria-label={title} tabIndex={-1} style={styles.dialog} testID={testID ? `${testID}-dialog` : undefined}>
              <View style={[styles.handle, { backgroundColor: theme.colors.dash }]} />
              {title ? (
                <Text variant="titleLarge" role="heading" style={{ marginBottom: space.md }}>
                  {title}
                </Text>
              ) : null}
              {/* Leaves the handle, title and some of the screen behind showing, even on a short phone or in landscape. */}
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: Math.max(160, Math.min(560, height - keyboard - (footer ? 250 : 180))) }}
                contentContainerStyle={{ gap: space.md }}>
                {children}
              </ScrollView>
              {footer ? <View style={[styles.sheetFooter, { borderTopColor: theme.colors.outlineVariant }]}>{footer}</View> : null}
            </View>
          </Rise>
        </KeyboardSafeView>
      </Modal>
    </Portal>
  );
}

/** Share a link via the native share sheet / Web Share; falls back to copying. Returns how it was shared. */
export async function shareLink(url: string, message: string): Promise<'shared' | 'copied'> {
  // A message of several lines puts the link on a line of its own (how it reads best in a chat).
  const joined = `${message}${message.includes('\n') ? '\n' : ' '}${url}`;
  if (Platform.OS === 'web') {
    const nav = globalThis.navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav?.share) {
      try {
        await nav.share({ title: APP_NAME, text: message, url });
        return 'shared';
      } catch {
        /* cancelled or unsupported → copy */
      }
    }
    await Clipboard.setStringAsync(joined);
    return 'copied';
  }
  await Share.share(Platform.OS === 'ios' ? { message, url } : { message: joined });
  return 'shared';
}

export async function copyText(text: string) {
  await Clipboard.setStringAsync(text);
}

const styles = StyleSheet.create({
  banner: { paddingVertical: 6, paddingHorizontal: space.lg },
  headerBack: { width: 44, height: 44, marginVertical: 0, marginLeft: space.xs, marginRight: 0 },
  sheetFooter: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, marginTop: space.sm },
  choiceTap: { minHeight: 44, justifyContent: 'center', maxWidth: '100%' },
  choice: { borderRadius: radius.pill, paddingHorizontal: space.lg, minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.xl,
    paddingTop: space.sm,
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: space.md },
  // No focus ring on the dialog box itself (it takes focus only so screen readers announce it). Chrome draws its
  // ring whatever the width while the style is 'auto', so the style has to go too.
  dialog: { outlineWidth: 0, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
});
