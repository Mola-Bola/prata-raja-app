// A web-only publish does not write the OTA release table; current source version counts too.
export function chooseLabel(base, labels, minor = false) {
  if (!/^\d+\.\d+\.\d+$/.test(base)) throw new Error('Invalid app version');
  const versions = [base, ...labels.filter((l) => /^\d+\.\d+\.\d+$/.test(l))];
  const [major, minorVersion, patch] = versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0].split('.').map(Number);
  return minor ? `${major}.${minorVersion + 1}.0` : `${major}.${minorVersion}.${patch + 1}`;
}
