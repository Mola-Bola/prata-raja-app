import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Button, Icon, Text, TouchableRipple } from 'react-native-paper';

import { AVATAR_INK, avatarColour, type Tone, toneColors } from './palette';
import { radius, space } from './theme';
import { useAppTheme } from './useAppTheme';

// ── Section ──
export function Section({
  title,
  subtitle,
  action,
  children,
  style,
}: {
  title?: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void; icon?: string; testID?: string };
  children?: ReactNode;
  style?: ViewStyle;
}) {
  const theme = useAppTheme();
  return (
    <View style={[{ marginTop: space.xl }, style]}>
      {title || action ? (
        <View style={styles.sectionHead}>
          <View style={{ flex: 1 }}>
            {title ? (
              <Text variant="titleLarge" accessibilityRole="header">
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {action ? (
            <Button compact icon={action.icon} onPress={action.onPress} contentStyle={{ minHeight: 44 }} testID={action.testID}>
              {action.label}
            </Button>
          ) : null}
        </View>
      ) : null}
      <View style={{ gap: space.sm }}>{children}</View>
    </View>
  );
}

// ── Card-ish surface ──
export function Panel({ children, style, onPress, tone = 'default', testID }: { children: ReactNode; style?: ViewStyle; onPress?: () => void; tone?: 'default' | 'primary' | 'tertiary' | 'warn' | 'error'; testID?: string }) {
  const theme = useAppTheme();
  const bg = {
    default: theme.colors.elevation.level1,
    primary: theme.colors.primaryContainer,
    tertiary: theme.colors.tertiaryContainer,
    warn: theme.colors.warnContainer,
    error: theme.colors.errorContainer,
  }[tone];
  // Plain cards get a hairline edge so they stand off the page in dark mode (and on bright screens).
  const edge = tone === 'default' ? { borderWidth: 1, borderColor: theme.colors.cardBorder } : null;
  const inner = <View style={[styles.panel, { backgroundColor: bg }, edge, style]}>{children}</View>;
  if (!onPress) return <View testID={testID}>{inner}</View>;
  return (
    <TouchableRipple onPress={onPress} borderless style={{ borderRadius: radius.lg }} testID={testID} accessibilityRole="button">
      {inner}
    </TouchableRipple>
  );
}

// ── Pill / chips ──
export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: string }) {
  const theme = useAppTheme();
  const [bg, fg] = toneColors(theme.colors, tone);
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text variant="labelSmall" style={{ color: fg }} numberOfLines={1}>
        {icon ? `${icon} ` : ''}
        {label}
      </Text>
    </View>
  );
}

/**
 * A pastel circle with the person's first letters in ink (the colour comes from the name, so it never changes).
 * Sizes: 44 in a row, 58 in a row of people, 36–56 in lists. `ring` puts a leaf ring round it (picked).
 */
export function PersonAvatar({ name, size = 44, ring }: { name: string; size?: number; ring?: boolean }) {
  const theme = useAppTheme();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';
  const colour = avatarColour(name);
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colour, alignItems: 'center', justifyContent: 'center' },
        ring ? { boxShadow: `0px 0px 0px 4px ${theme.colors.primary}` } : null,
      ]}>
      <Text style={{ color: AVATAR_INK, fontWeight: '900', fontSize: Math.round(size * 0.4), lineHeight: Math.round(size * 0.5) }}>{initials}</Text>
    </View>
  );
}

// ── Small key/value stat ──
export function Stat({ label, value, tone }: { label: string; value: string; tone?: 'error' | 'success' | 'warn' }) {
  const theme = useAppTheme();
  const color = tone ? { error: theme.colors.error, success: theme.colors.success, warn: theme.colors.warn }[tone] : theme.colors.onSurface;
  return (
    <View style={{ flex: 1, minWidth: 90 }}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="titleMedium" style={{ color, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

// ── List rows ──
/**
 * The one list row: something on the left (avatar, icon, thumbnail), a headline, an optional line of supporting
 * text, and something on the right (a pill, an amount, a chevron). The whole row is the button.
 * Put several in a <ListGroup> to get one card with hairlines between them.
 */
export function ListRow({
  leading,
  headline,
  supporting,
  trailing,
  chevron,
  onPress,
  emphasis,
  headlineLines = 2,
  supportingLines = 2,
  accessibilityLabel,
  testID,
}: {
  leading?: ReactNode;
  headline: ReactNode;
  supporting?: ReactNode;
  trailing?: ReactNode;
  /** A › on the right: this row opens another screen. */
  chevron?: boolean;
  onPress?: () => void;
  /** Bold headline (e.g. unread). */
  emphasis?: boolean;
  headlineLines?: number;
  supportingLines?: number;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const theme = useAppTheme();
  const body = (
    <View style={styles.listRow}>
      {leading ? <View style={styles.listLeading}>{leading}</View> : null}
      <View style={{ flex: 1, gap: 2 }}>
        {typeof headline === 'string' ? (
          <Text variant="bodyLarge" style={{ fontWeight: emphasis ? '700' : '500' }} numberOfLines={headlineLines}>
            {headline}
          </Text>
        ) : (
          headline
        )}
        {supporting == null || supporting === '' ? null : typeof supporting === 'string' ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={supportingLines}>
            {supporting}
          </Text>
        ) : (
          supporting
        )}
      </View>
      {trailing}
      {chevron ? <Icon source="chevron-right" size={22} color={theme.colors.onSurfaceVariant} /> : null}
    </View>
  );
  if (!onPress) return <View testID={testID}>{body}</View>;
  return (
    <TouchableRipple onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} testID={testID} style={{ borderRadius: radius.md }} borderless>
      {body}
    </TouchableRipple>
  );
}

/** A card holding rows, with a hairline between each (no gaps, no card per row). */
export function ListGroup({ children, testID, style }: { children: ReactNode; testID?: string; style?: ViewStyle }) {
  const theme = useAppTheme();
  const rows = (Array.isArray(children) ? children.flat() : [children]).filter((c) => c != null && c !== false);
  return (
    <View testID={testID} style={[styles.listGroup, { backgroundColor: theme.colors.elevation.level1, borderColor: theme.colors.cardBorder }, style]}>
      {rows.map((row, i) => (
        <View key={(row as { key?: string | null })?.key ?? i} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.outlineVariant } : null}>
          {row}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.md, minHeight: 56 },
  listLeading: { alignItems: 'center', justifyContent: 'center' },
  listGroup: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm, gap: space.sm },
  panel: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  pill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
});
