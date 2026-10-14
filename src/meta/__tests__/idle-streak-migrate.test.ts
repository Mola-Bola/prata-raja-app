import { describe, expect, it } from 'vitest';
import { makeRng } from '../../core/rng';
import { rollItem } from '../gear';
import { collect, preview } from '../idle';
import { unlocksForXp } from '../stall';
import { freshSaveV2, parseSaveV2 } from '../migrate';
import { claim } from '../streak';
import { MATERIALS, RARITIES, type SaveV2 } from '../types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T = Date.parse('2026-10-05T00:00:00Z'); // day 0 of every test: a Monday, UTC midnight
const on = (day: number, hour = 12) => new Date(T + day * DAY + hour * HOUR);
const dayName = (day: number) => new Date(T + day * DAY).toISOString().slice(0, 10);
const claimOn = (save: SaveV2, day: number, tz = 0) => claim(save, on(day), tz);
const idleFrom = (start: number | null, stallXp = 0): SaveV2 => ({
  ...freshSaveV2(), stallXp, idle: { lastCollectedAt: start === null ? null : new Date(start).toISOString() },
});

describe('idle income', () => {
  it('pays 20 coins an hour at stall level 1 and owes nothing without a baseline', () => {
    expect(preview(freshSaveV2(), on(0, 5))).toEqual({ gold: 0, hours: 0, rate: 20, capHours: 12 });
    expect(preview(idleFrom(T), new Date(T + HOUR))).toEqual({ gold: 20, hours: 1, rate: 20, capHours: 12 });
  });
  it('adds 2 coins an hour per stall level above one', () => {
    expect(preview(idleFrom(T, 150), new Date(T + HOUR)).rate).toBe(22); // level 2
    expect(preview(idleFrom(T, 3900), new Date(T + HOUR)).gold).toBe(38); // level 10
  });
  it('caps accrual at 12 hours: 240 at level 1, 456 at level 10', () => {
    expect(preview(idleFrom(T), new Date(T + 30 * HOUR))).toMatchObject({ gold: 240, hours: 12 });
    expect(preview(idleFrom(T, 3900), new Date(T + 30 * HOUR)).gold).toBe(456);
    expect(preview(idleFrom(T), new Date(T + 11.5 * HOUR)).gold).toBe(230);
  });
  it('rounds down exactly with integer time: level 6 (30 coins/h) after 246 min is 123 coins', () => {
    expect(preview(idleFrom(T, 1300), new Date(T + 246 * 60_000)).gold).toBe(123);
  });
  it('collect keeps sub-coin time, so the next collect pays the rest', () => {
    const first = collect(idleFrom(T), new Date(T + HOUR + 30_000)); // 1h00m30s = 20.17 coins
    expect(first.rewards.gold).toBe(20);
    expect(first.save.gold).toBe(20);
    expect(preview(first.save, new Date(T + 2 * HOUR)).gold).toBe(20); // 2h in total = 40 coins
  });
  it('collect discards time above the cap and restarts the baseline', () => {
    const { save, rewards } = collect(idleFrom(T), new Date(T + 40 * HOUR));
    expect(rewards.gold).toBe(240);
    expect(save).toMatchObject({ gold: 240, idle: { lastCollectedAt: new Date(T + 40 * HOUR).toISOString() } });
  });
  it('a second collect at the same moment pays nothing', () => {
    const once = collect(idleFrom(T), new Date(T + 2 * HOUR)).save;
    expect(collect(once, new Date(T + 2 * HOUR)).save).toEqual(once);
  });
  it('a fresh save starts its clock on the first collect and pays nothing then', () => {
    const { save, rewards } = collect(freshSaveV2(), new Date(T));
    expect(rewards.gold).toBe(0);
    expect(save.idle.lastCollectedAt).toBe(new Date(T).toISOString());
  });
  it('a baseline in the future or an invalid clock pays nothing and returns the same save', () => {
    const skewed = idleFrom(T + HOUR);
    expect(preview(skewed, new Date(T)).gold).toBe(0);
    expect(collect(skewed, new Date(T)).save).toBe(skewed);
    const dated = idleFrom(T);
    expect(preview(dated, new Date(NaN)).gold).toBe(0);
    expect(collect(dated, new Date(NaN)).save).toBe(dated);
  });
  it('does not mutate the input save', () => {
    const save = idleFrom(T);
    const before = JSON.stringify(save);
    collect(save, new Date(T + 3 * HOUR));
    expect(JSON.stringify(save)).toBe(before);
  });
});

