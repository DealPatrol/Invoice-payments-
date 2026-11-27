'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, Upload } from 'lucide-react';
import { btnGhost, btnPrimary, Page, PageHeader } from '@/components/ui/kit';
import { draftToInvoiceInput, PREF_KEYS, type OfflineDraft } from '@/lib/native/offline-cache';
import { useIsNativeIos } from '@/lib/native/useIsNativeIos';

/** Drafts written on the bundled offline page (ios-shell/offline.html), uploaded once back online. */
export function OfflineDrafts() {
  const native = useIsNativeIos();
  const router = useRouter();
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [status, setStatus] = useState<Record<string, string>>({});


  const save = useCallback(async (next: OfflineDraft[]) => {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: PREF_KEYS.drafts, value: JSON.stringify(next) });
    setDrafts(next);
  }, []);

  useEffect(() => {
    if (!native) return;
    let live = true;
    void (async () => {
      const { Preferences } = await import('@capacitor/preferences');
      const raw = (await Preferences.get({ key: PREF_KEYS.drafts })).value;
      if (live) setDrafts(raw ? (JSON.parse(raw) as OfflineDraft[]) : []);
    })();
    return () => { live = false; };
  }, [native]);

  const upload = async (d: OfflineDraft) => {
    setStatus((s) => ({ ...s, [d.id]: 'Uploading…' }));
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftToInvoiceInput(d)),
    }).catch(() => null);
    if (res?.ok) {
      const created = (await res.json()) as { id?: string };
      await save(drafts.filter((x) => x.id !== d.id));
      setStatus((s) => ({ ...s, [d.id]: 'Created.' }));
      if (created.id) router.push(`/invoices/${created.id}`);
    } else {
      const data = res ? await res.json().catch(() => ({})) : {};
      setStatus((s) => ({ ...s, [d.id]: typeof data.error === 'string' ? data.error : 'Could not upload. Check the client email and line items, then try again.' }));
    }
  };

  if (!native) {
    return (
      <Page narrow>
        <PageHeader title="Offline drafts" subtitle="Offline drafts live in the Invoice Jot iPhone app." />
        <Link className={btnGhost} href="/invoices/create">Create an invoice</Link>
      </Page>
    );
  }

  return (
    <Page narrow>
      <PageHeader title="Offline drafts" subtitle="Invoices you started without a connection. Upload them to send and get paid." />
      {drafts.length === 0 && <p className="text-sm text-[var(--text-muted)]">No offline drafts. You&apos;re all caught up.</p>}
      <ul className="grid gap-3">
        {drafts.map((d) => {
          const total = d.items.reduce((sum, i) => sum + i.quantity * i.unitRate, 0);
          return (
            <li key={d.id} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="font-semibold text-[var(--text)]">{d.clientName || 'No client yet'}</p>
              <p className="text-sm text-[var(--text-muted)]">{d.items.length} item{d.items.length === 1 ? '' : 's'} · {d.currency} {total.toFixed(2)} · due {d.dueDate || '—'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={btnPrimary} onClick={() => void upload(d)}><Upload size={14} />Upload as invoice</button>
                <button type="button" className={btnGhost} onClick={() => void save(drafts.filter((x) => x.id !== d.id))}><Trash2 size={14} />Discard</button>
              </div>
              {status[d.id] && <p className="mt-2 text-sm text-[var(--text-muted)]">{status[d.id]}</p>}
            </li>
          );
        })}
      </ul>
    </Page>
  );
}
