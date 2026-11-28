/**
 * Invoice Jot "Get paid with card" (Stripe Connect) — shared money helpers.
 * Pure functions, used by the server routes and the iPhone app so both agree on the amount.
 */

/** Stripe zero-decimal currencies (amount is already in the smallest unit). */
const ZERO_DECIMAL = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
/** Three-decimal currencies need special rounding rules on Stripe; not offered for invoice links. */
const THREE_DECIMAL = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);

export function normalizeCurrency(c: unknown): string | null {
  if (typeof c !== 'string') return null;
  const code = c.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code) || THREE_DECIMAL.has(code)) return null;
  return code;
}

export function isZeroDecimal(currency: string): boolean {
  return ZERO_DECIMAL.has(currency.toUpperCase());
}

/** 123.45 USD -> 12345; 5000 JPY -> 5000. Rounds half away from zero at the minor unit. */
export function toMinorUnits(amount: number, currency: string): number {
  const factor = isZeroDecimal(currency) ? 1 : 100;
  // toFixed(6) removes binary noise first (1.005 * 100 = 100.49999… -> 100.5 -> 101).
  const scaled = Number((Math.abs(amount) * factor).toFixed(6));
  return Math.sign(amount) * Math.round(scaled);
}

export function fromMinorUnits(minor: number, currency: string): number {
  return isZeroDecimal(currency) ? minor : minor / 100;
}

/** Stripe's card minimum is roughly US$0.50; we use 50 minor units for 2-decimal and 50 for zero-decimal (e.g. ¥50). */
export const MIN_MINOR = 50;
/** Stripe's default per-charge maximum for most currencies is 99,999,999 minor units. */
export const MAX_MINOR = 99_999_999;

export function validMinorAmount(minor: unknown): minor is number {
  return typeof minor === 'number' && Number.isInteger(minor) && minor >= MIN_MINOR && minor <= MAX_MINOR;
}

/** Default platform fee: 100 basis points = 1%. Clamped to 0–1000 bps (0–10%). */
export const DEFAULT_FEE_BPS = 100;

export function parseFeeBps(raw: string | undefined | null): number {
  if (raw == null || raw.trim() === '') return DEFAULT_FEE_BPS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_FEE_BPS;
  return Math.min(1000, Math.floor(n));
}

/** Application fee in minor units, rounded down so the fee never exceeds the stated percent. */
export function applicationFee(amountMinor: number, bps: number): number {
  if (!(amountMinor > 0) || !(bps > 0)) return 0;
  return Math.floor((amountMinor * bps) / 10_000);
}

/** "1%" / "0.5%" for UI copy. */
export function feePercentLabel(bps: number): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct.toFixed(0) : pct.toString()}%`;
}