describe('streak', () => {
  it('starts on day 1 with 50 coins and records the window', () => {
    const { save, rewards } = claimOn(freshSaveV2(), 0);
    expect(rewards).toMatchObject({ day: 1, gold: 50, chest: null, materials: {} });
    expect(save.gold).toBe(50);
    expect(save.streak).toEqual({ day: 1, lastClaimDay: dayName(0), windowStartDay: dayName(0), restDaysUsed: 0 });
  });
  it('walks the seven-day ladder from research item 6, then loops back to day 1', () => {
    let save = freshSaveV2();
    const rewards = [];
    for (let day = 0; day < 8; day++) {
      const claimed = claimOn(save, day);
      save = claimed.save;
      rewards.push(claimed.rewards);
    }
    expect(rewards.map(r => r.day)).toEqual([1, 2, 3, 4, 5, 6, 7, 1]);
    expect(rewards.map(r => r.gold)).toEqual([50, 60, 0, 80, 120, 0, 0, 50]); // coins only: nothing here that cannot be spent
    expect(rewards.map(r => Object.values(r.materials).reduce((a, b) => a + b, 0))).toEqual([0, 0, 1, 0, 0, 2, 0, 0]);
    expect(rewards.map(r => r.chest !== null)).toEqual([false, false, false, false, false, false, true, false]);
    expect(save.gold).toBe(360);
    expect(save.inventory).toHaveLength(1);
  });
  it('day 3 and day 6 add one and two material units to the save', () => {
    let save = freshSaveV2();
    for (let day = 0; day < 6; day++) save = claimOn(save, day).save;
    expect(MATERIALS.reduce((sum, m) => sum + save.materials[m], 0)).toBe(3);
  });
  it('the day-7 chest is Rare or better and advances chest pity once', () => {
    let save = freshSaveV2();
    for (let day = 0; day < 7; day++) save = claimOn(save, day).save;
    expect(save.inventory).toHaveLength(1);
    expect(RARITIES.indexOf(save.inventory[0].rarity)).toBeGreaterThanOrEqual(2);
    expect(save.chestPity).toEqual({ rare: 1, epic: 1, opened: 1 });
  });
  it('claiming twice on the same local day does nothing', () => {
    const first = claimOn(freshSaveV2(), 0).save;
    const again = claim(first, on(0, 23), 0);
    expect(again.save).toBe(first);
    expect(again.rewards).toMatchObject({ day: 0, gold: 0 });
  });
  it('counts days on the local calendar, not in UTC', () => {
    // Sydney (+10h): 20:00 UTC on the 5th is 06:00 on the 6th; 10:00 UTC on the 6th is still the 6th locally.
    const sydney = claim(freshSaveV2(), new Date(T + 20 * HOUR), 600).save;
    expect(claim(sydney, new Date(T + DAY + 10 * HOUR), 600).save).toBe(sydney);
    expect(claim(sydney, new Date(T + DAY + 14 * HOUR), 600).rewards.day).toBe(2); // 7th locally
    // New York (-5h): 02:00 UTC on the 6th is the 5th locally; 06:00 UTC on the 6th is the 6th locally.
    const newYork = claim(freshSaveV2(), new Date(T + DAY + 2 * HOUR), -300).save;
    expect(claim(newYork, new Date(T + DAY + 6 * HOUR), -300).rewards.day).toBe(2);
  });
  it('absorbs one missed day as a rest day, with no drop', () => {
    const { save, rewards } = claimOn(claimOn(freshSaveV2(), 0).save, 2);
    expect(rewards.day).toBe(2);
    expect(save.streak).toMatchObject({ day: 2, restDaysUsed: 1 });
  });
  it('absorbs two missed days in a row as rest days, so the streak still advances', () => {
    const { save, rewards } = claimOn(claimOn(freshSaveV2(), 0).save, 3);
    expect(rewards.day).toBe(2);
    expect(save.streak).toMatchObject({ day: 2, restDaysUsed: 2 });
  });
  it('a third missed day in the window drops the streak by one day', () => {
    let save = freshSaveV2();
    for (const day of [0, 1, 2]) save = claimOn(save, day).save; // streak at day 3
    const after = claimOn(save, 6); // misses days 3, 4, 5: two rests, one beyond
    expect(after.rewards.day).toBe(3);
    expect(after.save.streak).toMatchObject({ day: 3, restDaysUsed: 2 });
  });
  it('a long gap never takes the streak below one day', () => {
    const back = claimOn(claimOn(freshSaveV2(), 0).save, 40);
    expect(back.save.streak.day).toBe(2);
    expect(back.rewards.day).toBe(2);
  });
  it('rest days are allowed per seven-day window, so they reset on a new window', () => {
    let save = freshSaveV2();
    for (const day of [0, 3, 4, 5, 6]) save = claimOn(save, day).save; // day 0, then rests on 1 and 2
    expect(save.streak).toMatchObject({ day: 5, restDaysUsed: 2, windowStartDay: dayName(0) });
    const next = claimOn(save, 8); // day 7 is missed: the first rest of the new window
    expect(next.rewards.day).toBe(6);
    expect(next.save.streak).toEqual({ day: 6, lastClaimDay: dayName(8), windowStartDay: dayName(7), restDaysUsed: 1 });
  });
  it('a gap that spans two windows uses each window\'s own rests', () => {
    let save = freshSaveV2();
    for (const day of [0, 1, 2, 3, 4, 5]) save = claimOn(save, day).save; // streak at day 6
    const next = claimOn(save, 9); // misses day 6 (window 0), then days 7 and 8 (window 1)
    expect(next.rewards.day).toBe(7);
    expect(next.save.streak).toEqual({ day: 7, lastClaimDay: dayName(9), windowStartDay: dayName(7), restDaysUsed: 2 });
  });
  it('a clock that runs backwards changes nothing', () => {
    const later = claimOn(freshSaveV2(), 5).save;
    expect(claimOn(later, 3).save).toBe(later);
  });
  it('an impossible timezone or an invalid time changes nothing', () => {
    const fresh = freshSaveV2();
    expect(claim(fresh, on(0), 900).save).toBe(fresh);
    expect(claim(fresh, on(0), -901).save).toBe(fresh);
    expect(claim(fresh, new Date(NaN), 0).save).toBe(fresh);
  });
  it('is deterministic for the same inputs and never mutates the save', () => {
    let save = freshSaveV2();
    for (const day of [0, 1]) save = claimOn(save, day).save;
    const before = JSON.stringify(save);
    expect(claimOn(save, 2)).toEqual(claimOn(save, 2));
    expect(JSON.stringify(save)).toBe(before);
  });
});

