'use client';

import Link from 'next/link';
import { useEffect, useState, use } from 'react';
import { COLORS, CURRENCY_SYMBOLS } from '@/lib/constants';
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

  if (error) return <div className="p-8" style={{ color: COLORS.danger }}>{error}</div>;
  if (!invoice) return <div className="p-8" style={{ color: COLORS.textMuted }}>Loading…</div>;
  const symbol = CURRENCY_SYMBOLS[invoice.currency] || `${invoice.currency} `;

  return (
    <div className="p-8 max-w-3xl" style={{ color: COLORS.text }}>
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>Invoice</p>
          <h1 className="text-3xl font-black">{invoice.invoiceNumber}</h1>
          <p style={{ color: COLORS.textMuted }}>{invoice.clientName}</p>
        </div>
        <p className="text-3xl font-black">{symbol}{invoice.total.toFixed(2)}</p>
      </div>
      <div className="rounded-lg border p-6 mb-6" style={{ borderColor: COLORS.border }}>
        {invoice.items.map((item, index) => (
          <div key={`${item.description}-${index}`} className="flex justify-between py-2">
            <span>{item.description} × {item.quantity}</span>
            <span>{symbol}{(item.quantity * item.unitRate).toFixed(2)}</span>
          </div>
        ))}
        <p className="mt-4 text-sm" style={{ color: COLORS.textMuted }}>
          Due {new Date(invoice.dueDate).toLocaleDateString()} · Status: {invoice.status}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {invoice.status === 'draft' && (
          <button
            type="button"
            onClick={() => setStatus('sent')}
            className="px-4 py-2 rounded-lg"
            style={{ background: COLORS.accent, color: '#fff' }}
          >
            Mark sent
          </button>
        )}
        {invoice.status !== 'paid' && (
          <button
            type="button"
            onClick={() => setStatus('paid')}
            className="px-4 py-2 rounded-lg"
            style={{ background: COLORS.success, color: '#fff' }}
          >
            Mark paid
          </button>
        )}
        <Link
          href={`/pay/${invoice.payToken}`}
          className="px-4 py-2 rounded-lg border"
          style={{ borderColor: COLORS.accent, color: COLORS.accent }}
        >
          Open pay link
        </Link>
      </div>
    </div>
  );
}
