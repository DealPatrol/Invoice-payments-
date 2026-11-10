'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, FileText, ImagePlus, Send } from 'lucide-react';
import { btnGhost, btnPrimary, LinkButton, Page, PageHeader, Panel, SkeletonRows, StatusPill } from '@/components/ui/kit';
import { kindLabel } from '@/lib/estimate-domain';
import type { EstimateRecord, FieldLine, FieldLineInput, LineKind } from '@/lib/field-types';
import { LINE_KINDS } from '@/lib/field-types';
import { fieldClass, labelClass, money } from './ui';

function linesFrom(estimate: EstimateRecord): FieldLineInput[] {
  return estimate.items.map((item) => ({
    kind: item.kind,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
  }));
}

export function EstimateDetail({ id }: { id: string }) {
  const [estimate, setEstimate] = useState<EstimateRecord | null>(null);
  const [lines, setLines] = useState<FieldLineInput[]>([]);
  const [scope, setScope] = useState('');
  const [notes, setNotes] = useState('');
  const [taxPercent, setTaxPercent] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [changeTitle, setChangeTitle] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [changeLines, setChangeLines] = useState<FieldLineInput[]>([{ kind: 'labor', description: '', quantity: 1, unit: 'hr', unitPrice: 0 }]);

  function apply(next: EstimateRecord) {
    setEstimate(next);
    setLines(linesFrom(next));
    setScope(next.scope);
    setNotes(next.notes);
    setTaxPercent(Math.round(next.taxRate * 10000) / 100);
  }

  useEffect(() => {
    fetch(`/api/estimates/${id}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Estimate unavailable');
        apply(data.estimate);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Estimate unavailable'));
  }, [id]);

  async function send(path: string, body?: unknown, method = 'POST') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Request failed');
      if (data.estimate) apply(data.estimate);
      if (data.invoice?.id) setNotice(`Invoice ${data.invoice.invoiceNumber} is ready.`);
      return data;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Request failed');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!estimate) return;
    const url = `${window.location.origin}/estimate/${estimate.reviewToken}`;
    await navigator.clipboard.writeText(url);
    setNotice('Approval link copied.');
  }

  if (error && !estimate) {
    return <Page narrow><Panel><p className="text-sm text-[var(--danger)]">{error}</p><div className="mt-4"><LinkButton href="/estimates">Back to estimates</LinkButton></div></Panel></Page>;
  }
  if (!estimate) return <Page narrow><Panel flush><SkeletonRows rows={6} /></Panel></Page>;
  const editable = estimate.status === 'draft';
  const fmt = (value: number) => money(estimate.currency, value);

  return (
    <Page>
      <Link href="/estimates" className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"><ArrowLeft size={15} />All estimates</Link>
      <PageHeader
        eyebrow={estimate.estimateNumber}
        title={<span className="flex flex-wrap items-center gap-3">{estimate.jobTitle || 'Estimate'}<StatusPill status={estimate.status} /></span>}
        subtitle={`${estimate.clientName} · ${estimate.source === 'demo' ? 'Demo draft' : estimate.source === 'photo' ? 'Drafted from photos' : 'Written estimate'}`}
        actions={<>
          {estimate.status === 'draft' && <button type="button" className={btnPrimary} disabled={busy} onClick={() => send(`/api/estimates/${id}`, { status: 'sent', scope, notes, taxRate: taxPercent / 100, items: lines }, 'PATCH')}><Send size={16} />Send for approval</button>}
          {estimate.status === 'sent' && <button type="button" className={btnGhost} disabled={busy} onClick={() => send(`/api/estimates/${id}`, { status: 'draft' }, 'PATCH')}>Back to draft</button>}
          {(estimate.status === 'draft' || estimate.status === 'sent' || estimate.status === 'approved') && <button type="button" className={btnGhost} onClick={() => { void copyLink(); }}><Copy size={16} />Copy approval link</button>}
          {estimate.status === 'approved' && <button type="button" className={btnPrimary} disabled={busy} onClick={() => send(`/api/estimates/${id}/convert`)}><FileText size={16} />Create invoice</button>}
          {estimate.status === 'declined' && <button type="button" className={btnGhost} disabled={busy} onClick={() => send(`/api/estimates/${id}`, { status: 'draft' }, 'PATCH')}>Reopen</button>}
          {estimate.invoiceId && <Link className={btnPrimary} href={`/invoices/${estimate.invoiceId}`}>Open {estimate.invoiceNumber}</Link>}
        </>}
      />
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      {notice && <p className="text-sm text-[var(--success)]">{notice}</p>}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <Panel title="Scope">
            {editable ? (
              <textarea className={`${fieldClass} min-h-28`} value={scope} onChange={(event) => setScope(event.target.value)} />
            ) : <p className="whitespace-pre-wrap text-sm text-[var(--text)]">{estimate.scope || 'No scope yet.'}</p>}
            {estimate.assumptions.length > 0 && (
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[var(--text-muted)]">
                {estimate.assumptions.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
          </Panel>
          <Panel title="Lines" flush>
            {editable && lines.some((l) => !(l.unitPrice > 0)) && (
              <p className="border-b border-[var(--border)] bg-[var(--warning-soft)] px-5 py-2.5 text-sm font-medium text-[var(--warning)]">
                {lines.filter((l) => !(l.unitPrice > 0)).length} line(s) need your price. They weren&apos;t in your <Link className="underline" href="/price-book">price book</Link>, so nothing was guessed.
              </p>
            )}
            <ul className="divide-y divide-[var(--border)]">
              {(editable ? lines : estimate.items).map((line, index) => (
                <li key={`${line.description}-${index}`} className="grid gap-2 px-5 py-3 sm:grid-cols-[110px_1fr_70px_80px_90px_auto] sm:items-center">
                  {editable ? (
                    <>
                      <select className={fieldClass} value={line.kind} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, kind: event.target.value as LineKind } : item))}>
                        {LINE_KINDS.map((kind) => <option key={kind} value={kind}>{kindLabel(kind)}</option>)}
                      </select>
                      <input className={fieldClass} value={line.description} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} />
                      <input type="number" min="0" step="0.01" className={fieldClass} value={line.quantity} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Number(event.target.value) } : item))} />
                      <input className={fieldClass} value={line.unit} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unit: event.target.value } : item))} />
                      <input type="number" step="0.01" aria-label={line.unitPrice > 0 ? 'Unit price' : 'Needs your price'} placeholder="Your price" className={`${fieldClass} ${line.unitPrice > 0 ? '' : 'border-[var(--warning)] bg-[var(--warning-soft)]'}`} value={line.unitPrice} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unitPrice: Number(event.target.value) } : item))} />
                      <button type="button" className="text-xs font-semibold text-[var(--danger)]" onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-3 sm:col-span-6">
                      <span>
                        <span className="block text-sm font-medium text-[var(--text)]">{line.description}</span>
                        <span className="text-xs text-[var(--text-muted)]">{kindLabel((line as FieldLine).kind)} · {line.quantity} {line.unit} × {fmt(line.unitPrice)}</span>
                        {'shoppingUrl' in line && line.shoppingUrl && <a className="mt-1 block text-xs text-[var(--accent)]" href={line.shoppingUrl} target="_blank" rel="noreferrer">Shop materials</a>}
                      </span>
                      <span className="tabular text-sm font-semibold">{fmt(line.quantity * line.unitPrice)}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {editable && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-3">
                <button type="button" className={btnGhost} onClick={() => setLines((current) => [...current, { kind: 'materials', description: '', quantity: 1, unit: 'ea', unitPrice: 0 }])}>Add line</button>
                <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">Tax %
                  <input type="number" min={0} max={100} step="0.01" className={`${fieldClass} w-24`} value={taxPercent} onChange={(event) => setTaxPercent(Number(event.target.value))} />
                </label>
                <button type="button" className={btnPrimary} disabled={busy} onClick={() => send(`/api/estimates/${id}`, { scope, notes, taxRate: taxPercent / 100, items: lines }, 'PATCH')}>Save draft</button>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-high)] px-5 py-4">
              <span className="text-sm text-[var(--text-muted)]">Total</span>
              <span className="tabular text-xl font-semibold">{fmt(estimate.total)}</span>
            </div>
          </Panel>
          {estimate.phases.length > 0 && (
            <Panel title="Phases">
              <ol className="space-y-3">
                {estimate.phases.map((phase, index) => (
                  <li key={phase.id} className="text-sm">
                    <p className="font-semibold text-[var(--text)]">{index + 1}. {phase.name}{phase.durationDays ? ` · ${phase.durationDays} day${phase.durationDays === 1 ? '' : 's'}` : ''}</p>
                    {phase.description && <p className="text-[var(--text-muted)]">{phase.description}</p>}
                  </li>
                ))}
              </ol>
            </Panel>
          )}
          <Panel title="Change orders">
            {estimate.changeOrders.length === 0 && <p className="mb-4 text-sm text-[var(--text-muted)]">Use a change order when the approved scope moves — add it to this estimate, or invoice just the difference.</p>}
            <ul className="mb-4 space-y-3">
              {estimate.changeOrders.map((change) => (
                <li key={change.id} className="rounded-[10px] border border-[var(--border)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--text)]">{change.number} · {change.title}</p>
                    <StatusPill status={change.resolution || change.status} />
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{fmt(change.total)}{change.reason ? ` · ${change.reason}` : ''}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {change.status === 'draft' && <button type="button" className={btnGhost} disabled={busy} onClick={() => send(`/api/change-orders/${change.id}`, { status: 'sent' }, 'PATCH')}>Send to customer</button>}
                    {change.resolution === '' && change.status !== 'declined' && change.status !== 'invoiced' && estimate.status === 'approved' && (
                      <button type="button" className={btnGhost} disabled={busy} onClick={() => send(`/api/change-orders/${change.id}/apply`, { mode: 'amend' })}>Add to estimate</button>
                    )}
                    {change.resolution === '' && change.status !== 'declined' && change.status !== 'invoiced' && (
                      <button type="button" className={btnGhost} disabled={busy} onClick={() => send(`/api/change-orders/${change.id}/apply`, { mode: 'invoice' })}>Invoice the difference</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {estimate.status !== 'declined' && (
              <div className="space-y-3 border-t border-[var(--border)] pt-4">
                <label className="block"><span className={labelClass}>New change</span><input className={fieldClass} value={changeTitle} onChange={(event) => setChangeTitle(event.target.value)} placeholder="Extra gate, wet soil, added room" /></label>
                <textarea className={`${fieldClass} min-h-16`} value={changeReason} onChange={(event) => setChangeReason(event.target.value)} placeholder="Why the price changed" />
                {changeLines.map((line, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-4">
                    <select className={fieldClass} value={line.kind} onChange={(event) => setChangeLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, kind: event.target.value as LineKind } : item))}>
                      {LINE_KINDS.map((kind) => <option key={kind} value={kind}>{kindLabel(kind)}</option>)}
                    </select>
                    <input className={`${fieldClass} sm:col-span-2`} placeholder="Description" value={line.description} onChange={(event) => setChangeLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} />
                    <input type="number" step="0.01" className={fieldClass} value={line.unitPrice} onChange={(event) => setChangeLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unitPrice: Number(event.target.value) } : item))} />
                  </div>
                ))}
                <button type="button" className={btnPrimary} disabled={busy || !changeTitle.trim()} onClick={async () => {
                  const saved = await send(`/api/estimates/${id}/change-orders`, {
                    title: changeTitle,
                    reason: changeReason,
                    items: changeLines.filter((line) => line.description.trim()),
                  });
                  if (saved) {
                    setChangeTitle('');
                    setChangeReason('');
                    setChangeLines([{ kind: 'labor', description: '', quantity: 1, unit: 'hr', unitPrice: 0 }]);
                  }
                }}>Save change order</button>
              </div>
            )}
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel title="Customer">
            <p className="text-sm font-semibold text-[var(--text)]">{estimate.clientName}</p>
            <p className="text-sm text-[var(--text-muted)]">{estimate.clientEmail}</p>
            {estimate.jobId && <Link href={`/jobs/${estimate.jobId}`} className="mt-3 inline-block text-sm font-semibold text-[var(--accent)]">Open job</Link>}
            {estimate.validUntil && <p className="mt-3 text-xs text-[var(--text-subtle)]">Valid through {new Date(estimate.validUntil).toLocaleDateString()}</p>}
            {editable && <textarea className={`${fieldClass} mt-3 min-h-20`} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Internal notes" />}
          </Panel>
          <Panel title="Preview">
            <p className="mb-3 text-sm text-[var(--text-muted)]">{estimate.previewSource === 'replicate' ? 'Generated after photo.' : 'A schematic until a preview model is configured.'}</p>
            {estimate.previewDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={estimate.previewDataUrl} alt="Finished-job preview" className="mb-3 aspect-video w-full rounded-[10px] object-cover" />
            )}
            <button type="button" className={btnGhost} disabled={busy} onClick={() => send(`/api/estimates/${id}/preview`)}><ImagePlus size={16} />Build preview</button>
          </Panel>
          {estimate.photos.length > 0 && (
            <Panel title="Site photos">
              <div className="grid grid-cols-2 gap-2">
                {estimate.photos.filter((photo) => photo.role === 'site').map((photo) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={photo.id} src={photo.dataUrl} alt={photo.caption || 'Site'} className="aspect-square w-full rounded-[10px] object-cover" />
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </Page>
  );
}
