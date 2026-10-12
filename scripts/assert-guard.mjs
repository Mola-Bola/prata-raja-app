#!/usr/bin/env node
// assert-guard: fail when a change weakens tests.
// Rejects, in test files changed between <base> and HEAD (or the working tree with --worktree):
//   - an assertion removed or changed. Removed and added assertion lines are paired by the SUBJECT
//     (the expression inside `expect(...)`) first; a line whose matcher changed is a changed assertion.
//     A subject that disappears may be paired matcher-for-matcher with a new subject only inside the
//     same diff hunk and only when both subjects are locators (page./getBy*/locator(/tid(...), so a healed
//     locator passes but a removed `expect(x).toBe(2)` is not cancelled by an unrelated `expect(y).toBe(2)`,
//     and `expect(response.status)` -> `expect(response.body)` is a changed assertion.
//   - a literal-only subject (`expect(2)`, `expect(true)`, `expect('x')`) replacing a real one (a tautology)
//   - a raised timeout: `{ timeout: N }`, `.setTimeout(N)`, `.timeout(N)`, Maestro/Playwright `timeout: N` where N grew
//   - pgTAP (`*.sql` under a tests dir): a removed `select is(` / `ok(` / `throws_ok(` / `lives_ok(` /
//     `results_eq(` ... line, and a lowered or removed `plan(N)`
//   - a net drop in assertion lines in any test file
//   - a new .skip / .only / .fixme / xit / xdescribe
//   - a deleted test file
// Usage: node assert-guard.mjs [base] [--worktree]   (base defaults to origin/main, then main)
// Exit 0 = clean, 1 = weakened tests (listed), 2 = could not run.
// Copied into each app as scripts/assert-guard.mjs; the source of truth is ~/cell/scripts/assert-guard.mjs.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const TEST_FILE = /(^|\/)(e2e|tests?|__tests__|specs?)\/|\.(spec|test)\.[cm]?[jt]sx?$/;
const ASSERT = /\bexpect(\.soft|\.poll)?\s*\(|\bassert(\.\w+)?\s*\(|\.should\(|- assert/;
const SKIP = /\b(test|it|describe)\.(skip|only|fixme)\s*\(|\b(xit|xdescribe|xtest)\s*\(|\btest\.fixme\b/;
// pgTAP assertion functions (plan() and finish() are handled separately).
const PGTAP = /^\s*(?:select|perform)\s+(?:is|isnt|ok|matches|imatches|doesnt_match|doesnt_imatch|alike|unalike|cmp_ok|pass|fail|throws_ok|throws_like|throws_imatching|throws_matching|lives_ok|performs_ok|results_eq|results_ne|row_eq|set_eq|bag_eq|set_has|bag_has|set_hasnt|bag_hasnt|is_empty|isnt_empty|is_member_of|isnt_member_of|has_\w+|hasnt_\w+|col_\w+|policies_are|policy_\w+|function_\w+|\w+_privs_are|\w+_are)\s*\(/i;
const PLAN = /^\s*select\s+plan\s*\(\s*(\d+)\s*\)/i;
// A timeout value: `timeout: 15_000`, `test.setTimeout(60000)`, `this.timeout(5000)`, `{ timeout: 2 * 1000 }`.
const NUM = String.raw`(\d[\d_]*)(?:\s*\*\s*(\d[\d_]*))?`;
const TIMEOUT = new RegExp(String.raw`\btimeout\s*:\s*${NUM}|\.setTimeout\s*\(\s*${NUM}|\.timeout\s*\(\s*${NUM}`, 'g');
const LITERAL = /^(?:-?\d[\d_]*(?:\.\d+)?|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`[^`$]*`|true|false|null|undefined|NaN|\[\s*\]|\{\s*\})$/;
const LOCATOR = /\b(?:page|screen|frame|locator|getBy\w*|findBy\w*|queryBy\w*|within|tid|\$\$?)\s*[.(]/;

const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const norm = (s) => s.replace(/\s+/g, ' ').replace(/[;,]\s*$/, '').trim();

/** The text inside `expect(...)` (balanced parentheses; string and regex literals are skipped), or null when the
 *  line is not an expect-style assertion. An unbalanced subject (the call continues on the next line) falls back
 *  to the whole line, so two different partial subjects never pair as "the same". */
export function subjectOf(line) {
  const m = line.match(/\bexpect(?:\.soft|\.poll)?\s*\(/);
  if (!m) return null;
  let depth = 1, i = m.index + m[0].length, quote = null, inClass = false, prev = '(';
  const start = i;
  for (; i < line.length; i++) {
    const c = line[i];
    if (quote === '/') {
      if (c === '\\') i++;
      else if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) quote = null;
      continue;
    }
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '/' && /[(,=:\[!&|?{};]/.test(prev)) quote = '/';
    else if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return norm(line.slice(start, i));
    if (!/\s/.test(c)) prev = c;
  }
  return norm(line);
}

export function matcherKey(line) {
  // The part after the subject: `.not.toHaveText('x', {...})`. Locator/subject changes are allowed.
  // Timeout values are blanked here; raised ones are reported by the timeout rule instead.
  const m = line.match(/\)\s*((?:\.(?:not|resolves|rejects))*\.(?:to\w+|should)\s*\(.*)$/);
  const key = m ? norm(m[1]) : norm(line);
  return key.replace(/\btimeout\s*:\s*\d[\d_]*(?:\s*\*\s*\d[\d_]*)?/g, 'timeout: #');
}

export const isLiteral = (subject) => subject != null && LITERAL.test(subject.replace(/^await\s+/, '').trim());
/** Could `after` be a re-targeted version of `before`? Only when both are locators (a healed locator). */
const retargeted = (before, after) => LOCATOR.test(before) && LOCATOR.test(after);

function timeouts(line) {
  const out = [];
  for (const m of line.matchAll(TIMEOUT)) {
    const [a, b] = [m[1] || m[3] || m[5], m[2] || m[4] || m[6]];
    out.push(Number(a.replace(/_/g, '')) * (b ? Number(b.replace(/_/g, '')) : 1));
  }
  return out;
}
const timeoutKey = (line) => norm(line.replace(TIMEOUT, (s) => s.replace(/\d[\d_]*(\s*\*\s*\d[\d_]*)?/, '#')));

/** Parse a unified diff (git diff -U0) into per-file removed/added lines, each tagged with its hunk index. */
function parseDiff(diff) {
  const files = new Map();
  let cur = null, hunk = -1;
  for (const line of diff.split('\n')) {
    let m;
    if ((m = line.match(/^diff --git a\/(.+?) b\/(.+)$/))) {
      cur = { a: m[1], b: m[2], removed: [], added: [], deleted: false };
      files.set(m[2], cur);
      hunk = -1;
      continue;
    }
    if (!cur) continue;
    if (line.startsWith('@@')) hunk++;
    else if (line.startsWith('deleted file mode')) cur.deleted = true;
    else if (line.startsWith('---') || line.startsWith('+++')) continue;
    else if (line.startsWith('-')) cur.removed.push({ text: line.slice(1), hunk });
    else if (line.startsWith('+')) cur.added.push({ text: line.slice(1), hunk });
  }
  return files;
}

const show = (l) => l.trim().slice(0, 140);

/** Pair removed and added JS/YAML assertions; push a problem for each removed one that is not accounted for. */
function checkAssertions(file, rem, add, problems) {
  const entries = (list) => list.map((l) => ({ ...l, subject: subjectOf(l.text), matcher: matcherKey(l.text), used: false }));
  const R = entries(rem), A = entries(add);
  const take = (pred) => { const a = A.find((x) => !x.used && pred(x)); if (a) a.used = true; return a; };
  // 1. identical assertions (moved lines) cancel anywhere in the file
  for (const r of R) if (take((a) => a.subject === r.subject && a.matcher === r.matcher)) r.used = true;
  // 2. same subject, different matcher: a changed assertion (consumes the added line so it cannot cancel another)
  for (const r of R) {
    if (r.used || r.subject == null) continue;
    const a = take((x) => x.subject === r.subject);
    if (a) { r.used = true; problems.push(`${file}: assertion removed or changed: ${show(r.text)}`); }
  }
  // 3. subject gone: pair matcher-for-matcher with a new subject in the same hunk when it looks re-targeted
  for (const r of R) {
    if (r.used) continue;
    r.used = true;
    if (r.subject == null) { problems.push(`${file}: assertion removed or changed: ${show(r.text)}`); continue; }
    const a = take((x) => x.hunk === r.hunk && x.subject != null && x.matcher === r.matcher && !R.some((y) => y.subject === x.subject));
    if (!a) problems.push(`${file}: assertion removed or changed: ${show(r.text)}`);
    else if (isLiteral(a.subject) && !isLiteral(r.subject)) problems.push(`${file}: assertion weakened to a literal subject (tautology): ${show(r.text)} -> ${show(a.text)}`);
    else if (!isLiteral(r.subject) && !retargeted(r.subject, a.subject)) problems.push(`${file}: assertion removed or changed (new subject is unrelated): ${show(r.text)} -> ${show(a.text)}`);
  }
}

function checkTimeouts(file, removed, added, problems) {
  // Pair a removed timeout line with an added one: same text (numbers blanked) in the same hunk, else any line in the
  // same hunk using the same timeout syntax (so a rename on the same line cannot hide a raise), else same text anywhere.
  const tag = (l) => ({ ...l, vals: timeouts(l.text), key: timeoutKey(l.text), form: (l.text.match(TIMEOUT) || []).map((t) => t.replace(/[\d_\s*]+/g, '')).join('|'), used: false });
  const A = added.map(tag).filter((l) => l.vals.length);
  for (const r of removed.map(tag)) {
    if (!r.vals.length) continue;
    const pick = (pred) => A.find((x) => !x.used && pred(x));
    const a = pick((x) => x.hunk === r.hunk && x.key === r.key) || pick((x) => x.hunk === r.hunk && x.form === r.form) || pick((x) => x.key === r.key);
    if (!a) continue;
    a.used = true;
    r.vals.forEach((n, i) => { if (a.vals[i] > n) problems.push(`${file}: timeout raised ${n} -> ${a.vals[i]}: ${show(a.text)}`); });
  }
}

function checkPgTap(file, f, problems) {
  const rem = f.removed.filter((l) => PGTAP.test(l.text));
  const add = f.added.filter((l) => PGTAP.test(l.text));
  const pool = new Map();
  for (const l of add) { const k = norm(l.text); pool.set(k, (pool.get(k) || 0) + 1); }
  for (const l of rem) {
    const k = norm(l.text);
    if (pool.get(k) > 0) pool.set(k, pool.get(k) - 1);
    else problems.push(`${file}: assertion removed or changed: ${show(l.text)}`);
  }
  if (add.length < rem.length) problems.push(`${file}: ${rem.length - add.length} fewer assertion line(s)`);
  const planOf = (list) => list.map((l) => l.text.match(PLAN)).filter(Boolean).map((m) => Number(m[1]));
  const [before] = planOf(f.removed), [after] = planOf(f.added);
  if (before != null && after == null) problems.push(`${file}: plan(${before}) removed`);
  else if (before != null && after < before) problems.push(`${file}: plan lowered ${before} -> ${after} (${before - after} assertion(s) gone)`);
}

/**
 * Owner-approved copy changes (scripts/approved-test-copy.json next to this file: { authorization, changes: [{ file, before, after }] }):
 * an assertion whose wording the owner approved may change from `before` to `after` in that file. Both lines are consumed before
 * any pairing, so an approval can never excuse a different removed assertion.
 */
function dropApproved(file, rem, add, approved) {
  const out = { rem: [...rem], add: [...add] };
  for (const c of approved) {
    if (c.file !== file) continue;
    const ri = out.rem.findIndex((l) => l.text.trim() === String(c.before).trim());
    const ai = out.add.findIndex((l) => l.text.trim() === String(c.after).trim());
    if (ri >= 0 && ai >= 0) { out.rem.splice(ri, 1); out.add.splice(ai, 1); }
  }
  return out;
}

/** Pure check over a unified diff (git diff -U0 output). Returns a list of problems. */
export function checkDiff(diff, approvedCopyChanges = []) {
  const problems = [];
  for (const f of parseDiff(diff).values()) {
    if (!TEST_FILE.test(f.b) && !TEST_FILE.test(f.a)) continue;
    if (f.deleted) { problems.push(`${f.a}: test file deleted`); continue; }
    if (/\.sql$/i.test(f.b)) { checkPgTap(f.b, f, problems); continue; }
    const { rem, add } = dropApproved(f.b, f.removed.filter((l) => ASSERT.test(l.text)), f.added.filter((l) => ASSERT.test(l.text)), approvedCopyChanges);
    checkAssertions(f.b, rem, add, problems);
    if (add.length < rem.length) problems.push(`${f.b}: ${rem.length - add.length} fewer assertion line(s)`);
    checkTimeouts(f.b, f.removed, f.added, problems);
    for (const l of f.added) if (SKIP.test(l.text)) problems.push(`${f.b}: test skipped/focused: ${show(l.text)}`);
  }
  return problems;
}

function main() {
  const args = process.argv.slice(2);
  const worktree = args.includes('--worktree');
  let base = args.find((a) => !a.startsWith('--'));
  try {
    if (!base) {
      for (const b of ['origin/main', 'main']) {
        try { git(['rev-parse', '--verify', '-q', b]); base = b; break; } catch {}
      }
    }
    const range = worktree ? [base] : [`${base}...HEAD`];
    const diff = git(['diff', '-U0', '--no-color', '--find-renames', ...range]);
    let approved = [];
    try { approved = JSON.parse(readFileSync(new URL('./approved-test-copy.json', import.meta.url), 'utf8')).changes ?? []; } catch { /* no approvals file: nothing is approved */ }
    const problems = checkDiff(diff, approved);
    if (problems.length) {
      console.log(`assert-guard: FAIL (${problems.length}) vs ${base}`);
      for (const p of problems) console.log(`  - ${p}`);
      console.log('Tests must not be weakened. Fix the app or the locator, keep the assertion. If a check is truly obsolete, the owner approves it in the PR.');
      process.exit(1);
    }
    console.log(`assert-guard: ok vs ${base}`);
  } catch (e) {
    console.error(`assert-guard: could not run: ${e.message.split('\n')[0]}`);
    process.exit(2);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
