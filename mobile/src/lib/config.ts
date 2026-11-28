export const APP_NAME = 'Invoice Jot';
export const BUNDLE_ID = 'com.frontporchgrowth.invoicejot';
export const PRO_MONTHLY_ID = 'com.frontporchgrowth.invoicejot.pro.monthly';
export const PRO_YEARLY_ID = 'com.frontporchgrowth.invoicejot.pro.yearly';
export const PRO_WEEKLY_ID = 'com.frontporchgrowth.invoicejot.pro.weekly';
/** All three live in the one "Invoice Jot Pro" subscription group, so a user can only hold one. */
export const PRO_PRODUCT_IDS = [PRO_WEEKLY_ID, PRO_MONTHLY_ID, PRO_YEARLY_ID] as const;
/** Paywall order: best value first. */
export const PRO_PLAN_ORDER = [PRO_YEARLY_ID, PRO_MONTHLY_ID, PRO_WEEKLY_ID] as const;
/** Shown only until StoreKit returns localized prices. */
export const FALLBACK_PRICES: Record<string, string> = { [PRO_WEEKLY_ID]: '$4.99', [PRO_MONTHLY_ID]: '$9.99', [PRO_YEARLY_ID]: '$59.99' };
/** US prices, used only when StoreKit has not returned numeric prices (web preview, offline first launch). */
export const FALLBACK_PRICE_VALUES: Record<string, number> = { [PRO_WEEKLY_ID]: 4.99, [PRO_MONTHLY_ID]: 9.99, [PRO_YEARLY_ID]: 59.99 };
export const PRO_PERIOD: Record<string, { iso: string; unit: 'week' | 'month' | 'year'; name: string }> = {
  [PRO_WEEKLY_ID]: { iso: 'P1W', unit: 'week', name: 'Weekly' },
  [PRO_MONTHLY_ID]: { iso: 'P1M', unit: 'month', name: 'Monthly' },
  [PRO_YEARLY_ID]: { iso: 'P1Y', unit: 'year', name: 'Yearly' },
};
export const SITE_URL = 'https://invoicejot.com';
export const SUPPORT_EMAIL = 'support@invoicejot.com';
export const PRIVACY_URL = 'https://invoicejot.com/privacy';
export const TERMS_URL = 'https://invoicejot.com/terms';
export const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export function isProActive(activeProductIds: readonly string[]): boolean {
  return activeProductIds.some((id) => (PRO_PRODUCT_IDS as readonly string[]).includes(id));
}

/** Shown in support reports. Keep in step with MARKETING_VERSION in the Xcode project. */
export const APP_VERSION = '1.0.0';
