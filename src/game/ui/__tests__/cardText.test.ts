import { describe, expect, it } from 'vitest';

import { CONTENT } from '@/content';
import type { Card } from '@/core/types';

import { cardView, pipText } from '../cardText';

const words = (s: string) => s.trim().split(/\s+/).length;
const card = (kind: Card['kind'], id: string, level = 1): Card => ({ kind, id, level });

describe('level-up card text', () => {
  it('every bread, dip and passive has a name and a line of at most 8 words', () => {
    const cards = [
      ...Object.keys(CONTENT.breads).map((id) => card('bread', id)),
      ...Object.keys(CONTENT.dips).map((id) => card('dip', id)),
      ...Object.keys(CONTENT.passives).map((id) => card('passive', id)),
    ];
    expect(cards).toHaveLength(12 + 10 + 12);
    for (const c of cards) {
      const v = cardView(c);
      expect(v.name, c.id).not.toBe('');
      expect(v.line, c.id).not.toBe('');
      expect(words(v.line), `${c.id}: "${v.line}"`).toBeLessThanOrEqual(8);
    }
  });

  it('heal and gold lines are at most 8 words too', () => {
    for (const c of [card('heal', ''), card('gold', '')]) {
      expect(words(cardView(c).line), c.kind).toBeLessThanOrEqual(8);
    }
  });

  it('new picks badge NEW, upgrades show pips for the level they make', () => {
    expect(cardView(card('bread', 'naan', 1)).badge).toBe('NEW');
    expect(cardView(card('dip', 'ghee', 3)).badge).toBe('●●●○○');
    expect(cardView(card('passive', 'extra-dough', 3)).badge).toBe('●●●');
    expect(pipText(2, 2)).toBe('●●');
  });
});
