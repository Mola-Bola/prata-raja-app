import { LIMITS, parseNote, rateVerdict, rowFor, UUID, validSecret } from './logic.ts';

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization, apikey, x-client-info', 'access-control-max-age': '86400' };
const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
  status, headers: { ...CORS, 'content-type': 'application/json', 'cache-control': 'no-store' },
});
const error = (status: number, message: string) => reply(status, { ok: false, error: message });
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), (b) => b.toString(16).padStart(2, '0')).join('');
const same = (a: string, b: string) => { let diff = a.length ^ b.length; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0; };
const checked = <T extends { error?: unknown }>(result: T): T => { if (result.error) throw new Error('database'); return result; };

// SDK fluent builder is injected so boundary tests exercise the real handler without Deno/network.
// deno-lint-ignore no-explicit-any
export function createHandler(admin: any, authorId: () => Promise<string>, ownerCode: () => string | undefined) {
  const config = async (key: string) => checked(await admin.from('private_config').select('value').eq('key', key).maybeSingle()).data?.value;
  const knownNote = async (id: string) => checked(await admin.from('feedback').select('id,body,params').eq('id', id).maybeSingle()).data;
  const owns = (note: { params?: Record<string, unknown> } | null, device: string, capability: string | null) =>
    !!note && note.params?.src === 'game' && note.params?.device_id === device && (note.params?.device_hash ?? null) === capability;
  const count = async (query: PromiseLike<{ count: number | null; error: unknown }>) => checked(await query).count ?? 0;

  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') return error(405, 'use POST');
    if (Number(req.headers.get('content-length')) > LIMITS.request) return error(413, 'too large');
    let raw: Record<string, unknown>;
    try {
      const reader = req.body?.getReader();
      if (!reader) return error(400, 'not json');
      const chunks: Uint8Array[] = []; let length = 0;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        length += value.length;
        if (length > LIMITS.request) { await reader.cancel(); return error(413, 'too large'); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      raw = JSON.parse(new TextDecoder().decode(bytes));
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return error(400, 'not an object');
    } catch { return error(400, 'not json'); }
    const action = raw.action ?? 'note';
    if (!['note', 'list', 'reply', 'owner'].includes(action as string)) return error(400, 'action');
    if (typeof raw.device_id !== 'string' || !UUID.test(raw.device_id)) return error(400, 'device_id');
    if ((action !== 'note' || raw.device_secret !== undefined) && !validSecret(raw.device_secret)) return error(400, 'device_secret');
    const device = raw.device_id.toLowerCase();
    try {
      const capability = validSecret(raw.device_secret) ? await hash(`${device}:${raw.device_secret.toLowerCase()}`) : null;
      const ownerKey = `game_feedback_owner:${capability}`;
      const owner = capability !== null && await config(ownerKey) === device;
      if (action === 'owner') {
        const configured = ownerCode();
        if (!configured || configured.length < 32 || configured.length > 256) return error(503, 'owner setup unavailable');
        if (typeof raw.code !== 'string' || raw.code.length > 256 || !same(await hash(raw.code), await hash(configured))) return error(403, 'invalid owner code');
        const redemption = `game_feedback_redeemed:${await hash(configured)}`;
        if (owner && await config(redemption) === capability) return reply(200, { ok: true, owner: true });
        // One INSERT is one transaction: neither registration nor redemption can win alone.
        const result = await admin.from('private_config').insert([{ key: ownerKey, value: device }, { key: redemption, value: capability }]);
        if (result.error && result.error.code !== '23505') throw new Error('database');
        if (result.error && !(await config(ownerKey) === device && await config(redemption) === capability)) return error(409, 'owner code already used');
        return reply(200, { ok: true, owner: true });
      }
      if (action === 'list') {
        const { data } = checked(await admin.from('feedback').select('id,body,params,status,plan,shipped_in,created_at')
          .eq('params->>src', 'game').eq('params->>device_id', device).eq('params->>device_hash', capability)
          .order('created_at', { ascending: false }).limit(50));
        const notes = data ?? [];
        const messages = notes.length ? checked(await admin.from('feedback_messages').select('id,feedback_id,body,author_label,created_at')
          .in('feedback_id', notes.map((n: { id: string }) => n.id)).order('created_at', { ascending: false }).limit(500)).data ?? [] : [];
        return reply(200, { ok: true, owner, notes: notes.map((n: Record<string, any>) => ({
          id: n.id, body: n.body, chip: n.params.chip, status: n.status, plan: n.plan, shipped_in: n.shipped_in, created_at: n.created_at,
          messages: messages.filter((m: { feedback_id: string }) => m.feedback_id === n.id).reverse().map((m: Record<string, unknown>) => ({
            id: m.id, body: m.body, author_label: m.author_label, created_at: m.created_at,
          })),
        })) });
      }
      const since = new Date(Date.now() - 3_600_000).toISOString();
      if (action === 'reply') {
        if (typeof raw.id !== 'string' || !UUID.test(raw.id) || typeof raw.message_id !== 'string' || !UUID.test(raw.message_id) ||
          typeof raw.body !== 'string' || !raw.body.trim() || raw.body.length > LIMITS.body || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(raw.body)) return error(400, 'reply');
        const id = raw.id.toLowerCase(), messageId = raw.message_id.toLowerCase(), body = raw.body.trim();
        if (!owns(await knownNote(id), device, capability)) return error(403, 'not your note');
        const author = await authorId();
        const existing = async () => checked(await admin.from('feedback_messages').select('feedback_id,body,author_id').eq('id', messageId).maybeSingle()).data;
        const matches = (m: Record<string, unknown>) => m.feedback_id === id && m.body === body && m.author_id === author;
        const known = await existing();
        if (known) return matches(known) ? reply(200, { ok: true, id, message_id: messageId }) : error(409, 'message id conflict');
        // shortcut: count-based guards may overshoot under concurrency; use a transactional limiter if abuse appears.
        const perNote = await count(admin.from('feedback_messages').select('id', { count: 'exact', head: true }).eq('feedback_id', id).eq('author_id', author).gte('created_at', since));
        const global = await count(admin.from('feedback_messages').select('id', { count: 'exact', head: true }).eq('author_id', author).gte('created_at', since));
        if (perNote >= 12 || global >= 120) return error(429, 'slow down');
        const result = await admin.from('feedback_messages').insert({ id: messageId, feedback_id: id, author_id: author, author_label: owner ? 'Owner' : 'In-game', body });
        if (result.error?.code === '23505') { const raced = await existing(); if (!raced || !matches(raced)) return error(409, 'message id conflict'); }
        else checked(result);
        return reply(200, { ok: true, id, message_id: messageId });
      }
      const parsed = parseNote(raw);
      if (!parsed.ok) return error(400, parsed.error);
      const note = parsed.note;
      const known = await knownNote(note.id);
      if (known && (!owns(known, device, capability) || known.body !== note.body)) return error(409, 'note id conflict');
      if (!known) {
        const verdict = rateVerdict({
          device: await count(admin.from('feedback').select('id', { count: 'exact', head: true }).eq('params->>device_id', device).gte('created_at', since)),
          global: await count(admin.from('feedback').select('id', { count: 'exact', head: true }).eq('params->>src', 'game').gte('created_at', since)),
        });
        if (verdict !== 'ok') return error(429, verdict === 'device' ? 'slow down' : 'busy');
        const row = rowFor(note, await authorId());
        const result = await admin.from('feedback').insert({ ...row, ...(owner ? { status: 'approved' } : {}),
          params: { ...row.params, ...(capability ? { device_hash: capability } : {}), ...(owner ? { owner: true } : {}) } });
        if (result.error?.code === '23505') {
          const raced = await knownNote(note.id);
          if (!owns(raced, device, capability) || raced.body !== note.body) return error(409, 'note id conflict');
        } else checked(result);
      }
      if (note.screenshot) {
        const path = `${await authorId()}/${note.id}.jpg`;
        const bytes = Uint8Array.from(atob(note.screenshot.slice(23)), (c) => c.charCodeAt(0));
        checked(await admin.storage.from('feedback').upload(path, bytes, { contentType: 'image/jpeg', upsert: true }));
        checked(await admin.from('feedback').update({ screenshot_path: path }).eq('id', note.id));
      }
      return reply(200, { ok: true, id: note.id });
    } catch { return error(500, 'server'); }
  };
}
