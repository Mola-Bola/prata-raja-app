// What shows after the phone's own splash while the app signs in and loads the first screen: coral, the logo bouncing,
// "Just a moment…". It only fills the wait: nothing is held back to show it. Still (no bounce) when the phone
// asks for reduced motion.
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { useAppTheme } from './useAppTheme';
import { Wordmark } from './Wordmark';

export function StartupScreen() {
  const theme = useAppTheme();
  const reduce = useReducedMotion();
  const lift = useSharedValue(0);
  const squash = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    // Up, a soft landing that squashes a little, then a rest: about 1.6 s, like the mockup.
    lift.set(withRepeat(withSequence(withTiming(-14, { duration: 480, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) }), withDelay(720, withTiming(0, { duration: 0 }))), -1));
    squash.set(withRepeat(withSequence(withTiming(1.03, { duration: 480 }), withTiming(0.96, { duration: 400 }), withTiming(1, { duration: 200 }), withDelay(520, withTiming(1, { duration: 0 }))), -1));
  }, [reduce, lift, squash]);
  const bounce = useAnimatedStyle(() => ({ transform: [{ translateY: lift.get() }, { scaleY: squash.get() }, { scaleX: 2 - squash.get() }] }));
  return (
    <View style={[styles.fill, { backgroundColor: theme.colors.coral }]} accessible accessibilityRole="progressbar" accessibilityLabel="Just a moment" aria-busy testID="startup-screen">
      <Animated.View style={bounce}>
        <Wordmark variant="ink" width={240} testID="startup-wordmark" />
      </Animated.View>
      <Text variant="titleMedium" style={{ color: theme.colors.onCoral, fontWeight: '800', marginTop: 18 }}>
        Just a moment…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
