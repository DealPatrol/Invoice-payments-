/** "$59.99" + 59.99 -> "$5.00" (price per month for a yearly plan), keeping the store's currency symbol. */
export function perMonthLabel(displayPrice: string, yearlyPrice: number): string {
  const symbol = /^[^\d\s-]+/.exec(displayPrice.trim())?.[0] ?? '$';
  const perMonth = Math.round((yearlyPrice / 12) * 100) / 100;
  return `${symbol}${perMonth.toFixed(2)}`;
}

/** Savings of the yearly plan versus paying monthly for 12 months, as a whole percent. */
export function yearlySavingsPercent(monthlyPrice: number, yearlyPrice: number): number {
  const full = monthlyPrice * 12;
  if (full <= 0 || yearlyPrice >= full) return 0;
  return Math.round(((full - yearlyPrice) / full) * 100);
}