describe('migrate', () => {
  it('a fresh save has every SaveV2 field and no progress', () => {
    expect(Object.keys(freshSaveV2()).sort()).toEqual([
      'bestWave', 'bossAttempts', 'chestPity', 'dipXp', 'equipped', 'gold', 'idle', 'inventory', 'lastPlayed', 'materials', 'pendingChests', 'prologueSeen', 'runs',
      'settings', 'signatureBread', 'stallXp', 'streak', 'totalKills', 'training', 'unlockedBreads', 'unlockedDips', 'unlocks', 'v', 'wins',
    ]);
    expect(freshSaveV2()).toMatchObject({ v: 2, gold: 0, stallXp: 0, inventory: [], equipped: {}, unlocks: {}, training: { wrist: 0, stamina: 0, flip: 0 } });
  });
  it.each([null, undefined, '', 'not json', '[]', '"text"', '42', 'null', '{}', '{"v":3}', '{"v":"2"}'])('treats %j as a fresh save', json => {
    expect(parseSaveV2(json)).toEqual(freshSaveV2());
  });
  it('never throws on hostile input', () => {
    const hostile = [
      '{"v":2,"__proto__":{"polluted":true}}',
      '{"v":2,"inventory":[null,1,"x",{"uid":"a"}],"equipped":{"__proto__":"x"}}',
      '{"v":2,"inventory":[{"uid":"a","baseId":"__proto__","slot":"towel","rarity":"common","level":1,"affixes":[]}]}',
      '{"v":1,"gold":1e400,"lastPlayed":"2026-13-45"}',
      '{"v":2,"stallXp":1e400,"streak":{"day":1e400,"lastClaimDay":"2026-10-05","windowStartDay":"2026-10-05"},"chestPity":{"rare":-1e400}}',
      '{"v":2,"training":{"wrist":1e400},"materials":{"flour":"inf"},"idle":[]}',
      '[[[[',
    ];
    for (const json of hostile) {
      expect(() => parseSaveV2(json)).not.toThrow();
      expect(parseSaveV2(json).v).toBe(2);
    }
  });
  it('migrates a v1 save: coins, totals and settings stay; lastPlayed becomes the idle baseline', () => {
    const v1 = { v: 1, bestWave: 4, runs: 3, wins: 1, gold: 123, totalKills: 90, lastPlayed: '2026-10-10T08:00:00.000Z', settings: { sfx: false, music: true, haptics: false } };
    expect(parseSaveV2(JSON.stringify(v1))).toMatchObject({
      v: 2, bestWave: 4, runs: 3, wins: 1, gold: 123, totalKills: 90, lastPlayed: '2026-10-10T08:00:00.000Z',
      settings: v1.settings, stallXp: 0, inventory: [], unlocks: {}, idle: { lastCollectedAt: '2026-10-10T08:00:00.000Z' },
    });
  });
  it('a v1 save with a missing or broken lastPlayed has no idle baseline', () => {
    expect(parseSaveV2(JSON.stringify({ v: 1, gold: 5 })).idle.lastCollectedAt).toBeNull();
    expect(parseSaveV2(JSON.stringify({ v: 1, gold: 5, lastPlayed: 'yesterday' })).idle.lastCollectedAt).toBeNull();
  });
  it('a valid v2 save survives a JSON round trip unchanged', () => {
    const rng = makeRng(7);
    const towel = rollItem(rng, { slot: 'towel', rarity: 'common' });
    const apron = rollItem(rng, { slot: 'apron', rarity: 'rare' });
    const save: SaveV2 = {
      ...freshSaveV2(), gold: 321, bestWave: 6, runs: 4, wins: 1, totalKills: 77, lastPlayed: new Date(T + DAY).toISOString(),
      stallXp: 1300, inventory: [towel, apron], equipped: { towel: towel.uid, apron: apron.uid },
      training: { wrist: 2, stamina: 0, flip: 5 }, materials: { flour: 3, ghee: 0, egg: 1, onion: 0, spice: 0, sugar: 2, milk: 0 },
      streak: { day: 4, lastClaimDay: dayName(3), windowStartDay: dayName(0), restDaysUsed: 1 },
      idle: { lastCollectedAt: new Date(T + 2 * DAY).toISOString() }, chestPity: { rare: 3, epic: 14, opened: 34 },
      unlocks: unlocksForXp(1300),
    };
    expect(parseSaveV2(JSON.stringify(save))).toEqual(save);
  });
  it('recovers each damaged field on its own', () => {
    const raw = {
      ...JSON.parse(JSON.stringify(freshSaveV2())), bestWave: 9, gold: -5, stallXp: 'x', training: { wrist: 99, stamina: -1, flip: 2.9 },
      materials: { flour: 2.7, ghee: -1 }, chestPity: { rare: 7, epic: 25, opened: -3 },
      idle: { lastCollectedAt: 'not a date' },
    };
    expect(parseSaveV2(JSON.stringify(raw))).toMatchObject({
      gold: 0, stallXp: 0, bestWave: 9, training: { wrist: 5, stamina: 0, flip: 2 }, materials: { flour: 2, ghee: 0, egg: 0 },
      chestPity: { rare: 2, epic: 5, opened: 0 }, idle: { lastCollectedAt: null },
    });
  });
  it('keeps valid gear and drops only the broken pieces; the first copy of a uid wins', () => {
    const good = rollItem(makeRng(3), { slot: 'headband', rarity: 'rare' });
    const broken = [
      { ...good, uid: 'x1', baseId: 'nope' },
      { ...good, uid: 'x2', baseId: 'constructor' },
      { ...good, uid: 'x3', slot: 'towel' },
      { ...good, uid: 'x4', affixes: [] },
      { ...good, uid: 'x5', affixes: [{ id: 'made-up', stat: 'maxHp', value: 1 }] },
      { ...good, uid: 'x6', level: 0 },
      { ...good, uid: 'x7', rarity: 'mythic' },
      { ...good, uid: '' },
      null,
      42,
    ];
    expect(parseSaveV2(JSON.stringify({ ...freshSaveV2(), inventory: [good, ...broken, good] })).inventory).toEqual([good]);
  });
  it('an item keeps its affix when content retunes the value, and takes the current value', () => {
    const good = rollItem(makeRng(3), { slot: 'apron', rarity: 'rare' });
    const stale = { ...good, affixes: good.affixes.map(a => ({ ...a, value: a.value * 2 })) };
    expect(parseSaveV2(JSON.stringify({ ...freshSaveV2(), inventory: [stale] })).inventory[0]?.affixes).toEqual(good.affixes);
  });
  it('equipped slots must name an owned item of that slot', () => {
    const towel = rollItem(makeRng(3), { slot: 'towel', rarity: 'common' });
    const save = parseSaveV2(JSON.stringify({ ...freshSaveV2(), inventory: [towel], equipped: { towel: towel.uid, headband: towel.uid, apron: 'missing' } }));
    expect(save.equipped).toEqual({ towel: towel.uid });
  });
  it('unlock flags are kept when true and always include what stall XP has earned', () => {
    const save = parseSaveV2(JSON.stringify({ ...freshSaveV2(), stallXp: 150, unlocks: { apron: true, gloves: 'yes' } }));
    expect(save.unlocks).toEqual({ apron: true, gear: true, towel: true });
  });
  it('keeps a streak that can be trusted and restarts one that cannot', () => {
    const streak = (value: unknown) => parseSaveV2(JSON.stringify({ ...freshSaveV2(), streak: value })).streak;
    expect(streak({ day: 4, lastClaimDay: '2026-10-08', windowStartDay: '2026-10-05', restDaysUsed: 1 }))
      .toEqual({ day: 4, lastClaimDay: '2026-10-08', windowStartDay: '2026-10-05', restDaysUsed: 1 });
    expect(streak({ day: 4, lastClaimDay: '2026-10-08', windowStartDay: '2026-10-12', restDaysUsed: 1 }).lastClaimDay).toBeNull();
    expect(streak({ day: 4, lastClaimDay: '2026-10-20', windowStartDay: '2026-10-05', restDaysUsed: 1 }).lastClaimDay).toBeNull();
    expect(streak({ day: 4, lastClaimDay: '2026-02-30', windowStartDay: '2026-02-01' }).lastClaimDay).toBeNull();
  });
});
