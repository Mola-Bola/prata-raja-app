import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { CONTENT } from '../../content';
import { simulateRun } from '../autoplay';
import { computeLoadout } from '../../meta/loadout';
import { freshSaveV2 } from '../../meta/migrate';
import { unlocksForXp } from '../../meta/stall';
it('dbg', () => {
  const out: string[] = [];
  for (const id of ['roti-bomb', 'appam', 'murtabak'] as const) {
    const save = { ...freshSaveV2(), stallXp: 3100, unlocks: unlocksForXp(3100), signatureBread: id, unlockedBreads: ['murtabak' as const] };
    const loadout = computeLoadout(save, CONTENT);
    out.push(JSON.stringify(loadout));
    for (const seed of [1,2,3,4]) { const r = simulateRun({ seed, content: CONTENT, maxBreads: 1, loadout }); out.push(`${id} s${seed} won=${r.won} wave=${r.wave} dist=${r.dist} t=${r.time.toFixed(0)} ${r.breads.map(b=>b.id+b.level)} ${r.dips.map(b=>b.id+b.level)}`); }
  }
  writeFileSync('/tmp/dbg.txt', out.join('\n'));
});
