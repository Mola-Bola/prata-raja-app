// Keep release preflight and the shipper on the same label calculation.
export function chooseLabel(base, labels, minor = false) {
  if (!/^\d+\.\d+\.\d+$/.test(base)) throw new Error('Invalid app version');
  const versions = labels.filter((l) => /^\d+\.\d+\.\d+$/.test(l));
  const top = versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
  if (minor) {
    const newest = [base, ...versions].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
    const [ma, mi] = newest.split('.').map(Number);
    return `${ma}.${mi + 1}.0`;
  }
  if (!top) return base;
  const [ma, mi, pa] = top.split('.').map(Number);
  const [bma, bmi] = base.split('.').map(Number);
  return bma > ma || (bma === ma && bmi > mi) ? base : `${ma}.${mi}.${pa + 1}`;
}
