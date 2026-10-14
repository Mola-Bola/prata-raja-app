// Milestone visitors: a regular stops by at each Kannan milestone with one line, a gift, and the perk named by PERKS (looked up
// by level, never restated here). Each row is data, so lines and gifts swap freely. Set MILESTONE_VISITS_ON to false to turn
// the whole feature off (nothing is shown; saves keep their seen marks).

export const MILESTONE_VISITS_ON = true;

export type Milestone = {
  who: string;
  /** Optional asset key (ASSET_URLS). Without one, the card shows `emoji`. */
  portrait?: string;
  emoji?: string;
  lines: [string, string];
  gift: string;
  /** Recorded into save.beats when the visitor is thanked. */
  beatId: string;
};

export const MILESTONES: Record<number, Milestone> = {
  5: {
    who: 'Auntie Siew Lan, the 6 a.m. regular', emoji: '👵',
    lines: ['Eh, first one burn? Just ask again lor, like ordering teh-o.', "Don't say I never give you chance, one more shot for my usual."],
    gift: '1 sambal sachet', beatId: 'milestone-5-regular',
  },
  10: {
    who: 'Uncle Ah Seng, the one who shook him awake', emoji: '👴',
    lines: ['Steady boy, the queue can wait, your own body must eat first.', 'Walao, you grow bigger already? Keep eating lah.'],
    gift: '1 teh tarik cup', beatId: 'milestone-10-uncle',
  },
  15: {
    who: 'Grade Inspector, clipboard spirit (teaser)', emoji: '🧑‍🔬',
    lines: ['Hygiene check? Your tawa sizzling like that, cannot fail one.', "Don't worry, I come back next week with my sign, ha."],
    gift: 'a grade sticker (cosmetic)', beatId: 'milestone-15-grade',
  },
  20: {
    who: 'Ah Beng, night-shift cook (chapter 2 teaser)', emoji: '🧑‍🍳',
    lines: ['Tonight the neon all turn on, you ready or not?', 'Sia, your prata got fire, I borrow one for the night shift.'],
    gift: '1 chilli padi sachet', beatId: 'milestone-20-night',
  },
  25: {
    who: 'Stall regulars, chorus', emoji: '🎉',
    lines: ['Raja! Raja! Two kosong, one tissue!', 'Not my stall? Now is your stall, boy.'],
    gift: 'a golden tawa sticker (cosmetic)', beatId: 'milestone-25-raja',
  },
};
