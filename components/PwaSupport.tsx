'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Share, X } from 'lucide-react';
import {
  dismissIosInstallHint,
  isAppChromePath,
  readIosInstallHintVisible,
  subscribeIosInstallHint,
} from '@/lib/pwa';

export function PwaSupport() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const appChrome = isAppChromePath(pathname, search);
  const showHint = useSyncExternalStore(
    subscribeIosInstallHint,
    () => readIosInstallHintVisible(pathname, search),
    () => false,
  );

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // A registration failure must never break the app, auth, or checkout.
    });
  }, []);

  if (!showHint) return null;

  return (
    <div
      role="region"
      aria-label="Install Invoice Laboratory on your iPhone"
      className={`no-print fixed inset-x-3 z-50 flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[13px] leading-snug text-[var(--text)] shadow-[var(--shadow-md)] ${
        appChrome
          ? 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-4'
          : 'bottom-[max(0.75rem,env(safe-area-inset-bottom))]'
      }`}
    >
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--accent)] text-[var(--on-accent)]">
        <Share size={15} aria-hidden="true" />
      </span>
      <p className="min-w-0 flex-1 pt-0.5 font-medium">
        Install on your iPhone: tap Share &gt; Add to Home Screen
      </p>
      <button
        type="button"
        aria-label="Dismiss install hint"
        onClick={dismissIosInstallHint}
        className="-mr-1 rounded-lg p-1 text-[var(--text-subtle)] hover:bg-[var(--surface-high)] hover:text-[var(--text)]"
      >
        <X size={16} />
      </button>
    </div>
  );
}
