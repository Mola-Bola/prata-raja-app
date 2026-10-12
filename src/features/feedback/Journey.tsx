import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { brandWords } from '@/brand';
import type { FeedbackStatus } from '@/data';
import { space, useAppTheme } from '@/ui';

import { JOURNEY, journeyStep, STAGE, STAGE_OF } from './labels';

const SHORT: Record<string, string> = brandWords.statusShort;

/**
 * Where a note is on its way: Received → Planned → Building → Shipped → Done.
 * `compact` is a thin five-part bar for list rows; the full one names each step (a note's own page).
 */
export function Journey({ status, compact, testID }: { status: FeedbackStatus; compact?: boolean; testID?: string }) {
  const theme = useAppTheme();
  const step = journeyStep(status);
  if (step === null) return null;
  const label = `${STAGE[STAGE_OF[status]].label}, step ${step + 1} of ${JOURNEY.length}`;
  const on = theme.colors.primary;
  const off = theme.colors.outlineVariant;

  if (compact) {
    return (
      <View style={styles.bar} accessible accessibilityLabel={label} testID={testID}>
        {JOURNEY.map((s, i) => (
          <View key={s} style={[styles.segment, { backgroundColor: i <= step ? on : off }]} />
        ))}
      </View>
    );
  }
  return (
    <View style={styles.steps} accessible accessibilityLabel={label} testID={testID}>
      {JOURNEY.map((s, i) => {
        const done = i < step;
        const here = i === step;
        return (
          <View key={s} style={styles.step}>
            <View style={styles.track}>
              <View style={[styles.line, { backgroundColor: i === 0 ? 'transparent' : i <= step ? on : off }]} />
              <View
                style={[
                  styles.dot,
                  here
                    ? { backgroundColor: on, borderColor: on, width: 22, height: 22 }
                    : { backgroundColor: done ? on : theme.colors.surface, borderColor: done ? on : off },
                ]}>
                {done || (here && i === JOURNEY.length - 1) ? (
                  <MaterialCommunityIcons name="check" size={here ? 15 : 11} color={theme.colors.onPrimary} />
                ) : here ? (
                  <View style={[styles.inner, { backgroundColor: theme.colors.onPrimary }]} />
                ) : null}
              </View>
              <View style={[styles.line, { backgroundColor: i === JOURNEY.length - 1 ? 'transparent' : i < step ? on : off }]} />
            </View>
            <Text
              variant="labelSmall"
              // Five steps share the width: big system text grows a little (up to 1.3×) and may wrap, so on a 360px
              // phone the step names stay whole. The whole line is also read out ("Building, step 3 of 5").
              numberOfLines={2}
              maxFontSizeMultiplier={1.3}
              style={{ textAlign: 'center', paddingHorizontal: 1, color: here ? theme.colors.onSurface : theme.colors.onSurfaceVariant, fontWeight: here ? '700' : '400' }}>
              {SHORT[s]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 3, width: 84 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  steps: { flexDirection: 'row', marginVertical: space.xs },
  step: { flex: 1, alignItems: 'center', gap: 4 },
  track: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', height: 22 },
  line: { flex: 1, height: 2 },
  dot: { width: 16, height: 16, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 8, height: 8, borderRadius: 4 },
});
