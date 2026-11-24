/**
 * App Store subscription for the iOS build (Guideline 3.1.1). Product ids must match
 * App Store Connect and ios/App/App/InvoiceLab.storekit.
 */
export const IOS_BUNDLE_ID = 'com.colecollins.invoicelab';
export const IOS_PRO_MONTHLY = 'com.colecollins.invoicelab.pro.monthly';
export const IOS_PRO_YEARLY = 'com.colecollins.invoicelab.pro.yearly';
export const IOS_PRO_PRODUCT_IDS = [IOS_PRO_YEARLY, IOS_PRO_MONTHLY] as const;

export function isIosProProduct(productId: string | null | undefined): boolean {
  return Boolean(productId && (IOS_PRO_PRODUCT_IDS as readonly string[]).includes(productId));
}

/** Apple's standard EULA, linked from the paywall as required for auto-renewable subscriptions. */
export const APPLE_STANDARD_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
