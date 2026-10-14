// Drift guard: fails when a stat ships without a registry entry, or a system references a stat the registry doesn't allow it to grant.
import { describe, expect, it } from 'vitest';
import { PASSIVES } from '../../content/passives';
import { AFFIX_POOLS, MAIN_STATS } from '../../meta/gear';
import { PERKS } from '../../meta/kannan';
import { MEALS } from '../../meta/meals';
import { SPEC_NODES } from '../../meta/specTree';
import { TRAINING_STATS, TRAINING_UNLOCK } from '../../meta/training';
import { TRAINING_IDS, UNLOCK_FLAGS } from '../../meta/types';
import { formatStat, STAT_IDS, STAT_REGISTRY, type StatSource } from '../statRegistry';
import { BASE_STATS } from '../stats';

type Ref = { source: StatSource; where: string; stat: string };
const refs: Ref[] = [
  ...Object.values(AFFIX_POOLS).flat().map(a => ({ source: 'gear' as const, where: `affix ${a.id}`, stat: a.stat })),
  ...Object.entries(MAIN_STATS).flatMap(([slot, s]) => Object.keys(s).map(stat => ({ source: 'gear' as const, where: `main stat ${slot}`, stat }))),
  ...Object.values(PASSIVES).flatMap(p => Object.keys(p.perLevel).map(stat => ({ source: 'card' as const, where: `card ${p.id}`, stat }))),
  ...PERKS.flatMap(p => Object.keys(p.stats ?? {}).map(stat => ({ source: 'perk' as const, where: `perk L${p.level}`, stat }))),
  ...TRAINING_IDS.flatMap(id => Object.keys(TRAINING_STATS[id]).map(stat => ({ source: 'training' as const, where: `training ${id}`, stat }))),
  ...SPEC_NODES.flatMap(n => Object.keys(n.stats).map(stat => ({ source: 'spec' as const, where: `spec ${n.id}`, stat }))),
];
const mealRefs = MEALS.flatMap(m => Object.keys(m.stats).map(stat => ({ where: `meal ${m.id}`, stat })));

describe('stat registry coverage', () => {
  it('has an entry for every PlayerStats key (and nothing extra)', () => {
    expect(Object.keys(STAT_REGISTRY).sort()).toEqual(Object.keys(BASE_STATS).sort());
    for (const id of STAT_IDS) expect(STAT_REGISTRY[id].id).toBe(id);
  });
  it('every buildSheet stat has a working formatter', () => {
    for (const s of Object.values(STAT_REGISTRY).filter(s => s.sheet)) {
      expect(s.label && s.short && s.icon, s.id).toBeTruthy();
      expect(formatStat(s.id, 0.5), s.id).toMatch(/\d/);
    }
  });
  it('gear / card / perk / training only reference registered stats the registry lets that system grant', () => {
    for (const r of refs) {
      const def = STAT_REGISTRY[r.stat as keyof typeof STAT_REGISTRY];
      expect(def, `${r.where} references unknown stat ${r.stat}`).toBeDefined();
      expect(def.grant, `${r.where}: registry '${r.stat}' does not list '${r.source}' in grant`).toContain(r.source);
    }
  });
  it('meals only use registered stats', () => {
    for (const r of mealRefs) expect(STAT_REGISTRY[r.stat as keyof typeof STAT_REGISTRY], `${r.where}: ${r.stat}`).toBeDefined();
  });
  it('every stat is grantable by something, and checkable grants (gear/card/perk/training) really exist', () => {
    const bad: string[] = [];
    for (const s of Object.values(STAT_REGISTRY)) {
      expect(s.grant.length, `${s.id} is grantable by nothing`).toBeGreaterThan(0);
      for (const src of s.grant.filter(g => g === 'gear' || g === 'card' || g === 'perk' || g === 'training'))
        if (!refs.some(r => r.stat === s.id && r.source === src)) bad.push(`${s.id} claims '${src}' but no ${src} data grants it`);
    }
    expect(bad).toEqual([]);
  });
  it('training gates are real unlock flags', () => {
    for (const id of TRAINING_IDS) expect(UNLOCK_FLAGS as readonly string[]).toContain(TRAINING_UNLOCK[id]);
  });
});
