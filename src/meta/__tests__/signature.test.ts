import { expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { freshSaveV2, parseSaveV2, parseSaveV3 } from '../migrate';
import { chooseSignature } from '../signature';
import { computeLoadout } from '../loadout';
import { unlocksForXp } from '../stall';
import { createSaveStore } from '../../game/ui/saveStore';

it('legacy saves default to Kosong; locked, unknown and evolved choices are rejected', () => {
  const fresh = freshSaveV2();
  expect(parseSaveV2(JSON.stringify({ v: 1 })).signatureBread).toBe('kosong');
  expect(chooseSignature(fresh, 'murtabak', CONTENT)).toBe(fresh);
  const old = { ...fresh, stallXp: 3100, unlocks: unlocksForXp(3100) };
  expect(parseSaveV2(JSON.stringify(old)).signatureBread).toBe('kosong');
  for (const id of ['murtabak', 'crusher-murtabak', 'garbage']) expect(chooseSignature(old, id, CONTENT)).toBe(old);
  expect(computeLoadout({ ...old, signatureBread: 'murtabak' }, CONTENT).startBread).toBe('kosong');
});

it.each(['murtabak', 'roti-bomb', 'appam'] as const)('persists %s through the save store and migration into the next run loadout', async id => {
  let json = JSON.stringify({ ...freshSaveV2(), stallXp: 3100, unlockedBreads: ['murtabak'] });
  const store = createSaveStore({ load: async () => json, save: async (_key, value) => { json = value; } }, 'signature-test');
  await store.load();
  store.commit(s => chooseSignature(s, id, CONTENT));
  await store.flush();
  const restored = parseSaveV3(json);
  expect(restored.signatureBread).toBe(id);
  expect(computeLoadout(restored, CONTENT)).toMatchObject({ startBread: id, signatureBread: id });
});
