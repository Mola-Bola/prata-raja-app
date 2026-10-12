// Shared words shown to people. They live in src/brand.ts (the words file: rename things app-wide there); this file
// re-exports them under the names the screens use.
import { brandWords } from '../brand';

export const APP_NAME = brandWords.appName;
/** The app's id (its slug): the feedback `module` for notes written outside any extension. An id, never shown, never renamed. */
export const APP_ID = 'prata-raja';
export const TAGLINE = brandWords.tagline;
/** Feature words ("Tell …", "the … team", circle, Seeds). */
export const WORDS = brandWords.words;

/** The bottom tabs (src/brand.ts `tabs`). */
export const TAB_LABELS = brandWords.tabs;
