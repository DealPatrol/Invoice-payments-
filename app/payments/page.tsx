'use client';

import { useState } from 'react';
import { DemoBanner } from '@/components/DemoBanner';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { useInvoices } from '@/lib/hooks';
import { CheckCircle2, Clock, CreditCard, Percent } from 'lucide-react';
import { Avatar, DataList, EmptyState, Page, PageHeader, Panel, Segmented, SkeletonRows, Stat, StatGrid, StatusPill } from '@/components/ui/kit';

export default function PaymentsPage() {
  const { invoices, mode, loading } = useInvoices({ status: 'all' });
  const [view, setView] = useState<'paid' | 'outstanding'>('paid');
  const paid = invoices.filter((inv) => inv.status === 'paid');
  const outstanding = invoices.filter((inv) => ['pending', 'overdue', 'sent'].includes(inv.status));
  const paidTotal = paid.reduce((s, i) => s + i.total, 0);
  const outstandingTotal = outstanding.reduce((s, i) => s + i.total, 0);
  const rate = paidTotal + outstandingTotal > 0 ? ((paidTotal / (paidTotal + outstandingTotal)) * 100).toFixed(1) : '0';
  const rows = view === 'paid' ? paid : outstanding;
  const money = (n: number, c = 'USD') => `${CURRENCY_SYMBOLS[c] || '$'}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <Page>
      <PageHeader title="Payments" subtitle="Money in, money owed, and how fast clients pay." />
      <DemoBanner mode={mode} />
      <StatGrid>
        <Stat label="Collected" value={money(paidTotal)} tone="success" icon={CheckCircle2} />
        <Stat label="Outstanding" value={money(outstandingTotal)} tone="warning" icon={Clock} />
        <Stat label="Collection rate" value={`${rate}%`} tone="accent" icon={Percent} sub={`${paid.length} of ${paid.length + outstanding.length} invoices paid`} />
      </StatGrid>
      <Panel flush>
        <div className="border-b border-[var(--border)] p-4">
          <Segmented value={view} onChange={setView} options={[{ value: 'paid', label: 'Paid', count: paid.length }, { value: 'outstanding', label: 'Outstanding', count: outstanding.length }]} />
        </div>
        {loading ? <SkeletonRows /> : rows.length === 0 ? (
          <EmptyState icon={CreditCard} title={view === 'paid' ? 'No payments yet' : 'Nothing outstanding'} body={view === 'paid' ? 'Payments show up here as soon as a client pays.' : 'Every invoice is paid. Nice work.'} />
        ) : (
          <DataList rows={rows} rowKey={(r) => r.id}
            columns={[
              { header: 'Invoice', cell: (r) => <span className="font-semibold">{r.invoiceNumber}</span> },
              { header: 'Client', cell: (r) => <span className="flex items-center gap-2.5"><Avatar name={r.clientName} />{r.clientName}</span> },
              { header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
              { header: 'Amount', align: 'right', cell: (r) => <span className="font-semibold">{money(r.total, r.currency)}</span> },
            ]}
            mobile={(r) => (
              <div className="flex items-center gap-3"><Avatar name={r.clientName} />
                <div className="min-w-0 flex-1"><p className="truncate font-semibold text-[var(--text)]">{r.clientName}</p><p className="text-xs text-[var(--text-muted)]">{r.invoiceNumber}</p></div>
                <div className="text-right"><p className="tabular font-semibold text-[var(--text)]">{money(r.total, r.currency)}</p><StatusPill status={r.status} /></div>
              </div>
            )} />
        )}
      </Panel>
    </Page>
  );
}
