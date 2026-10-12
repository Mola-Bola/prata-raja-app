import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { type FeedbackItem, needsYou, useAuth, useFeedbackList } from '@/data';
import { fmtDate } from '@/domain';
import { describe } from '@/features/feedback/context';
import { Journey } from '@/features/feedback/Journey';
import { planLine, STATUS, statusLabel } from '@/features/feedback/labels';
import { KindIcon, PlanBox } from '@/features/feedback/NoteBits';
import { feedbackStore } from '@/features/feedback/store';
import { ChoiceChip, EmptyState, ErrorView, LoadingView, Panel, Pill, Screen, space, useAppTheme } from '@/ui';

type Filter = 'you' | 'open' | 'shipped' | 'all' | 'mine';
const OPEN = ['new', 'needs_info', 'proposed', 'approved', 'in_progress'];

export default function FeedbackList() {
  const list = useFeedbackList();
  const { profile, userId } = useAuth();
  const isAdmin = !!profile?.is_admin;
  const theme = useAppTheme();
  const [filter, setFilter] = useState<Filter>('all');

  const items = useMemo(() => {
    const all = list.data ?? [];
    if (filter === 'you') return all.filter(needsYou);
    if (filter === 'open') return all.filter((f) => OPEN.includes(f.status));
    if (filter === 'shipped') return all.filter((f) => f.status === 'shipped' || f.status === 'done');
    if (filter === 'mine') return all.filter((f) => f.author_id === userId);
    return all;
  }, [list.data, filter, userId]);

  // Before any early return, so the header never shows the raw route name while loading or on an error.
  const title = <Stack.Screen options={{ title: 'My notes' }} />;
  if (list.isLoading) return (<>{title}<LoadingView /></>);
  if (list.error) return (<>{title}<ErrorView error={list.error} onRetry={list.refetch} /></>);
  const waiting = (list.data ?? []).filter(needsYou).length;
  // The owner (an admin) sees everyone's notes; "Mine" narrows it to their own.
  const filters: [Filter, string][] = [
    ['all', 'All'],
    ['you', `Needs you${waiting ? ` · ${waiting}` : ''}`],
    ['open', 'On the way'],
    ['shipped', 'Shipped'],
    ...(isAdmin ? ([['mine', 'Mine']] as [Filter, string][]) : []),
  ];

  return (
    <Screen onRefresh={list.refetch} refreshing={list.isRefetching}>
      {title}
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: space.md }}>
        What’s happening with each note, and the plan for it. Check back here when you’re curious: it updates as the note moves on.
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: space.md }}>
        {filters.map(([k, label]) => (
          <ChoiceChip key={k} label={label} selected={filter === k} onPress={() => setFilter(k)} testID={`feedback-filter-${k}`} />
        ))}
      </ScrollView>

      {items.length === 0 ? (
        <EmptyState
          emoji="💬"
          title={filter === 'all' ? 'No notes yet' : 'Nothing here'}
          body="Tap the small tab on the right edge of any screen and say what you like, what’s off, or what to change. Hold it down to just talk."
          action={
            filter === 'all' ? (
              <Button mode="contained" onPress={() => feedbackStore.open(null)} testID="feedback-new">
                Write a note
              </Button>
            ) : undefined
          }
        />
      ) : (
        <View style={{ gap: space.sm }}>
          {items.map((f) => (
            <Row key={f.id} f={f} showAuthor={isAdmin && f.author_id !== userId} isAdmin={isAdmin} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function Row({ f, showAuthor, isAdmin }: { f: FeedbackItem; showAuthor: boolean; isAdmin: boolean }) {
  const theme = useAppTheme();
  const line = planLine(f, isAdmin);
  return (
    <Panel onPress={() => router.push(`/feedback/${f.id}`)} testID={`feedback-row-${f.id}`}>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
        <KindIcon kind={f.kind} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="bodyLarge" numberOfLines={3}>
            {f.body}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
            {describe({ route: f.route ?? '/', params: (f.params ?? {}) as Record<string, string>, screen: f.screen })} · {fmtDate(f.created_at)}
            {showAuthor && f.author ? ` · ${f.author.display_name}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' }}>
            <Pill label={statusLabel(f.status, isAdmin)} tone={STATUS[f.status].tone} />
            <Journey status={f.status} compact />
            {f.shipped_in ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                in {f.shipped_in}
              </Text>
            ) : null}
          </View>
          {line ? <PlanBox line={line} testID={`feedback-plan-${f.id}`} /> : null}
        </View>
      </View>
    </Panel>
  );
}
