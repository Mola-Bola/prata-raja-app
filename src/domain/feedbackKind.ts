// What kind of note someone left in "Tell …", worked out from their words, so nobody has to pick Bug / Idea / Change
// before they can say what's on their mind. It's a first guess for sorting the inbox; whoever answers can re-tag it.
export type NoteKind = 'like' | 'dislike' | 'bug' | 'idea' | 'change';

const has = (text: string, re: RegExp) => re.test(text);

// Something isn't working: errors, crashes, things covering or hiding other things, wrong numbers.
const BUG =
  /\b(bug|crash(es|ed|ing)?|broken|break(s|ing)?|error|fail(s|ed|ing)?|stuck|freez(e|es|ing)|frozen|glitch|jumbled|doesn'?t (work|load|show|save|open|appear)|does not (work|load|show|save|open|appear)|didn'?t (work|load|show|save|open)|won'?t (work|load|show|save|open|let)|can'?t (tap|click|see|open|save|scroll|type|find|log|sign)|cannot|not (working|loading|showing|saving)|disappear(s|ed|ing)?|covers?|covered|overlap(s|ping)?|cut off|wrong|missing|blank|keeps? (crashing|closing|logging)|how (can|do) i)\b/;
// Wants something different about what's already there.
const CHANGE =
  /\b(should|shouldn'?t|rename|re-?word|move (the|it|this)|make (it|this|the)|change (the|it|this)|instead of|swap|replace|too (big|small|many|much|long|busy|cluttered)|so many|clutter(ed)?|hard to (read|find|see|use)|more (like|user)|less)\b/;
// Wants something that isn't there yet.
const IDEA =
  /\b(idea|would be (nice|great|cool|good)|could (we|you|it)|can (we|you|it)|any ?way|what if|maybe|wish|add (a|an|some)|let (me|us|people|users)|allow|feature|suggest|option to|be able to|how would i know)\b/;
const LIKE = /(\b(love|like|great|nice|awesome|perfect|brilliant|good job|well done|works (well|great)|much better|so good)\b|👍|❤️|🙌|😍)/;
const DISLIKE = /(\b(hate|don'?t like|do not like|dislike|ugly|annoying|confusing|awkward|clunky|not (intuitive|user.?friendly|fluid|great|good))\b|👎|😡|🤮)/;

/** Best guess at a note's kind from its words. Problems beat wishes, wishes beat opinions. */
export function guessNoteKind(note: string): NoteKind {
  const text = note.toLowerCase().replace(/[’‘]/g, "'");
  if (has(text, BUG)) return 'bug';
  if (has(text, CHANGE)) return 'change';
  if (has(text, IDEA)) return 'idea';
  if (has(text, DISLIKE)) return 'dislike';
  if (has(text, LIKE)) return 'like';
  return 'idea';
}
