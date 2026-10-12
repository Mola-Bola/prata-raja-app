import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { type ComponentProps, Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Divider, Text, TouchableRipple } from 'react-native-paper';

import { Sheet } from './chrome';
import { radius, space } from './theme';
import { useAppTheme } from './useAppTheme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type SheetAction = {
  key: string;
  label: string;
  /** One line under the label, saying what happens. */
  description?: string;
  icon?: IconName;
  /** Red, for things like "Delete" or "Cancel". */
  danger?: boolean;
  /** Shown with a tick: the choice that's already in place (e.g. the current status). */
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
};

/**
 * A bottom sheet listing a few actions, one per row: the "More" behind a ⋯ button. Big rows (56 tall) with an icon
 * and a plain line saying what each does. Tapping one closes the sheet first, then runs it (so it can open a
 * confirm dialog or another sheet). Built on Sheet, so web gets a real modal dialog (focus, Escape).
 */
export function ActionSheet({
  visible,
  onDismiss,
  title,
  actions,
  testID,
}: {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  actions: SheetAction[];
  testID?: string;
}) {
  const theme = useAppTheme();
  return (
    <Sheet visible={visible} onDismiss={onDismiss} title={title} testID={testID}>
      <View style={{ marginHorizontal: -space.md }}>
        {actions.map((a, i) => {
          const fg = a.disabled ? theme.colors.onSurfaceDisabled : a.danger ? theme.colors.error : theme.colors.onSurface;
          return (
            <Fragment key={a.key}>
              {i > 0 ? <Divider style={{ backgroundColor: theme.colors.outlineVariant, marginLeft: a.icon ? 56 : space.md }} /> : null}
              <TouchableRipple
                onPress={() => {
                  onDismiss();
                  a.onPress();
                }}
                disabled={a.disabled}
                borderless
                style={styles.row}
                accessibilityRole="button"
                accessibilityState={{ disabled: !!a.disabled, selected: !!a.selected }}
                accessibilityLabel={[a.label, a.description, a.selected ? 'current' : null].filter(Boolean).join('. ')}
                testID={a.testID}>
                <View style={styles.inner}>
                  {a.icon ? <MaterialCommunityIcons name={a.icon} size={24} color={a.danger ? theme.colors.error : theme.colors.onSurfaceVariant} /> : null}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyLarge" style={{ color: fg, fontWeight: a.selected ? '700' : '400' }}>
                      {a.label}
                    </Text>
                    {a.description ? (
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        {a.description}
                      </Text>
                    ) : null}
                  </View>
                  {a.selected ? <MaterialCommunityIcons name="check" size={22} color={theme.colors.primary} /> : null}
                </View>
              </TouchableRipple>
            </Fragment>
          );
        })}
      </View>
      <Button onPress={onDismiss} contentStyle={{ minHeight: 48 }} testID={testID ? `${testID}-close` : undefined}>
        Close
      </Button>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { borderRadius: radius.md },
  inner: { flexDirection: 'row', alignItems: 'center', gap: space.lg, minHeight: 56, paddingVertical: space.sm, paddingHorizontal: space.md },
});
