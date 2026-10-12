import { brandWords } from '@/brand';
import type { FeedbackKind, FeedbackStatus } from '@/data';

const SAY = brandWords.statusLabels;
const TEAM = brandWords.words.team;

export const KIND_EMOJI: Record<FeedbackKind, string> = { like: '👍', dislike: '👎', bug: '🐞', idea: '💡', change: '✏️' };
export const KIND_LABEL: Record<FeedbackKind, string> = { like: 'Like', dislike: 'Don’t like', bug: 'Bug', idea: 'Idea', change: 'Change' };
/** The kind is guessed from the words, so it's only a small icon, never a heading (MaterialCommunityIcons names). */
export const KIND_ICON: Record<FeedbackKind, string> = {
  like: 'thumb-up-outline',
  dislike: 'thumb-down-outline',
  bug: 'bug-outline',
  idea: 'lightbulb-outline',
  change: 'pencil-outline',
};

type Tone = 'neutral' | 'primary' | 'success' | 'warn' | 'error' | 'muted' | 'tertiary';

/**
 * Where a note is, in words the owner and family understand. Several stored statuses read the same:
 * "proposed" and "approved" are both Planned (the owner's notes are built without waiting for a Go ahead).
 * Keep in step with public.feedback_stage() in 20261001000060_feedback_progress.sql.
 */
export type Stage = 'received' | 'question' | 'planned' | 'building' | 'shipped' | 'done' | 'not_now' | 'merged';

export const STAGE_OF: Record<FeedbackStatus, Stage> = {
  new: 'received',
  needs_info: 'question',
  proposed: 'planned',
  approved: 'planned',
  in_progress: 'building',
  shipped: 'shipped',
  done: 'done',
  wont_do: 'not_now',
  duplicate: 'merged',
};

export const STAGE: Record<Stage, { label: string; tone: Tone; icon: string }> = {
  received: { label: SAY.received, tone: 'neutral', icon: 'inbox-arrow-down-outline' },
  question: { label: SAY.question, tone: 'warn', icon: 'comment-question-outline' },
  planned: { label: SAY.planned, tone: 'tertiary', icon: 'map-marker-path' },
  building: { label: SAY.building, tone: 'primary', icon: 'hammer-wrench' },
  shipped: { label: SAY.shipped, tone: 'success', icon: 'rocket-launch-outline' },
  done: { label: SAY.done, tone: 'muted', icon: 'check-circle-outline' },
  not_now: { label: SAY.not_now, tone: 'muted', icon: 'pause-circle-outline' },
  merged: { label: SAY.merged, tone: 'muted', icon: 'call-merge' },
};

/**
 * Per stored status. A plan still waiting for the author's yes (`feedback.mjs plan --ask`, family notes) is on the
 * Planned step but says so, so nobody thinks it's being built already.
 */
export const STATUS: Record<FeedbackStatus, { label: string; tone: Tone }> = {
  ...(Object.fromEntries(
    (Object.keys(STAGE_OF) as FeedbackStatus[]).map((s) => [s, { label: STAGE[STAGE_OF[s]].label, tone: STAGE[STAGE_OF[s]].tone }]),
  ) as Record<FeedbackStatus, { label: string; tone: Tone }>),
  proposed: { label: SAY.planReady, tone: 'warn' },
};

/** The road a note travels, for the progress line on a note. Not now / merged step off it. */
export const JOURNEY: Stage[] = ['received', 'planned', 'building', 'shipped', 'done'];

/** How far along the journey a note is (0-based), or null when it's off it (Not now, joined with another). */
export function journeyStep(status: FeedbackStatus): number | null {
  const stage = STAGE_OF[status];
  if (stage === 'question') return 0;
  const i = JOURNEY.indexOf(stage);
  return i < 0 ? null : i;
}

type Admin = boolean | null | undefined;

/**
 * Who reads and answers feedback notes. The owner (an admin) works them with Claude, so their wording names Claude.
 * Everyone else (family) doesn't know who that is, so theirs says "the … team" (src/brand.ts words.team).
 */
export function feedbackTeam(isAdmin: Admin): { name: string; Name: string } {
  return isAdmin ? { name: 'Claude', Name: 'Claude' } : { name: `the ${TEAM}`, Name: `The ${TEAM}` };
}

/** A status pill's words. The owner's question reads "Claude has a question"; family read "Question for you". */
export function statusLabel(status: FeedbackStatus, isAdmin: Admin): string {
  return status === 'needs_info' && isAdmin ? SAY.adminQuestion : STATUS[status].label;
}

/** Who wrote a reply. People keep their names; Claude's replies (scripts/feedback.mjs) show as the app's team to family. */
export function replyAuthor(m: { author_id: string | null; author_label: string }, isAdmin: Admin): string {
  return !isAdmin && !m.author_id && m.author_label === 'Claude' ? TEAM : m.author_label;
}

type NoteLike = {
  status: FeedbackStatus;
  plan?: string | null;
  author_id: string;
  messages: { author_id: string | null; author_label: string; body: string }[];
};

/** Statuses where the note's plan (feedback.plan) is the line worth showing. */
const PLAN_STAGES: Stage[] = ['planned', 'building', 'shipped', 'done'];

/**
 * The one line under a note in My notes: its plan once there is one, otherwise the latest word from whoever is
 * working on it (a question, why it's parked). Nothing while the author has had the last word.
 */
export function planLine(f: NoteLike, isAdmin: Admin): { kind: 'plan' | 'reply'; who: string; text: string } | null {
  const stage = STAGE_OF[f.status];
  const plan = f.plan?.trim();
  if (plan && PLAN_STAGES.includes(stage)) return { kind: 'plan', who: 'The plan', text: plan };
  const last = f.messages[f.messages.length - 1];
  const fromTeam = [...f.messages].reverse().find((m) => m.author_id !== f.author_id);
  // Reopened: only a reply written after the author's own last word counts.
  const pick = stage === 'received' ? (last && last.author_id !== f.author_id ? last : undefined) : fromTeam;
  if (!pick) return null;
  const text = pick.body.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  return text ? { kind: 'reply', who: replyAuthor(pick, isAdmin), text } : null;
}

/** Me → Feedback & ideas: one line saying where your notes are ("1 to check · 2 being built"). */
export function notesSummary(notes: { status: FeedbackStatus }[]): string {
  if (!notes.length) return 'Nothing yet. Tap the tab on the right edge of any screen.';
  const count = (stages: Stage[]) => notes.filter((n) => stages.includes(STAGE_OF[n.status])).length;
  const parts = [
    [count(['question']), 'to answer'],
    [count(['shipped']), 'to check'],
    [count(['building']), 'being built'],
    [count(['planned']), 'planned'],
    [count(['received']), 'received'],
  ]
    .filter(([n]) => (n as number) > 0)
    .slice(0, 3)
    .map(([n, w]) => `${n} ${w}`);
  return parts.length ? parts.join(' · ') : `${notes.length} note${notes.length === 1 ? '' : 's'}, all wrapped up`;
}
