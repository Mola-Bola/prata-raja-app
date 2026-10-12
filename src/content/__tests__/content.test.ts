import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { BreadStats } from '../../core/types';
import { CONTENT } from '../index';

// Typed as a full record, so a BreadStats field added or renamed fails tsc here.
const STAT_KEYS: Record<keyof BreadStats, true> = {
  dmg: true, cooldown: true, speed: true, radius: true, range: true, count: true, spread: true,
  volleyGap: true, pierce: true, hops: true, hopRange: true, hopFalloff: true, fragments: true,
  fragmentDmg: true, blast: true, lobTime: true, zoneTime: true, zoneDps: true, width: true,
  stun: true, knockback: true, orbitRadius: true, orbitHitGap: true, armourPierce: true, homing: true,
};
const STAT_FIELDS = Object.keys(STAT_KEYS).sort();

const MANIFEST = fileURLToPath(new URL('../../../assets/game/manifest.json', import.meta.url));
const manifestKeys = existsSync(MANIFEST)
  ? new Set(Object.keys(JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, unknown>))
  : null;

/** Every sprite key the content names. */
function spriteKeys(): string[] {
  const { breads, dips, passives, enemies, bosses, chapters } = CONTENT;
  const keys = [
    ...Object.values(breads).map((d) => d.sprite),
    ...Object.values(dips).map((d) => d.sprite),
    ...Object.values(passives).map((d) => d.sprite),
    ...Object.values(enemies).flatMap((e) => [e.sprite, ...(e.ranged ? [e.ranged.projSprite] : [])]),
    ...Object.values(bosses).flatMap((b) => [
      b.sprite,
      ...b.attacks.flatMap((a) => (a.kind === 'volley' ? [a.projSprite] : [])),
    ]),
    ...chapters.map((c) => c.background),
  ];
  return [...new Set(keys)];
}

function expectIdsMatchKeys(rec: Record<string, { id: string }>): void {
  const defs = Object.entries(rec);
  expect(new Set(defs.map(([, d]) => d.id)).size).toBe(defs.length);
  for (const [key, def] of defs) expect(def.id, key).toBe(key);
}

describe('content', () => {
  it('ids are unique and equal their record keys', () => {
    for (const rec of [CONTENT.breads, CONTENT.dips, CONTENT.passives, CONTENT.enemies, CONTENT.bosses]) {
      expectIdsMatchKeys(rec);
    }
  });

  it('every bread has 5 levels, each listing every BreadStats field as a finite number >= 0', () => {
    for (const bread of Object.values(CONTENT.breads)) {
      expect(bread.levels, bread.id).toHaveLength(5);
      for (const lv of bread.levels) {
        expect(Object.keys(lv).sort(), bread.id).toEqual(STAT_FIELDS);
        for (const f of STAT_FIELDS) {
          const v = lv[f as keyof BreadStats];
          expect(Number.isFinite(v) && v >= 0, `${bread.id}.${f} = ${v}`).toBe(true);
        }
      }
    }
  });

  it('every dip has 5 levels', () => {
    for (const dip of Object.values(CONTENT.dips)) expect(dip.levels, dip.id).toHaveLength(5);
  });

  it.skipIf(!manifestKeys)('every sprite key exists in assets/game/manifest.json', () => {
    for (const key of spriteKeys()) expect(manifestKeys?.has(key), key).toBe(true);
  });

  it('split, summon, boss summon, wave mix and wave boss references all resolve', () => {
    const { enemies, bosses, chapters } = CONTENT;
    for (const e of Object.values(enemies)) {
      if (e.split) expect(enemies[e.split.into], `${e.id} splits into ${e.split.into}`).toBeDefined();
      if (e.summon) expect(enemies[e.summon.id], `${e.id} summons ${e.summon.id}`).toBeDefined();
    }
    for (const b of Object.values(bosses)) {
      for (const a of b.attacks) {
        if (a.kind === 'summon') expect(enemies[a.enemy], `${b.id} ${a.id} summons ${a.enemy}`).toBeDefined();
      }
    }
    for (const chapter of chapters) {
      for (const w of chapter.waves) {
        for (const id of Object.keys(w.mix)) expect(enemies[id], `wave mix ${id}`).toBeDefined();
        if (w.boss) expect(bosses[w.boss], `wave boss ${w.boss}`).toBeDefined();
      }
    }
  });

  it('chapter 1 has 10 waves and only the last one has a boss', () => {
    const waves = CONTENT.chapters[0].waves;
    expect(waves).toHaveLength(10);
    waves.forEach((w, i) => expect(w.boss !== undefined, `wave ${i + 1}`).toBe(i === waves.length - 1));
  });
});
