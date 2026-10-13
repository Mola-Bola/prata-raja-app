import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

it('retains two previous static releases and drops older files, including the first rollout', async () => {
  const modulePath = '../../../scripts/retain-web-chunks.mjs';
  const { retainWebChunks } = await import(modulePath);
  const root = mkdtempSync(join(tmpdir(), 'signature-chunks-'));
  const previous = join(root, 'previous');
  const file = (dir: string, id: number) => join(dir, '_expo/static/js/web', `GameRoot-${id}.js`);
  try {
    mkdirSync(join(previous, '_expo/static/js/web'), { recursive: true });
    writeFileSync(file(previous, 0), 'old');
    for (let release = 1; release <= 3; release++) {
      const build = join(root, `build-${release}`);
      mkdirSync(join(build, '_expo/static/js/web'), { recursive: true });
      writeFileSync(file(build, release), 'new');
      retainWebChunks(build, previous);
      for (let id = Math.max(0, release - 2); id <= release; id++) expect(existsSync(file(build, id))).toBe(true);
      if (release === 3) expect(existsSync(file(build, 0))).toBe(false);
      rmSync(previous, { recursive: true });
      cpSync(build, previous, { recursive: true });
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
