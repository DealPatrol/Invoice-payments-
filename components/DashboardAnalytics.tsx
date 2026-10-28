'use client';

import { COLORS, CURRENCY_SYMBOLS } from '@/lib/constants';
import { TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface AnalyticsProps {
  totalInvoices: number;
  totalRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
  paidAmount: number;
  currency: string;
  conversionRate: number;
}

export function DashboardAnalytics({
  totalInvoices,
  totalRevenue,
  pendingAmount,
  overdueAmount,
  paidAmount,
  currency,
  conversionRate,
}: AnalyticsProps) {
  const symbol = CURRENCY_SYMBOLS[currency] || '$';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Revenue */}
      <div
        className="rounded-[var(--radius-lg)] border shadow-[var(--shadow-xs)] p-6"
        style={{ background: COLORS.surfaceHigh, borderColor: COLORS.border }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Total Revenue
            </p>
            <p className="tabular text-3xl font-semibold mt-2" style={{ color: COLORS.accent }}>
              {symbol}
              {totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'var(--accent-soft)', color: COLORS.accent }}>
            <TrendingUp size={24} />
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--success)' }}>
          ↑ {conversionRate}% conversion rate
        </p>
      </div>

      {/* Paid */}
      <div
        className="rounded-[var(--radius-lg)] border shadow-[var(--shadow-xs)] p-6"
        style={{ background: COLORS.surfaceHigh, borderColor: COLORS.border }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Paid
            </p>
            <p className="tabular text-3xl font-semibold mt-2" style={{ color: 'var(--success)' }}>
              {symbol}
              {paidAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: '#22c97a18', color: 'var(--success)' }}>
            <CheckCircle size={24} />
          </div>
        </div>
        <p className="text-xs" style={{ color: COLORS.textMuted }}>
          {totalInvoices > 0 ? Math.round((paidAmount / totalRevenue) * 100) : 0}% of total
        </p>
      </div>

      {/* Pending */}
      <div
        className="rounded-[var(--radius-lg)] border shadow-[var(--shadow-xs)] p-6"
        style={{ background: COLORS.surfaceHigh, borderColor: COLORS.border }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Pending
            </p>
            <p className="tabular text-3xl font-semibold mt-2" style={{ color: 'var(--warning)' }}>
              {symbol}
              {pendingAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: '#fef3c715', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
        </div>
        <p className="text-xs" style={{ color: COLORS.textMuted }}>
          {totalInvoices > 0 ? Math.round((pendingAmount / totalRevenue) * 100) : 0}% of total
        </p>
      </div>

      {/* Overdue */}
      <div
        className="rounded-[var(--radius-lg)] border shadow-[var(--shadow-xs)] p-6"
        style={{ background: COLORS.surfaceHigh, borderColor: COLORS.border }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Overdue
            </p>
            <p className="tabular text-3xl font-semibold mt-2" style={{ color: 'var(--danger)' }}>
              {symbol}
              {overdueAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: '#fee2e215', color: 'var(--danger)' }}>
            <AlertCircle size={24} />
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--danger)' }}>
          Requires immediate attention
        </p>
      </div>
    </div>
  );
}
