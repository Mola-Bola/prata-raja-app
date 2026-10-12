// Big pick-one cards (2 across): an emoji, a title and a line. The picked one gets a leaf border, a soft green tint and a
// leaf lip, and a tick (so it isn't only colour). Screen readers and the keyboard get a radio group (RadioGroup.tsx).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { LIP, SINK } from './BigButton';
import { haptic } from './haptics';
import { useDepress } from './motion';
import { RadioGroup } from './RadioGroup';
import { radius, space } from './theme';
import { useAppTheme } from './useAppTheme';

export type Choice<T> = { value: T; title: string; line?: string; emoji?: string; testID?: string };

export function ChoiceCards<T extends string | number>({
  label,
  options,
  value,
  onChange,
  testID,
  disabled,
}: {
  /** What is being chosen, for screen readers ("Kind of thing"). */
  label: string;
  options: Choice<T>[];
  /** The picked one, or null. */
  value: T | null;
  onChange: (v: T) => void;
  /** Each card is `${testID}-${value}` unless it has its own. */
  testID: string;
  /** Greyed and not pressable (while a change is being saved). */
  disabled?: boolean;
}) {
  return (
    <RadioGroup label={label} style={styles.grid} testID={testID}>
      {options.map((o) => (
        <Card key={String(o.value)} option={o} on={o.value === value} onPress={() => onChange(o.value)} disabled={disabled} testID={o.testID ?? `${testID}-${o.value}`} />
      ))}
    </RadioGroup>
  );
}

function Card<T>({ option, on, onPress, disabled, testID }: { option: Choice<T>; on: boolean; onPress: () => void; disabled?: boolean; testID: string }) {
  const theme = useAppTheme();
  const c = theme.colors;
  const { style: sink, press } = useDepress(SINK);
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        haptic('select');
        onPress();
      }}
      {...(disabled ? null : press)}
      role="radio"
      aria-checked={on}
      aria-disabled={disabled || undefined}
      accessibilityState={{ checked: on }}
      accessibilityLabel={option.line ? `${option.title}. ${option.line}` : option.title}
      testID={testID}
      style={[styles.holder, disabled ? { opacity: 0.5 } : null]}>
      <View style={[styles.lip, { backgroundColor: on ? c.primary : c.lip }]} />
      <Animated.View style={[styles.face, { backgroundColor: on ? c.selectedTint : c.surface, borderColor: on ? c.primary : c.outlineVariant }, sink]}>
        <View style={styles.top}>
          {option.emoji ? (
            <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
              {option.emoji}
            </Text>
          ) : (
            <View />
          )}
          {on ? (
            <View style={[styles.tick, { backgroundColor: c.primary }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <MaterialCommunityIcons name="check" size={18} color={c.onPrimary} />
            </View>
          ) : null}
        </View>
        <Text variant="titleMedium" style={{ fontWeight: '900', color: c.onSurface }}>
          {option.title}
        </Text>
        {option.line ? (
          <Text variant="bodySmall" style={{ color: c.onSurfaceVariant }}>
            {option.line}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  // Two across, whatever the width.
  holder: { flexBasis: '45%', flexGrow: 1, paddingBottom: LIP },
  lip: { position: 'absolute', left: 0, right: 0, top: LIP, bottom: 0, borderRadius: radius.lg },
  face: { flex: 1, borderRadius: radius.lg, borderWidth: 2.5, padding: 14, gap: 6, minHeight: 126 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  emoji: { fontSize: 30, lineHeight: 38 },
  tick: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
