import { describe, expect, it } from 'vitest';

import { guessNoteKind } from '../feedbackKind';

describe('guessNoteKind', () => {
  it.each([
    // The owner's own notes from 2026-09-30.
    ['How can I fky from singapore to singapore, I fet it for bigger countries', 'bug'],
    ['for the feature request floating icon it doesn’t appear when I’m putting in forms, the keyboard just covers the text', 'bug'],
    ['yeah this doesn’t feel too intuitive too many boxes showed up once when I’m just putting a slight detail in', 'change'],
    ['likewise there’s so many things going on in this page the user friendliness of it is not there', 'change'],
    ['anyway for us to allow users to just put in the flight number and a date maybe then track the exact flight', 'idea'],
    ['once I’ve given some feedback how would I know what changes are going to be made', 'idea'],
    ['Love the new trip cards 👍', 'like'],
    ['I don’t like this colour', 'dislike'],
    ['The Save button should say Done', 'change'],
    ['Shop sheet should remember my last currency', 'change'],
    ['hmm', 'idea'],
  ] as const)('%s → %s', (note, kind) => {
    expect(guessNoteKind(note)).toBe(kind);
  });
});
