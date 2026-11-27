import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { FALLBACK_PRICES, PRO_MONTHLY_ID, PRO_PRODUCT_IDS, PRO_YEARLY_ID, isProActive } from './config';
import { isNative } from './platform';

export interface StoreProduct {
  id: string;
  displayName: string;
  description: string;
  displayPrice: string;
  price: number;
  /** ISO 8601 period, e.g. P1M or P1Y. */
  period: string;
}

export type PurchaseStatus = 'purchased' | 'userCancelled' | 'pending' | 'unknown';

export interface PurchaseResult {
  status: PurchaseStatus;
  productId: string;
  transactionId?: string;
}

export interface EntitlementsResult {
  activeProductIds: string[];
  syncError?: string;
}

export interface InvoiceJotStorePlugin {
  getProducts(options: { productIds: string[] }): Promise<{ products: StoreProduct[] }>;
  purchase(options: { productId: string }): Promise<PurchaseResult>;
  restorePurchases(): Promise<EntitlementsResult>;
  getEntitlements(): Promise<EntitlementsResult>;
  manageSubscriptions(): Promise<void>;
  requestReview(): Promise<void>;
  addListener(event: 'entitlementsUpdated', fn: (r: EntitlementsResult) => void): Promise<PluginListenerHandle>;
}

const DEV_KEY = 'invoicejot:web-pro';

/** Browser preview only. Purchases exist only in the iPhone app (StoreKit 2). */
class WebStore {
  async getProducts(): Promise<{ products: StoreProduct[] }> {
    return {
      products: [
        { id: PRO_MONTHLY_ID, displayName: 'Invoice Jot Pro Monthly', description: 'Unlimited invoices, no footer', displayPrice: FALLBACK_PRICES[PRO_MONTHLY_ID], price: 9.99, period: 'P1M' },
        { id: PRO_YEARLY_ID, displayName: 'Invoice Jot Pro Yearly', description: 'Unlimited invoices, no footer', displayPrice: FALLBACK_PRICES[PRO_YEARLY_ID], price: 59.99, period: 'P1Y' },
      ],
    };
  }
  async purchase(): Promise<PurchaseResult> {
    throw new Error('Subscriptions are available in the Invoice Jot iPhone app.');
  }
  async restorePurchases(): Promise<EntitlementsResult> {
    return this.getEntitlements();
  }
  async getEntitlements(): Promise<EntitlementsResult> {
    let on = false;
    try {
      on = localStorage.getItem(DEV_KEY) === '1';
    } catch {
      on = false;
    }
    return { activeProductIds: on ? [PRO_YEARLY_ID] : [] };
  }
  async manageSubscriptions(): Promise<void> {
    window.open('https://apps.apple.com/account/subscriptions', '_blank');
  }
  async requestReview(): Promise<void> {
    /* no-op on the web */
  }
  async addListener(): Promise<PluginListenerHandle> {
    return { remove: async () => undefined };
  }
}

export const InvoiceJotStore = registerPlugin<InvoiceJotStorePlugin>('InvoiceJotStore', {
  web: () => new WebStore() as unknown as InvoiceJotStorePlugin,
});

const CACHE_KEY = 'invoicejot:pro-cache';

export function cachedPro(): boolean {
  try {
    return localStorage.getItem(CACHE_KEY) === '1';
  } catch {
    return false;
  }
}

function setCachedPro(v: boolean) {
  try {
    localStorage.setItem(CACHE_KEY, v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export async function loadProducts(): Promise<StoreProduct[]> {
  try {
    const r = await InvoiceJotStore.getProducts({ productIds: [...PRO_PRODUCT_IDS] });
    const order = [PRO_YEARLY_ID, PRO_MONTHLY_ID];
    return [...r.products].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  } catch {
    return [];
  }
}

/** Source of truth is StoreKit 2 currentEntitlements; cached so an offline launch keeps Pro. */
export async function refreshEntitlement(): Promise<boolean> {
  try {
    const r = await InvoiceJotStore.getEntitlements();
    const pro = isProActive(r.activeProductIds);
    setCachedPro(pro);
    return pro;
  } catch {
    return cachedPro();
  }
}

export async function buyPro(productId: string): Promise<PurchaseResult> {
  const r = await InvoiceJotStore.purchase({ productId });
  if (r.status === 'purchased') setCachedPro(true);
  return r;
}

export async function restorePro(): Promise<{ pro: boolean; error?: string }> {
  const r = await InvoiceJotStore.restorePurchases();
  const pro = isProActive(r.activeProductIds);
  setCachedPro(pro);
  return { pro, error: r.syncError };
}

export function onEntitlementsChanged(fn: (pro: boolean) => void): () => void {
  if (!isNative()) return () => undefined;
  let handle: PluginListenerHandle | null = null;
  void InvoiceJotStore.addListener('entitlementsUpdated', (r) => {
    const pro = isProActive(r.activeProductIds);
    setCachedPro(pro);
    fn(pro);
  }).then((h) => (handle = h));
  return () => {
    void handle?.remove();
  };
}
