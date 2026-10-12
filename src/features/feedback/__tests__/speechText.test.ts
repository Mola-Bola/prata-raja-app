import { describe, expect, it } from 'vitest';

import { collapseCumulative, insertAtCursor, looksCumulative, newFinalWords, transcriptFromResults } from '../speechText';

const res = (...items: [string, boolean][]) => items.map(([transcript, isFinal]) => Object.assign([{ transcript }], { isFinal }));

describe('insertAtCursor', () => {
  it('appends with one space when the cursor is at the end', () => {
    expect(insertAtCursor('Hello', 5, 'world')).toEqual({ text: 'Hello world', cursor: 11 });
    expect(insertAtCursor('Hello ', 6, 'world')).toEqual({ text: 'Hello world', cursor: 11 });
  });
  it('starts a blank note without a leading space', () => {
    expect(insertAtCursor('', 0, ' hi there ')).toEqual({ text: 'hi there', cursor: 8 });
  });
  it('goes in at the cursor, not the end, and leaves the cursor after the new words', () => {
    const r = insertAtCursor('The cat sat down', 7, 'black');
    expect(r.text).toBe('The cat black sat down');
    expect(r.text.slice(0, r.cursor)).toBe('The cat black');
    // The next chunk carries on from there.
    expect(insertAtCursor(r.text, r.cursor, 'and fat').text).toBe('The cat black and fat sat down');
  });
  it('does not add a space before punctuation that is already there', () => {
    expect(insertAtCursor('Hello, world', 5, 'there').text).toBe('Hello there, world');
    expect(insertAtCursor('Hello world', 0, 'Oh').text).toBe('Oh Hello world');
  });
  it('clamps a stale cursor and ignores empty speech', () => {
    expect(insertAtCursor('abc', 99, 'd').text).toBe('abc d');
    expect(insertAtCursor('abc', -4, 'd').text).toBe('d abc');
    expect(insertAtCursor('abc', 1, '  ')).toEqual({ text: 'abc', cursor: 1 });
  });
});

describe('transcriptFromResults (Web Speech)', () => {
  it('joins finished phrases and keeps the unfinished tail apart', () => {
    expect(transcriptFromResults(res(['hello there', true], [' how are', false]))).toEqual({ final: 'hello there', interim: 'how are' });
  });
  it('rebuilds the same text from the whole list every time (cumulative results)', () => {
    const e1 = res(['hello', false]);
    const e2 = res(['hello there', true], ['how', false]);
    const e3 = res(['hello there', true], ['how are you', true]);
    expect(transcriptFromResults(e1)).toEqual({ final: '', interim: 'hello' });
    expect(transcriptFromResults(e2)).toEqual({ final: 'hello there', interim: 'how' });
    expect(transcriptFromResults(e3)).toEqual({ final: 'hello there how are you', interim: '' });
  });
  it('copes with empty and missing alternatives', () => {
    expect(transcriptFromResults([])).toEqual({ final: '', interim: '' });
    expect(transcriptFromResults([Object.assign([], { isFinal: true })])).toEqual({ final: '', interim: '' });
  });
});

describe('newFinalWords: no word is added twice', () => {
  it('Android Chrome sends the same finished phrases again with each event', () => {
    let committed = '';
    const typed: string[] = [];
    for (const final of ['', 'hello there', 'hello there', 'hello there how are you', 'hello there how are you']) {
      const r = newFinalWords(committed, final);
      committed = r.committed;
      if (r.add) typed.push(r.add);
    }
    expect(typed).toEqual(['hello there', 'how are you']);
  });
  it('a reworded earlier phrase does not repeat', () => {
    const a = newFinalWords('', 'two tim tams');
    const b = newFinalWords(a.committed, '2 Tim Tams for mum');
    expect(a.add).toBe('two tim tams');
    expect(b.add).toBe('for mum');
  });
  it('ignores a shorter result', () => {
    expect(newFinalWords('a b c', 'a b')).toEqual({ add: '', committed: 'a b c' });
  });
});

describe('cumulative results (Android Chrome)', () => {
  it('keeps the longest snapshot, adds a real new phrase, drops an older shorter one', () => {
    expect(collapseCumulative(['hello', 'hello there', 'hello there how are you'])).toBe('hello there how are you');
    expect(collapseCumulative(['hello there', 'how are you', 'hello there how are you today'])).toBe('hello there how are you today');
    expect(collapseCumulative(['hello there how', 'hello there'])).toBe('hello there how');
    expect(collapseCumulative(['one', 'two'])).toBe('one two');
    expect(collapseCumulative([])).toBe('');
  });
  it('ignores capitals, punctuation and hyphens when comparing', () => {
    expect(collapseCumulative(['two tim tams', 'Two Tim-Tams, for mum'])).toBe('Two Tim-Tams, for mum');
  });
  it('reads a list as said once, and takes the finished words off the unfinished tail', () => {
    const list = res(['hello', true], ['hello there', true], ['hello there how', false]);
    expect(transcriptFromResults(list, { cumulative: true })).toEqual({ final: 'hello there', interim: 'how' });
    // Without it, the list is added up as is (desktop).
    expect(transcriptFromResults(list)).toEqual({ final: 'hello hello there', interim: 'hello there how' });
  });
  it('only a chain of three growing phrases counts as a sign of it; two real phrases can start alike', () => {
    expect(looksCumulative(['yes', 'yes'])).toBe(false);
    expect(looksCumulative(['I need help', 'I need help with packing'])).toBe(false);
    expect(looksCumulative(['two', 'two tim tams', 'two tim tams for mum'])).toBe(true);
    expect(looksCumulative(['two tim tams', 'for mum', 'two tim tams for mum'])).toBe(false);
  });
  it('a growing hyphenated word keeps its end', () => {
    expect(newFinalWords('sugar', 'sugar-free biscuits')).toEqual({ add: 'free biscuits', committed: 'sugar-free biscuits' });
    expect(newFinalWords('', 'Tim-Tams, please')).toEqual({ add: 'Tim-Tams, please', committed: 'Tim-Tams, please' });
  });
  it('words are counted as words: hyphens and punctuation do not shift what is new', () => {
    expect(newFinalWords('two tim tams', 'Two Tim-Tams, for mum')).toEqual({ add: 'for mum', committed: 'Two Tim-Tams, for mum' });
  });
});
