'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Camera, ClipboardList } from 'lucide-react';
import { DemoBanner } from '@/components/DemoBanner';
import { DataList, EmptyState, LinkButton, Page, PageHeader, Panel, SearchInput, Segmented, SkeletonRows, StatusPill, Toolbar } from '@/components/ui/kit';
import type { EstimateListItem, EstimateStatus } from '@/lib/field-types';
import { money } from './ui';

const FILTERS = ['all', 'draft', 'sent', 'approved', 'declined', 'converted'] as const;

export function EstimatesHome() {
  const [estimates, setEstimates] = useState<EstimateListItem[]>([]);
  const [mode, setMode] = useState<'demo' | 'postgres'>('demo');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof FILTERS)[number]>('all');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (search) params.set('search', search);
    const handle = setTimeout(() => {
      setLoading(true);
      fetch(`/api/estimates?${params.toString()}`)
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Estimates unavailable');
          setEstimates(data.estimates ?? []);
          setMode(data.mode ?? 'postgres');
          setError('');
        })
        .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Estimates unavailable'))
        .finally(() => setLoading(false));
    }, search ? 200 : 0);
    return () => clearTimeout(handle);
  }, [search, status]);

  return (
    <Page>
      <PageHeader
        eyebrow="Field work"
        title="Estimates"
        subtitle="Draft from a site photo, send for approval, then collect with the pay link"
        actions={<LinkButton href="/estimates/new"><Camera size={16} />Photo estimate</LinkButton>}
      />
      <DemoBanner mode={mode} />
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <Panel flush>
        <div className="space-y-3 border-b border-[var(--border)] p-4">
          <Toolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="Search number, client, or job" />
            <Segmented<(typeof FILTERS)[number]> value={status} onChange={setStatus} options={FILTERS.map((item) => ({ value: item, label: item }))} />
          </Toolbar>
        </div>
        {loading ? <SkeletonRows /> : estimates.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No estimates" body="Take a photo at the job and InvoiceOS will draft scope, labor, and materials." action={<LinkButton href="/estimates/new">Start from a photo</LinkButton>} />
        ) : (
          <DataList
            rows={estimates}
            rowKey={(estimate) => estimate.id}
            columns={[
              { header: 'Estimate', cell: (estimate) => <Link href={`/estimates/${estimate.id}`} className="font-semibold hover:text-[var(--accent)]">{estimate.estimateNumber}</Link> },
              { header: 'Client', cell: (estimate) => <span className="text-[var(--text-muted)]">{estimate.clientName}</span> },
              { header: 'Job', cell: (estimate) => estimate.jobId ? <Link href={`/jobs/${estimate.jobId}`} className="text-[var(--text-muted)] hover:text-[var(--accent)]">{estimate.jobTitle}</Link> : <span className="text-[var(--text-subtle)]">—</span> },
              { header: 'Status', cell: (estimate) => <StatusPill status={estimate.status as EstimateStatus} /> },
              { header: 'Total', align: 'right', cell: (estimate) => <span className="tabular font-semibold">{money(estimate.currency, estimate.total)}</span> },
            ]}
            mobile={(estimate) => (
              <Link href={`/estimates/${estimate.id}`} className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-semibold text-[var(--text)]">{estimate.estimateNumber}</span>
                  <span className="block truncate text-xs text-[var(--text-muted)]">{estimate.clientName}{estimate.jobTitle ? ` · ${estimate.jobTitle}` : ''}</span>
                </span>
                <span className="text-right">
                  <span className="block tabular text-sm font-semibold">{money(estimate.currency, estimate.total)}</span>
                  <StatusPill status={estimate.status} />
                </span>
              </Link>
            )}
          />
        )}
      </Panel>
    </Page>
  );
}
