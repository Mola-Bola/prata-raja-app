/**
 * Parse user-typed amounts: "12,50" → 12.5, "1,299" → 1299, " 3 " → 3, "" → null, "abc"/"-4"/"15a" → 'invalid'.
 * A comma is a thousands separator when it groups digits in threes ("1,299", "1,234.50"); otherwise a lone comma is a decimal point.
 */
export function parseAmount(s: string | null | undefined): number | null | 'invalid' {
  if (s == null) return null;
  let t = String(s).trim().replace(/\s/g, '');
  if (t === '') return null;
  if (/^[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, '');
  else if (/^\d*,\d+$/.test(t)) t = t.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t) && !/^\.\d+$/.test(t)) return 'invalid';
  const n = Number(t);
  return Number.isFinite(n) ? n : 'invalid';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "17 Oct" (adds year when not the current year). Accepts YYYY-MM-DD or ISO timestamps. */
export function fmtDate(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '—';
  const s = `${d} ${MONTHS[m - 1]}`;
  return y === now.getFullYear() ? s : `${s} ${y}`;
}

/** Calendar date (YYYY-MM-DD) of an instant in a timezone; falls back to UTC if the tz is unsupported. */
export function localDate(isoInstant: string, tz: string): string {
  const d = new Date(isoInstant);
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** Whole days from today (local) to a YYYY-MM-DD date; negative if past. */
export function daysUntil(date: string | null | undefined, today: Date = new Date()): number | null {
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - t) / 86_400_000);
}

export const todayIso = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** A date typed day first ("20/10/2026") as YYYY-MM-DD, or null unless it's a whole, real date (no "31/02"). */
export function parseTypedDate(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}
