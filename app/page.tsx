'use client';

import Link from 'next/link';
import { DemoBanner } from '@/components/DemoBanner';
import { PayScoreBadge } from '@/components/PayScoreBadge';
import { COLORS, CURRENCY_SYMBOLS } from '@/lib/constants';
import { useDashboardStats, useInvoices } from '@/lib/hooks';
import { TrendingUp, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number | string; style?: React.CSSProperties }>;
  color: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-lg border p-6"
      style={{ background: COLORS.surfaceHigh, borderColor: COLORS.border }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>
            {label}
          </p>
          <p className="text-3xl font-black mt-2" style={{ color: COLORS.text }}>
            {value}
          </p>
          {sub && (
            <p className="text-xs mt-1" style={{ color }}>
              {sub}
            </p>
          )}
        </div>
        <div className="p-3 rounded-lg" style={{ background: color + '15', color }}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { stats, mode, loading: statsLoading } = useDashboardStats();
  const { invoices, loading: invLoading } = useInvoices({ limit: 5 } as never);

  const recent = invoices.slice(0, 5);

  return (
    <div style={{ background: COLORS.background, minHeight: '100vh' }}>
      <div className="p-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1
                className="text-4xl font-black tracking-tight mb-2"
                style={{ color: COLORS.text, fontFamily: '"Syne", sans-serif' }}
              >
                Dashboard
              </h1>
              <p className="text-sm" style={{ color: COLORS.textMuted }}>
                Global invoicing with Smart Pay Score™ and one-click Stripe checkout
              </p>
            </div>
            <Link
              href="/invoices/create"
              className="px-5 py-2.5 rounded-lg font-bold text-sm"
              style={{ background: COLORS.accent, color: '#fff' }}
            >
              + New Invoice
            </Link>
          </div>

          <DemoBanner mode={mode} />

          {statsLoading ? (
            <p style={{ color: COLORS.textMuted }}>Loading metrics…</p>
          ) : stats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <StatCard
                  label="Total Billed"
                  value={`$${Math.round(stats.totalRevenue).toLocaleString()}`}
                  icon={TrendingUp}
                  color={COLORS.accent}
                />
                <StatCard
                  label="Collected"
                  value={`$${Math.round(stats.collected).toLocaleString()}`}
                  icon={CheckCircle}
                  color={COLORS.success}
                />
                <StatCard
                  label="Outstanding"
                  value={String(stats.outstandingCount)}
                  icon={Clock}
                  color={COLORS.warning}
                  sub="invoices awaiting payment"
                />
                <StatCard
                  label="Overdue"
                  value={String(stats.overdueCount)}
                  icon={AlertCircle}
                  color={COLORS.danger}
                />
                <StatCard
                  label="Avg Pay Score"
                  value={String(stats.avgPayScore)}
                  icon={Zap}
                  color={COLORS.accent}
                  sub="AI payment likelihood"
                />
              </div>

              <div
                className="rounded-lg border p-4 mb-8 flex items-center justify-between"
                style={{ background: COLORS.surface, borderColor: COLORS.border }}
              >
                <span style={{ color: COLORS.textMuted }} className="text-sm">
                  Collection rate
                </span>
                <span className="text-2xl font-black" style={{ color: COLORS.success }}>
                  {stats.collectionRate}%
                </span>
              </div>
            </>
          ) : null}

          <div
            className="rounded-lg border overflow-hidden"
            style={{ background: COLORS.surface, borderColor: COLORS.border }}
          >
            <div
              className="px-6 py-4 border-b flex justify-between items-center"
              style={{ borderColor: COLORS.border }}
            >
              <h2 className="font-bold" style={{ color: COLORS.text }}>
                Recent Invoices
              </h2>
              <Link href="/invoices" style={{ color: COLORS.accent, fontSize: 13 }}>
                View all →
              </Link>
            </div>
            {invLoading && (
              <p className="p-8 text-sm" style={{ color: COLORS.textMuted }}>
                Loading…
              </p>
            )}
            {!invLoading && recent.length === 0 && (
              <p className="p-8 text-sm" style={{ color: COLORS.textMuted }}>
                No invoices yet.{' '}
                <Link href="/invoices/create" style={{ color: COLORS.accent }}>
                  Create your first →
                </Link>
              </p>
            )}
            {recent.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-4 px-6 py-4 border-b hover:bg-white/5"
                style={{ borderColor: COLORS.border }}
              >
                <span className="font-mono text-sm font-bold" style={{ color: COLORS.accent }}>
                  {inv.invoiceNumber}
                </span>
                <span className="flex-1 text-sm" style={{ color: COLORS.text }}>
                  {inv.clientName}
                </span>
                <span className="font-mono text-sm font-bold" style={{ color: COLORS.text }}>
                  {CURRENCY_SYMBOLS[inv.currency] || '$'}
                  {inv.total.toLocaleString()}
                </span>
                {inv.payScore != null && <PayScoreBadge score={inv.payScore} />}
                <Link
                  href={`/pay/${inv.payToken}`}
                  className="text-xs font-bold"
                  style={{ color: COLORS.accent }}
                >
                  Pay link
                </Link>
              </div>
            ))}
          </div>
        </div>
    </div>
  );
}
