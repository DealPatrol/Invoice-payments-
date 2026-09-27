'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DemoBanner } from '@/components/DemoBanner';
import { COLORS } from '@/lib/constants';
import { useInvoices } from '@/lib/hooks';
import { Plus } from 'lucide-react';

export default function InvoicesPage() {
  const [filter, setFilter] = useState('all');
  const { invoices, mode, loading, reload } = useInvoices({ status: filter });

  async function remove(id: string) {
    if (!confirm('Delete this invoice?')) return;
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    await reload();
  }

  return (
    <div style={{ background: COLORS.background, minHeight: '100vh' }}>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-4xl font-black tracking-tight mb-2"
              style={{ color: COLORS.text, fontFamily: '"Syne", sans-serif' }}
            >
              Invoices
            </h1>
            <p style={{ color: COLORS.textMuted }}>Manage all your invoices in one place</p>
          </div>
          <Link
            href="/invoices/create"
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
            style={{ background: COLORS.accent, color: '#ffffff' }}
          >
            <Plus size={18} />
            New Invoice
          </Link>
        </div>

        <DemoBanner mode={mode} />

        <div className="flex gap-2 mb-8">
          {['all', 'paid', 'pending', 'overdue'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className="px-4 py-2 rounded-lg font-medium transition-all capitalize"
              style={{
                background: filter === status ? COLORS.accent : COLORS.surface,
                color: filter === status ? '#ffffff' : COLORS.text,
                border: `1px solid ${filter === status ? COLORS.accent : COLORS.border}`,
              }}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {loading && <p style={{ color: COLORS.textMuted }}>Loading invoices…</p>}
          {invoices.map((invoice) => (
            <div key={invoice.id} className="rounded-lg border p-6" style={{ background: COLORS.surface, borderColor: COLORS.border }}>
              <div className="flex items-center justify-between">
                <div>
                  <Link href={`/invoices/${invoice.id}`} className="font-bold text-lg hover:underline" style={{ color: COLORS.accent }}>
                    {invoice.clientName}
                  </Link>
                  <p className="text-sm" style={{ color: COLORS.textMuted }}>
                    {invoice.issuedDate}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold" style={{ color: COLORS.text }}>
                    {invoice.currency} {invoice.total.toLocaleString()}
                  </span>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{
                      background:
                        invoice.status === 'paid'
                          ? '#dcfce7'
                          : invoice.status === 'pending'
                            ? '#fef3c7'
                            : '#fee2e2',
                      color:
                        invoice.status === 'paid'
                          ? '#166534'
                          : invoice.status === 'pending'
                            ? '#92400e'
                            : '#991b1b',
                    }}
                  >
                    {invoice.status.toUpperCase()}
                  </span>
                  <button
                    onClick={() => remove(invoice.id)}
                    className="text-sm px-3 py-1 rounded hover:bg-red-100"
                    style={{ color: '#dc2626' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!loading && invoices.length === 0 && (
          <div className="text-center py-12">
            <p style={{ color: COLORS.textMuted }}>No invoices found</p>
          </div>
        )}
      </div>
    </div>
  );
}
