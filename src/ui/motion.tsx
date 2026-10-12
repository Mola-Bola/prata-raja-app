// Small, calm motion shared by every screen: things fade in and out, and the rest of a list slides to close the gap
// instead of jumping. Nothing moves when the phone's "reduce motion" setting is on (ReduceMotion.System).
import { type ReactNode, useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/** A row or section appearing. */
export const enterMotion = FadeIn.duration(180).reduceMotion(ReduceMotion.System);
/** A row or section going away. */
export const exitMotion = FadeOut.duration(140).reduceMotion(ReduceMotion.System);
/** Everything else in the list moving to its new place. */
export const layoutMotion = LinearTransition.duration(200).reduceMotion(ReduceMotion.System);

/**
 * Wrap a list item or a collapsible's body: it fades in when it appears, fades out when it goes, and slides when
 * items above it come or go. Give list items a stable `key`.
 */
export function Reveal({ children, style, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <Animated.View entering={enterMotion} exiting={exitMotion} layout={layoutMotion} style={style} testID={testID}>
      {children}
    </Animated.View>
  );
}

/** A soft pulse (opacity 1 → 0.5 → 1) for loading placeholders; still when reduce motion is on. */
export function Pulse({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    o.value = withRepeat(withTiming(0.5, { duration: 800 }), -1, true);
  }, [o, reduce]);
  const animated = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** The next question appearing: a soft fade, about 300 ms (a screen's own slide is the stack's). */
export const questionMotion = FadeIn.duration(300).reduceMotion(ReduceMotion.System);

/**
 * One screen of content changing to the next (a wizard’s questions): the new content fades in over a quarter of a
 * second, with nothing jumping. `id` says which screen it is. Under reduced motion it just changes.
 */
export function CrossFade({ id, children, style }: { id: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View key={id} entering={questionMotion} style={style}>
      {children}
    </Animated.View>
  );
}

/**
 * A chunky thing pressing down (buttons, choice cards, the + button): its face moves down `depth` while a finger is on
 * it, and back up after. The move is instant when the phone asks for reduced motion, but it still happens: it is the
 * feedback that the press registered. Spread `press` onto a Pressable and `style` onto the Animated.View face.
 */
export function useDepress(depth = 3) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const press = {
    onPressIn: () => {
      y.set(reduce ? depth : withTiming(depth, { duration: 70 }));
    },
    onPressOut: () => {
      y.set(reduce ? 0 : withTiming(0, { duration: 120 }));
    },
  };
  return { style, press };
}

/** A count that pops when it changes (the stepper's number): a quick grow and settle. Still when reduced motion is on. */
export function usePop(value: unknown) {
  const reduce = useReducedMotion();
  const k = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    k.value = withSequence(withTiming(1.18, { duration: 90 }), withTiming(1, { duration: 140 }));
  }, [value, reduce, k]);
  return useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
}

/**
 * A bottom sheet's content rising into place over about 300 ms as it fades in (Paper's Modal fades). Done with a plain
 * animated style, not a layout animation, so nothing else on the screen is touched. Still when reduced motion is on.
 */
export function Rise({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(reduce ? 0 : 56);
  useEffect(() => {
    y.set(withTiming(0, { duration: 300 }));
  }, [y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
