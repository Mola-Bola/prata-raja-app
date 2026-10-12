import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import type { FeedbackKind } from '@/data';
import { radius, space, useAppTheme } from '@/ui';

import { KIND_ICON, KIND_LABEL, type planLine } from './labels';

/** The guessed kind as a small quiet icon (bug, idea, change…); it's a guess, so it never shouts. */
export function KindIcon({ kind, size = 16 }: { kind: FeedbackKind; size?: number }) {
  const theme = useAppTheme();
  return (
    <View accessible accessibilityLabel={`Looks like: ${KIND_LABEL[kind].toLowerCase()}`} style={{ paddingTop: 3 }}>
      <MaterialCommunityIcons name={KIND_ICON[kind] as never} size={size} color={theme.colors.onSurfaceVariant} />
    </View>
  );
}

/** "The plan: …" (or the latest reply) under a note, in a soft box so it reads as the answer to the note. */
export function PlanBox({ line, lines = 2, testID }: { line: NonNullable<ReturnType<typeof planLine>>; lines?: number; testID?: string }) {
  const theme = useAppTheme();
  const isPlan = line.kind === 'plan';
  return (
    <View
      style={[styles.box, { backgroundColor: isPlan ? theme.colors.tertiaryContainer : theme.colors.elevation.level3 }]}
      testID={testID}>
      <MaterialCommunityIcons
        name={isPlan ? 'map-marker-path' : 'message-reply-text-outline'}
        size={16}
        color={isPlan ? theme.colors.onTertiaryContainer : theme.colors.onSurfaceVariant}
        style={{ marginTop: 2 }}
      />
      <Text variant="bodyMedium" numberOfLines={lines} style={{ flex: 1, color: isPlan ? theme.colors.onTertiaryContainer : theme.colors.onSurface }}>
        <Text variant="bodyMedium" style={{ fontWeight: '700', color: isPlan ? theme.colors.onTertiaryContainer : theme.colors.onSurface }}>
          {line.who}:{' '}
        </Text>
        {line.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: space.sm, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm },
});
