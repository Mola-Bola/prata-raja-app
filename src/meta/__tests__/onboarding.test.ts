import { describe, expect, it } from 'vitest';

import { freshSaveV3 } from '../migrate';
import { nextStep, stationState } from '../onboarding';
import type { SaveV3 } from '../types';
import type { StationId } from '../../game/hub';

const IDS: StationId[] = ['tawa', 'dips', 'gear', 'pantry', 'spec', 'orders', 'kopi', 'exit'];
const at = (runs: number, over: Partial<SaveV3> = {}): SaveV3 => ({ ...freshSaveV3(), runs, ...over });
const openIds = (s: SaveV3) => IDS.filter((id) => stationState(s, id) === 'open');
const words = (s: string) => s.trim().split(/\s+/).length;
const socketed = { sockets: { kosong: ['sambal'] } } as unknown as Partial<SaveV3>;

describe('stationState', () => {
  it('opens stations run by run, with a reason while locked', () => {
    expect(openIds(at(0)).sort()).toEqual(['exit', 'tawa']);
    expect(stationState(at(0), 'gear')).toEqual({ locked: 'After run 3' });
    expect(openIds(at(1)).sort()).toEqual(['dips', 'exit', 'pantry', 'tawa']);
    expect(openIds(at(2))).toContain('orders');
    expect(openIds(at(2))).not.toContain('gear');
    expect(openIds(at(3))).toEqual(expect.arrayContaining(['gear', 'kopi']));
    expect(openIds(at(3))).not.toContain('spec');
    expect(openIds(at(5))).toHaveLength(8);
  });
  it('opens the spec board early for a player holding points', () => {
    expect(stationState(at(2, { specPoints: 1 }), 'spec')).toBe('open');
  });
});

describe('nextStep', () => {
  it('fresh save: go outside', () => expect(nextStep(at(0))).toMatchObject({ station: 'exit' }));
  it('after run 1: chest first, then a dip, then go again', () => {
    expect(nextStep(at(1, { pendingChests: ['x'] }))?.station).toBe('pantry');
    expect(nextStep(at(1))?.station).toBe('dips');
    expect(nextStep(at(1, socketed))).toMatchObject({ station: 'exit' });
  });
  it('after run 2 and 3 with a dip socketed: back to the street', () => {
    expect(nextStep(at(2, socketed))?.station).toBe('exit');
    expect(nextStep(at(3, socketed))?.station).toBe('exit');
  });
  it('mid-game: unspent spec points beat going out; a cookable meal comes after', () => {
    expect(nextStep(at(6, { ...socketed, specPoints: 2 }))?.station).toBe('spec');
    const m = Object.fromEntries(Object.keys(freshSaveV3().materials).map((k) => [k, 99]));
    expect(nextStep(at(6, { ...socketed, materials: m as SaveV3['materials'] }))?.station).toBe('kopi');
  });
  it('veteran with nothing pressing: null', () => expect(nextStep(at(40, socketed))).toBeNull());
  it('every line is 12 words or fewer', () => {
    for (const s of [at(0), at(1), at(1, { pendingChests: ['x'] }), at(6, { ...socketed, specPoints: 1 })]) expect(words(nextStep(s)!.line)).toBeLessThanOrEqual(12);
  });
});
