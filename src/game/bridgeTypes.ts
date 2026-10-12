// What the game asks the phone for. The game runs in a DOM component (a WebView on Android), so everything here is an
// async function with JSON-only arguments and results: that is the one shape Expo can carry across (see GameRoot.tsx).
export type HapticKind = 'light' | 'medium' | 'heavy' | 'success';
export type TrackProps = Record<string, string | number | boolean>;

export type Bridge = {
  haptic(kind: HapticKind): Promise<void>;
  /** Keep a JSON string under a key (the game's own save slots; never the app's account data). */
  save(key: string, json: string): Promise<void>;
  load(key: string): Promise<string | null>;
  track(event: string, props: TrackProps): Promise<void>;
};
