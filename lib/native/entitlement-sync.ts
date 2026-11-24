'use client';

import type { NativeEntitlement } from './bridge';

export interface SyncResult {
  ok: boolean;
  pro: boolean;
  error?: string;
}

/** Send StoreKit 2 signed transactions to the backend, which verifies them with Apple's chain. */
export async function syncEntitlementsWithServer(entitlements: NativeEntitlement[]): Promise<SyncResult> {
  const transactions = entitlements.map((e) => e.jws).filter(Boolean);
  if (transactions.length === 0) return { ok: true, pro: false };
  const res = await fetch('/api/iap/apple/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions }),
  }).catch(() => null);
  if (!res) return { ok: false, pro: false, error: 'No connection. Your purchase is safe; we will sync it next time you open the app.' };
  const data = (await res.json().catch(() => ({}))) as { pro?: boolean; error?: string };
  if (!res.ok) return { ok: false, pro: false, error: data.error || 'Could not sync your subscription.' };
  return { ok: true, pro: Boolean(data.pro) };
}

/** Launch-time / renewal sync: quietly push whatever StoreKit currently entitles to the account. */
export async function syncCurrentEntitlements(): Promise<void> {
  const { InvoiceLabNative } = await import('./bridge');
  const { entitlements } = await InvoiceLabNative.entitlements();
  if (entitlements.length) await syncEntitlementsWithServer(entitlements);
}
