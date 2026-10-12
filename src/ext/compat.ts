// Shell/extension version check (the Obsidian `minAppVersion` model).
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export const isSemver = (v: string): boolean => SEMVER.test(v);

/** Compare two x.y.z versions: negative when a < b. */
export function compareVersions(a: string, b: string): number {
  const pa = SEMVER.exec(a), pb = SEMVER.exec(b);
  if (!pa || !pb) throw new Error(`not a version: ${!pa ? a : b}`);
  for (let i = 1; i <= 3; i++) {
    const d = Number(pa[i]) - Number(pb[i]);
    if (d !== 0) return d;
  }
  return 0;
}

/** Can a shell at `shell` run an extension that needs `minShell`? An unknown shell version is let through (web dev, tests). */
export function shellSatisfies(minShell: string, shell: string | null | undefined): boolean {
  if (!shell || !isSemver(shell)) return true;
  return compareVersions(shell, minShell) >= 0;
}
