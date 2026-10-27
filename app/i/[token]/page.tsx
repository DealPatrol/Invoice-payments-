import { notFound } from 'next/navigation';
import { InvoiceDocument } from '@/components/studio/InvoiceDocument';
import { PublicActions } from '@/components/studio/PublicActions';
import { calcTotals, formatDate, formatMoney } from '@/lib/studio';
import { amountDue, displayStatus } from '@/lib/studio-ops';
import { getByToken, hasDatabase, recordView } from '@/lib/studio-server';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

export default async function SharedStudioDoc({ params, searchParams }: {
  params: Promise<{ token: string }>; searchParams: Promise<{ paid?: string }>;
}) {
  const { token } = await params;
  const { paid } = await searchParams;
  if (!hasDatabase()) notFound();
  const found = await getByToken(token);
  if (!found) notFound();
  if (paid !== '1') await recordView(token);
  const inv = found.invoice;
  const today = new Date().toISOString().slice(0, 10);
  const due = amountDue(inv, today);
  const status = displayStatus(inv, today);
  const isEstimate = inv.kind === 'estimate';
  const checkoutOn = process.env.STUDIO_CHECKOUT_ENABLED === 'true';
  const external = inv.paymentLink || inv.business.paymentLinkUrl;
  const canPay = !isEstimate && due > 0 && inv.status !== 'void' && (checkoutOn || Boolean(external));
  const canRespond = isEstimate && (inv.estimateStatus === 'draft' || inv.estimateStatus === 'sent');

  return (
    <div className="print-reset min-h-screen bg-[#f1f3f7] p-3 sm:p-10">
      <div className="no-print mx-auto mb-4 flex max-w-[860px] flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42/0.05),0_8px_24px_-8px_rgb(15_23_42/0.12)] ring-1 ring-slate-900/5 sm:p-6">
        <div>
          <div className="text-sm text-gray-500">{inv.business.name} sent you {isEstimate ? 'an estimate' : 'an invoice'}</div>
          <div className="tabular mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {formatMoney(isEstimate ? calcTotals(inv).total : due, inv.business.currency)}
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 align-middle text-xs font-semibold uppercase text-gray-600">{isEstimate ? inv.estimateStatus : status}</span>
          </div>
          {!isEstimate && <div className="text-sm text-gray-500">Due {formatDate(inv.dueDate)}</div>}
          {inv.clientResponse && <div className="text-sm text-gray-600">{inv.clientResponse.action === 'accept' ? 'Accepted' : 'Declined'} by {inv.clientResponse.name}</div>}
          {paid === '1' && <div className="text-sm font-semibold text-green-600">Thanks! Your payment was submitted. Bank (ACH) payments can take a few days to clear.</div>}
        </div>
        <PublicActions token={token} kind={inv.kind} canPay={canPay} canRespond={canRespond} accent={inv.business.accentColor || '#4f46e5'}
          payLabel={checkoutOn && !external ? 'Pay by card or bank' : 'Pay now'} externalPayUrl={checkoutOn ? undefined : external || undefined} />
      </div>
      <div className="mx-auto max-w-[860px] overflow-x-auto"><InvoiceDocument invoice={inv} today={today} /></div>
    </div>
  );
}
