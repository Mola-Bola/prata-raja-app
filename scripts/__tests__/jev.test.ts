import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { judge } from '../jev.mjs';

const directories: string[] = [];
afterEach(async () => { vi.useRealTimers(); await Promise.all(directories.splice(0).map((p) => rm(p, { recursive: true, force: true }))); });
async function options(choice = 'bug') {
  const logDirectory = await mkdtemp(join(tmpdir(), 'prata-jev-'));
  directories.push(logDirectory);
  const fetch = vi.fn(async (_url: string, request: RequestInit) => {
    const labels = Object.keys(JSON.parse(request.body as string).questions.decision.criteria);
    return { ok: true, json: async () => ({ model: 'jev-latest', usage: { input_tokens: 10, output_tokens: 2 },
      answers: { decision: { type: 'choice', choice, confidence: 0.9,
        probabilities: Object.fromEntries(labels.map((label) => [label, label === choice ? 1 : 0])) } } }) };
  });
  return { apiKey: 'secret-sentinel', fetch, logDirectory };
}

describe('fleet Jev advisory choices', () => {
  it.each(['classify', 'dedupe', 'overlap', 'model-tier', 'regression'])('uses fixed provider schema for %s', async (task) => {
    const choice = ({ classify: 'bug', dedupe: 'candidate_0', overlap: 'candidate_0', 'model-tier': 'standard', regression: 'yes' })[task];
    const opts = await options(choice);
    const candidates = ['dedupe', 'overlap'].includes(task) ? [{ id: 'row-private', text: 'candidate-private' }] : [];
    const result = await judge({ task, text: 'note-private', candidates }, opts);
    expect(result).toMatchObject({ status: 'advisory', choice });
    if (candidates.length) expect(result.candidateId).toBe('row-private');
    const [url, request] = opts.fetch.mock.calls[0];
    expect(url).toBe('https://api.typesafe.ai/v1/systemone');
    expect(request.redirect).toBe('error');
    const log = await readFile(join(opts.logDirectory, (await readdir(opts.logDirectory))[0]), 'utf8');
    for (const secret of ['secret-sentinel', 'note-private', 'candidate-private', 'row-private']) expect(log).not.toContain(secret);
    expect(JSON.parse(log)).toMatchObject({ task, outcome: 'ok', attempted: true, usage: { input_tokens: 10, output_tokens: 2 } });
  });

  it.each([null, {}, { task: 'other', text: 'x' }, { task: 'classify', text: '' },
    { task: 'dedupe', text: 'x', candidates: [{ id: 'same', text: 'a' }, { id: 'same', text: 'b' }] },
    { task: 'regression', text: 'x', candidates: [{ id: 'x', text: 'a' }] }])('rejects invalid input without network', async (input) => {
    const opts = await options();
    expect(await judge(input, opts)).toMatchObject({ status: 'lead_required', choice: null, reason: 'invalid_input' });
    expect(opts.fetch).not.toHaveBeenCalled();
  });

  it('requires lead judgement on missing config, abstention and invalid provider data', async () => {
    const input = { task: 'classify', text: 'x' };
    expect((await judge(input, { ...await options(), apiKey: '' })).reason).toBe('missing_config');
    expect((await judge(input, await options('lead'))).reason).toBe('abstained');
    expect((await judge(input, await options('invented'))).reason).toBe('invalid_answer');
    const opts = await options();
    opts.fetch.mockResolvedValue({ ok: true, json: async () => ({ answers: { decision: { type: 'choice', choice: 'bug' } } }) } as never);
    expect((await judge(input, opts)).reason).toBe('invalid_answer');
  });

  it('rejects malformed probabilities and HTTP failures', async () => {
    const opts = await options();
    opts.fetch.mockResolvedValueOnce({ ok: false } as never);
    expect((await judge({ task: 'classify', text: 'x' }, opts)).reason).toBe('http_error');
    opts.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ model: 'jev-latest', usage: { input_tokens: 1, output_tokens: 1 },
      answers: { decision: { type: 'choice', choice: 'bug', confidence: 0.9, probabilities: { bug: 1 } } } }) } as never);
    expect((await judge({ task: 'classify', text: 'x' }, opts)).reason).toBe('invalid_answer');
  });

  it('requires lead judgement when the call cannot be logged', async () => {
    const opts = await options();
    const blocked = join(opts.logDirectory, 'file');
    await writeFile(blocked, '');
    expect(await judge({ task: 'classify', text: 'x' }, { ...opts, logDirectory: blocked })).toEqual({
      status: 'lead_required', choice: null, reason: 'log_failed', attempted: true,
    });
  });

  it('redacts provider errors and requires lead judgement', async () => {
    const opts = await options();
    opts.fetch.mockRejectedValue(new Error('secret-sentinel'));
    expect(await judge({ task: 'classify', text: 'x' }, opts)).toEqual({ status: 'lead_required', choice: null, reason: 'network_error' });
  });

  it('bounds even a response body that ignores abort', async () => {
    const opts = await options();
    opts.fetch.mockResolvedValue({ ok: true, json: () => new Promise(() => {}) } as never);
    vi.useFakeTimers();
    const pending = judge({ task: 'classify', text: 'x' }, opts);
    await vi.advanceTimersByTimeAsync(801);
    expect(await pending).toEqual({ status: 'lead_required', choice: null, reason: 'timeout' });
  });
});
