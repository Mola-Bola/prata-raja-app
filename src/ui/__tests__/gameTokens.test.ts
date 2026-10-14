import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { GAME_PAIRS, gameTokenCss, TOUCH, TYPE } from '../gameTokens';
import { contrast } from '../palette';

const FILE = join(__dirname, '../../game/ui/tokens.css');

describe('game tokens', () => {
  it('tokens.css matches gameTokens.ts (UPDATE_TOKENS=1 rewrites it)', () => {
    if (process.env.UPDATE_TOKENS) writeFileSync(FILE, gameTokenCss());
    expect(readFileSync(FILE, 'utf8')).toBe(gameTokenCss());
  });

  it('has five type sizes, none under 13, and a 44 px touch floor', () => {
    expect(Object.keys(TYPE)).toHaveLength(5);
    for (const t of Object.values(TYPE)) expect(t.px).toBeGreaterThanOrEqual(13);
    expect(TOUCH).toBe(44);
  });

  it.each(GAME_PAIRS)('$name', ({ fg, bg, min }) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});
