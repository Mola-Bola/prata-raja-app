import { type Href, router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

import { type FeedbackAction, isNotFound, useAuth, useFeedbackAct, useFeedbackItem, useReplyFeedback } from '@/data';
import { fmtDate } from '@/domain';
import { describe } from '@/features/feedback/context';
import { dictationAvailable, useDictation } from '@/features/feedback/dictation';
import { Journey } from '@/features/feedback/Journey';
import { feedbackTeam, planLine, replyAuthor, STAGE, STAGE_OF, STATUS, statusLabel } from '@/features/feedback/labels';
import { MicButton } from '@/features/feedback/MicButton';
import { KindIcon, PlanBox } from '@/features/feedback/NoteBits';
import { EmptyState, ErrorView, LoadingView, Panel, Pill, radius, Screen, Section, space, useAppTheme, useToast } from '@/ui';

export default function FeedbackDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useFeedbackItem(id);
  const reply = useReplyFeedback();
  const act = useFeedbackAct();
  const { userId, profile } = useAuth();
  const toast = useToast();
  const theme = useAppTheme();
  const [text, setText] = useState('');
  const canTalk = dictationAvailable();
  const dictation = useDictation((chunk) => setText((t) => (t ? `${t.replace(/\s+$/, '')} ${chunk}` : chunk)));

  // Before any early return, so the header never shows the raw route name while loading or on an error.
  const fallbackTitle = <Stack.Screen options={{ title: 'Your note' }} />;
  if (item.isLoading) return (<>{fallbackTitle}<LoadingView /></>);
  if (isNotFound(item.error))
    return (
      <Screen>
        {fallbackTitle}
        <EmptyState
          emoji="🔍"
          title="We can’t find that note"
          body="It may have been removed, or the link is incomplete."
          action={
            <Button mode="contained" onPress={() => router.replace('/feedback')} testID="feedback-not-found-list">
              See all your notes
            </Button>
          }
        />
      </Screen>
    );
  if (item.error || !item.data) return (<>{fallbackTitle}<ErrorView error={item.error} onRetry={item.refetch} /></>);
  const f = item.data;
  const mine = f.author_id === userId;
  const params = (f.params ?? {}) as Record<string, string>;
  const team = feedbackTeam(profile?.is_admin);
  // The plan only: a reply is already in the conversation below.
  const plan = planLine(f, profile?.is_admin);

  const send = async () => {
    dictation.stop();
    if (!text.trim()) return;
    try {
      await reply.mutateAsync({ id: f.id, body: text });
      setText('');
    } catch (e) {
      toast.error(e);
    }
  };
  const doAct = async (action: FeedbackAction, done: string) => {
    try {
      await act.mutateAsync({ id: f.id, action, note: text.trim() || undefined });
      setText('');
      toast.show(done);
    } catch (e) {
      toast.error(e);
    }
  };

  const actions: { action: FeedbackAction; label: string; done: string; primary?: boolean }[] = [];
  // Only a plan waiting for a yes (`plan --ask`) takes a Go ahead. A note that was only just received has nothing to
  // approve (the owner's notes are built without one; family notes get a plan first), and a question wants an answer.
  if (f.status === 'proposed') actions.push({ action: 'approve', label: 'Go ahead', done: `${team.Name} will build it and ship an update.`, primary: true });
  if (['new', 'needs_info', 'proposed', 'approved'].includes(f.status)) actions.push({ action: 'not_now', label: 'Not now', done: 'Parked.' });
  if (f.status === 'shipped') {
    actions.push({ action: 'done', label: 'Looks good', done: 'Marked done. Thanks!', primary: true });
    actions.push({ action: 'reopen', label: 'Still not right', done: 'Reopened. Say what’s still off below.' });
  }
  if (f.status === 'done' || f.status === 'wont_do') actions.push({ action: 'reopen', label: 'Reopen', done: 'Reopened.' });

  const openScreen = () => {
    const qs = new URLSearchParams(params).toString();
    router.push(`${f.route ?? '/'}${qs ? `?${qs}` : ''}` as Href);
  };

  return (
    <Screen onRefresh={item.refetch} refreshing={item.isRefetching}>
      <Stack.Screen options={{ title: mine || !f.author ? 'Your note' : `${f.author.display_name}’s note` }} />
      <Panel style={{ marginTop: space.md }}>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
          <KindIcon kind={f.kind} size={18} />
          <Text variant="bodyLarge" testID="feedback-detail-body" style={{ flex: 1 }}>
            {f.body}
          </Text>
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {describe({ route: f.route ?? '/', params, screen: f.screen })} · {fmtDate(f.created_at)} · {f.platform}
          {f.app_version ? ` · v${f.app_version}` : ''}
          {!mine && f.author ? ` · ${f.author.display_name}` : ''}
        </Text>
        {f.tags.length ? (
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {f.tags.map((t) => (
              <Pill key={t} label={t} />
            ))}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-end' }}>
          {f.screenshotUrl ? <Image source={{ uri: f.screenshotUrl }} style={[styles.shot, { borderColor: theme.colors.outlineVariant }]} /> : null}
          {f.route ? (
            <Button compact icon="open-in-app" onPress={openScreen} testID="feedback-open-screen">
              Open that screen
            </Button>
          ) : null}
        </View>
      </Panel>

      <Section title="Where it’s at">
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center', flexWrap: 'wrap' }} testID="feedback-detail-status">
          {/* The progress line names the step; the pill is for what it can't say (a question, parked, check it). */}
          {f.status === 'proposed' || ['question', 'not_now', 'merged', 'shipped'].includes(STAGE_OF[f.status]) ? (
            <Pill label={statusLabel(f.status, profile?.is_admin)} tone={STATUS[f.status].tone} />
          ) : null}
          {f.shipped_in ? <Pill label={`Shipped in ${f.shipped_in}`} tone="success" /> : null}
        </View>
        <Journey status={f.status} testID="feedback-journey" />
        {plan?.kind === 'plan' ? <PlanBox line={plan} lines={6} testID="feedback-detail-plan" /> : null}
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {f.status === 'proposed'
            ? mine
              ? `That’s the plan. Tap Go ahead below and ${team.name} will build it, or Not now.`
              : 'Waiting for their OK before it’s built.'
            : NEXT[STAGE_OF[f.status]](team.Name, mine)}
        </Text>
      </Section>

      <Section title="Conversation">
        {f.messages.length === 0 ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {f.status === 'new' ? `No replies yet. ${team.Name} will read this and reply here if anything’s unclear.` : 'No messages about this one.'}
          </Text>
        ) : (
          f.messages.map((m) => {
            const fromMe = m.author_id === userId;
            return (
              <View
                key={m.id}
                style={[
                  styles.bubble,
                  fromMe ? { alignSelf: 'flex-end', backgroundColor: theme.colors.primaryContainer } : { alignSelf: 'flex-start', backgroundColor: theme.colors.elevation.level3 },
                ]}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {fromMe ? 'You' : replyAuthor(m, profile?.is_admin)} · {fmtDate(m.created_at)}
                </Text>
                <Text variant="bodyMedium">{m.body}</Text>
              </View>
            );
          })
        )}
      </Section>

      <Section title={actions.some((a) => a.primary) ? 'Your call' : 'Reply'}>
        <TextInput mode="outlined" multiline value={text}
          onChangeText={(t) => {
            dictation.stop();
            setText(t);
          }}
          // Typing and talking never write at the same time (as in the feedback sheet): tapping in stops listening.
          onFocus={() => dictation.listening && dictation.stop()}
          placeholder={f.status === 'needs_info' ? 'Your answer…' : f.status === 'shipped' ? 'What’s still off? (optional)' : 'Add detail or ask something…'} testID="feedback-reply" />
        {dictation.interim ? <Text style={{ fontStyle: 'italic', color: theme.colors.onSurfaceVariant }}>{dictation.interim}…</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' }}>
          {canTalk ? <MicButton listening={dictation.listening} onPress={dictation.toggle} caption={false} size={22} /> : null}
          <Button mode="outlined" onPress={send} disabled={!text.trim() || reply.isPending} loading={reply.isPending} testID="feedback-reply-send">
            Send reply
          </Button>
        </View>
        {actions.length ? (
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: space.sm }}>
            {actions.map((a) => (
              <Button key={a.action} mode={a.primary ? 'contained' : 'outlined'} onPress={() => doAct(a.action, a.done)} loading={act.isPending} testID={`feedback-act-${a.action}`}>
                {a.label}
              </Button>
            ))}
          </View>
        ) : null}
      </Section>
    </Screen>
  );
}

/** One plain sentence under the progress line: what happens next, and who's doing it. */
const NEXT: Record<keyof typeof STAGE, (team: string, mine: boolean) => string> = {
  received: (team) => `${team} has it and will work out a plan. It will show up here.`,
  question: (team, mine) => (mine ? `${team} asked something below. Your answer keeps it moving.` : `Waiting for an answer to ${team}’s question.`),
  planned: (team) => `${team} knows what to change. Next it gets built.`,
  building: (team) => `${team} is building it now. It arrives as an app update.`,
  shipped: (_t, mine) => (mine ? 'It’s in the app. Have a look, then tell us if it’s right.' : 'It’s in the app, waiting for a check.'),
  done: () => 'All done. Thanks for the note!',
  not_now: (team) => `${team} has parked this for now. Reopen it any time.`,
  merged: () => 'This one was split up or joined with another note, so each part can be tracked.',
};

const styles = StyleSheet.create({
  shot: { width: 90, height: 160, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  bubble: { maxWidth: '88%', borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: space.sm, gap: 2 },
});
