'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, MapPin } from 'lucide-react';
import { btnGhost, btnPrimary, LinkButton, Page, PageHeader, Panel, SkeletonRows, StatusPill } from '@/components/ui/kit';
import { statusLabel } from '@/lib/estimate-domain';
import { JOB_STATUSES, type JobRecord, type JobStatus } from '@/lib/field-types';
import { money } from './ui';

export function JobDetail({ id }: { id: string }) {
  const [job, setJob] = useState<JobRecord | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Job unavailable');
        setJob(data.job);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Job unavailable'));
  }, [id]);

  async function setStatus(status: JobStatus) {
    const response = await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error || 'Update failed');
    else setJob(data.job);
  }

  if (error) return <Page narrow><Panel><p className="text-sm text-[var(--danger)]">{error}</p><div className="mt-4"><LinkButton href="/jobs">Back to jobs</LinkButton></div></Panel></Page>;
  if (!job) return <Page narrow><Panel flush><SkeletonRows rows={5} /></Panel></Page>;
  const maps = job.siteAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.siteAddress)}` : null;

  return (
    <Page>
      <Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"><ArrowLeft size={15} />All jobs</Link>
      <PageHeader
        eyebrow="Job"
        title={<span className="flex flex-wrap items-center gap-3">{job.title}<StatusPill status={job.status} /></span>}
        subtitle={`${job.clientName} · ${job.clientEmail}`}
        actions={<Link href={`/estimates/new?jobId=${job.id}&clientId=${job.clientId}`} className={btnPrimary}><Camera size={16} />Estimate from photo</Link>}
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <Panel title="On site">
            <p className="text-sm text-[var(--text)]">{job.summary || 'No description yet.'}</p>
            {job.siteAddress && (
              <p className="mt-3 flex items-start gap-2 text-sm text-[var(--text-muted)]"><MapPin size={15} className="mt-0.5 shrink-0" />
                {maps ? <a className="hover:text-[var(--accent)]" href={maps} target="_blank" rel="noreferrer">{job.siteAddress}</a> : job.siteAddress}
              </p>
            )}
            {job.scheduledAt && <p className="mt-2 text-sm text-[var(--text-muted)]">Scheduled {new Date(job.scheduledAt).toLocaleDateString()}</p>}
          </Panel>
          <Panel title="Estimates" flush>
            {job.estimates.length === 0 ? <p className="p-5 text-sm text-[var(--text-muted)]">No estimates yet.</p> : (
              <ul className="divide-y divide-[var(--border)]">
                {job.estimates.map((estimate) => (
                  <li key={estimate.id}>
                    <Link href={`/estimates/${estimate.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-[var(--surface-high)]">
                      <span><span className="font-semibold text-[var(--text)]">{estimate.estimateNumber}</span><span className="ml-2"><StatusPill status={estimate.status} /></span></span>
                      <span className="tabular font-semibold">{money(estimate.currency, estimate.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Invoices" flush>
            {job.invoices.length === 0 ? <p className="p-5 text-sm text-[var(--text-muted)]">Invoices appear here after an approved estimate is converted.</p> : (
              <ul className="divide-y divide-[var(--border)]">
                {job.invoices.map((invoice) => (
                  <li key={invoice.id}>
                    <Link href={`/invoices/${invoice.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-[var(--surface-high)]">
                      <span className="font-semibold text-[var(--text)]">{invoice.invoiceNumber}<span className="ml-2"><StatusPill status={invoice.status} /></span></span>
                      <span className="tabular">{money(job.currency, invoice.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {job.photos.length > 0 && (
            <Panel title="Site photos">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {job.photos.map((photo) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={photo.id} src={photo.dataUrl} alt={photo.caption || 'Site photo'} className="aspect-[4/3] w-full rounded-[10px] object-cover" />
                ))}
              </div>
            </Panel>
          )}
        </div>
        <Panel title="Status">
          <div className="flex flex-col gap-2">
            {JOB_STATUSES.map((item) => (
              <button key={item} type="button" onClick={() => setStatus(item)} className={item === job.status ? btnPrimary : btnGhost}>{statusLabel(item)}</button>
            ))}
          </div>
        </Panel>
      </div>
    </Page>
  );
}
