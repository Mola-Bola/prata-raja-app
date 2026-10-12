// Manifest rules for v1. Pure; the manifest test runs them over every extension and check.sh runs that test.
import { isSemver } from './compat';
import { CAPABILITIES, type ExtensionManifest } from './types';

type Checked = Pick<ExtensionManifest, 'id' | 'name' | 'accent' | 'audience' | 'minRole' | 'privacy' | 'href' | 'version' | 'minShell' | 'capabilities'>;

/** The same pattern as the database check on feedback.module (migration shell.sql). */
export const MODULE_ID = /^[a-z][a-z0-9_-]{0,31}$/;

/** Every broken rule, as short sentences; empty when the manifest is fine. */
export function validateManifest(m: Checked): string[] {
  const bad: string[] = [];
  const say = (s: string) => bad.push(`${m.id || '(no id)'}: ${s}`);
  if (!MODULE_ID.test(m.id)) say('id must match the feedback module pattern ^[a-z][a-z0-9_-]{0,31}$');
  if (!m.name?.trim()) say('name is empty');
  if (!/^#[0-9A-Fa-f]{6}$/.test(m.accent)) say('accent must be a #RRGGBB colour');
  if (m.href !== `/${m.id}`) say(`href must be /${m.id}`);
  if (!isSemver(m.version)) say('version must be x.y.z');
  if (!isSemver(m.minShell)) say('minShell must be x.y.z');
  if (!Array.isArray(m.capabilities)) say('capabilities must be a list (empty when none)');
  const seen = new Set<string>();
  for (const c of m.capabilities ?? []) {
    if (!CAPABILITIES.includes(c.name)) say(`unknown capability "${c.name}"`);
    if (seen.has(c.name)) say(`capability "${c.name}" declared twice`);
    seen.add(c.name);
    if (!c.why || c.why.trim().length < 5 || c.why.length > 60) say(`capability "${c.name}" needs a why of 5 to 60 characters`);
  }
  // Kids may not see anything that moves money.
  if (m.minRole === 'kid' && seen.has('money')) say('a kid-visible extension (minRole kid) may not declare money');
  // Health: location and money in a health extension are not allowed either (keeps it a private notebook).
  if (m.privacy === 'health' && (seen.has('money') || seen.has('location'))) say('a health extension may not declare money or location');
  return bad;
}
