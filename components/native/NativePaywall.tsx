'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, RotateCcw, Settings2 } from 'lucide-react';
import { btnGhost, btnPrimary, Page, PageHeader } from '@/components/ui/kit';
import { LAB_PLANS } from '@/lib/config';
import { APPLE_STANDARD_EULA_URL, IOS_PRO_PRODUCT_IDS, IOS_PRO_YEARLY } from '@/lib/native/iap';
import { useIsNativeIos } from '@/lib/native/useIsNativeIos';
import type { NativeEntitlement, NativeProduct } from '@/lib/native/bridge';

function periodLabel(p?: NativeProduct['period']): string {
  if (!p) return '';
  const unit = p.unit === 'unknown' ? '' : p.unit;
  return p.value === 1 ? unit : `${p.value} ${unit}s`;
}

function trialLabel(p: NativeProduct): string | null {
  if (!p.eligibleForIntroOffer || p.introOffer?.paymentMode !== 'freeTrial') return null;
  const { unit, value } = p.introOffer.period;
  const days = unit === 'week' ? value * 7 : unit === 'day' ? value : null;
  return days ? `${days}-day free trial` : `Free for ${value} ${unit}${value === 1 ? '' : 's'}`;
}

/**
 * Invoice Jot Pro paywall for the iOS app (StoreKit 2, Guideline 3.1.1 / 3.1.2).
 * Shows Apple's localized prices, the 14-day introductory free trial when the Apple ID is eligible,
 * Restore Purchases, Manage Subscription, and the required auto-renewal terms + EULA/privacy links.
 */
