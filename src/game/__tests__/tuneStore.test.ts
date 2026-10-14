import { beforeEach, describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';

const mem: Record<string, string> = {};
(globalThis as any).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
const { getOverrides, isTuned, setOverrides, tunedContent, tuneJson } = await import('../tuneStore');

describe('tuneStore', () => {
  beforeEach(() => setOverrides({}));
  it('persists under prata-raja/tune only, resets cleanly, never touches saves', () => {
    expect(tunedContent()).toBe(CONTENT);
    setOverrides({ 'enemies.all.speed': 2 });
    expect(isTuned()).toBe(true);
    expect(Object.keys(mem)).toEqual(['prata-raja/tune']);
    expect(tunedContent()).not.toBe(CONTENT);
    expect(JSON.parse(tuneJson()).overrides).toEqual({ 'enemies.all.speed': 2 });
    setOverrides({});
    expect(getOverrides()).toEqual({});
    expect(Object.keys(mem)).toEqual([]);
  });
});
