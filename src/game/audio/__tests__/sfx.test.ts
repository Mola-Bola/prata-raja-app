import { describe, expect, it } from 'vitest';
import {
  LIGHT_SFX,
  NO_SFX_HISTORY,
  SFX_PARAMS,
  SLAP_PROFILES,
  admitSfx,
  admitVoice,
  playSfx,
  setSfxEnabled,
  slapPlan,
  unlockAudio,
  type SfxName,
} from '../sfx';

const ALL: SfxName[] = [
  'throw', 'hit', 'crit', 'kill', 'blast', 'splash', 'meteor', 'zone', 'chain', 'freeze', 'sugarCrash', 'shieldBreak', 'playerHurt',
  'dodge', 'levelUp', 'cardPick', 'waveStart', 'bossAppear', 'bossTell', 'win', 'lose', 'coin', 'uiTap',
  'step', 'stationOpen', 'stationClose', 'enhance', 'fuse', 'socket', 'dash', 'cook',
];

describe('SFX_PARAMS', () => {
  it('has a finite ZzFX parameter array for every non-slap SfxName', () => {
    const zzfx = ALL.filter((n) => !['throw', 'hit', 'crit', 'blast', 'splash', 'meteor', 'zone', 'freeze', ...LIGHT_SFX].includes(n));
    expect(Object.keys(SFX_PARAMS).sort()).toEqual([...zzfx].sort());
    for (const name of zzfx) {
      const p = SFX_PARAMS[name as keyof typeof SFX_PARAMS];
      expect(p.length, name).toBeGreaterThan(0);
      expect(p.length, name).toBeLessThanOrEqual(21);
      expect(p.every(Number.isFinite), name).toBe(true);
    }
  });
});

describe('dough slap voices', () => {
  const mid = () => 0.5; // pitch factor exactly 1

  it('gives every named bread a profile inside the brief ranges', () => {
    for (const p of Object.values(SLAP_PROFILES)) {
      expect(p!.crackHz).toBeGreaterThanOrEqual(800);
      expect(p!.crackHz).toBeLessThanOrEqual(2500);
      expect(p!.crackMs).toBeGreaterThanOrEqual(40);
      expect(p!.crackMs).toBeLessThanOrEqual(90);
      expect(p!.thumpHz).toBeGreaterThanOrEqual(90);
      expect(p!.thumpHz).toBeLessThanOrEqual(170);
      expect(p!.sizzle).toBeLessThanOrEqual(0.2); // very quiet tail
    }
  });

  it('differentiates the named breads the way the brief asks', () => {
    const tissue = slapPlan('tissue', mid);
    const murtabak = slapPlan('murtabak', mid);
    expect(tissue.crackHz).toBeGreaterThan(murtabak.crackHz); // crisp snap is higher
    expect(tissue.crackMs).toBeLessThan(murtabak.crackMs); // and shorter
    expect(murtabak.thumpHz).toBeLessThan(tissue.thumpHz); // wet thud is lower
    expect(murtabak.thumpMs).toBeGreaterThan(tissue.thumpMs);
    expect(murtabak.thumpGain).toBeGreaterThan(tissue.thumpGain);
    expect(slapPlan('thosai', mid).sizzle).toBeGreaterThan(0); // crackle has a tawa tail
  });

  it('falls back to the kosong voice for unlisted breads and no bread', () => {
    expect(slapPlan(undefined, mid)).toEqual(slapPlan('kosong', mid));
    expect(slapPlan('naan', mid)).toEqual(slapPlan('kosong', mid));
  });

  it('varies the pitch by at most 6 percent', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      const { pitch } = slapPlan('kosong', () => r);
      expect(Math.abs(pitch - 1)).toBeLessThanOrEqual(0.06 + 1e-9);
    }
    expect(slapPlan('kosong', () => 0).pitch).toBeCloseTo(0.94);
  });
});

describe('playSfx without audio (node)', () => {
  it('never throws', () => {
    expect(() => {
      unlockAudio();
      for (const name of ALL) playSfx(name);
      for (const bread of ['tissue', 'murtabak', 'naan'] as const) playSfx('hit', bread);
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

  it('gaps slaps 25 ms per bread, so different breads can land together', () => {
    const h = admitSfx(NO_SFX_HISTORY, 'hit', 1000, 'tissue')!;
    expect(admitSfx(h, 'hit', 1024, 'tissue')).toBeNull();
    expect(admitSfx(h, 'hit', 1025, 'tissue')).not.toBeNull();
    expect(admitSfx(h, 'hit', 1010, 'murtabak')).not.toBeNull();
  });
});

describe('combat voices', () => {
  it('admits footsteps on every footfall but at most one per 90 ms', () => {
    const h = admitSfx(NO_SFX_HISTORY, 'step', 1000)!;
    expect(admitSfx(h, 'step', 1089)).toBeNull();
    expect(admitSfx(h, 'step', 1090)).not.toBeNull();
    expect(admitSfx(h, 'dash', 1001)).not.toBeNull(); // other light cues keep their own gap
  });

  it('caps simultaneous voices and frees them when they end', () => {
    const ends: number[] = [];
    for (let i = 0; i < 6; i++) expect(admitVoice(ends, 0, 0.5)).toBe(true);
    expect(admitVoice(ends, 0.1, 0.5)).toBe(false);
    expect(admitVoice(ends, 0.6, 0.5)).toBe(true);
  });

  it('rate-limits crit crunches', () => {
    const a = admitSfx(NO_SFX_HISTORY, 'crit', 1000)!;
    expect(admitSfx(a, 'crit', 1040)).toBeNull();
    expect(admitSfx(a, 'crit', 1100)).not.toBeNull();
  });
});
