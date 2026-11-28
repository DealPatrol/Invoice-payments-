/**
 * App Store subscription for the iOS build (Guideline 3.1.1). Product ids must match
 * App Store Connect and ios/App/App/InvoiceJot.storekit.
 */
export const IOS_BUNDLE_ID = 'com.frontporchgrowth.invoicejot';
export const IOS_PRO_MONTHLY = 'com.frontporchgrowth.invoicejot.pro.monthly';
export const IOS_PRO_YEARLY = 'com.frontporchgrowth.invoicejot.pro.yearly';
export const IOS_PRO_WEEKLY = 'com.frontporchgrowth.invoicejot.pro.weekly';
export const IOS_PRO_PRODUCT_IDS = [IOS_PRO_YEARLY, IOS_PRO_MONTHLY, IOS_PRO_WEEKLY] as const;

export function isIosProProduct(productId: string | null | undefined): boolean {
  return Boolean(productId && (IOS_PRO_PRODUCT_IDS as readonly string[]).includes(productId));
}

/** Apple's standard EULA, linked from the paywall as required for auto-renewable subscriptions. */
export const APPLE_STANDARD_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
