import { lazy, Suspense } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bridge } from '@/game/bridge';
import { GAME_BG } from '@/game/config';

// Loaded on demand, so the sign-in and everyday screens don't download the game engine (web: a separate chunk).
const GameRoot = lazy(() => import('@/game/GameRoot'));

/** The game, full screen, no account needed. The game itself is a DOM component (src/game/GameRoot.tsx). */
export default function Play() {
  const insets = useSafeAreaInsets();
  return (
    // The page behind the WebView is the game's colour, so nothing white shows while it starts.
    <View style={{ flex: 1, backgroundColor: GAME_BG }} testID="play">
      <Suspense fallback={null}>
        <GameRoot {...bridge} insets={insets} dom={{ showsVerticalScrollIndicator: false, showsHorizontalScrollIndicator: false, mediaPlaybackRequiresUserAction: false }} />
      </Suspense>
    </View>
  );
}
