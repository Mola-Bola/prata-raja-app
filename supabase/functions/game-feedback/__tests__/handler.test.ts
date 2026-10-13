import { describe, expect, it } from 'vitest';
import { createHandler } from '../handler';

const DEVICE = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const ID = '3f2b8c1e-5a4d-4e6f-9a1b-0c2d3e4f5a6b';
const OTHER = 'aaaaaaaa-1111-4111-8111-111111111111';
const MESSAGE = 'bbbbbbbb-1111-4111-8111-111111111111';
const SECRET = `${ID}.${DEVICE}`;
const CODE = 'owner-pairing-code-with-32-characters';
const auth = { device_id: DEVICE, device_secret: SECRET };
const note = { ...auth, id: ID, chip: 'direction', body: 'Make dips clearer' };

// In-memory PostgREST boundary fake: filters, count, unique insert and projection inputs remain visible to tests.
function fixture(code: string | undefined = CODE) {
  const tables: Record<string, any[]> = { feedback: [], feedback_messages: [], private_config: [] };
  const uploads: unknown[] = [];
  const admin = { storage: { from: () => ({ upload: async (...args: unknown[]) => { uploads.push(args); return {}; } }) }, from: (table: string) => {
    let filters: ((row: any) => boolean)[] = [], single = false, head = false, limit = Infinity;
    let operation = 'select', values: any, order: string | undefined, ascending = true;
    const valueAt = (row: any, key: string) => key.includes('->>') ? row[key.split('->>')[0]]?.[key.split('->>')[1]] : row[key];
    const query: any = {
      select: (_columns: string, opts?: { head?: boolean }) => { head = !!opts?.head; return query; },
      eq: (key: string, value: unknown) => { filters.push((row) => valueAt(row, key) === value); return query; },
      gte: (key: string, value: string) => { filters.push((row) => row[key] >= value); return query; },
      in: (key: string, values: unknown[]) => { filters.push((row) => values.includes(row[key])); return query; },
      order: (key: string, opts: { ascending: boolean }) => { order = key; ascending = opts.ascending; return query; },
      limit: (n: number) => { limit = n; return query; },
      maybeSingle: () => { single = true; return query; },
      insert: (input: any) => { operation = 'insert'; values = input; return query; },
      update: (input: any) => { operation = 'update'; values = input; return query; },
      then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => Promise.resolve().then(() => {
        if (operation === 'insert') {
          const rows = Array.isArray(values) ? values : [values];
          const key = table === 'private_config' ? 'key' : 'id';
          if (rows.some((row) => tables[table].some((old) => old[key] === row[key]))) return { error: { code: '23505' } };
          tables[table].push(...rows.map((row) => ({ created_at: new Date().toISOString(), ...row })));
          return {};
        }
        let rows = tables[table].filter((row) => filters.every((f) => f(row)));
        if (operation === 'update') { rows.forEach((row) => Object.assign(row, values)); return {}; }
        if (order) rows = rows.slice().sort((a, b) => String(a[order!]).localeCompare(String(b[order!])) * (ascending ? 1 : -1));
        rows = rows.slice(0, limit);
        return { data: head ? null : single ? rows[0] ?? null : rows, count: rows.length };
      }).then(resolve, reject),
    };
    return query;
  } };
  const handler = createHandler(admin, async () => 'system-author', () => code);
  const send = async (data: unknown) => {
    const response = await handler(new Request('https://example.test', { method: 'POST', body: JSON.stringify(data) }));
    return { status: response.status, body: await response.json() };
  };
  return { tables, uploads, handler, send };
}

