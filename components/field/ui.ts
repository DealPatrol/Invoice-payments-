export const fieldClass =
  'w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] shadow-[var(--shadow-xs)] outline-none transition placeholder:text-[var(--text-subtle)] focus:border-[var(--accent)] focus:shadow-[var(--ring)]';

export const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]';

export function money(currency: string, value: number): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
