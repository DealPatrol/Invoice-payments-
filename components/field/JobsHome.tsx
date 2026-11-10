'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Camera } from 'lucide-react';
import { DemoBanner } from '@/components/DemoBanner';
import { DataList, EmptyState, LinkButton, Page, PageHeader, Panel, SearchInput, SkeletonRows, StatusPill, Toolbar } from '@/components/ui/kit';
import type { JobListItem } from '@/lib/field-types';
import { money } from './ui';

export function JobsHome() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [mode, setMode] = useState<'demo' | 'postgres'>('demo');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/jobs')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Jobs unavailable');
        setJobs(data.jobs ?? []);
        setMode(data.mode ?? 'postgres');
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Jobs unavailable'))
      .finally(() => setLoading(false));
  }, []);

  const query = search.toLowerCase();
  const filtered = jobs.filter((job) => job.title.toLowerCase().includes(query) || job.clientName.toLowerCase().includes(query) || job.siteAddress.toLowerCase().includes(query));

  return (
    <Page>
      <PageHeader
        eyebrow="Field work"
        title="Jobs"
        subtitle="Sites, estimates, and the invoices that follow"
        actions={<>
          <LinkButton href="/estimates/new" primary={false}><Camera size={16} />Photo estimate</LinkButton>
          <LinkButton href="/jobs/new">New job</LinkButton>
        </>}
      />
      <DemoBanner mode={mode} />
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <Panel flush>
        <div className="border-b border-[var(--border)] p-4"><Toolbar><SearchInput value={search} onChange={setSearch} placeholder="Search jobs, clients, or addresses" /></Toolbar></div>
        {loading ? <SkeletonRows /> : filtered.length === 0 ? (
          <EmptyState icon={Briefcase} title={search ? 'No matching jobs' : 'No jobs yet'} body="Open a job, then draft an estimate from a site photo." action={<LinkButton href="/jobs/new">Create a job</LinkButton>} />
        ) : (
          <DataList
            rows={filtered}
            rowKey={(job) => job.id}
            columns={[
              { header: 'Job', cell: (job) => <Link href={`/jobs/${job.id}`} className="font-semibold text-[var(--text)] hover:text-[var(--accent)]">{job.title}</Link> },
              { header: 'Client', cell: (job) => <span className="text-[var(--text-muted)]">{job.clientName}</span> },
              { header: 'Site', cell: (job) => <span className="text-[var(--text-muted)]">{job.siteAddress || '—'}</span> },
              { header: 'Status', cell: (job) => <StatusPill status={job.status} /> },
              { header: 'Open estimates', align: 'right', cell: (job) => <span className="tabular">{job.estimateCount ? money(job.currency, job.openEstimateTotal) : '—'}</span> },
            ]}
            mobile={(job) => (
              <Link href={`/jobs/${job.id}`} className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-[var(--text)]">{job.title}</span>
                  <span className="block truncate text-xs text-[var(--text-muted)]">{job.clientName}{job.siteAddress ? ` · ${job.siteAddress}` : ''}</span>
                </span>
                <span className="shrink-0 text-right">
                  <StatusPill status={job.status} />
                  <span className="mt-1 block text-xs tabular text-[var(--text-muted)]">{job.estimateCount} est.</span>
                </span>
              </Link>
            )}
          />
        )}
      </Panel>
    </Page>
  );
}
