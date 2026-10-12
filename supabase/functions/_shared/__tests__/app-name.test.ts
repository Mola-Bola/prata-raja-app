import { beforeEach, describe, expect, it } from 'vitest';

import { APP_NAME_FALLBACK, APP_NAME_TTL_MS, appName, type ConfigReader, forgetAppName } from '../app-name';

/** A fake service-role client whose private_config lookup answers `answer` (or throws it). */
const client = (answer: { data: { value: string } | null; error: unknown } | Error): ConfigReader & { asked: string[] } => {
  const asked: string[] = [];
  return {
    asked,
    from: (table) => ({
      select: (cols) => ({
        eq: (col, value) => {
          asked.push(`${table}.${cols} where ${col}=${value}`);
          return { maybeSingle: () => (answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer)) };
        },
      }),
    }),
  };
};

describe('appName (edge functions take the name from private_config.app_name)', () => {
  beforeEach(forgetAppName);

  it('reads the app_name row', async () => {
    const c = client({ data: { value: ' Fixture Name ' }, error: null });
    expect(await appName(c)).toBe('Fixture Name');
    expect(c.asked).toEqual(['private_config.value where key=app_name']);
  });

  it('falls back when the row is missing, empty, unreadable or the call fails', async () => {
    expect(await appName(client({ data: null, error: null }))).toBe(APP_NAME_FALLBACK);
    expect(await appName(client({ data: { value: '  ' }, error: null }))).toBe(APP_NAME_FALLBACK);
    expect(await appName(client({ data: null, error: { code: '42501' } }))).toBe(APP_NAME_FALLBACK);
    expect(await appName(client(new Error('network')), 'us'))
      .toBe('us');
  });

  it('keeps the name for a minute, whichever client asks, then reads it again; a failed read is not kept', async () => {
    const c = client({ data: { value: 'Cached' }, error: null });
    expect(await appName(c, undefined, 1_000)).toBe('Cached');
    expect(await appName(c, undefined, 1_000 + APP_NAME_TTL_MS - 1)).toBe('Cached');
    expect(await appName(client({ data: { value: 'Other' }, error: null }), undefined, 2_000)).toBe('Cached');
    expect(c.asked).toHaveLength(1);
    expect(await appName(c, undefined, 1_000 + APP_NAME_TTL_MS)).toBe('Cached');
    expect(c.asked).toHaveLength(2);
    forgetAppName();
    const failing = client(new Error('network'));
    await appName(failing, undefined, 0);
    await appName(failing, undefined, 0);
    expect(failing.asked).toHaveLength(2);
  });
});
