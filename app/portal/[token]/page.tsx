import { notFound } from 'next/navigation';
import { ChevronRight, FileText, Lock } from 'lucide-react';
import { EmptyState, Panel, StatusPill } from '@/components/ui/kit';
import { calcTotals, formatDate, formatMoney } from '@/lib/studio';
import { amountDue, displayStatus } from '@/lib/studio-ops';
import { hasDatabase, loadPortal } from '@/lib/studio-server';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false }, title: 'Your invoices' };

export default async function ClientPortal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!hasDatabase()) notFound();
  const portal = await loadPortal(token);
  if (!portal) notFound();
  const today = new Date().toISOString().slice(0, 10);
  const invoices = portal.docs.filter((d) => d.kind === 'invoice');
  const estimates = portal.docs.filter((d) => d.kind === 'estimate');
  const currency = portal.docs[0]?.business.currency ?? 'USD';
  const open = invoices.reduce((s, i) => s + (i.status === 'void' ? 0 : amountDue(i, today)), 0);
  const name = portal.docs[0]?.customer.name || portal.email;
  const brands = Array.from(new Set(portal.docs.map((d) => d.business.name).filter(Boolean)));

  const Row = ({ d }: { d: (typeof portal.docs)[number] }) => {
    const status = d.kind === 'estimate' ? d.estimateStatus ?? 'sent' : displayStatus(d, today);
    const amount = d.kind === 'estimate' ? calcTotals(d).total : amountDue(d, today);
    return (
      <a href={`/i/${d.shareToken}`} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-[var(--surface-high)]">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><FileText size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[var(--text)]">{d.number} <span className="font-normal text-[var(--text-muted)]">· {d.business.name}</span></p>
          <p className="text-xs text-[var(--text-muted)]">Issued {formatDate(d.issueDate)}{d.kind === 'invoice' ? ` · Due ${formatDate(d.dueDate)}` : ''}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="tabular font-semibold text-[var(--text)]">{formatMoney(amount, d.business.currency)}</span>
          <StatusPill status={String(status)} />
        </div>
        <ChevronRight size={16} className="hidden text-[var(--text-subtle)] transition group-hover:translate-x-0.5 sm:block" />
      </a>
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_500px_at_50%_-10%,var(--accent-soft),transparent_60%)] bg-[var(--background)] p-3 sm:p-10">
      <div className="mx-auto max-w-[760px] space-y-5">
        <div className="animate-in rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">{brands.join(' · ') || 'Client portal'}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text)]">Hi {name.split(' ')[0]}, here are your invoices</h1>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-high)] p-4"><p className="text-xs text-[var(--text-muted)]">Open balance</p><p className="tabular mt-1 text-2xl font-bold" style={{ color: open > 0 ? 'var(--warning)' : 'var(--success)' }}>{formatMoney(open, currency)}</p></div>
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-high)] p-4"><p className="text-xs text-[var(--text-muted)]">Documents</p><p className="tabular mt-1 text-2xl font-bold text-[var(--text)]">{portal.docs.length}</p></div>
          </div>
        </div>
        <Panel title={`Invoices (${invoices.length})`} flush>
          {invoices.length ? <div className="divide-y divide-[var(--border)]">{invoices.map((d) => <Row key={d.id} d={d} />)}</div> : <EmptyState icon={FileText} title="No invoices yet" />}
        </Panel>
        {estimates.length > 0 && (
          <Panel title={`Estimates (${estimates.length})`} flush><div className="divide-y divide-[var(--border)]">{estimates.map((d) => <Row key={d.id} d={d} />)}</div></Panel>
        )}
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[var(--text-subtle)]"><Lock size={12} />This private link is only for {portal.email}. Don&apos;t share it.</p>
      </div>
    </div>
  );
}
