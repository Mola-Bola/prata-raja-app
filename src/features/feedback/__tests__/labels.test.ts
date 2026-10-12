import { describe, expect, it } from 'vitest';

import { brandWords } from '@/brand';

import { feedbackTeam, journeyStep, notesSummary, planLine, replyAuthor, STAGE_OF, STATUS, statusLabel } from '../labels';

const TEAM = brandWords.words.team;

describe('feedback wording for family vs the owner', () => {
  it('family never read about “Claude”; the owner (admin) still does', () => {
    expect(feedbackTeam(false)).toEqual({ name: `the ${TEAM}`, Name: `The ${TEAM}` });
    expect(feedbackTeam(null)).toEqual({ name: `the ${TEAM}`, Name: `The ${TEAM}` });
    expect(feedbackTeam(true)).toEqual({ name: 'Claude', Name: 'Claude' });
  });

  it('status pills are neutral for family', () => {
    for (const s of Object.keys(STATUS) as (keyof typeof STATUS)[]) {
      expect(statusLabel(s, false)).not.toMatch(/Claude/);
    }
    expect(statusLabel('needs_info', true)).toBe('Claude has a question');
    expect(statusLabel('shipped', false)).toBe(STATUS.shipped.label);
  });

  it('replies with no author (written by Claude) show as the app team for family', () => {
    const fromClaude = { author_id: null, author_label: 'Claude' };
    expect(replyAuthor(fromClaude, false)).toBe(TEAM);
    expect(replyAuthor(fromClaude, true)).toBe('Claude');
    expect(replyAuthor({ author_id: 'u1', author_label: 'Mum' }, false)).toBe('Mum');
    // Someone whose profile was deleted (author set to null) keeps their name.
    expect(replyAuthor({ author_id: null, author_label: 'Mum' }, false)).toBe('Mum');
  });
});

describe('My notes: where a note is, in plain words', () => {
  it('maps every stored status to Received · Planned · Building · Shipped · Done · Not now', () => {
    expect(STATUS.new.label).toBe('Received');
    expect(STATUS.proposed.label).toBe('Plan ready: OK to build?'); // waiting for the author's yes
    expect(STAGE_OF.proposed).toBe('planned');
    expect(STATUS.approved.label).toBe('Planned');
    expect(STATUS.in_progress.label).toBe('Building');
    expect(STATUS.shipped.label).toBe('Shipped: check it');
    expect(STATUS.done.label).toBe('Done');
    expect(STATUS.wont_do.label).toBe('Not now');
    for (const s of Object.keys(STATUS) as (keyof typeof STATUS)[]) expect(STAGE_OF[s]).toBeTruthy();
  });

  it('places a note on its journey; parked or joined notes step off it', () => {
    expect(journeyStep('new')).toBe(0);
    expect(journeyStep('needs_info')).toBe(0);
    expect(journeyStep('approved')).toBe(1);
    expect(journeyStep('in_progress')).toBe(2);
    expect(journeyStep('shipped')).toBe(3);
    expect(journeyStep('done')).toBe(4);
    expect(journeyStep('wont_do')).toBeNull();
    expect(journeyStep('duplicate')).toBeNull();
  });

  const me = 'author';
  const claude = { author_id: null, author_label: 'Claude' };
  const note = (status: Parameters<typeof planLine>[0]['status'], plan: string | null, messages: { author_id: string | null; author_label: string; body: string }[]) => ({
    status,
    plan,
    author_id: me,
    messages,
  });

  it('shows the plan once there is one', () => {
    expect(planLine(note('approved', 'Status and plan under each note', [{ ...claude, body: 'On it' }]), true)).toEqual({
      kind: 'plan',
      who: 'The plan',
      text: 'Status and plan under each note',
    });
  });

  it('otherwise the latest word from the team (first line), named for family as the app team', () => {
    const f = note('needs_info', null, [
      { ...claude, body: 'Per page, or everywhere?\nEither is easy.' },
      { author_id: me, author_label: 'Mum', body: 'Hmm' },
    ]);
    expect(planLine(f, false)).toEqual({ kind: 'reply', who: TEAM, text: 'Per page, or everywhere?' });
  });

  it('a reopened note shows nothing until someone answers the author’s last word', () => {
    const f = note('new', 'Old plan', [
      { ...claude, body: 'Shipped in 1.2.4' },
      { author_id: me, author_label: 'Alex', body: 'Still not right: too small' },
    ]);
    expect(planLine(f, true)).toBeNull();
    expect(planLine(note('new', null, []), true)).toBeNull();
  });

  it('sums up where your notes are for Me', () => {
    expect(notesSummary([])).toMatch(/Nothing yet/);
    expect(notesSummary([{ status: 'shipped' }, { status: 'in_progress' }, { status: 'in_progress' }, { status: 'done' }])).toBe('1 to check · 2 being built');
    expect(notesSummary([{ status: 'done' }, { status: 'wont_do' }])).toBe('2 notes, all wrapped up');
  });
});
