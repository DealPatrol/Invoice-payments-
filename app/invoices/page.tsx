'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DemoBanner } from '@/components/DemoBanner';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { useInvoices } from '@/lib/hooks';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { DataList, EmptyState, LinkButton, Page, PageHeader, Panel, SearchInput, Segmented, SkeletonRows, Stat, StatGrid, StatusPill, Toolbar, Avatar } from '@/components/ui/kit';

type Filter = 'all' | 'paid' | 'pending' | 'overdue';

/** Pending is the outstanding bucket: checkout promotes drafts to `sent`. */
function inSegment(status: string, filter: Filter) {
  switch (filter) {
    case 'all':
      return true;
    case 'pending':
      return status === 'pending' || status === 'sent';
    case 'paid':
    case 'overdue':
      return status === filter;
    default: {
      const unhandled: never = filter;
      return unhandled;
    }
  }
}

export default function InvoicesPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const { invoices, mode, loading, reload } = useInvoices({ status: 'all' });

  const rows = useMemo(
    () => invoices.filter((i) => inSegment(i.status, filter) && `${i.clientName} ${i.invoiceNumber}`.toLowerCase().includes(q.toLowerCase())),
    [invoices, filter, q],
  );
  const sum = (s: string) => invoices.filter((i) => i.status === s).reduce((t, i) => t + i.total, 0);
  const money = (n: number, c = 'USD') => `${CURRENCY_SYMBOLS[c] || '$'}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  async function remove(id: string) {
    if (!confirm('Delete this invoice?')) return;
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    await reload();
  }

  return (
    <Page>
      <PageHeader title="Invoices" subtitle="Every invoice you’ve sent, in one place." actions={<LinkButton href="/invoices/create"><Plus size={16} />New invoice</LinkButton>} />
      <DemoBanner mode={mode} />
      <StatGrid>
        <Stat label="Paid" value={money(sum('paid'))} tone="success" />
        <Stat label="Pending" value={money(sum('pending') + sum('sent'))} tone="warning" />
        <Stat label="Overdue" value={money(sum('overdue'))} tone="danger" />
      </StatGrid>
      <Panel flush>
        <div className="border-b border-[var(--border)] p-4">
          <Toolbar>
            <Segmented value={filter} onChange={setFilter} options={(['all', 'paid', 'pending', 'overdue'] as Filter[]).map((v) => ({ value: v, label: v, count: invoices.filter((i) => inSegment(i.status, v)).length }))} />
            <SearchInput value={q} onChange={setQ} placeholder="Search client or number" />
          </Toolbar>
        </div>
        {loading ? <SkeletonRows /> : rows.length === 0 ? (
          <EmptyState icon={FileText} title={q || filter !== 'all' ? 'No matching invoices' : 'No invoices yet'} body={q || filter !== 'all' ? 'Try a different filter or search.' : 'Create your first invoice and get paid by card or bank.'}
            action={<LinkButton href="/invoices/create"><Plus size={16} />New invoice</LinkButton>} />
        ) : (
          <DataList rows={rows} rowKey={(r) => r.id}
            columns={[
              { header: 'Number', cell: (r) => <Link href={`/invoices/${r.id}`} className="font-semibold text-[var(--accent)] hover:underline">{r.invoiceNumber}</Link> },
              { header: 'Client', cell: (r) => <span className="flex items-center gap-2.5"><Avatar name={r.clientName} />{r.clientName}</span> },
              { header: 'Issued', cell: (r) => <span className="text-[var(--text-muted)]">{r.issuedDate}</span> },
              { header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
              { header: 'Amount', align: 'right', cell: (r) => <span className="font-semibold">{money(r.total, r.currency)}</span> },
              { header: '', align: 'right', cell: (r) => <button onClick={() => remove(r.id)} aria-label={`Delete ${r.invoiceNumber}`} className="rounded-md p-1.5 text-[var(--text-subtle)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"><Trash2 size={15} /></button> },
            ]}
            mobile={(r) => (
              <div className="flex items-center gap-3">
                <Avatar name={r.clientName} />
                <Link href={`/invoices/${r.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[var(--text)]">{r.clientName}</p>
                  <p className="text-xs text-[var(--text-muted)]">{r.invoiceNumber} · {r.issuedDate}</p>
                </Link>
                <div className="text-right"><p className="tabular font-semibold text-[var(--text)]">{money(r.total, r.currency)}</p><StatusPill status={r.status} /></div>
                <button onClick={() => remove(r.id)} aria-label={`Delete ${r.invoiceNumber}`} className="shrink-0 rounded-md p-1.5 text-[var(--text-subtle)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"><Trash2 size={15} /></button>
              </div>
            )} />
        )}
      </Panel>
    </Page>
  );
}
