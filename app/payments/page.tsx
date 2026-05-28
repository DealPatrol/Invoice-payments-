'use client';

import { Sidebar } from '@/components/Sidebar';
import { DemoBanner } from '@/components/DemoBanner';
import { COLORS, CURRENCY_SYMBOLS } from '@/lib/constants';
import { useInvoices } from '@/lib/hooks';
import { CheckCircle, Clock } from 'lucide-react';

export default function PaymentsPage() {
  const { invoices, mode, loading } = useInvoices({ status: 'all' });
  const paid = invoices.filter((inv) => inv.status === 'paid');
  const outstanding = invoices.filter((inv) =>
    ['pending', 'overdue', 'sent'].includes(inv.status)
  );

  const paidTotal = paid.reduce((sum, inv) => sum + inv.total, 0);
  const outstandingTotal = outstanding.reduce((sum, inv) => sum + inv.total, 0);
  const collectionRate =
    paidTotal + outstandingTotal > 0
      ? ((paidTotal / (paidTotal + outstandingTotal)) * 100).toFixed(1)
      : '0';

  return (
    <div className="flex min-h-screen" style={{ background: COLORS.background }}>
      <Sidebar />
      <main className="ml-64 flex-1 min-h-screen overflow-y-auto">
        <div className="p-8">
          <h1
            className="text-4xl font-black tracking-tight mb-8"
            style={{ color: COLORS.text, fontFamily: '"Syne", sans-serif' }}
          >
            Payments
          </h1>

          <DemoBanner mode={mode} />

          <div className="grid grid-cols-3 gap-6 mb-12">
            {[
              { label: 'Collection Rate', value: `${collectionRate}%`, color: COLORS.success },
              { label: 'Paid', value: `$${paidTotal.toLocaleString()}`, color: COLORS.accent },
              {
                label: 'Outstanding',
                value: `$${outstandingTotal.toLocaleString()}`,
                color: COLORS.warning,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border p-6"
                style={{ background: COLORS.surfaceHigh, borderColor: COLORS.border }}
              >
                <p className="text-sm" style={{ color: COLORS.textMuted }}>
                  {s.label}
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: s.color }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {loading ? (
            <p style={{ color: COLORS.textMuted }}>Loading…</p>
          ) : (
            <>
              <h2 className="text-lg font-bold mb-4" style={{ color: COLORS.text }}>
                Paid
              </h2>
              <div
                className="rounded-lg border overflow-hidden mb-10"
                style={{ background: COLORS.surface, borderColor: COLORS.border }}
              >
                {paid.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex justify-between px-6 py-4 border-b"
                    style={{ borderColor: COLORS.border }}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle size={18} style={{ color: COLORS.success }} />
                      <div>
                        <p className="font-bold text-sm" style={{ color: COLORS.text }}>
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-xs" style={{ color: COLORS.textMuted }}>
                          {inv.clientName}
                        </p>
                      </div>
                    </div>
                    <p className="font-mono font-bold" style={{ color: COLORS.text }}>
                      {CURRENCY_SYMBOLS[inv.currency]}
                      {inv.total.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <h2 className="text-lg font-bold mb-4" style={{ color: COLORS.text }}>
                Outstanding
              </h2>
              <div
                className="rounded-lg border overflow-hidden"
                style={{ background: COLORS.surface, borderColor: COLORS.border }}
              >
                {outstanding.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex justify-between px-6 py-4 border-b"
                    style={{ borderColor: COLORS.border }}
                  >
                    <div className="flex items-center gap-3">
                      <Clock size={18} style={{ color: COLORS.warning }} />
                      <div>
                        <p className="font-bold text-sm" style={{ color: COLORS.text }}>
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-xs" style={{ color: COLORS.textMuted }}>
                          {inv.clientName}
                        </p>
                      </div>
                    </div>
                    <p className="font-mono font-bold" style={{ color: COLORS.text }}>
                      {CURRENCY_SYMBOLS[inv.currency]}
                      {inv.total.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
