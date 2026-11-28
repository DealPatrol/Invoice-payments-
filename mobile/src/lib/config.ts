export const APP_NAME = 'Invoice Jot';
export const BUNDLE_ID = 'com.frontporchgrowth.invoicejot';
export const PRO_MONTHLY_ID = 'com.frontporchgrowth.invoicejot.pro.monthly';
export const PRO_YEARLY_ID = 'com.frontporchgrowth.invoicejot.pro.yearly';
export const PRO_PRODUCT_IDS = [PRO_MONTHLY_ID, PRO_YEARLY_ID] as const;
/** Shown only until StoreKit returns localized prices. */
export const FALLBACK_PRICES: Record<string, string> = { [PRO_MONTHLY_ID]: '$9.99', [PRO_YEARLY_ID]: '$59.99' };
/** US prices, used only when StoreKit has not returned numeric prices (web preview, offline first launch). */
export const FALLBACK_PRICE_VALUES: Record<string, number> = { [PRO_MONTHLY_ID]: 9.99, [PRO_YEARLY_ID]: 59.99 };
export const SITE_URL = 'https://invoicejot.com';
export const SUPPORT_EMAIL = 'support@invoicejot.com';
export const PRIVACY_URL = 'https://invoicejot.com/privacy';
export const TERMS_URL = 'https://invoicejot.com/terms';
export const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export function isProActive(activeProductIds: readonly string[]): boolean {
  return activeProductIds.some((id) => (PRO_PRODUCT_IDS as readonly string[]).includes(id));
}

/** Shown in support reports. Keep in step with MARKETING_VERSION in the Xcode project. */
export const APP_VERSION = '1.0';
