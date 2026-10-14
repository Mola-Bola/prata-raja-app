// The words file: every name and feature word people see, in one place, so the app can be renamed with one edit (and an OTA).
// Screens, notifications, the web page (title, manifest, preview card), app.config.js (the name under the icon, permission
// prompts) and the brand lint all read it. Ids that never change (the slug, package id, table names) are NOT here.
//
// Rules:
// - Pure data (no imports, no types, no expressions), so scripts and app.config.js can read it without a TypeScript loader.
// - The app name and every word in `lintWords` and `extensions` must not appear as a string literal or JSX text anywhere
//   else in src/ or supabase/functions/: `node scripts/brand-lint.mjs` (part of check.sh) fails if one does. Write
//   `${brandWords.appName}` in a sentence instead. Exceptions go in scripts/brand-allow.txt.
// - Renaming: see "Renaming the app" in README.md.
export const brandWords = {
  /** What people call the app: under the icon, in titles, in sentences ("Can't reach Prata Raja"). */
  appName: 'Prata Raja',
  /** Where space is tight (home-screen label on the web, the manifest's short_name). 12 characters or fewer. */
  shortName: 'Prata Raja',
  /** One line under the wordmark on Welcome. */
  tagline: 'Flip, throw, fight for the stall.',
  /** One sentence for the web manifest, store text and link previews. */
  description: "Flip, throw, fight for the stall: a prata man's roguelite.",

  /** Feature words. Change the word here and every screen follows. */
  words: {
    /** The feedback button and sheet. */
    tell: 'Tell Kannan',
    kitchen: 'Test Kitchen',
    /** Who answers notes, as family see it ("the … team" / "The … team"). */
    team: 'Prata Raja team',
    /** The group of people an extension is shared with (extension audience "circle"). */
    circle: 'circle',
    circles: 'circles',
    /** The wish-to-build loop (Kampong calls wishes Seeds): the thing, and planting one. */
    seed: 'Seed',
    seeds: 'Seeds',
    plant: 'Plant',
  },

  /**
   * The system prompts for the microphone (feedback by voice). Native: they change with a new APK, not an OTA. An app
   * that adopts this file copies its existing app.json wording here word for word (Hatch: a changed prompt is health
   * wording and needs the Codex health review line).
   */
  permissions: {
    microphone: 'Prata Raja uses the microphone so you can speak your notes instead of typing them.',
    speechRecognition: 'Prata Raja turns what you say into text for your notes.',
  },

  /** The bottom tabs. `index` (Home) and `me` are the starter's; add one per tab you create (and its TAB_TITLE line in src/ui/a11y.ts). */
  tabs: { home: 'Home', me: 'Me' },

  /** Where a feedback note is, in words the owner and family understand (src/features/feedback/labels.ts). */
  statusLabels: {
    received: 'Received',
    question: 'Question for you',
    planned: 'Planned',
    building: 'Building',
    shipped: 'Shipped: check it',
    done: 'Done',
    not_now: 'Not now',
    merged: 'Joined with another note',
    /** A plan waiting for the author's yes. */
    planReady: 'Plan ready: OK to build?',
    /** What the owner reads instead of "Question for you". */
    adminQuestion: 'Claude has a question',
  },

  /** The short words on a note's progress line (src/features/feedback/Journey.tsx). */
  statusShort: { received: 'Received', planned: 'Planned', building: 'Building', shipped: 'Shipped', done: 'Done' },

  /** Each extension's display name by id. `akit new-ext` adds a line above the marker; keep the marker. */
  extensions: {
    // akit:ext-words
  },

  /**
   * Feature words the brand lint guards (besides appName, shortName and the extension names): add a word here when it is a
   * name of this app's (Kampong: 'Seeds'), not when it is ordinary English.
   */
  lintWords: [],
};
