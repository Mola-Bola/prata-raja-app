// The app's name for server text (emails, push, function replies). It comes from private_config.app_name, set by the
// migration 20260102000010_app_name.sql and changed with one SQL line on a rename (README "Renaming the app"), so no
// function ever carries the name as a literal. A warm function re-reads it once a minute (APP_NAME_TTL_MS). Pass the service-role client: private_config is not readable by users.
//   const name = await appName(admin);   // "Kampong", or the fallback when the row is missing or unreadable

/** The bit of a supabase-js client this needs (kept structural so it is testable without Deno or the network). */
export type ConfigReader = {
  from(table: 'private_config'): {
    select(cols: 'value'): {
      eq(col: 'key', value: 'app_name'): { maybeSingle(): PromiseLike<{ data: { value: string } | null; error: unknown }> };
    };
  };
};

/** Never empty: server text reads "Your … invite" with the fallback rather than a blank. */
export const APP_NAME_FALLBACK = 'the app';

/** How long a warm function keeps the name before reading the row again (a rename shows within this, no redeploy). */
export const APP_NAME_TTL_MS = 60_000;

/** One per warm function (one project), whichever client asks: functions that make their admin client per request still
 *  pay one lookup a minute, not one per call. */
let cache: { value: string; at: number } | null = null;

/** For tests: forget the kept name. */
export function forgetAppName(): void {
  cache = null;
}

/** The name from private_config.app_name, kept for APP_NAME_TTL_MS. A failed read is not kept, so it is retried next call. */
export async function appName(admin: ConfigReader, fallback = APP_NAME_FALLBACK, now = Date.now()): Promise<string> {
  if (cache && now - cache.at < APP_NAME_TTL_MS) return cache.value;
  try {
    const { data, error } = await admin.from('private_config').select('value').eq('key', 'app_name').maybeSingle();
    const value = !error && typeof data?.value === 'string' ? data.value.trim() : '';
    if (!value) return fallback;
    cache = { value, at: now };
    return value;
  } catch {
    return fallback;
  }
}
