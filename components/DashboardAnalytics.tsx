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
        className="rounded-lg border p-6"
        style={{ background: COLORS.surfaceHigh, borderColor: COLORS.border }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Total Revenue
            </p>
            <p className="text-3xl font-black mt-2" style={{ color: COLORS.accent }}>
              {symbol}
              {totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: COLORS.accent + '15', color: COLORS.accent }}>
            <TrendingUp size={24} />
          </div>
        </div>
        <p className="text-xs" style={{ color: '#22c55e' }}>
          ↑ {conversionRate}% conversion rate
        </p>
      </div>

      {/* Paid */}
      <div
        className="rounded-lg border p-6"
        style={{ background: COLORS.surfaceHigh, borderColor: COLORS.border }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Paid
            </p>
            <p className="text-3xl font-black mt-2" style={{ color: '#22c55e' }}>
              {symbol}
              {paidAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: '#22c97a18', color: '#22c55e' }}>
            <CheckCircle size={24} />
          </div>
        </div>
        <p className="text-xs" style={{ color: COLORS.textMuted }}>
          {totalInvoices > 0 ? Math.round((paidAmount / totalRevenue) * 100) : 0}% of total
        </p>
      </div>

      {/* Pending */}
      <div
        className="rounded-lg border p-6"
        style={{ background: COLORS.surfaceHigh, borderColor: COLORS.border }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Pending
            </p>
            <p className="text-3xl font-black mt-2" style={{ color: '#f59e0b' }}>
              {symbol}
              {pendingAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: '#fef3c715', color: '#f59e0b' }}>
            <Clock size={24} />
          </div>
        </div>
        <p className="text-xs" style={{ color: COLORS.textMuted }}>
          {totalInvoices > 0 ? Math.round((pendingAmount / totalRevenue) * 100) : 0}% of total
        </p>
      </div>

      {/* Overdue */}
      <div
        className="rounded-lg border p-6"
        style={{ background: COLORS.surfaceHigh, borderColor: COLORS.border }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Overdue
            </p>
            <p className="text-3xl font-black mt-2" style={{ color: '#dc2626' }}>
              {symbol}
              {overdueAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: '#fee2e215', color: '#dc2626' }}>
            <AlertCircle size={24} />
          </div>
        </div>
        <p className="text-xs" style={{ color: '#dc2626' }}>
          Requires immediate attention
        </p>
      </div>
    </div>
  );
}
