// The chunky button of the Sunday market look: a solid face with a 4dp "lip" under it that the face presses down onto.
// `go` (leaf) is the one thing to tap; `brand` (coral) is for playful capture buttons; `ghost` is the quiet partner
// (a white face with a line round it). At least 54dp tall. Pressing moves it down 3dp and gives a small buzz.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, View, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { haptic } from './haptics';
import { useDepress } from './motion';
import { radius } from './theme';
import { useAppTheme } from './useAppTheme';

export type BigButtonTone = 'go' | 'brand' | 'ghost';

/** Height of the lip under the face. */
export const LIP = 4;
/** How far the face sinks when pressed. */
export const SINK = 3;

export type BigButtonProps = {
  /** The words on it. */
  children: ReactNode;
  onPress?: () => void;
  tone?: BigButtonTone;
  /** A MaterialCommunityIcons name, before the words. */
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  /** Taller (60dp) for the one big "Next" at the foot of a screen. */
  large?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function BigButton({ children, onPress, tone = 'go', icon, loading, disabled, large, style, testID, accessibilityLabel, accessibilityHint }: BigButtonProps) {
  const theme = useAppTheme();
  const { style: sink, press } = useDepress(SINK);
  const c = theme.colors;
  const look = {
    go: { face: c.primary, text: c.onPrimary, lip: c.leafLip, border: undefined },
    brand: { face: c.coral, text: c.onCoral, lip: c.coralLip, border: undefined },
    ghost: { face: c.surface, text: c.onSurface, lip: c.lip, border: c.outlineVariant },
  }[tone];
  // `loading` only shows a spinner (like Paper's Button, which this replaces in screen footers): a press still goes
  // through, so the screen decides what to do with a press while it waits (usually it also sets `disabled`).
  const off = !!disabled;
  return (
    <Pressable
      onPress={() => {
        if (off) return;
        haptic('tap');
        onPress?.();
      }}
      {...(off ? null : press)}
      role="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      aria-disabled={disabled || undefined}
      testID={testID}
      style={[styles.holder, { opacity: disabled ? 0.5 : 1 }, style]}>
      <View style={[styles.lip, { backgroundColor: look.lip }]} />
      <Animated.View
        style={[
          styles.face,
          { backgroundColor: look.face, minHeight: large ? 60 : 54 },
          look.border ? { borderWidth: 2, borderColor: look.border } : null,
          sink,
        ]}>
        {loading ? <ActivityIndicator size="small" color={look.text} /> : icon ? <MaterialCommunityIcons name={icon as never} size={22} color={look.text} /> : null}
        <Text variant="titleMedium" style={{ color: look.text, fontWeight: '900', flexShrink: 1, textAlign: 'center' }}>
          {children}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  holder: { paddingBottom: LIP, justifyContent: 'flex-start' },
  // The lip is a second face, LIP lower than the first: all that shows of it is its bottom edge.
  lip: { position: 'absolute', left: 0, right: 0, top: LIP, bottom: 0, borderRadius: radius.md },
  face: { borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});

/** The + at the corner of a tab: a rounded coral square (66dp) with a 5dp lip, like the chunky buttons. */
export function SquareFab({ icon = 'plus', onPress, accessibilityLabel, testID }: { icon?: string; onPress: () => void; accessibilityLabel: string; testID?: string }) {
  const theme = useAppTheme();
  const { style: sink, press } = useDepress(4);
  return (
    <Pressable
      onPress={() => {
        haptic('tap');
        onPress();
      }}
      {...press}
      role="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={fab.holder}>
      <View style={[fab.lip, { backgroundColor: theme.colors.coralLip }]} />
      <Animated.View style={[fab.face, { backgroundColor: theme.colors.coral }, sink]}>
        <MaterialCommunityIcons name={icon as never} size={36} color={theme.colors.onCoral} />
      </Animated.View>
    </Pressable>
  );
}

const fab = StyleSheet.create({
  holder: { width: 66, height: 71, paddingBottom: 5 },
  lip: { position: 'absolute', left: 0, right: 0, top: 5, bottom: 0, borderRadius: 22 },
  face: { flex: 1, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
