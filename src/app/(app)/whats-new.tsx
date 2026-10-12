import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Divider, Text } from 'react-native-paper';

import { type FeedbackAction, type FeedbackItem, useAuth, useFeedbackAct, useFeedbackList, useReleases } from '@/data';
import { fmtDate } from '@/domain';
import { feedbackTeam, KIND_EMOJI, STATUS, statusLabel } from '@/features/feedback/labels';
import { EmptyState, ErrorView, LoadingView, Panel, Pill, Screen, space, useAppTheme, useToast } from '@/ui';

/** One note a release closes: what it said, where it's at, and (for its author, once shipped) Looks good / Still not right. */
function ClosedNote({ note, mine, testID }: { note: FeedbackItem; mine: boolean; testID: string }) {
  const theme = useAppTheme();
  const toast = useToast();
  const act = useFeedbackAct();
  const [busy, setBusy] = useState<FeedbackAction | null>(null);
  const { profile } = useAuth();
  const status = { label: statusLabel(note.status, profile?.is_admin), tone: STATUS[note.status].tone };
  const open = () => router.push(`/feedback/${note.id}`);

  const doAct = async (action: FeedbackAction) => {
    setBusy(action);
    try {
      await act.mutateAsync({ id: note.id, action });
      if (action === 'done') toast.show('Marked done. Thanks!');
      else toast.show('Reopened. Say what’s still off.', { label: 'Open', onPress: open });
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: space.xs }} testID={testID}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Your note: ${note.body}`} style={{ gap: 4 }}>
        <Text variant="bodyMedium" numberOfLines={3}>
          {KIND_EMOJI[note.kind]} {note.body}
        </Text>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill label={status.label} tone={status.tone} />
          {!mine && note.author ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {note.author.display_name}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {mine && note.status === 'shipped' ? (
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Button mode="contained" compact onPress={() => doAct('done')} loading={busy === 'done'} disabled={!!busy} testID={`${testID}-good`}>
            Looks good
          </Button>
          <Button mode="outlined" compact onPress={() => doAct('reopen')} loading={busy === 'reopen'} disabled={!!busy} testID={`${testID}-reopen`}>
            Still not right
          </Button>
        </View>
      ) : null}
    </View>
  );
}

export default function WhatsNew() {
  const releases = useReleases();
  // Your own notes (the owner sees everyone's): only those are shown against a release, never a count of other people's.
  const notes = useFeedbackList();
  const { userId, profile } = useAuth();
  const theme = useAppTheme();
  // Before any early return, so the header never shows the raw route name while loading or on an error.
  const title = <Stack.Screen options={{ title: 'What’s new' }} />;
  if (releases.isLoading) return (<>{title}<LoadingView /></>);
  if (releases.error) return (<>{title}<ErrorView error={releases.error} onRetry={releases.refetch} /></>);
  const byId = new Map((notes.data ?? []).map((n) => [n.id, n]));
  return (
    <Screen
      onRefresh={() => {
        releases.refetch();
        notes.refetch();
      }}
      refreshing={releases.isRefetching || notes.isRefetching}>
      {title}
      {!releases.data?.length ? (
        <EmptyState emoji="✨" title="No updates yet" body={`When ${feedbackTeam(profile?.is_admin).name} ships a change you asked for, it shows up here.`} />
      ) : (
        <View style={{ gap: space.md, marginTop: space.md }}>
          {releases.data.map((r, i) => {
            const closes = r.feedback_ids.map((id) => byId.get(id)).filter((n): n is FeedbackItem => !!n);
            return (
              <Panel key={r.id} tone={i === 0 ? 'primary' : 'default'} testID={`release-${r.label}`}>
                <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', flex: 1 }}>
                    {r.label}
                  </Text>
                  <Pill label={r.kind === 'apk' ? 'New app version' : 'Update'} tone={r.kind === 'apk' ? 'warn' : 'neutral'} />
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {fmtDate(r.created_at)}
                </Text>
                <Text variant="bodyMedium">{r.notes}</Text>
                {closes.length ? (
                  <View style={{ gap: space.sm, marginTop: space.xs }}>
                    <Divider />
                    <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                      {closes.some((n) => n.author_id !== userId) ? 'Notes this fixes' : closes.length === 1 ? 'Your note it fixes' : 'Your notes it fixes'}
                    </Text>
                    {closes.map((n, j) => (
                      <ClosedNote key={n.id} note={n} mine={n.author_id === userId} testID={`release-${r.label}-note-${j}`} />
                    ))}
                  </View>
                ) : null}
              </Panel>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
