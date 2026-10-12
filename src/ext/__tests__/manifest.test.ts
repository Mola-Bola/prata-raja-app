// Manifest v1 rules over registered extensions, read from source because the manifests import React Native.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { brandWords } from '@/brand';

import { compareVersions, shellSatisfies } from '../compat';
import { type Capability, type ExtensionManifest } from '../types';
import { validateManifest } from '../validate';

const dir = join(import.meta.dirname, '..');
const root = join(dir, '..', '..');
const field = (src: string, key: string) => src.match(new RegExp(`^\\s*${key}:\\s*'([^']*)'`, 'm'))?.[1] ?? '';
/** A manifest's name: a literal, or its line in the words file (`name: brandWords.extensions.<id>` / `['<id>']`). */
const nameOf = (src: string) => {
  const ref = src.match(/^\s*name:\s*brandWords\.extensions(?:\.([\w-]+)|\['([\w-]+)'\])/m);
  return ref ? ((brandWords.extensions as Record<string, string>)[ref[1] ?? ref[2]!] ?? '') : field(src, 'name');
};
const caps = (src: string) => {
  const list = src.match(/capabilities:\s*\[([\s\S]*?)\n?\s*\],?\n/);
  if (!list) throw new Error('manifest must declare a capabilities list (empty when none)');
  const body = list[1]!;
  const parsed = [...body.matchAll(/\{\s*name:\s*'([^']*)',\s*why:\s*'((?:[^'\\]|\\.)*)'\s*,?\s*\}/g)].map((m) => ({ name: m[1] as Capability, why: m[2]!.replace(/\\(\\|'|u2028|u2029)/g, (_, escaped: string) => escaped === 'u2028' ? '\u2028' : escaped === 'u2029' ? '\u2029' : escaped) }));
  const declared = (body.match(/\{\s*name\s*:/g) ?? []).length;
  if (parsed.length !== declared) throw new Error(`capabilities parse mismatch: ${declared} declared, ${parsed.length} parsed`);
  return parsed;
};
const manifests = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== '__tests__')
  .map((d) => {
    const src = readFileSync(join(dir, d.name, 'manifest.ts'), 'utf8');
    return { id: field(src, 'id'), name: nameOf(src), accent: field(src, 'accent'), audience: field(src, 'audience'), minRole: field(src, 'minRole'), privacy: field(src, 'privacy'), href: field(src, 'href'), version: field(src, 'version'), minShell: field(src, 'minShell'), capabilities: caps(src) } as unknown as ExtensionManifest;
  });
// A new host has an empty registry; validator cases use a fixture so they run before its first extension.
const ok: ExtensionManifest = {
  id: 'example', name: 'Example', version: '0.1.0', minShell: '0.1.0', capabilities: [],
  accent: '#2E7D32', icon: 'puzzle-outline', audience: 'circle', minRole: 'adult', privacy: 'normal',
  HomeCard: () => null, href: '/example',
};

describe('every extension manifest is valid v1', () => {
  it('finds exactly the extensions registered by the host (empty before the first scaffold)', () => {
    const registry = readFileSync(join(dir, 'registry.ts'), 'utf8');
    const registered = [...registry.matchAll(/from ['"]\.\/([a-z][a-z0-9-]*)\/manifest['"]/g)].map((m) => m[1]);
    expect(manifests.map((m) => m.id).sort()).toEqual(registered.sort());
  });
  for (const m of manifests) {
    it(`${m.id} passes validateManifest and has its route folder`, () => {
      expect(validateManifest(m)).toEqual([]);
      expect(existsSync(join(root, 'src', 'app', '(app)', m.id, '_layout.tsx'))).toBe(true);
    });
  }
  it('no kid-visible extension declares money (the lint rule)', () => {
    for (const m of manifests.filter((m) => m.minRole === 'kid')) expect(m.capabilities.map((c) => c.name)).not.toContain('money');
  });
});

describe('validateManifest catches', () => {
  it('accepts a valid manifest with no capabilities', () => expect(validateManifest(ok)).toEqual([]));
  it('a kid-visible extension that declares money', () => {
    const bad = validateManifest({ ...ok, minRole: 'kid', capabilities: [{ name: 'money', why: 'Pays for things' }] });
    expect(bad.join('\n')).toMatch(/kid-visible .* money/);
  });
  it('a capability without a reason, an unknown one, a duplicate', () => {
    expect(validateManifest({ ...ok, capabilities: [{ name: 'camera', why: '' }] }).join()).toMatch(/needs a why/);
    expect(validateManifest({ ...ok, capabilities: [{ name: 'teleport' as Capability, why: 'Because I can' }] }).join()).toMatch(/unknown capability/);
    const c = { name: 'push' as const, why: 'Tell you things' };
    expect(validateManifest({ ...ok, capabilities: [c, c] }).join()).toMatch(/twice/);
  });
  it('bad id, accent, href, versions; health with money', () => {
    expect(validateManifest({ ...ok, id: 'Bad Id' }).length).toBeGreaterThan(0);
    expect(validateManifest({ ...ok, accent: 'red' }).join()).toMatch(/accent/);
    expect(validateManifest({ ...ok, href: '/nope' }).join()).toMatch(/href/);
    expect(validateManifest({ ...ok, version: '1' }).join()).toMatch(/version/);
    expect(validateManifest({ ...ok, minShell: 'x' }).join()).toMatch(/minShell/);
    expect(validateManifest({ ...ok, privacy: 'health', minRole: 'owner', capabilities: [{ name: 'money', why: 'Pays for things' }] }).join()).toMatch(/health/);
  });
});

describe('shell compatibility', () => {
  it('compares versions numerically', () => {
    expect(compareVersions('0.10.0', '0.9.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });
  it('an old shell is refused, a new or unknown one is let through', () => {
    expect(shellSatisfies('0.3.0', '0.2.0')).toBe(false);
    expect(shellSatisfies('0.2.0', '0.2.0')).toBe(true);
    expect(shellSatisfies('0.2.0', '0.10.1')).toBe(true);
    expect(shellSatisfies('9.0.0', undefined)).toBe(true);
  });
  it('every extension runs on this app version', () => {
    const shell = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo.version as string;
    for (const m of manifests) expect(shellSatisfies(m.minShell, shell)).toBe(true);
  });
});

describe('extensions reach the phone only through the host facade', () => {
  const banned = /from\s+'(expo-notifications|expo-image-picker|expo-camera|expo-location|posthog[^']*)'/;
  const files = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() && e.name !== '__tests__' ? files(join(d, e.name)) : /\.tsx?$/.test(e.name) ? [join(d, e.name)] : []));
  it('no file under src/ext imports a phone or analytics SDK', () => {
    for (const f of files(dir)) expect(readFileSync(f, 'utf8'), f).not.toMatch(banned);
  });
});
