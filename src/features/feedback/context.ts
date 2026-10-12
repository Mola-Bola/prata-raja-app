// Captures "where was I?" for a feedback note: route, params, a friendly screen name, platform, versions.
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useGlobalSearchParams, usePathname } from 'expo-router';
import { Platform } from 'react-native';

import type { FeedbackContext } from '@/data';
import { extensions } from '@/ext/registry';
import { APP_ID } from '@/ui/labels';

import { moduleForRoute } from './module';
import { currentUpdateId } from './updates';

// Friendly names for the screens a note can be written on. Add a line per screen as you add routes.
const NAMES: [RegExp, string][] = [
  [/^\/$/, 'Home'],
  [/^\/me$/, 'Me'],
  [/^\/feedback/, 'Feedback'],
  [/^\/whats-new$/, 'What’s new'],
];

export function screenName(route: string): string {
  const known = NAMES.find(([re]) => re.test(route))?.[1];
  if (known) return known;
  // Inside an extension a note's screen reads as the extension's name until the extension names its own screens.
  const mod = moduleForRoute(route, extensions.map((e) => e.id), APP_ID);
  return extensions.find((e) => e.id === mod)?.name ?? route;
}

/** The screen's friendly name, for a note's one-line summary. */
export function describe(ctx: Pick<FeedbackContext, 'route' | 'params' | 'screen'>): string {
  return ctx.screen ?? screenName(ctx.route);
}

/** Live context for the current screen. */
export function useScreenContext(): FeedbackContext {
  const route = usePathname();
  const raw = useGlobalSearchParams();
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === 'string') params[k] = v;
  const screen = screenName(route);
  return {
    route,
    params,
    screen,
    module: moduleForRoute(route, extensions.map((e) => e.id), APP_ID),
    platform: Platform.OS === 'web' ? 'web' : `${Platform.OS} ${Platform.Version}`,
    appVersion: Constants.expoConfig?.version ?? null,
    updateId: currentUpdateId(),
    device: Platform.OS === 'web' ? (globalThis.navigator?.userAgent?.slice(0, 120) ?? null) : [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || null,
  };
}
