import type { ChapterDef } from '../core/types';

// Chapter 1. Wave 10 is the last wave and carries the King Cockroach.
export const CHAPTERS: ChapterDef[] = [
  {
    id: 'kopitiam-street',
    name: 'Kopitiam Street',
    background: 'scene/background',
    // Set by the bot balance sim (BALANCE_SEEDS=300). 0.27 was tuned while a boss could be frozen or stunned for good; with the boss
    // (and every enemy) only ever slowed, and no freeze-lock, it takes 0.15 to keep the 4-bread bot's win rate near 2 in 3.
    hpPerWave: 0.15,
    mode: 'flow',
    bossAt: 1200,
    waves: [
      { budget: 10, duration: 22, mix: { 'sugar-ant': 1 }, eliteChance: 0 },
      { budget: 14, duration: 24, mix: { 'sugar-ant': 3, roach: 2 }, eliteChance: 0 },
      { budget: 18, duration: 25, mix: { 'sugar-ant': 3, roach: 2, pigeon: 2 }, eliteChance: 0 },
      { budget: 22, duration: 26, mix: { 'sugar-ant': 2, roach: 2, pigeon: 1, 'chilli-imp': 1.5 }, eliteChance: 0.04 },
      { budget: 26, duration: 27, mix: { 'sugar-ant': 2, roach: 2, 'boba-blob': 1.5, 'chilli-imp': 1 }, eliteChance: 0.05 },
      { budget: 30, duration: 28, mix: { 'sugar-ant': 2, mosquito: 1.5, pigeon: 1.5, 'chilli-imp': 1 }, eliteChance: 0.05 },
      {
        budget: 34,
        duration: 28,
        mix: { roach: 2, 'tiffin-beetle': 1.5, 'boba-blob': 1, 'chilli-imp': 1, 'ice-kacang-sprite': 0.7 },
        eliteChance: 0.06,
      },
      {
        budget: 38,
        duration: 30,
        mix: { 'sugar-ant': 2, 'burger-brute': 1, 'tiffin-beetle': 1, mosquito: 1, 'durian-bomb': 1 },
        eliteChance: 0.07,
      },
      {
        budget: 44,
        duration: 30,
        mix: {
          'sugar-ant': 2,
          roach: 2,
          pigeon: 1,
          mosquito: 1,
          'chilli-imp': 1,
          'boba-blob': 1,
          'tiffin-beetle': 1,
          'burger-brute': 0.6,
          'durian-bomb': 0.8,
          'kettle-spirit': 0.6,
          'ice-kacang-sprite': 0.5,
        },
        eliteChance: 0.08,
      },
      { budget: 16, duration: 40, mix: { 'sugar-ant': 2, roach: 2 }, eliteChance: 0, boss: 'king-cockroach' },
    ],
  },
];

const nightIds: Record<string, string> = {
  'sugar-ant': 'sugarcane-walker', roach: 'tray-rat', pigeon: 'neon-moth', mosquito: 'fishball',
  'burger-brute': 'ice-golem', 'chilli-imp': 'satay-archer', 'boba-blob': 'kway-teow-blob',
  'tiffin-beetle': 'drumstick-knight', 'ice-kacang-sprite': 'kopi-ghost', 'kettle-spirit': 'chope-spirit', 'durian-bomb': 'rojak-bomb',
};
CHAPTERS.push({
  id: 'hawker-night', name: 'Hawker Centre Night', background: 'scene/background2', hpPerWave: .21, mode: 'flow', bossAt: 1200,
  waves: CHAPTERS[0].waves.map(wave => ({ ...wave,
    mix: Object.fromEntries(Object.entries(wave.mix).map(([id, weight]) => [nightIds[id], weight])),
    ...(wave.boss ? { boss: 'burger-baron' } : {}),
  })),
});

// The street's place-true pests enter gradually; the night keeps its own roster.
for (const [i, wave] of CHAPTERS[0].waves.entries()) {
  if (i >= 2 && !wave.boss) wave.mix['mynah-thief'] = 0.6;
  if (i >= 3 && !wave.boss) wave.mix['drain-rat'] = 0.5;
}
