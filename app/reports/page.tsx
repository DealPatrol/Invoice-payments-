'use client';

import { useEffect, useState } from 'react';
import { DemoBanner } from '@/components/DemoBanner';
import { COLORS } from '@/lib/constants';
import type { ReportsData } from '@/lib/types';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [mode, setMode] = useState<'demo' | 'postgres'>('demo');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/reports')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load reports');
        setReports(data.reports);
        setMode(data.mode);
      })
      .catch((reportError) => {
        setError(reportError instanceof Error ? reportError.message : 'Failed to load reports');
      });
  }, []);

  return (
    <div style={{ background: COLORS.background, minHeight: '100vh' }}>
      <div className="p-8">
        <h1 className="text-4xl font-black tracking-tight mb-2" style={{ color: COLORS.text }}>
          Reports & Analytics
        </h1>
        <p className="text-sm mb-8" style={{ color: COLORS.textMuted }}>
          Live revenue, collections, and accounts-receivable aging.
        </p>
        <DemoBanner mode={mode === 'postgres' ? undefined : 'demo'} />
        {error && <p style={{ color: COLORS.danger }}>{error}</p>}
        {!reports && !error && <p style={{ color: COLORS.textMuted }}>Loading reports…</p>}
        {reports && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[
                ['Revenue collected', money.format(reports.revenue)],
                ['Total billed', money.format(reports.totalBilled)],
                ['Outstanding', money.format(reports.outstanding)],
                ['Collection rate', `${reports.collectionRate}%`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border p-6"
                  style={{ background: COLORS.surfaceHigh, borderColor: COLORS.border }}
                >
                  <p className="text-sm" style={{ color: COLORS.textMuted }}>{label}</p>
                  <p className="text-2xl font-black mt-2" style={{ color: COLORS.text }}>{value}</p>
                </div>
              ))}
            </div>
            <div
              className="rounded-lg border p-6"
              style={{ background: COLORS.surface, borderColor: COLORS.border }}
            >
              <h2 className="text-lg font-bold mb-5" style={{ color: COLORS.text }}>
                Accounts receivable aging
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ['Current', reports.aging.current],
                  ['1–30 days', reports.aging.days1to30],
                  ['31–60 days', reports.aging.days31to60],
                  ['60+ days', reports.aging.days60plus],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-xs uppercase" style={{ color: COLORS.textMuted }}>{label}</p>
                    <p className="text-xl font-bold mt-1" style={{ color: COLORS.text }}>
                      {money.format(value as number)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
