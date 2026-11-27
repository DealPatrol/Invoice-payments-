'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Lock, WifiOff } from 'lucide-react';
import { useIsNativeIos } from '@/lib/native/useIsNativeIos';
import { deepLinkToPath } from '@/lib/native/deep-links';
import { PREF_KEYS, toCachedClients, toCachedInvoices, type OfflineDraft } from '@/lib/native/offline-cache';
import { planInvoiceReminders } from '@/lib/native/reminders';

const CACHE_EVERY_MS = 5 * 60 * 1000;
export const OFFLINE_PAGE_URL = 'capacitor://localhost/offline.html';

async function prefGet(key: string): Promise<string | null> {
  const { Preferences } = await import('@capacitor/preferences');
  return (await Preferences.get({ key })).value;
}

async function prefSet(key: string, value: string) {
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.set({ key, value });
}

/** Refresh the on-device cache used by the offline page, and re-plan local reminders. */
async function refreshCacheAndReminders() {
  const [inv, cli] = await Promise.all([
    fetch('/api/invoices', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch('/api/clients', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  if (!inv && !cli) return;
  const invoices = toCachedInvoices(inv?.invoices);
  if (inv) await prefSet(PREF_KEYS.invoices, JSON.stringify(invoices));
  if (cli) await prefSet(PREF_KEYS.clients, JSON.stringify(toCachedClients(cli?.clients)));
  await prefSet(PREF_KEYS.savedAt, new Date().toISOString());
  if ((await prefGet(PREF_KEYS.remindersEnabled)) === '1' && inv) await scheduleReminders(invoices);
}

export async function scheduleReminders(invoices: Parameters<typeof planInvoiceReminders>[0]) {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const previous: number[] = JSON.parse((await prefGet(PREF_KEYS.scheduledReminderIds)) || '[]');
  if (previous.length) await LocalNotifications.cancel({ notifications: previous.map((id) => ({ id })) });
  const plan = planInvoiceReminders(invoices);
  if (plan.length) {
    await LocalNotifications.schedule({
      notifications: plan.map((r) => ({ id: r.id, title: r.title, body: r.body, schedule: { at: r.at, allowWhileIdle: true }, extra: { path: r.path } })),
    });
  }
  await prefSet(PREF_KEYS.scheduledReminderIds, JSON.stringify(plan.map((r) => r.id)));
}

export async function cancelAllReminders() {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const previous: number[] = JSON.parse((await prefGet(PREF_KEYS.scheduledReminderIds)) || '[]');
  if (previous.length) await LocalNotifications.cancel({ notifications: previous.map((id) => ({ id })) });
  await prefSet(PREF_KEYS.scheduledReminderIds, '[]');
}

async function syncStatusBar() {
  const { StatusBar, Style } = await import('@capacitor/status-bar');
  const dark = document.documentElement.classList.contains('dark');
  await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => undefined);
}

/**
 * Native glue for the App Store build. Renders nothing (and imports no Capacitor code) in browsers.
 * - status bar follows the light/dark theme; splash hides once the app has painted
 * - invoicelab:// deep links and reminder taps route inside the app
 * - window.print() -> native PDF + share sheet (WKWebView has no print dialog)
 * - optional Face ID / passcode lock on launch and when returning from the background
 * - offline banner, on-device cache of clients/invoices, and offline drafts awaiting upload
 */
export function NativeBridge() {
  const native = useIsNativeIos();
  const router = useRouter();
  const pathname = usePathname();
  const [locked, setLocked] = useState(false);
  const [offline, setOffline] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const lastCache = useRef(0);
  const unlocking = useRef(false);

  const unlock = useCallback(async () => {
    if (unlocking.current) return;
    unlocking.current = true;
    try {
      const { InvoiceLabNative } = await import('@/lib/native/bridge');
      const res = await InvoiceLabNative.authenticate({ reason: 'Unlock your invoices' });
      if (res.ok) setLocked(false);
    } finally {
      unlocking.current = false;
    }
  }, []);

  const maybeLock = useCallback(async () => {
    if ((await prefGet(PREF_KEYS.lockEnabled)) !== '1') return;
    setLocked(true);
    void unlock();
  }, [unlock]);

  const refreshDraftCount = useCallback(async () => {
    const drafts: OfflineDraft[] = JSON.parse((await prefGet(PREF_KEYS.drafts)) || '[]');
    setDraftCount(drafts.length);
  }, []);

  // One-time native setup.
  useEffect(() => {
    if (!native) return;
    const cleanups: Array<() => void> = [];
    let cancelled = false;
    const originalPrint = window.print;
    window.print = () => {
      // Read the title now: callers (e.g. Invoice Studio) set it just for the print and restore it right after.
      const title = document.title;
      void import('@/lib/native/bridge').then(({ shareCurrentPageAsPdf }) => shareCurrentPageAsPdf(title)).catch(() => undefined);
    };
    cleanups.push(() => { window.print = originalPrint; });

    void (async () => {
      const [{ App }, { SplashScreen }, { Network }, { LocalNotifications }] = await Promise.all([
        import('@capacitor/app'),
        import('@capacitor/splash-screen'),
        import('@capacitor/network'),
        import('@capacitor/local-notifications'),
      ]);
      if (cancelled) return;
      await syncStatusBar();
      await SplashScreen.hide().catch(() => undefined);
      const observer = new MutationObserver(() => void syncStatusBar());
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      cleanups.push(() => observer.disconnect());

      const handles = await Promise.all([
        App.addListener('appUrlOpen', ({ url }) => {
          const path = deepLinkToPath(url);
          if (path) router.push(path);
        }),
        App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            void maybeLock();
            void refreshDraftCount();
            if (Date.now() - lastCache.current > CACHE_EVERY_MS) {
              lastCache.current = Date.now();
              void refreshCacheAndReminders();
            }
          }
        }),
        Network.addListener('networkStatusChange', (status) => setOffline(!status.connected)),
        LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
          const path = (event.notification.extra as { path?: string } | undefined)?.path;
          if (path && path.startsWith('/')) router.push(path);
        }),
      ]);
      cleanups.push(() => handles.forEach((h) => void h.remove()));
      const status = await Network.getStatus();
      setOffline(!status.connected);
      await maybeLock();
      await refreshDraftCount();
      lastCache.current = Date.now();
      void refreshCacheAndReminders();
      // Renewals / purchases made on another device reach the account even without the paywall.
      try {
        const [{ syncCurrentEntitlements, syncEntitlementsWithServer }, { InvoiceLabNative }] = await Promise.all([
          import('@/lib/native/entitlement-sync'),
          import('@/lib/native/bridge'),
        ]);
        void syncCurrentEntitlements().catch(() => undefined);
        const iapHandle = await InvoiceLabNative.addListener('entitlementsChanged', ({ entitlements }) => {
          void syncEntitlementsWithServer(entitlements);
        });
        cleanups.push(() => void iapHandle.remove());
      } catch {
        // StoreKit bridge unavailable (e.g. older build); purchases still sync from the paywall.
      }
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, [native, router, maybeLock, refreshDraftCount]);

  // Light haptic tick on in-app navigation, like a native tab bar.
  useEffect(() => {
    if (!native) return;
    void import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light })).catch(() => undefined);
  }, [native, pathname]);

  if (!native) return null;

  return (
    <>
      {offline && (
        <div role="status" className="no-print fixed inset-x-3 top-[calc(env(safe-area-inset-top)+3.75rem)] z-[60] flex items-center gap-2 rounded-xl bg-[var(--ink,#14110e)] px-3.5 py-2.5 text-[13px] font-medium text-white shadow-lg lg:top-4">
          <WifiOff size={15} aria-hidden />
          <span className="flex-1">You&apos;re offline. Saved clients and invoices are still on this iPhone.</span>
          <a href={OFFLINE_PAGE_URL} className="font-semibold underline">Open offline</a>
        </div>
      )}
      {!offline && draftCount > 0 && pathname !== '/ios/drafts' && (
        <div className="no-print fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[55] flex items-center gap-2 rounded-xl border border-[var(--accent)] bg-[var(--surface)] px-3.5 py-2.5 text-[13px] text-[var(--text)] shadow-lg lg:bottom-4">
          <span className="flex-1">{draftCount} offline draft{draftCount === 1 ? '' : 's'} ready to upload.</span>
          <Link href="/ios/drafts" className="font-semibold text-[var(--accent)] underline">Review</Link>
        </div>
      )}
      {locked && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-[#8c4a22] px-8 text-center text-[#f3efe6]" role="dialog" aria-modal="true" aria-label="Invoice Jot is locked">
          <Lock size={36} aria-hidden />
          <div>
            <p className="text-2xl font-semibold">Invoice Jot is locked</p>
            <p className="mt-1 text-sm opacity-80">Your invoices, clients and payments are protected.</p>
          </div>
          <button type="button" onClick={() => void unlock()} className="rounded-full bg-[#f3efe6] px-6 py-3 text-sm font-semibold text-[#8c4a22]">Unlock</button>
        </div>
      )}
    </>
  );
}
