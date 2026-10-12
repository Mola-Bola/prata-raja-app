'use dom';

// The whole game, as ONE full-screen Expo DOM component: a Phaser 4 canvas for play plus plain React DOM on top of it for
// menus and the HUD. On Android/iOS Expo runs this file in a WebView (its own JS engine); on web it is an ordinary
// component, and `dom` is ignored. The phone reaches the game only through the async function props below (the
// "bridge", src/game/bridge.ts). A DOM component can only have one default export (types are fine), so keep this
// file small and put game code in src/game/phaser/ (the scenes) and src/game/ui/ (the overlay).
import * as Phaser from 'phaser';
import { useEffect, useMemo, useRef, type CSSProperties } from 'react';

import type { Bridge } from './bridgeTypes';
import { GAME_BG } from './config';
import { installFonts } from './fonts';
import { createHub, type Hub } from './hub';
import { BootScene } from './phaser/BootScene';
import { RunScene } from './phaser/RunScene';
import { GameUi } from './ui/GameUi';

type Insets = { top: number; right: number; bottom: number; left: number };

// Functions can only cross to the WebView as TOP-LEVEL props (a nested `bridge={{ haptic }}` arrives with its functions
// stripped), so the bridge is spread into the props: <GameRoot {...bridge} />. The game gets them back as one object.
type Props = Bridge & {
  /** Safe-area insets in px, measured by the app: an Android WebView does not report env(safe-area-inset-*). */
  insets?: Insets;
  dom?: import('expo/dom').DOMProps;
};

declare global {
  interface Window {
    /** The running Phaser game, for tests (Playwright reads window.__game.loop.actualFps) and the console. */
    __game?: Phaser.Game;
    /** The renderer/overlay seam, for tests: window.__hub.controls.start(seed). */
    __hub?: Hub;
  }
}

installFonts();

/** The overlay reads --gu-safe-* (see GameUi.css): the app's measured inset, but never less than what the browser reports. */
const safe = (side: keyof Insets, insets?: Insets) => `max(env(safe-area-inset-${side}, 0px), ${insets?.[side] ?? 0}px)`;

export default function GameRoot({ haptic, save, load, track, insets }: Props) {
  const parent = useRef<HTMLDivElement>(null);
  // The app re-sends props (new function objects each time), but the game is created once: it holds this stable
  // facade, which always calls the newest functions.
  const latest = useRef<Bridge>({ haptic, save, load, track });
  useEffect(() => {
    latest.current = { haptic, save, load, track };
  });
  const bridge = useMemo<Bridge>(
    () => ({
      haptic: (kind) => latest.current.haptic(kind),
      save: (key, json) => latest.current.save(key, json),
      load: (key) => latest.current.load(key),
      track: (event, props) => latest.current.track(event, props),
    }),
    [],
  );
  // The seam between the Phaser scenes and the React overlay (see hub.ts).
  const hub = useMemo(() => createHub(), []);

  useEffect(() => {
    const el = parent.current;
    if (!el) return;
    // Render at the screen's pixel density, but never above 2x: past that the extra pixels cost more than they show.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const g = new Phaser.Game({
      type: Phaser.WEBGL,
      parent: el,
      backgroundColor: GAME_BG,
      transparent: false,
      antialias: true,
      disableContextMenu: true,
      banner: false,
      audio: { noAudio: true }, // sound is zzfx's job (its own AudioContext), so Phaser's sound manager stays off
      // Sprites scale all the time (perspective), so they need mipmaps or small ones shimmer. The atlas pages are power of
      // two, which is what WebGL1 needs to build them (scene art and text stay unmipmapped: not power of two).
      render: { mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
      // EXPAND: the canvas keeps this pixel size (CSS size x dpr) and grows to fill the screen when its shape changes.
      scale: {
        mode: Phaser.Scale.EXPAND,
        width: Math.round((el.clientWidth || window.innerWidth) * dpr),
        height: Math.round((el.clientHeight || window.innerHeight) * dpr),
      },
      scene: [BootScene, RunScene],
    });
    g.registry.set('hub', hub);
    g.registry.set('bridge', bridge);
    window.__game = g;
    window.__hub = hub;

    // A line in the WebView's console (adb logcat shows it as `chromium`) so Android FPS can be read without a screenshot.
    const poll = window.setInterval(() => {
      console.log('[game]', JSON.stringify({ fps: Math.round(g.loop.actualFps), width: g.scale.width, height: g.scale.height, loadMs: g.registry.get('loadMs') ?? null }));
    }, 5000);

    return () => {
      window.clearInterval(poll);
      hub.controls = null;
      g.destroy(true); // asynchronous: the engine finishes tearing down on its next step
      g.loop.wake(); // ...and a loop asleep (no run on screen) has no next step, so wake it to finish the job
      if (window.__game === g) delete window.__game;
      if (window.__hub === hub) delete window.__hub;
    };
  }, [hub, bridge]);

  return (
    <div
      data-testid="game-root"
      style={{
        position: 'fixed',
        inset: 0,
        height: '100dvh',
        // A phone-shaped column: full width on a phone, centred (never wider than 9:16) on a desktop browser.
        width: 'min(100%, calc(100dvh * 9 / 16))',
        margin: '0 auto',
        overflow: 'hidden',
        background: GAME_BG,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        overscrollBehavior: 'none',
        // An Android WebView reports no env(safe-area-inset-*), so the app's measured insets go in here for the overlay.
        ...({
          '--gu-safe-top': safe('top', insets),
          '--gu-safe-right': safe('right', insets),
          '--gu-safe-bottom': safe('bottom', insets),
          '--gu-safe-left': safe('left', insets),
        } as CSSProperties),
      }}
    >
      {/* Flex, so the canvas is a block and not a character on a text baseline: an inline canvas leaves 4 px under it, which gave
          this whole box 4 px of hidden scroll (a focus or scrollIntoView then shifted every screen by 4 px). */}
      <div ref={parent} style={{ position: 'absolute', inset: 0, display: 'flex', overflow: 'hidden' }} />
      {/* The overlay ignores touches (they go to the game) except on its own buttons. */}
      <GameUi hub={hub} bridge={bridge} />
    </div>
  );
}