describe('game feedback handler capability boundary', () => {
  it('keeps legacy writes, but never exposes them through capability inboxes', async () => {
    const f = fixture();
    expect((await f.send({ ...note, device_secret: undefined })).status).toBe(200);
    expect((await f.send({ action: 'list', ...auth })).body.notes).toEqual([]);
    expect((await f.send({ action: 'reply', ...auth, id: ID, message_id: MESSAGE, body: 'hello' })).status).toBe(403);
  });

  it('lists only exact device capabilities and projects public fields, including thread status', async () => {
    const f = fixture();
    await f.send(note);
    const stored = f.tables.feedback[0];
    expect(stored.params.device_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(SECRET);
    stored.plan = 'Improve contrast'; stored.status = 'in_progress'; stored.shipped_in = null;
    f.tables.feedback_messages.push({ id: MESSAGE, feedback_id: ID, body: 'Picked up', author_label: 'Fleet', created_at: '2026-10-13', secret: 'private' });
    const response = await f.send({ action: 'list', ...auth });
    expect(response.body.notes[0]).toMatchObject({ id: ID, status: 'in_progress', plan: 'Improve contrast', messages: [{ id: MESSAGE, body: 'Picked up', author_label: 'Fleet' }] });
    expect(JSON.stringify(response)).not.toMatch(/device_hash|device_id|private|params|system-author/);
    expect((await f.send({ action: 'list', ...auth, device_secret: `${OTHER}.${DEVICE}` })).body.notes).toEqual([]);
    expect((await f.send({ action: 'list', ...auth, device_id: OTHER })).body.notes).toEqual([]);
  });

  it('checks ownership before retries, including note collision races', async () => {
    const f = fixture();
    expect((await f.send(note)).status).toBe(200);
    expect((await f.send(note)).status).toBe(200);
    expect((await f.send({ ...note, device_id: OTHER })).status).toBe(409);
    expect((await f.send({ ...note, device_secret: undefined })).status).toBe(409);
    expect((await f.send({ ...note, body: 'different' })).status).toBe(409);
    const raced = fixture();
    const results = await Promise.all([raced.send(note), raced.send({ ...note, device_id: OTHER })]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  it('replies idempotently and rejects cross-device access or conflicting message ids', async () => {
    const f = fixture(); await f.send(note);
    const message = { action: 'reply', ...auth, id: ID, message_id: MESSAGE, body: 'Follow-up' };
    expect((await f.send({ ...message, device_id: OTHER })).status).toBe(403);
    expect((await f.send(message)).status).toBe(200);
    expect((await f.send(message)).status).toBe(200);
    expect(f.tables.feedback_messages).toHaveLength(1);
    expect((await f.send({ ...message, body: 'replacement' })).status).toBe(409);
  });

  it('ignores owner spoofing and approves only notes from a paired capability', async () => {
    const f = fixture();
    await f.send({ ...note, owner: true, status: 'approved', params: { owner: true } });
    expect(f.tables.feedback[0]).not.toHaveProperty('status');
    expect(f.tables.feedback[0].params).not.toHaveProperty('owner');
    expect((await f.send({ action: 'owner', ...auth, code: 'wrong' })).status).toBe(403);
    expect((await f.send({ action: 'owner', ...auth, code: CODE })).body).toEqual({ ok: true, owner: true });
    expect((await f.send({ action: 'owner', ...auth, code: CODE })).status).toBe(200);
    expect((await f.send({ ...note, id: OTHER })).status).toBe(200);
    expect(f.tables.feedback[1]).toMatchObject({ status: 'approved', params: { owner: true } });
    expect((await f.send({ action: 'list', ...auth })).body.owner).toBe(true);
    expect(JSON.stringify(f.tables.private_config)).not.toContain(CODE);
  });

  it('redeems a code atomically once, including concurrent distinct devices', async () => {
    const f = fixture();
    const results = await Promise.all([
      f.send({ action: 'owner', ...auth, code: CODE }),
      f.send({ action: 'owner', ...auth, device_id: OTHER, code: CODE }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(f.tables.private_config).toHaveLength(2);
    expect((await f.send({ action: 'owner', ...auth, device_id: OTHER, code: CODE })).status).toBe(409);
    expect((await fixture('').send({ action: 'owner', ...auth, code: CODE })).status).toBe(503);
  });

  it('limits replies and notes while allowing successful retries at the limit', async () => {
    const f = fixture(); await f.send(note);
    const message = { action: 'reply', ...auth, id: ID, message_id: MESSAGE, body: 'reply' };
    await f.send(message);
    for (let i = 0; i < 11; i++) f.tables.feedback_messages.push({ feedback_id: ID, author_id: 'system-author', created_at: new Date().toISOString() });
    expect((await f.send(message)).status).toBe(200);
    expect((await f.send({ ...message, message_id: OTHER })).status).toBe(429);
    for (let i = 0; i < 5; i++) f.tables.feedback.push({ params: { src: 'game', device_id: DEVICE }, created_at: new Date().toISOString() });
    expect((await f.send(note)).status).toBe(200);
    expect((await f.send({ ...note, id: OTHER })).status).toBe(429);
  });

  it('applies the global reply cap and returns redacted backend errors', async () => {
    const f = fixture(); await f.send(note);
    for (let i = 0; i < 120; i++) f.tables.feedback_messages.push({ feedback_id: OTHER, author_id: 'system-author', created_at: new Date().toISOString() });
    expect((await f.send({ action: 'reply', ...auth, id: ID, message_id: MESSAGE, body: 'hello' })).status).toBe(429);
    const broken = createHandler({ from: () => { throw new Error('secret backend detail'); } }, async () => 'author', () => CODE);
    const result = await broken(new Request('https://example.test', { method: 'POST', body: JSON.stringify(note) }));
    expect(result.status).toBe(500);
    expect(await result.json()).toEqual({ ok: false, error: 'server' });
  });

  it('validates screenshot bytes and uses the existing private storage convention', async () => {
    const f = fixture();
    expect((await f.send({ ...note, screenshot: 'data:image/jpeg;base64,bm90LWpwZWc=' })).status).toBe(400);
    expect((await f.send({ ...note, screenshot: 'data:image/jpeg;base64,/9j/2Q===' })).status).toBe(400);
    expect((await f.send({ ...note, screenshot: 'data:image/jpeg;base64,A' })).status).toBe(400);
    expect((await f.send({ ...note, screenshot: 'data:image/jpeg;base64,/9j/2Q==' })).status).toBe(200);
    expect(f.uploads).toHaveLength(1);
    expect(f.tables.feedback[0].screenshot_path).toBe(`system-author/${ID}.jpg`);
    expect((await f.send({ ...note, screenshot: 'x'.repeat(190 * 1024) })).status).toBe(400);
  });

  it('bounds streamed body before parsing and rejects unsupported operations', async () => {
    const f = fixture();
    expect((await f.send({ x: 'x'.repeat(201 * 1024) })).status).toBe(413);
    expect((await f.send({ action: 'delete', ...auth })).status).toBe(400);
    expect((await f.send({ action: 'list', device_id: DEVICE })).status).toBe(400);
    expect((await f.send({ ...note, chip: 'toString' })).status).toBe(400);
  });
});
