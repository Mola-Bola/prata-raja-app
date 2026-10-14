import { createElement } from 'react';
// @ts-expect-error The existing dependency set omits react-dom server declarations.
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { makeRng } from '../../../core/rng';
import type { RunResult } from '../../../core/types';
import { freshSaveV2 } from '../../../meta/migrate';
import { applyRunResult } from '../../../meta/runRewards';
import { DipCollection } from '../stall/DipCollection';
import { Rewards } from '../stall/Rewards';

const art = (name: string) => name;
it('receipts draw exact awarded use and collection exposes numeric progress on a legacy save', () => {
  const before = freshSaveV2();
  const result: RunResult = { won: false, wave: 2, kills: 1, bossKills: 0, time: 500, level: 1, gold: 0,
    breads: [{ id: 'kosong', level: 1, cd: 0, volleyLeft: 0, volleyT: 0 }], dips: [{ id: 'mint-chutney', level: 1, linkedBread: 'kosong' }], dipUseXp: { 'mint-chutney': 54 } };
  const payout = applyRunResult(before, result, makeRng(1), new Date('2026-10-14'));
  const receipt = renderToStaticMarkup(createElement(Rewards, { before, payout, art }));
  expect(receipt).toContain('Mint Chutney · +54 simmer XP');
  expect(receipt).toContain('1 → 2'); expect(receipt).toContain('+0.5%'); expect(receipt).toContain('chill duration');
  expect(receipt).toContain('14 / 50 to Simmer 3');
  const collection = renderToStaticMarkup(createElement(DipCollection, { save: payout.save, art }));
  expect(collection).toContain('Sparks jump to pests');
  expect(collection).toContain('Links begin with Signature at stall level 9');
  expect(collection).toContain('14 / 50 to Simmer 3'); expect(collection).not.toContain('disabled');
  const noUse = applyRunResult(before, { ...result, dipUseXp: undefined }, makeRng(1), new Date('2026-10-14'));
  expect(renderToStaticMarkup(createElement(Rewards, { before, payout: noUse, art }))).not.toContain('results-dip-');
});