export function NativePaywall() {
  const native = useIsNativeIos();
  const router = useRouter();
  const [products, setProducts] = useState<NativeProduct[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(IOS_PRO_YEARLY);
  const [busy, setBusy] = useState<'load' | 'buy' | 'restore' | null>('load');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const pro = LAB_PLANS.find((p) => p.id === 'pro');

  useEffect(() => {
    if (!native) return;
    let live = true;
    void (async () => {
      try {
        const [{ InvoiceLabNative }, tokenRes] = await Promise.all([
          import('@/lib/native/bridge'),
          fetch('/api/iap/apple/sync', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        const { products: list } = await InvoiceLabNative.getProducts({ productIds: [...IOS_PRO_PRODUCT_IDS] });
        if (!live) return;
        setToken(tokenRes?.appAccountToken ?? null);
        setProducts([...list].sort((a, b) => IOS_PRO_PRODUCT_IDS.indexOf(a.id as never) - IOS_PRO_PRODUCT_IDS.indexOf(b.id as never)));
      } catch {
        if (live) setMessage({ tone: 'error', text: 'The App Store is not reachable right now. Check your connection and try again.' });
      } finally {
        if (live) setBusy(null);
      }
    })();
    return () => { live = false; };
  }, [native]);

  const finish = useCallback(async (entitlements: NativeEntitlement[], restored: boolean) => {
    const { syncEntitlementsWithServer } = await import('@/lib/native/entitlement-sync');
    const result = await syncEntitlementsWithServer(entitlements);
    if (!result.ok) { setMessage({ tone: 'error', text: result.error ?? 'Could not sync your subscription.' }); return; }
    if (result.pro) {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
      setMessage({ tone: 'ok', text: restored ? 'Purchases restored. Pro is active on this account.' : 'Welcome to Pro! Everything is unlocked.' });
      setTimeout(() => router.push('/dashboard'), 1200);
    } else {
      setMessage({ tone: 'error', text: restored ? 'No active Invoice Jot Pro subscription was found for this Apple ID.' : 'The purchase did not complete.' });
    }
  }, [router]);

  const buy = useCallback(async () => {
    setBusy('buy'); setMessage(null);
    try {
      const { InvoiceLabNative } = await import('@/lib/native/bridge');
      const res = await InvoiceLabNative.purchase({ productId: selected, appAccountToken: token ?? undefined });
      if (res.status === 'purchased') await finish(res.entitlements ?? [], false);
      else if (res.status === 'pending') setMessage({ tone: 'ok', text: 'Your purchase is waiting for approval (Ask to Buy). Pro unlocks as soon as it is approved.' });
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Purchase failed.' });
    } finally {
      setBusy(null);
    }
  }, [selected, token, finish]);

  const restore = useCallback(async () => {
    setBusy('restore'); setMessage(null);
    try {
      const { InvoiceLabNative } = await import('@/lib/native/bridge');
      const { entitlements } = await InvoiceLabNative.restore();
      await finish(entitlements, true);
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Restore failed.' });
    } finally {
      setBusy(null);
    }
  }, [finish]);

  const manage = useCallback(async () => {
    const { InvoiceLabNative } = await import('@/lib/native/bridge');
    await InvoiceLabNative.manageSubscriptions().catch(() => undefined);
  }, []);

  if (!native) {
    return (
      <Page narrow>
        <PageHeader title="Invoice Jot Pro" subtitle="This page is for the Invoice Jot iPhone app." />
        <p className="text-sm text-[var(--text-muted)]">On the web, compare plans on the <Link className="underline" href="/pricing">pricing page</Link>.</p>
      </Page>
    );
  }

  const chosen = products.find((p) => p.id === selected) ?? products[0];
  const trial = chosen ? trialLabel(chosen) : null;

  return (
    <Page narrow>
      <PageHeader eyebrow="Invoice Jot Pro" title="Unlock everything" subtitle="Billed through your Apple ID. Cancel anytime in Settings." />
      <ul className="mb-5 grid gap-2 text-sm text-[var(--text)]">
        {(pro?.features ?? []).map((f) => (
          <li key={f} className="flex items-start gap-2"><Check size={16} className="mt-0.5 text-[var(--accent)]" aria-hidden />{f}</li>
        ))}
      </ul>

      {busy === 'load' && <p className="text-sm text-[var(--text-muted)]">Loading App Store prices…</p>}
      <div className="grid gap-3" role="radiogroup" aria-label="Choose a plan">
        {products.map((p) => {
          const t = trialLabel(p);
          const on = (chosen?.id ?? selected) === p.id;
          return (
            <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => setSelected(p.id)}
              className={`rounded-[var(--radius-lg)] border p-4 text-left ${on ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-[var(--text)]">{p.displayName}</span>
                <span className="font-semibold text-[var(--text)]">{p.displayPrice}<span className="text-xs font-normal text-[var(--text-muted)]"> / {periodLabel(p.period)}</span></span>
              </span>
              {t && <span className="mt-1 block text-xs font-semibold text-[var(--accent)]">{t}, then {p.displayPrice} / {periodLabel(p.period)}</span>}
            </button>
          );
        })}
      </div>

      {chosen && (
        <button type="button" disabled={busy !== null} onClick={() => void buy()} className={`${btnPrimary} mt-5 w-full justify-center`}>
          {busy === 'buy' ? 'Contacting the App Store…' : trial ? `Start ${trial}` : `Subscribe for ${chosen.displayPrice} / ${periodLabel(chosen.period)}`}
        </button>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy !== null} onClick={() => void restore()} className={btnGhost}><RotateCcw size={14} />{busy === 'restore' ? 'Restoring…' : 'Restore Purchases'}</button>
        <button type="button" onClick={() => void manage()} className={btnGhost}><Settings2 size={14} />Manage subscription</button>
      </div>

      {message && (
        <p role="status" className={`mt-4 rounded-lg px-3 py-2 text-sm ${message.tone === 'ok' ? 'bg-[var(--success-soft)] text-[var(--success)]' : 'bg-[var(--danger-soft)] text-[var(--danger)]'}`}>{message.text}</p>
      )}

      <p className="mt-6 text-xs leading-relaxed text-[var(--text-muted)]">
        {trial ? `After the ${trial}, payment` : 'Payment'} is charged to your Apple ID account{trial ? '' : ' at confirmation of purchase'}.
        The subscription renews automatically at the same price unless it is cancelled at least 24 hours before the end of the current period.
        Your account is charged for renewal within 24 hours before the end of the current period. Manage or cancel anytime in
        Settings &gt; Apple ID &gt; Subscriptions. Any unused portion of a free trial is forfeited when you subscribe.
      </p>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        <a className="underline" href={APPLE_STANDARD_EULA_URL}>Terms of Use (EULA)</a>{' · '}
        <Link className="underline" href="/privacy">Privacy Policy</Link>{' · '}
        <Link className="underline" href="/terms">Terms</Link>
      </p>
    </Page>
  );
}
