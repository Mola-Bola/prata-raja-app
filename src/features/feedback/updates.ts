// Thin wrapper over expo-updates so screens never touch it directly (and web stays a no-op).
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

export const updatesSupported = Platform.OS !== 'web' && Updates.isEnabled;

export function currentUpdateId(): string | null {
  if (!updatesSupported) return null;
  return Updates.isEmbeddedLaunch ? 'built-in' : (Updates.updateId ?? null);
}

export function runtimeVersion(): string | null {
  return updatesSupported ? (Updates.runtimeVersion ?? null) : null;
}

/** Origin of the update server (e.g. http://<mac-ip>:8082), from app.json updates.url. */
export function updatesOrigin(): string | null {
  const url = (Constants.expoConfig?.updates as { url?: string } | undefined)?.url;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Check the server and download any newer update. Returns true when one is ready to apply. */
export async function checkAndFetch(): Promise<boolean> {
  if (!updatesSupported) return false;
  try {
    const res = await Updates.checkForUpdateAsync();
    if (!res.isAvailable) return false;
    const fetched = await Updates.fetchUpdateAsync();
    return fetched.isNew;
  } catch {
    return false;
  }
}

export async function applyUpdate() {
  if (updatesSupported) await Updates.reloadAsync();
}

export type NativeLatest = { runtimeVersion: string; version: string; apkUrl: string | null; notes: string; createdAt: string };

/** Where to ask about a newer native build: the local server uses /api/native-latest, the cloud function /updates/native-latest. */
function nativeLatestUrl(): string | null {
  const url = (Constants.expoConfig?.updates as { url?: string } | undefined)?.url;
  if (!url) return null;
  return url.endsWith('/api/manifest') ? url.replace(/\/api\/manifest$/, '/api/native-latest') : `${url.replace(/\/$/, '')}/native-latest`;
}

/** A newer native build (needs a new APK) if the server has one for a higher runtime version. */
export async function newerNativeBuild(): Promise<NativeLatest | null> {
  const endpoint = nativeLatestUrl();
  if (Platform.OS !== 'android' || !endpoint) return null;
  try {
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const latest = (await res.json()) as NativeLatest;
    const mine = Number(runtimeVersion() ?? Constants.expoConfig?.runtimeVersion ?? 0);
    return Number(latest.runtimeVersion) > mine ? latest : null;
  } catch {
    return null;
  }
}

export { Updates };
