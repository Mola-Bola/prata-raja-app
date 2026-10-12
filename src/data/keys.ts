// All query keys in one place. Prefix-based invalidation relies on the first element (see invalidate.ts).
// Add your app's keys here as you add features, e.g. `things: () => ['things'] as const`.
export const qk = {
  profile: (id: string | null) => ['profile', id] as const,
  appConfig: () => ['app-config'] as const,
  authProviders: () => ['auth-providers'] as const,
};
