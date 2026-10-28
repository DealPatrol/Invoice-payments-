'use client';

import { useEffect, useState } from 'react';
import { DemoBanner } from '@/components/DemoBanner';
import { BarChart3 } from 'lucide-react';
import { EmptyState, Page, PageHeader, Panel, SkeletonRows, Stat, StatGrid, toneColor } from '@/components/ui/kit';
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

  const aging = reports ? ([
    ['Current', reports.aging.current, 'success'],
    ['1–30 days', reports.aging.days1to30, 'warning'],
    ['31–60 days', reports.aging.days31to60, 'danger'],
    ['60+ days', reports.aging.days60plus, 'danger'],
  ] as const) : [];
  const agingTotal = Math.max(1, aging.reduce((t, a) => t + a[1], 0));
  return (
    <Page>
      <PageHeader eyebrow="Grow" title="Reports & analytics" subtitle="Revenue, collections and accounts-receivable aging." />
      <DemoBanner mode={mode === 'postgres' ? undefined : 'demo'} />
      {error && <Panel><EmptyState icon={BarChart3} title="Reports unavailable" body={error} /></Panel>}
      {!reports && !error && <Panel flush><SkeletonRows rows={4} /></Panel>}
      {reports && (
        <div className="space-y-5">
          <StatGrid cols={4}>
            <Stat label="Revenue collected" value={money.format(reports.revenue)} tone="success" />
            <Stat label="Total billed" value={money.format(reports.totalBilled)} tone="accent" />
            <Stat label="Outstanding" value={money.format(reports.outstanding)} tone="warning" />
            <Stat label="Collection rate" value={`${reports.collectionRate}%`} tone="violet" />
          </StatGrid>
          <Panel title="Accounts receivable aging">
            <div className="mb-5 flex h-3 overflow-hidden rounded-full bg-[var(--surface-high)]">
              {aging.map(([l, v, t]) => <div key={l} style={{ width: `${(v / agingTotal) * 100}%`, background: toneColor(t) }} />)}
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {aging.map(([l, v, t]) => (
                <div key={l} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]"><i className="h-2 w-2 rounded-full" style={{ background: toneColor(t) }} />{l}</p>
                  <p className="tabular mt-1.5 text-xl font-semibold text-[var(--text)]">{money.format(v)}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </Page>
  );
}
