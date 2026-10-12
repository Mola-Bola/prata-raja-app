import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Portal, Text } from 'react-native-paper';

import { type FeedbackContext, useFeedbackEnabled } from '@/data';
import { setRightEdgeTab, useAppTheme, WORDS, useKeyboardHeight, useSheetOpens } from '@/ui';

import { useScreenContext } from './context';
import { FeedbackSheet } from './FeedbackSheet';
import { captureCurrentScreen } from './screenshot';
import { feedbackStore, useFeedbackStore } from './store';
import { UpdateBanner } from './UpdateBanner';

/**
 * The Tell … button (7f74bb1f, e79b1486: "tiny, not indicative of what it is"). Until the person has used it once it
 * is a big coral tab with a speech bubble and the words "Tell …" (at least 64 tall); after that it folds down to just
 * the icon (still 52 × 52, over the 48dp minimum). Docked on the right edge; its measured width is what screens keep
 * clear (`setRightEdgeTab`), so it grows with the text size.
 */
const FULL_MIN_WIDTH = 76;
const FULL_MIN_HEIGHT = 64;
const SMALL = 52;
/** The vertical position it starts at (a share of the screen height): mid-screen, clear of the footer, tab bar and +. */
const START_AT = 0.55;

/**
 * Mounted once in the root layout. Renders the floating feedback handle on every signed-in screen,
 * the capture sheet, and the "update ready" banner.
 */
export function FeedbackHost() {
  const enabled = useFeedbackEnabled();
  const { hidden, open } = useFeedbackStore();
  const live = useScreenContext();
  const [frozen, setFrozen] = useState<FeedbackContext>(live);
  const route = usePathname();
  // Opened some other way (My notes → Write a note): the note is about the screen you're on now, not the last one.
  const [wasOpen, setWasOpen] = useState(open);
  // Counts the times the note sheet opened: it starts afresh each time (see below).
  const [opened, setOpened] = useState(0);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFrozen(live);
      setOpened((n) => n + 1);
    }
  }
  const sheetOpens = useSheetOpens();

  const openSheet = async (listen: boolean) => {
    setFrozen(live);
    const shot = await captureCurrentScreen();
    feedbackStore.open(shot, listen);
  };

  // Everywhere you're signed in, forms included, except a note's own page: its reply box is the place to add to it.
  const showHandle = enabled && !hidden && !/^\/feedback\/[^/]+/.test(route);
  // Screens pad their right side on narrow phones so the tab never covers a button or field (the Handle says how wide it is).
  useEffect(() => {
    if (!showHandle) setRightEdgeTab(0);
    return () => setRightEdgeTab(0);
  }, [showHandle]);
  return (
    <>
      {/* Sheets are drawn by Paper's Portal, and what mounts later is drawn above what mounted earlier. So once a sheet
          has been opened, the tab is drawn by a Portal too, mounted again each time a sheet opens, and the note sheet
          starts afresh each time it opens (below): Tell … is reachable over Up for grabs, a picker, any sheet, and
          opens above it. Before any sheet has opened the tab is plain (a Portal mounted at start-up is queued by
          Paper, and its queue can draw it twice). While the note itself is open the tab isn't needed. */}
      {showHandle && !open ? (
        sheetOpens ? (
          <Portal key={`tab-${sheetOpens}`}>
            <Handle onPress={() => openSheet(false)} onLongPress={() => openSheet(true)} />
          </Portal>
        ) : (
          <Handle onPress={() => openSheet(false)} onLongPress={() => openSheet(true)} />
        )
      ) : null}
      {enabled ? <FeedbackSheet key={`note-${opened}`} context={frozen} /> : null}
      <UpdateBanner />
    </>
  );
}

const POS_KEY = 'prata-raja-feedback-handle-y';
const readPos = () => {
  try {
    const v = Number(globalThis.localStorage?.getItem(POS_KEY));
    return v > 0.05 && v < 0.95 ? v : START_AT;
  } catch {
    return START_AT;
  }
};

// Drag state lives outside React: there is only ever one handle.
const drag = { start: readPos(), moved: false };
const screenH = () => Dimensions.get('window').height || 800;

/**
 * Tab docked to the right edge. Drag it up or down the edge to move it out of the way;
 * the position is remembered on this device.
 */
function Handle({ onPress, onLongPress }: { onPress: () => void; onLongPress: () => void }) {
  const theme = useAppTheme();
  const { used } = useFeedbackStore();
  const [frac, setFrac] = useState(drag.start);
  const [box, setBox] = useState({ w: used ? SMALL : FULL_MIN_WIDTH, h: used ? SMALL : FULL_MIN_HEIGHT });
  // While the keyboard is open the tab rides just above it, so it's still there on forms.
  const keyboard = useKeyboardHeight();
  const { height } = useWindowDimensions();
  const top = keyboard ? Math.min(frac * height, height - keyboard - box.h - 6) : frac * height;
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6,
      onPanResponderGrant: () => {
        drag.moved = true;
      },
      onPanResponderMove: (_e, g) => {
        setFrac(Math.min(0.9, Math.max(0.1, drag.start + g.dy / screenH())));
      },
      onPanResponderRelease: (_e, g) => {
        const next = Math.min(0.9, Math.max(0.1, drag.start + g.dy / screenH()));
        drag.start = next;
        setFrac(next);
        try {
          globalThis.localStorage?.setItem(POS_KEY, String(next));
        } catch {
          /* storage unavailable */
        }
        setTimeout(() => (drag.moved = false), 50);
      },
    }),
  );
  // Screens keep this much of the right edge clear.
  useEffect(() => {
    setRightEdgeTab(box.w);
  }, [box.w]);
  return (
    <View pointerEvents="box-none" style={[styles.dock, { top }]} {...pan.panHandlers}>
      <Pressable
        onPress={() => !drag.moved && onPress()}
        onLongPress={() => !drag.moved && onLongPress()}
        delayLongPress={350}
        onLayout={(e) => {
          const { width, height: h } = e.nativeEvent.layout;
          setBox((b) => (Math.round(b.w) === Math.round(width) && Math.round(b.h) === Math.round(h) ? b : { w: width, h }));
        }}
        accessibilityRole="button"
        accessibilityLabel={`${WORDS.tell}. Send a note or an idea. Long-press to talk, drag to move.`}
        testID="feedback-button"
        style={({ pressed }) => [
          styles.tab,
          used ? styles.small : styles.full,
          { backgroundColor: pressed ? theme.colors.coralDeep : theme.colors.coral, borderBottomColor: theme.colors.coralLip },
        ]}>
        <MaterialCommunityIcons name="microphone-message" size={used ? 28 : 30} color={theme.colors.onCoral} />
        {used ? null : (
          <Text variant="labelLarge" numberOfLines={1} style={[styles.label, { color: theme.colors.onCoral }]} testID="feedback-button-label">
            {WORDS.tell}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', right: 0, zIndex: 20, alignItems: 'flex-end' },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 26,
    borderBottomLeftRadius: 26,
    borderBottomWidth: 4,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.28)',
  },
  full: { minWidth: FULL_MIN_WIDTH, minHeight: FULL_MIN_HEIGHT, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4, gap: 1 },
  small: { width: SMALL, height: SMALL, paddingLeft: 4 },
  label: { fontWeight: '800', textAlign: 'center' },
});
