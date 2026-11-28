export function uid(prefix = ''): string {
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().replace(/-/g, '').slice(0, 16) : Math.random().toString(36).slice(2, 18);
  return `${prefix}${rnd}`;
}

export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + days);
  return todayISO(dt);
}

/**
 * Round to whole cents, half away from zero, without binary-float surprises
 * (plain Math.round turns 2.5 x 19.99 = 49.975 into 49.97 because the float is 49.97499999...).
 */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const cents = Math.round(Number((Math.abs(n) * 100).toPrecision(12)));
  return (n < 0 ? -cents : cents) / 100 || 0;
}

export function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

export function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

export function formatMoney(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(round2(amount));
  } catch {
    return `$${round2(amount).toFixed(2)}`;
  }
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y) return iso;
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
