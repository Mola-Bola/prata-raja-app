import { Children, cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode, type RefObject, useSyncExternalStore } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BigButton } from './BigButton';
import { OfflineBanner } from './chrome';
import { KeyboardSafeView, useKeyboardTop } from './keyboard';
import { MAX_WIDTH, space } from './theme';
import { useAppTheme } from './useAppTheme';

type ScreenProps = {
  children: ReactNode;
  /** Scrollable content (default). Set false for lists that scroll themselves. */
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Sticky bottom area for the main action, e.g. a Save button. */
  footer?: ReactNode;
  padded?: boolean;
  /** Tab screens have no native header; pass the header here so it sits under the status bar. */
  header?: ReactNode;
  style?: ViewStyle;
  testID?: string;
  /** The page's ScrollView, for screens that jump to a part of themselves (e.g. "Review the list"). */
  scrollRef?: RefObject<ScrollView | null>;
};

// Width of the tab docked on the right edge of every screen (the feedback tab), 0 when it isn't showing.
let edgeTab = 0;
const edgeListeners = new Set<() => void>();
const getEdgeTab = () => edgeTab;
const subscribeEdgeTab = (l: () => void) => {
  edgeListeners.add(l);
  return () => {
    edgeListeners.delete(l);
  };
};

/** Something docked on the right edge (src/features/feedback/FeedbackHost.tsx) says how wide it is, so screens
 *  keep their buttons and fields out from under it. */
export function setRightEdgeTab(width: number) {
  if (edgeTab === width) return;
  edgeTab = width;
  edgeListeners.forEach((l) => l());
}

/** Extra right padding so content clears the edge tab. Only on screens narrow enough for content to reach it. */
function useEdgeGutter(padded: boolean) {
  const tab = useSyncExternalStore(subscribeEdgeTab, getEdgeTab, getEdgeTab);
  const { width } = useWindowDimensions();
  if (!tab) return 0;
  const margin = Math.max(0, (width - MAX_WIDTH) / 2) + (padded ? space.lg : 0);
  return Math.max(0, tab - margin);
}

type PaperButtonProps = React.ComponentProps<typeof Button>;

/**
 * The footer's buttons become the chunky ones: a filled Paper Button is the leaf BigButton, an outlined or tonal one is
 * the ghost, so every screen's "next step" looks the same without each screen changing. Anything else (text buttons,
 * other layouts) is left alone; a row's children (Back + Next) are done one by one.
 */
function chunky(node: ReactNode): ReactNode {
  if (!isValidElement(node)) return node;
  const el = node as ReactElement<PaperButtonProps & { children?: ReactNode }>;
  if (el.type === Button) {
    const p = el.props;
    const tone = p.mode === 'contained' ? 'go' : p.mode === 'outlined' || p.mode === 'contained-tonal' ? 'ghost' : null;
    if (!tone || (p.icon != null && typeof p.icon !== 'string')) return node;
    return (
      <BigButton
        tone={tone}
        icon={p.icon as string | undefined}
        loading={p.loading}
        disabled={p.disabled}
        onPress={p.onPress ? () => (p.onPress as () => void)() : undefined}
        style={p.style as ViewStyle | undefined}
        testID={p.testID}
        accessibilityLabel={p.accessibilityLabel}
        accessibilityHint={p.accessibilityHint}
        large>
        {p.children}
      </BigButton>
    );
  }
  if (el.type === View || el.type === Fragment) {
    const kids = el.props.children;
    if (kids == null) return node;
    return cloneElement(el, undefined, ...Children.toArray(kids).map(chunky));
  }
  return node;
}

/** Standard page: themed background, safe areas, centred max width on web, pull to refresh, offline banner. */
export function Screen({ children, scroll = true, refreshing, onRefresh, footer, padded = true, header, style, testID, scrollRef }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const gutter = useEdgeGutter(padded);
  // Same room on both sides, so the page stays centred while the tab is showing.
  const clear = gutter ? { paddingLeft: (padded ? space.lg : 0) + gutter, paddingRight: (padded ? space.lg : 0) + gutter } : null;
  // Android: the keyboard covers the bottom of the screen, so the page ends above it (the footer's Save button too)
  // and the field you're typing in scrolls into view.
  const keyboardTop = useKeyboardTop();
  const bottomInset = Platform.OS === 'android' && keyboardTop != null ? 0 : insets.bottom;
  const body = <View style={[styles.inner, padded && styles.padded, clear, style]}>{children}</View>;
  return (
    <KeyboardAvoidingView
      testID={testID}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <KeyboardSafeView>
        {header}
        <OfflineBanner />
        {scroll ? (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: (footer ? 16 : 32) + (footer ? 0 : bottomInset) }}
            keyboardShouldPersistTaps="handled"
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} /> : undefined}>
            {body}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{body}</View>
        )}
        {footer ? (
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(bottomInset, space.md), backgroundColor: theme.colors.background, borderTopColor: theme.colors.outlineVariant },
            ]}>
            <View style={[styles.inner, styles.padded, gutter ? { paddingLeft: space.lg + gutter, paddingRight: space.lg + gutter } : null]}>{chunky(footer)}</View>
          </View>
        ) : null}
      </KeyboardSafeView>
    </KeyboardAvoidingView>
  );
}

/** Large page title for tab screens (they have no native header). */
export function AppHeader({ title, subtitle, right, above }: { title: string; subtitle?: string; right?: ReactNode; /** A small line above the title (Home's wordmark). */ above?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  return (
    <View style={{ paddingTop: insets.top + space.sm, backgroundColor: theme.colors.background }}>
      <View style={[styles.inner, styles.padded, styles.headerRow]}>
        <View style={{ flex: 1 }}>
          {above}
          <Text variant="headlineMedium" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  padded: { paddingHorizontal: space.lg },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: space.sm, gap: space.sm },
});
