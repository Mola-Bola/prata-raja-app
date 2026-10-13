import { describe, expect, it } from 'vitest';

import { CONTENT } from '@/content';
import type { Card } from '@/core/types';

import { cardView, pipText } from '../cardText';

const words = (s: string) => s.trim().split(/\s+/).length;
/** A card holds about 10 characters a line on a 360 px phone and the line may take 3: 8 words is not short enough on its own
 *  (a 6-word line of 38 characters took 4 lines), so the letters are capped too. */
const MAX_CHARS = 25;
const card = (kind: Card['kind'], id: string, level = 1): Card => ({ kind, id, level });

describe('level-up card text', () => {
  it('every bread, dip and passive has a name and a line of at most 8 words and 25 characters', () => {
    const cards = [
      ...Object.values(CONTENT.breads).map((b) => card(b.evolvedFrom ? 'evolve' : 'bread', b.id)),
      ...Object.keys(CONTENT.dips).map((id) => card('dip', id)),
      ...Object.keys(CONTENT.passives).map((id) => card('passive', id)),
    ];
    expect(cards).toHaveLength(20 + 10 + 12);
    for (const c of cards) {
      const v = cardView(c);
      expect(v.name, c.id).not.toBe('');
      expect(v.line, c.id).not.toBe('');
      expect(words(v.line), `${c.id}: "${v.line}"`).toBeLessThanOrEqual(8);
      expect(v.line.length, `${c.id}: "${v.line}"`).toBeLessThanOrEqual(MAX_CHARS);
    }
  });

  it('evolutions use epic frames and evolution sprites', () => {
    const view = cardView(card('evolve', 'tarik-lance'));
    expect(view.frame).toBe('ui/card-epic');
    expect(view.sprite).toBe('evolutions/tarik-lance');
    expect(view.badge).toBe('EVOLVE');
    expect(view.label).toContain('Evolve Tarik Lance');
  });

  it('names linked bread on the card, including evolved links, within the phone text budget', () => {
    for (const bread of Object.values(CONTENT.breads)) for (const id of ['fish-curry', 'condensed-milk', 'mint-chutney'] as const) {
      const view = cardView({ kind: 'dip', id, level: 1, linkedBread: bread.id });
      expect(view.line).toContain(CONTENT.breads[bread.evolvedFrom?.bread ?? bread.id].name);
      expect(view.line.length).toBeLessThanOrEqual(MAX_CHARS);
      expect(view.label).toContain(`Linked to ${CONTENT.breads[bread.evolvedFrom?.bread ?? bread.id].name};`);
      expect(view.line).toMatch(/^Linked to /);
    }
    expect(cardView({ kind: 'dip', id: 'fish-curry', level: 1, linkedBread: 'murtabak' }).line).toBe('Linked to Murtabak');
  });

  it('keeps dip effects beside their scope, including upgrades and evolved links, within the phone text budget', () => {
    for (const bread of Object.values(CONTENT.breads)) for (const id of ['fish-curry', 'condensed-milk', 'mint-chutney'] as const) {
      for (const level of [1, 3]) {
        const global = cardView({ kind: 'dip', id, level });
        const view = cardView({ kind: 'dip', id, level, linkedBread: bread.id });
        expect(view.effect).toBe(global.line);
        expect(view.effect!.length).toBeLessThanOrEqual(MAX_CHARS);
        expect(words(view.effect!)).toBeLessThanOrEqual(8);
        expect(view.scope).toBe(`Linked to ${CONTENT.breads[bread.evolvedFrom?.bread ?? bread.id].name}`);
        expect(view.scope!.length).toBeLessThanOrEqual(MAX_CHARS);
        expect(words(view.scope!)).toBeLessThanOrEqual(8);
        expect(view.label).toContain(view.effect!);
        expect(view.label).toContain(`${view.scope};`);
        expect(view.label).toContain('on this bread only');
        expect(view.badge).toBe(global.badge);
      }
    }
  });

  it('identifies global dip scope without adding it to other card kinds', () => {
    for (const id of Object.keys(CONTENT.dips)) {
      const view = cardView(card('dip', id));
      expect(view.scope).toBe('All breads');
      expect(view.label).toBe(`${view.name}, new. ${view.line}`);
    }
    for (const kind of ['bread', 'evolve', 'passive', 'heal', 'gold'] as const) {
      const id = kind === 'bread' ? 'kosong' : kind === 'evolve' ? 'tarik-lance' : kind === 'passive' ? 'extra-dough' : '';
      expect(cardView(card(kind, id)).scope).toBeUndefined();
    }
  });

  it('heal and gold lines are at most 8 words too', () => {
    for (const c of [card('heal', ''), card('gold', '')]) {
      expect(words(cardView(c).line), c.kind).toBeLessThanOrEqual(8);
      expect(cardView(c).line.length, c.kind).toBeLessThanOrEqual(MAX_CHARS);
    }
  });

  it('no line has a word of more than 10 letters (a long word cannot wrap, and sets the width of the whole line; a hyphen can)', () => {
    const cards = [
      ...Object.keys(CONTENT.breads).map((id) => card('bread', id)),
      ...Object.keys(CONTENT.dips).map((id) => card('dip', id)),
      ...Object.keys(CONTENT.passives).map((id) => card('passive', id)),
    ];
    for (const c of cards) for (const word of cardView(c).line.split(/[\s-]+/)) expect(word.length, `${c.id}: "${word}"`).toBeLessThanOrEqual(10);
  });

  it('new picks badge NEW, upgrades show pips for the level they make', () => {
    expect(cardView(card('bread', 'naan', 1)).badge).toBe('NEW');
    expect(cardView(card('dip', 'ghee', 3)).badge).toBe('●●●○○');
    expect(cardView(card('passive', 'extra-dough', 3)).badge).toBe('●●●');
    expect(pipText(2, 2)).toBe('●●');
  });
});

 it('exposes real family, fit and bonus while keeping the effect and scope', () => {
  const good = cardView({ kind: 'dip', id: 'fish-curry', level: 1, linkedBread: 'inferno-bomb' });
  expect(good.family).toBe('Curries · Spice');
  expect(good.fit).toBe('Fits: Lob · Heat · Stuffed');
  expect(good.bonus).toBe('+25% tag bonus');
  const wrong = cardView({ kind: 'dip', id: 'fish-curry', level: 1, linkedBread: 'kosong' });
  expect(wrong.bonus).toBe('No tag bonus');
  expect(wrong.label).toContain('ordinary effect; No tag bonus');
  expect(wrong.effect).toBe('Burns over time');
  expect(wrong.scope).toBe('Linked to Kosong');
  expect(cardView({ kind: 'dip', id: 'masala', level: 1 }).family).toBe('Specials · Mixed');
 });
