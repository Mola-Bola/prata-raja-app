// A short celebration for a landmark moment (a goal reached, a list finished):
// a check, a small burst of colour and one plain line, over about 0.9 s. It never takes a tap (pointerEvents none) and
// stays on screen as a still check and line, without the burst, when the phone asks for reduced motion.
// Everyday ticks get `haptic('tap')` only. Each landmark fires once: `useCelebration().fire(key, line)` remembers keys
// (for example `done:<thing id>`) for as long as the app is open.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Portal, Text } from 'react-native-paper';
import Animated, { Easing, interpolate, type SharedValue, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptic } from './haptics';
import { radius, space } from './theme';
import { useAppTheme } from './useAppTheme';

/** How long the whole thing lasts. */
export const CELEBRATE_MS = 900;
const STILL_MS = 1600;
const BURST_MS = 800;
const DOTS = 14;

function Dot({ p, angle, far, color, size }: { p: SharedValue<number>; angle: number; far: number; color: string; size: number }) {
  const style = useAnimatedStyle(() => {
    const d = far * Easing.out(Easing.cubic)(p.value);
    return {
      opacity: interpolate(p.value, [0, 0.08, 0.65, 1], [0, 1, 1, 0]),
      transform: [{ translateX: Math.cos(angle) * d }, { translateY: Math.sin(angle) * d }, { scale: interpolate(p.value, [0, 1], [1, 0.3]) }],
    };
  });
  return <Animated.View style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

/** Reanimated reads "reduce motion" once at start-up; this also follows the phone's setting while the app is open. */
function useReduceMotionNow(): boolean {
  const atStart = useReducedMotion();
  const [now, setNow] = useState(atStart);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => live && setNow(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setNow);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return now || atStart;
}

/** The overlay itself. Mount it when the moment happens (give it a fresh `key` each time) and it removes itself with `onDone`. */
export function Celebrate({ message, onDone }: { message: string; onDone?: () => void }) {
  const theme = useAppTheme();
  const reduce = useReduceMotionNow();
  const p = useSharedValue(0);

  useEffect(() => {
    if (!reduce) p.value = withTiming(1, { duration: BURST_MS, easing: Easing.linear });
    void AccessibilityInfo.announceForAccessibility?.(message);
    const t = setTimeout(() => onDone?.(), reduce ? STILL_MS : CELEBRATE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = useAnimatedStyle(() => (reduce ? { opacity: 1 } : { opacity: interpolate(p.value, [0, 0.12, 0.82, 1], [0, 1, 1, 0]) }));
  const check = useAnimatedStyle(() => (reduce ? {} : { transform: [{ scale: interpolate(p.value, [0, 0.25, 0.42, 1], [0.4, 1.18, 1, 1]) }] }));
  const colors = [theme.colors.primary, theme.colors.success, theme.colors.warn, theme.colors.info, theme.colors.tertiary];

  return (
    <Portal>
      <View pointerEvents="none" style={styles.overlay} testID="celebrate">
        <Animated.View
          role="status"
          accessibilityLiveRegion="polite"
          style={[styles.card, { backgroundColor: theme.colors.elevation.level3, borderColor: theme.colors.outlineVariant }, card]}>
          <View style={styles.checkWrap}>
            {reduce
              ? null
              : Array.from({ length: DOTS }, (_, i) => (
                  <Dot key={i} p={p} angle={(i / DOTS) * Math.PI * 2 + (i % 2 ? 0.12 : 0)} far={i % 2 ? 62 : 82} size={i % 3 === 0 ? 10 : 7} color={colors[i % colors.length]!} />
                ))}
            <Animated.View style={[styles.check, { backgroundColor: theme.colors.successContainer }, check]}>
              <MaterialCommunityIcons name="check" size={40} color={theme.colors.onSuccessContainer} />
            </Animated.View>
          </View>
          <Text variant="titleMedium" style={{ fontWeight: '700', textAlign: 'center' }} testID="celebrate-text">
            {message}
          </Text>
        </Animated.View>
      </View>
    </Portal>
  );
}

// Which landmarks have already been celebrated, for as long as the app is open.
const celebrated = new Set<string>();
export const resetCelebrations = () => celebrated.clear();

/**
 * `fire(key, line)`: a buzz and the celebration, once per `key`. Asking again for the same key only gives the small tap
 * (it returns false). Put `element` anywhere in the screen: it draws over everything.
 */
export function useCelebration(): { fire: (key: string, message: string) => boolean; element: ReactElement | null } {
  const [now, setNow] = useState<{ id: number; message: string } | null>(null);
  const fire = useCallback((key: string, message: string) => {
    if (celebrated.has(key)) {
      haptic('tap');
      return false;
    }
    celebrated.add(key);
    haptic('success');
    setNow({ id: Date.now(), message });
    return true;
  }, []);
  const element = now ? <Celebrate key={now.id} message={now.message} onDone={() => setNow(null)} /> : null;
  return { fire, element };
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 120, zIndex: 100 },
  card: {
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xl,
    paddingHorizontal: space.xl,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 320,
  },
  checkWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  check: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute' },
});
