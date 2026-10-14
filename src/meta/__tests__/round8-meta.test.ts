import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { makeRng } from '../../core/rng';
import { createRun } from '../../core/sim';
import { computeLoadout } from '../loadout';
import { mealLabel, cookMeal, canCookMeal, MEALS } from '../meals';
import { freshSaveV3, migrateMeta, parseSaveV3 } from '../migrate';
import { applyRunResult } from '../runRewards';
import { addSocket, MAX_SOCKETS, socketCount, socketDip, socketsOf, startDips } from '../sockets';
import { allocate, allocateBlock, canAllocate, respec, SPEC_NODES, specStats } from '../specTree';
import type { SaveV3 } from '../types';

const roundTrip = (s: SaveV3) => parseSaveV3(JSON.stringify(s));
const withPoints = (n: number): SaveV3 => ({ ...freshSaveV3(), specPoints: n });
const learn = (s: SaveV3, ...ids: string[]) => ids.reduce((a, id) => allocate(a, id), s);

describe('migration of sockets / spec / meal', () => {
  it('fresh and old saves get defaults', () => {
    const f = freshSaveV3();
    expect([f.sockets, f.spec, f.meal]).toEqual([{}, { nodes: [] }, null]);
    const { sockets, spec, meal, ...old } = f;
    void sockets; void spec; void meal;
    const back = parseSaveV3(JSON.stringify(old));
    expect([back.sockets, back.spec, back.meal]).toEqual([{}, { nodes: [] }, null]);
  });
  it('is idempotent and keeps good data', () => {
    const s = { ...learn(withPoints(5), 'hands-1', 'crisp-1'), sockets: { kosong: ['fish-curry'] }, meal: { id: 'mee-goreng' } } as SaveV3;
    const once = roundTrip(s);
    expect(once.spec.nodes).toEqual(['hands-1', 'crisp-1']);
    expect(once.sockets).toEqual({ kosong: ['fish-curry'] });
    expect(once.meal).toEqual({ id: 'mee-goreng' });
    expect(roundTrip(once)).toEqual(once);
  });
  it('cleans junk, dropping only from these fields', () => {
    const m = migrateMeta({ sockets: { kosong: ['nope', 'fish-curry', 'fish-curry', 'masala'], ghost: ['fish-curry'], tissue: 'x' }, spec: { nodes: ['hands-1', 'bogus', 7, 'hands-1'] }, meal: { id: 'nope' } });
    expect(m.sockets).toEqual({ kosong: [null, 'fish-curry', null] });
    expect(m.spec.nodes).toEqual(['hands-1']);
    expect(m.meal).toBeNull();
    expect(migrateMeta({ sockets: 5, spec: [], meal: 'x' })).toEqual({ sockets: {}, spec: { nodes: [] }, meal: null });
    const s = { ...freshSaveV3(), gold: 77, specPoints: 4 };
    const back = parseSaveV3(JSON.stringify({ ...s, sockets: 'junk', spec: 9 }));
    expect(back.gold).toBe(77);
    expect(back.specPoints).toBe(4);
  });
});

describe('sockets', () => {
  const dipped: SaveV3 = { ...freshSaveV3(), unlocks: { signature: true } };
  const master: SaveV3 = { ...dipped, kannanXp: 99999 };
  it('counts: base, mastery +1, forge +1, cap 3', () => {
    expect(socketCount(dipped, 'kosong')).toBe(1);
    expect(socketCount(dipped, 'thosai')).toBe(2);
    expect(socketCount(master, 'kosong')).toBe(2);
    expect(socketCount(master, 'murtabak')).toBe(MAX_SOCKETS);
    const rich = { ...dipped, gold: 9999, materials: { ...dipped.materials, ghee: 99 } };
    const a = addSocket(rich, 'kosong');
    expect(socketCount(a, 'kosong')).toBe(2);
    expect(a.gold).toBeLessThan(rich.gold);
    expect(socketCount(addSocket(addSocket(a, 'kosong'), 'kosong'), 'kosong')).toBe(3);
    expect(addSocket(addSocket(addSocket(a, 'kosong'), 'kosong'), 'kosong').gold).toBe(rich.gold - 800); // third add refused at the cap
    expect(addSocket(dipped, 'kosong')).toBe(dipped);
  });
  it('socket / clear, rejects unknown, duplicate, out of range', () => {
    const s = socketDip(dipped, 'kosong', 0, 'fish-curry', CONTENT);
    expect(socketsOf(s, 'kosong')).toEqual(['fish-curry']);
    expect(socketDip(s, 'kosong', 1, 'fish-curry', CONTENT)).toBe(s);
    expect(socketDip(dipped, 'kosong', 0, 'mutton-curry', CONTENT)).toBe(dipped); // not unlocked
    expect(socketsOf(socketDip(s, 'kosong', 0, null, CONTENT), 'kosong')).toEqual([null]);
  });
  it('socketed dips start the run through the loadout', () => {
    const s = socketDip(dipped, 'kosong', 0, 'fish-curry', CONTENT);
    expect(startDips(s, 'kosong', CONTENT)).toEqual([{ id: 'fish-curry', linkedBread: 'kosong' }]);
    const l = computeLoadout(s, CONTENT);
    expect(l.startDips).toEqual([{ id: 'fish-curry', linkedBread: 'kosong' }]);
    expect(createRun({ seed: 1, content: CONTENT, loadout: l }).loadout?.startDips).toHaveLength(1);
    expect(computeLoadout(dipped, CONTENT).startDips).toBeUndefined();
  });
});

