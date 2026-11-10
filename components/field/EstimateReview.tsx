'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Receipt, XCircle } from 'lucide-react';
import { kindLabel } from '@/lib/estimate-domain';
import type { PublicEstimate } from '@/lib/field-types';
import { money } from './ui';

export function EstimateReview({ token }: { token: string }) {
  const [estimate, setEstimate] = useState<PublicEstimate | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetch(`/api/estimate-review/${token}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Estimate unavailable');
        setEstimate(data.estimate);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Estimate unavailable'));
  }, [token]);

  async function respond(action: 'approve' | 'decline', changeOrderId?: string) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/estimate-review/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason, changeOrderId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save your response');
      setEstimate(data.estimate);
      setReason('');
    } catch (respondError) {
      setError(respondError instanceof Error ? respondError.message : 'Could not save your response');
    } finally {
      setBusy(false);
    }
  }

  const shell = 'min-h-screen bg-[radial-gradient(900px_500px_at_50%_-10%,var(--accent-soft),transparent_60%)] bg-[var(--background)] px-4 py-8';
  if (!estimate && !error) {
    return <div className={`${shell} flex items-center justify-center`}><div className="skeleton h-40 w-full max-w-lg" /></div>;
  }
  if (!estimate) {
    return <div className={`${shell} flex items-center justify-center`}><p className="text-sm text-[var(--danger)]">{error}</p></div>;
  }
  const fmt = (value: number) => money(estimate.currency, value);

  return (
    <div className={shell}>
      <article className="mx-auto w-full max-w-lg overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--accent)] text-[var(--on-accent)]"><Receipt size={14} /></span>Invoice Laboratory</span>
          <span className="text-xs font-medium text-[var(--text-muted)]">{estimate.estimateNumber}</span>
        </header>
        <div className="space-y-5 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">{estimate.contractorName}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text)]">{estimate.jobTitle || 'Estimate'}</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Prepared for {estimate.clientName}{estimate.siteAddress ? ` · ${estimate.siteAddress}` : ''}</p>
          </div>
          <p className="whitespace-pre-wrap text-sm text-[var(--text)]">{estimate.scope}</p>
          {estimate.photos.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {estimate.photos.map((photo) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={photo.id} src={photo.dataUrl} alt={photo.caption || 'Site'} className="aspect-[4/3] w-full rounded-[10px] object-cover" />
              ))}
            </div>
          )}
          {estimate.previewDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={estimate.previewDataUrl} alt={estimate.previewSource === 'schematic' ? 'Schematic of the finished work' : 'Preview of the finished work'} className="aspect-video w-full rounded-[10px] object-cover" />
          )}
          <ol className="space-y-2">
            {estimate.phases.map((phase, index) => (
              <li key={phase.id} className="text-sm"><span className="font-semibold text-[var(--text)]">{index + 1}. {phase.name}.</span> <span className="text-[var(--text-muted)]">{phase.description}</span></li>
            ))}
          </ol>
          <ul className="divide-y divide-[var(--border)] rounded-[10px] border border-[var(--border)]">
            {estimate.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                <span>
                  <span className="block font-medium text-[var(--text)]">{item.description}</span>
                  <span className="text-xs text-[var(--text-muted)]">{kindLabel(item.kind)} · {item.quantity} {item.unit}</span>
                </span>
                <span className="tabular font-semibold">{fmt(item.total)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-end justify-between">
            <div className="text-xs text-[var(--text-subtle)]">
              <p>Subtotal {fmt(estimate.subtotal)}</p>
              {estimate.tax > 0 && <p>Tax {fmt(estimate.tax)}</p>}
              {estimate.validUntil && <p className="mt-1">Valid through {new Date(estimate.validUntil).toLocaleDateString()}</p>}
            </div>
            <p className="tabular text-3xl font-bold tracking-tight text-[var(--text)]">{fmt(estimate.total)}</p>
          </div>
          {estimate.assumptions.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--text-muted)]">
              {estimate.assumptions.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
          {estimate.status === 'approved' || estimate.status === 'converted' ? (
            <div className="rounded-[10px] bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]"><CheckCircle2 className="mr-2 inline" size={16} />Approved. {estimate.contractorName} will follow up with an invoice.</div>
          ) : null}
          {estimate.status === 'declined' && (
            <div className="rounded-[10px] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]"><XCircle className="mr-2 inline" size={16} />You declined this estimate.</div>
          )}
          {estimate.status === 'sent' && (
            <div className="space-y-3">
              <textarea className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Optional note for your contractor" value={reason} onChange={(event) => setReason(event.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={busy} onClick={() => respond('decline')} className="rounded-[10px] border border-[var(--border)] py-3 text-sm font-semibold text-[var(--text)]">Decline</button>
                <button type="button" disabled={busy} onClick={() => respond('approve')} className="rounded-[10px] bg-[var(--accent)] py-3 text-sm font-semibold text-[var(--on-accent)]">Approve</button>
              </div>
            </div>
          )}
          {estimate.status === 'draft' && <p className="text-sm text-[var(--text-muted)]">Your contractor is still finishing this estimate.</p>}
          {estimate.changeOrders.filter((change) => change.status !== 'draft').map((change) => (
            <section key={change.id} className="rounded-[10px] border border-[var(--border)] p-3">
              <p className="text-sm font-semibold text-[var(--text)]">{change.number}: {change.title}</p>
              <p className="text-sm text-[var(--text-muted)]">{change.reason}</p>
              <p className="mt-1 tabular text-sm font-semibold">{fmt(change.total)}</p>
              {change.status === 'sent' && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" disabled={busy} onClick={() => respond('decline', change.id)} className="rounded-[10px] border border-[var(--border)] py-2 text-xs font-semibold">Decline change</button>
                  <button type="button" disabled={busy} onClick={() => respond('approve', change.id)} className="rounded-[10px] bg-[var(--accent)] py-2 text-xs font-semibold text-[var(--on-accent)]">Approve change</button>
                </div>
              )}
              {change.status !== 'sent' && <p className="mt-2 text-xs capitalize text-[var(--text-subtle)]">{change.status}</p>}
            </section>
          ))}
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        </div>
      </article>
    </div>
  );
}
