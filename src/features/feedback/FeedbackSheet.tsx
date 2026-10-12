import { router } from 'expo-router';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { Button, Switch, Text, TextInput } from 'react-native-paper';

import { type FeedbackContext, type FeedbackKind, useAuth, useSendFeedback } from '@/data';
import { guessNoteKind } from '@/domain';
import { BigButton, haptic, radius, Sheet, space, useAppTheme, useToast, WORDS } from '@/ui';

import { describe } from './context';
import { dictationAvailable, useDictation } from './dictation';
import { feedbackTeam } from './labels';
import { BigMic } from './BigMic';
import { insertAtCursor } from './speechText';
import { feedbackStore, useFeedbackStore } from './store';

/** The capture sheet. Context is frozen at the moment the sheet opened (the screen you were on). */
export function FeedbackSheet({ context }: { context: FeedbackContext }) {
  const { open } = useFeedbackStore();
  // Everything that changes as you type lives in NoteForm, below. The sheet's contents are drawn by Paper's Portal,
  // which re-draws them in a second pass after the owner of the state has updated; keeping the note in the same
  // component as the text box means a keystroke re-renders the box directly and nothing else writes to it.
  return (
    <Sheet visible={open} onDismiss={() => feedbackStore.close()} title={WORDS.tell} footer={<NoteFooter />} testID="feedback-sheet">
      <NoteForm context={context} />
    </Sheet>
  );
}

// Clear and Send stay at the foot of the sheet, above the keyboard, however long the note grows. They are drawn by the
// sheet's `footer`, outside NoteForm (which owns the note), so NoteForm tells them what to show through this tiny store.
type Foot = { hasText: boolean; canSend: boolean; sending: boolean; clear: () => void; send: () => void };
const NO_FOOT: Foot = { hasText: false, canSend: false, sending: false, clear: () => {}, send: () => {} };
let foot = NO_FOOT;
const footListeners = new Set<() => void>();
const setFoot = (next: Foot) => {
  const same = foot.hasText === next.hasText && foot.canSend === next.canSend && foot.sending === next.sending;
  const was = foot;
  foot = same ? { ...was, clear: next.clear, send: next.send } : next; // new handlers never re-draw the buttons
  if (!same) footListeners.forEach((l) => l());
};
const useFoot = () =>
  useSyncExternalStore(
    (l) => {
      footListeners.add(l);
      return () => footListeners.delete(l);
    },
    () => foot,
    () => NO_FOOT,
  );

function NoteFooter() {
  const f = useFoot();
  return (
    <View style={styles.footer}>
      {f.hasText ? (
        <BigButton tone="ghost" icon="close-circle-outline" onPress={() => foot.clear()} testID="feedback-clear">
          Clear
        </BigButton>
      ) : null}
      <BigButton onPress={() => foot.send()} loading={f.sending} disabled={!f.canSend || f.sending} style={styles.send} testID="feedback-send">
        Send
      </BigButton>
    </View>
  );
}