describe('spec tree', () => {
  it('data is sane: unique ids, known prerequisites, one notable + keystone per branch', () => {
    const ids = new Set(SPEC_NODES.map(n => n.id));
    expect(ids.size).toBe(SPEC_NODES.length);
    for (const n of SPEC_NODES) for (const r of n.needs) expect(ids.has(r), `${n.id} needs ${r}`).toBe(true);
    for (const b of ['crisp', 'soak', 'heat'] as const) {
      expect(SPEC_NODES.filter(n => n.branch === b && n.kind === 'notable')).toHaveLength(1);
      expect(SPEC_NODES.filter(n => n.branch === b && n.kind === 'keystone')).toHaveLength(1);
    }
  });
  it('prerequisites, points and the single-keystone lock', () => {
    const s = withPoints(40);
    expect(allocateBlock(s, 'crisp-1')).toBe('needs');
    expect(canAllocate(s, 'hands-1')).toBe(true);
    expect(allocateBlock(withPoints(0), 'hands-1')).toBe('points');
    const crisp = learn(s, 'hands-1', 'crisp-1', 'crisp-2', 'crisp-3', 'crisp-4', 'crisp-n', 'crisp-k');
    expect(crisp.spec.nodes).toContain('crisp-k');
    expect(crisp.specPoints).toBe(30);
    const other = learn(crisp, 'body-1', 'soak-1', 'soak-2', 'soak-3', 'soak-4', 'soak-n');
    expect(allocateBlock(other, 'soak-k')).toBe('keystone');
    expect(allocate(crisp, 'crisp-k')).toBe(crisp); // owned
  });
  it('respec is free and complete; specStats flows into the loadout', () => {
    const s = learn(withPoints(10), 'hands-1', 'crisp-1');
    expect(specStats(s)).toEqual({ dmgPct: 0.05, critChance: 0.02 });
    expect(computeLoadout(s, CONTENT).stats).toEqual({ dmgPct: 0.05, critChance: 0.02 });
    const r = respec(s);
    expect(r.specPoints).toBe(10);
    expect(r.spec.nodes).toEqual([]);
    expect(computeLoadout(r, CONTENT).stats).toEqual({});
  });
});

describe('meals', () => {
  const pantry: SaveV3 = { ...freshSaveV3(), materials: { flour: 9, ghee: 9, egg: 9, onion: 9, masala: 9, sugar: 9, milk: 9, chilli: 9, curryLeaves: 9 } };
  it('cook pays, buffs the loadout, label, one at a time', () => {
    expect(canCookMeal(freshSaveV3(), 'mee-goreng')).toBe(false);
    const s = cookMeal(pantry, 'mee-goreng');
    expect(s.meal).toEqual({ id: 'mee-goreng' });
    expect(s.materials.egg).toBe(7);
    expect(mealLabel(s)).toBe('Mee goreng +30 max HP');
    expect(computeLoadout(s, CONTENT).stats).toEqual({ maxHp: 30 });
    expect(computeLoadout(s, CONTENT).mealId).toBe('mee-goreng');
    expect(cookMeal(s, 'cendol')).toBe(s);
    expect(mealLabel(freshSaveV3())).toBeNull();
  });
  it('every meal is cookable from a full pantry', () => {
    for (const m of MEALS) expect(canCookMeal(pantry, m.id), m.id).toBe(true);
  });
  it('is eaten when the run ends, paid or not', () => {
    const s = cookMeal(pantry, 'teh-halia');
    const res = { wave: 1, won: false, kills: 0, bossKills: 0, gold: 0, dips: [], breads: [] } as never;
    expect(applyRunResult(s, res, makeRng(1), new Date(0)).save.meal).toBeNull();
  });
});
