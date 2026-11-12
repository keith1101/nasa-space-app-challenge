/** Presentation helpers. All strings produced here are English-only. */

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');

export function fmtInt(n: number | null | undefined): string {
  return n == null || !Number.isFinite(n) ? '—' : NUMBER_FORMAT.format(Math.round(n));
}

export function fmtNum(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  return n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(digits)}%`;
}

export const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** '2026-11-03' -> 'Nov 03' */
export function fmtDay(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return isoDate;
  return `${MONTH_ABBR[Number(m[2]) - 1] ?? m[2]} ${m[3]}`;
}

/** ISO timestamp -> '10 Nov 2026, 06:00 UTC' */
export function fmtUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day} ${MONTH_ABBR[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hh}:${mm} UTC`;
}

/**
 * Administrative names in the source data are Vietnamese proper nouns. The interface is English-only,
 * so place names are shown in plain Latin letters (no diacritics). Data keys are never modified.
 */
export function displayPlace(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** "Nice" axis maximum and ticks for a linear scale starting at zero. */
export function niceScale(maxValue: number, targetTicks = 5): { max: number; ticks: number[] } {
  const safeMax = maxValue > 0 ? maxValue : 1;
  const rough = safeMax / targetTicks;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const frac = rough / pow;
  const step = (frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10) * pow;
  const max = Math.ceil(safeMax / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= max + step / 2; t += step) ticks.push(Number(t.toFixed(10)));
  return { max, ticks };
}
