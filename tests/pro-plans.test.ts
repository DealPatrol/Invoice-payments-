import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FALLBACK_PRICES, FALLBACK_PRICE_VALUES, PRO_PERIOD, PRO_PLAN_ORDER, PRO_PRODUCT_IDS, PRO_WEEKLY_ID, isProActive } from '../mobile/src/lib/config';
import { savingsPercent, yearlyPlanNote, yearlySavingsPercent, yearlyVsWeeklySavingsPercent } from '../mobile/src/lib/pricing';
import { IOS_PRO_PRODUCT_IDS } from '../lib/native/iap';

describe('Pro plans: weekly, monthly, yearly', () => {
  it('has the weekly plan in the product list, plan order and fallbacks', () => {
    expect(PRO_WEEKLY_ID).toBe('com.frontporchgrowth.invoicejot.pro.weekly');
    expect([...PRO_PRODUCT_IDS].sort()).toEqual([...IOS_PRO_PRODUCT_IDS].sort());
    expect(PRO_PLAN_ORDER).toEqual(['com.frontporchgrowth.invoicejot.pro.yearly', 'com.frontporchgrowth.invoicejot.pro.monthly', PRO_WEEKLY_ID]);
    expect(FALLBACK_PRICES[PRO_WEEKLY_ID]).toBe('$4.99');
    expect(FALLBACK_PRICE_VALUES[PRO_WEEKLY_ID]).toBe(4.99);
    expect(PRO_PERIOD[PRO_WEEKLY_ID]).toMatchObject({ iso: 'P1W', unit: 'week' });
    expect(isProActive([PRO_WEEKLY_ID])).toBe(true);
  });

  it('computes savings truthfully and rounds down', () => {
    // 12 x 9.99 = 119.88 -> 59.99 is 49.96% less: shown as 49%, never 50%.
    expect(yearlySavingsPercent(9.99, 59.99)).toBe(49);
    // 52 x 4.99 = 259.48 -> 59.99 is 76.88% less: shown as 76%.
    expect(yearlyVsWeeklySavingsPercent(4.99, 59.99)).toBe(76);
    expect(savingsPercent(10, 12, 120)).toBe(0);
    expect(savingsPercent(0, 12, 10)).toBe(0);
    expect(savingsPercent(Number.NaN, 12, 10)).toBe(0);
  });

  it('builds the yearly card note from real prices only', () => {
    expect(yearlyPlanNote('$59.99', { yearly: 59.99, monthly: 9.99, weekly: 4.99 })).toBe('about $5.00/month, billed once a year · saves 49% vs monthly, 76% vs weekly');
    expect(yearlyPlanNote('$59.99', { yearly: 59.99 })).toBe('about $5.00/month, billed once a year');
  });

  it('paywall offers all three, keeps Restore Purchases and has no trial wording', () => {
    const src = readFileSync('mobile/src/screens/Paywall.tsx', 'utf8');
    expect(src).toContain('PRO_PLAN_ORDER');
    expect(src).toContain('Restore Purchases');
    expect(src).not.toMatch(/free trial(?! and)/i);
    expect(src).not.toMatch(/trial toggle|start trial|try free/i);
  });
});
