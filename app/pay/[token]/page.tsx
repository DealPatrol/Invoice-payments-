'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import QRCode from 'qrcode';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import type { Invoice } from '@/lib/types';
import { CheckCircle2, CreditCard, Loader2, Lock, Receipt } from 'lucide-react';

export default function PayPortalPage(props: { params: Promise<{ token: string }> }) {
  const params = use(props.params);
  const searchParams = useSearchParams();
  const paid = searchParams.get('paid') === '1';
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [qr, setQr] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/pay/${params.token}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (data.error) throw new Error(data.error);
        setInvoice(data.invoice);
        const url = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';
        const qrData = await QRCode.toDataURL(url, { width: 200, margin: 2 });
        setQr(qrData);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function payNow() {
    setPaying(true);
    setError('');
    try {
      const res = await fetch(`/api/pay/${params.token}`, { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'Payment unavailable');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
      setPaying(false);
    }
  }

  const shell = 'min-h-screen bg-[radial-gradient(900px_500px_at_50%_-10%,var(--accent-soft),transparent_60%)] bg-[var(--background)]';
  if (loading) {
    return (
      <div className={`${shell} flex items-center justify-center p-6`} aria-busy="true">
        <div className="w-full max-w-md space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-lg)]">
          <div className="skeleton h-4 w-24" /><div className="skeleton h-8 w-40" /><div className="skeleton h-12 w-full" /><div className="skeleton h-11 w-full" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className={`${shell} flex items-center justify-center p-6`}>
        <div className="max-w-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-md)]">
          <p className="font-semibold text-[var(--text)]">We couldn’t open this invoice</p>
          <p className="mt-1 text-sm text-[var(--danger)]">{error || 'Invoice not found'}</p>
        </div>
      </div>
    );
  }

  const sym = CURRENCY_SYMBOLS[invoice.currency] || '$';
  const isPaid = invoice.status === 'paid' || paid;
  const lateFee = invoice.status === 'overdue' && invoice.lateFeePercent ? invoice.total * (invoice.lateFeePercent / 100) : 0;
  const amountDue = invoice.total + lateFee;
  const fmt = (n: number) => `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className={`${shell} flex items-center justify-center p-4 sm:p-6`}>
      <div className="animate-in w-full max-w-md overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--accent)] text-[var(--on-accent)]"><Receipt size={14} /></span>InvoiceOS Pay</span>
          <span className="text-xs font-medium text-[var(--text-muted)]">{invoice.invoiceNumber}</span>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-sm text-[var(--text-muted)]">Billed to <span className="font-medium text-[var(--text)]">{invoice.clientName}</span></p>
          {isPaid ? (
            <div className="py-8 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--success-soft)] text-[var(--success)]"><CheckCircle2 size={30} /></span>
              <p className="mt-4 text-lg font-semibold text-[var(--text)]">Payment received</p>
              <p className="text-sm text-[var(--text-muted)]">Thank you! A receipt is on its way.</p>
            </div>
          ) : (
            <>
              <p className="mt-4 text-xs font-medium uppercase tracking-wider text-[var(--text-subtle)]">Amount due</p>
              <p className="tabular mt-1 text-[2.5rem] font-bold leading-none tracking-tight text-[var(--text)]">{fmt(amountDue)}</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Due {new Date(invoice.dueDate).toLocaleDateString()}</p>
              {lateFee > 0 && <p className="mt-3 rounded-lg bg-[var(--warning-soft)] px-3 py-2 text-xs text-[var(--warning)]">Includes {fmt(lateFee)} late fee ({invoice.lateFeePercent}%)</p>}
              <button type="button" onClick={payNow} disabled={paying}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--accent)] py-3 text-sm font-semibold text-[var(--on-accent)] shadow-[var(--shadow-md)] transition hover:bg-[var(--accent-hover)] disabled:opacity-50">
                {paying ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}Pay {fmt(amountDue)}
              </button>
              {error && <p className="mt-3 text-center text-sm text-[var(--danger)]">{error}</p>}
              {qr && (
                <div className="mt-6 flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-high)] p-3">
                  <Image src={qr} alt="Pay link QR code" width={88} height={88} className="rounded-md bg-white" />
                  <p className="text-xs text-[var(--text-muted)]">Scan to pay on your phone. Apple Pay and Google Pay work where available.</p>
                </div>
              )}
            </>
          )}
        </div>
        <p className="flex items-center justify-center gap-1.5 border-t border-[var(--border)] bg-[var(--surface-high)] py-3 text-xs text-[var(--text-subtle)]"><Lock size={12} />Secure checkout powered by Stripe</p>
      </div>
    </div>
  );
}
