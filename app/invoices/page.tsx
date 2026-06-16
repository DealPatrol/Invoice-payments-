'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DemoBanner } from '@/components/DemoBanner';
import { PayScoreBadge } from '@/components/PayScoreBadge';
import { COLORS, CURRENCY_SYMBOLS, STATUS_COLORS } from '@/lib/constants';
import { useInvoices } from '@/lib/hooks';
import { Plus, Search, CreditCard, ExternalLink, Trash2 } from 'lucide-react';

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { invoices, mode, loading, error, reload } = useInvoices({
    status: statusFilter,
    search,
  });

  async function startCheckout(id: string) {
    const res = await fetch(`/api/invoices/${id}/checkout`, { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert(data.error || 'Could not start checkout. Add Stripe keys in Settings.');
  }

  async function markPaid(id: string) {
    await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    });
    reload();
  }

  async function remove(id: string) {
    if (!confirm('Delete this invoice?')) return;
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    reload();
  }

  return (
    <div style={{ background: COLORS.background, minHeight: '100vh' }}>
      <div className="p-8">
      <div className="flex items-center justify-between mb-6">
            <div>
              <h1
                className="text-4xl font-black tracking-tight mb-2"
                style={{ color: COLORS.text, fontFamily: '"Syne", sans-serif' }}
              >
                Invoices
              </h1>
              <p className="text-sm" style={{ color: COLORS.textMuted }}>
                {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Link
              href="/invoices/create"
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold"
              style={{ background: COLORS.accent, color: '#fff' }}
            >
              <Plus size={20} />
              New Invoice
            </Link>
          </div>

          <DemoBanner mode={mode} />

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-3"
                style={{ color: COLORS.textMuted }}
              />
              <input
                type="text"
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
                style={{
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.text,
              }}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {error && (
            <p className="mb-4 text-sm" style={{ color: COLORS.danger }}>
              {error}
            </p>
          )}

          <div
            className="rounded-lg border overflow-hidden"
            style={{ background: COLORS.surface, borderColor: COLORS.border }}
          >
            <div
              className="grid px-6 py-3 border-b text-xs font-bold uppercase tracking-wider"
              style={{
                gridTemplateColumns: '1fr 1.2fr 1fr 0.8fr 1fr 1.4fr',
                background: COLORS.surfaceHigh,
                borderColor: COLORS.border,
                color: COLORS.textMuted,
              }}
            >
              {['Invoice', 'Client', 'Amount', 'Due', 'Pay Score', 'Actions'].map((h) => (
                <div key={h}>{h}</div>
              ))}
            </div>

            {loading && (
              <p className="p-8 text-sm" style={{ color: COLORS.textMuted }}>
                Loading…
              </p>
            )}

            {invoices.map((invoice) => {
              const statusColor = STATUS_COLORS[invoice.status] || STATUS_COLORS.draft;
              const payLink = `/pay/${invoice.payToken}`;
              return (
                <div
                  key={invoice.id}
                  className="grid px-6 py-4 border-b items-center gap-2 hover:bg-white/5"
                  style={{
                    gridTemplateColumns: '1fr 1.2fr 1fr 0.8fr 1fr 1.4fr',
                    borderColor: COLORS.border,
                  }}
                >
                  <div className="font-mono font-bold text-sm" style={{ color: COLORS.accent }}>
                    {invoice.invoiceNumber}
                  </div>
                  <div className="text-sm" style={{ color: COLORS.text }}>
                    {invoice.clientName}
                  </div>
                  <div className="font-mono font-bold text-sm" style={{ color: COLORS.text }}>
                    {CURRENCY_SYMBOLS[invoice.currency]}
                    {invoice.total.toLocaleString()}
                  </div>
                  <div className="text-sm" style={{ color: COLORS.textMuted }}>
                    {invoice.dueDate
                      ? new Date(invoice.dueDate).toLocaleDateString()
                      : '—'}
                  </div>
                  <div>
                    {invoice.payScore != null && (
                      <PayScoreBadge score={invoice.payScore} />
                    )}
                  </div>
              <div className="flex flex-wrap gap-2 items-center">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: statusColor.bg,
                        color: statusColor.text,
                        border: `1px solid ${statusColor.border}`,
                      }}
                    >
                      {invoice.status}
                    </span>
                    {invoice.status !== 'paid' && (
                      <>
                        <button
                          type="button"
                          onClick={() => startCheckout(invoice.id)}
                          className="p-1.5 rounded hover:bg-white/10"
                          title="Stripe Checkout"
                          style={{ color: COLORS.accent }}
                        >
                          <CreditCard size={16} />
                        </button>
                        <Link
                          href={payLink}
                          target="_blank"
                          className="p-1.5 rounded hover:bg-white/10 inline-flex"
                          title="Client pay portal"
                          style={{ color: COLORS.textMuted }}
                        >
                          <ExternalLink size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => markPaid(invoice.id)}
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            background: `${COLORS.success}18`,
                            color: COLORS.success,
                          }}
                        >
                          Paid
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(invoice.id)}
                      className="p-1.5 rounded hover:bg-white/10"
                      style={{ color: COLORS.danger }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
