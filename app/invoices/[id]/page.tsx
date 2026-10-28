'use client';

import Link from 'next/link';
import { useEffect, useState, use } from 'react';
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, Send } from 'lucide-react';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { btnGhost, btnPrimary, EmptyState, LinkButton, Page, PageHeader, Panel, SkeletonRows, Stat, StatusPill } from '@/components/ui/kit';
import type { Invoice, InvoiceStatus } from '@/lib/types';

export default function InvoiceDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Invoice unavailable');
        setInvoice(data.invoice);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Invoice unavailable');
      });
  }, [params.id]);

  async function setStatus(status: InvoiceStatus) {
    const response = await fetch(`/api/invoices/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error || 'Update failed');
    else setInvoice(data.invoice);
  }

  if (error) return <Page narrow><Panel><EmptyState icon={FileText} title="Invoice unavailable" body={error} action={<LinkButton href="/invoices">Back to invoices</LinkButton>} /></Panel></Page>;
  if (!invoice) return <Page narrow><Panel flush><SkeletonRows rows={5} /></Panel></Page>;
  const symbol = CURRENCY_SYMBOLS[invoice.currency] || `${invoice.currency} `;
  const fmt = (n: number) => `${symbol}${n.toFixed(2)}`;

  return (
    <Page narrow>
      <Link href="/invoices" className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"><ArrowLeft size={15} />All invoices</Link>
      <PageHeader eyebrow="Invoice" title={<span className="flex flex-wrap items-center gap-3">{invoice.invoiceNumber}<StatusPill status={invoice.status} /></span>}
        subtitle={`${invoice.clientName} · due ${new Date(invoice.dueDate).toLocaleDateString()}`}
        actions={<>
          {invoice.status === 'draft' && <button type="button" className={btnGhost} onClick={() => setStatus('sent')}><Send size={16} />Mark sent</button>}
          {invoice.status !== 'paid' && <button type="button" className={btnPrimary} onClick={() => setStatus('paid')}><CheckCircle2 size={16} />Mark paid</button>}
        </>} />
      <div className="grid gap-5 md:grid-cols-[1fr_260px]">
        <Panel title="Line items" flush>
          <ul className="divide-y divide-[var(--border)]">
            {invoice.items.map((item, index) => (
              <li key={`${item.description}-${index}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="min-w-0"><span className="block truncate font-medium text-[var(--text)]">{item.description}</span><span className="text-xs text-[var(--text-muted)]">{item.quantity} × {fmt(item.unitRate)}</span></span>
                <span className="tabular font-semibold text-[var(--text)]">{fmt(item.quantity * item.unitRate)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-high)] px-5 py-4">
            <span className="text-sm font-medium text-[var(--text-muted)]">Total</span>
            <span className="tabular text-xl font-semibold text-[var(--text)]">{fmt(invoice.total)}</span>
          </div>
        </Panel>
        <div className="space-y-4">
          <Stat label="Amount" value={fmt(invoice.total)} tone={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'danger' : 'accent'} sub={invoice.currency} />
          <Panel title="Get paid">
            <p className="mb-3 text-sm text-[var(--text-muted)]">Share the secure pay page with your client.</p>
            <Link href={`/pay/${invoice.payToken}`} className={btnGhost + ' w-full justify-center'}><ExternalLink size={16} />Open pay link</Link>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
