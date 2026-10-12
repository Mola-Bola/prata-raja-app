// The big mic in the middle of the Tell … sheet: a 92dp coral rounded square with a lip and a soft ring round it.
// While listening it shows a stop square, the ring breathes, and the words under it say how to stop. The ring stays
// still when the phone asks for reduced motion.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { haptic, useAppTheme, useDepress } from '@/ui';

const SIZE = 92;
const LIP = 6;
const RING = 10;

export function BigMic({ listening, onPress, testID }: { listening: boolean; onPress: () => void; testID?: string }) {
  const theme = useAppTheme();
  const reduce = useReducedMotion();
  const { style: sink, press } = useDepress(4);
  const breath = useSharedValue(0);
  useEffect(() => {
    if (!listening || reduce) {
      breath.set(0);
      return;
    }
    breath.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [listening, reduce, breath]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.get() * 0.22 }], opacity: 1 - breath.get() * 0.55 }));
  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <Animated.View style={[styles.ring, { backgroundColor: `${theme.colors.coral}2E` }, ring]} pointerEvents="none" />
        <Pressable
          onPress={() => {
            haptic('tap');
            onPress();
          }}
          {...press}
          role="button"
          accessibilityLabel={listening ? 'Stop listening' : 'Speak instead of typing'}
          accessibilityState={{ selected: listening }}
          testID={testID}
          style={styles.holder}>
          <View style={[styles.lip, { backgroundColor: theme.colors.coralLip }]} />
          <Animated.View style={[styles.face, { backgroundColor: theme.colors.coral }, sink]}>
            <MaterialCommunityIcons name={listening ? 'stop' : 'microphone'} size={44} color={theme.colors.onCoral} />
          </Animated.View>
        </Pressable>
      </View>
      <Text variant="titleSmall" style={{ color: theme.colors.coralDeep, fontWeight: '900' }} accessibilityLiveRegion="polite">
        {listening ? 'Listening… tap to stop' : 'Tap to talk'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 14 },
  // Room for the ring, so it is never cut off by the sheet's scroll area.
  stage: { width: SIZE + RING * 4, height: SIZE + LIP + RING * 2, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: SIZE + RING * 2, height: SIZE + RING * 2, borderRadius: 30 + RING, top: 0 },
  holder: { width: SIZE, height: SIZE + LIP, paddingBottom: LIP },
  lip: { position: 'absolute', left: 0, right: 0, top: LIP, bottom: 0, borderRadius: 30 },
  face: { flex: 1, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