function NoteForm({ context }: { context: FeedbackContext }) {
  const { open, screenshot, listenOnOpen } = useFeedbackStore();
  // The draft is also kept (on the device where there is storage), a moment after you stop typing.
  const [body, setBody] = useState(() => feedbackStore.get().draft.body);
  const bodyRef = useRef(body);
  const owner = useRef(feedbackStore.epoch());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keep = (next: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      // Someone else signed in since this box opened: their draft is not ours to write.
      if (owner.current === feedbackStore.epoch()) feedbackStore.setDraft({ ...feedbackStore.get().draft, body: next }, true);
    }, 400);
  };
  const apply = (next: string) => {
    bodyRef.current = next;
    setBody(next);
    keep(next);
  };
  // Closed within the moment before the draft was saved: save it now rather than lose the last words.
  useEffect(
    () => () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        if (owner.current === feedbackStore.epoch()) feedbackStore.setDraft({ ...feedbackStore.get().draft, body: bodyRef.current }, true);
      }
    },
    [],
  );

  const theme = useAppTheme();
  const toast = useToast();
  const send = useSendFeedback();
  const team = feedbackTeam(useAuth().profile?.is_admin);
  const [includeShot, setIncludeShot] = useState(true);
  const [canTalk] = useState(dictationAvailable);

  // Where the cursor is in the note (null until the person has touched it), and where the next spoken words go.
  const cursor = useRef<number | null>(null);
  const anchor = useRef(0);
  const dictation = useDictation((chunk) => {
    const r = insertAtCursor(bodyRef.current, anchor.current, chunk);
    anchor.current = r.cursor;
    apply(r.text);
  });
  const talk = () => {
    anchor.current = Math.min(cursor.current ?? bodyRef.current.length, bodyRef.current.length);
    dictation.start();
  };
  // Typing and talking never write at the same time. Listening used to carry on while you went back to fix a word
  // (the "stop on focus" guard never fires when the box is already focused, which it is after tapping the mic), and
  // each finished phrase was then added at the END, replacing the text under your cursor: the word you were editing
  // flashed, letters jumbled and the cursor jumped. Now touching the note, or changing it, stops listening first, and
  // spoken words go in where the cursor was when you started talking.
  const edit = (next: string) => {
    dictation.stop();
    apply(next);
  };

  useEffect(() => {
    if (!open) dictation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (listenOnOpen && canTalk) talk();
    return () => dictation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clear = () => {
    const before = bodyRef.current;
    if (!before) return;
    dictation.stop();
    cursor.current = null;
    apply('');
    haptic('tap');
    toast.show('Note cleared', {
      label: 'Undo',
      onPress: () => {
        cursor.current = null;
        apply(before);
        // The sheet may have been closed since: the draft is what it will show when it opens again.
        feedbackStore.setDraft({ ...feedbackStore.get().draft, body: before });
      },
    });
  };

  const submit = async () => {
    dictation.stop();
    const text = body.trim();
    if (!text) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    try {
      // No "what kind of note?" question: it's worked out from the words (and can be re-tagged when it's answered).
      const kind: FeedbackKind = guessNoteKind(text);
      await send.mutateAsync({ kind, body: text, context, screenshotBase64: includeShot ? screenshot : null });
      bodyRef.current = '';
      setBody('');
      feedbackStore.clearDraft();
      feedbackStore.close();
      // The sheet closes and says what happens next: the plan shows up in My notes.
      toast.show('Sent, thanks! You’ll see the plan in My notes.', { label: 'My notes', onPress: () => router.push('/feedback') });
    } catch (e) {
      toast.error(e);
    }
  };

  const noteSize = theme.fonts.titleMedium.fontSize ?? 18;
  // The footer's Clear and Send act on what is here (see NoteFooter).
  useEffect(() => {
    setFoot({ hasText: !!body, canSend: !!body.trim(), sending: send.isPending, clear, send: submit });
  });
  useEffect(() => () => setFoot(NO_FOOT), []);

  return (
    <>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} testID="feedback-context">
        About: {describe(context)}
      </Text>

      <TextInput
        mode="outlined"
        multiline
        numberOfLines={4}
        value={body}
        onChangeText={edit}
        onFocus={() => dictation.stop()}
        onSelectionChange={(e) => {
          cursor.current = e.nativeEvent.selection.end;
        }}
        // Already focused, so no focus event: a tap in the note to fix a word still stops listening first.
        {...(Platform.OS === 'web' ? {} : { onPressIn: () => dictation.stop() })}
        placeholder={`What do you like, what’s off, what should change? Ramble away, ${team.name} will sort it out.`}
        accessibilityLabel="Your note"
        outlineStyle={{ borderRadius: 20, borderWidth: 2 }}
        // A clear edge (3:1 against the sheet), so the box is easy to find; the size follows the type scale.
        outlineColor={theme.colors.outline}
        style={{ minHeight: 120, backgroundColor: theme.colors.background }}
        contentStyle={[styles.noteText, { fontSize: noteSize, lineHeight: Math.round(noteSize * 1.45) }]}
        testID="feedback-body"
      />
      {dictation.interim ? (
        <Text variant="bodyMedium" style={{ fontStyle: 'italic', color: theme.colors.onSurfaceVariant }}>
          {dictation.interim}…
        </Text>
      ) : null}
      {dictation.error ? (
        <Text variant="bodySmall" style={{ color: theme.colors.error }}>
          {dictation.error}
        </Text>
      ) : null}

      {canTalk ? <BigMic listening={dictation.listening} onPress={() => (dictation.listening ? dictation.finish() : talk())} testID="feedback-mic" /> : null}

      {screenshot ? (
        <View style={styles.shot}>
          <Image source={{ uri: `data:image/jpeg;base64,${screenshot}` }} style={[styles.thumb, { borderColor: theme.colors.outlineVariant, opacity: includeShot ? 1 : 0.35 }]} />
          <View style={{ flex: 1 }}>
            <Text variant="labelLarge">Include a picture of this screen</Text>
          </View>
          <Switch value={includeShot} onValueChange={setIncludeShot} accessibilityLabel="Include a picture of this screen" testID="feedback-include-shot" />
        </View>
      ) : null}

      <View style={styles.links}>
        <Button
          compact
          onPress={() => {
            feedbackStore.close();
            router.push('/feedback');
          }}
          testID="feedback-my-notes">
          My notes
        </Button>
        <Button
          compact
          onPress={() => {
            feedbackStore.close();
            feedbackStore.setHidden(true);
            toast.show('Button hidden. Bring it back from Me → Feedback & ideas.');
          }}
          testID="feedback-hide">
          Hide button
        </Button>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  noteText: { paddingHorizontal: space.lg, paddingTop: space.md },
  shot: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  thumb: { width: 36, height: 64, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  send: { flex: 1 },
});
