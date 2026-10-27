import { notFound } from 'next/navigation';
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
    const status = d.kind === 'estimate' ? d.estimateStatus : displayStatus(d, today);
    const amount = d.kind === 'estimate' ? calcTotals(d).total : amountDue(d, today);
    return (
      <a href={`/i/${d.shareToken}`} className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-0 hover:bg-gray-50">
        <div>
          <div className="font-semibold text-gray-900">{d.number} <span className="text-sm font-normal text-gray-500">• {d.business.name}</span></div>
          <div className="text-sm text-gray-500">Issued {formatDate(d.issueDate)}{d.kind === 'invoice' ? ` • Due ${formatDate(d.dueDate)}` : ''}</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-gray-900">{formatMoney(amount, d.business.currency)}</div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${status === 'overdue' ? 'bg-red-100 text-red-700' : status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{status}</span>
        </div>
      </a>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] p-3 sm:p-8">
      <div className="mx-auto max-w-[760px] space-y-4">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">{brands.join(' • ') || 'Client portal'}</div>
          <h1 className="text-2xl font-black text-gray-900">Hi {name.split(' ')[0]}, here are your invoices</h1>
          <div className="mt-2 text-gray-700">Open balance: <span className="font-bold">{formatMoney(open, currency)}</span></div>
        </div>
        <section className="overflow-hidden rounded-xl bg-white shadow-sm">
          <h2 className="border-b border-gray-100 px-4 py-3 font-bold text-gray-900">Invoices ({invoices.length})</h2>
          {invoices.length ? invoices.map((d) => <Row key={d.id} d={d} />) : <p className="px-4 py-3 text-sm text-gray-500">No invoices yet.</p>}
        </section>
        {estimates.length > 0 && (
          <section className="overflow-hidden rounded-xl bg-white shadow-sm">
            <h2 className="border-b border-gray-100 px-4 py-3 font-bold text-gray-900">Estimates ({estimates.length})</h2>
            {estimates.map((d) => <Row key={d.id} d={d} />)}
          </section>
        )}
        <p className="text-center text-xs text-gray-400">This private link is only for {portal.email}. Don&apos;t share it.</p>
      </div>
    </div>
  );
}
