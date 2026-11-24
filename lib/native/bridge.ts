'use client';

import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

/** One StoreKit 2 entitlement as reported by ios/App/App/InvoiceLabNativePlugin.swift. */
export interface NativeEntitlement {
  productId: string;
  originalTransactionId: string;
  transactionId: string;
  jws: string;
  expiresAt?: string;
}

export interface NativeProduct {
  id: string;
  displayName: string;
  description: string;
  displayPrice: string;
  price: number;
  period?: { unit: 'day' | 'week' | 'month' | 'year' | 'unknown'; value: number };
  eligibleForIntroOffer?: boolean;
  introOffer?: { paymentMode: string; period: { unit: string; value: number }; displayPrice: string };
}

export type PurchaseStatus = 'purchased' | 'cancelled' | 'pending' | 'unknown';

export interface InvoiceLabNativePlugin {
  getProducts(options: { productIds: string[] }): Promise<{ products: NativeProduct[] }>;
  purchase(options: { productId: string; appAccountToken?: string }): Promise<{ status: PurchaseStatus; jws?: string; entitlements?: NativeEntitlement[] }>;
  restore(): Promise<{ entitlements: NativeEntitlement[] }>;
  entitlements(): Promise<{ entitlements: NativeEntitlement[] }>;
  manageSubscriptions(): Promise<void>;
  biometryInfo(): Promise<{ available: boolean; type: 'faceId' | 'touchId' | 'passcode' }>;
  authenticate(options: { reason: string }): Promise<{ ok: boolean; error?: string }>;
  sharePdf(options: { fileName: string }): Promise<{ completed: boolean; activityType: string }>;
  shareFile(options: { fileName: string; content: string; encoding?: 'utf8' | 'base64' }): Promise<{ completed: boolean; activityType: string }>;
  addListener(event: 'entitlementsChanged', handler: (data: { entitlements: NativeEntitlement[] }) => void): Promise<PluginListenerHandle>;
}

/** Custom Swift plugin registered by InvoiceLabViewController (not an npm package). */
export const InvoiceLabNative = registerPlugin<InvoiceLabNativePlugin>('InvoiceLabNative');

/** "INV-0042 Acme" -> "INV-0042 Acme" ; strips characters iOS file names dislike. */
export function exportFileName(title: string, fallback = 'Invoice'): string {
  const cleaned = title.replace(/[^\w .-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  return cleaned || fallback;
}

/** Share text (CSV / JSON) through the iOS share sheet: Mail, Messages, AirDrop, Files. */
export async function shareTextFile(fileName: string, content: string): Promise<void> {
  await InvoiceLabNative.shareFile({ fileName, content, encoding: 'utf8' });
}

/** Render the current page with its print stylesheet into a PDF and open the share sheet. */
export async function shareCurrentPageAsPdf(title?: string): Promise<void> {
  await InvoiceLabNative.sharePdf({ fileName: exportFileName(title || document.title || 'Invoice') });
}
