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

  it('plays the hurt sound at most every 450 ms, so a volley or several biters make one sound', () => {
    let h = admitSfx(NO_SFX_HISTORY, 'playerHurt', 2000)!;
    for (const at of [2040, 2100, 2300, 2449]) expect(admitSfx(h, 'playerHurt', at), `at ${at}`).toBeNull();
    h = admitSfx(h, 'playerHurt', 2450)!;
    expect(h).not.toBeNull();
    expect(admitSfx(h, 'playerHurt', 2899)).toBeNull();
    expect(admitSfx(h, 'playerHurt', 2900)).not.toBeNull(); // 450 ms after the one at 2450
    expect(admitSfx(h, 'hit', 2451)).not.toBeNull(); // other sounds keep their own gap
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
