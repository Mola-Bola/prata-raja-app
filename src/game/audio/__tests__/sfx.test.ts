import { describe, expect, it } from 'vitest';
import {
  NO_SFX_HISTORY,
  SFX_PARAMS,
  admitSfx,
  playSfx,
  setSfxEnabled,
  unlockAudio,
  type SfxName,
} from '../sfx';

const ALL: SfxName[] = [
  'throw', 'hit', 'crit', 'kill', 'blast', 'chain', 'freeze', 'sugarCrash', 'shieldBreak', 'playerHurt',
  'dodge', 'levelUp', 'cardPick', 'waveStart', 'bossAppear', 'bossTell', 'win', 'lose', 'coin', 'uiTap',
];

describe('SFX_PARAMS', () => {
  it('has a finite ZzFX parameter array for every SfxName', () => {
    expect(Object.keys(SFX_PARAMS).sort()).toEqual([...ALL].sort());
    for (const name of ALL) {
      const p = SFX_PARAMS[name];
      expect(p.length, name).toBeGreaterThan(0);
      expect(p.length, name).toBeLessThanOrEqual(21);
      expect(p.every(Number.isFinite), name).toBe(true);
    }
  });
});

describe('playSfx without audio (node)', () => {
  it('never throws', () => {
    expect(() => {
      unlockAudio();
      for (const name of ALL) playSfx(name);
      setSfxEnabled(false);
      playSfx('hit');
      setSfxEnabled(true);
    }).not.toThrow();
  });
});

describe('admitSfx throttle', () => {
  it('drops the same sound within 40 ms but not other sounds', () => {
    const h = admitSfx(NO_SFX_HISTORY, 'coin', 1000)!;
    expect(admitSfx(h, 'coin', 1039)).toBeNull();
    expect(admitSfx(h, 'coin', 1040)).not.toBeNull();
    expect(admitSfx(h, 'uiTap', 1001)).not.toBeNull();
  });

  it('caps hit and throw together at 12 per rolling second', () => {
    let h = NO_SFX_HISTORY;
    for (let i = 0; i < 12; i++) {
      const next = admitSfx(h, i % 2 ? 'hit' : 'throw', i * 50); // t = 0..550 ms
      expect(next).not.toBeNull();
      h = next!;
    }
    expect(admitSfx(h, 'hit', 600)).toBeNull();
    expect(admitSfx(h, 'throw', 999)).toBeNull();
    expect(admitSfx(h, 'hit', 1000)).not.toBeNull(); // the t = 0 play has aged out
  });
});
