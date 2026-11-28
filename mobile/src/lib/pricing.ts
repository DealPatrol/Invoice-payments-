/** "$59.99" + 59.99 -> "$5.00" (price per month for a yearly plan), keeping the store's currency symbol. */
export function perMonthLabel(displayPrice: string, yearlyPrice: number): string {
  const symbol = /^[^\d\s-]+/.exec(displayPrice.trim())?.[0] ?? '$';
  const perMonth = Math.round((yearlyPrice / 12) * 100) / 100;
  return `${symbol}${perMonth.toFixed(2)}`;
}

/**
 * Savings of the yearly plan versus paying a shorter plan for a whole year, as a whole percent.
 * Rounded DOWN so the paywall never overstates the saving (49.96% shows as 49%).
 * `periodsPerYear` is 12 for monthly and 52 for weekly (52 weekly renewals; a year is ~52.14 weeks,
 * so using 52 slightly understates the weekly saving rather than overstating it).
 */
export function savingsPercent(periodPrice: number, periodsPerYear: number, yearlyPrice: number): number {
  const full = periodPrice * periodsPerYear;
  if (!(full > 0) || !(yearlyPrice >= 0) || yearlyPrice >= full) return 0;
  return Math.floor(((full - yearlyPrice) / full) * 100 + 1e-9);
}

/** Savings of the yearly plan versus paying monthly for 12 months, as a whole percent (rounded down). */
export function yearlySavingsPercent(monthlyPrice: number, yearlyPrice: number): number {
  return savingsPercent(monthlyPrice, 12, yearlyPrice);
}

/** Savings of the yearly plan versus paying weekly for 52 weeks, as a whole percent (rounded down). */
export function yearlyVsWeeklySavingsPercent(weeklyPrice: number, yearlyPrice: number): number {
  return savingsPercent(weeklyPrice, 52, yearlyPrice);
}

/** One honest line for the yearly plan card, e.g. "about $5.00/month, billed once a year · saves 49% vs monthly, 76% vs weekly". */
export function yearlyPlanNote(yearlyDisplayPrice: string, prices: { yearly: number; monthly?: number; weekly?: number }): string {
  const parts: string[] = [];
  const vsMonthly = prices.monthly != null ? yearlySavingsPercent(prices.monthly, prices.yearly) : 0;
  const vsWeekly = prices.weekly != null ? yearlyVsWeeklySavingsPercent(prices.weekly, prices.yearly) : 0;
  if (vsMonthly > 0) parts.push(`${vsMonthly}% vs monthly`);
  if (vsWeekly > 0) parts.push(`${vsWeekly}% vs weekly`);
  const base = `about ${perMonthLabel(yearlyDisplayPrice, prices.yearly)}/month, billed once a year`;
  return parts.length ? `${base} · saves ${parts.join(', ')}` : base;
}

/** Monthly vs weekly, compared over a year (12 monthly vs 52 weekly renewals), rounded down. */
export function monthlyVsWeeklySavingsPercent(weeklyPrice: number, monthlyPrice: number): number {
  return savingsPercent(weeklyPrice, 52, monthlyPrice * 12);
}

/** "$4.99" + 4.99 -> "$21.62": what the weekly plan averages per month if kept all year (52 weeks / 12). */
export function weeklyPerMonthLabel(weeklyDisplayPrice: string, weeklyPrice: number): string {
  const symbol = /^[^\d\s-]+/.exec(weeklyDisplayPrice.trim())?.[0] ?? '$';
  return `${symbol}${(Math.round(((weeklyPrice * 52) / 12) * 100) / 100).toFixed(2)}`;
}

/** Honest one-liners for the monthly and weekly plan cards. */
export function monthlyPlanNote(prices: { monthly: number; weekly?: number }): string {
  const vs = prices.weekly != null ? monthlyVsWeeklySavingsPercent(prices.weekly, prices.monthly) : 0;
  return vs > 0 ? `billed every month · saves ${vs}% vs weekly` : 'billed every month';
}

export function weeklyPlanNote(weeklyDisplayPrice: string, weeklyPrice: number): string {
  return `billed every week · about ${weeklyPerMonthLabel(weeklyDisplayPrice, weeklyPrice)}/month if kept all year`;
}
