'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import QRCode from 'qrcode';
import { COLORS, CURRENCY_SYMBOLS } from '@/lib/constants';
import type { Invoice } from '@/lib/types';
import { CheckCircle, CreditCard, Loader2 } from 'lucide-react';

export default function PayPortalPage({ params }: { params: { token: string } }) {
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

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: COLORS.background, color: COLORS.textMuted }}
      >
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-8"
        style={{ background: COLORS.background, color: COLORS.danger }}
      >
        {error || 'Invoice not found'}
      </div>
    );
  }

  const sym = CURRENCY_SYMBOLS[invoice.currency] || '$';
  const isPaid = invoice.status === 'paid' || paid;
  const lateFee =
    invoice.status === 'overdue' && invoice.lateFeePercent
      ? invoice.total * (invoice.lateFeePercent / 100)
      : 0;
  const amountDue = invoice.total + lateFee;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: COLORS.background }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-8"
        style={{ background: COLORS.surface, borderColor: COLORS.border }}
      >
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: COLORS.accent }}>
          InvoiceOS Pay
        </p>
        <h1 className="text-2xl font-black mb-1" style={{ color: COLORS.text }}>
          {invoice.invoiceNumber}
        </h1>
        <p className="text-sm mb-6" style={{ color: COLORS.textMuted }}>
          {invoice.clientName}
        </p>

        {isPaid ? (
          <div className="text-center py-8">
            <CheckCircle size={48} style={{ color: COLORS.success, margin: '0 auto' }} />
            <p className="font-bold mt-4" style={{ color: COLORS.success }}>
              Payment received — thank you!
            </p>
          </div>
        ) : (
          <>
            <p className="text-4xl font-black font-mono mb-2" style={{ color: COLORS.text }}>
              {sym}
              {amountDue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            {lateFee > 0 && (
              <p className="text-xs mb-4" style={{ color: COLORS.warning }}>
                Includes {sym}
                {lateFee.toFixed(2)} late fee ({invoice.lateFeePercent}%)
              </p>
            )}
            <p className="text-sm mb-6" style={{ color: COLORS.textMuted }}>
              Due {new Date(invoice.dueDate).toLocaleDateString()}
            </p>

            {qr && (
              <div className="flex justify-center mb-6">
                <Image
                  src={qr}
                  alt="Pay link QR code"
                  width={200}
                  height={200}
                  className="rounded-lg"
                />
              </div>
            )}

            <button
              type="button"
              onClick={payNow}
              disabled={paying}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold disabled:opacity-50"
              style={{ background: COLORS.accent, color: '#fff' }}
            >
              {paying ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <CreditCard size={20} />
              )}
              Pay with card (Stripe)
            </button>

            {error && (
              <p className="mt-3 text-sm text-center" style={{ color: COLORS.danger }}>
                {error}
              </p>
            )}

            <p className="text-xs text-center mt-6" style={{ color: COLORS.textMuted }}>
              Secure checkout · Apple Pay & Google Pay where available
            </p>
          </>
        )}
      </div>
    </div>
  );
}
